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

  console.log('Migrations OK');
}
runMigrations().catch(err => console.error('Migration error:', err.message));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',           require('./routes/auth'));
app.use('/api/trajets',        require('./routes/trajets'));
app.use('/api/disponibilites', require('./routes/disponibilites'));
app.use('/api/chauffeurs',     require('./routes/chauffeurs'));
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
