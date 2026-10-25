import { useState, useEffect } from 'react';
import api from './api';
import Avatar from './Avatar';

const BLEU = '#1F4E79';
const TYPES = { conge:'🏖️ Congé', maladie:'🤒 Maladie', formation:'🎓 Formation', autre:'Autre' };
const aujStr = () => new Date().toLocaleDateString('en-CA', { timeZone:'America/Toronto' });
const fmtD = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-CA', { day:'numeric', month:'short', year:'numeric' });

export default function GestionAbsences() {
  const [liste, setListe] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [f, setF] = useState({ chauffeur_id:'', type:'conge', date_debut:aujStr(), date_fin:aujStr(), note:'' });
  const [msg, setMsg] = useState(null);
  const [passees, setPassees] = useState(false);

  async function charger() {
    const r = await api.get('/absences' + (passees ? '' : `?du=${aujStr()}`));
    setListe(r.data);
  }
  useEffect(() => { charger().catch(() => {}); }, [passees]);
  useEffect(() => { api.get('/chauffeurs').then(r => setChauffeurs(r.data.filter(c => c.role === 'chauffeur' || !c.role))).catch(() => {}); }, []);

  async function ajouter(retirer = false) {
    setMsg(null);
    if (!f.chauffeur_id) return setMsg({ ko:true, t:'Choisissez un chauffeur' });
    try {
      await api.post('/absences', { ...f, retirer_affectations: retirer });
      setMsg({ t:'Absence enregistrée' }); setF({ ...f, note:'' }); charger();
    } catch (e) {
      const d = e.response?.data;
      if (d?.code === 'AFFECTATIONS') {
        if (window.confirm(`${d.message}.\nLes retirer du programme (les courses déjà démarrées sont conservées) et enregistrer l'absence ?`)) return ajouter(true);
      } else setMsg({ ko:true, t:d?.message || 'Erreur' });
    }
  }
  async function supprimer(id) {
    if (!window.confirm('Supprimer cette absence ?')) return;
    await api.delete(`/absences/${id}`); charger();
  }
  const champ = { padding:'8px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'14px' };
  const auj = aujStr();

  return (
    <div style={{ padding:'20px' }}>
      <h3 style={{ margin:'0 0 12px', color:BLEU }}>Absences et indisponibilités planifiées</h3>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center', background:'#f5f8fb', padding:'12px', borderRadius:'8px', marginBottom:'16px' }}>
        <select value={f.chauffeur_id} onChange={e => setF({ ...f, chauffeur_id:e.target.value })} style={champ}>
          <option value="">Chauffeur…</option>
          {chauffeurs.filter(c => c.actif !== false).map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom} ({c.numero_chauffeur})</option>)}
        </select>
        <select value={f.type} onChange={e => setF({ ...f, type:e.target.value })} style={champ}>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={f.date_debut} onChange={e => setF({ ...f, date_debut:e.target.value, date_fin: e.target.value > f.date_fin ? e.target.value : f.date_fin })} style={champ} />
        <span>→</span>
        <input type="date" value={f.date_fin} min={f.date_debut} onChange={e => setF({ ...f, date_fin:e.target.value })} style={champ} />
        <input placeholder="Note (facultatif)" value={f.note} onChange={e => setF({ ...f, note:e.target.value })} style={{ ...champ, flex:1, minWidth:'140px' }} />
        <button onClick={() => ajouter()} style={{ padding:'8px 16px', background:BLEU, color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:600 }}>Ajouter</button>
      </div>
      {msg && <div style={{ marginBottom:'10px', color: msg.ko ? '#C62828' : '#2E7D32', fontSize:'14px' }}>{msg.t}</div>}
      <label style={{ fontSize:'13px', color:'#555' }}><input type="checkbox" checked={passees} onChange={e => setPassees(e.target.checked)} /> Afficher aussi les absences passées</label>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px', marginTop:'10px' }}>
        <thead><tr style={{ background:BLEU, color:'white' }}>{['Chauffeur','Type','Du','Au','Note',''].map(h => <th key={h} style={{ padding:'10px 12px', textAlign:'left' }}>{h}</th>)}</tr></thead>
        <tbody>
          {liste.length === 0 && <tr><td colSpan="6" style={{ padding:'30px', textAlign:'center', color:'#999' }}>Aucune absence à venir</td></tr>}
          {liste.map((a, i) => {
            const encours = a.date_debut <= auj && a.date_fin >= auj;
            return (
              <tr key={a.id} style={{ background: encours ? '#fff8e1' : i % 2 ? 'white' : '#fafafa', borderBottom:'1px solid #eee', opacity: a.date_fin < auj ? 0.55 : 1 }}>
                <td style={{ padding:'10px 12px' }}><span style={{ display:'inline-flex', alignItems:'center', gap:'8px' }}><Avatar ch={{ ...a, id:a.chauffeur_id }} size={28} />{a.prenom} {a.nom}</span></td>
                <td style={{ padding:'10px 12px' }}>{TYPES[a.type] || a.type}{encours && <b style={{ marginLeft:6, color:'#F57C00', fontSize:12 }}>en cours</b>}</td>
                <td style={{ padding:'10px 12px' }}>{fmtD(a.date_debut)}</td>
                <td style={{ padding:'10px 12px' }}>{fmtD(a.date_fin)}</td>
                <td style={{ padding:'10px 12px', color:'#666' }}>{a.note || '—'}</td>
                <td style={{ padding:'10px 12px' }}><button onClick={() => supprimer(a.id)} style={{ border:'1px solid #C62828', color:'#C62828', background:'white', borderRadius:'6px', cursor:'pointer', padding:'4px 10px' }}>Supprimer</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
