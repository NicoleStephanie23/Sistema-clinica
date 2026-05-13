const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../config/db');

const SECRET = process.env.JWT_SECRET || 'jwt_historias_secret_2024';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
      [email]
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
      service: 'ms-historias',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nombre, apellido, email, password, perfil } = req.body;
  if (!nombre || !apellido || !email || !password || !perfil)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });

  const perfilesValidos = ['medico', 'administrador', 'farmaceutico'];
  if (!perfilesValidos.includes(perfil))
    return res.status(400).json({ error: 'Perfil no válido' });

  try {
    const [existe] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0)
      return res.status(409).json({ error: 'El correo ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO usuarios (nombre, apellido, email, password, perfil) VALUES (?, ?, ?, ?, ?)',
      [nombre, apellido, email, hash, perfil]
    );

    const token = jwt.sign(
      { id: result.insertId, nombre, email, perfil },
      SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      token,
      user: { id: result.insertId, nombre, apellido, email, perfil },
      service: 'ms-historias',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me  (verificar token)
router.get('/me', require('../middleware/auth').verifyToken, (req, res) => {
  res.json({ user: req.user, service: 'ms-historias' });
});

module.exports = router;
