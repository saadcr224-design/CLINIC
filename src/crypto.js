'use strict';
const crypto = require('crypto');
const { dataKey } = require('./config');

if (dataKey.length !== 32) throw new Error('DATA_KEY must be 32 bytes (64 hex characters)');

// AES-256-GCM: confidentiality + integrity. Output: base64(iv | tag | ciphertext).
function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

function decrypt(blob) {
  const buf = Buffer.from(blob, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
