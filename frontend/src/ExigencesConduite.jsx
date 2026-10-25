import { useState, useEffect, Fragment } from 'react';
import api from './api';
import Avatar from './Avatar';
import { CATEGORIES_PERMIS } from './imagePhoto';

const BLEU = '#1F4E79';
const champ = { padding:'6px 8px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'13px' };

export default function ExigencesConduite() {
  const [exig, setExig] = useState([]);
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [fm, setFm] = useState({});            // formulaire formation par chauffeur
  const [ouvert, setOuvert] = useState(null);

  async function charger() {
    const [a, b] = await Promise.all([api.get('/conduite/exigences'), api.get('/conduite/conformite')]);
    setExig(a.data); setData(b.data);
  }
  useEffect(() => { charger().catch(() => setMsg('Erreur de chargement')); }, []);

  async function enregistrer(e) {
    try { await api.put(`/conduite/exigences/${e.type_vehicule}`, { categories:e.categories, formation:e.formation }); setMsg(`Exigences ${e.type_vehicule} enregistrées`); await charger(); }
    catch { setMsg('Erreur'); }
  }
  const basculer = (e, cat) => {
    const l = e.categories.split(',').filter(Boolean);
    const n = l.includes(cat) ? l.filter(x => x !== cat) : [...l, cat];
    setExig(exig.map(x => x.type_vehicule === e.type_vehicule ? { ...x, categories:n.join(',') } : x));
  };
  async function ajouterFormation(c) {
    const f = fm[c.id] || {};
    if (!f.nom) return;
    try { await api.post('/conduite/formations', { chauffeur_id:c.id, nom:f.nom, date_obtention:f.obt || null, date_expiration:f.exp || null }); setFm({ ...fm, [c.id]:{} }); charger(); }
    catch (e) { setMsg(e.response?.data?.message || 'Erreur'); }
  }
  async function supprimerFormation(id) { await api.delete(`/conduite/formations/${id}`); charger(); }
  async function majPermis(c, v) { await api.put(`/conduite/chauffeurs/${c.id}/permis`, { permis_expiration:v || null }); charger(); }

  const nbPb = data ? data.chauffeurs.filter(c => c.problemes.length).length : 0;
  return (
    <div>
      <h3 style={{ margin:'0 0 6px', color:BLEU }}>Exigences de conduite par type de véhicule</h3>
      <p style={{ fontSize:'13px', color:'#666', margin:'0 0 12px' }}>Un chauffeur doit avoir au moins une des classes cochées, un permis non expiré et la formation requise. Sans classe cochée, aucune exigence n'est appliquée. Le contrôle s'applique à l'affectation véhicule, à la proposition et à l'optimisation des courses.</p>
      <div style={{ display:'grid', gap:'10px', marginBottom:'18px' }}>
        {exig.map(e => (
          <div key={e.type_vehicule} style={{ border:'1px solid #e0e0e0', borderRadius:'8px', padding:'10px 12px', display:'flex', flexWrap:'wrap', gap:'10px', alignItems:'center' }}>
            <b style={{ width:'90px', color:BLEU }}>{e.type_vehicule}</b>
            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
              {CATEGORIES_PERMIS.map(c => {
                const on = e.categories.split(',').includes(c);
                return <button key={c} type="button" onClick={() => basculer(e, c)} style={{ padding:'3px 9px', borderRadius:'12px', cursor:'pointer', fontSize:'12px', border:'1px solid '+(on?BLEU:'#ccc'), background:on?BLEU:'white', color:on?'white':'#555' }}>{c}</button>;
              })}
            </div>
            <input placeholder="Formation requise (ex. Secourisme)" value={e.formation} onChange={ev => setExig(exig.map(x => x.type_vehicule === e.type_vehicule ? { ...x, formation:ev.target.value } : x))} style={{ ...champ, flex:1, minWidth:'180px' }} />
            <button onClick={() => enregistrer(e)} style={{ padding:'6px 14px', background:BLEU, color:'white', border:'none', borderRadius:'6px', cursor:'pointer' }}>Enregistrer</button>
          </div>
        ))}
      </div>
      {msg && <div style={{ fontSize:'13px', color:'#2E7D32', marginBottom:'8px' }}>{msg}</div>}

      <h3 style={{ margin:'0 0 8px', color:BLEU }}>Conformité des chauffeurs {data && <span style={{ fontSize:'13px', color: nbPb ? '#C62828' : '#2E7D32', fontWeight:500 }}>— {nbPb ? `${nbPb} non conforme(s)` : 'tous conformes'}</span>}</h3>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
        <thead><tr style={{ background:BLEU, color:'white' }}>{['Chauffeur','Type','Classes','Permis expire le','État',''].map(h => <th key={h} style={{ padding:'9px 10px', textAlign:'left' }}>{h}</th>)}</tr></thead>
        <tbody>
          {data?.chauffeurs.map((c, i) => (
            <Fragment key={c.id}>
              <tr style={{ background:i%2?'white':'#fafafa', borderBottom:'1px solid #eee' }}>
                <td style={{ padding:'8px 10px' }}><span style={{ display:'inline-flex', alignItems:'center', gap:'8px' }}><Avatar ch={c} size={28} />{c.prenom} {c.nom}</span></td>
                <td style={{ padding:'8px 10px' }}>{c.type_vehicule}</td>
                <td style={{ padding:'8px 10px' }}>{c.categories_permis || '—'}</td>
                <td style={{ padding:'8px 10px' }}><input type="date" defaultValue={c.permis_expiration || ''} onBlur={ev => ev.target.value !== (c.permis_expiration || '') && majPermis(c, ev.target.value)} style={champ} /></td>
                <td style={{ padding:'8px 10px' }}>{c.problemes.length === 0 ? <span style={{ color:'#2E7D32' }}>✓ Apte</span> : <span style={{ color:'#C62828' }} title={c.problemes.join('\n')}>⚠ {c.problemes[0]}{c.problemes.length > 1 ? ` (+${c.problemes.length-1})` : ''}</span>}</td>
                <td style={{ padding:'8px 10px' }}><button onClick={() => setOuvert(ouvert === c.id ? null : c.id)} style={{ ...champ, cursor:'pointer', background:'white' }}>Formations ({c.formations.length})</button></td>
              </tr>
              {ouvert === c.id && (
                <tr key={c.id+"f"} style={{ background:'#f5f8fb' }}><td colSpan="6" style={{ padding:'10px 14px' }}>
                  {c.formations.map(f => <div key={f.id || f.nom} style={{ marginBottom:'4px' }}>🎓 {f.nom} {f.date_obtention && `· obtenue ${f.date_obtention}`} {f.date_expiration && `· expire ${f.date_expiration}`}</div>)}
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'6px' }}>
                    <input placeholder="Nom" value={fm[c.id]?.nom || ''} onChange={ev => setFm({ ...fm, [c.id]:{ ...fm[c.id], nom:ev.target.value } })} style={champ} />
                    <input type="date" title="Obtenue le" value={fm[c.id]?.obt || ''} onChange={ev => setFm({ ...fm, [c.id]:{ ...fm[c.id], obt:ev.target.value } })} style={champ} />
                    <input type="date" title="Expire le" value={fm[c.id]?.exp || ''} onChange={ev => setFm({ ...fm, [c.id]:{ ...fm[c.id], exp:ev.target.value } })} style={champ} />
                    <button onClick={() => ajouterFormation(c)} style={{ ...champ, background:BLEU, color:'white', border:'none', cursor:'pointer' }}>Ajouter</button>
                  </div>
                </td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
