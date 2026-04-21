const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router  = express.Router();

// ─── GET /api/routes ──────────────────────────────────────────────────────────
// Liste des routes avec filtres optionnels : chauffeur_id, date, statut
// Chauffeurs : voient uniquement leurs propres routes
// Dispatch/admin : peuvent filtrer par n'importe quel chauffeur
router.get('/', authMiddleware, async (req, res) => {
  const { chauffeur_id, date, statut } = req.query;
  try {
    const cid = req.user.role === 'chauffeur' ? req.user.id : (chauffeur_id || null);
    const result = await pool.query(`
      SELECT r.*,
             c.nom AS chauffeur_nom, c.prenom AS chauffeur_prenom,
             COUNT(s.id)::int AS nb_stops,
             COUNT(s.id) FILTER (WHERE s.statut = 'arrive')::int AS nb_arrives
      FROM routes r
      JOIN chauffeurs c ON c.id = r.chauffeur_id
      LEFT JOIN stops s ON s.route_id = r.id
      WHERE ($1::uuid IS NULL OR r.chauffeur_id = $1)
        AND ($2::date IS NULL OR r.date_planifiee = $2)
        AND ($3::varchar IS NULL OR r.statut = $3)
      GROUP BY r.id, c.nom, c.prenom
      ORDER BY r.date_planifiee DESC, r.created_at DESC`,
      [cid, date || null, statut || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET routes:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── GET /api/routes/me/route-du-jour ────────────────────────────────────────
// Route du jour du chauffeur authentifié (en_cours en priorité, sinon planifiee)
// NOTE : doit être déclaré avant /:id pour ne pas être capturé par le paramètre
router.get('/me/route-du-jour', authMiddleware, requireRole('chauffeur'), async (req, res) => {
  try {
    const routeRes = await pool.query(`
      SELECT * FROM routes
      WHERE chauffeur_id = $1
        AND date_planifiee = CURRENT_DATE
        AND statut IN ('planifiee','en_cours')
      ORDER BY CASE statut WHEN 'en_cours' THEN 0 ELSE 1 END
      LIMIT 1`,
      [req.user.id]
    );
    if (!routeRes.rows.length) return res.json(null);
    const route = routeRes.rows[0];
    const stopsRes = await pool.query(
      `SELECT * FROM stops WHERE route_id = $1 ORDER BY ordre`,
      [route.id]
    );
    route.stops = stopsRes.rows;
    res.json(route);
  } catch (err) {
    console.error('Erreur GET route-du-jour:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── GET /api/routes/:id ──────────────────────────────────────────────────────
// Détail d'une route avec ses stops ordonnés
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const routeRes = await pool.query(`
      SELECT r.*,
             c.nom AS chauffeur_nom, c.prenom AS chauffeur_prenom, c.numero_chauffeur
      FROM routes r
      JOIN chauffeurs c ON c.id = r.chauffeur_id
      WHERE r.id = $1`, [req.params.id]
    );
    if (!routeRes.rows.length) {
      return res.status(404).json({ message: 'Route non trouvée' });
    }
    const route = routeRes.rows[0];

    // Chauffeur ne peut voir que ses propres routes
    if (req.user.role === 'chauffeur' && route.chauffeur_id !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const stopsRes = await pool.query(
      `SELECT * FROM stops WHERE route_id = $1 ORDER BY ordre`,
      [req.params.id]
    );
    route.stops = stopsRes.rows;
    res.json(route);
  } catch (err) {
    console.error('Erreur GET route/:id:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── POST /api/routes ─────────────────────────────────────────────────────────
// Crée une route avec ses stops en une transaction atomique
// Body : { chauffeur_id, nom, date_planifiee, stops: [{ adresse, latitude, longitude, ordre, rayon_geofence_m?, notes?, heure_arrivee_prevue? }] }
router.post('/', authMiddleware, requireRole('dispatch', 'admin'), async (req, res) => {
  const { chauffeur_id, nom, date_planifiee, stops = [] } = req.body;

  if (!chauffeur_id)    return res.status(400).json({ message: 'chauffeur_id requis' });
  if (!nom || !nom.trim()) return res.status(400).json({ message: 'nom requis' });
  if (!date_planifiee)  return res.status(400).json({ message: 'date_planifiee requis' });
  if (!Array.isArray(stops) || stops.length === 0) {
    return res.status(400).json({ message: 'Au moins un stop est requis' });
  }

  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    if (!s.adresse?.trim()) return res.status(400).json({ message: `Stop ${i + 1} : adresse requise` });
    if (s.latitude  == null || s.latitude  < -90  || s.latitude  > 90)
      return res.status(400).json({ message: `Stop ${i + 1} : latitude invalide (-90..90)` });
    if (s.longitude == null || s.longitude < -180 || s.longitude > 180)
      return res.status(400).json({ message: `Stop ${i + 1} : longitude invalide (-180..180)` });
    const rayon = s.rayon_geofence_m ?? 50;
    if (rayon < 10 || rayon > 500)
      return res.status(400).json({ message: `Stop ${i + 1} : rayon_geofence_m doit être entre 10 et 500` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const routeRes = await client.query(`
      INSERT INTO routes (chauffeur_id, nom, date_planifiee)
      VALUES ($1, $2, $3)
      RETURNING *`,
      [chauffeur_id, nom.trim(), date_planifiee]
    );
    const route = routeRes.rows[0];

    const insertedStops = [];
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const ordre = s.ordre ?? i + 1;
      const stopRes = await client.query(`
        INSERT INTO stops (route_id, ordre, adresse, latitude, longitude,
                           rayon_geofence_m, notes, heure_arrivee_prevue)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          route.id, ordre, s.adresse.trim(),
          s.latitude, s.longitude,
          s.rayon_geofence_m ?? 50,
          s.notes || null,
          s.heure_arrivee_prevue || null,
        ]
      );
      insertedStops.push(stopRes.rows[0]);
    }

    await client.query('COMMIT');
    route.stops = insertedStops;
    res.status(201).json(route);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur POST routes:', err.message);
    if (err.constraint === 'uq_stop_route_ordre') {
      return res.status(400).json({ message: 'Deux stops ont le même ordre' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/routes/:id ────────────────────────────────────────────────────
// Modifie nom, date_planifiee ou statut d'une route
router.patch('/:id', authMiddleware, requireRole('dispatch', 'admin'), async (req, res) => {
  const { nom, date_planifiee, statut } = req.body;
  const validStatuts = ['planifiee', 'en_cours', 'terminee', 'annulee'];
  if (statut && !validStatuts.includes(statut)) {
    return res.status(400).json({ message: `statut invalide. Valeurs acceptées : ${validStatuts.join(', ')}` });
  }
  try {
    const result = await pool.query(`
      UPDATE routes SET
        nom            = COALESCE($1, nom),
        date_planifiee = COALESCE($2::date, date_planifiee),
        statut         = COALESCE($3, statut),
        updated_at     = NOW()
      WHERE id = $4
      RETURNING *`,
      [nom?.trim() || null, date_planifiee || null, statut || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Route non trouvée' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur PATCH route:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── DELETE /api/routes/:id ───────────────────────────────────────────────────
// Supprime une route (CASCADE sur les stops)
router.delete('/:id', authMiddleware, requireRole('dispatch', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM routes WHERE id = $1 RETURNING id`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Route non trouvée' });
    res.json({ message: 'Route supprimée' });
  } catch (err) {
    console.error('Erreur DELETE route:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── POST /api/routes/:id/start ───────────────────────────────────────────────
// Passe la route en statut 'en_cours' et enregistre l'heure de début
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE routes SET statut = 'en_cours', heure_debut_reelle = NOW(), updated_at = NOW()
      WHERE id = $1
        AND statut = 'planifiee'
        AND ($2 = 'chauffeur' AND chauffeur_id = $3 OR $2 != 'chauffeur')
      RETURNING *`,
      [req.params.id, req.user.role, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Route non trouvée ou déjà démarrée' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST route start:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── POST /api/routes/:id/complete ───────────────────────────────────────────
// Passe la route en statut 'terminee'
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE routes SET statut = 'terminee', heure_fin_reelle = NOW(), updated_at = NOW()
      WHERE id = $1
        AND statut = 'en_cours'
        AND ($2 = 'chauffeur' AND chauffeur_id = $3 OR $2 != 'chauffeur')
      RETURNING *`,
      [req.params.id, req.user.role, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Route non trouvée ou non en cours' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur POST route complete:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
