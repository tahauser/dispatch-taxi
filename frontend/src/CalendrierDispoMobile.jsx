import { useState, useEffect } from 'react';
import api from './api';

const BLEU = '#1F4E79';
const HEURES = Array.from({length: 19}, (_, i) => i + 6); // 06h → 00h

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function fmtDateLong(d) {
  return d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
}

export default function CalendrierDispoMobile({ user, onDirtyChange }) {
  const [jour, setJour]         = useState(new Date());
  const [dispos, setDispos]     = useState([]);
  const [selection, setSelection] = useState(new Set());
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [dirty, setDirty]       = useState(false);
  const [noteJour, setNoteJour] = useState('');

  useEffect(() => {
    const handler = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty]);

  function naviguerJour(fn) {
    if (dirty && !window.confirm('Vous avez des modifications non sauvegardées. Quitter ce jour sans sauvegarder ?')) return;
    setJour(fn);
    setDirty(false);
    setNoteJour('');
  }

  const aujourd   = dateStr(new Date());
  const jourStr   = dateStr(jour);
  const estPasse  = jourStr <= aujourd;
  const estAujourdhui = jourStr === aujourd;

  useEffect(() => { charger(); }, [jourStr]);

  async function charger() {
    setLoading(true);
    setMessage('');
    try {
      const r = await api.get(`/disponibilites?date=${jourStr}`);
      const data = r.data;
      setDispos(data);
      const sel = new Set();
      data.forEach(d => {
        const hDeb = parseInt(d.heure_debut.split(':')[0]);
        const hFin = parseInt(d.heure_fin.split(':')[0]);
        for (let h = hDeb; h < hFin; h++) sel.add(h);
      });
      setSelection(sel);
      // Récupérer la note du premier créneau du jour (même note pour tous)
      setNoteJour(data[0]?.note_journee || '');
      setDirty(false);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function toggle(h) {
    if (estPasse) return;
    setSelection(prev => {
      const s = new Set(prev);
      s.has(h) ? s.delete(h) : s.add(h);
      return s;
    });
    setDirty(true);
    setMessage('');
  }

  function toutSelectionner() {
    if (estPasse) return;
    setSelection(new Set(HEURES));
    setDirty(true);
    setMessage('');
  }

  function toutEffacer() {
    if (estPasse) return;
    if (!window.confirm('Effacer toutes les disponibilités de ce jour ?')) return;
    setSelection(new Set());
    setDirty(true);
    setMessage('');
  }

  // Convertit les heures cochées en plages continues
  function selectionEnPlages() {
    const heures = Array.from(selection).sort((a, b) => a - b);
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
    if (estPasse) return;
    setLoading(true); setMessage('');
    // Supprimer les dispos existantes du jour
    for (const d of dispos) {
      try { await api.delete(`/disponibilites/${d.id}`); } catch {}
    }
    // Recréer depuis la sélection
    const plages = selectionEnPlages();
    let total = 0; let erreurs = 0;
    for (const plage of plages) {
      const hDeb = String(plage.debut).padStart(2,'0') + ':00';
      const hFin = String(plage.fin).padStart(2,'0') + ':00';
      try {
        await api.post('/disponibilites', { date_dispo: jourStr, heure_debut: hDeb, heure_fin: hFin, note_journee: noteJour || null });
        total++;
      } catch (err) { erreurs++; }
    }
    await charger();
    setDirty(false);
    if (erreurs > 0) setMessage(`${total} plage(s) sauvegardée(s), ${erreurs} erreur(s)`);
    else setMessage(total > 0 ? `${total} plage(s) sauvegardée(s) avec succès` : 'Disponibilités mises à jour');
    setLoading(false);
  }

  return (
    <div style={{ paddingBottom:'8px' }}>

      {/* Navigation jour */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:'16px', gap:'8px' }}>
        <button onClick={() => naviguerJour(d => addDays(d, -1))}
          style={{ width:'40px', height:'40px', background:'white', border:'1px solid #ddd',
            borderRadius:'50%', cursor:'pointer', fontSize:'20px', display:'flex',
            alignItems:'center', justifyContent:'center' }}>‹</button>

        <div style={{ flex:1, textAlign:'center' }}>
          <div style={{ fontWeight:'700', color: estAujourdhui ? BLEU : (estPasse ? '#aaa' : '#333'),
            fontSize:'15px', textTransform:'capitalize' }}>
            {fmtDateLong(jour)}
          </div>
          {estAujourdhui && (
            <span style={{ fontSize:'11px', background:'#E3F2FD', color:BLEU,
              padding:'2px 8px', borderRadius:'10px', fontWeight:'600' }}>
              Aujourd'hui
            </span>
          )}
          {estPasse && !estAujourdhui && (
            <span style={{ fontSize:'11px', color:'#aaa' }}>Passé — lecture seule</span>
          )}
        </div>

        <button onClick={() => naviguerJour(d => addDays(d, 1))}
          style={{ width:'40px', height:'40px', background:'white', border:'1px solid #ddd',
            borderRadius:'50%', cursor:'pointer', fontSize:'20px', display:'flex',
            alignItems:'center', justifyContent:'center' }}>›</button>
      </div>

      {/* Message */}
      {message && (
        <div style={{ background: message.includes('erreur') ? '#ffebee' : '#e8f5e9',
          color: message.includes('erreur') ? '#c62828' : '#2e7d32',
          padding:'10px 14px', borderRadius:'8px', marginBottom:'12px', fontSize:'13px',
          fontWeight:'500' }}>
          {message}
        </div>
      )}

      {/* Actions rapides */}
      {!estPasse && (
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          <button onClick={toutSelectionner}
            style={{ flex:1, padding:'8px', background:'#e8f5e9', border:'1px solid #a5d6a7',
              borderRadius:'8px', cursor:'pointer', fontSize:'12px', color:'#2e7d32', fontWeight:'500' }}>
            Tout sélectionner
          </button>
          <button onClick={toutEffacer}
            style={{ flex:1, padding:'8px', background:'#ffebee', border:'1px solid #ef9a9a',
              borderRadius:'8px', cursor:'pointer', fontSize:'12px', color:'#c62828', fontWeight:'500' }}>
            Tout effacer
          </button>
        </div>
      )}

      {/* Grille horaires */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px', color:'#999' }}>Chargement...</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px' }}>
          {HEURES.map(h => {
            const sel = selection.has(h);
            return (
              <button key={h} onClick={() => toggle(h)}
                disabled={estPasse}
                style={{
                  padding:'14px 10px',
                  background: sel ? BLEU : (estPasse ? '#f5f5f5' : 'white'),
                  color: sel ? 'white' : (estPasse ? '#ccc' : '#444'),
                  border: sel ? `2px solid ${BLEU}` : '2px solid #e0e0e0',
                  borderRadius:'10px',
                  cursor: estPasse ? 'not-allowed' : 'pointer',
                  fontSize:'15px',
                  fontWeight: sel ? '700' : '400',
                  transition:'all 0.1s',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'
                }}>
                <span>{String(h).padStart(2,'0')}h — {String(h+1).padStart(2,'0')}h</span>
                {sel && <span style={{ fontSize:'14px' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Note de la journée */}
      <div style={{ marginBottom:'16px' }}>
        <label style={{ fontSize:'13px', fontWeight:'600', color:'#555',
          display:'block', marginBottom:'6px' }}>
          📝 Note pour cette journée <span style={{ fontWeight:'400', color:'#aaa' }}>(optionnel)</span>
        </label>
        <textarea
          value={noteJour}
          onChange={e => { setNoteJour(e.target.value); if (!estPasse) setDirty(true); }}
          disabled={estPasse}
          placeholder={estPasse ? '—' : 'Ex: disponible seulement le matin, pas de longue distance...'}
          rows={3}
          style={{
            width:'100%', padding:'10px 12px', border:'1px solid #ddd',
            borderRadius:'10px', fontSize:'13px', resize:'none',
            background: estPasse ? '#f5f5f5' : 'white',
            color: estPasse ? '#aaa' : '#333',
            boxSizing:'border-box', fontFamily:'inherit',
            outline:'none',
          }}
        />
      </div>

      {/* Bouton sauvegarder */}
      {!estPasse && (
        <button onClick={sauvegarder} disabled={loading}
          style={{ width:'100%', padding:'14px', background: loading ? '#ccc' : '#375623',
            color:'white', border:'none', borderRadius:'10px', cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight:'700', fontSize:'15px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Sauvegarde...' : '💾  Sauvegarder mes disponibilités'}
        </button>
      )}

      <p style={{ fontSize:'11px', color:'#aaa', marginTop:'10px', textAlign:'center' }}>
        Les jours passés ne peuvent pas être modifiés
      </p>
    </div>
  );
}
