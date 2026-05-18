import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PERFILES = [
  { id: 'medico',        label: 'Médico',         icon: '🩺', desc: 'Historias clínicas y recetas',  color: '#1e6b8a' },
  { id: 'administrador', label: 'Administrador',   icon: '🏥', desc: 'Gestión general del sistema',   color: '#2d6a4f' },
  { id: 'farmaceutico',  label: 'Farmacéutico',    icon: '💊', desc: 'Control de medicamentos',        color: '#7b3f8a' },
];

export default function Login() {
  const navigate    = useNavigate();
  const { refresh } = useAuth();

  const [modo,      setModo]      = useState('login');
  const [nombre,    setNombre]    = useState('');
  const [apellido,  setApellido]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [perfilSel, setPerfilSel] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const cambiarModo = (m) => {
    setModo(m);
    setNombre(''); setApellido(''); setEmail('');
    setPassword(''); setPerfilSel(null); setError('');
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
        const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`.trim();
        await register(nombreCompleto, email, password, perfilSel.id);
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
    <div style={s.root}>
      <div style={s.bg}>
        <div style={s.circle1} />
        <div style={s.circle2} />
        <svg style={s.grid} width="100%" height="100%">
          <defs>
            <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
      </div>

      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logo}><span style={s.logoIcon}>⚕</span></div>
          <h1 style={s.title}>ClinicaOS</h1>
          <p style={s.subtitle}>Sistema de Gestión Clínica</p>
        </div>

        {modo === 'login' ? (
          <form onSubmit={handleSubmit} style={s.form}>
            <label style={s.label}>Correo electrónico</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={s.input} placeholder="usuario@clinica.com" required
            />

            <label style={s.label}>Contraseña</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              style={s.input} required
            />

            {error && <div style={s.error}>{error}</div>}

            <button type="submit" disabled={loading}
              style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>

            <p style={s.switchText}>
              ¿No tiene cuenta?{' '}
              <button type="button" onClick={() => cambiarModo('register')} style={s.switchLink}>
                Regístrese
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.row}>
              <div style={s.col}>
                <label style={s.label}>Nombre</label>
                <input
                  type="text" value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  style={s.input} placeholder="Juan" required
                />
              </div>
              <div style={s.col}>
                <label style={s.label}>Apellido</label>
                <input
                  type="text" value={apellido}
                  onChange={e => setApellido(e.target.value)}
                  style={s.input} placeholder="Pérez" required
                />
              </div>
            </div>

            <label style={s.label}>Correo electrónico</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={s.input} placeholder="usuario@clinica.com" required
            />

            <label style={s.label}>Contraseña</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              style={s.input} placeholder="Mínimo 6 caracteres" required
            />

            <label style={{ ...s.label, marginBottom: 10 }}>Perfil</label>
            <div style={s.perfiles}>
              {PERFILES.map(p => (
                <button
                  key={p.id} type="button"
                  onClick={() => { setPerfilSel(p); setError(''); }}
                  style={{
                    ...s.perfilBtn,
                    ...(perfilSel?.id === p.id
                      ? { ...s.perfilBtnActive, borderColor: p.color, background: `${p.color}18` }
                      : {}),
                  }}
                >
                  <span style={s.perfilIcon}>{p.icon}</span>
                  <span style={s.perfilLabel}>{p.label}</span>
                  <span style={s.perfilDesc}>{p.desc}</span>
                  {perfilSel?.id === p.id && (
                    <span style={{ ...s.perfilCheck, background: p.color }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {error && <div style={s.error}>{error}</div>}

            <button type="submit" disabled={loading}
              style={{
                ...s.submitBtn,
                background: perfilSel ? perfilSel.color : '#1e6b8a',
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? 'Registrando...' : `Crear cuenta${perfilSel ? ` de ${perfilSel.label}` : ''}`}
            </button>

            <p style={s.switchText}>
              ¿Ya tiene cuenta?{' '}
              <button type="button" onClick={() => cambiarModo('login')} style={s.switchLink}>
                Inicie sesión
              </button>
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
    background: '#0d1b2a', fontFamily: "'DM Sans', sans-serif",
    padding: '2rem', position: 'relative', overflow: 'hidden',
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
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24,
    padding: '2.5rem', width: '100%', maxWidth: 480,
    boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  header: { textAlign: 'center', marginBottom: '2rem' },
  logo: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 64, height: 64, borderRadius: 20,
    background: 'linear-gradient(135deg, #1e6b8a, #2d6a4f)',
    marginBottom: '1rem', boxShadow: '0 8px 24px rgba(30,107,138,0.4)',
  },
  logoIcon: { fontSize: 32 },
  title: {
    fontFamily: "'DM Serif Display', serif", color: '#fff',
    fontSize: '2rem', margin: 0, letterSpacing: '-0.02em',
  },
  subtitle: { color: 'rgba(255,255,255,0.45)', margin: '0.25rem 0 0', fontSize: '0.875rem' },
  form: { display: 'flex', flexDirection: 'column' },
  row: { display: 'flex', gap: 12 },
  col: { flex: 1, display: 'flex', flexDirection: 'column' },
  label: {
    color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem',
    fontWeight: 500, marginBottom: 6,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '11px 14px',
    color: '#fff', fontSize: '0.95rem',
    outline: 'none', marginBottom: '1rem', fontFamily: 'inherit',
  },
  perfiles: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.25rem' },
  perfilBtn: {
    position: 'relative', display: 'flex', alignItems: 'center', gap: 14,
    padding: '12px 14px', borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', fontFamily: 'inherit',
  },
  perfilBtnActive: { boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
  perfilIcon: { fontSize: 22, flexShrink: 0 },
  perfilLabel: { color: '#fff', fontWeight: 600, fontSize: '0.9rem', flex: 1 },
  perfilDesc: { color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' },
  perfilCheck: {
    width: 20, height: 20, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
  },
  error: {
    background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.3)',
    borderRadius: 8, padding: '10px 14px',
    color: '#ff8080', fontSize: '0.85rem', marginBottom: '1rem',
  },
  submitBtn: {
    padding: '13px', borderRadius: 12, border: 'none',
    background: '#1e6b8a', color: '#fff', fontWeight: 600, fontSize: '0.95rem',
    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  switchText: {
    textAlign: 'center', color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem', marginTop: '1.25rem', marginBottom: 0,
  },
  switchLink: {
    background: 'none', border: 'none', color: '#5bb8d4',
    cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
    textDecoration: 'underline', padding: 0,
  },
};
