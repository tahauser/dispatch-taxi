import { useState, useRef, useEffect } from 'react';
import api from './api';
import { redimensionner } from './imagePhoto';

export const LIB_STATUT = { a_faire:'À faire', en_route:'En route', arrive:'Arrivé', a_bord:'Client à bord', termine:'Terminé', no_show:'Client absent' };
export const COUL_STATUT = { a_faire:'#9E9E9E', en_route:'#1976D2', arrive:'#F57C00', a_bord:'#7B1FA2', termine:'#2E7D32', no_show:'#C62828' };
const SUIVANT = { a_faire:['en_route','🚗 Je suis en route'], en_route:['arrive','📍 Je suis arrivé'], arrive:['a_bord','🧍 Client à bord'], a_bord:['termine','✅ Course terminée'] };

export function BadgeStatut({ statut }) {
  const s = statut || 'a_faire';
  return <span style={{ background:COUL_STATUT[s], color:'white', borderRadius:'10px', padding:'2px 8px', fontSize:'11px', fontWeight:600 }}>{LIB_STATUT[s]}</span>;
}
const hhmm = t => t ? new Date(t).toLocaleTimeString('fr-CA', { hour:'2-digit', minute:'2-digit', timeZone:'America/Toronto' }) : null;

function Signature({ onChange }) {
  const ref = useRef(); const dessin = useRef(false);
  const pos = e => { const r = ref.current.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return [p.clientX - r.left, p.clientY - r.top]; };
  useEffect(() => { const c = ref.current.getContext('2d'); c.lineWidth = 2; c.lineCap = 'round'; c.strokeStyle = '#000'; }, []);
  const start = e => { e.preventDefault(); dessin.current = true; const c = ref.current.getContext('2d'); c.beginPath(); c.moveTo(...pos(e)); };
  const move = e => { if (!dessin.current) return; e.preventDefault(); const c = ref.current.getContext('2d'); c.lineTo(...pos(e)); c.stroke(); };
  const stop = () => { if (!dessin.current) return; dessin.current = false; onChange(ref.current.toDataURL('image/png')); };
  return (
    <div>
      <canvas ref={ref} width={300} height={110}
        onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
        style={{ border:'1px dashed #999', borderRadius:'6px', background:'#fff', touchAction:'none', maxWidth:'100%' }} />
      <button type="button" onClick={() => { const c = ref.current; c.getContext('2d').clearRect(0,0,c.width,c.height); onChange(null); }}
        style={{ display:'block', marginTop:'4px', fontSize:'12px', background:'none', border:'none', color:'#1F4E79', cursor:'pointer' }}>Effacer</button>
    </div>
  );
}

// Boutons d'étape + preuve facultative (chauffeur). `a` = affectation, `onMaj(a)` après changement.
export default function EtapesCourse({ a, onMaj, aujourdhui }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [preuve, setPreuve] = useState(false);
  const [sig, setSig] = useState(null);
  const [photo, setPhoto] = useState(null);
  const statut = a.statut_course || 'a_faire';
  const suivant = SUIVANT[statut];

  async function envoyer(etape) {
    setBusy(true); setErr('');
    let lat = null, lng = null;
    try {
      const p = await new Promise((ok, ko) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(ok, ko, { timeout: 4000, maximumAge: 30000 }) : ko());
      lat = p.coords.latitude; lng = p.coords.longitude;
    } catch { /* position facultative */ }
    try {
      const body = { etape, lat, lng };
      if (etape === 'termine') { if (sig) body.signature = sig; if (photo) body.photo = photo; }
      const r = await api.post(`/affectations/${a.id}/etape`, body);
      onMaj({ ...a, ...r.data }); setPreuve(false); setSig(null); setPhoto(null);
    } catch (e) { setErr(e.response?.data?.message || 'Erreur réseau'); }
    setBusy(false);
  }
  async function choisirPhoto(e) {
    const f = e.target.files?.[0]; if (!f) return;
    try { setPhoto(await redimensionner(f, 800, 0.6)); } catch { setErr('Photo illisible'); }
  }
  const btn = (bg) => ({ width:'100%', padding:'12px', border:'none', borderRadius:'8px', background:bg, color:'white', fontSize:'15px', fontWeight:700, cursor:'pointer', opacity:busy?0.6:1 });
  const stop = e => e.stopPropagation();

  return (
    <div onClick={stop} style={{ marginTop:'10px', paddingTop:'10px', borderTop:'1px solid #f0f0f0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
        <BadgeStatut statut={statut} />
        <span style={{ fontSize:'11px', color:'#777' }}>
          {[a.t_en_route && `route ${hhmm(a.t_en_route)}`, a.t_arrive && `arrivé ${hhmm(a.t_arrive)}`, a.t_a_bord && `à bord ${hhmm(a.t_a_bord)}`, a.t_termine && `fin ${hhmm(a.t_termine)}`].filter(Boolean).join(' · ')}
        </span>
      </div>
      {aujourdhui && suivant && (
        <>
          {suivant[0] === 'termine' && preuve && (
            <div style={{ marginBottom:'8px' }}>
              <div style={{ fontSize:'12px', color:'#555', marginBottom:'4px' }}>Signature du client (facultatif)</div>
              <Signature onChange={setSig} />
              <label style={{ display:'inline-block', marginTop:'6px', fontSize:'13px', color:'#1F4E79', cursor:'pointer' }}>
                📷 {photo ? 'Photo ajoutée ✓' : 'Ajouter une photo (facultatif)'}
                <input type="file" accept="image/*" capture="environment" onChange={choisirPhoto} style={{ display:'none' }} />
              </label>
            </div>
          )}
          {suivant[0] === 'termine' && !preuve && (
            <button type="button" onClick={() => setPreuve(true)} style={{ background:'none', border:'none', color:'#1F4E79', fontSize:'13px', cursor:'pointer', marginBottom:'6px' }}>＋ Signature / photo (facultatif)</button>
          )}
          <button disabled={busy} onClick={() => envoyer(suivant[0])} style={btn(COUL_STATUT[suivant[0]])}>{suivant[1]}</button>
          {(statut === 'arrive' || statut === 'en_route') && (
            <button disabled={busy} onClick={() => envoyer('no_show')} style={{ ...btn('#fff'), color:'#C62828', border:'1px solid #C62828', marginTop:'6px', fontSize:'13px' }}>Client absent</button>
          )}
        </>
      )}
      {err && <div style={{ color:'#C62828', fontSize:'12px', marginTop:'6px' }}>{err}</div>}
    </div>
  );
}

// Fenêtre de consultation de la preuve de service (dispatch)
export function PreuveModal({ id, onClose }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/affectations/${id}/preuve`).then(r => setD(r.data)).catch(() => setD(false)); }, [id]);
  const ligne = (l, t) => <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #f3f3f3' }}><span style={{ color:'#666' }}>{l}</span><b>{t ? hhmm(t) : '—'}</b></div>;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'10px', padding:'20px', width:'380px', maxWidth:'92vw', maxHeight:'90vh', overflow:'auto', fontSize:'14px' }}>
        {d === null ? 'Chargement…' : d === false ? 'Erreur de chargement' : (<>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
            <b>{d.code_trajet} — {d.prenom} {d.nom}</b><BadgeStatut statut={d.statut_course} />
          </div>
          {ligne('En route', d.t_en_route)}{ligne('Arrivé', d.t_arrive)}{ligne('Client à bord', d.t_a_bord)}{ligne('Terminé', d.t_termine)}
          {d.note_course && <p style={{ fontStyle:'italic' }}>{d.note_course}</p>}
          {d.preuve_signature && <div style={{ marginTop:'10px' }}><div style={{ fontSize:'12px', color:'#666' }}>Signature</div><img src={d.preuve_signature} alt="signature" style={{ border:'1px solid #ddd', maxWidth:'100%' }} /></div>}
          {d.preuve_photo && <div style={{ marginTop:'10px' }}><div style={{ fontSize:'12px', color:'#666' }}>Photo</div><img src={d.preuve_photo} alt="preuve" style={{ maxWidth:'100%', borderRadius:'6px' }} /></div>}
          {!d.preuve_signature && !d.preuve_photo && <div style={{ color:'#999', marginTop:'8px', fontSize:'13px' }}>Aucune signature ni photo.</div>}
        </>)}
        <button onClick={onClose} style={{ marginTop:'14px', width:'100%', padding:'8px', border:'1px solid #ccc', background:'white', borderRadius:'6px', cursor:'pointer' }}>Fermer</button>
      </div>
    </div>
  );
}
