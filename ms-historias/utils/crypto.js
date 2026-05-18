const crypto = require('crypto');

// Deriva una clave de 32 bytes desde la variable de entorno (AES-256)
const KEY = crypto
  .createHash('sha256')
  .update(process.env.FIELD_ENCRYPTION_KEY || 'clinica_field_key_dev_2024_change_in_prod')
  .digest();

const IV_LEN = 16;
const SEPARATOR = ':';

function encrypt(text) {
  if (text === null || text === undefined || text === '') return text;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return iv.toString('hex') + SEPARATOR + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text || typeof text !== 'string' || !text.includes(SEPARATOR)) return text;
  try {
    const [ivHex, encHex] = text.split(SEPARATOR);
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return text;
  }
}

module.exports = { encrypt, decrypt };
