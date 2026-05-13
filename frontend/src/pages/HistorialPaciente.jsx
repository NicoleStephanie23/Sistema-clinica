import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPaciente, getHistorias, getRecetas, editarHistoria } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HistorialPaciente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paciente, setPaciente] = useState(null);
  const [historias, setHistorias] = useState([]);
  const [historiaAbierta, setHistoriaAbierta] = useState(null);
  const [recetasHistoria, setRecetasHistoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState(null); // historia que se está editando
  const [editForm, setEditForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    cargar();
  }, [id]);

  const cargar = async () => {
    setLoading(true);
    try {
      const [pac, hist] = await Promise.all([
        getPaciente(id),
        getHistorias(id),
      ]);
      setPaciente(pac);
      setHistorias(hist);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const abrirHistoria = async (h) => {
    if (historiaAbierta?.id === h.id) { setHistoriaAbierta(null); return; }
    setHistoriaAbierta(h);
    try {
      const recetas = await getRecetas({ historia_id: h.id });
      setRecetasHistoria(recetas);
    } catch { setRecetasHistoria([]); }
  };

  const abrirEditar = (h) => {
    setEditForm({
      motivo_consulta:  h.motivo_consulta  || '',
      anamnesis:        h.anamnesis        || '',
      examen_fisico:    h.examen_fisico    || '',
      diagnostico:      h.diagnostico      || '',
      plan_tratamiento: h.plan_tratamiento || '',
      observaciones:    h.observaciones    || '',
    });
    setEditModal(h);
    setEditError('');
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setGuardando(true); setEditError('');
    try {
      await editarHistoria(editModal.id, editForm);
      setEditModal(null);
      await cargar(); // recarga el historial completo
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const calcularEdad = (fecha) => {
    if (!fecha) return null;
    return Math.floor((Date.now() - new Date(fecha)) / (365.25 * 24 * 3600 * 1000));
  };

  if (loading) return <div style={s.loading}>Cargando historial...</div>;
  if (error)   return <div style={s.errorPage}>{error}</div>;
  if (!paciente) return null;

  const esMedico = user?.perfil === 'medico';

  return (
    <div style={s.page}>
      {/* Header paciente */}
      <div style={s.patientCard}>
        <div style={s.patientAvatar}>
          {paciente.sexo === 'F' ? '👩' : paciente.sexo === 'M' ? '👨' : '🧑'}
        </div>
        <div style={s.patientInfo}>
          <h2 style={s.patientName}>{paciente.nombre} {paciente.apellido}</h2>
          <div style={s.patientMeta}>
            <span>{paciente.tipo_documento} {paciente.documento}</span>
            {calcularEdad(paciente.fecha_nac) && <span>· {calcularEdad(paciente.fecha_nac)} años</span>}
            {paciente.eps && <span>· EPS: {paciente.eps}</span>}
            {paciente.grupo_sanguineo && <span>· Grupo: {paciente.grupo_sanguineo}</span>}
          </div>
          {paciente.alergias && (
            <div style={s.alerta}>⚠ Alergias: {paciente.alergias}</div>
          )}
        </div>
        <div style={s.patientActions}>
          {esMedico && (
            <button style={s.btnConsulta}
              onClick={() => navigate('/consulta', { state: { paciente } })}>
              + Nueva consulta
            </button>
          )}
          <button style={s.btnBack} onClick={() => navigate('/pacientes')}>
            ← Volver
          </button>
        </div>
      </div>

      {/* Historial */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>
          Historial clínico
          <span style={s.badge}>{historias.length} atenciones</span>
        </h3>

        {historias.length === 0 && (
          <div style={s.empty}>
            <p>Este paciente no tiene atenciones registradas{esMedico ? ' por ti' : ''}.</p>
            {esMedico && (
              <button style={s.btnConsulta} onClick={() => navigate('/consulta', { state: { paciente } })}>
                Registrar primera consulta
              </button>
            )}
          </div>
        )}

        <div style={s.timeline}>
          {historias.map((h, idx) => {
            const abierta = historiaAbierta?.id === h.id;
            return (
              <div key={h.id} style={s.timelineItem}>
                {/* Línea de tiempo */}
                <div style={s.timelineLeft}>
                  <div style={s.dot} />
                  {idx < historias.length - 1 && <div style={s.line} />}
                </div>

                {/* Contenido */}
                <div style={s.card}>
                  <div style={s.cardHeader} onClick={() => abrirHistoria(h)}>
                    <div>
                      <div style={s.cardDate}>
                        {new Date(h.fecha).toLocaleDateString('es-CO', {
                          weekday:'long', year:'numeric', month:'long', day:'numeric'
                        })}
                      </div>
                      <div style={s.cardDiag}>{h.diagnostico || 'Sin diagnóstico registrado'}</div>
                      <div style={s.cardMedico}>Dr. {h.medico_nombre}</div>
                    </div>
                    <span style={s.chevron}>{abierta ? '▲' : '▼'}</span>
                  </div>

                  {abierta && (
                    <div style={s.cardBody}>
                      {[
                        { label:'Motivo de consulta', value: h.motivo_consulta },
                        { label:'Anamnesis',          value: h.anamnesis },
                        { label:'Examen físico',      value: h.examen_fisico },
                        { label:'Diagnóstico',        value: h.diagnostico },
                        { label:'Plan de tratamiento',value: h.plan_tratamiento },
                        { label:'Observaciones',      value: h.observaciones },
                      ].filter(f => f.value).map(f => (
                        <div key={f.label} style={s.field}>
                          <span style={s.fieldLabel}>{f.label}</span>
                          <p style={s.fieldValue}>{f.value}</p>
                        </div>
                      ))}

                      {/* Recetas de esta consulta */}
                      {recetasHistoria.length > 0 && (
                        <div style={s.recetasSection}>
                          <span style={s.fieldLabel}>Recetas emitidas</span>
                          {recetasHistoria.map(r => (
                            <div key={r.id} style={s.recetaRow}>
                              <span style={s.recetaCodigo}>{r.codigo}</span>
                              <span style={{
                                ...s.estadoBadge,
                                color: r.estado==='pendiente'?'#4ade80':r.estado==='despachada'?'#60a5fa':'#f87171'
                              }}>
                                {r.estado}
                              </span>
                              {(r.items||[]).map((it,i) => (
                                <span key={i} style={s.medTag}>{it.nombre_medicamento}</span>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Editar — solo el médico que la creó */}
                      {esMedico && h.medico_id === user.id && (
                        <div style={{ marginTop:12, textAlign:'right' }}>
                          <button style={s.btnEdit} onClick={() => abrirEditar(h)}>
                            ✏ Editar esta consulta
                          </button>
                        </div>
                      )}
                      {esMedico && h.medico_id !== user.id && (
                        <div style={s.privacyNote}>
                          🔒 Esta consulta fue registrada por otro médico
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal editar historia */}
      {editModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Editar Consulta</h3>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.8rem', margin:'0 0 1rem' }}>
              {new Date(editModal.fecha).toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
            <form onSubmit={guardarEdicion}>
              {[
                { key:'motivo_consulta',  label:'Motivo de consulta', required: true },
                { key:'anamnesis',        label:'Anamnesis' },
                { key:'examen_fisico',    label:'Examen físico' },
                { key:'diagnostico',      label:'Diagnóstico', required: true },
                { key:'plan_tratamiento', label:'Plan de tratamiento' },
                { key:'observaciones',    label:'Observaciones' },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label style={s.label}>{label}{required ? ' *' : ''}</label>
                  <textarea
                    style={{ ...s.input, height:60, resize:'vertical', display:'block' }}
                    value={editForm[key]}
                    onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                    required={required}
                  />
                </div>
              ))}
              {editError && <div style={s.errorBox}>{editError}</div>}
              <div style={s.btnRow}>
                <button type="button" style={s.btnSec} onClick={() => setEditModal(null)}>Cancelar</button>
                <button type="submit" style={s.btnPrimary} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:  { padding:'2rem', fontFamily:"'DM Sans',sans-serif", maxWidth:900, margin:'0 auto' },
  loading: { padding:'3rem', textAlign:'center', color:'rgba(255,255,255,0.4)', fontFamily:"'DM Sans',sans-serif" },
  errorPage: { padding:'2rem', color:'#f87171', fontFamily:"'DM Sans',sans-serif" },
  patientCard: { display:'flex', alignItems:'flex-start', gap:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'1.5rem', marginBottom:'2rem' },
  patientAvatar: { fontSize:48, flexShrink:0 },
  patientInfo: { flex:1 },
  patientName: { color:'#fff', fontSize:'1.5rem', margin:'0 0 6px', fontFamily:"'DM Serif Display',serif" },
  patientMeta: { display:'flex', gap:12, color:'rgba(255,255,255,0.5)', fontSize:'0.85rem', flexWrap:'wrap' },
  alerta: { marginTop:8, color:'#f87171', fontSize:'0.82rem', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:6, padding:'4px 10px', display:'inline-block' },
  patientActions: { display:'flex', flexDirection:'column', gap:8, flexShrink:0 },
  btnConsulta: { background:'#1e6b8a', color:'#fff', border:'none', borderRadius:10, padding:'10px 18px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:'0.875rem' },
  btnBack: { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontFamily:'inherit', fontSize:'0.875rem' },
  section: { },
  sectionTitle: { color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'1.2rem', margin:'0 0 1.5rem', display:'flex', alignItems:'center', gap:12 },
  badge: { background:'rgba(30,107,138,0.3)', color:'#4fb3d9', border:'1px solid rgba(30,107,138,0.4)', borderRadius:20, padding:'2px 12px', fontSize:'0.78rem', fontWeight:600 },
  empty: { textAlign:'center', padding:'3rem', color:'rgba(255,255,255,0.4)', display:'flex', flexDirection:'column', alignItems:'center', gap:16 },
  timeline: { display:'flex', flexDirection:'column', gap:0 },
  timelineItem: { display:'flex', gap:16 },
  timelineLeft: { display:'flex', flexDirection:'column', alignItems:'center', paddingTop:16, width:24, flexShrink:0 },
  dot: { width:12, height:12, borderRadius:'50%', background:'#1e6b8a', border:'2px solid #0d1b2a', flexShrink:0, zIndex:1 },
  line: { width:2, flex:1, background:'rgba(30,107,138,0.3)', minHeight:24 },
  card: { flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, marginBottom:12, overflow:'hidden' },
  cardHeader: { padding:'14px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 },
  cardDate: { color:'rgba(255,255,255,0.4)', fontSize:'0.78rem', marginBottom:4 },
  cardDiag: { color:'#fff', fontWeight:600, fontSize:'0.95rem', marginBottom:2 },
  cardMedico: { color:'rgba(255,255,255,0.4)', fontSize:'0.78rem' },
  chevron: { color:'rgba(255,255,255,0.3)', flexShrink:0, fontSize:'0.7rem', paddingTop:4 },
  cardBody: { borderTop:'1px solid rgba(255,255,255,0.06)', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 },
  field: { },
  fieldLabel: { color:'rgba(255,255,255,0.4)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:3 },
  fieldValue: { color:'rgba(255,255,255,0.8)', fontSize:'0.875rem', margin:0, lineHeight:1.6 },
  recetasSection: { borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:10 },
  recetaRow: { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginTop:6 },
  recetaCodigo: { color:'#4fb3d9', fontWeight:700, fontFamily:'monospace', fontSize:'0.875rem' },
  estadoBadge: { fontSize:'0.72rem', fontWeight:600, textTransform:'capitalize' },
  medTag: { background:'rgba(123,63,138,0.2)', color:'#c084fc', border:'1px solid rgba(123,63,138,0.3)', borderRadius:4, padding:'2px 8px', fontSize:'0.75rem' },
  btnEdit: { background:'rgba(255,200,0,0.1)', color:'#fbbf24', border:'1px solid rgba(255,200,0,0.2)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:'0.8rem' },
  privacyNote: { background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.15)', borderRadius:8, padding:'8px 12px', color:'rgba(248,113,113,0.8)', fontSize:'0.78rem', marginTop:8 },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1rem' },
  modal: { background:'#0f2033', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'2rem', width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' },
  modalTitle: { color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'1.3rem', margin:'0 0 0.5rem' },
  label: { display:'block', color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', fontWeight:500, marginBottom:4, marginTop:10 },
  input: { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'9px 12px', color:'#fff', fontSize:'0.875rem', outline:'none', fontFamily:'inherit' },
  errorBox: { background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:8, padding:'9px 14px', color:'#ff8080', fontSize:'0.83rem', margin:'0.8rem 0' },
  btnRow: { display:'flex', gap:10, justifyContent:'flex-end', marginTop:'1.2rem' },
  btnPrimary: { background:'#1e6b8a', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 },
  btnSec: { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontFamily:'inherit' },
};
