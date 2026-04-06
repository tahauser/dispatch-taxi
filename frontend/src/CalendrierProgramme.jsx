import { useState, useEffect } from 'react';
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
function fmt(h) { return String(h||'').substring(0,5); }

export default function CalendrierProgramme({ user }) {
  const [semaine, setSemaine]   = useState(getSemaine(new Date()));
  const [trajets, setTrajets]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null); // trajet selectionne pour detail

  const aujourd = dateStr(new Date());

  useEffect(() => { charger(); }, [semaine[0].toISOString()]);

  async function charger() {
    setLoading(true);
    try {
      const promises = semaine.map(d =>
        api.get(`/affectations?date=${dateStr(d)}`).then(r => r.data)
      );
      const resultats = await Promise.all(promises);
      setTrajets(resultats.flat());
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function getTrajetsJourHeure(date, heure) {
    return trajets.filter(t => {
      const tDate = (t.date_trajet || t.date_programme)?.split('T')[0];
      const hPrise = parseInt((t.heure_prise||'').split(':')[0]);
      const hArr   = parseInt((t.heure_arrivee||'').split(':')[0]);
      const hFin = hArr > hPrise ? hArr : hPrise + 1;
      return tDate === date && heure >= hPrise && heure < hFin;
    });
  }

  function getTrajetsJour(date) {
    return trajets.filter(t => (t.date_trajet || t.date_programme)?.split('T')[0] === date);
  }

  const nbTotal = trajets.length;

  return (
    <div>
      {/* Navigation semaine */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
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
        <button onClick={charger}
          style={{ padding:'6px 14px', background:'#f0f4f8', border:'1px solid #ddd',
            borderRadius:'6px', cursor:'pointer', fontSize:'13px' }}>
          Actualiser
        </button>
        {nbTotal > 0 && (
          <span style={{ background:'#e8f5e9', color:'#2e7d32', padding:'4px 12px',
            borderRadius:'12px', fontSize:'13px', fontWeight:'600' }}>
            {nbTotal} trajet{nbTotal>1?'s':''} cette semaine
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px', color:'#999' }}>Chargement...</div>
      ) : (
        <div style={{ display:'flex', gap:'16px' }}>
          {/* Grille calendrier */}
          <div style={{ flex:1, overflowX:'auto' }}>
            <table style={{ borderCollapse:'collapse', width:'100%', minWidth:'600px' }}>
              <thead>
                <tr>
                  <th style={{ width:'45px', background:'#f8f9fa', border:'1px solid #e0e0e0',
                    fontSize:'11px', color:'#888' }}></th>
                  {semaine.map(jour => {
                    const d = dateStr(jour);
                    const estAuj = d === aujourd;
                    const nbJour = getTrajetsJour(d).length;
                    return (
                      <th key={d} style={{ padding:'6px 4px', background: estAuj ? '#E3F2FD' : '#f8f9fa',
                        border:'1px solid #e0e0e0', fontSize:'11px',
                        color: estAuj ? BLEU : '#333',
                        fontWeight: estAuj ? '700' : '500',
                        textAlign:'center', minWidth:'85px' }}>
                        <div>{fmtJour(jour)}</div>
                        {nbJour > 0 && (
                          <div style={{ marginTop:'2px' }}>
                            <span style={{ background:BLEU, color:'white', borderRadius:'10px',
                                padding:'1px 6px', fontSize:'10px' }}>
                              {nbJour} trajet{nbJour>1?'s':''}
                            </span>
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
                      textAlign:'right', fontWeight:'500' }}>
                      {String(h).padStart(2,'0')}h
                    </td>
                    {semaine.map(jour => {
                      const d = dateStr(jour);
                      const t = getTrajetsJourHeure(d, h);
                      const estAuj = d === aujourd;
                      const hPrise = t.length > 0 ? parseInt((t[0].heure_prise||'').split(':')[0]) : null;
                      const isDebut = t.length > 0 && hPrise === h;
                      return (
                        <td key={d+h}
                          onClick={() => t.length > 0 && setSelected(t[0])}
                          style={{
                            border:'1px solid #e8e8e8',
                            background: t.length > 0
                              ? (isDebut ? '#1F4E79' : '#D6E4F0')
                              : estAuj ? '#FAFEFF' : 'white',
                            cursor: t.length > 0 ? 'pointer' : 'default',
                            height:'28px',
                            position:'relative',
                            verticalAlign:'top',
                            padding: isDebut ? '2px 4px' : '0',
                          }}>
                          {isDebut && (
                            <div style={{ fontSize:'10px', color:'white', fontWeight:'600',
                              lineHeight:'1.4' }}>
                              <div>{fmt(t[0].heure_prise)} - {fmt(t[0].heure_arrivee)}</div>
                              <div>{t[0].code_trajet}</div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail trajet selectionne */}
          {selected && (
            <div style={{ width:'260px', flexShrink:0 }}>
              <div style={{ background:BLEU, color:'white', padding:'12px 16px',
                borderRadius:'8px 8px 0 0', display:'flex', justifyContent:'space-between',
                alignItems:'center' }}>
                <span style={{ fontWeight:'600', fontSize:'14px' }}>{selected.code_trajet}</span>
                <button onClick={() => setSelected(null)}
                  style={{ background:'transparent', border:'none', color:'white',
                    cursor:'pointer', fontSize:'18px', lineHeight:1 }}>×</button>
              </div>
              <div style={{ border:'1px solid #ddd', borderTop:'none', borderRadius:'0 0 8px 8px',
                padding:'16px', fontSize:'13px' }}>
                {[
                  { label:'Date', val: selected.date_trajet?.split('T')[0] },
                  { label:'Prise en charge', val: fmt(selected.heure_prise) },
                  { label:'Arrivée prévue', val: fmt(selected.heure_arrivee) },
                  { label:'Type vehicule', val: selected.type_vehicule },
                  { label:'Adresse', val: selected.adresse_prise },
                  { label:'Notes', val: selected.notes || '—' },
                ].map(({label, val}) => (
                  <div key={label} style={{ marginBottom:'10px' }}>
                    <div style={{ fontSize:'11px', color:'#888', marginBottom:'2px' }}>{label}</div>
                    <div style={{ color:'#333', fontWeight: label==='Adresse'?'500':'400' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {trajets.length === 0 && !loading && (
        <div style={{ textAlign:'center', padding:'60px', color:'#aaa' }}>
          <div style={{ fontSize:'48px', marginBottom:'12px' }}>📅</div>
          Aucun trajet prévu cette semaine
        </div>
      )}

      <p style={{ fontSize:'11px', color:'#aaa', marginTop:'8px' }}>
        Cliquez sur un trajet pour voir les details. Les adresses de destination sont confidentielles.
      </p>
    </div>
  );
}
