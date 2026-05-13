import axios from 'axios';

const MS_HISTORIAS    = import.meta.env.VITE_MS_HISTORIAS    || 'http://localhost:4001';
const MS_MEDICAMENTOS = import.meta.env.VITE_MS_MEDICAMENTOS || 'http://localhost:4002';

const apiHistorias = axios.create({ baseURL: MS_HISTORIAS });
const apiMeds      = axios.create({ baseURL: MS_MEDICAMENTOS });

[apiHistorias, apiMeds].forEach(api => {
  api.interceptors.request.use(cfg => {
    const token = sessionStorage.getItem('token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });
});

// ── Health ────────────────────────────────────────────────────
export async function checkServices() {
  const check = async (api) => {
    try { await api.get('/health', { timeout: 3000 }); return true; }
    catch { return false; }
  };
  const [historias, medicamentos] = await Promise.all([check(apiHistorias), check(apiMeds)]);
  return { historias, medicamentos };
}

// ── Auth ──────────────────────────────────────────────────────
export async function login(email, password) {
  const { data } = await apiHistorias.post('/api/auth/login', { email, password });
  sessionStorage.setItem('token',   data.token);
  sessionStorage.setItem('user',    JSON.stringify(data.user));
  sessionStorage.setItem('service', 'historias');
  return data;
}

export async function register({ nombre, apellido, email, password, perfil }) {
  const { data } = await apiHistorias.post('/api/auth/register', { nombre, apellido, email, password, perfil });
  sessionStorage.setItem('token',   data.token);
  sessionStorage.setItem('user',    JSON.stringify(data.user));
  sessionStorage.setItem('service', 'historias');
  return data;
}

export function logout() { sessionStorage.clear(); }
export function getUser() {
  const u = sessionStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

// ── Pacientes ─────────────────────────────────────────────────
export const getPacientes  = (q)    => apiHistorias.get('/api/pacientes', { params: { q } }).then(r => r.data);
export const getPaciente   = (id)   => apiHistorias.get(`/api/pacientes/${id}`).then(r => r.data);
export const crearPaciente = (data) => apiHistorias.post('/api/pacientes', data).then(r => r.data);
export const editarPaciente= (id,d) => apiHistorias.put(`/api/pacientes/${id}`, d).then(r => r.data);

// ── Historias clínicas ────────────────────────────────────────
export const getHistorias  = (paciente_id) => apiHistorias.get('/api/historias', { params: { paciente_id } }).then(r => r.data);
export const getHistoria   = (id)          => apiHistorias.get(`/api/historias/${id}`).then(r => r.data);
export const crearHistoria = (data)        => apiHistorias.post('/api/historias', data).then(r => r.data);
export const editarHistoria= (id, data)    => apiHistorias.put(`/api/historias/${id}`, data).then(r => r.data);

// ── Recetas ───────────────────────────────────────────────────
export const getRecetas    = (params) => apiHistorias.get('/api/recetas', { params }).then(r => r.data);
export const getReceta     = (id)     => apiHistorias.get(`/api/recetas/${id}`).then(r => r.data);
export const crearReceta   = (data)   => apiHistorias.post('/api/recetas', data).then(r => r.data);
export const cancelarReceta= (id)     => apiHistorias.patch(`/api/recetas/${id}/cancelar`).then(r => r.data);

// Farmacéutico — valida y dispensa desde ms-medicamentos
export const validarReceta  = (codigo) => apiMeds.get(`/api/recetas/validar/${codigo}`).then(r => r.data);
export const dispensarReceta= (codigo) => apiMeds.post(`/api/recetas/dispensar/${codigo}`).then(r => r.data);

// ── Medicamentos ──────────────────────────────────────────────
export const getMedicamentos  = (q, bajoStock) => apiMeds.get('/api/medicamentos',
  { params: { q, bajo_stock: bajoStock ? '1' : undefined } }).then(r => r.data);
export const getMedicamento   = (id)       => apiMeds.get(`/api/medicamentos/${id}`).then(r => r.data);
export const crearMedicamento = (data)     => apiMeds.post('/api/medicamentos', data).then(r => r.data);
export const ajustarStock     = (id, data) => apiMeds.patch(`/api/medicamentos/${id}/stock`, data).then(r => r.data);
export const getMovimientos   = (id)       => apiMeds.get(`/api/medicamentos/${id}/movimientos`).then(r => r.data);

// ── Reportes ──────────────────────────────────────────────────
export const getReporteAtenciones  = (desde, hasta) => apiHistorias.get('/api/reportes/atenciones',         { params:{ desde, hasta } }).then(r => r.data);
export const getReporteMedicamentos= (desde, hasta) => apiHistorias.get('/api/reportes/medicamentos-recetados', { params:{ desde, hasta } }).then(r => r.data);
export const getReporteAudit       = (desde, hasta) => apiHistorias.get('/api/reportes/audit',              { params:{ desde, hasta } }).then(r => r.data);
