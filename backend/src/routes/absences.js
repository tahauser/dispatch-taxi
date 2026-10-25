const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router  = express.Router();

const TYPES = ['conge', 'maladie', 'formation', 'autre'];

// GET /api/absences?du=&au=&chauffeur_id=   (chauffeur : uniquement les siennes)
router.get('/', authMiddleware, async (req, res) => {
  const { du, au, chauffeur_id } = req.query;
  try {
    const params = [du || null, au || null];
    let where = `($1::date IS NULL OR a.date_fin >= $1::date) AND ($2::date IS NULL OR a.date_debut <= $2::date)`;
    if (req.user.role === 'chauffeur') { params.push(req.user.id); where += ` AND a.chauffeur_id=$3`; }
    else if (chauffeur_id) { params.push(chauffeur_id); where += ` AND a.chauffeur_id=$3`; }
    const r = await pool.query(
      `SELECT a.id, a.chauffeur_id, a.type, a.date_debut::text AS date_debut, a.date_fin::text AS date_fin, a.note,
              c.prenom, c.nom, c.numero_chauffeur, c.photo,
              (SELECT COUNT(*)::int FROM affectations af WHERE af.chauffeur_id=a.chauffeur_id
                 AND af.date_programme BETWEEN a.date_debut AND a.date_fin) AS nb_affectations
       FROM absences a JOIN chauffeurs c ON c.id=a.chauffeur_id
       WHERE ${where} ORDER BY a.date_debut, c.nom`, params);
    res.json(r.rows);
  } catch (err) { console.error(err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/absences  (dispatch/admin)  — avertit si des affectations existent déjà sur la période
router.post('/', authMiddleware, requireRole('dispatch', 'admin'), async (req, res) => {
  const { chauffeur_id, type, date_debut, date_fin, note, retirer_affectations } = req.body;
  if (!chauffeur_id || !date_debut) return res.status(400).json({ message: 'chauffeur_id et date_debut requis' });
  const fin = date_fin || date_debut;
  if (fin < date_debut) return res.status(400).json({ message: 'La fin doit suivre le début' });
  if (!TYPES.includes(type || 'conge')) return res.status(400).json({ message: 'Type invalide' });
  try {
    const conflits = await pool.query(
      `SELECT COUNT(*)::int AS n FROM affectations WHERE chauffeur_id=$1 AND date_programme BETWEEN $2 AND $3`,
      [chauffeur_id, date_debut, fin]);
    if (conflits.rows[0].n > 0 && !retirer_affectations)
      return res.status(409).json({ code: 'AFFECTATIONS', nb: conflits.rows[0].n,
        message: `${conflits.rows[0].n} course(s) déjà affectée(s) sur cette période` });
    if (retirer_affectations)
      await pool.query(`DELETE FROM affectations WHERE chauffeur_id=$1 AND date_programme BETWEEN $2 AND $3
                        AND statut_course='a_faire'`, [chauffeur_id, date_debut, fin]);
    // Les disponibilités saisies sur la période n'ont plus de sens
    await pool.query(`DELETE FROM disponibilites WHERE chauffeur_id=$1 AND date_dispo BETWEEN $2 AND $3`, [chauffeur_id, date_debut, fin]);
    const r = await pool.query(
      `INSERT INTO absences (chauffeur_id, type, date_debut, date_fin, note, cree_par)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [chauffeur_id, type || 'conge', date_debut, fin, note || null, req.user.id]);
    res.status(201).json(r.rows[0]);
  } catch (err) { console.error(err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

router.delete('/:id', authMiddleware, requireRole('dispatch', 'admin'), async (req, res) => {
  try { await pool.query('DELETE FROM absences WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
