// Alertes d'échéances du parc : inspection, assurance, immatriculation, entretien.
const pool  = require('../models/db');
const email = require('./email');

const LIBELLES = { inspection: 'Inspection', assurance: 'Assurance', immatriculation: 'Immatriculation', entretien: 'Entretien' };
const AUJ = `(NOW() AT TIME ZONE 'America/Montreal')::date`;

async function lireParametres() {
  const r = await pool.query(`SELECT jours_avant, heure_envoi, actif, notifier_admins, notifier_chauffeurs,
                                     derniere_execution::text AS derniere_execution FROM parc_parametres WHERE id=1`);
  const p = r.rows[0];
  return { ...p, jours: parseJours(p.jours_avant) };
}

function parseJours(txt) {
  return [...new Set(String(txt || '').split(/[\s,;]+/).map(n => parseInt(n, 10)).filter(n => Number.isInteger(n) && n > 0 && n <= 365))]
    .sort((a, b) => a - b);
}

// Échéances d'un véhicule en service : [{ type, date, jours }]
function echeancesDe(v, today) {
  const defs = [['inspection', v.insp_prochaine], ['assurance', v.date_assurance_exp],
                ['immatriculation', v.date_immat_exp], ['entretien', v.date_prochain_entretien]];
  return defs.filter(([, d]) => d).map(([type, d]) => ({
    type, libelle: LIBELLES[type], date: d,
    jours: Math.round((new Date(d + 'T12:00:00Z') - new Date(today + 'T12:00:00Z')) / 86400000),
  }));
}

async function chargerVehicules() {
  const r = await pool.query(`
    SELECT v.id, v.numero_unite, v.immatriculation, v.marque, v.modele,
           v.date_assurance_exp::text AS date_assurance_exp, v.date_immat_exp::text AS date_immat_exp,
           v.date_prochain_entretien::text AS date_prochain_entretien, li.insp_prochaine,
           cur.chauffeur_id, cur.prenom AS ch_prenom, cur.nom AS ch_nom, cur.email AS ch_email,
           ${AUJ}::text AS today
    FROM vehicules v
    LEFT JOIN LATERAL (
      SELECT date_prochaine::text AS insp_prochaine FROM vehicule_inspections i
      WHERE i.vehicule_id=v.id ORDER BY date_inspection DESC, cree_le DESC LIMIT 1) li ON TRUE
    LEFT JOIN LATERAL (
      SELECT a.chauffeur_id, c.prenom, c.nom, c.email FROM vehicule_affectations a
      JOIN chauffeurs c ON c.id=a.chauffeur_id AND c.actif=TRUE
      WHERE a.vehicule_id=v.id AND a.date_debut <= ${AUJ} AND (a.date_fin IS NULL OR a.date_fin >= ${AUJ})
      ORDER BY a.date_debut DESC LIMIT 1) cur ON TRUE
    WHERE v.statut='actif'
    ORDER BY v.numero_unite`);
  return r.rows;
}

// Détermine les alertes à envoyer maintenant (sans rien envoyer ni enregistrer)
async function calculerAlertes() {
  const params = await lireParametres();
  const vehicules = await chargerVehicules();
  const deja = new Set((await pool.query('SELECT vehicule_id || cle AS k FROM parc_alertes_envoyees')).rows.map(x => x.k));
  const aEnvoyer = [], aVenir = [];
  for (const v of vehicules) {
    const today = v.today;
    for (const e of echeancesDe(v, today)) {
      const base = { vehicule_id: v.id, numero_unite: v.numero_unite, immatriculation: v.immatriculation,
        vehicule: [v.marque, v.modele].filter(Boolean).join(' '), chauffeur_id: v.chauffeur_id,
        chauffeur: v.ch_prenom ? `${v.ch_prenom} ${v.ch_nom}` : null, chauffeur_email: v.ch_email, ...e };
      let cle = null;
      if (e.jours < 0) cle = `${e.type}|${e.date}|retard|${today}`;                       // rappel quotidien
      else { const seuil = params.jours.find(s => e.jours <= s); if (seuil) cle = `${e.type}|${e.date}|${seuil}`; }
      if (cle) { if (!deja.has(v.id + cle)) aEnvoyer.push({ ...base, cle }); }
      else aVenir.push(base);
    }
  }
  const tri = (a, b) => a.jours - b.jours;
  return { params, aEnvoyer: aEnvoyer.sort(tri), aVenir: aVenir.sort(tri) };
}

// Exécute le contrôle : envoie les courriels et journalise
async function executer({ envoyer = true } = {}) {
  const { params, aEnvoyer, aVenir } = await calculerAlertes();
  const resume = { alertes: aEnvoyer.length, admins: 0, chauffeurs: 0, erreurs: [] };
  if (!envoyer || !params.actif || aEnvoyer.length === 0) return { ...resume, apercu: aEnvoyer, aVenir };

  if (params.notifier_admins) {
    const adm = await pool.query(`SELECT email, prenom, nom FROM chauffeurs WHERE role IN ('dispatch','admin') AND actif=TRUE AND email IS NOT NULL`);
    for (const a of adm.rows) {
      try { await email.envoyerAlertesParc(a, aEnvoyer, 'admin'); resume.admins++; }
      catch (e) { resume.erreurs.push(`admin ${a.email}: ${e.message}`); }
    }
  }
  if (params.notifier_chauffeurs) {
    const parCh = new Map();
    for (const a of aEnvoyer) if (a.chauffeur_id && a.chauffeur_email) {
      if (!parCh.has(a.chauffeur_id)) parCh.set(a.chauffeur_id, { email: a.chauffeur_email, prenom: a.chauffeur.split(' ')[0], nom: a.chauffeur.split(' ').slice(1).join(' '), items: [] });
      parCh.get(a.chauffeur_id).items.push(a);
    }
    for (const c of parCh.values()) {
      try { await email.envoyerAlertesParc(c, c.items, 'chauffeur'); resume.chauffeurs++; }
      catch (e) { resume.erreurs.push(`chauffeur ${c.email}: ${e.message}`); }
    }
  }
  const aucunEnvoi = resume.admins + resume.chauffeurs === 0 && resume.erreurs.length > 0;
  if (!aucunEnvoi) {
    for (const a of aEnvoyer)
      await pool.query(`INSERT INTO parc_alertes_envoyees (vehicule_id, type_echeance, date_echeance, cle, jours_restants)
                        VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [a.vehicule_id, a.type, a.date, a.cle, a.jours]);
  }
  return { ...resume, apercu: aEnvoyer, aVenir };
}

// Planificateur : vérifie toutes les 10 minutes si l'heure d'envoi est passée aujourd'hui
let enCours = false;
async function tick() {
  if (enCours) return;
  enCours = true;
  try {
    const p = await lireParametres();
    if (!p.actif) return;
    const t = (await pool.query(`SELECT EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Montreal'))::int AS h, ${AUJ}::text AS d`)).rows[0];
    if (t.h >= p.heure_envoi && p.derniere_execution !== t.d) {
      const r = await executer({ envoyer: true });
      await pool.query('UPDATE parc_parametres SET derniere_execution=$1::date WHERE id=1', [t.d]);
      console.log(`[parc-alertes] ${t.d} : ${r.alertes} alerte(s), ${r.admins} admin(s), ${r.chauffeurs} chauffeur(s)` + (r.erreurs.length ? ' ERREURS: ' + r.erreurs.join(' | ') : ''));
    }
  } catch (e) { console.error('[parc-alertes] erreur:', e.message); }
  finally { enCours = false; }
}
function demarrer() { setTimeout(tick, 15000); setInterval(tick, 10 * 60 * 1000); }

module.exports = { lireParametres, parseJours, echeancesDe, calculerAlertes, executer, demarrer, LIBELLES };
