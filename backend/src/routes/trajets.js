const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router  = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const { date, statut } = req.query;
  try {
    let query, params;
    if (req.user.role === 'chauffeur') {
      query = `
        SELECT t.id, t.code_trajet, t.date_trajet, t.heure_prise, t.heure_arrivee,
               t.type_vehicule, t.adresse_prise, t.code_fixe, t.notes, t.statut
        FROM trajets t
        JOIN affectations a ON a.trajet_id = t.id AND a.chauffeur_id = $1
        WHERE ($2::date IS NULL OR t.date_trajet = $2)
        ORDER BY t.date_trajet, t.heure_prise`;
      params = [req.user.id, date || null];
    } else {
      query = `
        SELECT t.*,
               c.nom AS chauffeur_nom, c.prenom AS chauffeur_prenom, c.numero_chauffeur,
               a.statut AS statut_affectation, a.proposee_par
        FROM trajets t
        LEFT JOIN affectations a ON a.trajet_id = t.id AND a.date_programme = t.date_trajet
        LEFT JOIN chauffeurs c ON c.id = a.chauffeur_id
        WHERE ($1::date IS NULL OR t.date_trajet = $1)
          AND ($2::varchar IS NULL OR t.statut = $2)
        ORDER BY t.date_trajet, t.heure_prise`;
      params = [date || null, statut || null];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET trajets:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/dates/disponibles', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT date_trajet,
             COUNT(*) AS nb_trajets,
             SUM(CASE WHEN statut='en_attente' THEN 1 ELSE 0 END) AS nb_non_affectes
      FROM trajets
      WHERE date_trajet >= CURRENT_DATE
      GROUP BY date_trajet ORDER BY date_trajet`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.nom AS chauffeur_nom, c.prenom AS chauffeur_prenom, a.statut AS statut_affectation
       FROM trajets t
       LEFT JOIN affectations a ON a.trajet_id = t.id
       LEFT JOIN chauffeurs c ON c.id = a.chauffeur_id
       WHERE t.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Trajet non trouve' });
    const trajet = result.rows[0];
    if (req.user.role === 'chauffeur') delete trajet.adresse_arrivee;
    res.json(trajet);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
