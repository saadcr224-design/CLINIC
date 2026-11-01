'use strict';
const bcrypt = require('bcryptjs');
const store = require('./store');

// Role-based access control. Each role gets an explicit list of permissions.
const PERMISSIONS = {
  patient: ['portal:self'],
  doctor: ['appointments:read:own'],
  reception: ['appointments:read', 'appointments:update', 'messages:read'],
  admin: ['appointments:read', 'appointments:update', 'messages:read', 'audit:read', 'users:manage'],
};

const can = (user, perm) => !!user && (PERMISSIONS[user.role] || []).includes(perm);

async function createUser({ email, password, role, name, doctorSlug = null, patient = null }) {
  if (!PERMISSIONS[role]) throw new Error(`unknown role ${role}`);
  if (findByEmail(email)) throw new Error(`user ${email} exists`);
  if (password.length < 12) throw new Error('password must be at least 12 characters');
  return store.insert('users', {
    email: email.toLowerCase(),
    name,
    role,
    doctorSlug,
    patient,
    hash: await bcrypt.hash(password, 12),
  });
}

function findByEmail(email) {
  return store.all('users').find((u) => u.email === String(email).toLowerCase());
}

// Constant-ish time: always run bcrypt even when the user does not exist.
const DUMMY = bcrypt.hashSync('dummy-password-for-timing', 12);
async function verify(email, password) {
  const user = findByEmail(email);
  const ok = await bcrypt.compare(String(password), user ? user.hash : DUMMY);
  return ok && user ? user : null;
}

// Demo accounts so the portal and staff console can be tried out (see config.demoAccounts).
const DEMO_USERS = [
  { email: 'patient@demo.local', password: 'Patient#Demo2026', role: 'patient', name: 'Sara Ahmed',
    patient: { mrn: 'MRN-100245', dob: '1990-04-12', bloodType: 'O+',
      reports: [
        { date: '2026-10-02', name: 'Complete Blood Count (CBC)', status: 'Normal' },
        { date: '2026-10-02', name: 'HbA1c', status: '5.4% · Normal' },
        { date: '2026-08-15', name: 'Lipid Profile', status: 'LDL slightly high' },
      ],
      prescriptions: [
        { date: '2026-10-02', drug: 'Vitamin D3 50,000 IU', dose: 'Once weekly for 8 weeks', doctor: 'Dr. Ahmed Siddiqui' },
        { date: '2026-08-15', drug: 'Atorvastatin 10 mg', dose: 'Once daily at night', doctor: 'Dr. Khalid Al-Harbi' },
      ] } },
  { email: 'reception@demo.local', password: 'Reception#Demo2026', role: 'reception', name: 'Front Desk' },
  { email: 'doctor@demo.local', password: 'Doctor#Demo2026', role: 'doctor', name: 'Dr. Khalid Al-Harbi', doctorSlug: 'dr-khalid-al-harbi' },
  { email: 'admin@demo.local', password: 'Admin#Demo2026!', role: 'admin', name: 'System Admin' },
];

async function seedDemoUsers() {
  for (const u of DEMO_USERS) if (!findByEmail(u.email)) await createUser(u);
}

module.exports = { can, createUser, findByEmail, verify, seedDemoUsers, DEMO_USERS, PERMISSIONS };
