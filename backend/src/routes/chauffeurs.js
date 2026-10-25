const express  = require('express');
const pool     = require('../models/db');
const bcrypt   = require('bcryptjs');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router   = express.Router();

// GET /api/chauffeurs — liste tous (dispatch voit actifs uniquement, admin voit tous)
router.get('/', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { tous } = req.query;
  try {
    const filtre = (tous === '1') ? '' : `AND actif = TRUE`;
    const result = await pool.query(
      `SELECT id, numero_chauffeur, nom, prenom, email, telephone,
              type_vehicule, actif, adresse_domicile, lat_domicile, lng_domicile, role,
              date_naissance::text AS date_naissance, numero_permis, categories_permis, photo,
              permis_expiration::text AS permis_expiration
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
          type_vehicule, adresse_domicile, lat_domicile, lng_domicile,
          date_naissance, numero_permis, categories_permis, photo } = req.body;
  if (photo && (typeof photo !== 'string' || !photo.startsWith('data:image/jpeg;base64,') || photo.length > 90000))
    return res.status(400).json({ message: 'Photo invalide ou trop lourde' });
  if (!numero_chauffeur || !nom || !prenom || !email)
    return res.status(400).json({ message: 'numero_chauffeur, nom, prenom, email requis' });
  try {
    const mdp_temp = numero_chauffeur + 'Dispatch2026!';
    const hash = await bcrypt.hash(mdp_temp, 10);
    const result = await pool.query(
      `INSERT INTO chauffeurs
         (numero_chauffeur, nom, prenom, email, telephone, type_vehicule,
          adresse_domicile, lat_domicile, lng_domicile, mot_de_passe_hash, role, actif,
          date_naissance, numero_permis, categories_permis, photo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'chauffeur',TRUE,$11,$12,$13,$14)
       RETURNING id, numero_chauffeur, nom, prenom, email, telephone, type_vehicule,
                 actif, adresse_domicile, lat_domicile, lng_domicile`,
      [numero_chauffeur, nom, prenom, email, telephone || null,
       type_vehicule || 'TAXI', adresse_domicile || '', lat_domicile || null, lng_domicile || null, hash,
       date_naissance || null, numero_permis || null, categories_permis || null, photo || null]
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
  const b = req.body;
  const has = k => Object.prototype.hasOwnProperty.call(b, k);
  const vide = v => (v === '' || v === undefined ? null : v);
  if (has('photo') && b.photo && (typeof b.photo !== 'string' || !b.photo.startsWith('data:image/jpeg;base64,') || b.photo.length > 90000))
    return res.status(400).json({ message: 'Photo invalide ou trop lourde' });
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
         date_naissance    = CASE WHEN $10 THEN $11::date ELSE date_naissance END,
         numero_permis     = CASE WHEN $12 THEN $13 ELSE numero_permis END,
         categories_permis = CASE WHEN $14 THEN $15 ELSE categories_permis END,
         photo             = CASE WHEN $16 THEN $17 ELSE photo END,
         modifie_le     = NOW()
       WHERE id = $9 AND role = 'chauffeur'
       RETURNING id, numero_chauffeur, nom, prenom, email, telephone, type_vehicule,
                 actif, adresse_domicile, lat_domicile, lng_domicile,
                 date_naissance::text AS date_naissance, numero_permis, categories_permis, photo`,
      [nom||null, prenom||null, email||null, telephone||null, type_vehicule||null,
       adresse_domicile||null, lat_domicile||null, lng_domicile||null, req.params.id,
       has('date_naissance'), vide(b.date_naissance),
       has('numero_permis'), vide(b.numero_permis),
       has('categories_permis'), vide(b.categories_permis),
       has('photo'), vide(b.photo)]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Chauffeur non trouvé' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email déjà utilisé' });
    console.error('Erreur PUT chauffeur:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PATCH /api/chauffeurs/:id/actif — activer/désactiver
router.patch('/:id/actif', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { actif } = req.body;
  if (typeof actif !== 'boolean') return res.status(400).json({ message: 'actif (boolean) requis' });
  try {
    if (actif === false) {
      // Refuser si le chauffeur a des trajets actifs (aujourd'hui ou à venir)
      const act = await pool.query(
        `SELECT COUNT(*)::int AS nb, MIN(date_programme)::text AS premiere, MAX(date_programme)::text AS derniere
         FROM affectations
         WHERE chauffeur_id=$1 AND statut IN ('proposee','confirmee','envoyee')
           AND date_programme >= (NOW() AT TIME ZONE 'America/Montreal')::date`,
        [req.params.id]);
      if (act.rows[0].nb > 0) {
        const { nb, premiere, derniere } = act.rows[0];
        return res.status(409).json({
          message: `Impossible de désactiver : ${nb} trajet${nb > 1 ? 's' : ''} actif${nb > 1 ? 's' : ''} (du ${premiere} au ${derniere}). Réaffectez-les d'abord.`,
          nb_trajets: nb, premiere, derniere
        });
      }
    }
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
