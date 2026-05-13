const router = require('express').Router();
const pool   = require('../config/db');
const { verifyToken, requirePerfil } = require('../middleware/auth');
const axios  = require('axios');

router.use(verifyToken);

const MS_HISTORIAS = process.env.MS_HISTORIAS_URL || 'http://ms-historias:4001';

// GET /api/recetas/validar/:codigo  — farmacéutico valida la receta
router.get('/validar/:codigo', requirePerfil('farmaceutico', 'administrador'), async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { data } = await axios.get(
      `${MS_HISTORIAS}/api/recetas/codigo/${req.params.codigo}`,
      { headers: { Authorization: token } }
    );
    if (data.estado === 'dispensada')
      return res.status(409).json({ error: 'Esta receta ya fue dispensada', receta: data });
    if (data.estado === 'cancelada')
      return res.status(409).json({ error: 'Esta receta está cancelada', receta: data });
    res.json(data);
  } catch (err) {
    if (err.response?.status === 404)
      return res.status(404).json({ error: 'Receta no encontrada' });
    res.status(500).json({ error: 'Error consultando receta: ' + err.message });
  }
});

// POST /api/recetas/dispensar/:codigo  — farmacéutico dispensa
router.post('/dispensar/:codigo', requirePerfil('farmaceutico', 'administrador'), async (req, res) => {
  const token = req.headers.authorization;
  try {
    // 1. Obtener y validar receta
    const { data: receta } = await axios.get(
      `${MS_HISTORIAS}/api/recetas/codigo/${req.params.codigo}`,
      { headers: { Authorization: token } }
    );
    if (receta.estado !== 'pendiente')
      return res.status(409).json({ error: `Receta en estado "${receta.estado}", no se puede dispensar` });

    // 2. Verificar y descontar stock de cada ítem
    const movimientos = [];
    for (const item of receta.items || []) {
      if (!item.medicamento_id) continue;
      const [med] = await pool.execute('SELECT * FROM medicamentos WHERE id = ?', [item.medicamento_id]);
      if (!med[0]) continue;
      if (med[0].stock_actual < item.cantidad)
        return res.status(400).json({ error: `Stock insuficiente de ${item.nombre_medicamento}` });
      movimientos.push({ med: med[0], cantidad: item.cantidad, nombre: item.nombre_medicamento });
    }

    // 3. Aplicar movimientos
    for (const mv of movimientos) {
      const nuevo = mv.med.stock_actual - mv.cantidad;
      await pool.execute('UPDATE medicamentos SET stock_actual = ? WHERE id = ?', [nuevo, mv.med.id]);
      await pool.execute(
        'INSERT INTO movimientos (medicamento_id,usuario_id,tipo,cantidad,motivo) VALUES (?,?,?,?,?)',
        [mv.med.id, req.user.id, 'salida', mv.cantidad, `Dispensación receta ${req.params.codigo}`]
      );
    }

    // 4. Marcar receta como dispensada en ms-historias
    await axios.patch(
      `${MS_HISTORIAS}/api/recetas/${receta.id}/dispensar`,
      { dispensada_por: req.user.id },
      { headers: { Authorization: token } }
    );

    res.json({ message: 'Receta dispensada correctamente', codigo: req.params.codigo });
  } catch (err) {
    if (err.response?.status === 404)
      return res.status(404).json({ error: 'Receta no encontrada' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
