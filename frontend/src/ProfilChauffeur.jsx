import { useState, useEffect } from 'react';
import api from './api';

const BLEU = '#1F4E79';
const input = { width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'14px', boxSizing:'border-box' };
const label = { display:'block', marginBottom:'6px', color:'#333', fontWeight:500, fontSize:'13px' };
const CATEGORIES = ['4A', '4B', '4C', '5', '6A', '6B', '6C', '6D', '6E', '8'];

function Msg({ m }) {
  if (!m) return null;
  const ok = m.type === 'ok';
  return <div style={{ background: ok ? '#e8f5e9' : '#ffebee', color: ok ? '#2e7d32' : '#c62828',
    padding:'10px', borderRadius:'6px', margin:'12px 0', fontSize:'14px' }}>{m.text}</div>;
}

export default function ProfilChauffeur({ user }) {
  const [f, setF] = useState({ telephone:'', adresse_domicile:'', date_naissance:'', numero_permis:'', categories:[] });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mdp, setMdp] = useState({ ancien:'', nouveau:'', confirm:'' });
  const [msgMdp, setMsgMdp] = useState(null);

  useEffect(() => {
    api.get('/auth/me').then(r => {
      const d = r.data;
      setF({
        telephone: d.telephone || '',
        adresse_domicile: d.adresse_domicile || '',
        date_naissance: d.date_naissance ? String(d.date_naissance).substring(0, 10) : '',
        numero_permis: d.numero_permis || '',
        categories: d.categories_permis ? d.categories_permis.split(',').map(x => x.trim()).filter(Boolean) : [],
      });
    }).catch(() => setMsg({ type:'err', text:'Impossible de charger la fiche' }));
  }, []);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleCat = c => setF(p => ({ ...p, categories: p.categories.includes(c) ? p.categories.filter(x => x !== c) : [...p.categories, c] }));

  async function sauver(e) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      await api.put('/auth/profil', {
        telephone: f.telephone, adresse_domicile: f.adresse_domicile, date_naissance: f.date_naissance,
        numero_permis: f.numero_permis, categories_permis: f.categories.join(','),
      });
      setMsg({ type:'ok', text:'Fiche enregistrée' });
    } catch (err) {
      setMsg({ type:'err', text: err.response?.data?.message || 'Erreur' });
    } finally { setSaving(false); }
  }

  async function changerMdp(e) {
    e.preventDefault();
    setMsgMdp(null);
    if (mdp.nouveau.length < 8) return setMsgMdp({ type:'err', text:'Minimum 8 caractères' });
    if (mdp.nouveau !== mdp.confirm) return setMsgMdp({ type:'err', text:'Les mots de passe ne correspondent pas' });
    try {
      await api.put('/auth/mot-de-passe', { ancien_mdp: mdp.ancien, nouveau_mdp: mdp.nouveau });
      setMdp({ ancien:'', nouveau:'', confirm:'' });
      setMsgMdp({ type:'ok', text:'Mot de passe modifié' });
    } catch (err) {
      setMsgMdp({ type:'err', text: err.response?.data?.message || 'Erreur' });
    }
  }

  const carte = { background:'white', borderRadius:'10px', padding:'20px', marginBottom:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' };
  const btn = { padding:'10px 20px', background:BLEU, color:'white', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:600, cursor:'pointer' };

  return (
    <div style={{ maxWidth:'640px' }}>
      <form onSubmit={sauver} style={carte}>
        <h2 style={{ color:BLEU, fontSize:'18px', margin:'0 0 4px' }}>Ma fiche chauffeur</h2>
        <div style={{ color:'#666', fontSize:'13px', marginBottom:'16px' }}>
          {user.prenom} {user.nom} · N° {user.numero_chauffeur}
        </div>
        <div style={{ display:'grid', gap:'14px' }}>
          <div><label style={label}>Téléphone</label>
            <input type="tel" value={f.telephone} onChange={e => set('telephone', e.target.value)} style={input} /></div>
          <div><label style={label}>Adresse du domicile</label>
            <input value={f.adresse_domicile} onChange={e => set('adresse_domicile', e.target.value)} style={input}
              placeholder="No, rue, ville, code postal" /></div>
          <div><label style={label}>Date de naissance</label>
            <input type="date" value={f.date_naissance} onChange={e => set('date_naissance', e.target.value)} style={input} /></div>
          <div><label style={label}>Numéro de permis de conduire</label>
            <input value={f.numero_permis} onChange={e => set('numero_permis', e.target.value)} style={input} /></div>
          <div><label style={label}>Catégories du permis</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {CATEGORIES.map(c => (
                <label key={c} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'6px 10px',
                  border:`1px solid ${f.categories.includes(c) ? BLEU : '#ddd'}`, borderRadius:'6px', cursor:'pointer',
                  background: f.categories.includes(c) ? '#e3edf7' : 'white', fontSize:'13px' }}>
                  <input type="checkbox" checked={f.categories.includes(c)} onChange={() => toggleCat(c)} />{c}
                </label>
              ))}
            </div></div>
        </div>
        <Msg m={msg} />
        <button type="submit" disabled={saving} style={{ ...btn, marginTop:'8px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Enregistrement...' : 'Enregistrer ma fiche'}
        </button>
      </form>

      <form onSubmit={changerMdp} style={carte}>
        <h2 style={{ color:BLEU, fontSize:'18px', margin:'0 0 16px' }}>Changer mon mot de passe</h2>
        <div style={{ display:'grid', gap:'14px' }}>
          <div><label style={label}>Mot de passe actuel</label>
            <input type="password" value={mdp.ancien} onChange={e => setMdp(p => ({ ...p, ancien: e.target.value }))} required style={input} /></div>
          <div><label style={label}>Nouveau mot de passe (8 caractères min.)</label>
            <input type="password" value={mdp.nouveau} onChange={e => setMdp(p => ({ ...p, nouveau: e.target.value }))} required style={input} /></div>
          <div><label style={label}>Confirmer le nouveau mot de passe</label>
            <input type="password" value={mdp.confirm} onChange={e => setMdp(p => ({ ...p, confirm: e.target.value }))} required style={input} /></div>
        </div>
        <Msg m={msgMdp} />
        <button type="submit" style={{ ...btn, marginTop:'8px' }}>Modifier le mot de passe</button>
      </form>
    </div>
  );
}
