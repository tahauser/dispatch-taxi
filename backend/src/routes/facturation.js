const express = require('express');
const XLSX    = require('xlsx');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router  = express.Router();
const dispatch = requireRole('dispatch', 'admin');

const MODES = ['distance', 'temps', 'mixte', 'forfait'];
const FACTEUR_DETOUR = 1.3;           // distance routière estimée = vol d'oiseau × 1,3 quand aucune distance n'est saisie
const arr2 = n => Math.round(n * 100) / 100;
const num = v => (v === '' || v === null || v === undefined || !Number.isFinite(+v)) ? null : +v;

function haversine(a, b, c, d) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(c - a), dLng = r(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const minutesEntre = (h1, h2) => {
  const m = h => { const [x, y] = String(h).split(':'); return (+x) * 60 + (+y); };
  let d = m(h2) - m(h1); if (d < 0) d += 1440; return d;
};

// Calcul du montant d'une course selon le tarif du payeur
function calculer(l, t) {
  let km = l.distance_km !== null ? +l.distance_km : null, kmEstime = false;
  if (km === null && l.lat_prise != null && l.lat_arrivee != null) {
    km = arr2(haversine(+l.lat_prise, +l.lng_prise, +l.lat_arrivee, +l.lng_arrivee) * FACTEUR_DETOUR); kmEstime = true;
  }
  let minutes;
  if (l.t_a_bord && l.t_termine) minutes = (new Date(l.t_termine) - new Date(l.t_a_bord)) / 60000;
  else minutes = minutesEntre(l.heure_prise, l.heure_arrivee);
  minutes = Math.max(0, Math.round(minutes));
  const noShow = l.statut_course === 'no_show';
  let base;
  if (!t) base = 0;
  else if (noShow) base = t.facturer_absence ? +t.prise_en_charge : 0;
  else if (t.mode === 'forfait') base = +t.forfait;
  else {
    base = +t.prise_en_charge;
    if (t.mode === 'distance' || t.mode === 'mixte') base += (km || 0) * +t.prix_km;
    if (t.mode === 'temps' || t.mode === 'mixte') base += minutes * +t.prix_minute;
  }
  if (t && !noShow && base > 0) base = Math.max(base, +t.minimum);
  const calcule = arr2(base);
  const montant = l.montant_ajuste !== null ? +l.montant_ajuste : calcule;
  return { km, km_estime: kmEstime, minutes, calcule, montant };
}

async function construireReleve({ mois, payeur, inclure }) {
  const debut = `${mois}-01`;
  const params = [debut, payeur || null];
  const where = inclure === 'toutes'
    ? `a.statut_course IN ('termine','no_show','a_faire','arrive','a_bord','en_route')`
    : `a.statut_course IN ('termine','no_show')`;
  const r = await pool.query(
    `SELECT a.id, a.date_programme::text AS date, a.statut_course, a.t_a_bord, a.t_termine,
            a.montant_ajuste::float AS montant_ajuste, a.note_facturation,
            t.id AS trajet_id, t.code_trajet, t.heure_prise::text AS heure_prise, t.heure_arrivee::text AS heure_arrivee,
            t.adresse_prise, t.adresse_arrivee, t.lat_prise, t.lng_prise, t.lat_arrivee, t.lng_arrivee,
            t.distance_km::float AS distance_km, t.payeur,
            c.prenom, c.nom, c.numero_chauffeur
     FROM affectations a JOIN trajets t ON t.id=a.trajet_id JOIN chauffeurs c ON c.id=a.chauffeur_id
     WHERE a.date_programme >= $1::date AND a.date_programme < ($1::date + INTERVAL '1 month')
       AND ($2::text IS NULL OR t.payeur=$2) AND ${where}
     ORDER BY t.payeur, a.date_programme, t.heure_prise`, params);
  const tarifs = {};
  for (const t of (await pool.query('SELECT * FROM tarifs')).rows) tarifs[t.payeur] = t;
  const groupes = new Map();
  for (const l of r.rows) {
    const t = tarifs[l.payeur];
    const calc = calculer(l, t);
    if (!groupes.has(l.payeur)) groupes.set(l.payeur, { payeur: l.payeur, tarif: t || null, lignes: [] });
    groupes.get(l.payeur).lignes.push({ ...l, ...calc, lat_prise: undefined, lng_prise: undefined, lat_arrivee: undefined, lng_arrivee: undefined });
  }
  const out = [...groupes.values()].map(g => {
    const sousTotal = arr2(g.lignes.reduce((s, x) => s + x.montant, 0));
    const taxes = arr2(sousTotal * (g.tarif ? +g.tarif.taxes_pct : 0) / 100);
    return { ...g, nb: g.lignes.length, km: arr2(g.lignes.reduce((s, x) => s + (x.km || 0), 0)),
             minutes: g.lignes.reduce((s, x) => s + x.minutes, 0), sous_total: sousTotal, taxes, total: arr2(sousTotal + taxes),
             sans_tarif: !g.tarif };
  });
  return { mois, groupes: out, total: arr2(out.reduce((s, g) => s + g.total, 0)) };
}
const moisOk = m => /^\d{4}-\d{2}$/.test(m || '');

router.get('/releve', authMiddleware, dispatch, async (req, res) => {
  if (!moisOk(req.query.mois)) return res.status(400).json({ message: 'Mois invalide (AAAA-MM)' });
  try { res.json(await construireReleve({ mois: req.query.mois, payeur: req.query.payeur, inclure: req.query.inclure })); }
  catch (e) { console.error('releve:', e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

router.get('/export.xlsx', authMiddleware, dispatch, async (req, res) => {
  if (!moisOk(req.query.mois)) return res.status(400).json({ message: 'Mois invalide (AAAA-MM)' });
  try {
    const rel = await construireReleve({ mois: req.query.mois, payeur: req.query.payeur, inclure: req.query.inclure });
    const wb = XLSX.utils.book_new();
    const resume = [['Payeur', 'Courses', 'Km', 'Minutes', 'Sous-total', 'Taxes', 'Total']]
      .concat(rel.groupes.map(g => [g.payeur, g.nb, g.km, g.minutes, g.sous_total, g.taxes, g.total]))
      .concat([['TOTAL', '', '', '', '', '', rel.total]]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resume), 'Résumé');
    for (const g of rel.groupes) {
      const rows = [['Date', 'Trajet', 'Chauffeur', 'Prise', 'Fin prévue', 'Adresse de prise', 'Km', 'Km estimé', 'Minutes', 'Statut', 'Calculé', 'Montant facturé', 'Note']]
        .concat(g.lignes.map(l => [l.date, l.code_trajet, `${l.prenom} ${l.nom}`, l.heure_prise.slice(0, 5), l.heure_arrivee.slice(0, 5),
          l.adresse_prise, l.km, l.km_estime ? 'oui' : '', l.minutes, l.statut_course, l.calcule, l.montant, l.note_facturation || '']));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), g.payeur.replace(/[\\/?*[\]:]/g, '-').slice(0, 31) || 'Payeur');
    }
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="releve-${req.query.mois}.xlsx"`);
    res.send(buf);
  } catch (e) { console.error('export:', e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// Ajustement d'une ligne : payeur / distance (sur le trajet), montant et note (sur l'affectation)
router.patch('/ligne/:affectationId', authMiddleware, dispatch, async (req, res) => {
  const b = req.body;
  try {
    const a = await pool.query('SELECT trajet_id FROM affectations WHERE id=$1', [req.params.affectationId]);
    if (!a.rows.length) return res.status(404).json({ message: 'Course introuvable' });
    if ('payeur' in b) {
      const p = String(b.payeur || '').trim().slice(0, 60);
      if (!p) return res.status(400).json({ message: 'Payeur requis' });
      await pool.query('UPDATE trajets SET payeur=$1 WHERE id=$2', [p, a.rows[0].trajet_id]);
      await pool.query('INSERT INTO tarifs (payeur) VALUES ($1) ON CONFLICT DO NOTHING', [p]);
    }
    if ('distance_km' in b) {
      const d = num(b.distance_km);
      if (d !== null && d < 0) return res.status(400).json({ message: 'Distance invalide' });
      await pool.query('UPDATE trajets SET distance_km=$1 WHERE id=$2', [d, a.rows[0].trajet_id]);
    }
    if ('montant_ajuste' in b || 'note_facturation' in b) {
      const m = num(b.montant_ajuste);
      if (m !== null && m < 0) return res.status(400).json({ message: 'Montant invalide' });
      await pool.query('UPDATE affectations SET montant_ajuste=$1, note_facturation=$2 WHERE id=$3',
        [m, String(b.note_facturation || '').trim() || null, req.params.affectationId]);
    }
    res.json({ ok: true });
  } catch (e) { console.error(e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

router.get('/tarifs', authMiddleware, dispatch, async (req, res) => {
  try {
    const r = await pool.query(`SELECT payeur, mode, prise_en_charge::float, prix_km::float, prix_minute::float, forfait::float,
                                       minimum::float, taxes_pct::float, facturer_absence,
                                       (SELECT COUNT(*)::int FROM trajets t WHERE t.payeur=tarifs.payeur) AS nb_trajets
                                FROM tarifs ORDER BY payeur`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.put('/tarifs/:payeur', authMiddleware, dispatch, async (req, res) => {
  const b = req.body, payeur = String(req.params.payeur).trim().slice(0, 60);
  if (!payeur) return res.status(400).json({ message: 'Payeur requis' });
  if (!MODES.includes(b.mode)) return res.status(400).json({ message: 'Mode invalide' });
  const champs = ['prise_en_charge', 'prix_km', 'prix_minute', 'forfait', 'minimum', 'taxes_pct'].map(k => num(b[k]) ?? 0);
  if (champs.some(x => x < 0)) return res.status(400).json({ message: 'Valeurs négatives interdites' });
  try {
    await pool.query(
      `INSERT INTO tarifs (payeur, mode, prise_en_charge, prix_km, prix_minute, forfait, minimum, taxes_pct, facturer_absence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (payeur) DO UPDATE SET mode=$2, prise_en_charge=$3, prix_km=$4, prix_minute=$5, forfait=$6, minimum=$7, taxes_pct=$8, facturer_absence=$9`,
      [payeur, b.mode, ...champs, !!b.facturer_absence]);
    res.json({ ok: true });
  } catch (e) { console.error(e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
