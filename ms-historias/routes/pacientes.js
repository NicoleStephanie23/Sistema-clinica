const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');

// Todos los endpoints requieren autenticación
router.use(verifyToken);

// GET /api/pacientes/mis-pacientes — IDs de pacientes que el médico ha atendido
router.get('/mis-pacientes', requirePerfil('medico'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT paciente_id AS id FROM historias_clinicas WHERE medico_id = ?',
      [Number(req.user.id)]
    );
    res.json(rows.map(r => r.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pacientes
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
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

// GET /api/pacientes/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM pacientes WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pacientes  (médico o admin)
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
    // RF-14: médico solo puede editar pacientes que haya atendido
    if (req.user.perfil === 'medico') {
      const [check] = await pool.execute(
        'SELECT id FROM historias_clinicas WHERE paciente_id = ? AND medico_id = ? LIMIT 1',
        [req.params.id, Number(req.user.id)]
      );
      if (!check.length) {
        return res.status(403).json({ error: 'Solo puedes editar la información de pacientes que hayas atendido' });
      }
    }

    const fields = ['nombre','apellido','telefono','email','direccion','eps','alergias','grupo_sanguineo','sexo','fecha_nac'];
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
