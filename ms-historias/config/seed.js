// Ejecutar una sola vez: node config/seed.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool   = require('./db');

async function seed() {
  const hash = await bcrypt.hash('Admin123*', 10);

  const usuarios = [
    ['Dr. Carlos Medina',  'medico@clinica.com',        hash, 'medico'],
    ['Ana Torres',         'admin@clinica.com',          hash, 'administrador'],
    ['Luis Farmacia',      'farmaceutico@clinica.com',  hash, 'farmaceutico'],
  ];

  for (const [nombre, email, password, perfil] of usuarios) {
    await pool.execute(
      `INSERT INTO usuarios (nombre, email, password, perfil)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      [nombre, email, password, perfil]
    );
    console.log(`✓ Usuario ${email} sincronizado`);
  }

  console.log('\n✅ Seed ms-historias completado');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
