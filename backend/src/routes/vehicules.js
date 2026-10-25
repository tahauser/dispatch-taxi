const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const alertes = require('../services/parcAlertes');
const router  = express.Router();

const TYPES   = ['TAXI', 'BERLINE', 'VAN', 'MINIBUS'];
const STATUTS = ['actif', 'maintenance', 'hors_service'];
const AUJ = `(NOW() AT TIME ZONE 'America/Montreal')::date`;
const dispatch = requireRole('dispatch', 'admin');

const COLS = `v.id, v.numero_unite, v.immatriculation, v.marque, v.modele, v.annee, v.couleur,
  v.type_vehicule, v.nb_places, v.kilometrage, v.statut, v.notes,
  v.date_assurance_exp::text AS date_assurance_exp, v.date_immat_exp::text AS date_immat_exp,
  v.date_prochain_entretien::text AS date_prochain_entretien`;

// Affectation en cours (à une date donnée) d'un véhicule
const AFF_COURANTE = (dateExpr) => `
  LEFT JOIN LATERAL (
    SELECT a.id AS aff_id, a.chauffeur_id, a.date_debut::text AS aff_debut, a.date_fin::text AS aff_fin,
           c.prenom AS ch_prenom, c.nom AS ch_nom, c.numero_chauffeur AS ch_numero, c.photo AS ch_photo
    FROM vehicule_affectations a JOIN chauffeurs c ON c.id = a.chauffeur_id
    WHERE a.vehicule_id = v.id AND a.date_debut <= ${dateExpr} AND (a.date_fin IS NULL OR a.date_fin >= ${dateExpr})
    ORDER BY a.date_debut DESC LIMIT 1
  ) cur ON TRUE`;

function valider(b, partiel = false) {
  if (!partiel && (!b.numero_unite?.trim() || !b.immatriculation?.trim()))
    return 'Numéro d\'unité et immatriculation requis';
  if (b.type_vehicule && !TYPES.includes(b.type_vehicule)) return 'Type de véhicule invalide';
  if (b.statut && !STATUTS.includes(b.statut)) return 'Statut invalide';
  return null;
}
const vide = v => (v === '' || v === undefined ? null : v);

// Retire un véhicule du service : libère son chauffeur dès maintenant
async function libererVehicule(vehicule_id) {
  await pool.query(`DELETE FROM vehicule_affectations WHERE vehicule_id=$1 AND date_debut >= ${AUJ}`, [vehicule_id]);
  await pool.query(
    `UPDATE vehicule_affectations SET date_fin = ${AUJ} - 1
     WHERE vehicule_id=$1 AND (date_fin IS NULL OR date_fin >= ${AUJ})`, [vehicule_id]);
}

// GET /api/vehicules?date=YYYY-MM-DD — liste + affectation du jour
router.get('/', authMiddleware, dispatch, async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : null;
  const d = date ? `'${date}'::date` : AUJ;
  try {
    const r = await pool.query(
      `SELECT ${COLS}, cur.aff_id, cur.chauffeur_id, cur.aff_debut, cur.aff_fin,
              cur.ch_prenom, cur.ch_nom, cur.ch_numero, cur.ch_photo,
              li.insp_date, li.insp_resultat, li.insp_prochaine
       FROM vehicules v ${AFF_COURANTE(d)}
       LEFT JOIN LATERAL (
         SELECT date_inspection::text AS insp_date, resultat AS insp_resultat, date_prochaine::text AS insp_prochaine
         FROM vehicule_inspections i WHERE i.vehicule_id = v.id
         ORDER BY date_inspection DESC, cree_le DESC LIMIT 1
       ) li ON TRUE
       ORDER BY v.numero_unite`);
    res.json(r.rows);
  } catch (err) { console.error('GET vehicules:', err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// ── Inspections ───────────────────────────────────────────────────────────
const TYPES_INSP = ['periodique', 'mecanique', 'securite', 'proprete', 'apres_incident'];
const RESULTATS  = ['conforme', 'conforme_reserve', 'non_conforme'];

// GET /api/vehicules/inspections?vehicule_id=
router.get('/inspections', authMiddleware, dispatch, async (req, res) => {
  try {
    const params = [];
    let where = '';
    if (req.query.vehicule_id) { params.push(req.query.vehicule_id); where = 'WHERE i.vehicule_id=$1'; }
    const r = await pool.query(
      `SELECT i.id, i.vehicule_id, i.type_inspection, i.date_inspection::text AS date_inspection,
              i.date_prochaine::text AS date_prochaine, i.kilometrage, i.resultat, i.inspecteur, i.checklist, i.notes,
              v.numero_unite, v.immatriculation, v.marque, v.modele, v.type_vehicule
       FROM vehicule_inspections i JOIN vehicules v ON v.id = i.vehicule_id
       ${where} ORDER BY i.date_inspection DESC, i.cree_le DESC LIMIT 500`, params);
    res.json(r.rows);
  } catch (err) { console.error('GET inspections:', err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/vehicules/inspections
router.post('/inspections', authMiddleware, dispatch, async (req, res) => {
  const b = req.body;
  if (!b.vehicule_id || !b.date_inspection) return res.status(400).json({ message: 'Véhicule et date requis' });
  if (b.type_inspection && !TYPES_INSP.includes(b.type_inspection)) return res.status(400).json({ message: 'Type invalide' });
  if (b.resultat && !RESULTATS.includes(b.resultat)) return res.status(400).json({ message: 'Résultat invalide' });
  if (b.date_prochaine && b.date_prochaine < b.date_inspection) return res.status(400).json({ message: 'La prochaine inspection précède celle-ci' });
  try {
    const r = await pool.query(
      `INSERT INTO vehicule_inspections (vehicule_id, type_inspection, date_inspection, date_prochaine, kilometrage,
         resultat, inspecteur, checklist, notes, cree_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [b.vehicule_id, b.type_inspection || 'periodique', b.date_inspection, vide(b.date_prochaine), vide(b.kilometrage),
       b.resultat || 'conforme', vide(b.inspecteur), b.checklist ? JSON.stringify(b.checklist) : null, vide(b.notes), req.user.id]);
    // Garde le kilométrage du véhicule à jour
    if (b.kilometrage) await pool.query('UPDATE vehicules SET kilometrage=$1, modifie_le=NOW() WHERE id=$2 AND COALESCE(kilometrage,0) < $1', [b.kilometrage, b.vehicule_id]);
    // Non conforme : retire le véhicule du service (et libère son chauffeur)
    let retire = false;
    if (b.resultat === 'non_conforme') {
      await pool.query(`UPDATE vehicules SET statut='maintenance', modifie_le=NOW() WHERE id=$1 AND statut='actif'`, [b.vehicule_id]);
      await libererVehicule(b.vehicule_id);
      retire = true;
    }
    res.status(201).json({ id: r.rows[0].id, retire_du_service: retire });
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ message: 'Véhicule non trouvé' });
    console.error('POST inspection:', err.message); res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /api/vehicules/inspections/:id
router.delete('/inspections/:id', authMiddleware, dispatch, async (req, res) => {
  try { await pool.query('DELETE FROM vehicule_inspections WHERE id=$1', [req.params.id]); res.json({ message: 'Inspection supprimée' }); }
  catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// ── Alertes d'échéances ──────────────────────────────────────────────────
router.get('/parametres', authMiddleware, dispatch, async (req, res) => {
  try { const p = await alertes.lireParametres(); res.json(p); }
  catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.put('/parametres', authMiddleware, dispatch, async (req, res) => {
  const b = req.body;
  const jours = alertes.parseJours(b.jours_avant);
  if (!jours.length) return res.status(400).json({ message: 'Indiquez au moins un délai en jours (ex. 30, 14, 7, 1)' });
  const heure = parseInt(b.heure_envoi, 10);
  if (!(heure >= 0 && heure <= 23)) return res.status(400).json({ message: 'Heure invalide (0 à 23)' });
  try {
    await pool.query(
      `UPDATE parc_parametres SET jours_avant=$1, heure_envoi=$2, actif=$3, notifier_admins=$4, notifier_chauffeurs=$5 WHERE id=1`,
      [jours.slice().sort((a, b) => b - a).join(','), heure, !!b.actif, !!b.notifier_admins, !!b.notifier_chauffeurs]);
    res.json(await alertes.lireParametres());
  } catch (err) { console.error('PUT parametres:', err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/vehicules/alertes/apercu — ce qui serait envoyé maintenant + échéances à venir (rien n'est envoyé)
router.get('/alertes/apercu', authMiddleware, dispatch, async (req, res) => {
  try {
    const r = await alertes.calculerAlertes();
    res.json({ aEnvoyer: r.aEnvoyer, aVenir: r.aVenir });
  } catch (err) { console.error('apercu alertes:', err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/vehicules/alertes/executer — envoie maintenant
router.post('/alertes/executer', authMiddleware, dispatch, async (req, res) => {
  try {
    const r = await alertes.executer({ envoyer: true });
    res.json({ alertes: r.alertes, admins: r.admins, chauffeurs: r.chauffeurs, erreurs: r.erreurs });
  } catch (err) { console.error('executer alertes:', err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/vehicules/alertes/journal
router.get('/alertes/journal', authMiddleware, dispatch, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT j.type_echeance, j.date_echeance::text AS date_echeance, j.jours_restants, j.envoye_le, v.numero_unite
       FROM parc_alertes_envoyees j JOIN vehicules v ON v.id=j.vehicule_id ORDER BY j.envoye_le DESC LIMIT 100`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/vehicules/mon-vehicule — véhicule du chauffeur connecté
router.get('/mon-vehicule', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT v.numero_unite, v.immatriculation, v.marque, v.modele, v.annee, v.couleur, v.type_vehicule,
              a.date_debut::text AS depuis, a.date_fin::text AS jusqu_au
       FROM vehicule_affectations a JOIN vehicules v ON v.id = a.vehicule_id
       WHERE a.chauffeur_id=$1 AND a.date_debut <= ${AUJ} AND (a.date_fin IS NULL OR a.date_fin >= ${AUJ})
       ORDER BY a.date_debut DESC LIMIT 1`, [req.user.id]);
    if (!r.rows[0]) return res.json(null);
    const veh = (await pool.query(
      `SELECT v.date_assurance_exp::text AS date_assurance_exp, v.date_immat_exp::text AS date_immat_exp,
              v.date_prochain_entretien::text AS date_prochain_entretien, ${AUJ}::text AS today,
              (SELECT date_prochaine::text FROM vehicule_inspections i WHERE i.vehicule_id=v.id ORDER BY date_inspection DESC, cree_le DESC LIMIT 1) AS insp_prochaine
       FROM vehicules v WHERE v.numero_unite=$1`, [r.rows[0].numero_unite])).rows[0];
    const params = await alertes.lireParametres();
    const horizon = Math.max(...params.jours, 0);
    const echeances = alertes.echeancesDe(veh, veh.today).filter(e => e.jours <= horizon).sort((a, b) => a.jours - b.jours);
    res.json({ ...r.rows[0], echeances });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/vehicules
router.post('/', authMiddleware, dispatch, async (req, res) => {
  const b = req.body;
  const err = valider(b);
  if (err) return res.status(400).json({ message: err });
  try {
    const r = await pool.query(
      `INSERT INTO vehicules (numero_unite, immatriculation, marque, modele, annee, couleur, type_vehicule,
         nb_places, kilometrage, statut, date_assurance_exp, date_immat_exp, date_prochain_entretien, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [b.numero_unite.trim(), b.immatriculation.trim().toUpperCase(), vide(b.marque), vide(b.modele), vide(b.annee),
       vide(b.couleur), b.type_vehicule || 'TAXI', vide(b.nb_places) ?? 4, vide(b.kilometrage), b.statut || 'actif',
       vide(b.date_assurance_exp), vide(b.date_immat_exp), vide(b.date_prochain_entretien), vide(b.notes)]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Numéro d\'unité ou immatriculation déjà utilisé' });
    console.error('POST vehicule:', e.message); res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/vehicules/:id — mise à jour complète des champs envoyés
router.put('/:id', authMiddleware, dispatch, async (req, res) => {
  const b = req.body;
  const err = valider(b, true);
  if (err) return res.status(400).json({ message: err });
  const champs = ['numero_unite','immatriculation','marque','modele','annee','couleur','type_vehicule','nb_places',
    'kilometrage','statut','date_assurance_exp','date_immat_exp','date_prochain_entretien','notes'];
  const sets = [], vals = [];
  for (const c of champs) {
    if (Object.prototype.hasOwnProperty.call(b, c)) {
      let v = vide(b[c]);
      if (c === 'immatriculation' && v) v = String(v).trim().toUpperCase();
      vals.push(v); sets.push(`${c}=$${vals.length}`);
    }
  }
  if (!sets.length) return res.status(400).json({ message: 'Rien à modifier' });
  vals.push(req.params.id);
  try {
    const r = await pool.query(`UPDATE vehicules SET ${sets.join(', ')}, modifie_le=NOW() WHERE id=$${vals.length} RETURNING id`, vals);
    if (!r.rows.length) return res.status(404).json({ message: 'Véhicule non trouvé' });
    // Un véhicule retiré du service met fin à son affectation en cours
    if (b.statut && b.statut !== 'actif') {
      await libererVehicule(req.params.id);
    }
    res.json({ id: r.rows[0].id });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Numéro d\'unité ou immatriculation déjà utilisé' });
    console.error('PUT vehicule:', e.message); res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Vérifie qu'aucun chevauchement n'existe pour le véhicule ou le chauffeur
async function chevauchement(vehicule_id, chauffeur_id, debut, fin, ignorerId = null) {
  const r = await pool.query(
    `SELECT a.vehicule_id, a.chauffeur_id, v.numero_unite, c.prenom, c.nom
     FROM vehicule_affectations a
     JOIN vehicules v ON v.id=a.vehicule_id JOIN chauffeurs c ON c.id=a.chauffeur_id
     WHERE (a.vehicule_id=$1 OR a.chauffeur_id=$2)
       AND ($5::uuid IS NULL OR a.id <> $5)
       AND a.date_debut <= COALESCE($4::date, 'infinity'::date)
       AND COALESCE(a.date_fin, 'infinity'::date) >= $3::date
     LIMIT 1`, [vehicule_id, chauffeur_id, debut, fin || null, ignorerId]);
  if (!r.rows.length) return null;
  const x = r.rows[0];
  return x.vehicule_id === vehicule_id
    ? `Le véhicule ${x.numero_unite} est déjà affecté à ${x.prenom} ${x.nom} sur cette période`
    : `${x.prenom} ${x.nom} a déjà le véhicule ${x.numero_unite} sur cette période`;
}

async function creerAffectation({ vehicule_id, chauffeur_id, date_debut, date_fin, notes }, userId) {
  const v = await pool.query('SELECT statut FROM vehicules WHERE id=$1', [vehicule_id]);
  if (!v.rows.length) return { erreur: 'Véhicule non trouvé', code: 404 };
  if (v.rows[0].statut !== 'actif') return { erreur: 'Ce véhicule n\'est pas en service', code: 409 };
  const c = await pool.query(`SELECT actif FROM chauffeurs WHERE id=$1 AND role='chauffeur'`, [chauffeur_id]);
  if (!c.rows.length || !c.rows[0].actif) return { erreur: 'Chauffeur introuvable ou inactif', code: 409 };
  if (date_fin && date_fin < date_debut) return { erreur: 'La date de fin précède la date de début', code: 400 };
  const conflit = await chevauchement(vehicule_id, chauffeur_id, date_debut, date_fin);
  if (conflit) return { erreur: conflit, code: 409 };
  const r = await pool.query(
    `INSERT INTO vehicule_affectations (vehicule_id, chauffeur_id, date_debut, date_fin, notes, cree_par)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [vehicule_id, chauffeur_id, date_debut, date_fin || null, vide(notes), userId]);
  return { id: r.rows[0].id };
}

// GET /api/vehicules/affectations — historique complet
router.get('/affectations', authMiddleware, dispatch, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.id, a.vehicule_id, a.chauffeur_id, a.date_debut::text AS date_debut, a.date_fin::text AS date_fin, a.notes,
              v.numero_unite, v.immatriculation, v.marque, v.modele, v.type_vehicule,
              c.prenom, c.nom, c.numero_chauffeur,
              (a.date_debut <= ${AUJ} AND (a.date_fin IS NULL OR a.date_fin >= ${AUJ})) AS en_cours
       FROM vehicule_affectations a
       JOIN vehicules v ON v.id=a.vehicule_id JOIN chauffeurs c ON c.id=a.chauffeur_id
       ORDER BY a.date_debut DESC, v.numero_unite LIMIT 500`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/vehicules/affectations
router.post('/affectations', authMiddleware, dispatch, async (req, res) => {
  const { vehicule_id, chauffeur_id, date_debut } = req.body;
  if (!vehicule_id || !chauffeur_id || !date_debut) return res.status(400).json({ message: 'Véhicule, chauffeur et date de début requis' });
  try {
    const r = await creerAffectation(req.body, req.user.id);
    if (r.erreur) return res.status(r.code).json({ message: r.erreur });
    res.status(201).json(r);
  } catch (err) { console.error('POST aff vehicule:', err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// PATCH /api/vehicules/affectations/:id/terminer — { date_fin? } (défaut: aujourd'hui)
router.patch('/affectations/:id/terminer', authMiddleware, dispatch, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE vehicule_affectations SET date_fin = COALESCE($1::date, ${AUJ})
       WHERE id=$2 AND date_fin IS NULL OR (id=$2 AND date_fin > COALESCE($1::date, ${AUJ}))
       RETURNING id`, [req.body.date_fin || null, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'Affectation introuvable ou déjà terminée' });
    res.json({ message: 'Affectation terminée' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// DELETE /api/vehicules/affectations/:id
router.delete('/affectations/:id', authMiddleware, dispatch, async (req, res) => {
  try {
    await pool.query('DELETE FROM vehicule_affectations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Affectation supprimée' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// ── Proposition automatique ───────────────────────────────────────────────
// Appariement chauffeurs sans véhicule ↔ véhicules libres de même type.
// Score : +100 type identique (obligatoire), +50 a déjà conduit ce véhicule, +20 véhicule le plus récent (année).
async function calculerProposition(date) {
  const ch = await pool.query(
    `SELECT c.id, c.prenom, c.nom, c.numero_chauffeur, c.type_vehicule, c.photo
     FROM chauffeurs c
     WHERE c.role='chauffeur' AND c.actif=TRUE
       AND NOT EXISTS (SELECT 1 FROM vehicule_affectations a WHERE a.chauffeur_id=c.id
                       AND a.date_debut <= $1::date AND (a.date_fin IS NULL OR a.date_fin >= $1::date))
     ORDER BY c.numero_chauffeur`, [date]);
  const ve = await pool.query(
    `SELECT v.id, v.numero_unite, v.immatriculation, v.marque, v.modele, v.annee, v.type_vehicule
     FROM vehicules v
     WHERE v.statut='actif'
       AND NOT EXISTS (SELECT 1 FROM vehicule_affectations a WHERE a.vehicule_id=v.id
                       AND a.date_debut <= $1::date AND (a.date_fin IS NULL OR a.date_fin >= $1::date))
     ORDER BY v.numero_unite`, [date]);
  const hist = await pool.query(`SELECT DISTINCT chauffeur_id, vehicule_id FROM vehicule_affectations`);
  const dejaConduit = new Set(hist.rows.map(h => h.chauffeur_id + '|' + h.vehicule_id));

  const paires = [];
  for (const c of ch.rows) for (const v of ve.rows) {
    if ((c.type_vehicule || 'TAXI') !== v.type_vehicule) continue;
    const raisons = ['type ' + v.type_vehicule];
    let score = 100;
    if (dejaConduit.has(c.id + '|' + v.id)) { score += 50; raisons.push('a déjà conduit ce véhicule'); }
    if (v.annee) score += Math.max(0, Math.min(20, v.annee - 2010));
    paires.push({ c, v, score, raisons });
  }
  paires.sort((a, b) => b.score - a.score || a.c.numero_chauffeur.localeCompare(b.c.numero_chauffeur));
  const chPris = new Set(), vePris = new Set(), propositions = [];
  for (const p of paires) {
    if (chPris.has(p.c.id) || vePris.has(p.v.id)) continue;
    chPris.add(p.c.id); vePris.add(p.v.id);
    propositions.push({ chauffeur: p.c, vehicule: p.v, score: p.score, raisons: p.raisons });
  }
  return {
    date, propositions,
    chauffeurs_sans_vehicule: ch.rows.filter(c => !chPris.has(c.id)),
    vehicules_libres: ve.rows.filter(v => !vePris.has(v.id)),
  };
}

// GET /api/vehicules/proposition?date=
router.get('/proposition', authMiddleware, dispatch, async (req, res) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : null;
  try {
    const d = date || (await pool.query(`SELECT ${AUJ}::text AS d`)).rows[0].d;
    res.json(await calculerProposition(d));
  } catch (err) { console.error('proposition:', err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/vehicules/proposition/appliquer — { date, paires:[{chauffeur_id, vehicule_id}] }
router.post('/proposition/appliquer', authMiddleware, dispatch, async (req, res) => {
  const { date, paires } = req.body;
  if (!date || !Array.isArray(paires) || !paires.length) return res.status(400).json({ message: 'Date et paires requises' });
  const crees = [], echecs = [];
  try {
    for (const p of paires) {
      const r = await creerAffectation({ vehicule_id: p.vehicule_id, chauffeur_id: p.chauffeur_id, date_debut: date, date_fin: null }, req.user.id);
      if (r.erreur) echecs.push({ ...p, message: r.erreur }); else crees.push(r.id);
    }
    res.json({ crees: crees.length, echecs });
  } catch (err) { console.error('appliquer:', err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
