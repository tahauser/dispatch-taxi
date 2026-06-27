const express  = require('express');
const pool     = require('../models/db');
const bcrypt   = require('bcryptjs');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router   = express.Router();

// GET /api/chauffeurs — liste tous (dispatch voit actifs uniquement, admin voit tous)
router.get('/', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { tous } = req.query;
  try {
    const filtre = (req.user.role === 'admin' && tous === '1') ? '' : `AND actif = TRUE`;
    const result = await pool.query(
      `SELECT id, numero_chauffeur, nom, prenom, email, telephone,
              type_vehicule, actif, adresse_domicile, lat_domicile, lng_domicile, role
       FROM chauffeurs
       WHERE role = 'chauffeur' ${filtre}
       ORDER BY numero_chauffeur`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/chauffeurs — créer un chauffeur
router.post('/', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { numero_chauffeur, nom, prenom, email, telephone,
          type_vehicule, adresse_domicile, lat_domicile, lng_domicile } = req.body;
  if (!numero_chauffeur || !nom || !prenom || !email)
    return res.status(400).json({ message: 'numero_chauffeur, nom, prenom, email requis' });
  try {
    const mdp_temp = numero_chauffeur + 'Dispatch2026!';
    const hash = await bcrypt.hash(mdp_temp, 10);
    const result = await pool.query(
      `INSERT INTO chauffeurs
         (numero_chauffeur, nom, prenom, email, telephone, type_vehicule,
          adresse_domicile, lat_domicile, lng_domicile, mot_de_passe_hash, role, actif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'chauffeur',TRUE)
       RETURNING id, numero_chauffeur, nom, prenom, email, telephone, type_vehicule,
                 actif, adresse_domicile, lat_domicile, lng_domicile`,
      [numero_chauffeur, nom, prenom, email, telephone || null,
       type_vehicule || 'TAXI', adresse_domicile || '', lat_domicile || null, lng_domicile || null, hash]
    );
    res.status(201).json({ ...result.rows[0], mot_de_passe_temp: mdp_temp });
  } catch (err) {
    if (err.code === '23505') {
      const field = err.constraint?.includes('email') ? 'email' : 'numero_chauffeur';
      return res.status(409).json({ message: `Ce ${field} existe déjà` });
    }
    console.error('Erreur POST chauffeur:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /api/chauffeurs/:id — modifier un chauffeur
router.put('/:id', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { nom, prenom, email, telephone, type_vehicule, adresse_domicile, lat_domicile, lng_domicile } = req.body;
  try {
    const result = await pool.query(
      `UPDATE chauffeurs SET
         nom            = COALESCE($1, nom),
         prenom         = COALESCE($2, prenom),
         email          = COALESCE($3, email),
         telephone      = COALESCE($4, telephone),
         type_vehicule  = COALESCE($5, type_vehicule),
         adresse_domicile = COALESCE($6, adresse_domicile),
         lat_domicile   = COALESCE($7, lat_domicile),
         lng_domicile   = COALESCE($8, lng_domicile),
         modifie_le     = NOW()
       WHERE id = $9 AND role = 'chauffeur'
       RETURNING id, numero_chauffeur, nom, prenom, email, telephone, type_vehicule,
                 actif, adresse_domicile, lat_domicile, lng_domicile`,
      [nom||null, prenom||null, email||null, telephone||null, type_vehicule||null,
       adresse_domicile||null, lat_domicile||null, lng_domicile||null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Chauffeur non trouvé' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email déjà utilisé' });
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PATCH /api/chauffeurs/:id/actif — activer/désactiver
router.patch('/:id/actif', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { actif } = req.body;
  if (typeof actif !== 'boolean') return res.status(400).json({ message: 'actif (boolean) requis' });
  try {
    const result = await pool.query(
      `UPDATE chauffeurs SET actif=$1, modifie_le=NOW() WHERE id=$2 AND role='chauffeur'
       RETURNING id, numero_chauffeur, nom, prenom, actif`,
      [actif, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Chauffeur non trouvé' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/chauffeurs/:id/reset-password — réinitialiser mot de passe
router.post('/:id/reset-password', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  try {
    const chRes = await pool.query(
      'SELECT numero_chauffeur FROM chauffeurs WHERE id=$1 AND role=\'chauffeur\'',
      [req.params.id]
    );
    if (chRes.rows.length === 0) return res.status(404).json({ message: 'Chauffeur non trouvé' });
    const numero = chRes.rows[0].numero_chauffeur;
    const mdp_temp = numero + 'Dispatch' + new Date().getFullYear() + '!';
    const hash = await bcrypt.hash(mdp_temp, 10);
    await pool.query(
      'UPDATE chauffeurs SET mot_de_passe_hash=$1, modifie_le=NOW() WHERE id=$2',
      [hash, req.params.id]
    );
    res.json({ message: 'Mot de passe réinitialisé', mot_de_passe_temp: mdp_temp });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
