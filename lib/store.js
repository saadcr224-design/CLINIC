'use strict';
// Minimal encrypted JSON document store. Each collection is one encrypted file.
// Replace with a managed database (PostgreSQL with TDE / column encryption) for production scale.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dataDir } = require('./config');
const { encrypt, decrypt } = require('./crypto');


const cache = new Map();

function file(name) {
  if (!/^[a-z_]+$/.test(name)) throw new Error('bad collection name');
  return path.join(dataDir, `${name}.enc`);
}

function all(name) {
  if (cache.has(name)) return cache.get(name);
  let rows = [];
  try {
    rows = JSON.parse(decrypt(fs.readFileSync(file(name), 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  cache.set(name, rows);
  return rows;
}

function save(name) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 }); // e.g. a fresh /tmp on a new serverless instance
  const tmp = file(name) + '.tmp';
  fs.writeFileSync(tmp, encrypt(JSON.stringify(cache.get(name))), { mode: 0o600 });
  fs.renameSync(tmp, file(name));
}

function insert(name, doc) {
  const rows = all(name);
  const row = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...doc };
  rows.push(row);
  save(name);
  return row;
}

function update(name, id, patch) {
  const row = all(name).find((r) => r.id === id);
  if (!row) return null;
  Object.assign(row, patch, { updatedAt: new Date().toISOString() });
  save(name);
  return row;
}

function find(name, pred) {
  return all(name).filter(pred);
}

module.exports = { all, insert, update, find };
