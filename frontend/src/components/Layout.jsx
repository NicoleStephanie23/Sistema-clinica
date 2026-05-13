import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MENUS = {
  medico: [
    { icon:'👥', label:'Pacientes',          href:'/pacientes' },
    { icon:'📝', label:'Nueva Consulta',     href:'/consulta' },
    { icon:'💊', label:'Medicamentos',       href:'/medicamentos' },
    { icon:'📊', label:'Reportes',           href:'/reportes' },
  ],
  administrador: [
    { icon:'👥', label:'Pacientes',    href:'/pacientes' },
    { icon:'💊', label:'Medicamentos', href:'/medicamentos' },
    { icon:'📊', label:'Reportes',     href:'/reportes' },
  ],
  farmaceutico: [
    { icon:'📋', label:'Dispensar Recetas', href:'/recetas' },
    { icon:'💊', label:'Inventario',        href:'/medicamentos' },
  ],
};

const COLOR = { medico:'#1e6b8a', administrador:'#2d6a4f', farmaceutico:'#7b3f8a' };
const ICON  = { medico:'🩺', administrador:'🏥', farmaceutico:'💊' };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  if (!user) return children;

  const menu  = MENUS[user.perfil] || [];
  const color = COLOR[user.perfil] || '#1e6b8a';

  return (
    <div style={s.root}>
      <aside style={{ ...s.sidebar, borderColor:`${color}30` }}>
        <div style={s.brand}>
          <div style={{ ...s.brandIcon, background:color }}>⚕</div>
          <div>
            <div style={s.brandName}>ClinicaOS</div>
            <div style={s.brandSub}>Sistema Clínico</div>
          </div>
        </div>

        <div style={s.userCard}>
          <div style={{ ...s.avatar, background:`${color}25`, border:`2px solid ${color}` }}>
            {ICON[user.perfil]}
          </div>
          <div>
            <div style={s.userName}>{user.nombre}</div>
            <div style={{ ...s.userPerfil, color }}>
              {user.perfil.charAt(0).toUpperCase() + user.perfil.slice(1)}
            </div>
          </div>
        </div>

        <nav style={s.nav}>
          <button style={s.navItem} onClick={() => navigate('/dashboard')}>
            <span style={s.navIcon}>🏠</span> Inicio
          </button>
          {menu.map(item => {
            const active = location.pathname === item.href;
            return (
              <button key={item.href}
                style={{ ...s.navItem, ...(active ? { ...s.navActive, background:`${color}20`, color:'#fff' } : {}) }}
                onClick={() => navigate(item.href)}>
                <span style={s.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <button onClick={() => { logout(); navigate('/'); }} style={s.logoutBtn}>
          ↩ Cerrar sesión
        </button>
      </aside>

      <main style={s.main}>
        {children}
      </main>
    </div>
  );
}

const s = {
  root: { display:'flex', minHeight:'100vh', background:'#0d1b2a', fontFamily:"'DM Sans',sans-serif" },
  sidebar: { width:240, background:'rgba(255,255,255,0.03)', borderRight:'1px solid', padding:'1.5rem 1rem', display:'flex', flexDirection:'column', gap:'1.2rem', flexShrink:0 },
  brand: { display:'flex', alignItems:'center', gap:10 },
  brandIcon: { width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 },
  brandName: { color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'1rem' },
  brandSub: { color:'rgba(255,255,255,0.3)', fontSize:'0.68rem' },
  userCard: { display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'10px 12px', border:'1px solid rgba(255,255,255,0.06)' },
  avatar: { width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 },
  userName: { color:'#fff', fontWeight:600, fontSize:'0.85rem' },
  userPerfil: { fontSize:'0.72rem', fontWeight:500, marginTop:1 },
  nav: { display:'flex', flexDirection:'column', gap:2, flex:1 },
  navItem: { display:'flex', alignItems:'center', gap:10, background:'none', border:'none', color:'rgba(255,255,255,0.55)', padding:'9px 10px', borderRadius:9, cursor:'pointer', textAlign:'left', fontSize:'0.875rem', fontFamily:'inherit', transition:'all 0.15s' },
  navActive: { borderLeft:'3px solid', paddingLeft:7 },
  navIcon: { fontSize:16, width:20, textAlign:'center', flexShrink:0 },
  logoutBtn: { background:'none', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.35)', padding:'9px', borderRadius:9, cursor:'pointer', fontSize:'0.82rem', fontFamily:'inherit' },
  main: { flex:1, overflowY:'auto' },
};
