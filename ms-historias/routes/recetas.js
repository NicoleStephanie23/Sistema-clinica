const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');
const audit  = require('../middleware/audit');

router.use(verifyToken);

function genCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = 'RX-';
  for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// GET /api/recetas?historia_id=X&paciente_id=X
router.get('/', async (req, res) => {
  try {
    const { historia_id, paciente_id } = req.query;
    let sql = `SELECT r.*, p.nombre AS pac_nombre, p.apellido AS pac_apellido, p.documento,
                      u.nombre AS medico_nombre,
                      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                        'id', ri.id,'nombre_medicamento',ri.nombre_medicamento,
                        'dosis',ri.dosis,'frecuencia',ri.frecuencia,
                        'duracion',ri.duracion,'cantidad',ri.cantidad))
                       FROM receta_items ri WHERE ri.receta_id = r.id) AS items
               FROM recetas r
               JOIN pacientes p ON p.id = r.paciente_id
               LEFT JOIN usuarios u ON u.id = r.medico_id
               WHERE 1=1`;
    const params = [];
    if (historia_id) { sql += ' AND r.historia_id = ?'; params.push(historia_id); }
    if (paciente_id) { sql += ' AND r.paciente_id = ?'; params.push(paciente_id); }
    sql += ' ORDER BY r.fecha DESC';
    const [rows] = await pool.execute(sql, params);
    rows.forEach(r => { if (r.items) r.items = JSON.parse(r.items); });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/recetas/codigo/:codigo
router.get('/codigo/:codigo', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, p.nombre AS pac_nombre, p.apellido AS pac_apellido,
              p.documento, p.fecha_nac, p.eps,
              u.nombre AS medico_nombre, u.perfil AS medico_perfil
       FROM recetas r
       JOIN pacientes p ON p.id = r.paciente_id
       LEFT JOIN usuarios u ON u.id = r.medico_id
       WHERE r.codigo = ?`, [req.params.codigo]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Receta no encontrada' });
    const [items] = await pool.execute('SELECT * FROM receta_items WHERE receta_id = ?', [rows[0].id]);
    await audit(req, 'consultar_receta', 'recetas', rows[0].id);
    res.json({ ...rows[0], items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/recetas/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, p.nombre AS pac_nombre, p.apellido AS pac_apellido, p.documento,
              u.nombre AS medico_nombre
       FROM recetas r
       JOIN pacientes p ON p.id = r.paciente_id
       LEFT JOIN usuarios u ON u.id = r.medico_id
       WHERE r.id = ?`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Receta no encontrada' });
    const [items] = await pool.execute('SELECT * FROM receta_items WHERE receta_id = ?', [req.params.id]);
    res.json({ ...rows[0], items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/recetas  (solo médico)
router.post('/', requirePerfil('medico'), async (req, res) => {
  const { historia_id, paciente_id, indicaciones, items } = req.body;
  if (!paciente_id || !items?.length)
    return res.status(400).json({ error: 'paciente_id e items requeridos' });

  let codigo;
  let intentos = 0;
  while (intentos < 10) {
    codigo = genCodigo();
    const [exist] = await pool.execute('SELECT id FROM recetas WHERE codigo = ?', [codigo]);
    if (!exist.length) break;
    intentos++;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.execute(
      'INSERT INTO recetas (codigo,historia_id,paciente_id,medico_id,indicaciones) VALUES (?,?,?,?,?)',
      [codigo, historia_id||null, paciente_id, req.user.id, indicaciones||null]
    );
    const receta_id = r.insertId;
    for (const it of items) {
      await conn.execute(
        'INSERT INTO receta_items (receta_id,medicamento_id,nombre_medicamento,dosis,frecuencia,duracion,cantidad) VALUES (?,?,?,?,?,?,?)',
        [receta_id, it.medicamento_id||null, it.nombre_medicamento, it.dosis||null, it.frecuencia||null, it.duracion||null, it.cantidad||1]
      );
    }
    await conn.commit();
    await audit(req, 'crear_receta', 'recetas', receta_id);
    res.status(201).json({ id: receta_id, codigo, message: 'Receta creada' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// PATCH /api/recetas/:id/dispensar  (llamado desde ms-medicamentos)
router.patch('/:id/dispensar', async (req, res) => {
  try {
    await pool.execute(
      "UPDATE recetas SET estado='dispensada', dispensada_en=NOW() WHERE id=?",
      [req.params.id]
    );
    res.json({ message: 'Receta marcada como dispensada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/recetas/:id/cancelar
router.patch('/:id/cancelar', requirePerfil('medico', 'administrador'), async (req, res) => {
  try {
    await pool.execute("UPDATE recetas SET estado='cancelada' WHERE id=?", [req.params.id]);
    await audit(req, 'cancelar_receta', 'recetas', req.params.id);
    res.json({ message: 'Receta cancelada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
