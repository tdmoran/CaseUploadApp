const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const ALGORITHM = 'aes-256-gcm';
const CREDENTIALS_FILE = path.join(__dirname, '..', '..', 'credentials.enc');

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

function saveCredentials(username, password) {
  const data = JSON.stringify({ username, password });
  const encrypted = encrypt(data);
  fs.writeFileSync(CREDENTIALS_FILE, encrypted, 'utf8');
}

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    return null;
  }
  const encrypted = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
  const decrypted = decrypt(encrypted);
  return JSON.parse(decrypted);
}

module.exports = { encrypt, decrypt, saveCredentials, loadCredentials };
