const pool = require('../models/db');

const liste = s => String(s || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);

async function chargerExigences() {
  const r = await pool.query('SELECT type_vehicule, categories, formation FROM exigences_conduite');
  const m = {};
  for (const e of r.rows) m[e.type_vehicule] = { categories: liste(e.categories), formation: e.formation.trim() };
  return m;
}

// Retourne la liste des motifs de non-conformité (vide = apte) pour un chauffeur sur un type de véhicule à une date.
// ch: { categories_permis, permis_expiration (YYYY-MM-DD|null) }, formations: [{nom, date_expiration}]
function verifier(ch, type, date, exigences, formations = []) {
  const ex = exigences[type];
  if (!ex) return [];
  const pb = [];
  const cats = liste(ch.categories_permis);
  if (ex.categories.length && !ex.categories.some(c => cats.includes(c)))
    pb.push(`Permis requis : classe ${ex.categories.join(' ou ')} (chauffeur : ${cats.join(', ') || 'aucune'})`);
  if (ch.permis_expiration && ch.permis_expiration < date) pb.push(`Permis expiré le ${ch.permis_expiration}`);
  if (ex.formation) {
    const f = formations.find(x => x.nom.toLowerCase() === ex.formation.toLowerCase());
    if (!f) pb.push(`Formation requise manquante : ${ex.formation}`);
    else if (f.date_expiration && f.date_expiration < date) pb.push(`Formation « ${ex.formation} » expirée le ${f.date_expiration}`);
  }
  return pb;
}

// Charge les formations de plusieurs chauffeurs : { chauffeur_id: [..] }
async function chargerFormations(ids) {
  const r = await pool.query(
    `SELECT chauffeur_id, nom, date_obtention::text AS date_obtention, date_expiration::text AS date_expiration
     FROM chauffeur_formations WHERE ($1::uuid[] IS NULL OR chauffeur_id = ANY($1::uuid[]))`, [ids || null]);
  const m = {};
  for (const f of r.rows) (m[f.chauffeur_id] = m[f.chauffeur_id] || []).push(f);
  return m;
}

module.exports = { chargerExigences, chargerFormations, verifier };
