const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');

router.use(verifyToken);

// POST /api/recetas/dispensar/:id  (farmacéutico confirma despacho)
router.post('/dispensar/:id', requirePerfil('farmaceutico', 'administrador'), async (req, res) => {
  const recetaId = req.params.id;
  const { medicamentos = [] } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of medicamentos) {
      const medId = item.medicamento_id;
      if (!medId) continue;

      const [rows] = await conn.execute(
        'SELECT stock_actual FROM medicamentos WHERE id = ? AND activo = 1', [medId]
      );
      if (!rows[0]) continue;

      const cantidad = Number(item.cantidad) || 1;
      const nuevoStock = rows[0].stock_actual - cantidad;
      if (nuevoStock < 0) {
        await conn.rollback();
        return res.status(400).json({
          error: `Stock insuficiente para ${item.nombre_medicamento}`,
        });
      }

      await conn.execute('UPDATE medicamentos SET stock_actual = ? WHERE id = ?',
        [nuevoStock, medId]);

      await conn.execute(
        `INSERT INTO movimientos (medicamento_id, usuario_id, tipo, cantidad, motivo, receta_id)
         VALUES (?,?,?,?,?,?)`,
        [medId, req.user.id, 'salida', cantidad, 'Despacho de receta', recetaId]
      );
    }

    await conn.commit();
    res.json({ message: 'Receta despachada correctamente', receta_id: recetaId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
