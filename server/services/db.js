const { Pool } = require('pg');
const config = require('../config');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl && config.databaseUrl.includes('neon')
        ? { rejectUnauthorized: false }
        : false
    });
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
