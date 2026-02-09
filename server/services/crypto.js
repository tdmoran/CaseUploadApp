const crypto = require('crypto');
const config = require('../config');
const { query } = require('./db');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const key = config.encryptionKey;
  if (!key || key.length < 16) {
    throw new Error('ENCRYPTION_KEY must be set in environment (min 16 chars)');
  }
  // Derive a 32-byte key from the provided key
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedStr) {
  const key = getKey();
  const [ivHex, authTagHex, encrypted] = encryptedStr.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function saveCredentials(username, password) {
  const data = JSON.stringify({ username, password });
  const encrypted = encrypt(data);

  // Upsert: delete existing row, insert new one (single-user table)
  await query('DELETE FROM credentials');
  await query(
    'INSERT INTO credentials (username, password_encrypted) VALUES ($1, $2)',
    [username, encrypted]
  );
}

async function loadCredentials() {
  const result = await query('SELECT password_encrypted FROM credentials LIMIT 1');
  if (result.rows.length === 0) {
    return null;
  }
  const decrypted = decrypt(result.rows[0].password_encrypted);
  return JSON.parse(decrypted);
}

module.exports = { encrypt, decrypt, saveCredentials, loadCredentials };
