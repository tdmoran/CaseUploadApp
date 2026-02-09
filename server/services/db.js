const { Pool } = require('pg');
const config = require('../config');

let pool = null;

function getPool() {
  if (!pool) {
    const dbUrl = config.databaseUrl;

    // Support split env vars (DB_HOST, DB_USER, etc.) as fallback
    // in case DATABASE_URL gets mangled by the hosting platform
    if (dbUrl) {
      pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });
    } else if (process.env.DB_HOST) {
      pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
      });
    }
  }
  return pool;
}

async function initDb() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS credentials (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      procedure_name TEXT,
      op_date TEXT,
      status TEXT DEFAULT 'pending',
      fields JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log('[DB] Tables initialized');
}

async function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { initDb, query, getPool };
