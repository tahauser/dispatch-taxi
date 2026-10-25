const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { chargerExigences, chargerFormations, verifier } = require('../services/conduite');
const router  = express.Router();
const dispatch = requireRole('dispatch', 'admin');
const AUJ = `(NOW() AT TIME ZONE 'America/Montreal')::date`;
const datOk = s => !s || /^\d{4}-\d{2}-\d{2}$/.test(s);

router.get('/exigences', authMiddleware, dispatch, async (req, res) => {
  try {
    const r = await pool.query('SELECT type_vehicule, categories, formation FROM exigences_conduite ORDER BY type_vehicule');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.put('/exigences/:type', authMiddleware, dispatch, async (req, res) => {
  const categories = String(req.body.categories || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean).join(',');
  const formation = String(req.body.formation || '').trim().slice(0, 120);
  try {
    const r = await pool.query(
      `INSERT INTO exigences_conduite (type_vehicule, categories, formation) VALUES ($1,$2,$3)
       ON CONFLICT (type_vehicule) DO UPDATE SET categories=$2, formation=$3 RETURNING *`,
      [req.params.type.toUpperCase(), categories, formation]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// Conformité de tous les chauffeurs actifs pour leur propre type de véhicule (+ tous les types)
router.get('/conformite', authMiddleware, dispatch, async (req, res) => {
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : (await pool.query(`SELECT ${AUJ}::text d`)).rows[0].d;
    const ch = await pool.query(
      `SELECT id, numero_chauffeur, prenom, nom, photo, type_vehicule, categories_permis, numero_permis,
              permis_expiration::text AS permis_expiration
       FROM chauffeurs WHERE role='chauffeur' AND actif=TRUE ORDER BY numero_chauffeur`);
    const ex = await chargerExigences();
    const fm = await chargerFormations(null);
    const out = ch.rows.map(c => {
      const formations = fm[c.id] || [];
      const types = Object.keys(ex);
      const aptes = types.filter(t => verifier(c, t, date, ex, formations).length === 0);
      return { ...c, formations, problemes: verifier(c, c.type_vehicule || 'TAXI', date, ex, formations), types_aptes: aptes };
    });
    res.json({ date, chauffeurs: out });
  } catch (e) { console.error(e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

router.put('/chauffeurs/:id/permis', authMiddleware, dispatch, async (req, res) => {
  if (!datOk(req.body.permis_expiration)) return res.status(400).json({ message: 'Date invalide' });
  try {
    await pool.query(`UPDATE chauffeurs SET permis_expiration=$1 WHERE id=$2 AND role='chauffeur'`, [req.body.permis_expiration || null, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.post('/formations', authMiddleware, dispatch, async (req, res) => {
  const { chauffeur_id, nom, date_obtention, date_expiration } = req.body;
  if (!chauffeur_id || !String(nom || '').trim()) return res.status(400).json({ message: 'Chauffeur et nom requis' });
  if (!datOk(date_obtention) || !datOk(date_expiration)) return res.status(400).json({ message: 'Date invalide' });
  try {
    const r = await pool.query(
      `INSERT INTO chauffeur_formations (chauffeur_id, nom, date_obtention, date_expiration) VALUES ($1,$2,$3,$4) RETURNING id`,
      [chauffeur_id, nom.trim().slice(0, 120), date_obtention || null, date_expiration || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.delete('/formations/:id', authMiddleware, dispatch, async (req, res) => {
  try { await pool.query('DELETE FROM chauffeur_formations WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
