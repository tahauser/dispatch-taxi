const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole, checkDeadline } = require('../middleware/auth');
const router  = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const { date } = req.query;
  try {
    let query, params;
    if (req.user.role === 'chauffeur') {
      query = `SELECT d.*, c.nom, c.prenom, c.numero_chauffeur, c.type_vehicule
               FROM disponibilites d JOIN chauffeurs c ON c.id = d.chauffeur_id
               WHERE d.chauffeur_id = $1 AND ($2::date IS NULL OR d.date_dispo = $2)
               ORDER BY d.date_dispo, d.heure_debut`;
      params = [req.user.id, date || null];
    } else {
      query = `SELECT d.*, c.nom, c.prenom, c.numero_chauffeur, c.type_vehicule,
                      c.adresse_domicile, c.lat_domicile, c.lng_domicile
               FROM disponibilites d JOIN chauffeurs c ON c.id = d.chauffeur_id
               WHERE ($1::date IS NULL OR d.date_dispo = $1)
               ORDER BY d.date_dispo, c.numero_chauffeur, d.heure_debut`;
      params = [date || null];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.post('/', authMiddleware, requireRole('chauffeur'), checkDeadline, async (req, res) => {
  const { date_dispo, heure_debut, heure_fin, note_journee } = req.body;
  if (!date_dispo || !heure_debut || !heure_fin)
    return res.status(400).json({ message: 'date_dispo, heure_debut et heure_fin requis' });
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);
  demain.setHours(0,0,0,0);
  if (new Date(date_dispo) < demain)
    return res.status(400).json({ message: 'La disponibilite doit etre pour au moins demain' });
  if (heure_fin <= heure_debut)
    return res.status(400).json({ message: 'heure_fin doit etre apres heure_debut' });
  try {
    const result = await pool.query(
      `INSERT INTO disponibilites (chauffeur_id, date_dispo, heure_debut, heure_fin, note_journee)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (chauffeur_id, date_dispo, heure_debut) DO UPDATE SET
         heure_fin=EXCLUDED.heure_fin, note_journee=EXCLUDED.note_journee, modifie_le=NOW()
       RETURNING *`,
      [req.user.id, date_dispo, heure_debut, heure_fin, note_journee || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.delete('/:id', authMiddleware, requireRole('chauffeur'), async (req, res) => {
  try {
    // Récupérer la dispo pour connaître sa date
    const check = await pool.query(
      'SELECT date_dispo FROM disponibilites WHERE id=$1 AND chauffeur_id=$2',
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(404).json({ message: 'Disponibilité non trouvée' });

    // Appliquer la même règle deadline que le POST
    const dateDispo = check.rows[0].date_dispo.toISOString().split('T')[0];
    const now       = new Date();
    const heure     = parseInt(process.env.DEADLINE_HEURE  || '18');
    const minute    = parseInt(process.env.DEADLINE_MINUTE || '0');
    const deadline  = new Date(); deadline.setHours(heure, minute, 0, 0);
    const demain    = new Date(); demain.setDate(demain.getDate() + 1);
    const strDemain = `${demain.getFullYear()}-${String(demain.getMonth()+1).padStart(2,'0')}-${String(demain.getDate()).padStart(2,'0')}`;

    if (now >= deadline && dateDispo === strDemain)
      return res.status(403).json({ message: `Saisie fermée après ${heure}h${String(minute).padStart(2,'0')} pour le lendemain` });

    await pool.query('DELETE FROM disponibilites WHERE id=$1', [req.params.id]);
    res.json({ message: 'Disponibilité supprimée' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
