import axios from 'axios';

const MS_HISTORIAS   = import.meta.env.VITE_MS_HISTORIAS   || 'http://localhost:4001';
const MS_MEDICAMENTOS = import.meta.env.VITE_MS_MEDICAMENTOS || 'http://localhost:4002';

// ── Clientes axios ────────────────────────────────────────────
const apiHistorias = axios.create({ baseURL: MS_HISTORIAS });
const apiMeds      = axios.create({ baseURL: MS_MEDICAMENTOS });

// Inyectar token automáticamente
[apiHistorias, apiMeds].forEach(api => {
  api.interceptors.request.use(cfg => {
    const token = sessionStorage.getItem('token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });
});

// ── Estado de salud de servicios ──────────────────────────────
export async function checkServices() {
  const check = async (api) => {
    try { await api.get('/health', { timeout: 3000 }); return true; }
    catch { return false; }
  };
  const [historias, medicamentos] = await Promise.all([
    check(apiHistorias), check(apiMeds)
  ]);
  return { historias, medicamentos };
}

// ── Auth (intenta ambos servicios) ────────────────────────────
export async function login(email, password) {
  // Intenta ms-historias primero; si falla, usa ms-medicamentos
  const attempts = [
    { api: apiHistorias,  service: 'historias' },
    { api: apiMeds,       service: 'medicamentos' },
  ];

  let lastError;
  for (const { api, service } of attempts) {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      // Guardar tokens para ambos servicios
      sessionStorage.setItem('token',   data.token);
      sessionStorage.setItem('user',    JSON.stringify(data.user));
      sessionStorage.setItem('service', service);
      return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function register(nombre, email, password, perfil) {
  const { data } = await apiHistorias.post('/api/auth/register', { nombre, email, password, perfil });
  sessionStorage.setItem('token', data.token);
  sessionStorage.setItem('user',  JSON.stringify(data.user));
  sessionStorage.setItem('service', 'historias');
  // Registrar también en ms-medicamentos para que el token funcione en ambos
  try {
    await apiMeds.post('/api/auth/register', { nombre, email, password, perfil });
  } catch { /* ignorar si ya existe */ }
  return data;
}

export function logout() {
  sessionStorage.clear();
}

export function getUser() {
  const u = sessionStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

// ── Pacientes ─────────────────────────────────────────────────
export const getPacientes    = (q)    => apiHistorias.get('/api/pacientes', { params: { q } }).then(r => r.data);
export const getMisPacientes = ()     => apiHistorias.get('/api/pacientes/mis-pacientes').then(r => r.data);
export const getPaciente     = (id)   => apiHistorias.get(`/api/pacientes/${id}`).then(r => r.data);
export const crearPaciente   = (data) => apiHistorias.post('/api/pacientes', data).then(r => r.data);
export const editarPaciente  = (id, data) => apiHistorias.put(`/api/pacientes/${id}`, data).then(r => r.data);

// ── Historias ─────────────────────────────────────────────────
export const getHistorias  = (pid)  => apiHistorias.get('/api/historias', { params: { paciente_id: pid } }).then(r => r.data);
export const crearHistoria = (data) => apiHistorias.post('/api/historias', data).then(r => r.data);
export const editarHistoria = (id, data) => apiHistorias.put(`/api/historias/${id}`, data).then(r => r.data);

// ── Recetas ───────────────────────────────────────────────────
export const getReceta           = (id)   => apiHistorias.get(`/api/recetas/${id}`).then(r => r.data);
export const getRecetas          = (hid)  => apiHistorias.get('/api/recetas', { params: { historia_id: hid } }).then(r => r.data);
export const getRecetasPendientes = ()    => apiHistorias.get('/api/recetas', { params: { estado: 'pendiente' } }).then(r => r.data);
export const crearReceta         = (data) => apiHistorias.post('/api/recetas', data).then(r => r.data);
export const dispensarReceta     = (id)   => apiMeds.post(`/api/recetas/dispensar/${id}`).then(r => r.data);

// ── Medicamentos ──────────────────────────────────────────────
export const getMedicamentos  = (q, bajoStock) => apiMeds.get('/api/medicamentos',
  { params: { q, bajo_stock: bajoStock ? '1' : undefined } }).then(r => r.data);
export const getMedicamento   = (id)       => apiMeds.get(`/api/medicamentos/${id}`).then(r => r.data);
export const crearMedicamento = (data)     => apiMeds.post('/api/medicamentos', data).then(r => r.data);
export const editarMedicamento = (id, data)=> apiMeds.put(`/api/medicamentos/${id}`, data).then(r => r.data);
export const ajustarStock     = (id, data) => apiMeds.patch(`/api/medicamentos/${id}/stock`, data).then(r => r.data);

// ── Reportes ──────────────────────────────────────────────────
export const getReporteAtenciones   = (desde, hasta) => apiHistorias.get('/api/reportes/atenciones',              { params: { desde, hasta } }).then(r => r.data);
export const getReporteMedicamentos = (desde, hasta) => apiHistorias.get('/api/reportes/medicamentos-recetados',  { params: { desde, hasta } }).then(r => r.data);
export const getReporteAudit        = (desde, hasta) => apiHistorias.get('/api/reportes/audit',                   { params: { desde, hasta } }).then(r => r.data);
