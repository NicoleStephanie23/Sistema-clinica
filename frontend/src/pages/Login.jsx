import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PERFILES = [
  { id: 'medico',          label: 'Médico',          icon: '🩺', color: '#1e6b8a' },
  { id: 'administrador',   label: 'Administrador',   icon: '🏥', color: '#2d6a4f' },
  { id: 'farmaceutico',    label: 'Farmacéutico',    icon: '💊', color: '#7b3f8a' },
];

export default function Login() {
  const navigate  = useNavigate();
  const { refresh } = useAuth();

  const [modo,     setModo]     = useState('login');   // 'login' | 'register'
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // campos login
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // campos registro
  const [nombre,   setNombre]   = useState('');
  const [apellido, setApellido] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass,  setRegPass]  = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [perfil,   setPerfil]   = useState('');

  const cambiarModo = (m) => { setModo(m); setError(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Error de conexión con el servidor');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPass !== regPass2) return setError('Las contraseñas no coinciden');
    if (!perfil) return setError('Selecciona un perfil');
    setLoading(true); setError('');
    try {
      await register({ nombre, apellido, email: regEmail, password: regPass, perfil });
      refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Error de conexión con el servidor');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.root}>
      <div style={s.bg}>
        <div style={s.circle1} />
        <div style={s.circle2} />
      </div>

      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logo}><span style={s.logoIcon}>⚕</span></div>
          <h1 style={s.title}>ClinicaOS</h1>
          <p style={s.subtitle}>Sistema de Gestión Clínica</p>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(modo === 'login'    ? s.tabActive : {}) }} onClick={() => cambiarModo('login')}>
            Iniciar sesión
          </button>
          <button style={{ ...s.tab, ...(modo === 'register' ? s.tabActive : {}) }} onClick={() => cambiarModo('register')}>
            Registrarse
          </button>
        </div>

        {/* ── LOGIN ── */}
        {modo === 'login' && (
          <form onSubmit={handleLogin} style={s.form}>
            <label style={s.label}>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={s.input} placeholder="correo@ejemplo.com" required />

            <label style={s.label}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={s.input} placeholder="••••••••" required />

            {error && <div style={s.error}>{error}</div>}

            <button type="submit" disabled={loading} style={{ ...s.btn, background: '#1e6b8a' }}>
              {loading ? 'Verificando...' : 'Iniciar sesión'}
            </button>

            <p style={s.hint}>
              ¿No tienes cuenta?{' '}
              <span style={s.link} onClick={() => cambiarModo('register')}>Regístrate aquí</span>
            </p>
          </form>
        )}

        {/* ── REGISTRO ── */}
        {modo === 'register' && (
          <form onSubmit={handleRegister} style={s.form}>
            <div style={s.row}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Nombre</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  style={s.input} placeholder="Juan" required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Apellido</label>
                <input type="text" value={apellido} onChange={e => setApellido(e.target.value)}
                  style={s.input} placeholder="Pérez" required />
              </div>
            </div>

            <label style={s.label}>Correo electrónico</label>
            <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
              style={s.input} placeholder="correo@ejemplo.com" required />

            <label style={s.label}>Contraseña</label>
            <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)}
              style={s.input} placeholder="Mínimo 6 caracteres" required minLength={6} />

            <label style={s.label}>Confirmar contraseña</label>
            <input type="password" value={regPass2} onChange={e => setRegPass2(e.target.value)}
              style={s.input} placeholder="Repite la contraseña" required />

            <label style={s.label}>Perfil</label>
            <div style={s.perfiles}>
              {PERFILES.map(p => (
                <button key={p.id} type="button" onClick={() => setPerfil(p.id)}
                  style={{
                    ...s.perfilBtn,
                    ...(perfil === p.id ? { borderColor: p.color, background: `${p.color}22` } : {}),
                  }}>
                  <span>{p.icon}</span>
                  <span style={{ color: '#fff', fontSize: '0.85rem' }}>{p.label}</span>
                  {perfil === p.id && <span style={{ ...s.check, background: p.color }}>✓</span>}
                </button>
              ))}
            </div>

            {error && <div style={s.error}>{error}</div>}

            <button type="submit" disabled={loading} style={{ ...s.btn, background: '#2d6a4f' }}>
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>

            <p style={s.hint}>
              ¿Ya tienes cuenta?{' '}
              <span style={s.link} onClick={() => cambiarModo('login')}>Inicia sesión</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0d1b2a', fontFamily: "'DM Sans', sans-serif", padding: '2rem',
    position: 'relative', overflow: 'hidden',
  },
  bg: { position: 'absolute', inset: 0, overflow: 'hidden' },
  circle1: {
    position: 'absolute', top: '-15%', right: '-10%', width: 600, height: 600,
    borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,107,138,0.25) 0%, transparent 70%)',
  },
  circle2: {
    position: 'absolute', bottom: '-20%', left: '-10%', width: 500, height: 500,
    borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,106,79,0.2) 0%, transparent 70%)',
  },
  card: {
    position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 480,
    boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  header: { textAlign: 'center', marginBottom: '1.5rem' },
  logo: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 56, height: 56, borderRadius: 16,
    background: 'linear-gradient(135deg, #1e6b8a, #2d6a4f)', marginBottom: '0.75rem',
  },
  logoIcon: { fontSize: 28 },
  title: { fontFamily: "'DM Serif Display', serif", color: '#fff', fontSize: '1.8rem', margin: 0 },
  subtitle: { color: 'rgba(255,255,255,0.45)', margin: '0.2rem 0 0', fontSize: '0.85rem' },
  tabs: {
    display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 4, marginBottom: '1.5rem',
  },
  tab: {
    flex: 1, padding: '9px', borderRadius: 9, border: 'none',
    background: 'transparent', color: 'rgba(255,255,255,0.45)',
    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'inherit',
  },
  tabActive: { background: 'rgba(255,255,255,0.1)', color: '#fff' },
  form: { display: 'flex', flexDirection: 'column' },
  row: { display: 'flex', gap: 12 },
  label: { color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', fontWeight: 500, marginBottom: 5 },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '0.9rem',
    outline: 'none', marginBottom: '0.9rem', fontFamily: 'inherit',
  },
  perfiles: { display: 'flex', gap: 8, marginBottom: '1rem' },
  perfilBtn: {
    flex: 1, position: 'relative', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4, padding: '10px 8px', borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer', fontSize: 20,
  },
  check: {
    position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 9, fontWeight: 700,
  },
  error: {
    background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.3)',
    borderRadius: 8, padding: '9px 14px', color: '#ff8080', fontSize: '0.83rem',
    marginBottom: '0.9rem',
  },
  btn: {
    width: '100%', padding: '12px', borderRadius: 12, border: 'none',
    color: '#fff', fontWeight: 600, fontSize: '0.93rem', cursor: 'pointer',
    fontFamily: 'inherit', marginTop: 4,
  },
  hint: { textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginTop: '0.9rem' },
  link: { color: '#4fb3d9', cursor: 'pointer', textDecoration: 'underline' },
};
