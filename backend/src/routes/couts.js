const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router  = express.Router();
const dispatch = requireRole('dispatch', 'admin');
const TYPES = ['carburant', 'entretien', 'reparation', 'autre'];
const dateOk = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const num = v => (v === '' || v === null || v === undefined || !Number.isFinite(+v)) ? null : +v;

// GET /api/couts?vehicule_id=&du=&au=
router.get('/', authMiddleware, dispatch, async (req, res) => {
  const { vehicule_id, du, au } = req.query;
  try {
    const r = await pool.query(
      `SELECT c.id, c.vehicule_id, c.date_cout::text AS date_cout, c.type, c.montant::float AS montant, c.litres::float AS litres,
              c.kilometrage, c.fournisseur, c.description, v.numero_unite, v.immatriculation
       FROM vehicule_couts c JOIN vehicules v ON v.id=c.vehicule_id
       WHERE ($1::uuid IS NULL OR c.vehicule_id=$1) AND ($2::date IS NULL OR c.date_cout>=$2) AND ($3::date IS NULL OR c.date_cout<=$3)
       ORDER BY c.date_cout DESC, c.cree_le DESC LIMIT 1000`,
      [vehicule_id || null, dateOk(du) ? du : null, dateOk(au) ? au : null]);
    res.json(r.rows);
  } catch (e) { console.error(e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/couts/synthese?du=&au=  — une ligne par véhicule
router.get('/synthese', authMiddleware, dispatch, async (req, res) => {
  const { du, au } = req.query;
  try {
    const r = await pool.query(
      `SELECT v.id, v.numero_unite, v.immatriculation, v.marque, v.modele, v.type_vehicule, v.statut, v.kilometrage,
              COALESCE(SUM(c.montant),0)::float AS total,
              COALESCE(SUM(c.montant) FILTER (WHERE c.type='carburant'),0)::float AS carburant,
              COALESCE(SUM(c.montant) FILTER (WHERE c.type='entretien'),0)::float AS entretien,
              COALESCE(SUM(c.montant) FILTER (WHERE c.type='reparation'),0)::float AS reparation,
              COALESCE(SUM(c.montant) FILTER (WHERE c.type='autre'),0)::float AS autre,
              COALESCE(SUM(c.litres),0)::float AS litres,
              (MAX(c.kilometrage) - MIN(c.kilometrage)) AS km_periode,
              COUNT(c.id)::int AS nb
       FROM vehicules v
       LEFT JOIN vehicule_couts c ON c.vehicule_id=v.id
            AND ($1::date IS NULL OR c.date_cout>=$1) AND ($2::date IS NULL OR c.date_cout<=$2)
       GROUP BY v.id ORDER BY total DESC, v.numero_unite`,
      [dateOk(du) ? du : null, dateOk(au) ? au : null]);
    const rows = r.rows.map(x => ({
      ...x,
      cout_km: x.km_periode > 0 ? +(x.total / x.km_periode).toFixed(3) : null,
      l_100km: x.km_periode > 0 && x.litres > 0 ? +(x.litres / x.km_periode * 100).toFixed(1) : null,
    }));
    res.json(rows);
  } catch (e) { console.error(e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

router.post('/', authMiddleware, dispatch, async (req, res) => {
  const { vehicule_id, date_cout, type, montant, litres, kilometrage, fournisseur, description } = req.body;
  if (!vehicule_id || !dateOk(date_cout) || num(montant) === null || num(montant) < 0)
    return res.status(400).json({ message: 'Véhicule, date et montant valides requis' });
  if (!TYPES.includes(type || 'carburant')) return res.status(400).json({ message: 'Type invalide' });
  try {
    const km = num(kilometrage);
    const r = await pool.query(
      `INSERT INTO vehicule_couts (vehicule_id, date_cout, type, montant, litres, kilometrage, fournisseur, description, cree_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [vehicule_id, date_cout, type || 'carburant', num(montant), num(litres), km === null ? null : Math.round(km),
       (fournisseur || '').trim().slice(0, 120) || null, (description || '').trim() || null, req.user.id]);
    if (km !== null) await pool.query(`UPDATE vehicules SET kilometrage=$1, modifie_le=NOW() WHERE id=$2 AND COALESCE(kilometrage,0) < $1`, [Math.round(km), vehicule_id]);
    res.status(201).json(r.rows[0]);
  } catch (e) { console.error(e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

router.delete('/:id', authMiddleware, dispatch, async (req, res) => {
  try { await pool.query('DELETE FROM vehicule_couts WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
