import { useState, useEffect } from 'react';
import { getRecetasPendientes, dispensarReceta, actualizarEstadoReceta } from '../services/api';
import { generarPDFReceta } from '../services/pdfReceta';

export default function Recetas() {
  const [pendientes, setPendientes] = useState([]);
  const [recetaSel, setRecetaSel]   = useState(null);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState('');
  const [exito,     setExito]       = useState('');
  const [dispensando, setDispensando] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const cargar = async () => {
    setLoading(true); setError('');
    try {
      const data = await getRecetasPendientes();
      setPendientes(data);
      // si la receta seleccionada ya no está pendiente, deseleccionar
      if (recetaSel) {
        const actualizada = data.find(r => r.id === recetaSel.id);
        if (!actualizada) setRecetaSel(null);
      }
    } catch { setError('Error al cargar recetas pendientes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const dispensar = async (receta) => {
    setDispensando(true); setError(''); setExito('');
    try {
      // 1. Descontar stock en ms-medicamentos (solo items con medicamento_id asignado)
      const resultado = await dispensarReceta(receta.id, receta.items || []);

      // 2. Marcar receta como despachada en ms-historias
      await actualizarEstadoReceta(receta.id, 'despachada');

      // 3. Notificar stock bajo si aplica
      const bajoStock = (resultado.despachados || []).filter(d => d.bajo_stock);
      const avisoStock = bajoStock.length
        ? ` ⚠ Stock bajo: ${bajoStock.map(d => d.nombre_medicamento).join(', ')}`
        : '';

      setExito(`Receta ${receta.codigo} despachada correctamente.${avisoStock}`);
      setRecetaSel(null);
      await cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al despachar');
    } finally { setDispensando(false); }
  };

  const exportarPDF = async (receta) => {
    setGenerandoPDF(true);
    try { await generarPDFReceta(receta); }
    catch (err) { setError('Error al generar PDF: ' + err.message); }
    finally { setGenerandoPDF(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Recetas Pendientes</h2>
          <p style={s.sub}>Recetas emitidas por médicos que aún no han sido despachadas</p>
        </div>
        <button style={s.btnRefresh} onClick={cargar} disabled={loading}>
          {loading ? '...' : '↻ Actualizar'}
        </button>
      </div>

      {error && <div style={s.error}>{error}</div>}
      {exito && <div style={s.success}>{exito}</div>}

      <div style={s.layout}>
        {/* Lista de pendientes */}
        <div style={s.lista}>
          {loading && <div style={s.empty}>Cargando...</div>}
          {!loading && pendientes.length === 0 && (
            <div style={s.empty}>No hay recetas pendientes de despacho</div>
          )}
          {pendientes.map(r => (
            <div key={r.id}
              style={{ ...s.recetaCard, ...(recetaSel?.id === r.id ? s.recetaCardSel : {}) }}
              onClick={() => { setRecetaSel(r); setError(''); setExito(''); }}>
              <div style={s.recetaTop}>
                <span style={s.codigo}>{r.codigo}</span>
                <span style={s.fechaCard}>
                  {new Date(r.fecha).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}
                </span>
              </div>
              <div style={s.pacNombre}>{r.pac_nombre} {r.pac_apellido}</div>
              <div style={s.medNombre}>Dr. {r.medico_nombre}</div>
              <div style={s.itemsPreview}>
                {(r.items || []).slice(0,2).map((it,i) => (
                  <span key={i} style={s.medTag}>{it.nombre_medicamento}</span>
                ))}
                {(r.items || []).length > 2 && (
                  <span style={s.medTagMore}>+{r.items.length - 2} más</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detalle */}
        <div style={s.detalle}>
          {!recetaSel ? (
            <div style={s.emptyDetalle}>
              <div style={{ fontSize:48, marginBottom:12 }}>👆</div>
              <p>Selecciona una receta de la lista para ver el detalle y despacharla</p>
            </div>
          ) : (
            <>
              <div style={s.detalleHeader}>
                <div>
                  <div style={s.codigoBig}>{recetaSel.codigo}</div>
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' }}>
                    {new Date(recetaSel.fecha).toLocaleString('es-CO')}
                  </div>
                </div>
                <span style={s.estadoPend}>pendiente</span>
              </div>

              <div style={s.grid2}>
                <div style={s.infoBox}>
                  <p style={s.infoLabel}>Paciente</p>
                  <p style={s.infoVal}>{recetaSel.pac_nombre} {recetaSel.pac_apellido}</p>
                  <p style={s.infoSub}>Doc: {recetaSel.documento}</p>
                </div>
                <div style={s.infoBox}>
                  <p style={s.infoLabel}>Médico</p>
                  <p style={s.infoVal}>{recetaSel.medico_nombre}</p>
                </div>
              </div>

              {recetaSel.indicaciones && (
                <div style={s.indicaciones}>
                  <p style={s.infoLabel}>Indicaciones</p>
                  <p style={{ color:'rgba(255,255,255,0.7)', margin:0, fontSize:'0.875rem' }}>
                    {recetaSel.indicaciones}
                  </p>
                </div>
              )}

              <div>
                <p style={s.infoLabel}>Medicamentos a despachar</p>
                {(recetaSel.items || []).map((it, i) => (
                  <div key={i} style={s.itemRow}>
                    <div style={{ color:'#fff', fontWeight:600 }}>{it.nombre_medicamento}</div>
                    <div style={s.itemDetail}>
                      {it.dosis      && <span>Dosis: {it.dosis}</span>}
                      {it.frecuencia && <span>Frecuencia: {it.frecuencia}</span>}
                      {it.duracion   && <span>Duración: {it.duracion}</span>}
                      <span style={{ color:'#c084fc', fontWeight:600 }}>Cant: {it.cantidad}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={s.acciones}>
                <button style={s.btnPDF} disabled={generandoPDF}
                  onClick={() => exportarPDF(recetaSel)}>
                  {generandoPDF ? 'Generando...' : '⬇ Descargar PDF'}
                </button>
                <button style={s.btnDispensar} disabled={dispensando}
                  onClick={() => dispensar(recetaSel)}>
                  {dispensando ? 'Procesando...' : '✓ Confirmar despacho'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page:   { padding:'2rem', fontFamily:"'DM Sans',sans-serif" },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' },
  title:  { color:'#fff', fontSize:'1.6rem', margin:0, fontFamily:"'DM Serif Display',serif" },
  sub:    { color:'rgba(255,255,255,0.4)', margin:'4px 0 0', fontSize:'0.85rem' },
  btnRefresh: { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontFamily:'inherit' },
  error:   { background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:10, padding:'12px 16px', color:'#ff8080', marginBottom:'1rem' },
  success: { background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:10, padding:'12px 16px', color:'#4ade80', marginBottom:'1rem' },
  layout:  { display:'grid', gridTemplateColumns:'320px 1fr', gap:16, minHeight:400 },
  lista:   { display:'flex', flexDirection:'column', gap:8, overflowY:'auto', maxHeight:'70vh' },
  empty:   { padding:'2rem', textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:'0.875rem' },
  recetaCard: { background:'rgba(255,255,255,0.03)', border:'1.5px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px', cursor:'pointer', transition:'all 0.15s' },
  recetaCardSel: { borderColor:'#7b3f8a', background:'rgba(123,63,138,0.12)' },
  recetaTop: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  codigo:  { color:'#4fb3d9', fontWeight:700, fontFamily:'monospace', fontSize:'0.875rem' },
  fechaCard: { color:'rgba(255,255,255,0.3)', fontSize:'0.75rem' },
  pacNombre: { color:'#fff', fontWeight:600, fontSize:'0.9rem', marginBottom:2 },
  medNombre: { color:'rgba(255,255,255,0.4)', fontSize:'0.78rem', marginBottom:6 },
  itemsPreview: { display:'flex', gap:4, flexWrap:'wrap' },
  medTag:  { background:'rgba(123,63,138,0.2)', color:'#c084fc', border:'1px solid rgba(123,63,138,0.25)', borderRadius:4, padding:'2px 7px', fontSize:'0.72rem' },
  medTagMore: { color:'rgba(255,255,255,0.3)', fontSize:'0.72rem', alignSelf:'center' },
  detalle: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' },
  emptyDetalle: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)', textAlign:'center', gap:4 },
  detalleHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  codigoBig: { color:'#fff', fontSize:'1.4rem', fontWeight:700, letterSpacing:'0.06em', fontFamily:'monospace' },
  estadoPend: { background:'rgba(74,222,128,0.15)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.3)', borderRadius:20, padding:'3px 12px', fontSize:'0.78rem', fontWeight:600 },
  grid2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  infoBox: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px' },
  infoLabel: { color:'rgba(255,255,255,0.4)', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 4px' },
  infoVal: { color:'#fff', fontWeight:600, margin:'0 0 2px', fontSize:'0.9rem' },
  infoSub: { color:'rgba(255,255,255,0.45)', fontSize:'0.8rem', margin:0 },
  indicaciones: { background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'10px 12px' },
  itemRow: { background:'rgba(255,255,255,0.04)', borderRadius:9, padding:'9px 12px', marginBottom:6 },
  itemDetail: { display:'flex', gap:14, flexWrap:'wrap', marginTop:3, color:'rgba(255,255,255,0.5)', fontSize:'0.8rem' },
  acciones: { display:'flex', gap:10, justifyContent:'flex-end', borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:'1rem', marginTop:'auto' },
  btnPDF: { background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.8)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, padding:'11px 20px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 },
  btnDispensar: { background:'linear-gradient(135deg,#2d6a4f,#1e6b8a)', color:'#fff', border:'none', borderRadius:10, padding:'11px 24px', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'0.95rem' },
};
