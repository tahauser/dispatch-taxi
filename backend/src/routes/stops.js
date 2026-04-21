const express = require('express');
const pool    = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const router  = express.Router();

// ─── PATCH /api/stops/:id ─────────────────────────────────────────────────────
// Modifie rayon_geofence_m, notes ou ordre d'un stop
router.patch('/:id', authMiddleware, async (req, res) => {
  const { rayon_geofence_m, notes, ordre } = req.body;

  if (rayon_geofence_m != null && (rayon_geofence_m < 10 || rayon_geofence_m > 500)) {
    return res.status(400).json({ message: 'rayon_geofence_m doit être entre 10 et 500' });
  }
  if (ordre != null && (!Number.isInteger(ordre) || ordre < 1)) {
    return res.status(400).json({ message: 'ordre doit être un entier >= 1' });
  }

  try {
    // Vérifier accès : chauffeur ne peut modifier que ses propres stops
    if (req.user.role === 'chauffeur') {
      const check = await pool.query(`
        SELECT s.id FROM stops s
        JOIN routes r ON r.id = s.route_id
        WHERE s.id = $1 AND r.chauffeur_id = $2`,
        [req.params.id, req.user.id]
      );
      if (!check.rows.length) return res.status(403).json({ message: 'Accès refusé' });
    }

    const result = await pool.query(`
      UPDATE stops SET
        rayon_geofence_m = COALESCE($1, rayon_geofence_m),
        notes            = COALESCE($2, notes),
        ordre            = COALESCE($3, ordre),
        updated_at       = NOW()
      WHERE id = $4
      RETURNING *`,
      [rayon_geofence_m ?? null, notes ?? null, ordre ?? null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Stop non trouvé' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur PATCH stop:', err.message);
    if (err.constraint === 'uq_stop_route_ordre') {
      return res.status(400).json({ message: 'Un stop avec cet ordre existe déjà sur cette route' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── POST /api/stops/:id/arrive ───────────────────────────────────────────────
// Marque un stop comme arrivé (déclenché par le geofencing mobile)
// Body : { latitude, longitude, timestamp_device }
router.post('/:id/arrive', authMiddleware, async (req, res) => {
  const { latitude, longitude, timestamp_device } = req.body;

  if (latitude  == null || latitude  < -90  || latitude  > 90)
    return res.status(400).json({ message: 'latitude invalide (-90..90)' });
  if (longitude == null || longitude < -180 || longitude > 180)
    return res.status(400).json({ message: 'longitude invalide (-180..180)' });
  if (!timestamp_device)
    return res.status(400).json({ message: 'timestamp_device requis' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer le stop avec sa route pour vérifier les accès
    const stopRes = await client.query(`
      SELECT s.*, r.chauffeur_id
      FROM stops s JOIN routes r ON r.id = s.route_id
      WHERE s.id = $1`, [req.params.id]
    );
    if (!stopRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Stop non trouvé' });
    }
    const stop = stopRes.rows[0];

    if (req.user.role === 'chauffeur' && stop.chauffeur_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Mettre à jour le stop
    const updated = await client.query(`
      UPDATE stops SET
        statut               = 'arrive',
        heure_arrivee_reelle = $1,
        updated_at           = NOW()
      WHERE id = $2
      RETURNING *`,
      [timestamp_device, req.params.id]
    );

    // Créer le log GPS associé
    await client.query(`
      INSERT INTO gps_logs
        (chauffeur_id, route_id, stop_id, latitude, longitude,
         timestamp_device, event_type)
      VALUES ($1, $2, $3, $4, $5, $6, 'stop_arrived')`,
      [
        stop.chauffeur_id, stop.route_id, stop.id,
        latitude, longitude, timestamp_device,
      ]
    );

    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur POST stop arrive:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// ─── POST /api/stops/:id/skip ─────────────────────────────────────────────────
// Marque un stop comme skippé
router.post('/:id/skip', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE stops SET statut = 'skip', updated_at = NOW()
      WHERE id = $1
        AND EXISTS (
          SELECT 1 FROM routes r
          WHERE r.id = stops.route_id
            AND ($2 != 'chauffeur' OR r.chauffeur_id = $3)
        )
      RETURNING *`,
      [req.params.id, req.user.role, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Stop non trouvé ou accès refusé' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST stop skip:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
