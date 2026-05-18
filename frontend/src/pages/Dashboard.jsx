import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkServices } from '../services/api';

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() => window.innerWidth <= 900);
  useEffect(() => {
    const handler = () => setIsTablet(window.innerWidth <= 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isTablet;
}

const MENUS = {
  medico: [
    { icon: '🏠', label: 'Inicio',         href: '/dashboard' },
    { icon: '👥', label: 'Pacientes',      href: '/pacientes' },
    { icon: '📝', label: 'Nueva Consulta', href: '/consulta' },
  ],
  administrador: [
    { icon: '👥', label: 'Pacientes',    href: '/pacientes' },
    { icon: '👤', label: 'Usuarios',     href: '/usuarios' },
    { icon: '💊', label: 'Medicamentos', href: '/medicamentos' },
    { icon: '📊', label: 'Reportes',     href: '/reportes' },
  ],
  farmaceutico: [
    { icon: '💊', label: 'Inventario',   href: '/medicamentos' },
    { icon: '📦', label: 'Movimientos',  href: '/movimientos' },
    { icon: '⚠️', label: 'Stock Bajo',   href: '/stock-bajo' },
    { icon: '📝', label: 'Recetas',      href: '/recetas' },
  ],
};

const PERFIL_COLOR = {
  medico:        '#1e6b8a',
  administrador: '#2d6a4f',
  farmaceutico:  '#7b3f8a',
};

const PERFIL_ICON = { medico: '🩺', administrador: '🏥', farmaceutico: '💊' };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isTablet = useIsTablet();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState({ historias: null, medicamentos: null });

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    checkServices().then(setServices);
  }, [user]);

  if (!user) return null;

  const menu  = MENUS[user.perfil] || [];
  const color = PERFIL_COLOR[user.perfil] || '#1e6b8a';

  const sidebarStyle = isTablet
    ? {
        ...styles.sidebar,
        borderColor: `${color}40`,
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
      }
    : { ...styles.sidebar, borderColor: `${color}40` };

  return (
    <div style={styles.root}>
      {/* Overlay para cerrar sidebar en tablet */}
      {isTablet && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={styles.overlay}
        />
      )}

      {/* Botón hamburguesa (solo tablet) */}
      {isTablet && (
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ ...styles.hamburger, background: color }}
          aria-label="Abrir menú"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      )}

      {/* Sidebar */}
      <aside style={sidebarStyle} onClick={isTablet ? () => setSidebarOpen(false) : undefined}>
        <div style={styles.brand}>
          <div style={{ ...styles.brandIcon, background: color }}>⚕</div>
          <div>
            <div style={styles.brandName}>ClinicaOS</div>
            <div style={styles.brandSub}>Sistema Clínico</div>
          </div>
        </div>

        <div style={styles.userCard}>
          <div style={{ ...styles.avatar, background: `${color}30`, border: `2px solid ${color}` }}>
            {PERFIL_ICON[user.perfil]}
          </div>
          <div>
            <div style={styles.userName}>{user.nombre}</div>
            <div style={{ ...styles.userPerfil, color }}>
              {user.perfil.charAt(0).toUpperCase() + user.perfil.slice(1)}
            </div>
          </div>
        </div>

        <nav style={styles.nav}>
          {menu.map(item => (
            <button key={item.href} style={styles.navItem} onClick={() => navigate(item.href)}>
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={() => { logout(); navigate('/'); }} style={styles.logoutBtn}>
          ↩ Cerrar sesión
        </button>
      </aside>

      {/* Contenido principal */}
      <main style={{ ...styles.main, paddingTop: isTablet ? '4rem' : '2rem' }}>
        {/* Estado de servicios */}
        <div style={styles.servicesBar}>
          <ServiceBadge
            name="Historias Clínicas"
            up={services.historias}
            port={4001}
          />
          <ServiceBadge
            name="Medicamentos"
            up={services.medicamentos}
            port={4002}
          />
        </div>

        {/* Bienvenida */}
        <div style={styles.welcome}>
          <h1 style={styles.welcomeTitle}>
            Buenos días, {user.nombre.split(' ')[0]} 👋
          </h1>
          <p style={styles.welcomeDesc}>
            Tienes acceso como <strong style={{ color }}>{user.perfil}</strong>.
            Selecciona una opción del menú lateral para comenzar.
          </p>
        </div>

        {/* Cards del menú */}
        <div style={styles.cards}>
          {menu.map(item => (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              style={styles.card}
            >
              <span style={styles.cardIcon}>{item.icon}</span>
              <span style={styles.cardLabel}>{item.label}</span>
              <span style={styles.cardArrow}>→</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function ServiceBadge({ name, up, port }) {
  return (
    <div style={styles.badge}>
      <span style={{
        ...styles.badgeDot,
        background: up === null ? '#888' : up ? '#22c55e' : '#ef4444',
        boxShadow: up ? '0 0 6px #22c55e' : undefined,
      }} />
      <span style={styles.badgeName}>{name}</span>
      <span style={styles.badgePort}>:{port}</span>
    </div>
  );
}

const styles = {
  root: { display: 'flex', minHeight: '100vh', background: '#0d1b2a', fontFamily: "'DM Sans', sans-serif", position: 'relative' },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 199,
  },
  hamburger: {
    position: 'fixed', top: 12, left: 12, zIndex: 300,
    width: 40, height: 40, border: 'none', borderRadius: 10,
    color: '#fff', fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sidebar: {
    width: 260, background: 'rgba(13,27,42,0.98)',
    borderRight: '1px solid', padding: '2rem 1.25rem',
    display: 'flex', flexDirection: 'column', gap: '1.5rem',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  brandIcon: {
    width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  },
  brandName: { color: '#fff', fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem' },
  brandSub: { color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' },
  userCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.04)', borderRadius: 14,
    padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)',
  },
  avatar: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  userName: { color: '#fff', fontWeight: 600, fontSize: '0.9rem' },
  userPerfil: { fontSize: '0.75rem', fontWeight: 500, marginTop: 2 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.65)', padding: '10px 12px',
    borderRadius: 10, cursor: 'pointer', textAlign: 'left',
    fontSize: '0.9rem', transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  navIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  logoutBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.4)', padding: '10px', borderRadius: 10,
    cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', transition: 'all 0.15s',
  },
  main: { flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  servicesBar: { display: 'flex', gap: 12 },
  badge: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '6px 14px',
  },
  badgeDot: { width: 8, height: 8, borderRadius: '50%', transition: 'all 0.3s' },
  badgeName: { color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' },
  badgePort: { color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' },
  welcome: { marginTop: '1rem' },
  welcomeTitle: {
    fontFamily: "'DM Serif Display', serif",
    color: '#fff', fontSize: '2rem', margin: '0 0 0.5rem',
  },
  welcomeDesc: { color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16, marginTop: '0.5rem',
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
