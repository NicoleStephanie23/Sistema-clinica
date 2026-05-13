import { useState, useEffect } from 'react';
import { getMedicamentos, crearMedicamento, ajustarStock } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Medicamentos() {
  const { user } = useAuth();
  const [meds, setMeds] = useState([]);
  const [q, setQ] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [modal, setModal] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [form, setForm] = useState({ nombre:'', nombre_generico:'', presentacion:'', concentracion:'', laboratorio:'', stock_actual:0, stock_minimo:5, precio_unitario:0, requiere_receta:true });
  const [stockForm, setStockForm] = useState({ tipo:'entrada', cantidad:1, motivo:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargar = async (busq=q, bajo=soloStockBajo) => {
    try { setMeds(await getMedicamentos(busq, bajo)); } catch {}
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await crearMedicamento(form);
      setModal(false);
      setForm({ nombre:'', nombre_generico:'', presentacion:'', concentracion:'', laboratorio:'', stock_actual:0, stock_minimo:5, precio_unitario:0, requiere_receta:true });
      cargar();
    } catch (err) { setError(err?.response?.data?.error || 'Error al guardar'); }
    finally { setLoading(false); }
  };

  const guardarStock = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await ajustarStock(stockModal.id, stockForm);
      setStockModal(null);
      setStockForm({ tipo:'entrada', cantidad:1, motivo:'' });
      cargar();
    } catch (err) { setError(err?.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const puedeCrear = ['administrador','farmaceutico'].includes(user?.perfil);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Medicamentos</h2>
          <p style={s.sub}>Inventario y control de stock</p>
        </div>
        {puedeCrear && <button style={s.btnPrimary} onClick={() => setModal(true)}>+ Nuevo medicamento</button>}
      </div>

      <div style={s.filters}>
        <input style={{ ...s.search, flex:1 }} placeholder="Buscar medicamento..."
          value={q} onChange={e => { setQ(e.target.value); cargar(e.target.value, soloStockBajo); }} />
        <button style={{ ...s.btnSec, ...(soloStockBajo ? { background:'rgba(239,68,68,0.2)', color:'#f87171', borderColor:'rgba(239,68,68,0.4)' } : {}) }}
          onClick={() => { setSoloStockBajo(v => { cargar(q,!v); return !v; }) }}>
          ⚠ Stock bajo
        </button>
      </div>

      <div style={s.table}>
        <div style={s.thead}>
          <span>Medicamento</span><span>Presentación</span><span>Stock</span>
          <span>Precio</span><span>Receta</span><span>Acción</span>
        </div>
        {meds.length === 0 && <div style={s.empty}>Sin medicamentos</div>}
        {meds.map(m => {
          const bajo = m.stock_actual <= m.stock_minimo;
          return (
            <div key={m.id} style={s.row}>
              <div>
                <div style={{ color:'#fff', fontWeight:600, fontSize:'0.9rem' }}>{m.nombre}</div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.78rem' }}>{m.nombre_generico}</div>
              </div>
              <span>{m.presentacion} {m.concentracion}</span>
              <span style={{ color: bajo ? '#f87171':'#4ade80', fontWeight:600 }}>
                {bajo ? '⚠ ':''}{m.stock_actual} / min {m.stock_minimo}
              </span>
              <span>${Number(m.precio_unitario).toLocaleString()}</span>
              <span>{m.requiere_receta ? '✓ Sí':'No'}</span>
              {puedeCrear
                ? <button style={s.btnSm} onClick={() => { setStockModal(m); setError(''); }}>Ajustar stock</button>
                : <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.8rem' }}>Solo lectura</span>
              }
            </div>
          );
        })}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Nuevo Medicamento</h3>
            <form onSubmit={guardar}>
              <div style={s.grid2}>
                <Field label="Nombre comercial" value={form.nombre} onChange={v=>f('nombre',v)} required />
                <Field label="Nombre genérico" value={form.nombre_generico} onChange={v=>f('nombre_generico',v)} />
              </div>
              <div style={s.grid2}>
                <Field label="Presentación" value={form.presentacion} onChange={v=>f('presentacion',v)} />
                <Field label="Concentración" value={form.concentracion} onChange={v=>f('concentracion',v)} />
              </div>
              <Field label="Laboratorio" value={form.laboratorio} onChange={v=>f('laboratorio',v)} />
              <div style={s.grid2}>
                <Field label="Stock actual" type="number" value={form.stock_actual} onChange={v=>f('stock_actual',v)} />
                <Field label="Stock mínimo" type="number" value={form.stock_minimo} onChange={v=>f('stock_minimo',v)} />
              </div>
              <Field label="Precio unitario ($)" type="number" value={form.precio_unitario} onChange={v=>f('precio_unitario',v)} />
              <div style={{ marginTop:12 }}>
                <label style={s.label}>
                  <input type="checkbox" checked={form.requiere_receta} onChange={e=>f('requiere_receta',e.target.checked)} style={{ marginRight:6 }} />
                  Requiere receta médica
                </label>
              </div>
              {error && <div style={s.error}>{error}</div>}
              <div style={s.btnRow}>
                <button type="button" style={s.btnSec} onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" style={s.btnPrimary} disabled={loading}>{loading?'Guardando...':'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stockModal && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth:380 }}>
            <h3 style={s.modalTitle}>Ajustar Stock — {stockModal.nombre}</h3>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.85rem', margin:'0 0 1rem' }}>
              Stock actual: <strong style={{ color:'#fff' }}>{stockModal.stock_actual}</strong>
            </p>
            <form onSubmit={guardarStock}>
              <label style={s.label}>Tipo de movimiento</label>
              <select style={s.input} value={stockForm.tipo} onChange={e=>setStockForm(p=>({...p,tipo:e.target.value}))}>
                <option value="entrada">Entrada (compra)</option>
                <option value="salida">Salida (dispensación manual)</option>
                <option value="ajuste">Ajuste de inventario</option>
              </select>
              <label style={{ ...s.label, marginTop:12 }}>Cantidad</label>
              <input style={s.input} type="number" min="1" value={stockForm.cantidad}
                onChange={e=>setStockForm(p=>({...p,cantidad:Number(e.target.value)}))} required />
              <label style={{ ...s.label, marginTop:12 }}>Motivo</label>
              <input style={s.input} value={stockForm.motivo}
                onChange={e=>setStockForm(p=>({...p,motivo:e.target.value}))} />
              {error && <div style={s.error}>{error}</div>}
              <div style={s.btnRow}>
                <button type="button" style={s.btnSec} onClick={() => setStockModal(null)}>Cancelar</button>
                <button type="submit" style={s.btnPrimary} disabled={loading}>{loading?'Guardando...':'Confirmar'}</button>
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
  filters: { display:'flex', gap:10, marginBottom:'1rem', alignItems:'center' },
  btnPrimary: { background:'#7b3f8a', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:'0.9rem' },
  btnSec: { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', whiteSpace:'nowrap' },
  btnSm: { background:'rgba(123,63,138,0.3)', color:'#c084fc', border:'1px solid rgba(123,63,138,0.4)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontFamily:'inherit', fontSize:'0.8rem' },
  search: { background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 16px', color:'#fff', fontSize:'0.9rem', outline:'none', fontFamily:'inherit' },
  table: { background:'rgba(255,255,255,0.03)', borderRadius:14, border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' },
  thead: { display:'grid', gridTemplateColumns:'2fr 1.5fr 1.2fr 1fr 0.8fr 1fr', padding:'10px 16px', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase' },
  row: { display:'grid', gridTemplateColumns:'2fr 1.5fr 1.2fr 1fr 0.8fr 1fr', padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.65)', fontSize:'0.88rem', alignItems:'center' },
  empty: { padding:'2rem', textAlign:'center', color:'rgba(255,255,255,0.3)' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'1rem' },
  modal: { background:'#0f2033', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'2rem', width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto' },
  modalTitle: { color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'1.3rem', margin:'0 0 1.2rem' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  label: { display:'block', color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', fontWeight:500, marginBottom:5, marginTop:12 },
  input: { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'9px 12px', color:'#fff', fontSize:'0.88rem', outline:'none', fontFamily:'inherit' },
  error: { background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:8, padding:'9px 14px', color:'#ff8080', fontSize:'0.83rem', margin:'0.8rem 0' },
  btnRow: { display:'flex', gap:10, justifyContent:'flex-end', marginTop:'1.2rem' },
};
