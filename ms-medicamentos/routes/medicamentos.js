const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/medicamentos  (con filtros y alerta de stock)
router.get('/', async (req, res) => {
  try {
    const { q, bajo_stock } = req.query;
    let sql = `SELECT m.*, c.nombre AS categoria
               FROM medicamentos m
               LEFT JOIN categorias c ON c.id = m.categoria_id
               WHERE m.activo = 1`;
    const params = [];
    if (q) {
      sql += ' AND (m.nombre LIKE ? OR m.nombre_generico LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (bajo_stock === '1') sql += ' AND m.stock_actual <= m.stock_minimo';
    sql += ' ORDER BY m.nombre';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/medicamentos/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT m.*, c.nombre AS categoria
       FROM medicamentos m LEFT JOIN categorias c ON c.id = m.categoria_id
       WHERE m.id = ?`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/medicamentos  (admin o farmacéutico)
router.post('/', requirePerfil('administrador', 'farmaceutico'), async (req, res) => {
  const { nombre, nombre_generico, categoria_id, presentacion, concentracion,
          laboratorio, registro_invima, stock_actual, stock_minimo,
          precio_unitario, requiere_receta } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO medicamentos
        (nombre,nombre_generico,categoria_id,presentacion,concentracion,
         laboratorio,registro_invima,stock_actual,stock_minimo,precio_unitario,requiere_receta)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [nombre, nombre_generico, categoria_id, presentacion, concentracion,
       laboratorio, registro_invima, stock_actual||0, stock_minimo||5,
       precio_unitario||0, requiere_receta ?? 1]
    );
    res.status(201).json({ id: result.insertId, message: 'Medicamento registrado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/medicamentos/:id/stock  (ajuste de inventario)
router.patch('/:id/stock', requirePerfil('administrador', 'farmaceutico'), async (req, res) => {
  const { tipo, cantidad, motivo, receta_id } = req.body;
  if (!tipo || !cantidad) return res.status(400).json({ error: 'tipo y cantidad requeridos' });

  try {
    const [med] = await pool.execute('SELECT * FROM medicamentos WHERE id = ?', [req.params.id]);
    if (!med[0]) return res.status(404).json({ error: 'Medicamento no encontrado' });

    let nuevo_stock = med[0].stock_actual;
    if (tipo === 'entrada') nuevo_stock += Number(cantidad);
    else if (tipo === 'salida') {
      if (nuevo_stock < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });
      nuevo_stock -= Number(cantidad);
    } else { nuevo_stock = Number(cantidad); }

    await pool.execute('UPDATE medicamentos SET stock_actual = ? WHERE id = ?',
      [nuevo_stock, req.params.id]);

    await pool.execute(
      'INSERT INTO movimientos (medicamento_id,usuario_id,tipo,cantidad,motivo,receta_id) VALUES (?,?,?,?,?,?)',
      [req.params.id, req.user.id, tipo, cantidad, motivo||null, receta_id||null]
    );

    res.json({ stock_anterior: med[0].stock_actual, stock_nuevo: nuevo_stock });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/medicamentos/:id/movimientos
router.get('/:id/movimientos', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT mv.*, u.nombre AS usuario
       FROM movimientos mv
       LEFT JOIN usuarios u ON u.id = mv.usuario_id
       WHERE mv.medicamento_id = ?
       ORDER BY mv.fecha DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
