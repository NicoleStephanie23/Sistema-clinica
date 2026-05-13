import { useState } from 'react';
import { getReporteAtenciones, getReporteMedicamentos, getReporteAudit } from '../services/api';
import { useAuth } from '../context/AuthContext';

const hoy = new Date().toISOString().split('T')[0];
const mesAtras = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];

export default function Reportes() {
  const { user } = useAuth();
  const [desde, setDesde] = useState(mesAtras);
  const [hasta, setHasta] = useState(hoy);
  const [tab, setTab] = useState('atenciones');
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setLoading(true); setError(''); setDatos(null);
    try {
      if (tab === 'atenciones') setDatos(await getReporteAtenciones(desde, hasta));
      else if (tab === 'medicamentos') setDatos(await getReporteMedicamentos(desde, hasta));
      else if (tab === 'audit') setDatos(await getReporteAudit(desde, hasta));
    } catch (err) { setError(err?.response?.data?.error || 'Error al cargar reporte'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <h2 style={s.title}>Reportes</h2>

      <div style={s.tabs}>
        {[
          { id:'atenciones', label:'Atenciones por período' },
          { id:'medicamentos', label:'Medicamentos recetados' },
          ...(user?.perfil==='administrador'?[{ id:'audit', label:'Auditoría de accesos' }]:[]),
        ].map(t=>(
          <button key={t.id} style={{ ...s.tab, ...(tab===t.id?s.tabActive:{}) }}
            onClick={()=>{ setTab(t.id); setDatos(null); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.filtros}>
        <div>
          <label style={s.label}>Desde</label>
          <input type="date" style={s.input} value={desde} onChange={e=>setDesde(e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Hasta</label>
          <input type="date" style={s.input} value={hasta} onChange={e=>setHasta(e.target.value)} />
        </div>
        <button style={s.btnPrimary} onClick={cargar} disabled={loading}>
          {loading ? 'Cargando...' : 'Generar reporte'}
        </button>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {/* ATENCIONES */}
      {datos && tab==='atenciones' && (
        <div>
          <div style={s.summary}>
            <div style={s.summaryCard}>
              <p style={s.summaryLabel}>Total atenciones</p>
              <p style={s.summaryVal}>{datos.totales?.total || 0}</p>
            </div>
            <div style={s.summaryCard}>
              <p style={s.summaryLabel}>Pacientes únicos</p>
              <p style={s.summaryVal}>{datos.totales?.pacientes || 0}</p>
            </div>
          </div>
          <div style={s.table}>
            <div style={{ ...s.thead, gridTemplateColumns:'1.5fr 1fr 1fr 1.5fr' }}>
              <span>Fecha</span><span>Atenciones</span><span>Pacientes únicos</span><span>Médico</span>
            </div>
            {datos.detalle?.map((r,i)=>(
              <div key={i} style={{ ...s.row, gridTemplateColumns:'1.5fr 1fr 1fr 1.5fr' }}>
                <span>{r.dia}</span>
                <span style={{ color:'#4ade80', fontWeight:600 }}>{r.total_atenciones}</span>
                <span>{r.pacientes_unicos}</span>
                <span>{r.medico}</span>
              </div>
            ))}
            {!datos.detalle?.length && <div style={s.empty}>Sin datos en el período</div>}
          </div>
        </div>
      )}

      {/* MEDICAMENTOS */}
      {datos && tab==='medicamentos' && (
        <div style={s.table}>
          <div style={{ ...s.thead, gridTemplateColumns:'2fr 1fr 1fr' }}>
            <span>Medicamento</span><span>Total recetado</span><span>Veces recetado</span>
          </div>
          {datos.map((r,i)=>(
            <div key={i} style={{ ...s.row, gridTemplateColumns:'2fr 1fr 1fr' }}>
              <span style={{ color:'#fff', fontWeight:600 }}>{r.nombre_medicamento}</span>
              <span style={{ color:'#c084fc', fontWeight:600 }}>{r.total_recetado}</span>
              <span>{r.veces_recetado}</span>
            </div>
          ))}
          {!datos.length && <div style={s.empty}>Sin datos en el período</div>}
        </div>
      )}

      {/* AUDITORÍA */}
      {datos && tab==='audit' && (
        <div style={s.table}>
          <div style={{ ...s.thead, gridTemplateColumns:'1.5fr 1fr 1.5fr 1fr 0.8fr' }}>
            <span>Fecha</span><span>Usuario</span><span>Acción</span><span>Recurso</span><span>Resultado</span>
          </div>
          {datos.map((r,i)=>(
            <div key={i} style={{ ...s.row, gridTemplateColumns:'1.5fr 1fr 1.5fr 1fr 0.8fr' }}>
              <span style={{ fontSize:'0.8rem' }}>{new Date(r.fecha).toLocaleString('es-CO')}</span>
              <span>{r.usuario_email?.split('@')[0]}</span>
              <span>{r.accion}</span>
              <span>{r.recurso} {r.recurso_id ? `#${r.recurso_id}`:''}</span>
              <span style={{ color: r.resultado==='exito'?'#4ade80':r.resultado==='denegado'?'#f87171':'#fbbf24' }}>
                {r.resultado}
              </span>
            </div>
          ))}
          {!datos.length && <div style={s.empty}>Sin registros en el período</div>}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding:'2rem', color:'rgba(255,255,255,0.8)', fontFamily:"'DM Sans',sans-serif" },
  title: { color:'#fff', fontSize:'1.6rem', margin:'0 0 1.5rem', fontFamily:"'DM Serif Display',serif" },
  tabs: { display:'flex', gap:4, background:'rgba(255,255,255,0.05)', borderRadius:12, padding:4, marginBottom:'1.5rem', width:'fit-content' },
  tab: { padding:'8px 16px', borderRadius:9, border:'none', background:'transparent', color:'rgba(255,255,255,0.45)', cursor:'pointer', fontSize:'0.85rem', fontFamily:'inherit' },
  tabActive: { background:'rgba(255,255,255,0.1)', color:'#fff' },
  filtros: { display:'flex', gap:16, alignItems:'flex-end', marginBottom:'1.5rem', flexWrap:'wrap' },
  label: { display:'block', color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', marginBottom:5 },
  input: { background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'9px 12px', color:'#fff', fontSize:'0.88rem', outline:'none', fontFamily:'inherit' },
  btnPrimary: { background:'#2d6a4f', color:'#fff', border:'none', borderRadius:10, padding:'10px 22px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 },
  error: { background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:8, padding:'9px 14px', color:'#ff8080', marginBottom:'1rem' },
  summary: { display:'flex', gap:12, marginBottom:'1.2rem' },
  summaryCard: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'1rem 1.5rem' },
  summaryLabel: { color:'rgba(255,255,255,0.4)', fontSize:'0.78rem', margin:'0 0 4px' },
  summaryVal: { color:'#fff', fontSize:'2rem', fontWeight:700, margin:0 },
  table: { background:'rgba(255,255,255,0.03)', borderRadius:14, border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' },
  thead: { display:'grid', padding:'10px 16px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase' },
  row: { display:'grid', padding:'11px 16px', borderTop:'1px solid rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.65)', fontSize:'0.85rem', alignItems:'center' },
  empty: { padding:'2rem', textAlign:'center', color:'rgba(255,255,255,0.3)' },
};
