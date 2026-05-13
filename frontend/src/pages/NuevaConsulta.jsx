import { useState, useEffect } from 'react';
import { getPacientes, crearHistoria, crearReceta, getMedicamentos } from '../services/api';

export default function NuevaConsulta() {
  const [step, setStep] = useState(1); // 1=paciente, 2=historia, 3=receta, 4=listo
  const [pacientes, setPacientes] = useState([]);
  const [qPac, setQPac] = useState('');
  const [pacSel, setPacSel] = useState(null);
  const [historia, setHistoria] = useState({ motivo_consulta:'', anamnesis:'', examen_fisico:'', diagnostico:'', plan_tratamiento:'', observaciones:'' });
  const [historiaId, setHistoriaId] = useState(null);
  const [recetaCodigo, setRecetaCodigo] = useState('');
  const [items, setItems] = useState([{ nombre_medicamento:'', medicamento_id:null, dosis:'', frecuencia:'', duracion:'', cantidad:1 }]);
  const [indicaciones, setIndicaciones] = useState('');
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sinReceta, setSinReceta] = useState(false);

  useEffect(() => { buscarPac(''); getMedicamentos('').then(setMeds); }, []);

  const buscarPac = async (q) => {
    try { setPacientes(await getPacientes(q)); } catch {}
  };

  const guardarHistoria = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await crearHistoria({ ...historia, paciente_id: pacSel.id });
      setHistoriaId(res.id);
      setStep(3);
    } catch (err) { setError(err?.response?.data?.error || 'Error al guardar historia'); }
    finally { setLoading(false); }
  };

  const guardarReceta = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await crearReceta({ historia_id: historiaId, paciente_id: pacSel.id, indicaciones, items });
      setRecetaCodigo(res.codigo);
      setStep(4);
    } catch (err) { setError(err?.response?.data?.error || 'Error al crear receta'); }
    finally { setLoading(false); }
  };

  const addItem = () => setItems(p => [...p, { nombre_medicamento:'', medicamento_id:null, dosis:'', frecuencia:'', duracion:'', cantidad:1 }]);
  const removeItem = (i) => setItems(p => p.filter((_,idx)=>idx!==i));
  const updateItem = (i,k,v) => setItems(p => p.map((it,idx)=>idx===i?{...it,[k]:v}:it));
  const selMed = (i, med) => updateItem(i,'nombre_medicamento',med.nombre) || setItems(p=>p.map((it,idx)=>idx===i?{...it,nombre_medicamento:med.nombre,medicamento_id:med.id}:it));

  const hf = (k,v) => setHistoria(p=>({...p,[k]:v}));

  return (
    <div style={s.page}>
      <h2 style={s.title}>Nueva Consulta</h2>

      <div style={s.steps}>
        {['Paciente','Historia clínica','Receta','Finalizado'].map((label,i)=>(
          <div key={i} style={{ ...s.step, ...(step===i+1?s.stepActive:{}), ...(step>i+1?s.stepDone:{}) }}>
            <span style={s.stepNum}>{step>i+1?'✓':i+1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* STEP 1 — Seleccionar paciente */}
      {step===1 && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Selecciona el paciente</h3>
          <input style={s.input} placeholder="Buscar por nombre o documento..."
            value={qPac} onChange={e=>{setQPac(e.target.value);buscarPac(e.target.value)}} />
          <div style={s.pacList}>
            {pacientes.map(p=>(
              <div key={p.id} style={{ ...s.pacItem, ...(pacSel?.id===p.id?s.pacItemSel:{}) }}
                onClick={()=>setPacSel(p)}>
                <strong style={{color:'#fff'}}>{p.nombre} {p.apellido}</strong>
                <span style={{color:'rgba(255,255,255,0.4)',fontSize:'0.8rem'}}>{p.tipo_documento} {p.documento}</span>
                {p.alergias && <span style={{color:'#f87171',fontSize:'0.78rem'}}>⚠ {p.alergias}</span>}
              </div>
            ))}
          </div>
          <button style={s.btnPrimary} disabled={!pacSel} onClick={()=>setStep(2)}>
            Continuar →
          </button>
        </div>
      )}

      {/* STEP 2 — Historia clínica */}
      {step===2 && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Historia Clínica — {pacSel?.nombre} {pacSel?.apellido}</h3>
          <form onSubmit={guardarHistoria}>
            <Area label="Motivo de consulta *" value={historia.motivo_consulta} onChange={v=>hf('motivo_consulta',v)} required />
            <Area label="Anamnesis" value={historia.anamnesis} onChange={v=>hf('anamnesis',v)} />
            <Area label="Examen físico" value={historia.examen_fisico} onChange={v=>hf('examen_fisico',v)} />
            <Area label="Diagnóstico *" value={historia.diagnostico} onChange={v=>hf('diagnostico',v)} required />
            <Area label="Plan de tratamiento" value={historia.plan_tratamiento} onChange={v=>hf('plan_tratamiento',v)} />
            <Area label="Observaciones" value={historia.observaciones} onChange={v=>hf('observaciones',v)} />
            {error && <div style={s.error}>{error}</div>}
            <div style={s.btnRow}>
              <button type="button" style={s.btnSec} onClick={()=>setStep(1)}>← Atrás</button>
              <button type="submit" style={s.btnPrimary} disabled={loading}>{loading?'Guardando...':'Guardar historia →'}</button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3 — Receta */}
      {step===3 && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Receta Electrónica</h3>
          <label style={s.label}>
            <input type="checkbox" checked={sinReceta} onChange={e=>setSinReceta(e.target.checked)} style={{marginRight:6}}/>
            Finalizar sin receta
          </label>
          {sinReceta ? (
            <div style={s.btnRow}>
              <button style={s.btnPrimary} onClick={()=>setStep(4)}>Finalizar consulta →</button>
            </div>
          ) : (
            <form onSubmit={guardarReceta}>
              <Area label="Indicaciones generales" value={indicaciones} onChange={setIndicaciones} />
              <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.82rem',margin:'1rem 0 0.5rem'}}>Medicamentos:</p>
              {items.map((it,i)=>(
                <div key={i} style={s.itemBox}>
                  <div style={s.grid2}>
                    <div>
                      <label style={s.label}>Medicamento</label>
                      <input style={s.input} value={it.nombre_medicamento}
                        onChange={e=>updateItem(i,'nombre_medicamento',e.target.value)}
                        list={`meds-${i}`} placeholder="Nombre del medicamento" required />
                      <datalist id={`meds-${i}`}>
                        {meds.map(m=><option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                      </datalist>
                    </div>
                    <div>
                      <label style={s.label}>Cantidad</label>
                      <input style={s.input} type="number" min="1" value={it.cantidad}
                        onChange={e=>updateItem(i,'cantidad',Number(e.target.value))} />
                    </div>
                  </div>
                  <div style={s.grid3}>
                    <div><label style={s.label}>Dosis</label><input style={s.input} value={it.dosis} onChange={e=>updateItem(i,'dosis',e.target.value)} placeholder="500mg" /></div>
                    <div><label style={s.label}>Frecuencia</label><input style={s.input} value={it.frecuencia} onChange={e=>updateItem(i,'frecuencia',e.target.value)} placeholder="Cada 8h" /></div>
                    <div><label style={s.label}>Duración</label><input style={s.input} value={it.duracion} onChange={e=>updateItem(i,'duracion',e.target.value)} placeholder="5 días" /></div>
                  </div>
                  {items.length>1 && <button type="button" style={s.btnRemove} onClick={()=>removeItem(i)}>Eliminar</button>}
                </div>
              ))}
              <button type="button" style={s.btnSec} onClick={addItem}>+ Agregar medicamento</button>
              {error && <div style={s.error}>{error}</div>}
              <div style={s.btnRow}>
                <button type="button" style={s.btnSec} onClick={()=>setStep(2)}>← Atrás</button>
                <button type="submit" style={s.btnPrimary} disabled={loading}>{loading?'Generando...':'Generar receta →'}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* STEP 4 — Finalizado */}
      {step===4 && (
        <div style={{ ...s.card, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:'1rem' }}>✅</div>
          <h3 style={{ color:'#fff', fontFamily:"'DM Serif Display',serif" }}>Consulta registrada</h3>
          <p style={{ color:'rgba(255,255,255,0.5)' }}>Paciente: <strong style={{color:'#fff'}}>{pacSel?.nombre} {pacSel?.apellido}</strong></p>
          {recetaCodigo && (
            <div style={s.codigoBadge}>
              <p style={{ color:'rgba(255,255,255,0.5)', margin:'0 0 6px', fontSize:'0.8rem' }}>Código de receta</p>
              <span style={{ color:'#4ade80', fontSize:'1.8rem', fontWeight:700, letterSpacing:'0.1em' }}>{recetaCodigo}</span>
              <p style={{ color:'rgba(255,255,255,0.4)', margin:'6px 0 0', fontSize:'0.78rem' }}>Entrega este código al farmacéutico</p>
            </div>
          )}
          <button style={{ ...s.btnPrimary, marginTop:'1.5rem' }}
            onClick={()=>{ setStep(1);setPacSel(null);setHistoriaId(null);setRecetaCodigo('');setItems([{nombre_medicamento:'',medicamento_id:null,dosis:'',frecuencia:'',duracion:'',cantidad:1}]);setHistoria({motivo_consulta:'',anamnesis:'',examen_fisico:'',diagnostico:'',plan_tratamiento:'',observaciones:''}); }}>
            Nueva consulta
          </button>
        </div>
      )}
    </div>
  );
}

function Area({ label, value, onChange, required }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <textarea style={{ ...s.input, height:70, resize:'vertical', display:'block' }}
        value={value} onChange={e=>onChange(e.target.value)} required={required} />
    </div>
  );
}

const s = {
  page: { padding:'2rem', color:'rgba(255,255,255,0.8)', fontFamily:"'DM Sans',sans-serif" },
  title: { color:'#fff', fontSize:'1.6rem', margin:'0 0 1.5rem', fontFamily:"'DM Serif Display',serif" },
  steps: { display:'flex', gap:0, marginBottom:'2rem' },
  step: { display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:20, color:'rgba(255,255,255,0.35)', fontSize:'0.82rem', border:'1px solid transparent' },
  stepActive: { background:'rgba(30,107,138,0.2)', color:'#4fb3d9', border:'1px solid rgba(30,107,138,0.4)' },
  stepDone: { color:'#4ade80' },
  stepNum: { width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700 },
  card: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'1.5rem', maxWidth:700 },
  cardTitle: { color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'1.2rem', margin:'0 0 1.2rem' },
  pacList: { display:'flex', flexDirection:'column', gap:6, maxHeight:300, overflowY:'auto', margin:'0.5rem 0 1rem' },
  pacItem: { padding:'10px 14px', borderRadius:10, border:'1.5px solid rgba(255,255,255,0.07)', cursor:'pointer', display:'flex', flexDirection:'column', gap:2, background:'rgba(255,255,255,0.02)' },
  pacItemSel: { borderColor:'#1e6b8a', background:'rgba(30,107,138,0.15)' },
  input: { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'9px 12px', color:'#fff', fontSize:'0.88rem', outline:'none', fontFamily:'inherit', marginTop:0 },
  label: { display:'block', color:'rgba(255,255,255,0.5)', fontSize:'0.78rem', fontWeight:500, marginBottom:4, marginTop:10 },
  btnPrimary: { background:'#1e6b8a', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:'0.9rem' },
  btnSec: { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontFamily:'inherit' },
  btnRemove: { background:'rgba(220,50,50,0.15)', color:'#f87171', border:'1px solid rgba(220,50,50,0.2)', borderRadius:8, padding:'4px 10px', cursor:'pointer', fontFamily:'inherit', fontSize:'0.78rem', marginTop:8 },
  btnRow: { display:'flex', gap:10, justifyContent:'flex-end', marginTop:'1.2rem' },
  itemBox: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'12px', marginBottom:10 },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  grid3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 },
  error: { background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)', borderRadius:8, padding:'9px 14px', color:'#ff8080', fontSize:'0.83rem', margin:'0.8rem 0' },
  codigoBadge: { background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:12, padding:'1rem', margin:'1rem auto', maxWidth:280 },
};
