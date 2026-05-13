const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');
const audit  = require('../middleware/audit');

router.use(verifyToken);

// GET /api/historias?paciente_id=X
router.get('/', async (req, res) => {
  try {
    const { paciente_id } = req.query;
    const esMedico = req.user.perfil === 'medico';
    let sql = `SELECT h.*, p.nombre, p.apellido, p.documento,
                      u.nombre AS medico_nombre
               FROM historias_clinicas h
               JOIN pacientes p ON p.id = h.paciente_id
               LEFT JOIN usuarios u ON u.id = h.medico_id
               WHERE 1=1`;
    const params = [];
    // RF-14: médico solo ve las historias que él creó
    if (esMedico) { sql += ' AND h.medico_id = ?'; params.push(req.user.id); }
    if (paciente_id) { sql += ' AND h.paciente_id = ?'; params.push(paciente_id); }
    sql += ' ORDER BY h.fecha DESC';
    const [rows] = await pool.execute(sql, params);
    await audit(req, 'listar_historias', 'historias_clinicas', paciente_id || null);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/historias/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT h.*, p.nombre, p.apellido, p.documento, u.nombre AS medico_nombre
       FROM historias_clinicas h
       JOIN pacientes p ON p.id = h.paciente_id
       LEFT JOIN usuarios u ON u.id = h.medico_id
       WHERE h.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Historia no encontrada' });
    await audit(req, 'ver_historia', 'historias_clinicas', req.params.id);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/historias  (solo médico)
router.post('/', requirePerfil('medico'), async (req, res) => {
  const { paciente_id, motivo_consulta, anamnesis, examen_fisico,
          diagnostico, plan_tratamiento, observaciones } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO historias_clinicas
        (paciente_id,medico_id,motivo_consulta,anamnesis,examen_fisico,diagnostico,plan_tratamiento,observaciones)
       VALUES (?,?,?,?,?,?,?,?)`,
      [paciente_id, req.user.id, motivo_consulta, anamnesis,
       examen_fisico, diagnostico, plan_tratamiento, observaciones]
    );
    await audit(req, 'crear_historia', 'historias_clinicas', result.insertId);
    res.status(201).json({ id: result.insertId, message: 'Historia creada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/historias/:id  (RF-03: solo el médico que la creó puede modificar)
router.put('/:id', requirePerfil('medico'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM historias_clinicas WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Historia no encontrada' });

    // RF-14: privacidad — solo el médico creador puede editar
    if (rows[0].medico_id !== req.user.id) {
      await audit(req, 'editar_historia_denegado', 'historias_clinicas', req.params.id, 'denegado',
        `Médico ${req.user.id} intentó editar historia de médico ${rows[0].medico_id}`);
      return res.status(403).json({ error: 'Solo el médico que creó esta historia puede modificarla' });
    }

    const { motivo_consulta, anamnesis, examen_fisico, diagnostico, plan_tratamiento, observaciones } = req.body;
    await pool.execute(
      `UPDATE historias_clinicas SET
        motivo_consulta=?, anamnesis=?, examen_fisico=?,
        diagnostico=?, plan_tratamiento=?, observaciones=?
       WHERE id=?`,
      [motivo_consulta, anamnesis, examen_fisico, diagnostico, plan_tratamiento, observaciones, req.params.id]
    );
    await audit(req, 'editar_historia', 'historias_clinicas', req.params.id);
    res.json({ message: 'Historia actualizada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
