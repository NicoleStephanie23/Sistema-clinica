const pool = require('../config/db');

async function audit(req, accion, recurso, recurso_id, resultado = 'exito', detalle = null) {
  try {
    const u = req.user || {};
    await pool.execute(
      'INSERT INTO audit_log (usuario_id,usuario_email,rol,accion,recurso,recurso_id,ip,resultado,detalle) VALUES (?,?,?,?,?,?,?,?,?)',
      [u.id||null, u.email||null, u.perfil||null, accion, recurso, recurso_id||null,
       req.ip||null, resultado, detalle]
    );
  } catch (_) {}
}

module.exports = audit;
