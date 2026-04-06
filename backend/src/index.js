const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',           require('./routes/auth'));
app.use('/api/trajets',        require('./routes/trajets'));
app.use('/api/disponibilites', require('./routes/disponibilites'));

app.use('/api/chauffeurs', require('./routes/chauffeurs'));
app.use('/api/affectations', require('./routes/affectations'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok', version: '1.0.0', heure: new Date().toISOString()
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
