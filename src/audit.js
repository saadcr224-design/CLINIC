'use strict';
// Append-only, hash-chained audit log. Each entry includes the hash of the previous one,
// so any edit or deletion breaks the chain and is detected by verify().
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dataDir } = require('./config');

const LOG = path.join(dataDir, 'audit.log');
let lastHash = null;

function readEntries() {
  try {
    return fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function hashOf(entry) {
  const { hash, ...rest } = entry;
  return crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex');
}

function log(req, action, target = null, details = null) {
  if (lastHash === null) {
    const entries = readEntries();
    lastHash = entries.length ? entries[entries.length - 1].hash : 'GENESIS';
  }
  const user = req && req.session && req.session.user;
  const entry = {
    ts: new Date().toISOString(),
    actor: user ? user.email : 'anonymous',
    role: user ? user.role : 'public',
    action,
    target,
    details,
    ip: req ? req.ip : null,
    prev: lastHash,
  };
  entry.hash = hashOf(entry);
  fs.appendFileSync(LOG, JSON.stringify(entry) + '\n', { mode: 0o600 });
  lastHash = entry.hash;
  return entry;
}

function verify() {
  let prev = 'GENESIS';
  const entries = readEntries();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.prev !== prev || hashOf(e) !== e.hash) return { ok: false, brokenAt: i, total: entries.length };
    prev = e.hash;
  }
  return { ok: true, total: entries.length };
}

module.exports = { log, verify, readEntries };
