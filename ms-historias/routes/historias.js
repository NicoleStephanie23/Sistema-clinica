const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');

// Campos que se almacenan encriptados (RNF-01)
const CAMPOS_SENSIBLES = [
  'motivo_consulta', 'anamnesis', 'examen_fisico',
  'diagnostico', 'plan_tratamiento', 'observaciones',
];

function encryptRow(obj) {
  const out = { ...obj };
  CAMPOS_SENSIBLES.forEach(c => { if (out[c] != null) out[c] = encrypt(out[c]); });
  return out;
}

function decryptRow(row) {
  if (!row) return row;
  const out = { ...row };
  CAMPOS_SENSIBLES.forEach(c => { if (out[c] != null) out[c] = decrypt(out[c]); });
  return out;
}

router.use(verifyToken);

// GET /api/historias?paciente_id=X
router.get('/', async (req, res) => {
  try {
    const { paciente_id } = req.query;
    let sql = `SELECT h.*, p.nombre, p.apellido, p.documento,
                      u.nombre AS medico_nombre
               FROM historias_clinicas h
               JOIN pacientes p ON p.id = h.paciente_id
               LEFT JOIN usuarios u ON u.id = h.medico_id`;
    const params = [];
    if (paciente_id) { sql += ' WHERE h.paciente_id = ?'; params.push(paciente_id); }
    sql += ' ORDER BY h.fecha DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(decryptRow));
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
    res.json(decryptRow(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/historias  (solo médico)
router.post('/', requirePerfil('medico'), async (req, res) => {
  const { paciente_id, motivo_consulta, anamnesis, examen_fisico,
          diagnostico, plan_tratamiento, observaciones } = req.body;
  try {
    const enc = encryptRow({ motivo_consulta, anamnesis, examen_fisico,
                              diagnostico, plan_tratamiento, observaciones });
    const [result] = await pool.execute(
      `INSERT INTO historias_clinicas
        (paciente_id,medico_id,motivo_consulta,anamnesis,examen_fisico,diagnostico,plan_tratamiento,observaciones)
       VALUES (?,?,?,?,?,?,?,?)`,
      [paciente_id, req.user.id,
       enc.motivo_consulta  ?? null, enc.anamnesis       ?? null,
       enc.examen_fisico    ?? null, enc.diagnostico     ?? null,
       enc.plan_tratamiento ?? null, enc.observaciones   ?? null]
    );
    res.status(201).json({ id: result.insertId, message: 'Historia creada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/historias/:id  (solo médico — registra auditoría RNF-06)
const CAMPOS_AUDITABLES = [
  'motivo_consulta', 'anamnesis', 'examen_fisico',
  'diagnostico', 'plan_tratamiento', 'observaciones',
];

router.put('/:id', requirePerfil('medico'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM historias_clinicas WHERE id = ?', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Historia no encontrada' });
    const actualDecrypted = decryptRow(rows[0]);

    const cambios = CAMPOS_AUDITABLES.filter(
      c => req.body[c] !== undefined && String(req.body[c]) !== String(actualDecrypted[c] ?? '')
    );
    if (!cambios.length) return res.status(400).json({ error: 'Sin cambios detectados' });

    const encNuevos = encryptRow(req.body);
    const sets = cambios.map(c => `${c}=?`).join(',');
    await pool.execute(
      `UPDATE historias_clinicas SET ${sets} WHERE id=?`,
      [...cambios.map(c => encNuevos[c]), req.params.id]
    );

    const ahora = new Date();
    for (const campo of cambios) {
      await pool.execute(
        `INSERT INTO auditoria_historias
          (historia_id, usuario_id, usuario_nombre, fecha, campo, valor_anterior, valor_nuevo)
         VALUES (?,?,?,?,?,?,?)`,
        [
          req.params.id,
          req.user.id,
          req.user.nombre,
          ahora,
          campo,
          actualDecrypted[campo] ?? null,
          req.body[campo],
        ]
      );
    }

    res.json({ message: 'Historia actualizada', campos_modificados: cambios });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/historias/:id/auditoria  (médico o admin — no permite borrar)
router.get('/:id/auditoria', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM auditoria_historias WHERE historia_id = ? ORDER BY fecha DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
