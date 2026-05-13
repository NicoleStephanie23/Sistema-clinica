import { useState } from 'react';
import { validarReceta, dispensarReceta } from '../services/api';

export default function Recetas() {
  const [codigo, setCodigo] = useState('');
  const [receta, setReceta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispensando, setDispensando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const buscar = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setReceta(null); setExito('');
    try {
      const data = await validarReceta(codigo.trim().toUpperCase());
      setReceta(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Receta no encontrada');
    } finally { setLoading(false); }
  };

  const dispensar = async () => {
    setDispensando(true); setError('');
    try {
      await dispensarReceta(codigo.trim().toUpperCase());
      setExito(`Receta ${codigo} dispensada correctamente`);
      setReceta(r => ({ ...r, estado:'dispensada' }));
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al dispensar');
    } finally { setDispensando(false); }
  };

  const estadoColor = { pendiente:'#4ade80', dispensada:'#60a5fa', cancelada:'#f87171' };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Dispensación de Recetas</h2>
          <p style={s.sub}>Valida y dispensa recetas electrónicas</p>
        </div>
      </div>

      <form onSubmit={buscar} style={s.buscador}>
        <input style={s.inputCodigo} value={codigo} onChange={e=>setCodigo(e.target.value)}
          placeholder="Código de receta (ej: RX-AB3C4D5E)" required />
        <button type="submit" style={s.btnPrimary} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar receta'}
        </button>
      </form>

      {error && <div style={s.error}>{error}</div>}
      {exito && <div style={s.success}>{exito}</div>}

      {receta && (
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <div style={s.codigoBig}>{receta.codigo}</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.82rem' }}>
                {new Date(receta.fecha).toLocaleString('es-CO')}
              </div>
            </div>
            <span style={{ ...s.estadoBadge, background: `${estadoColor[receta.estado]}22`, color: estadoColor[receta.estado], border:`1px solid ${estadoColor[receta.estado]}44` }}>
              {receta.estado}
            </span>
          </div>

          <div style={s.grid2}>
            <div style={s.infoBox}>
              <p style={s.infoLabel}>Paciente</p>
              <p style={s.infoVal}>{receta.pac_nombre} {receta.pac_apellido}</p>
              <p style={s.infoSub}>Doc: {receta.documento}</p>
              {receta.eps && <p style={s.infoSub}>EPS: {receta.eps}</p>}
            </div>
            <div style={s.infoBox}>
              <p style={s.infoLabel}>Médico</p>
              <p style={s.infoVal}>{receta.medico_nombre}</p>
            </div>
          </div>

          {receta.indicaciones && (
            <div style={s.indicaciones}>
              <p style={s.infoLabel}>Indicaciones</p>
              <p style={{ color:'rgba(255,255,255,0.7)', margin:0 }}>{receta.indicaciones}</p>
            </div>
          )}

          <div style={s.itemsSection}>
            <p style={s.infoLabel}>Medicamentos</p>
            {(receta.items||[]).map((it,i)=>(
              <div key={i} style={s.itemRow}>
                <div style={{ color:'#fff', fontWeight:600 }}>{it.nombre_medicamento}</div>
                <div style={s.itemDetail}>
                  {it.dosis && <span>Dosis: {it.dosis}</span>}
                  {it.frecuencia && <span>Frecuencia: {it.frecuencia}</span>}
                  {it.duracion && <span>Duración: {it.duracion}</span>}
                  <span style={{ color:'#c084fc' }}>Cantidad: {it.cantidad}</span>
                </div>
              </div>
            ))}
          </div>

          {receta.estado === 'pendiente' && (
            <div style={s.dispensarSection}>
              <button style={s.btnDispensar} onClick={dispensar} disabled={dispensando}>
                {dispensando ? 'Procesando...' : '✓ Confirmar dispensación'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { padding:'2rem', color:'rgba(255,255,255,0.8)', fontFamily:"'DM Sans',sans-serif" },
  header: { marginBottom:'1.5rem' },
  title: { color:'#fff', fontSize:'1.6rem', margin:0, fontFamily:"'DM Serif Display',serif" },
  sub: { color:'rgba(255,255,255,0.4)', margin:'4px 0 0', fontSize:'0.85rem' },
  buscador: { display:'flex', gap:10, marginBottom:'1.2rem', maxWidth:600 },
  inputCodigo: { flex:1, background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'11px 16px', color:'#fff', fontSize:'0.95rem', outline:'none', fontFamily:'inherit', letterSpacing:'0.05em', textTransform:'uppercase' },
  btnPrimary: { background:'#7b3f8a', color:'#fff', border:'none', borderRadius:10, padding:'11px 22px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, whiteSpace:'nowrap' },
  error: { background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:10, padding:'12px 16px', color:'#ff8080', marginBottom:'1rem', maxWidth:600 },
  success: { background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:10, padding:'12px 16px', color:'#4ade80', marginBottom:'1rem', maxWidth:600 },
  card: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'1.5rem', maxWidth:700 },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.2rem' },
  codigoBig: { color:'#fff', fontSize:'1.5rem', fontWeight:700, letterSpacing:'0.08em', fontFamily:'monospace' },
  estadoBadge: { borderRadius:20, padding:'4px 14px', fontSize:'0.8rem', fontWeight:600, textTransform:'capitalize' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:'1rem' },
  infoBox: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'12px' },
  infoLabel: { color:'rgba(255,255,255,0.4)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 4px' },
  infoVal: { color:'#fff', fontWeight:600, margin:'0 0 2px' },
  infoSub: { color:'rgba(255,255,255,0.5)', fontSize:'0.82rem', margin:0 },
  indicaciones: { background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'12px', marginBottom:'1rem' },
  itemsSection: { marginBottom:'1rem' },
  itemRow: { background:'rgba(255,255,255,0.04)', borderRadius:9, padding:'10px 14px', marginBottom:6 },
  itemDetail: { display:'flex', gap:16, flexWrap:'wrap', marginTop:4, color:'rgba(255,255,255,0.5)', fontSize:'0.82rem' },
  dispensarSection: { borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:'1rem', textAlign:'right' },
  btnDispensar: { background:'linear-gradient(135deg,#2d6a4f,#1e6b8a)', color:'#fff', border:'none', borderRadius:12, padding:'12px 28px', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'1rem' },
};
