import { useState, useEffect } from 'react';
import api from './api';

const BLEU = '#1F4E79';
const champ = { padding:'6px 8px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'13px' };
const $ = n => (n || 0).toLocaleString('fr-CA', { style:'currency', currency:'CAD' });
const moisCourant = () => new Date().toLocaleDateString('en-CA', { timeZone:'America/Toronto' }).slice(0, 7);
const LIB = { termine:'Terminé', no_show:'Client absent', a_faire:'Non marquée', en_route:'En route', arrive:'Arrivé', a_bord:'À bord' };
const MODES = { distance:'Prise en charge + distance', temps:'Prise en charge + durée', mixte:'Prise en charge + distance + durée', forfait:'Forfait par course' };
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

function imprimer(rel, tarifs) {
  const w = window.open('', '_blank');
  if (!w) return alert('Autorisez les fenêtres pop-up pour générer le PDF');
  const blocs = rel.groupes.map(g => `
    <h2>${esc(g.payeur)}</h2>
    <table><tr><th>Date</th><th>Trajet</th><th>Chauffeur</th><th>Prise</th><th>Km</th><th>Min</th><th>Statut</th><th class="r">Montant</th></tr>
    ${g.lignes.map(l => `<tr><td>${l.date}</td><td>${esc(l.code_trajet)}</td><td>${esc(l.prenom)} ${esc(l.nom)}</td><td>${l.heure_prise.slice(0,5)}</td>
      <td>${l.km ?? ''}${l.km_estime ? '*' : ''}</td><td>${l.minutes}</td><td>${LIB[l.statut_course] || ''}</td><td class="r">${$(l.montant)}</td></tr>`).join('')}
    <tr class="t"><td colspan="7" class="r">Sous-total (${g.nb} course${g.nb > 1 ? 's' : ''})</td><td class="r">${$(g.sous_total)}</td></tr>
    ${g.taxes ? `<tr class="t"><td colspan="7" class="r">Taxes</td><td class="r">${$(g.taxes)}</td></tr>` : ''}
    <tr class="t"><td colspan="7" class="r"><b>Total</b></td><td class="r"><b>${$(g.total)}</b></td></tr></table>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relevé ${rel.mois}</title><style>
    body{font-family:Arial,sans-serif;font-size:12px;margin:24px}h1{color:${BLEU};margin:0 0 4px}h2{color:${BLEU};margin:22px 0 6px}
    table{width:100%;border-collapse:collapse}th{background:${BLEU};color:#fff;text-align:left;padding:5px}td{padding:4px 5px;border-bottom:1px solid #ddd}
    .r{text-align:right}.t td{border-bottom:none}small{color:#666}</style></head><body>
    <h1>Relevé de courses — ${rel.mois}</h1><small>* distance estimée à partir des adresses</small>${blocs}
    <h2>Total général : ${$(rel.total)}</h2><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  w.document.close();
}

function Tarifs() {
  const [liste, setListe] = useState([]);
  const [nouveau, setNouveau] = useState('');
  const [msg, setMsg] = useState('');
  const charger = () => api.get('/facturation/tarifs').then(r => setListe(r.data));
  useEffect(() => { charger(); }, []);
  const maj = (p, k, v) => setListe(liste.map(t => t.payeur === p ? { ...t, [k]: v } : t));
  async function sauver(t) {
    try { await api.put(`/facturation/tarifs/${encodeURIComponent(t.payeur)}`, t); setMsg(`Tarif ${t.payeur} enregistré`); } catch (e) { setMsg(e.response?.data?.message || 'Erreur'); }
  }
  const num = (t, k, w = 80) => <input type="number" step="0.001" min="0" value={t[k]} onChange={e => maj(t.payeur, k, e.target.value)} style={{ ...champ, width:w }} />;
  return (
    <div>
      <p style={{ fontSize:'13px', color:'#666', marginTop:0 }}>Un tarif par payeur. Les trajets importés sont rattachés à « EXO » par défaut (colonne « Payeur » facultative dans l'Excel d'import).</p>
      {liste.map(t => (
        <div key={t.payeur} style={{ border:'1px solid #e0e0e0', borderRadius:'8px', padding:'10px 12px', marginBottom:'8px', display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center', fontSize:'13px' }}>
          <b style={{ width:'110px', color:BLEU }}>{t.payeur}</b><span style={{ color:'#999' }}>{t.nb_trajets} trajets</span>
          <select value={t.mode} onChange={e => maj(t.payeur, 'mode', e.target.value)} style={champ}>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          {t.mode !== 'forfait' ? <>Prise en charge $ {num(t, 'prise_en_charge')}
            {t.mode !== 'temps' && <>$/km {num(t, 'prix_km', 70)}</>}{t.mode !== 'distance' && <>$/min {num(t, 'prix_minute', 70)}</>}</>
            : <>Forfait $ {num(t, 'forfait')}</>}
          Minimum $ {num(t, 'minimum', 70)} Taxes % {num(t, 'taxes_pct', 70)}
          <label><input type="checkbox" checked={t.facturer_absence} onChange={e => maj(t.payeur, 'facturer_absence', e.target.checked)} /> facturer client absent (prise en charge)</label>
          <button onClick={() => sauver(t)} style={{ ...champ, background:BLEU, color:'white', border:'none', cursor:'pointer' }}>Enregistrer</button>
        </div>))}
      <div style={{ display:'flex', gap:'6px' }}>
        <input placeholder="Nouveau payeur" value={nouveau} onChange={e => setNouveau(e.target.value)} style={champ} />
        <button onClick={async () => { if (!nouveau.trim()) return; await sauver({ payeur:nouveau.trim(), mode:'distance' }); setNouveau(''); charger(); }} style={{ ...champ, cursor:'pointer' }}>Ajouter</button>
      </div>
      {msg && <div style={{ fontSize:'13px', color:'#2E7D32', marginTop:'8px' }}>{msg}</div>}
    </div>
  );
}

export default function Facturation() {
  const [onglet, setOnglet] = useState('releve');
  const [mois, setMois] = useState(moisCourant());
  const [payeur, setPayeur] = useState('');
  const [inclure, setInclure] = useState('termine');
  const [rel, setRel] = useState(null);
  const [edit, setEdit] = useState(null);   // { id, montant, distance, payeur, note }
  const [err, setErr] = useState('');

  const q = () => `mois=${mois}${payeur ? `&payeur=${encodeURIComponent(payeur)}` : ''}&inclure=${inclure}`;
  async function charger() {
    try { setRel((await api.get(`/facturation/releve?${q()}`)).data); setErr(''); } catch { setErr('Erreur de chargement'); }
  }
  useEffect(() => { if (onglet === 'releve') charger(); }, [mois, payeur, inclure, onglet]);

  async function exportExcel() {
    const r = await api.get(`/facturation/export.xlsx?${q()}`, { responseType:'blob' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = `releve-${mois}.xlsx`; a.click(); URL.revokeObjectURL(a.href);
  }
  async function sauverLigne() {
    try {
      await api.patch(`/facturation/ligne/${edit.id}`, { payeur:edit.payeur, distance_km:edit.distance, montant_ajuste:edit.montant, note_facturation:edit.note });
      setEdit(null); charger();
    } catch (e) { setErr(e.response?.data?.message || 'Erreur'); }
  }
  const payeursConnus = rel ? rel.groupes.map(g => g.payeur) : [];

  return (
    <div style={{ padding:'20px' }}>
      <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
        {[['releve','Relevé mensuel'], ['tarifs','Tarifs par payeur']].map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)} style={{ ...champ, cursor:'pointer', background:onglet===k?BLEU:'white', color:onglet===k?'white':'#555' }}>{l}</button>))}
      </div>
      {onglet === 'tarifs' ? <Tarifs /> : (<>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center', marginBottom:'12px' }}>
          <input type="month" value={mois} onChange={e => setMois(e.target.value)} style={champ} />
          <input placeholder="Payeur (ex. EXO)" value={payeur} onChange={e => setPayeur(e.target.value)} style={champ} list="payeurs" />
          <datalist id="payeurs">{payeursConnus.map(p => <option key={p} value={p} />)}</datalist>
          <label style={{ fontSize:'13px' }}><input type="checkbox" checked={inclure === 'toutes'} onChange={e => setInclure(e.target.checked ? 'toutes' : 'termine')} /> inclure les courses non marquées « terminé »</label>
          <span style={{ marginLeft:'auto', display:'flex', gap:'6px' }}>
            <button disabled={!rel || !rel.groupes.length} onClick={exportExcel} style={{ ...champ, cursor:'pointer' }}>⬇ Excel</button>
            <button disabled={!rel || !rel.groupes.length} onClick={() => imprimer(rel)} style={{ ...champ, cursor:'pointer' }}>🖨 PDF</button>
          </span>
        </div>
        {err && <div style={{ color:'#C62828', fontSize:'13px' }}>{err}</div>}
        {rel && rel.groupes.length === 0 && <div style={{ padding:'40px', textAlign:'center', color:'#999' }}>Aucune course facturable ce mois-ci (seules les courses marquées « terminé » par le chauffeur sont comptées).</div>}
        {rel?.groupes.map(g => (
          <div key={g.payeur} style={{ marginBottom:'22px' }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:'12px', flexWrap:'wrap' }}>
              <h3 style={{ margin:'0 0 6px', color:BLEU }}>{g.payeur}</h3>
              <span style={{ fontSize:'13px', color:'#666' }}>{g.nb} course(s) · {g.km} km · {g.minutes} min</span>
              {(!g.tarif || (g.tarif.mode !== 'forfait' && !+g.tarif.prix_km && !+g.tarif.prix_minute && !+g.tarif.prise_en_charge)) &&
                <span style={{ fontSize:'12px', color:'#C62828' }}>⚠ aucun tarif défini pour ce payeur (onglet « Tarifs »)</span>}
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:BLEU, color:'white' }}>{['Date','Trajet','Chauffeur','Prise','Km','Min','Statut','Calculé','Facturé',''].map(h => <th key={h} style={{ padding:'8px 10px', textAlign:'left' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {g.lignes.map((l, i) => (
                    <tr key={l.id} style={{ background:i%2?'white':'#fafafa', borderBottom:'1px solid #eee' }}>
                      <td style={{ padding:'6px 10px' }}>{l.date}</td><td style={{ padding:'6px 10px', fontWeight:600, color:BLEU }}>{l.code_trajet}</td>
                      <td style={{ padding:'6px 10px' }}>{l.prenom} {l.nom}</td><td style={{ padding:'6px 10px' }}>{l.heure_prise.slice(0,5)}</td>
                      <td style={{ padding:'6px 10px' }} title={l.km_estime ? 'Distance estimée à partir des adresses' : ''}>{l.km ?? '—'}{l.km_estime ? '*' : ''}</td>
                      <td style={{ padding:'6px 10px' }}>{l.minutes}</td><td style={{ padding:'6px 10px' }}>{LIB[l.statut_course]}</td>
                      <td style={{ padding:'6px 10px', color:'#888' }}>{$(l.calcule)}</td>
                      <td style={{ padding:'6px 10px', fontWeight:700 }}>{$(l.montant)}{l.montant_ajuste !== null && <span title={l.note_facturation || 'Montant ajusté'}> ✎</span>}</td>
                      <td style={{ padding:'6px 10px' }}><button onClick={() => setEdit({ id:l.id, montant:l.montant_ajuste ?? '', distance:l.km_estime ? '' : (l.km ?? ''), payeur:g.payeur, note:l.note_facturation || '', code:l.code_trajet })} style={{ ...champ, cursor:'pointer', background:'white' }}>Modifier</button></td>
                    </tr>))}
                </tbody>
                <tfoot>
                  <tr><td colSpan="8" style={{ textAlign:'right', padding:'6px 10px' }}>Sous-total</td><td style={{ padding:'6px 10px' }}>{$(g.sous_total)}</td><td /></tr>
                  {g.taxes > 0 && <tr><td colSpan="8" style={{ textAlign:'right', padding:'6px 10px' }}>Taxes ({g.tarif.taxes_pct} %)</td><td style={{ padding:'6px 10px' }}>{$(g.taxes)}</td><td /></tr>}
                  <tr><td colSpan="8" style={{ textAlign:'right', padding:'6px 10px', fontWeight:700 }}>Total</td><td style={{ padding:'6px 10px', fontWeight:700 }}>{$(g.total)}</td><td /></tr>
                </tfoot>
              </table>
            </div>
          </div>))}
        {rel?.groupes.length > 1 && <div style={{ textAlign:'right', fontWeight:700, fontSize:'15px' }}>Total général : {$(rel.total)}</div>}
        {rel?.groupes.some(g => g.lignes.some(l => l.km_estime)) && <div style={{ fontSize:'12px', color:'#888' }}>* distance estimée (à vol d'oiseau × 1,3) ; saisissez la distance réelle via « Modifier ».</div>}
      </>)}

      {edit && (
        <div onClick={() => setEdit(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'10px', padding:'20px', width:'340px', maxWidth:'92vw', fontSize:'13px', display:'grid', gap:'8px' }}>
            <b style={{ color:BLEU }}>Course {edit.code}</b>
            <label>Payeur<input value={edit.payeur} onChange={e => setEdit({ ...edit, payeur:e.target.value })} style={{ ...champ, width:'100%', boxSizing:'border-box' }} /></label>
            <label>Distance réelle (km)<input type="number" min="0" step="0.1" value={edit.distance} onChange={e => setEdit({ ...edit, distance:e.target.value })} style={{ ...champ, width:'100%', boxSizing:'border-box' }} /></label>
            <label>Montant forcé $ (vide = calculé)<input type="number" min="0" step="0.01" value={edit.montant} onChange={e => setEdit({ ...edit, montant:e.target.value })} style={{ ...champ, width:'100%', boxSizing:'border-box' }} /></label>
            <label>Note<input value={edit.note} onChange={e => setEdit({ ...edit, note:e.target.value })} style={{ ...champ, width:'100%', boxSizing:'border-box' }} /></label>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button onClick={() => setEdit(null)} style={{ ...champ, cursor:'pointer', background:'white' }}>Annuler</button>
              <button onClick={sauverLigne} style={{ ...champ, cursor:'pointer', background:BLEU, color:'white', border:'none' }}>Enregistrer</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
