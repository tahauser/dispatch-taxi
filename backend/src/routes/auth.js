const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
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
              telephone, adresse_domicile, type_vehicule, actif
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

module.exports = router;
