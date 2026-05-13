const router = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../config/db');

const SECRET = process.env.JWT_SECRET || 'jwt_medicamentos_secret_2024';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)  return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, perfil: user.perfil },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, perfil: user.perfil },
      service: 'ms-medicamentos',
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/me', require('../middleware/auth').verifyToken, (req, res) => {
  res.json({ user: req.user, service: 'ms-medicamentos' });
});

module.exports = router;
