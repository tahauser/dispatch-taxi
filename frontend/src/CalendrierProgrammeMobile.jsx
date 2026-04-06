import { useState, useEffect } from 'react';
import api from './api';

const BLEU = '#1F4E79';

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmt(h) { return String(h||'').substring(0,5); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }

function fmtDateLong(d) {
  return d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
}

export default function CalendrierProgrammeMobile({ user }) {
  const [jour, setJour]       = useState(new Date());
  const [trajets, setTrajets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const aujourd = dateStr(new Date());
  const jourStr = dateStr(jour);
  const estAujourdhui = jourStr === aujourd;

  useEffect(() => { charger(); }, [jourStr]);

  async function charger() {
    setLoading(true);
    setSelected(null);
    try {
      const r = await api.get(`/affectations?date=${jourStr}`);
      setTrajets(r.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  return (
    <div style={{ paddingBottom: '8px' }}>

      {/* Navigation jour */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:'16px', gap:'8px' }}>
        <button onClick={() => setJour(d => addDays(d, -1))}
          style={{ width:'40px', height:'40px', background:'white', border:'1px solid #ddd',
            borderRadius:'50%', cursor:'pointer', fontSize:'20px', display:'flex',
            alignItems:'center', justifyContent:'center' }}>‹</button>

        <div style={{ flex:1, textAlign:'center' }}>
          <div style={{ fontWeight:'700', color: estAujourdhui ? BLEU : '#333', fontSize:'15px',
            textTransform:'capitalize' }}>
            {fmtDateLong(jour)}
          </div>
          {estAujourdhui && (
            <span style={{ fontSize:'11px', background:'#E3F2FD', color:BLEU,
              padding:'2px 8px', borderRadius:'10px', fontWeight:'600' }}>
              Aujourd'hui
            </span>
          )}
        </div>

        <button onClick={() => setJour(d => addDays(d, 1))}
          style={{ width:'40px', height:'40px', background:'white', border:'1px solid #ddd',
            borderRadius:'50%', cursor:'pointer', fontSize:'20px', display:'flex',
            alignItems:'center', justifyContent:'center' }}>›</button>
      </div>

      {/* Boutons Aujourd'hui + Actualiser */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
        {!estAujourdhui && (
          <button onClick={() => setJour(new Date())}
            style={{ flex:1, padding:'8px', background:'white', border:'1px solid #ddd',
              borderRadius:'8px', cursor:'pointer', fontSize:'13px', color:'#555', fontWeight:'500' }}>
            ⟨ Aujourd'hui
          </button>
        )}
        <button onClick={charger}
          style={{ flex:1, padding:'8px', background:'#f0f4f8', border:'1px solid #ddd',
            borderRadius:'8px', cursor:'pointer', fontSize:'13px', color:'#555' }}>
          ↻ Actualiser
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#999', fontSize:'14px' }}>
          Chargement...
        </div>
      ) : trajets.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'#bbb' }}>
          <div style={{ fontSize:'52px', marginBottom:'12px' }}>📅</div>
          <div style={{ fontSize:'15px', fontWeight:'500' }}>Aucun trajet ce jour</div>
          <div style={{ fontSize:'13px', marginTop:'6px' }}>
            {estAujourdhui ? 'Revenez plus tard' : 'Naviguez vers un autre jour'}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize:'13px', color:'#666', marginBottom:'12px', fontWeight:'500' }}>
            {trajets.length} trajet{trajets.length > 1 ? 's' : ''} ce jour
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {trajets.map(t => (
              <div key={t.id}
                onClick={() => setSelected(selected?.id === t.id ? null : t)}
                style={{ borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.10)',
                  cursor:'pointer', border: selected?.id === t.id ? `2px solid ${BLEU}` : '2px solid transparent' }}>

                {/* En-tête carte */}
                <div style={{ background:BLEU, padding:'12px 16px', display:'flex',
                  justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'white', fontWeight:'700', fontSize:'16px' }}>
                    {t.code_trajet}
                  </span>
                  <span style={{ color:'#D6E4F0', fontSize:'14px', fontWeight:'500' }}>
                    {fmt(t.heure_prise)} → {fmt(t.heure_arrivee)}
                  </span>
                </div>

                {/* Corps carte */}
                <div style={{ background:'white', padding:'12px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                    <span style={{ fontSize:'16px' }}>🚗</span>
                    <span style={{ fontSize:'13px', color:'#555', fontWeight:'500' }}>
                      {t.type_vehicule}
                    </span>
                  </div>

                  <div style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                    <span style={{ fontSize:'16px', flexShrink:0 }}>📍</span>
                    <span style={{ fontSize:'13px', color:'#333', lineHeight:'1.4' }}>
                      {t.adresse_prise || '—'}
                    </span>
                  </div>

                  {/* Détails expandables */}
                  {selected?.id === t.id && (
                    <div style={{ marginTop:'12px', paddingTop:'12px',
                      borderTop:'1px solid #f0f0f0' }}>
                      {t.notes && (
                        <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                          <span style={{ fontSize:'14px' }}>📝</span>
                          <span style={{ fontSize:'13px', color:'#666', fontStyle:'italic' }}>
                            {t.notes}
                          </span>
                        </div>
                      )}
                      <div style={{ background:'#fff3cd', borderRadius:'6px', padding:'8px 12px',
                        fontSize:'12px', color:'#856404', marginTop:'4px' }}>
                        La destination est confidentielle
                      </div>
                    </div>
                  )}

                  <div style={{ textAlign:'right', marginTop:'6px' }}>
                    <span style={{ fontSize:'11px', color:'#aaa' }}>
                      {selected?.id === t.id ? 'Appuyez pour fermer ▲' : 'Appuyez pour détails ▼'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
