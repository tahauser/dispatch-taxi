import { useState, useEffect } from 'react';
import api from './api';

const BLEU = '#1F4E79';
const TYPES = { carburant:'⛽ Carburant', entretien:'🔧 Entretien', reparation:'🛠️ Réparation', autre:'Autre' };
const champ = { padding:'6px 8px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'13px' };
const $ = n => (n || 0).toLocaleString('fr-CA', { style:'currency', currency:'CAD' });
const auj = () => new Date().toLocaleDateString('en-CA', { timeZone:'America/Toronto' });
const debutPeriode = p => {
  const d = new Date(auj() + 'T12:00:00');
  if (p === 'mois') d.setDate(1); else if (p === '3m') d.setMonth(d.getMonth() - 3); else if (p === 'an') { d.setMonth(0); d.setDate(1); } else return '';
  return d.toLocaleDateString('en-CA');
};

export default function CoutsVehicules() {
  const [periode, setPeriode] = useState('mois');
  const [synth, setSynth] = useState([]);
  const [detail, setDetail] = useState(null);   // véhicule sélectionné
  const [lignes, setLignes] = useState([]);
  const [f, setF] = useState({ vehicule_id:'', date_cout:auj(), type:'carburant', montant:'', litres:'', kilometrage:'', fournisseur:'', description:'' });
  const [msg, setMsg] = useState(null);

  const du = debutPeriode(periode);
  async function charger() {
    const q = du ? `?du=${du}&au=${auj()}` : '';
    setSynth((await api.get('/couts/synthese' + q)).data);
    if (detail) setLignes((await api.get(`/couts?vehicule_id=${detail.id}` + (du ? `&du=${du}&au=${auj()}` : ''))).data);
  }
  useEffect(() => { charger().catch(() => setMsg({ ko:true, t:'Erreur de chargement' })); }, [periode, detail]);

  async function ajouter() {
    setMsg(null);
    try {
      await api.post('/couts', f);
      setMsg({ t:'Dépense enregistrée' }); setF({ ...f, montant:'', litres:'', description:'' }); charger();
    } catch (e) { setMsg({ ko:true, t:e.response?.data?.message || 'Erreur' }); }
  }
  async function supprimer(id) { if (window.confirm('Supprimer cette dépense ?')) { await api.delete(`/couts/${id}`); charger(); } }

  const total = synth.reduce((s, v) => s + v.total, 0);
  const th = h => <th key={h} style={{ padding:'9px 10px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>;
  return (
    <div>
      <div style={{ display:'flex', gap:'6px', alignItems:'center', marginBottom:'12px', flexWrap:'wrap' }}>
        <b style={{ color:BLEU }}>Coût par véhicule</b>
        {[['mois','Ce mois'],['3m','3 mois'],['an','Cette année'],['tout','Tout']].map(([k,l]) => (
          <button key={k} onClick={() => setPeriode(k)} style={{ ...champ, cursor:'pointer', background:periode===k?BLEU:'white', color:periode===k?'white':'#555' }}>{l}</button>))}
        <span style={{ marginLeft:'auto', fontWeight:600 }}>Total flotte : {$(total)}</span>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', background:'#f5f8fb', padding:'10px', borderRadius:'8px', marginBottom:'14px', alignItems:'center' }}>
        <select value={f.vehicule_id} onChange={e => setF({ ...f, vehicule_id:e.target.value })} style={champ}>
          <option value="">Véhicule…</option>{synth.map(v => <option key={v.id} value={v.id}>{v.numero_unite} — {v.immatriculation}</option>)}
        </select>
        <input type="date" value={f.date_cout} onChange={e => setF({ ...f, date_cout:e.target.value })} style={champ} />
        <select value={f.type} onChange={e => setF({ ...f, type:e.target.value })} style={champ}>{Object.entries(TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input type="number" step="0.01" min="0" placeholder="Montant $" value={f.montant} onChange={e => setF({ ...f, montant:e.target.value })} style={{ ...champ, width:'95px' }} />
        {f.type === 'carburant' && <input type="number" step="0.01" min="0" placeholder="Litres" value={f.litres} onChange={e => setF({ ...f, litres:e.target.value })} style={{ ...champ, width:'80px' }} />}
        <input type="number" min="0" placeholder="Km compteur" value={f.kilometrage} onChange={e => setF({ ...f, kilometrage:e.target.value })} style={{ ...champ, width:'105px' }} />
        <input placeholder="Fournisseur" value={f.fournisseur} onChange={e => setF({ ...f, fournisseur:e.target.value })} style={{ ...champ, width:'120px' }} />
        <input placeholder="Description" value={f.description} onChange={e => setF({ ...f, description:e.target.value })} style={{ ...champ, flex:1, minWidth:'120px' }} />
        <button onClick={ajouter} style={{ ...champ, background:BLEU, color:'white', border:'none', cursor:'pointer', fontWeight:600 }}>Ajouter</button>
      </div>
      {msg && <div style={{ fontSize:'13px', marginBottom:'8px', color:msg.ko?'#C62828':'#2E7D32' }}>{msg.t}</div>}

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
          <thead><tr style={{ background:BLEU, color:'white' }}>{['Véhicule','Carburant','Entretien','Réparation','Autre','Total','Km (période)','$/km','L/100 km'].map(th)}</tr></thead>
          <tbody>
            {synth.map((v, i) => (
              <tr key={v.id} onClick={() => setDetail(detail?.id === v.id ? null : v)} style={{ cursor:'pointer', background:detail?.id===v.id?'#E3F2FD':i%2?'white':'#fafafa', borderBottom:'1px solid #eee' }}>
                <td style={{ padding:'8px 10px', fontWeight:600, color:BLEU }}>{v.numero_unite} <span style={{ color:'#888', fontWeight:400 }}>{v.marque} {v.modele}</span></td>
                <td style={{ padding:'8px 10px' }}>{$(v.carburant)}</td><td style={{ padding:'8px 10px' }}>{$(v.entretien)}</td>
                <td style={{ padding:'8px 10px' }}>{$(v.reparation)}</td><td style={{ padding:'8px 10px' }}>{$(v.autre)}</td>
                <td style={{ padding:'8px 10px', fontWeight:700 }}>{$(v.total)}</td>
                <td style={{ padding:'8px 10px' }}>{v.km_periode ?? '—'}</td>
                <td style={{ padding:'8px 10px' }}>{v.cout_km !== null ? v.cout_km.toFixed(2) : '—'}</td>
                <td style={{ padding:'8px 10px' }}>{v.l_100km ?? '—'}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize:'12px', color:'#888', marginTop:'6px' }}>Les km de la période sont l'écart entre le premier et le dernier kilométrage saisi ; il en faut au moins deux pour calculer le $/km. Cliquez sur un véhicule pour voir ses dépenses.</div>

      {detail && (
        <div style={{ marginTop:'14px' }}>
          <b style={{ color:BLEU }}>Dépenses — {detail.numero_unite}</b>
          {lignes.length === 0 ? <div style={{ color:'#999', padding:'10px' }}>Aucune dépense sur la période</div> : lignes.map(l => (
            <div key={l.id} style={{ display:'flex', gap:'10px', padding:'6px 0', borderBottom:'1px solid #eee', fontSize:'13px', alignItems:'center' }}>
              <span style={{ width:'90px' }}>{l.date_cout}</span><span style={{ width:'110px' }}>{TYPES[l.type]}</span>
              <b style={{ width:'90px' }}>{$(l.montant)}</b><span style={{ width:'70px', color:'#666' }}>{l.litres ? l.litres + ' L' : ''}</span>
              <span style={{ width:'90px', color:'#666' }}>{l.kilometrage ? l.kilometrage + ' km' : ''}</span>
              <span style={{ flex:1, color:'#555' }}>{[l.fournisseur, l.description].filter(Boolean).join(' — ')}</span>
              <button onClick={() => supprimer(l.id)} style={{ border:'none', background:'none', color:'#C62828', cursor:'pointer' }}>✕</button>
            </div>))}
        </div>)}
    </div>
  );
}
