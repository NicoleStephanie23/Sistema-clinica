import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PERFILES = [
  {
    id: 'medico',
    label: 'Médico',
    email: 'medico@clinica.com',
    icon: '🩺',
    desc: 'Historias clínicas y recetas',
    color: '#1e6b8a',
  },
  {
    id: 'administrador',
    label: 'Administrador',
    email: 'admin@clinica.com',
    icon: '🏥',
    desc: 'Gestión general del sistema',
    color: '#2d6a4f',
  },
  {
    id: 'farmaceutico',
    label: 'Farmacéutico',
    email: 'farmaceutico@clinica.com',
    icon: '💊',
    desc: 'Control de medicamentos',
    color: '#7b3f8a',
  },
];

export default function Login() {
  const navigate  = useNavigate();
  const { refresh } = useAuth();

  const [modo,     setModo]     = useState('login'); // 'login' | 'register'
  const [perfilSel,setPerfilSel]= useState(null);
  const [nombre,   setNombre]   = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const selectPerfil = (p) => {
    setPerfilSel(p);
    if (modo === 'login') setEmail(p.email);
    setError('');
  };

  const cambiarModo = (m) => {
    setModo(m);
    setPerfilSel(null);
    setNombre('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (modo === 'login') {
        await login(email, password);
      } else {
        if (!perfilSel) { setError('Selecciona un perfil'); setLoading(false); return; }
        await register(nombre, email, password, perfilSel.id);
      }
      refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Fondo decorativo */}
      <div style={styles.bg}>
        <div style={styles.circle1} />
        <div style={styles.circle2} />
        <svg style={styles.grid} width="100%" height="100%">
          <defs>
            <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
      </div>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>⚕</span>
          </div>
          <h1 style={styles.title}>ClinicaOS</h1>
          <p style={styles.subtitle}>Sistema de Gestión Clínica</p>
        </div>

        {/* Toggle login / registro */}
        <div style={styles.toggleRow}>
          <button onClick={() => cambiarModo('login')}
            style={{ ...styles.toggleBtn, ...(modo==='login' ? styles.toggleActive : {}) }}>
            Iniciar sesión
          </button>
          <button onClick={() => cambiarModo('register')}
            style={{ ...styles.toggleBtn, ...(modo==='register' ? styles.toggleActive : {}) }}>
            Registrarse
          </button>
        </div>

        {/* Selección de perfil */}
        <p style={styles.sectionLabel}>
          {modo === 'login' ? 'Selecciona tu perfil' : 'Selecciona el tipo de cuenta'}
        </p>
        <div style={styles.perfiles}>
          {PERFILES.map(p => (
            <button
              key={p.id}
              onClick={() => selectPerfil(p)}
              style={{
                ...styles.perfilBtn,
                ...(perfilSel?.id === p.id ? {
                  ...styles.perfilBtnActive,
                  borderColor: p.color,
                  background: `${p.color}18`,
                } : {}),
              }}
            >
              <span style={styles.perfilIcon}>{p.icon}</span>
              <span style={styles.perfilLabel}>{p.label}</span>
              <span style={styles.perfilDesc}>{p.desc}</span>
              {perfilSel?.id === p.id && (
                <span style={{ ...styles.perfilCheck, background: p.color }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Formulario */}
        {(modo === 'register' || perfilSel) && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.divider}>
              <span>{modo === 'login' ? 'Credenciales de acceso' : 'Datos de la nueva cuenta'}</span>
            </div>

            {modo === 'register' && (
              <>
                <label style={styles.label}>Nombre completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  style={styles.input}
                  placeholder="Ej: Dr. Juan Pérez"
                  required
                />
              </>
            )}

            <label style={styles.label}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              required
            />

            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder={modo === 'login' ? '' : 'Mínimo 6 caracteres'}
              required
            />

            {error && <div style={styles.error}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                background: perfilSel ? perfilSel.color : '#1e6b8a',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? (modo === 'login' ? 'Verificando...' : 'Registrando...')
                : (modo === 'login'
                    ? `Ingresar como ${perfilSel?.label}`
                    : `Crear cuenta${perfilSel ? ` de ${perfilSel.label}` : ''}`)}
            </button>

            {modo === 'login' && (
              <p style={styles.hint}>
                Contraseña demo: <code style={styles.code}>Admin123*</code>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0d1b2a',
    fontFamily: "'DM Sans', sans-serif",
    padding: '2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  bg: { position: 'absolute', inset: 0, overflow: 'hidden' },
  circle1: {
    position: 'absolute', top: '-15%', right: '-10%',
    width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(30,107,138,0.25) 0%, transparent 70%)',
  },
  circle2: {
    position: 'absolute', bottom: '-20%', left: '-10%',
    width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(45,106,79,0.2) 0%, transparent 70%)',
  },
  grid: { position: 'absolute', inset: 0 },
  card: {
    position: 'relative', zIndex: 1,
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: '2.5rem',
    width: '100%',
    maxWidth: 520,
    boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  header: { textAlign: 'center', marginBottom: '2rem' },
  logo: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 64, height: 64, borderRadius: 20,
    background: 'linear-gradient(135deg, #1e6b8a, #2d6a4f)',
    marginBottom: '1rem',
    boxShadow: '0 8px 24px rgba(30,107,138,0.4)',
  },
  logoIcon: { fontSize: 32 },
  title: {
    fontFamily: "'DM Serif Display', serif",
    color: '#fff',
    fontSize: '2rem',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: { color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 0', fontSize: '0.875rem' },
  toggleRow: {
    display: 'flex', gap: 4,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 4,
    marginBottom: '1.25rem',
  },
  toggleBtn: {
    flex: 1, padding: '8px',
    border: 'none', borderRadius: 9,
    background: 'none', color: 'rgba(255,255,255,0.45)',
    fontSize: '0.875rem', fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  toggleActive: {
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem',
    fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: '0.75rem',
  },
  perfiles: { display: 'flex', flexDirection: 'column', gap: 10 },
  perfilBtn: {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderRadius: 14,
    border: '1.5px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer', transition: 'all 0.2s',
    textAlign: 'left',
  },
  perfilBtnActive: { boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
  perfilIcon: { fontSize: 24, flexShrink: 0 },
  perfilLabel: { color: '#fff', fontWeight: 600, fontSize: '0.95rem', flex: 1 },
  perfilDesc: { color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginLeft: 'auto' },
  perfilCheck: {
    width: 20, height: 20, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
  },
  form: { marginTop: '1.5rem' },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '0 0 1.25rem',
    '&::before,&::after': { content: '""', flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' },
    color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontWeight: 500,
  },
  label: {
    display: 'block', color: 'rgba(255,255,255,0.55)',
    fontSize: '0.8rem', fontWeight: 500, marginBottom: 6,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '11px 14px',
    color: '#fff', fontSize: '0.95rem',
    outline: 'none', marginBottom: '1rem',
    fontFamily: 'inherit',
  },
  error: {
    background: 'rgba(220,50,50,0.15)',
    border: '1px solid rgba(220,50,50,0.3)',
    borderRadius: 8, padding: '10px 14px',
    color: '#ff8080', fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  submitBtn: {
    width: '100%', padding: '13px',
    borderRadius: 12, border: 'none',
    color: '#fff', fontWeight: 600, fontSize: '0.95rem',
    cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  hint: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginTop: '1rem' },
  code: {
    background: 'rgba(255,255,255,0.08)', padding: '2px 8px',
    borderRadius: 4, color: 'rgba(255,255,255,0.6)',
  },
};
