require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 4001;

// ── Seguridad ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'ms-historias', ts: new Date() })
);

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/pacientes', require('./routes/pacientes'));
app.use('/api/historias', require('./routes/historias'));
app.use('/api/recetas',   require('./routes/recetas'));

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(PORT, () =>
  console.log(`🏥 ms-historias corriendo en http://localhost:${PORT}`)
);
