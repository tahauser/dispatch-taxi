// Rappels aux chauffeurs qui n'ont pas saisi leurs disponibilités de demain avant l'heure limite.
const pool  = require('../models/db');
const email = require('./email');

const AUJ = `(NOW() AT TIME ZONE 'America/Montreal')::date`;
const heureLimite = () => parseInt(process.env.DEADLINE_HEURE || '18');

async function lireParametres() {
  const r = await pool.query(`SELECT actif, heure_rappel, canal_email, canal_sms, notifier_admins,
                                     derniere_execution::text AS derniere_execution FROM dispo_rappels_parametres WHERE id=1`);
  return r.rows[0];
}

// Chauffeurs actifs sans disponibilité demain et sans absence demain, avec indicateurs "déjà rappelé"
async function manquants() {
  const r = await pool.query(`
    WITH cible AS (SELECT (${AUJ} + 1) AS d)
    SELECT c.id, c.prenom, c.nom, c.numero_chauffeur, c.email, c.telephone, cible.d::text AS date_cible,
           EXISTS (SELECT 1 FROM dispo_rappels_envoyes e WHERE e.chauffeur_id=c.id AND e.date_cible=cible.d AND e.canal='email') AS rappele_email,
           EXISTS (SELECT 1 FROM dispo_rappels_envoyes e WHERE e.chauffeur_id=c.id AND e.date_cible=cible.d AND e.canal='sms')   AS rappele_sms
    FROM chauffeurs c, cible
    WHERE c.role='chauffeur' AND c.actif=TRUE
      AND NOT EXISTS (SELECT 1 FROM disponibilites d WHERE d.chauffeur_id=c.id AND d.date_dispo=cible.d)
      AND NOT EXISTS (SELECT 1 FROM absences a WHERE a.chauffeur_id=c.id AND cible.d BETWEEN a.date_debut AND a.date_fin)
    ORDER BY c.numero_chauffeur`);
  return r.rows;
}

// SMS via Twilio si TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM sont définis
function smsDisponible() { return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM); }
function versE164(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.startsWith('1')) return '+' + d;
  return null;
}
async function envoyerSms(tel, texte) {
  const to = versE164(tel);
  if (!to) throw new Error('numéro invalide');
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
               'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: texte }),
  });
  if (!r.ok) throw new Error('Twilio ' + r.status);
}

async function executer() {
  const p = await lireParametres();
  const liste = await manquants();
  const res = { manquants: liste.length, emails: 0, sms: 0, erreurs: [] };
  const hl = `${String(heureLimite()).padStart(2, '0')}h`;
  const rappeles = [];
  for (const c of liste) {
    let envoye = false;
    if (p.canal_email && c.email && !c.rappele_email) {
      try { await email.envoyerRappelDispo(c, c.date_cible, hl);
            await pool.query(`INSERT INTO dispo_rappels_envoyes VALUES ($1,$2,'email') ON CONFLICT DO NOTHING`, [c.id, c.date_cible]);
            res.emails++; envoye = true; }
      catch (e) { res.erreurs.push(`${c.numero_chauffeur} email: ${e.message}`); }
    }
    if (p.canal_sms && smsDisponible() && c.telephone && !c.rappele_sms) {
      try { await envoyerSms(c.telephone, `Dispatch Taxi : saisissez vos disponibilités de demain avant ${hl}.`);
            await pool.query(`INSERT INTO dispo_rappels_envoyes VALUES ($1,$2,'sms') ON CONFLICT DO NOTHING`, [c.id, c.date_cible]);
            res.sms++; envoye = true; }
      catch (e) { res.erreurs.push(`${c.numero_chauffeur} sms: ${e.message}`); }
    }
    if (envoye) rappeles.push(c);
  }
  if (p.notifier_admins && rappeles.length) {
    const adm = await pool.query(`SELECT email, prenom, nom FROM chauffeurs WHERE role IN ('dispatch','admin') AND actif=TRUE AND email IS NOT NULL`);
    for (const a of adm.rows) {
      try { await email.envoyerResumeRappelsDispo(a, liste[0].date_cible, rappeles); }
      catch (e) { res.erreurs.push(`admin ${a.email}: ${e.message}`); }
    }
  }
  return res;
}

let enCours = false;
async function tick() {
  if (enCours) return;
  enCours = true;
  try {
    const p = await lireParametres();
    if (!p.actif) return;
    const t = (await pool.query(`SELECT EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Montreal'))::int AS h, ${AUJ}::text AS d`)).rows[0];
    // Envoi une fois par jour, à partir de l'heure de rappel et avant l'heure limite
    if (t.h >= p.heure_rappel && t.h < heureLimite() && p.derniere_execution !== t.d) {
      const r = await executer();
      await pool.query('UPDATE dispo_rappels_parametres SET derniere_execution=$1::date WHERE id=1', [t.d]);
      console.log(`[rappels-dispo] ${t.d} : ${r.manquants} manquant(s), ${r.emails} courriel(s), ${r.sms} SMS` + (r.erreurs.length ? ' ERREURS: ' + r.erreurs.join(' | ') : ''));
    }
  } catch (e) { console.error('[rappels-dispo] erreur:', e.message); }
  finally { enCours = false; }
}
function demarrer() { setTimeout(tick, 20000); setInterval(tick, 10 * 60 * 1000); }

module.exports = { lireParametres, manquants, executer, demarrer, smsDisponible, heureLimite };
