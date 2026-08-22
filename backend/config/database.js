const { Pool } = require('pg');
require('dotenv').config();

function createPool(useSsl) {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'campusconnect',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: useSsl ? { rejectUnauthorized: false } : false
  });
}

let pool = createPool(process.env.DB_SSL === 'true');

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
    try { recordDbQueryLatency(duration) } catch (e) {}
    return res;
  } catch (error) {
    // If SSL connection fails on Railway internal network, automatically recreate pool without SSL and retry once
    if (error.message && (error.message.includes('SSL') || error.message.includes('does not support SSL'))) {
      console.warn('⚠️ Retrying query without SSL mode...');
      pool = createPool(false);
      const res = await pool.query(text, params);
      return res;
    }
    console.error('❌ Database query error:', error.message);
    throw error;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
