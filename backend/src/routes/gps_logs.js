const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router  = express.Router();

const VALID_EVENTS = ['tracking', 'geofence_enter', 'geofence_exit', 'stop_arrived', 'manual'];

function validateLog(log, index) {
  const prefix = index != null ? `Log ${index + 1} : ` : '';
  if (log.latitude  == null || log.latitude  < -90  || log.latitude  > 90)
    return `${prefix}latitude invalide (-90..90)`;
  if (log.longitude == null || log.longitude < -180 || log.longitude > 180)
    return `${prefix}longitude invalide (-180..180)`;
  if (!log.timestamp_device)
    return `${prefix}timestamp_device requis`;
  if (log.event_type && !VALID_EVENTS.includes(log.event_type))
    return `${prefix}event_type invalide. Valeurs : ${VALID_EVENTS.join(', ')}`;
  return null;
}

// ─── POST /api/gps-logs ───────────────────────────────────────────────────────
// Batch insert de plusieurs points GPS (envoyés par le mobile)
// Body : { logs: [{ latitude, longitude, timestamp_device, vitesse_kmh?, precision_m?, route_id?, stop_id?, event_type? }] }
router.post('/', authMiddleware, async (req, res) => {
  const { logs } = req.body;
  if (!Array.isArray(logs) || logs.length === 0) {
    return res.status(400).json({ message: 'logs doit être un tableau non vide' });
  }
  if (logs.length > 500) {
    return res.status(400).json({ message: 'Maximum 500 logs par requête' });
  }

  for (let i = 0; i < logs.length; i++) {
    const err = validateLog(logs[i], i);
    if (err) return res.status(400).json({ message: err });
  }

  try {
    // Construction d'un INSERT multi-valeurs pour performance
    const values = [];
    const params = [];
    logs.forEach((log, i) => {
      const base = i * 9;
      values.push(
        `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9})`
      );
      params.push(
        req.user.id,
        log.route_id  || null,
        log.stop_id   || null,
        log.latitude,
        log.longitude,
        log.vitesse_kmh  ?? null,
        log.precision_m  ?? null,
        log.timestamp_device,
        log.event_type   || 'tracking',
      );
    });

    const result = await pool.query(
      `INSERT INTO gps_logs
         (chauffeur_id, route_id, stop_id, latitude, longitude,
          vitesse_kmh, precision_m, timestamp_device, event_type)
       VALUES ${values.join(',')}
       RETURNING id`,
      params
    );
    res.status(201).json({ message: `${result.rows.length} log(s) enregistré(s)`, count: result.rows.length });
  } catch (err) {
    console.error('Erreur POST gps-logs batch:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── POST /api/gps-logs/single ────────────────────────────────────────────────
// Insert d'un seul point GPS
// Body : { latitude, longitude, timestamp_device, vitesse_kmh?, precision_m?, route_id?, stop_id?, event_type? }
router.post('/single', authMiddleware, async (req, res) => {
  const validationErr = validateLog(req.body, null);
  if (validationErr) return res.status(400).json({ message: validationErr });

  const { latitude, longitude, timestamp_device, vitesse_kmh, precision_m, route_id, stop_id, event_type } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO gps_logs
        (chauffeur_id, route_id, stop_id, latitude, longitude,
         vitesse_kmh, precision_m, timestamp_device, event_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        req.user.id, route_id || null, stop_id || null,
        latitude, longitude, vitesse_kmh ?? null, precision_m ?? null,
        timestamp_device, event_type || 'tracking',
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST gps-logs single:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── GET /api/gps-logs ────────────────────────────────────────────────────────
// Historique GPS avec filtres optionnels
// Dispatch/admin : peuvent filtrer par chauffeur_id
// Chauffeurs : voient uniquement leurs propres logs
// Filtres : chauffeur_id, route_id, date_debut, date_fin, event_type, limit (max 1000)
router.get('/', authMiddleware, async (req, res) => {
  const { chauffeur_id, route_id, date_debut, date_fin, event_type, limit = 200 } = req.query;

  const cap = Math.min(parseInt(limit, 10) || 200, 1000);
  const cid = req.user.role === 'chauffeur' ? req.user.id : (chauffeur_id || null);

  if (event_type && !VALID_EVENTS.includes(event_type)) {
    return res.status(400).json({ message: `event_type invalide. Valeurs : ${VALID_EVENTS.join(', ')}` });
  }

  try {
    const result = await pool.query(`
      SELECT g.*, c.nom AS chauffeur_nom, c.prenom AS chauffeur_prenom
      FROM gps_logs g
      JOIN chauffeurs c ON c.id = g.chauffeur_id
      WHERE ($1::uuid IS NULL OR g.chauffeur_id = $1)
        AND ($2::uuid IS NULL OR g.route_id = $2)
        AND ($3::timestamptz IS NULL OR g.timestamp_device >= $3)
        AND ($4::timestamptz IS NULL OR g.timestamp_device <= $4)
        AND ($5::varchar IS NULL OR g.event_type = $5)
      ORDER BY g.timestamp_device DESC
      LIMIT $6`,
      [cid, route_id || null, date_debut || null, date_fin || null, event_type || null, cap]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET gps-logs:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
