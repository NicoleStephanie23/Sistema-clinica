const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/reportes/atenciones?desde=&hasta=
router.get('/atenciones', requirePerfil('administrador', 'medico'), async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const [rows] = await pool.execute(
      `SELECT DATE(h.fecha) AS dia, COUNT(*) AS total_atenciones,
              COUNT(DISTINCT h.paciente_id) AS pacientes_unicos,
              u.nombre AS medico
       FROM historias_clinicas h
       LEFT JOIN usuarios u ON u.id = h.medico_id
       WHERE h.fecha BETWEEN ? AND ?
       GROUP BY DATE(h.fecha), h.medico_id
       ORDER BY dia DESC`,
      [desde || '2000-01-01', hasta || '2099-12-31']
    );
    const [totales] = await pool.execute(
      `SELECT COUNT(*) AS total, COUNT(DISTINCT paciente_id) AS pacientes
       FROM historias_clinicas WHERE fecha BETWEEN ? AND ?`,
      [desde || '2000-01-01', hasta || '2099-12-31']
    );
    res.json({ detalle: rows, totales: totales[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reportes/medicamentos-recetados?desde=&hasta=
router.get('/medicamentos-recetados', requirePerfil('administrador', 'medico', 'farmaceutico'), async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const [rows] = await pool.execute(
      `SELECT ri.nombre_medicamento, SUM(ri.cantidad) AS total_recetado,
              COUNT(DISTINCT r.id) AS veces_recetado
       FROM receta_items ri
       JOIN recetas r ON r.id = ri.receta_id
       WHERE r.fecha BETWEEN ? AND ?
       GROUP BY ri.nombre_medicamento
       ORDER BY total_recetado DESC LIMIT 20`,
      [desde || '2000-01-01', hasta || '2099-12-31']
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reportes/audit?desde=&hasta=
router.get('/audit', requirePerfil('administrador'), async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM audit_log WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC LIMIT 200`,
      [desde || '2000-01-01', hasta || '2099-12-31']
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
