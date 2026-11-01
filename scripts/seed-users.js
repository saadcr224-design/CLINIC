#!/usr/bin/env node
'use strict';
// Create a staff or patient account:  npm run seed -- admin@clinic.sa "Full Name" admin
// The password is read from the CLINIC_NEW_PASSWORD env var so it never lands in shell history.
const auth = require('../lib/auth');

(async () => {
  const [email, name, role = 'reception', doctorSlug = null] = process.argv.slice(2);
  const password = process.env.CLINIC_NEW_PASSWORD;
  if (!email || !name || !password) {
    console.error('Usage: CLINIC_NEW_PASSWORD=... npm run seed -- <email> "<name>" <patient|reception|doctor|admin> [doctor-slug]');
    process.exit(1);
  }
  await auth.createUser({ email, name, role, password, doctorSlug });
  console.log(`Created ${role} account for ${email}`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
