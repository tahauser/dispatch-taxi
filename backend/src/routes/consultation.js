const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router  = express.Router();

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '';
}

// GET /api/consultation/logs?date= — admin: accusés de réception
router.get('/logs', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { date } = req.query;
  try {
    const result = await pool.query(
      `SELECT e.id, c.numero_chauffeur, c.nom, c.prenom, c.email,
              e.envoye_le, e.nb_trajets,
              cl.date_consultation, cl.ip_address,
              CASE
                WHEN cl.date_consultation IS NOT NULL THEN 'consulte'
                WHEN e.envoye_le IS NOT NULL THEN 'en_attente'
                ELSE 'non_envoye'
              END AS statut_consultation
       FROM envois_email e
       JOIN chauffeurs c ON c.id = e.chauffeur_id
       LEFT JOIN (
         SELECT DISTINCT ON (chauffeur_id, date_programme)
           chauffeur_id, date_programme, date_consultation, ip_address
         FROM consultation_logs
         ORDER BY chauffeur_id, date_programme, date_consultation DESC
       ) cl ON cl.chauffeur_id = e.chauffeur_id AND cl.date_programme = e.date_programme
       WHERE ($1::date IS NULL OR e.date_programme = $1)
       ORDER BY e.envoye_le DESC, c.nom`,
      [date || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET logs consultation:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/consultation/dates — dates disponibles pour le filtre accusés
router.get('/dates', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT date_programme, COUNT(*) AS nb_envois
       FROM envois_email
       GROUP BY date_programme
       ORDER BY date_programme DESC
       LIMIT 60`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// GET /api/consultation/:token — chauffeur consulte son programme
router.get('/:token', authMiddleware, async (req, res) => {
  const { token } = req.params;
  try {
    // Vérifier le token de consultation (JWT signé avec le même secret)
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Lien invalide ou expiré' });
    }

    const { chauffeur_id, date_programme } = payload;
    if (!chauffeur_id || !date_programme)
      return res.status(400).json({ message: 'Token de consultation invalide' });

    // Vérifier que l'utilisateur connecté correspond au chauffeur du token
    if (req.user.id !== chauffeur_id && req.user.role === 'chauffeur')
      return res.status(403).json({ message: 'Ce lien ne vous est pas destiné' });

    // Récupérer le programme
    const trajetsRes = await pool.query(
      `SELECT t.code_trajet, t.heure_prise, t.heure_arrivee, t.type_vehicule,
              t.adresse_prise, t.adresse_arrivee, t.notes, t.statut
       FROM affectations a
       JOIN trajets t ON t.id = a.trajet_id
       WHERE a.chauffeur_id = $1 AND a.date_programme = $2
       ORDER BY t.heure_prise`,
      [chauffeur_id, date_programme]
    );

    const chaufRes = await pool.query(
      'SELECT numero_chauffeur, nom, prenom, email FROM chauffeurs WHERE id=$1',
      [chauffeur_id]
    );
    if (chaufRes.rows.length === 0)
      return res.status(404).json({ message: 'Chauffeur non trouvé' });

    // Logger la consultation (une seule fois par token)
    try {
      await pool.query(
        `INSERT INTO consultation_logs (chauffeur_id, date_programme, token, ip_address, user_agent)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (token) DO NOTHING`,
        [chauffeur_id, date_programme, token, getIp(req), req.headers['user-agent'] || '']
      );
    } catch {}

    res.json({
      chauffeur: chaufRes.rows[0],
      date_programme,
      trajets: trajetsRes.rows
    });
  } catch (err) {
    console.error('Erreur GET consultation:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
