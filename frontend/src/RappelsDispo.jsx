import { useState, useEffect } from 'react';
import api from './api';

const BLEU = '#1F4E79';
const champ = { padding:'5px 8px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'13px' };

export default function RappelsDispo() {
  const [d, setD] = useState(null);
  const [p, setP] = useState(null);
  const [ouvert, setOuvert] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function charger() { const r = await api.get('/rappels-dispo'); setD(r.data); setP(r.data.parametres); }
  useEffect(() => { charger().catch(() => {}); }, []);
  if (!d || !p) return null;

  async function sauver() {
    try { await api.put('/rappels-dispo', p); setMsg({ t:'Paramètres enregistrés' }); charger(); }
    catch (e) { setMsg({ ko:true, t:e.response?.data?.message || 'Erreur' }); }
  }
  async function envoyer() {
    if (!window.confirm(`Envoyer le rappel maintenant à ${d.manquants.length} chauffeur(s) ?`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = (await api.post('/rappels-dispo/executer')).data;
      setMsg({ t:`${r.emails} courriel(s), ${r.sms} SMS envoyé(s)` + (r.erreurs.length ? ` — ${r.erreurs.length} erreur(s)` : ''), ko:r.erreurs.length > 0 });
      charger();
    } catch { setMsg({ ko:true, t:'Erreur d\'envoi' }); }
    setBusy(false);
  }
  const set = (k, v) => setP({ ...p, [k]: v });
  const nb = d.manquants.length;
  return (
    <div style={{ background: nb ? '#fff8e1' : '#e8f5e9', border:'1px solid '+(nb?'#ffe082':'#a5d6a7'), borderRadius:'8px', padding:'10px 14px', margin:'12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
        <b style={{ color:BLEU }}>⏰ Disponibilités de demain :</b>
        <span>{nb === 0 ? 'tous les chauffeurs ont répondu ✓' : `${nb} chauffeur(s) n'ont pas répondu (limite ${d.heure_limite}h)`}</span>
        <span style={{ marginLeft:'auto', display:'flex', gap:'6px' }}>
          {nb > 0 && <button disabled={busy} onClick={envoyer} style={{ ...champ, background:BLEU, color:'white', border:'none', cursor:'pointer' }}>Envoyer le rappel maintenant</button>}
          <button onClick={() => setOuvert(!ouvert)} style={{ ...champ, background:'white', cursor:'pointer' }}>{ouvert ? 'Fermer' : '⚙ Réglages'}</button>
        </span>
      </div>
      {nb > 0 && <div style={{ fontSize:'13px', marginTop:'6px', color:'#555' }}>
        {d.manquants.map(c => <span key={c.id} style={{ display:'inline-block', marginRight:'12px' }}>{c.prenom} {c.nom}{(c.rappele_email || c.rappele_sms) && <span title="Rappel déjà envoyé"> ✉️</span>}</span>)}
      </div>}
      {ouvert && (
        <div style={{ marginTop:'10px', display:'flex', gap:'14px', flexWrap:'wrap', alignItems:'center', fontSize:'13px' }}>
          <label><input type="checkbox" checked={p.actif} onChange={e => set('actif', e.target.checked)} /> Rappels automatiques</label>
          <label>chaque jour dès <input type="number" min="0" max={d.heure_limite - 1} value={p.heure_rappel} onChange={e => set('heure_rappel', e.target.value)} style={{ ...champ, width:'55px' }} /> h</label>
          <label><input type="checkbox" checked={p.canal_email} onChange={e => set('canal_email', e.target.checked)} /> Courriel</label>
          <label title={d.sms_configure ? '' : 'Aucun fournisseur SMS configuré sur le serveur'}><input type="checkbox" checked={p.canal_sms} disabled={!d.sms_configure} onChange={e => set('canal_sms', e.target.checked)} /> SMS {!d.sms_configure && <i style={{ color:'#999' }}>(non configuré)</i>}</label>
          <label><input type="checkbox" checked={p.notifier_admins} onChange={e => set('notifier_admins', e.target.checked)} /> Résumé aux administrateurs</label>
          <button onClick={sauver} style={{ ...champ, background:BLEU, color:'white', border:'none', cursor:'pointer' }}>Enregistrer</button>
        </div>)}
      {msg && <div style={{ fontSize:'13px', marginTop:'6px', color:msg.ko?'#C62828':'#2E7D32' }}>{msg.t}</div>}
    </div>
  );
}
