const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const pool = require('./models/db');

// Migrations idempotentes
async function runMigrations() {
  await pool.query(`ALTER TABLE disponibilites ADD COLUMN IF NOT EXISTS note_journee TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS consultation_logs (
      id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      chauffeur_id      UUID NOT NULL REFERENCES chauffeurs(id),
      date_programme    DATE NOT NULL,
      token             TEXT NOT NULL,
      date_consultation TIMESTAMP DEFAULT NOW(),
      ip_address        VARCHAR(100),
      user_agent        TEXT,
      UNIQUE(token)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_consultation_logs_chauffeur ON consultation_logs(chauffeur_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_consultation_logs_date ON consultation_logs(date_programme)`);

  // Fiche chauffeur + réinitialisation du mot de passe
  await pool.query(`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS date_naissance DATE`);
  await pool.query(`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS numero_permis VARCHAR(50)`);
  await pool.query(`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS categories_permis VARCHAR(100)`);
  await pool.query(`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS photo TEXT`);
  await pool.query(`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS reset_token_hash TEXT`);
  await pool.query(`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP`);

  // Gestion de parc
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicules (
      id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      numero_unite          VARCHAR(20) NOT NULL UNIQUE,
      immatriculation       VARCHAR(20) NOT NULL UNIQUE,
      marque                VARCHAR(50),
      modele                VARCHAR(50),
      annee                 INTEGER,
      couleur               VARCHAR(30),
      type_vehicule         VARCHAR(50) NOT NULL DEFAULT 'TAXI',
      nb_places             INTEGER DEFAULT 4,
      kilometrage           INTEGER,
      statut                VARCHAR(20) NOT NULL DEFAULT 'actif',
      date_assurance_exp    DATE,
      date_immat_exp        DATE,
      date_prochain_entretien DATE,
      notes                 TEXT,
      cree_le               TIMESTAMP DEFAULT NOW(),
      modifie_le            TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicule_affectations (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      vehicule_id   UUID NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
      chauffeur_id  UUID NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
      date_debut    DATE NOT NULL,
      date_fin      DATE,
      notes         TEXT,
      cree_par      UUID REFERENCES chauffeurs(id),
      cree_le       TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_va_vehicule ON vehicule_affectations(vehicule_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_va_chauffeur ON vehicule_affectations(chauffeur_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicule_inspections (
      id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      vehicule_id      UUID NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
      type_inspection  VARCHAR(30) NOT NULL DEFAULT 'periodique',
      date_inspection  DATE NOT NULL,
      date_prochaine   DATE,
      kilometrage      INTEGER,
      resultat         VARCHAR(20) NOT NULL DEFAULT 'conforme',
      inspecteur       VARCHAR(100),
      checklist        JSONB,
      notes            TEXT,
      cree_par         UUID REFERENCES chauffeurs(id),
      cree_le          TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_vi_vehicule ON vehicule_inspections(vehicule_id, date_inspection DESC)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS parc_parametres (
      id INTEGER PRIMARY KEY DEFAULT 1,
      jours_avant TEXT NOT NULL DEFAULT '30,14,7,1',
      heure_envoi INTEGER NOT NULL DEFAULT 7,
      actif BOOLEAN NOT NULL DEFAULT TRUE,
      notifier_admins BOOLEAN NOT NULL DEFAULT TRUE,
      notifier_chauffeurs BOOLEAN NOT NULL DEFAULT TRUE,
      derniere_execution DATE,
      CHECK (id = 1)
    )
  `);
  await pool.query(`INSERT INTO parc_parametres (id) VALUES (1) ON CONFLICT DO NOTHING`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS parc_alertes_envoyees (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      vehicule_id UUID NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
      type_echeance VARCHAR(30) NOT NULL,
      date_echeance DATE NOT NULL,
      cle TEXT NOT NULL,
      jours_restants INTEGER,
      envoye_le TIMESTAMP DEFAULT NOW(),
      UNIQUE (vehicule_id, cle)
    )
  `);

  await pool.query(`CREATE TABLE IF NOT EXISTS absences (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chauffeur_id  UUID NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
    type          VARCHAR(20) NOT NULL DEFAULT 'conge',
    date_debut    DATE NOT NULL,
    date_fin      DATE NOT NULL,
    note          TEXT,
    cree_par      UUID,
    cree_le       TIMESTAMP DEFAULT NOW(),
    CHECK (date_fin >= date_debut)
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_absences_ch ON absences(chauffeur_id, date_debut, date_fin)`);

  await pool.query(`ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS permis_expiration DATE`);
  await pool.query(`CREATE TABLE IF NOT EXISTS exigences_conduite (
    type_vehicule VARCHAR(20) PRIMARY KEY,
    categories    TEXT NOT NULL DEFAULT '',
    formation     TEXT NOT NULL DEFAULT ''
  )`);
  await pool.query(`INSERT INTO exigences_conduite (type_vehicule, categories, formation) VALUES
      ('TAXI','',''),('BERLINE','',''),('VAN','',''),('MINIBUS','','') ON CONFLICT DO NOTHING`);
  await pool.query(`CREATE TABLE IF NOT EXISTS chauffeur_formations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chauffeur_id    UUID NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
    nom             VARCHAR(120) NOT NULL,
    date_obtention  DATE,
    date_expiration DATE,
    cree_le         TIMESTAMP DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS vehicule_couts (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicule_id   UUID NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
    date_cout     DATE NOT NULL,
    type          VARCHAR(20) NOT NULL DEFAULT 'carburant',
    montant       NUMERIC(10,2) NOT NULL CHECK (montant >= 0),
    litres        NUMERIC(8,2),
    kilometrage   INTEGER,
    fournisseur   VARCHAR(120),
    description   TEXT,
    cree_par      UUID,
    cree_le       TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_couts_veh ON vehicule_couts(vehicule_id, date_cout)`);

  // Statut de course + preuve de service
  for (const ddl of [
    `ADD COLUMN IF NOT EXISTS statut_course VARCHAR(20) NOT NULL DEFAULT 'a_faire'`,
    `ADD COLUMN IF NOT EXISTS t_en_route TIMESTAMP`,
    `ADD COLUMN IF NOT EXISTS t_arrive TIMESTAMP`,
    `ADD COLUMN IF NOT EXISTS t_a_bord TIMESTAMP`,
    `ADD COLUMN IF NOT EXISTS t_termine TIMESTAMP`,
    `ADD COLUMN IF NOT EXISTS geo_events JSONB`,
    `ADD COLUMN IF NOT EXISTS preuve_signature TEXT`,
    `ADD COLUMN IF NOT EXISTS preuve_photo TEXT`,
    `ADD COLUMN IF NOT EXISTS note_course TEXT`,
  ]) await pool.query(`ALTER TABLE affectations ${ddl}`);

  console.log('Migrations OK');
}
runMigrations().then(() => require('./services/parcAlertes').demarrer()).catch(err => console.error('Migration error:', err.message));

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',           require('./routes/auth'));
app.use('/api/trajets',        require('./routes/trajets'));
app.use('/api/disponibilites', require('./routes/disponibilites'));
app.use('/api/chauffeurs',     require('./routes/chauffeurs'));
app.use('/api/vehicules',      require('./routes/vehicules'));
app.use('/api/absences',       require('./routes/absences'));
app.use('/api/conduite',       require('./routes/conduite'));
app.use('/api/couts',          require('./routes/couts'));
app.use('/api/affectations',   require('./routes/affectations'));
app.use('/api/consultation',   require('./routes/consultation'));
app.use('/api/routes',         require('./routes/routes'));
app.use('/api/stops',          require('./routes/stops'));
app.use('/api/gps-logs',       require('./routes/gps_logs'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok', version: '1.1.0', heure: new Date().toISOString()
}));

app.use((req, res) => res.status(404).json({ message: `Route non trouvée: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => {
  console.error('Erreur:', err.message);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Dispatch API demarre sur le port ${PORT}`);
  console.log(`Sante: http://localhost:${PORT}/api/health`);
});

module.exports = app;
