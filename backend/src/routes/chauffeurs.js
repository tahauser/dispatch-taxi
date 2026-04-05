const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router  = express.Router();

router.get('/', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, numero_chauffeur, nom, prenom, email, telephone,
              type_vehicule, actif, adresse_domicile, lat_domicile, lng_domicile
       FROM chauffeurs
       WHERE actif = TRUE AND role = 'chauffeur'
       ORDER BY numero_chauffeur`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
