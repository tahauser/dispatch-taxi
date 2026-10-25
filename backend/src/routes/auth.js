const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const crypto  = require('crypto');
const { envoyerResetMdp } = require('../services/email');
const { geocoderAdresse } = require('../utils/geocode');
const router  = express.Router();

router.post('/login', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe)
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  try {
    const result = await pool.query(
      'SELECT * FROM chauffeurs WHERE email = $1 AND actif = TRUE',
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    const chauffeur = result.rows[0];
    const valide = await bcrypt.compare(mot_de_passe, chauffeur.mot_de_passe_hash);
    if (!valide)
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    const token = jwt.sign(
      { id: chauffeur.id, numero_chauffeur: chauffeur.numero_chauffeur,
        role: chauffeur.role, nom: chauffeur.nom, prenom: chauffeur.prenom },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    res.json({ token, chauffeur: {
      id: chauffeur.id, numero_chauffeur: chauffeur.numero_chauffeur,
      nom: chauffeur.nom, prenom: chauffeur.prenom,
      email: chauffeur.email, role: chauffeur.role,
      type_vehicule: chauffeur.type_vehicule
    }});
  } catch (err) {
    console.error('Erreur login:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, numero_chauffeur, nom, prenom, email, role,
              telephone, adresse_domicile, type_vehicule, actif,
              date_naissance::text AS date_naissance, numero_permis, categories_permis, photo
       FROM chauffeurs WHERE id = $1`, [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Chauffeur non trouve' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.put('/mot-de-passe', authMiddleware, async (req, res) => {
  const { ancien_mdp, nouveau_mdp } = req.body;
  if (!ancien_mdp || !nouveau_mdp)
    return res.status(400).json({ message: 'Ancien et nouveau mot de passe requis' });
  if (nouveau_mdp.length < 8)
    return res.status(400).json({ message: 'Minimum 8 caracteres' });
  try {
    const result = await pool.query('SELECT * FROM chauffeurs WHERE id = $1', [req.user.id]);
    const valide = await bcrypt.compare(ancien_mdp, result.rows[0].mot_de_passe_hash);
    if (!valide) return res.status(401).json({ message: 'Ancien mot de passe incorrect' });
    const hash = await bcrypt.hash(nouveau_mdp, 10);
    await pool.query('UPDATE chauffeurs SET mot_de_passe_hash=$1, modifie_le=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Mot de passe mis a jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/auth/forgot-password — envoie un lien (réponse identique que le compte existe ou non)
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const reponse = { message: 'Si ce compte existe, un courriel vient d\'être envoyé.' };
  if (!email) return res.json(reponse);
  try {
    const r = await pool.query('SELECT id, prenom, nom, email FROM chauffeurs WHERE email=$1 AND actif=TRUE', [email]);
    if (r.rows.length) {
      const token = crypto.randomBytes(32).toString('hex');
      const hash  = crypto.createHash('sha256').update(token).digest('hex');
      await pool.query(
        `UPDATE chauffeurs SET reset_token_hash=$1, reset_expires=NOW() + INTERVAL '1 hour' WHERE id=$2`,
        [hash, r.rows[0].id]);
      await envoyerResetMdp(r.rows[0], token);
    }
  } catch (err) { console.error('forgot-password:', err.message); }
  res.json(reponse);
});

// POST /api/auth/reset-password — { token, nouveau_mdp }
router.post('/reset-password', async (req, res) => {
  const { token, nouveau_mdp } = req.body;
  if (!token || !nouveau_mdp) return res.status(400).json({ message: 'Lien et nouveau mot de passe requis' });
  if (nouveau_mdp.length < 8) return res.status(400).json({ message: 'Minimum 8 caractères' });
  try {
    const hashToken = crypto.createHash('sha256').update(String(token)).digest('hex');
    const r = await pool.query(
      'SELECT id FROM chauffeurs WHERE reset_token_hash=$1 AND reset_expires > NOW() AND actif=TRUE', [hashToken]);
    if (!r.rows.length) return res.status(400).json({ message: 'Lien invalide ou expiré' });
    const hash = await bcrypt.hash(nouveau_mdp, 10);
    await pool.query(
      `UPDATE chauffeurs SET mot_de_passe_hash=$1, reset_token_hash=NULL, reset_expires=NULL, modifie_le=NOW() WHERE id=$2`,
      [hash, r.rows[0].id]);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PUT /api/auth/photo — { photo: dataURL JPEG redimensionnée } ou '' pour supprimer
router.put('/photo', authMiddleware, async (req, res) => {
  const { photo } = req.body;
  if (photo && (typeof photo !== 'string' || !photo.startsWith('data:image/jpeg;base64,') || photo.length > 90000))
    return res.status(400).json({ message: 'Photo invalide ou trop lourde' });
  try {
    await pool.query('UPDATE chauffeurs SET photo=$1, modifie_le=NOW() WHERE id=$2', [photo || null, req.user.id]);
    res.json({ message: 'Photo mise à jour' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// PUT /api/auth/profil — le chauffeur renseigne sa propre fiche
router.put('/profil', authMiddleware, async (req, res) => {
  // Comptes dispatch/admin : identité et téléphone seulement (pas de fiche chauffeur)
  if (req.user.role !== 'chauffeur') {
    const { prenom, nom, telephone } = req.body;
    if (!prenom?.trim() || !nom?.trim()) return res.status(400).json({ message: 'Prénom et nom requis' });
    try {
      const r = await pool.query(
        `UPDATE chauffeurs SET prenom=$1, nom=$2, telephone=$3, modifie_le=NOW() WHERE id=$4
         RETURNING id, nom, prenom, email, telephone, role`,
        [prenom.trim(), nom.trim(), telephone?.trim() || null, req.user.id]);
      return res.json(r.rows[0]);
    } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
  }
  const { telephone, adresse_domicile, date_naissance, numero_permis, categories_permis } = req.body;
  try {
    const cur = await pool.query('SELECT adresse_domicile FROM chauffeurs WHERE id=$1', [req.user.id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Chauffeur non trouvé' });
    let lat = null, lng = null;
    const adresseChangee = adresse_domicile && adresse_domicile.trim() !== cur.rows[0].adresse_domicile;
    if (adresseChangee) {
      try { const g = await geocoderAdresse(adresse_domicile.trim()); if (g) { lat = g.lat; lng = g.lng; } }
      catch (e) { console.error('geocode profil:', e.message); }
    }
    const r = await pool.query(
      `UPDATE chauffeurs SET
         telephone         = COALESCE($1, telephone),
         adresse_domicile  = COALESCE($2, adresse_domicile),
         date_naissance    = $3,
         numero_permis     = $4,
         categories_permis = $5,
         lat_domicile      = COALESCE($6, lat_domicile),
         lng_domicile      = COALESCE($7, lng_domicile),
         modifie_le        = NOW()
       WHERE id=$8
       RETURNING id, numero_chauffeur, nom, prenom, email, telephone, adresse_domicile,
                 date_naissance, numero_permis, categories_permis`,
      [telephone?.trim() || null, adresse_domicile?.trim() || null, date_naissance || null,
       numero_permis?.trim() || null, categories_permis?.trim() || null, lat, lng, req.user.id]);
    res.json(r.rows[0]);
  } catch (err) { console.error('profil:', err.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
