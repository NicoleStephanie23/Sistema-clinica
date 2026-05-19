const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');

router.use(verifyToken);

// POST /api/recetas/dispensar/:id  (farmacéutico confirma despacho)
router.post('/dispensar/:id', requirePerfil('farmaceutico', 'administrador'), async (req, res) => {
  const recetaId = Number(req.params.id);
  const { medicamentos = [] } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const despachados = [];

    for (const item of medicamentos) {
      let medId = item.medicamento_id || null;

      // Si no viene el id, intentar buscar por nombre (recetas antiguas o escritas a mano)
      if (!medId && item.nombre_medicamento) {
        const [byName] = await conn.execute(
          'SELECT id FROM medicamentos WHERE LOWER(nombre) = LOWER(?) AND activo = 1 LIMIT 1',
          [item.nombre_medicamento.trim()]
        );
        if (byName[0]) medId = byName[0].id;
      }
      if (!medId) continue;

      const [rows] = await conn.execute(
        'SELECT id, nombre, stock_actual, stock_minimo FROM medicamentos WHERE id = ? AND activo = 1',
        [medId]
      );
      if (!rows[0]) continue;

      const cantidad = Number(item.cantidad) || 1;
      const nuevoStock = rows[0].stock_actual - cantidad;

      if (nuevoStock < 0) {
        await conn.rollback();
        return res.status(400).json({
          error: `Stock insuficiente para "${item.nombre_medicamento}". Disponible: ${rows[0].stock_actual}`,
        });
      }

      await conn.execute(
        'UPDATE medicamentos SET stock_actual = ? WHERE id = ?',
        [nuevoStock, medId]
      );

      await conn.execute(
        `INSERT INTO movimientos (medicamento_id, usuario_id, tipo, cantidad, motivo, receta_id)
         VALUES (?,?,?,?,?,?)`,
        [medId, req.user.id, 'salida', cantidad, `Despacho receta #${recetaId}`, recetaId]
      );

      despachados.push({
        medicamento_id:    medId,
        nombre_medicamento: rows[0].nombre,
        cantidad,
        stock_anterior:    rows[0].stock_actual,
        stock_nuevo:       nuevoStock,
        bajo_stock:        nuevoStock <= rows[0].stock_minimo,
      });
    }

    await conn.commit();
    res.json({
      message:    'Receta despachada correctamente',
      receta_id:  recetaId,
      despachados,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
