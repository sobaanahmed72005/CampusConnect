const { Pool } = require('pg');
require('dotenv').config();

function createPool(useSsl) {
  const isSslRequired = useSsl !== undefined ? useSsl : (
    process.env.DB_SSL === 'true' || 
    process.env.NODE_ENV === 'production' || 
    (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'))
  );

  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isSslRequired ? { rejectUnauthorized: false } : false,
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
    ssl: isSslRequired ? { rejectUnauthorized: false } : false
  });
}

let pool = createPool();

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
    const msg = error?.message || error?.detail || error?.code || (typeof error === 'string' ? error : String(error));
    console.error('❌ Database query error:', msg);

    if (msg.includes('SSL') || msg.includes('pg_hba') || msg.includes('require') || msg.includes('does not support SSL')) {
      const currentSsl = Boolean(pool.options && pool.options.ssl);
      const nextSsl = !currentSsl;
      console.warn(`⚠️ Retrying query with SSL mode toggled to ${nextSsl}...`);
      try {
        pool = createPool(nextSsl);
        const res = await pool.query(text, params);
        return res;
      } catch (retryErr) {
        const retryMsg = retryErr?.message || retryErr?.detail || retryErr?.code || String(retryErr);
        console.error('❌ Retried database query error:', retryMsg);
        throw new Error(retryMsg);
      }
    }
    throw new Error(msg);
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
