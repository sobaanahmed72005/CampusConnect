const { Pool } = require('pg');
require('dotenv').config();

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'
        ? { rejectUnauthorized: false }
        : false
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'campusconnect',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'
        ? { rejectUnauthorized: false }
        : false
    });

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('⚠️ Database pool background warning:', err.message || err);
});

const { recordDbQueryLatency } = require('../middleware/metricsCollector')

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    recordDbQueryLatency(duration);
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Query executed:', { text: text.substring(0, 60), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    throw error;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
