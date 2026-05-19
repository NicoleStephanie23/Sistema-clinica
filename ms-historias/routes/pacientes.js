const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');

router.use(verifyToken);

// Verifica si un médico ha atendido a un paciente
async function esMiPaciente(medicoId, pacienteId) {
  const [rows] = await pool.execute(
    'SELECT 1 FROM historias_clinicas WHERE medico_id = ? AND paciente_id = ? LIMIT 1',
    [medicoId, pacienteId]
  );
  return rows.length > 0;
}

// GET /api/pacientes
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    if (req.user.perfil === 'medico') {
      // Solo los pacientes que este médico ha atendido
      let sql = `SELECT DISTINCT p.* FROM pacientes p
                 JOIN historias_clinicas h ON h.paciente_id = p.id
                 WHERE h.medico_id = ?`;
      const params = [req.user.id];
      if (q) {
        sql += ' AND (p.nombre LIKE ? OR p.apellido LIKE ? OR p.documento LIKE ?)';
        const like = `%${q}%`;
        params.push(like, like, like);
      }
      sql += ' ORDER BY p.apellido, p.nombre';
      const [rows] = await pool.execute(sql, params);
      return res.json(rows);
    }

    // Admin y farmacéutico ven todos
    let sql = 'SELECT * FROM pacientes';
    const params = [];
    if (q) {
      sql += ' WHERE nombre LIKE ? OR apellido LIKE ? OR documento LIKE ?';
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    sql += ' ORDER BY apellido, nombre';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pacientes/mis-pacientes  (ids de pacientes del médico)
router.get('/mis-pacientes', requirePerfil('medico'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT paciente_id AS id FROM historias_clinicas WHERE medico_id = ?',
      [req.user.id]
    );
    res.json(rows.map(r => r.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pacientes/:id
router.get('/:id', async (req, res) => {
  try {
    if (req.user.perfil === 'medico' && !await esMiPaciente(req.user.id, req.params.id)) {
      return res.status(403).json({ error: 'No tienes acceso a este paciente' });
    }
    const [rows] = await pool.execute('SELECT * FROM pacientes WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pacientes
router.post('/', requirePerfil('medico', 'administrador'), async (req, res) => {
  const { nombre, apellido, documento, tipo_documento, fecha_nac, sexo,
          telefono, email, direccion, eps, grupo_sanguineo, alergias } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO pacientes
        (nombre,apellido,documento,tipo_documento,fecha_nac,sexo,telefono,email,direccion,eps,grupo_sanguineo,alergias)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [nombre, apellido, documento, tipo_documento||'CC', fecha_nac, sexo,
       telefono, email, direccion, eps, grupo_sanguineo, alergias]
    );
    res.status(201).json({ id: result.insertId, message: 'Paciente registrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pacientes/:id
router.put('/:id', requirePerfil('medico', 'administrador'), async (req, res) => {
  try {
    if (req.user.perfil === 'medico' && !await esMiPaciente(req.user.id, req.params.id)) {
      return res.status(403).json({ error: 'No tienes acceso a este paciente' });
    }

    const fields = ['nombre','apellido','telefono','email','direccion','eps','alergias'];
    const updates = fields.filter(f => req.body[f] !== undefined);
    if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });

    const sql = `UPDATE pacientes SET ${updates.map(f=>`${f}=?`).join(',')} WHERE id=?`;
    await pool.execute(sql, [...updates.map(f=>req.body[f]), req.params.id]);
    res.json({ message: 'Paciente actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
