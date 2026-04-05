const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'dispatch_taxi',
  user:     process.env.DB_USER     || 'dispatch_user',
  password: process.env.DB_PASSWORD || '',
});

pool.on('connect', () => console.log('Connexion PostgreSQL etablie'));
pool.on('error', (err) => { console.error('Erreur PostgreSQL:', err.message); process.exit(1); });

module.exports = pool;
