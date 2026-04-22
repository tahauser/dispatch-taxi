-- Migration : routes multi-stops, stops et logs GPS
-- Date : 2026-04-21
-- Dépendances : extension uuid-ossp (déjà activée), table chauffeurs

-- ─── Table routes ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS routes (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chauffeur_id     UUID        NOT NULL REFERENCES chauffeurs(id) ON DELETE RESTRICT,
  nom              VARCHAR(255) NOT NULL,
  date_planifiee   DATE        NOT NULL,
  statut           VARCHAR(20) NOT NULL DEFAULT 'planifiee'
                               CHECK (statut IN ('planifiee','en_cours','terminee','annulee')),
  heure_debut_reelle TIMESTAMP WITH TIME ZONE,
  heure_fin_reelle   TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_chauffeur   ON routes (chauffeur_id);
CREATE INDEX IF NOT EXISTS idx_routes_date        ON routes (date_planifiee);
CREATE INDEX IF NOT EXISTS idx_routes_statut      ON routes (statut);

-- ─── Table stops ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stops (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id               UUID        NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  ordre                  INTEGER     NOT NULL,
  adresse                TEXT        NOT NULL,
  latitude               DOUBLE PRECISION NOT NULL
                                     CHECK (latitude  BETWEEN -90  AND 90),
  longitude              DOUBLE PRECISION NOT NULL
                                     CHECK (longitude BETWEEN -180 AND 180),
  rayon_geofence_m       INTEGER     NOT NULL DEFAULT 50
                                     CHECK (rayon_geofence_m BETWEEN 10 AND 500),
  notes                  TEXT,
  statut                 VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                                     CHECK (statut IN ('en_attente','en_approche','arrive','skip')),
  heure_arrivee_prevue   TIMESTAMP WITH TIME ZONE,
  heure_arrivee_reelle   TIMESTAMP WITH TIME ZONE,
  created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stop_route_ordre UNIQUE (route_id, ordre)
);

CREATE INDEX IF NOT EXISTS idx_stops_route  ON stops (route_id);
CREATE INDEX IF NOT EXISTS idx_stops_statut ON stops (statut);

-- ─── Table gps_logs ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gps_logs (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chauffeur_id      UUID        NOT NULL REFERENCES chauffeurs(id) ON DELETE RESTRICT,
  route_id          UUID        REFERENCES routes(id) ON DELETE SET NULL,
  stop_id           UUID        REFERENCES stops(id)  ON DELETE SET NULL,
  latitude          DOUBLE PRECISION NOT NULL
                                CHECK (latitude  BETWEEN -90  AND 90),
  longitude         DOUBLE PRECISION NOT NULL
                                CHECK (longitude BETWEEN -180 AND 180),
  vitesse_kmh       REAL,
  precision_m       REAL,
  timestamp_device  TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  event_type        VARCHAR(20) NOT NULL DEFAULT 'tracking'
                                CHECK (event_type IN (
                                  'tracking','geofence_enter','geofence_exit',
                                  'stop_arrived','manual'
                                ))
);

CREATE INDEX IF NOT EXISTS idx_gps_chauf_date  ON gps_logs (chauffeur_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_route       ON gps_logs (route_id, received_at);
CREATE INDEX IF NOT EXISTS idx_gps_event_type  ON gps_logs (event_type);
