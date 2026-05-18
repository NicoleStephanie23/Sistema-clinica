import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPacientes, crearPaciente, editarPaciente } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FORM_VACIO = { nombre:'', apellido:'', documento:'', tipo_documento:'CC', fecha_nac:'', sexo:'', telefono:'', email:'', direccion:'', eps:'', grupo_sanguineo:'', alergias:'' };

export default function Pacientes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargar = async (busq = '') => {
    try { setPacientes(await getPacientes(busq)); } catch {}
  };

  useEffect(() => { cargar(); }, []);

  const buscar = (e) => { setQ(e.target.value); cargar(e.target.value); };

  const guardar = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (editando) {
        await editarPaciente(editando.id, form);
      } else {
        await crearPaciente(form);
      }
      setModal(false); setEditando(null); setForm(FORM_VACIO);
      cargar(q);
    } catch (err) { setError(err?.response?.data?.error || 'Error al guardar'); }
    finally { setLoading(false); }
  };

  const abrirEditar = (p) => {
    setEditando(p);
    setForm({ nombre:p.nombre, apellido:p.apellido, documento:p.documento, tipo_documento:p.tipo_documento||'CC', fecha_nac:p.fecha_nac?.split('T')[0]||'', sexo:p.sexo||'', telefono:p.telefono||'', email:p.email||'', direccion:p.direccion||'', eps:p.eps||'', grupo_sanguineo:p.grupo_sanguineo||'', alergias:p.alergias||'' });
    setModal(true); setError('');
  };

  const cerrarModal = () => { setModal(false); setEditando(null); setForm(FORM_VACIO); setError(''); };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Pacientes</h2>
          <p style={s.sub}>Gestión de pacientes registrados</p>
        </div>
        <button style={s.btnPrimary} onClick={() => setModal(true)}>+ Nuevo paciente</button>
      </div>

      <input style={s.search} placeholder="Buscar por nombre, apellido o documento..."
        value={q} onChange={buscar} />

      <div style={s.table}>
        <div style={s.thead}>
          <span>Paciente</span><span>Documento</span><span>Contacto</span>
          <span>EPS</span><span>Alergias</span><span>Acciones</span>
        </div>
        {pacientes.length === 0 && <div style={s.empty}>Sin resultados</div>}
        {pacientes.map(p => (
          <div key={p.id} style={s.row}>
            <div>
              <div style={{ color:'#fff', fontWeight:600 }}>{p.nombre} {p.apellido}</div>
              {p.grupo_sanguineo && <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.75rem' }}>Grupo: {p.grupo_sanguineo}</div>}
            </div>
            <span>{p.tipo_documento} {p.documento}</span>
            <span>{p.telefono || p.email || '—'}</span>
            <span>{p.eps || '—'}</span>
            <span style={{ color: p.alergias ? '#f87171':'rgba(255,255,255,0.4)' }}>
              {p.alergias || 'Ninguna'}
            </span>
            <div style={{ display:'flex', gap:6 }}>
              <button style={s.btnHistorial} onClick={() => navigate(`/pacientes/${p.id}/historial`)}>
                📋 Historial
              </button>
              {(user?.perfil === 'medico' || user?.perfil === 'administrador') && (
                <button style={s.btnEditar} onClick={() => abrirEditar(p)}>
                  ✏ Editar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{editando ? `Editar — ${editando.nombre} ${editando.apellido}` : 'Nuevo Paciente'}</h3>
            <form onSubmit={guardar}>
              <div style={s.grid2}>
                <Field label="Nombre" value={form.nombre} onChange={v => f('nombre',v)} required />
                <Field label="Apellido" value={form.apellido} onChange={v => f('apellido',v)} required />
              </div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>Tipo doc.</label>
                  <select style={s.input} value={form.tipo_documento} onChange={e => f('tipo_documento',e.target.value)}>
                    {['CC','TI','CE','PA'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <Field label="Documento" value={form.documento} onChange={v => f('documento',v)} required />
              </div>
              <div style={s.grid2}>
                <Field label="Fecha nacimiento" type="date" value={form.fecha_nac} onChange={v => f('fecha_nac',v)} />
                <div>
                  <label style={s.label}>Sexo</label>
                  <select style={s.input} value={form.sexo} onChange={e => f('sexo',e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>
              </div>
              <div style={s.grid2}>
                <Field label="Teléfono" value={form.telefono} onChange={v => f('telefono',v)} />
                <Field label="Correo" type="email" value={form.email} onChange={v => f('email',v)} />
              </div>
              <div style={s.grid2}>
                <Field label="EPS" value={form.eps} onChange={v => f('eps',v)} />
                <Field label="Grupo sanguíneo" value={form.grupo_sanguineo} onChange={v => f('grupo_sanguineo',v)} />
              </div>
              <div>
                <label style={s.label}>Dirección</label>
                <input style={s.input} type="text" value={form.direccion}
                  onChange={e => f('direccion', e.target.value)} placeholder="Calle, barrio, ciudad" />
              </div>
              <div>
                <label style={s.label}>Alergias</label>
                <textarea style={{ ...s.input, height:60, resize:'vertical' }}
                  value={form.alergias} onChange={e => f('alergias',e.target.value)} />
              </div>
              {error && <div style={s.error}>{error}</div>}
              <div style={s.btnRow}>
                <button type="button" style={s.btnSec} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" style={s.btnPrimary} disabled={loading}>
                  {loading ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type='text', required }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input style={s.input} type={type} value={value} required={required}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

const s = {
  page: { padding:'2rem', color:'rgba(255,255,255,0.8)', fontFamily:"'DM Sans',sans-serif" },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' },
  title: { color:'#fff', fontSize:'1.6rem', margin:0, fontFamily:"'DM Serif Display',serif" },
  sub: { color:'rgba(255,255,255,0.4)', margin:'4px 0 0', fontSize:'0.85rem' },
  btnPrimary: { background:'#1e6b8a', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:'0.9rem' },
  btnSec: { background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontFamily:'inherit' },
  search: { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 16px', color:'#fff', fontSize:'0.9rem', outline:'none', marginBottom:'1rem', fontFamily:'inherit' },
  table: { background:'rgba(255,255,255,0.03)', borderRadius:14, border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' },
  btnHistorial: { background:'rgba(30,107,138,0.2)', color:'#4fb3d9', border:'1px solid rgba(30,107,138,0.3)', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', whiteSpace:'nowrap' },
  btnEditar: { background:'rgba(251,191,36,0.1)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.2)', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem' },
  thead: { display:'grid', gridTemplateColumns:'2fr 1.5fr 1.2fr 1fr 1.5fr 1.8fr', padding:'10px 16px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' },
  row: { display:'grid', gridTemplateColumns:'2fr 1.5fr 1.2fr 1fr 1.5fr 1.8fr', padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.65)', fontSize:'0.88rem', alignItems:'center' },
  empty: { padding:'2rem', textAlign:'center', color:'rgba(255,255,255,0.3)' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'1rem' },
  modal: { background:'#0f2033', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'2rem', width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' },
  modalTitle: { color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'1.3rem', margin:'0 0 1.5rem' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:0 },
  label: { display:'block', color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', fontWeight:500, marginBottom:5, marginTop:12 },
  input: { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'9px 12px', color:'#fff', fontSize:'0.88rem', outline:'none', fontFamily:'inherit' },
  error: { background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:8, padding:'9px 14px', color:'#ff8080', fontSize:'0.83rem', margin:'0.8rem 0' },
  btnRow: { display:'flex', gap:10, justifyContent:'flex-end', marginTop:'1.2rem' },
};
