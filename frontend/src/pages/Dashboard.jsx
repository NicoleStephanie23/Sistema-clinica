import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkServices } from '../services/api';

const MENUS = {
  medico: [
    { icon: '👥', label: 'Pacientes',        href: '/pacientes' },
    { icon: '📝', label: 'Nueva Consulta',   href: '/consulta' },
    { icon: '💊', label: 'Medicamentos',     href: '/medicamentos' },
    { icon: '📊', label: 'Reportes',         href: '/reportes' },
  ],
  administrador: [
    { icon: '👥', label: 'Pacientes',    href: '/pacientes' },
    { icon: '💊', label: 'Medicamentos', href: '/medicamentos' },
    { icon: '📊', label: 'Reportes',     href: '/reportes' },
  ],
  farmaceutico: [
    { icon: '📋', label: 'Dispensar Recetas', href: '/recetas' },
    { icon: '💊', label: 'Inventario',        href: '/medicamentos' },
  ],
};

const PERFIL_COLOR = {
  medico:        '#1e6b8a',
  administrador: '#2d6a4f',
  farmaceutico:  '#7b3f8a',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState({ historias: null, medicamentos: null });

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    checkServices().then(setServices);
  }, [user]);

  if (!user) return null;

  const menu  = MENUS[user.perfil] || [];
  const color = PERFIL_COLOR[user.perfil] || '#1e6b8a';

  return (
    <div style={s.page}>
      <div style={s.servicesBar}>
        <ServiceBadge name="Historias Clínicas" up={services.historias} port={4001} />
        <ServiceBadge name="Medicamentos"        up={services.medicamentos} port={4002} />
      </div>

      <div style={s.welcome}>
        <h1 style={s.welcomeTitle}>
          Bienvenido, {user.nombre.split(' ')[0]} 👋
        </h1>
        <p style={s.welcomeDesc}>
          Tienes acceso como <strong style={{ color }}>{user.perfil}</strong>.
          Selecciona una opción para comenzar.
        </p>
      </div>

      <div style={s.cards}>
        {menu.map(item => (
          <button key={item.href} onClick={() => navigate(item.href)} style={s.card}>
            <span style={s.cardIcon}>{item.icon}</span>
            <span style={s.cardLabel}>{item.label}</span>
            <span style={s.cardArrow}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ServiceBadge({ name, up, port }) {
  return (
    <div style={s.badge}>
      <span style={{
        ...s.badgeDot,
        background: up === null ? '#888' : up ? '#22c55e' : '#ef4444',
        boxShadow: up ? '0 0 6px #22c55e' : undefined,
      }} />
      <span style={s.badgeName}>{name}</span>
      <span style={s.badgePort}>:{port}</span>
    </div>
  );
}

const s = {
  page: { padding: '2rem', fontFamily: "'DM Sans', sans-serif" },
  servicesBar: { display: 'flex', gap: 12, marginBottom: '2rem' },
  badge: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '6px 14px',
  },
  badgeDot: { width: 8, height: 8, borderRadius: '50%', transition: 'all 0.3s' },
  badgeName: { color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' },
  badgePort: { color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' },
  welcome: { marginBottom: '2rem' },
  welcomeTitle: {
    fontFamily: "'DM Serif Display', serif",
    color: '#fff', fontSize: '2rem', margin: '0 0 0.5rem',
  },
  welcomeDesc: { color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '1.5rem',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
    fontFamily: 'inherit',
  },
  cardIcon: { fontSize: 32 },
  cardLabel: { color: '#fff', fontWeight: 600, fontSize: '1rem', flex: 1 },
  cardArrow: { color: 'rgba(255,255,255,0.25)', fontSize: '1.25rem', alignSelf: 'flex-end' },
};
