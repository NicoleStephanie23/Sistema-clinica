const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'jwt_medicamentos_secret_2024';

function verifyToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Token requerido' });

  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requirePerfil(...perfiles) {
  return (req, res, next) => {
    if (!perfiles.includes(req.user?.perfil)) {
      return res.status(403).json({ error: 'Acceso denegado para este perfil' });
    }
    next();
  };
}

module.exports = { verifyToken, requirePerfil };
