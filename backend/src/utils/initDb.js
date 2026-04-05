const pool = require('../models/db');
require('dotenv').config();

const SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS chauffeurs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_chauffeur  VARCHAR(10)  NOT NULL UNIQUE,
    nom               VARCHAR(100) NOT NULL,
    prenom            VARCHAR(100) NOT NULL,
    email             VARCHAR(255) NOT NULL UNIQUE,
    telephone         VARCHAR(20),
    adresse_domicile  TEXT NOT NULL,
    lat_domicile      DECIMAL(10,7),
    lng_domicile      DECIMAL(10,7),
    type_vehicule     VARCHAR(50)  DEFAULT 'TAXI',
    actif             BOOLEAN      DEFAULT TRUE,
    mot_de_passe_hash TEXT NOT NULL,
    role              VARCHAR(20)  DEFAULT 'chauffeur',
    cree_le           TIMESTAMP    DEFAULT NOW(),
    modifie_le        TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trajets (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_trajet       VARCHAR(20)  NOT NULL UNIQUE,
    date_trajet       DATE NOT NULL,
    heure_prise       TIME NOT NULL,
    heure_arrivee     TIME NOT NULL,
    type_vehicule     VARCHAR(50)  DEFAULT 'TAXI',
    adresse_prise     TEXT NOT NULL,
    lat_prise         DECIMAL(10,7),
    lng_prise         DECIMAL(10,7),
    adresse_arrivee   TEXT,
    lat_arrivee       DECIMAL(10,7),
    lng_arrivee       DECIMAL(10,7),
    code_fixe         VARCHAR(20),
    statut            VARCHAR(20)  DEFAULT 'en_attente',
    notes             TEXT,
    cree_le           TIMESTAMP    DEFAULT NOW(),
    modifie_le        TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disponibilites (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chauffeur_id      UUID NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
    date_dispo        DATE NOT NULL,
    heure_debut       TIME NOT NULL,
    heure_fin         TIME NOT NULL,
    soumis_le         TIMESTAMP DEFAULT NOW(),
    modifie_le        TIMESTAMP DEFAULT NOW(),
    UNIQUE(chauffeur_id, date_dispo, heure_debut)
);

CREATE TABLE IF NOT EXISTS affectations (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trajet_id         UUID NOT NULL REFERENCES trajets(id) ON DELETE CASCADE,
    chauffeur_id      UUID NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
    date_programme    DATE NOT NULL,
    proposee_par      VARCHAR(20) DEFAULT 'systeme',
    modifiee_par      UUID REFERENCES chauffeurs(id),
    statut            VARCHAR(20) DEFAULT 'proposee',
    email_envoye_le   TIMESTAMP,
    notes_dispatch    TEXT,
    cree_le           TIMESTAMP DEFAULT NOW(),
    modifie_le        TIMESTAMP DEFAULT NOW(),
    UNIQUE(trajet_id, date_programme)
);

CREATE TABLE IF NOT EXISTS envois_email (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chauffeur_id      UUID NOT NULL REFERENCES chauffeurs(id),
    date_programme    DATE NOT NULL,
    envoye_par        UUID REFERENCES chauffeurs(id),
    envoye_le         TIMESTAMP DEFAULT NOW(),
    nb_trajets        INTEGER,
    statut_envoi      VARCHAR(20) DEFAULT 'envoye',
    erreur            TEXT
);

CREATE INDEX IF NOT EXISTS idx_trajets_date         ON trajets(date_trajet);
CREATE INDEX IF NOT EXISTS idx_disponibilites_date  ON disponibilites(date_dispo);
CREATE INDEX IF NOT EXISTS idx_disponibilites_chauf ON disponibilites(chauffeur_id);
CREATE INDEX IF NOT EXISTS idx_affectations_date    ON affectations(date_programme);
CREATE INDEX IF NOT EXISTS idx_affectations_chauf   ON affectations(chauffeur_id);
`;

async function initDb() {
  try {
    console.log('Initialisation BD...');
    await pool.query(SQL);
    console.log('Tables creees avec succes!');
    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  }
}
initDb();
