import { useState, useEffect, useRef } from 'react';
import api from './api';

const BLEU = '#1F4E79';
const HEURES = Array.from({length: 19}, (_, i) => i + 6); // 06h -> 00h

function getSemaine(dateRef) {
  const d = new Date(dateRef);
  const jour = d.getDay();
  const lundi = new Date(d);
  lundi.setDate(d.getDate() - (jour === 0 ? 6 : jour - 1));
  return Array.from({length: 7}, (_, i) => {
    const day = new Date(lundi);
    day.setDate(lundi.getDate() + i);
    return day;
  });
}

function dateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtJour(d) {
  return d.toLocaleDateString('fr-CA', { weekday:'short', day:'numeric', month:'short' });
}

export default function CalendrierDispo({ user }) {
  const [semaine, setSemaine]     = useState(getSemaine(new Date()));
  const [dispos, setDispos]       = useState([]);
  const [selection, setSelection] = useState({});
  const [message, setMessage]     = useState('');
  const [loading, setLoading]     = useState(false);

  // Plage fixe
  const [plageDeb, setPlageDeb]   = useState('07:00');
  const [plageFin, setPlageFin]   = useState('20:00');
  const [joursPlage, setJoursPlage] = useState({
    lun:true, mar:true, mer:true, jeu:true, ven:true, sam:true, dim:true
  });

  // Glisser-deposer
  const dragStart = useRef(null);
  const dragMode  = useRef(null); // 'add' ou 'remove'

  const aujourd   = dateStr(new Date());

  useEffect(() => { chargerDispos(); }, [semaine[0].toISOString()]);

  async function chargerDispos() {
    setLoading(true);
    try {
      const promises = semaine.map(d =>
        api.get(`/disponibilites?date=${dateStr(d)}`).then(r => r.data)
      );
      const resultats = await Promise.all(promises);
      const toutes = resultats.flat();
      setDispos(toutes);

      const sel = {};
      toutes.forEach(dispo => {
        const date = dateStr(new Date(dispo.date_dispo));
        if (!sel[date]) sel[date] = new Set();
        const hDeb = parseInt(dispo.heure_debut.split(':')[0]);
        const hFin = parseInt(dispo.heure_fin.split(':')[0]);
        for (let h = hDeb; h < hFin; h++) sel[date].add(h);
      });
      setSelection(sel);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function estPasse(date) { return date <= aujourd; }
  function estSelectionne(date, heure) { return selection[date]?.has(heure) || false; }

  // --- Glisser-deposer ---
  function onMouseDown(date, heure) {
    if (estPasse(date)) return;
    dragStart.current = { date, heure };
    dragMode.current  = estSelectionne(date, heure) ? 'remove' : 'add';
    toggleCreneau(date, heure, dragMode.current);
  }

  function onMouseEnter(date, heure) {
    if (!dragStart.current) return;
    if (estPasse(date)) return;
    // Seulement si meme colonne (meme jour)
    if (date !== dragStart.current.date) return;
    setSelection(prev => {
      const newSel = { ...prev };
      if (!newSel[date]) newSel[date] = new Set();
      else newSel[date] = new Set(newSel[date]);
      const hMin = Math.min(dragStart.current.heure, heure);
      const hMax = Math.max(dragStart.current.heure, heure);
      for (let h = hMin; h <= hMax; h++) {
        if (dragMode.current === 'add') newSel[date].add(h);
        else newSel[date].delete(h);
      }
      return newSel;
    });
  }

  function onMouseUp() { dragStart.current = null; dragMode.current = null; }

  function toggleCreneau(date, heure, mode) {
    setSelection(prev => {
      const newSel = { ...prev };
      if (!newSel[date]) newSel[date] = new Set();
      else newSel[date] = new Set(newSel[date]);
      if (mode === 'add' || (!mode && !newSel[date].has(heure))) newSel[date].add(heure);
      else newSel[date].delete(heure);
      return newSel;
    });
    setMessage('');
  }

  // --- Appliquer plage fixe ---
  function appliquerPlageFixe() {
    const hDeb = parseInt(plageDeb.split(':')[0]);
    const hFin = parseInt(plageFin.split(':')[0]);
    if (hFin <= hDeb) { setMessage('Heure de fin doit etre apres heure de debut'); return; }
    const joursNoms = ['dim','lun','mar','mer','jeu','ven','sam'];
    setSelection(prev => {
      const newSel = { ...prev };
      semaine.forEach(jour => {
        const date = dateStr(jour);
        if (estPasse(date)) return;
        const nomJour = joursNoms[jour.getDay()];
        if (!joursPlage[nomJour]) return;
        if (!newSel[date]) newSel[date] = new Set();
        else newSel[date] = new Set(newSel[date]);
        for (let h = hDeb; h < hFin; h++) newSel[date].add(h);
      });
      return newSel;
    });
    setMessage('Plage appliquee - cliquez Sauvegarder pour confirmer');
  }

  // --- Tout effacer pour un jour ---
  function effacerJour(date) {
    if (estPasse(date)) return;
    if (!window.confirm('Effacer toutes les disponibilites de ce jour?')) return;
    setSelection(prev => {
      const newSel = { ...prev };
      newSel[date] = new Set();
      return newSel;
    });
  }

  // --- Copier un jour sur toute la semaine ---
  function copierSurSemaine(dateSource) {
    const heures = selection[dateSource] || new Set();
    if (heures.size === 0) { setMessage('Aucun horaire a copier pour ce jour'); return; }
    if (!window.confirm('Copier cet horaire sur tous les jours de la semaine?')) return;
    setSelection(prev => {
      const newSel = { ...prev };
      semaine.forEach(jour => {
        const date = dateStr(jour);
        if (estPasse(date)) return;
        newSel[date] = new Set(heures);
      });
      return newSel;
    });
    setMessage('Horaire copie sur toute la semaine - cliquez Sauvegarder');
  }

  // Convertir selection en plages continues
  function selectionEnPlages(date) {
    const heures = Array.from(selection[date] || []).sort((a,b) => a-b);
    if (heures.length === 0) return [];
    const plages = [];
    let debut = heures[0], fin = heures[0] + 1;
    for (let i = 1; i < heures.length; i++) {
      if (heures[i] === fin) fin++;
      else { plages.push({debut, fin}); debut = heures[i]; fin = heures[i]+1; }
    }
    plages.push({debut, fin});
    return plages;
  }

  async function sauvegarder() {
    setLoading(true); setMessage('');
    let total = 0; let erreurs = 0;
    for (const jour of semaine) {
      const date = dateStr(jour);
      if (estPasse(date)) continue;
      const disposJour = dispos.filter(d => dateStr(new Date(d.date_dispo)) === date);
      for (const d of disposJour) {
        try { await api.delete(`/disponibilites/${d.id}`); } catch {}
      }
      const plages = selectionEnPlages(date);
      for (const plage of plages) {
        const hDeb = String(plage.debut).padStart(2,'0') + ':00';
        const hFin = String(plage.fin).padStart(2,'0') + ':00';
        try {
          await api.post('/disponibilites', { date_dispo: date, heure_debut: hDeb, heure_fin: hFin });
          total++;
        } catch (err) { console.error(err.response?.data?.message); erreurs++; }
      }
    }
    await chargerDispos();
    if (erreurs > 0) setMessage(`${total} plages sauvegardees, ${erreurs} erreurs`);
    else setMessage(total > 0 ? `${total} plage(s) sauvegardee(s) avec succes` : 'Disponibilites mises a jour');
    setLoading(false);
  }

  const joursNoms = ['dim','lun','mar','mer','jeu','ven','sam'];
  const joursLabels = { lun:'Lun', mar:'Mar', mer:'Mer', jeu:'Jeu', ven:'Ven', sam:'Sam', dim:'Dim' };

  return (
    <div onMouseUp={onMouseUp} style={{ userSelect:'none' }}>

      {/* Plage fixe */}
      <div style={{ background:'#f0f4f8', borderRadius:'10px', padding:'16px',
        marginBottom:'20px', border:'1px solid #dde3ec' }}>
        <div style={{ fontWeight:'600', color:BLEU, marginBottom:'12px', fontSize:'14px' }}>
          Appliquer une plage fixe
        </div>
        <div style={{ display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
          <div>
            <label style={{ fontSize:'12px', color:'#555', display:'block', marginBottom:'4px' }}>De</label>
            <input type="time" value={plageDeb} onChange={e=>setPlageDeb(e.target.value)}
              style={{ padding:'6px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'14px' }} />
          </div>
          <div>
            <label style={{ fontSize:'12px', color:'#555', display:'block', marginBottom:'4px' }}>A</label>
            <input type="time" value={plageFin} onChange={e=>setPlageFin(e.target.value)}
              style={{ padding:'6px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'14px' }} />
          </div>
          <div>
            <label style={{ fontSize:'12px', color:'#555', display:'block', marginBottom:'4px' }}>Jours</label>
            <div style={{ display:'flex', gap:'4px' }}>
              {Object.entries(joursLabels).map(([key, label]) => (
                <button key={key} onClick={() => setJoursPlage(p => ({...p, [key]:!p[key]}))}
                  style={{ padding:'5px 8px', border:'1px solid',
                    borderColor: joursPlage[key] ? BLEU : '#ddd',
                    background: joursPlage[key] ? BLEU : 'white',
                    color: joursPlage[key] ? 'white' : '#555',
                    borderRadius:'4px', cursor:'pointer', fontSize:'12px', fontWeight:'500' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={appliquerPlageFixe}
            style={{ padding:'8px 18px', background:'#2E75B6', color:'white', border:'none',
              borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'13px',
              alignSelf:'flex-end' }}>
            Appliquer
          </button>
        </div>
      </div>

      {/* Navigation semaine + Sauvegarder */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px', flexWrap:'wrap' }}>
        <button onClick={() => { const d=new Date(semaine[0]); d.setDate(d.getDate()-7); setSemaine(getSemaine(d)); }}
          style={{ padding:'6px 14px', background:'white', border:'1px solid #ddd',
            borderRadius:'6px', cursor:'pointer', fontSize:'18px' }}>‹</button>
        <span style={{ fontWeight:'600', color:BLEU, fontSize:'14px' }}>
          {semaine[0].toLocaleDateString('fr-CA',{day:'numeric',month:'long'})} —{' '}
          {semaine[6].toLocaleDateString('fr-CA',{day:'numeric',month:'long',year:'numeric'})}
        </span>
        <button onClick={() => setSemaine(getSemaine(new Date()))} style={{ padding:'6px 14px', background:'white', border:'1px solid #ddd', borderRadius:'6px', cursor:'pointer', fontSize:'13px', color:'#555' }}>Aujourd'hui</button>
        <button onClick={() => { const d=new Date(semaine[0]); d.setDate(d.getDate()+7); setSemaine(getSemaine(d)); }}
          style={{ padding:'6px 14px', background:'white', border:'1px solid #ddd',
            borderRadius:'6px', cursor:'pointer', fontSize:'18px' }}>›</button>
        <button onClick={sauvegarder} disabled={loading}
          style={{ marginLeft:'auto', padding:'8px 22px', background:'#375623', color:'white',
            border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'14px',
            opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {message && (
        <div style={{ background: message.includes('erreur') || message.includes('fin doit') ? '#ffebee' : '#e8f5e9',
          color: message.includes('erreur') || message.includes('fin doit') ? '#c62828' : '#2e7d32',
          padding:'10px 16px', borderRadius:'6px', marginBottom:'12px', fontSize:'13px' }}>
          {message}
        </div>
      )}

      {/* Legende */}
      <div style={{ display:'flex', gap:'16px', marginBottom:'8px', fontSize:'12px', color:'#555' }}>
        <span>💚 Disponible &nbsp; ⬜ Non disponible &nbsp; 🔲 Passe</span>
        <span style={{ marginLeft:'auto', color:'#888' }}>
          Cliquez ou glissez pour selectionner des creneaux
        </span>
      </div>

      {/* Grille */}
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', width:'100%', minWidth:'700px' }}>
          <thead>
            <tr>
              <th style={{ width:'45px', background:'#f8f9fa', border:'1px solid #e0e0e0',
                fontSize:'11px', color:'#888' }}></th>
              {semaine.map(jour => {
                const d = dateStr(jour);
                const estAuj = d === aujourd;
                const hasDispo = (selection[d]?.size || 0) > 0;
                return (
                  <th key={d} style={{ padding:'6px 4px', background: estAuj ? '#E3F2FD' : '#f8f9fa',
                    border:'1px solid #e0e0e0', fontSize:'11px',
                    color: estAuj ? BLEU : '#333', fontWeight: estAuj ? '700' : '500',
                    textAlign:'center', minWidth:'85px' }}>
                    <div>{fmtJour(jour)}</div>
                    {hasDispo && !estPasse(d) && (
                      <div style={{ display:'flex', gap:'2px', justifyContent:'center', marginTop:'3px' }}>
                        <button onClick={() => copierSurSemaine(d)}
                          title="Copier sur toute la semaine"
                          style={{ fontSize:'10px', padding:'1px 4px', background:'#E3F2FD',
                            border:'1px solid #90CAF9', borderRadius:'3px', cursor:'pointer',
                            color:BLEU }}>⟳ sem.</button>

                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HEURES.map(h => (
              <tr key={h}>
                <td style={{ padding:'2px 6px', border:'1px solid #e0e0e0',
                  background:'#f8f9fa', fontSize:'11px', color:'#666',
                  textAlign:'right', fontWeight:'500', whiteSpace:'nowrap' }}>
                  {String(h).padStart(2,'0')}h
                </td>
                {semaine.map(jour => {
                  const d = dateStr(jour);
                  const passe = estPasse(d);
                  const sel = estSelectionne(d, h);
                  return (
                    <td key={d+h}
                      onMouseDown={() => onMouseDown(d, h)}
                      onMouseEnter={() => onMouseEnter(d, h)}
                      style={{
                        border:'1px solid #e8e8e8',
                        background: passe ? '#f5f5f5' : sel ? '#C6EFCE' : 'white',
                        cursor: passe ? 'not-allowed' : 'pointer',
                        height:'28px',
                        transition:'background 0.05s',
                        borderBottom: h % 4 === 5 ? '1px solid #ccc' : '1px solid #e8e8e8',
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize:'11px', color:'#aaa', marginTop:'6px' }}>
        Glissez sur plusieurs creneaux pour une selection rapide. Bouton "sem." pour copier un jour sur toute la semaine.
      </p>
    </div>
  );
}
