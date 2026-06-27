import { useState, useEffect } from 'react';
import api from './api';

const BLEU = '#1F4E79';

function fmt(h) { return String(h||'').substring(0,5); }

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const d = new Date(dateStr + 'T12:00:00');
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDatetime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('fr-CA', { year:'numeric', month:'long', day:'numeric',
    hour:'2-digit', minute:'2-digit' });
}

export default function ConsultationPage({ token, user, onLoginRequest }) {
  const [data, setData]       = useState(null);
  const [erreur, setErreur]   = useState('');
  const [loading, setLoading] = useState(true);
  const [consulteLe, setConsulteLe] = useState(null);

  useEffect(() => {
    if (!user) return; // Attendre la connexion
    charger();
  }, [user, token]);

  async function charger() {
    setLoading(true); setErreur('');
    try {
      const res = await api.get(`/consultation/${token}`);
      setData(res.data);
      setConsulteLe(new Date());
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur de chargement';
      setErreur(msg);
    }
    setLoading(false);
  }

  // Si pas connecté → afficher invitation à se connecter
  if (!user) {
    const date = extraireDateDuToken(token);
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'#f0f4f8', fontFamily:'Arial,sans-serif' }}>
        <div style={{ background:'white', padding:'40px', borderRadius:'12px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.1)', maxWidth:'440px', textAlign:'center' }}>
          <div style={{ fontSize:'48px', marginBottom:'16px' }}>🚖</div>
          <h2 style={{ color:BLEU, marginBottom:'8px' }}>Dispatch Taxi</h2>
          <p style={{ color:'#555', marginBottom:'24px', fontSize:'15px' }}>
            Connectez-vous pour consulter votre programme
            {date ? <><br /><strong>du {fmtDate(date)}</strong></> : ''}
          </p>
          <button onClick={onLoginRequest}
            style={{ background:BLEU, color:'white', border:'none', padding:'12px 32px',
              borderRadius:'8px', fontSize:'16px', fontWeight:'600', cursor:'pointer' }}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8', fontFamily:'Arial,sans-serif' }}>
      {/* Header */}
      <div style={{ background:BLEU, padding:'16px 24px', display:'flex',
        justifyContent:'space-between', alignItems:'center' }}>
        <h1 style={{ color:'white', margin:0, fontSize:'20px' }}>Dispatch Taxi</h1>
        <button onClick={() => window.history.back()}
          style={{ background:'transparent', border:'1px solid #ffffff66', color:'white',
            padding:'6px 14px', borderRadius:'6px', cursor:'pointer', fontSize:'13px' }}>
          ← Retour au portail
        </button>
      </div>

      <div style={{ maxWidth:'900px', margin:'32px auto', padding:'0 16px' }}>
        {loading && (
          <div style={{ textAlign:'center', padding:'60px', color:BLEU }}>
            <div style={{ fontSize:'32px' }}>⏳</div>
            <p>Chargement du programme...</p>
          </div>
        )}

        {erreur && (
          <div style={{ background:'#ffebee', color:'#c62828', padding:'20px',
            borderRadius:'8px', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>⚠️</div>
            <strong>{erreur}</strong>
            <br /><br />
            <small>Ce lien est peut-être expiré (validité 7 jours) ou ne vous est pas destiné.</small>
          </div>
        )}

        {data && !loading && (
          <>
            {/* En-tête programme */}
            <div style={{ background:'white', borderRadius:'12px 12px 0 0',
              padding:'24px', borderBottom:'3px solid ' + BLEU }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
                <div>
                  <h2 style={{ color:BLEU, margin:'0 0 4px 0', fontSize:'22px' }}>
                    Programme du {fmtDate(data.date_programme)}
                  </h2>
                  <p style={{ margin:0, color:'#555' }}>
                    {data.chauffeur.prenom} {data.chauffeur.nom} — N° {data.chauffeur.numero_chauffeur}
                  </p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ background:'#e8f5e9', color:'#2e7d32', padding:'6px 14px',
                    borderRadius:'20px', fontSize:'13px', fontWeight:'600' }}>
                    ✓ Consulté le {fmtDatetime(consulteLe)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tableau des trajets */}
            {data.trajets.length === 0 ? (
              <div style={{ background:'white', padding:'40px', textAlign:'center',
                color:'#888', borderRadius:'0 0 12px 12px' }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>📭</div>
                Aucun trajet assigné pour ce jour.
              </div>
            ) : (
              <div style={{ background:'white', borderRadius:'0 0 12px 12px', overflow:'hidden',
                boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ padding:'16px 24px', background:'#f8f9fa', borderBottom:'1px solid #eee',
                  fontSize:'14px', color:'#555' }}>
                  <strong style={{ color:BLEU }}>{data.trajets.length} trajet{data.trajets.length > 1 ? 's' : ''}</strong> assigné{data.trajets.length > 1 ? 's' : ''}
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
                  <thead>
                    <tr style={{ background:BLEU, color:'white' }}>
                      {['Code','Prise','Fin','Véhicule','Adresse de prise','Destination','Notes'].map(h => (
                        <th key={h} style={{ padding:'12px 14px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.trajets.map((t, i) => (
                      <tr key={t.code_trajet} style={{ background: i%2===0 ? '#fafafa' : 'white',
                        borderBottom:'1px solid #eee' }}>
                        <td style={{ padding:'12px 14px', fontWeight:'700', color:BLEU }}>{t.code_trajet}</td>
                        <td style={{ padding:'12px 14px', fontWeight:'600' }}>{fmt(t.heure_prise)}</td>
                        <td style={{ padding:'12px 14px' }}>{fmt(t.heure_arrivee)}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <span style={{ background: t.type_vehicule === 'BERLINE' ? '#e3f2fd' : '#f3f4f6',
                            color: t.type_vehicule === 'BERLINE' ? '#1565c0' : '#555',
                            padding:'2px 8px', borderRadius:'10px', fontSize:'12px' }}>
                            {t.type_vehicule || 'TAXI'}
                          </span>
                        </td>
                        <td style={{ padding:'12px 14px', maxWidth:'200px' }}>{t.adresse_prise}</td>
                        <td style={{ padding:'12px 14px', maxWidth:'200px', color:'#555' }}>{t.adresse_arrivee || '—'}</td>
                        <td style={{ padding:'12px 14px', color:'#888', fontStyle:'italic' }}>{t.notes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop:'20px', textAlign:'center', color:'#999', fontSize:'12px' }}>
              Ce lien est personnel et valable 7 jours. Ne le partagez pas.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Tente d'extraire la date_programme du token JWT sans vérifier la signature
function extraireDateDuToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.date_programme || null;
  } catch { return null; }
}
