import CalendrierDispatch from './CalendrierDispatch';
import { useState, useEffect, useRef } from 'react';
import api from './api';

const BLEU = '#1F4E79';
const BLEU_CLAIR = '#D6E4F0';

function fmt(h) { return String(h||'').substring(0,5); }
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-CA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

const STATUT_LABEL = {
  proposee:   'Proposée',
  envoyee:    'Envoyée',
  confirmee:  'Confirmée',
  en_attente: 'En attente',
  affectee:   'Affectée',
  affecte:    'Affecté',
  termine:    'Terminé',
  annule:     'Annulé',
};
function fmtStatut(s) { return STATUT_LABEL[s] || s; }

export default function Dashboard({ user, onLogout }) {
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0]);
  const [trajets, setTrajets]         = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [dispos, setDispos]           = useState([]);
  const [chauffeurs, setChauffeurs]   = useState([]);
  const [onglet, setOnglet] = useState('calendrier');
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState('');
  const msgTimer = useRef(null);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [dejaPropose, setDejaPropose] = useState(false);
  const [dejaEnvoye, setDejaEnvoye] = useState(false);

  useEffect(() => { chargerDonnees(); }, [date]);

  async function chargerDonnees() {
    setLoading(true);
    try {
      const [t, a, d] = await Promise.all([
        api.get(`/trajets?date=${date}`),
        api.get(`/affectations?date=${date}`),
        api.get(`/disponibilites?date=${date}`),
      ]);
      setTrajets(t.data);
      setAffectations(a.data);
      setDejaPropose(a.data.length > 0);
      if (a.data.length > 0) setDejaEnvoye(a.data.every(x => x.statut === 'envoyee'));
      setDispos(d.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  async function proposerAffectations() {
    setLoading(true); setMessage('');
    try {
      const res = await api.post(`/affectations/proposer?date=${date}`);
      setMessage(res.data.message);
      setDejaPropose(true);
      if (msgTimer.current) clearTimeout(msgTimer.current);
      msgTimer.current = setTimeout(() => setMessage(''), 8000);
      setRefreshKey(k => k+1);
      await chargerDonnees();
    } catch (err) { setMessage(err.response?.data?.message || 'Erreur'); }
    setLoading(false);
  }

  async function reinitialiserAffectations() {
    if (!window.confirm('Supprimer TOUTES les affectations du ' + date + ' ?')) return;
    setLoading(true); setMessage(''); setDejaPropose(false); setDejaEnvoye(false);
    try {
      const res = await api.delete(`/affectations/reinitialiser?date=${date}`);
      setMessage(res.data.message);
      if (msgTimer.current) clearTimeout(msgTimer.current);
      msgTimer.current = setTimeout(() => setMessage(''), 8000);
      setRefreshKey(k => k+1);
      await chargerDonnees();
    } catch (err) { setMessage(err.response?.data?.message || 'Erreur'); }
    setLoading(false);
  }

  async function renvoyerProgrammes() {
    if (!confirm('Renvoyer tous les programmes par email?')) return;
    setLoading(true); setMessage('');
    try {
      const res = await api.post(`/affectations/envoyer?date=${date}`);
      setMessage(res.data.message);
      setDejaEnvoye(true);
      setRefreshKey(k => k+1);
      await chargerDonnees();
    } catch (err) { setMessage(err.response?.data?.message || 'Erreur'); }
    setLoading(false);
  }
  async function envoyerIndividuel(chauffeurId) {
    try {
      await api.post(`/affectations/envoyer/${chauffeurId}?date=${date}`);
      setMessage('Email envoyé avec succès');
      if (msgTimer.current) clearTimeout(msgTimer.current);
      msgTimer.current = setTimeout(() => setMessage(''), 4000);
      await chargerDonnees();
    } catch (err) { setMessage('Erreur envoi'); }
  }
  async function envoyerProgrammes() {
    if (!confirm('Envoyer les programmes par email a tous les chauffeurs?')) return;
    setLoading(true); setMessage('');
    try {
      const res = await api.post(`/affectations/envoyer?date=${date}`);
      setMessage(res.data.message);
      if (msgTimer.current) clearTimeout(msgTimer.current);
      msgTimer.current = setTimeout(() => setMessage(''), 8000);
      await chargerDonnees();
      setDejaEnvoye(true);
    } catch (err) { setMessage(err.response?.data?.message || 'Erreur'); }
    setLoading(false);
  }

  const nbAffectes    = affectations.length;
  const nbNonAffectes = trajets.filter(t => !affectations.find(a => a.trajet_id === t.id)).length;
  const nbDispos      = [...new Set(dispos.map(d => d.chauffeur_id))].length;

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8', fontFamily:'Arial,sans-serif' }}>
      {loading && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.4)',
          zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', padding:'32px 48px', borderRadius:'12px',
            textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>⏳</div>
            <div style={{ fontSize:'16px', fontWeight:'600', color:'#1F4E79' }}>Envoi en cours...</div>
            <div style={{ fontSize:'13px', color:'#888', marginTop:'8px' }}>Veuillez patienter</div>
          </div>
        </div>
      )}
      {/* Header */}
      <div style={{ background:BLEU, padding:'16px 24px', display:'flex',
        justifyContent:'space-between', alignItems:'center' }}>
        <h1 style={{ color:'white', margin:0, fontSize:'20px' }}>Dispatch Taxi</h1>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <span style={{ color:BLEU_CLAIR, fontSize:'14px' }}>{user.prenom} {user.nom}</span>
          <button onClick={onLogout}
            style={{ background:'transparent', border:'1px solid #ffffff66', color:'white',
              padding:'6px 14px', borderRadius:'6px', cursor:'pointer', fontSize:'13px' }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ padding:'16px 8px', maxWidth:'100%', margin:'0 auto' }}>
        {/* Selecteur date + actions */}
        <div style={{ display:'flex', gap:'12px', alignItems:'center', marginBottom:'24px', flexWrap:'wrap' }}>
          <button onClick={() => { const d=new Date(date); d.setDate(d.getDate()-1); setDate(d.toISOString().split('T')[0]); }}
            style={{ padding:'8px 12px', background:'white', border:'1px solid #ddd', borderRadius:'6px', cursor:'pointer', fontSize:'18px' }}>‹</button>
          <input type="date" value={date} onChange={e => { if (e.target.value) setDate(e.target.value); else setDate(new Date().toISOString().split('T')[0]); }}
            style={{ padding:'8px 12px', border:'1px solid #ddd', borderRadius:'6px',
              fontSize:'14px', background:'white' }} />
          <button onClick={() => { const d=new Date(date); d.setDate(d.getDate()+1); setDate(d.toISOString().split('T')[0]); }}
            style={{ padding:'8px 12px', background:'white', border:'1px solid #ddd', borderRadius:'6px', cursor:'pointer', fontSize:'18px' }}>›</button>
          <button onClick={proposerAffectations} disabled={loading || nbNonAffectes === 0}
            style={{ padding:'8px 16px', background: nbNonAffectes === 0 ? '#e0e0e0' : '#2E75B6', color: nbNonAffectes === 0 ? '#999' : 'white', border: nbNonAffectes === 0 ? '1px solid #ccc' : 'none',
              borderRadius:'6px', cursor: nbNonAffectes === 0 ? 'not-allowed' : 'pointer', fontWeight:'500' }}>
            {loading ? '...' : 'Proposer affectations'}
          </button>
          <button onClick={reinitialiserAffectations} disabled={loading || !dejaPropose}
            style={{ padding:'8px 16px', background: dejaPropose ? '#c62828' : '#e0e0e0', color: dejaPropose ? 'white' : '#999', border: dejaPropose ? 'none' : '1px solid #ccc',
              borderRadius:'6px', cursor: dejaPropose ? 'pointer' : 'not-allowed', fontWeight:'500' }}>
            Réinitialiser
          </button>
          <button onClick={envoyerProgrammes} disabled={loading || nbAffectes === 0 || dejaEnvoye}
            style={{ padding:'8px 16px', background: (dejaEnvoye || nbAffectes === 0) ? '#e0e0e0' : '#375623',
              color: (dejaEnvoye || nbAffectes === 0) ? '#999' : 'white', border: (dejaEnvoye || nbAffectes === 0) ? '1px solid #ccc' : 'none',
              borderRadius:'6px', cursor: (dejaEnvoye || nbAffectes === 0) ? 'not-allowed' : 'pointer', fontWeight:'500' }}>
            Envoyer programmes
          </button>
          <button onClick={renvoyerProgrammes} disabled={loading || !dejaEnvoye}
            style={{ padding:'8px 16px', background: dejaEnvoye ? '#5c6bc0' : '#e0e0e0',
              color: dejaEnvoye ? 'white' : '#999', border:'none',
              borderRadius:'6px', cursor: dejaEnvoye ? 'pointer' : 'not-allowed',
              fontWeight:'500' }}>
            🔄 Renvoyer tout
          </button>
          <button onClick={chargerDonnees}
            style={{ padding:'8px 16px', background:'white', color:BLEU, border:'1px solid #ddd',
              borderRadius:'6px', cursor:'pointer' }}>
            Actualiser
          </button>
        </div>

        {message && <div style={{ background: message.includes('Erreur') ? '#ffebee' : '#e8f5e9',
          color: message.includes('Erreur') ? '#c62828' : '#2e7d32',
          padding:'12px 16px', borderRadius:'8px', marginBottom:'16px' }}>{message}</div>}


        {/* Onglets */}
        <div style={{ display:'flex', gap:'4px', marginBottom:'16px' }}>
          {['calendrier','affectations','trajets','disponibilites'].map(o => (
            <button key={o} onClick={() => { setOnglet(o); if (o === 'affectations') chargerDonnees(); }}
              style={{ padding:'8px 20px', border:'none', borderRadius:'6px 6px 0 0',
                cursor:'pointer', fontWeight: onglet===o ? '600' : '400',
                background: onglet===o ? 'white' : '#e0e9f3',
                color: onglet===o ? BLEU : '#555', fontSize:'14px' }}>
              {o==='calendrier'?'📅 Calendrier':o==='affectations'?'Affectations':o==='trajets'?'Trajets':'Disponibilités'}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div style={{ background:'white', borderRadius:'0 10px 10px 10px',
          boxShadow:'0 2px 8px rgba(0,0,0,0.08)', overflow:'hidden' }}>

          {onglet==='calendrier' && <CalendrierDispatch onEnvoiIndividuel={envoyerIndividuel} onRefresh={chargerDonnees} date={date} refreshKey={refreshKey} />}

          {/* Tableau affectations */}
          {onglet==='affectations' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
              <thead>
                <tr style={{ background:BLEU, color:'white' }}>
                  {['Trajet','Prise','Fin','Vehicule','Adresse prise','Chauffeur','Statut'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affectations.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding:'40px', textAlign:'center', color:'#999' }}>
                    Aucune affectation — cliquez sur "Proposer affectations"
                  </td></tr>
                ) : affectations.map((a,i) => (
                  <tr key={a.id} style={{ background: i%2===0 ? '#fafafa' : 'white',
                    borderBottom:'1px solid #eee' }}>
                    <td style={{ padding:'12px 16px', fontWeight:'600', color:BLEU }}>{a.code_trajet}</td>
                    <td style={{ padding:'12px 16px' }}>{fmt(a.heure_prise)}</td>
                    <td style={{ padding:'12px 16px' }}>{fmt(a.heure_arrivee)}</td>
                    <td style={{ padding:'12px 16px' }}>{a.type_vehicule}</td>
                    <td style={{ padding:'12px 16px', maxWidth:'200px', overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.adresse_prise}</td>
                    <td style={{ padding:'12px 16px' }}>{a.prenom} {a.nom} ({a.numero_chauffeur})</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:'12px', fontSize:'12px',
                        background: a.statut==='envoyee' ? '#e8f5e9' :
                          a.statut==='proposee' ? '#fff8e1' : '#f3f4f6',
                        color: a.statut==='envoyee' ? '#2e7d32' :
                          a.statut==='proposee' ? '#f57f17' : '#555' }}>
                        {fmtStatut(a.statut)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Tableau trajets */}
          {onglet==='trajets' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
              <thead>
                <tr style={{ background:BLEU, color:'white' }}>
                  {['Trajet','Prise','Fin','Vehicule','Adresse prise','Statut','Notes'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trajets.map((t,i) => (
                  <tr key={t.id} style={{ background: i%2===0 ? '#fafafa' : 'white',
                    borderBottom:'1px solid #eee' }}>
                    <td style={{ padding:'12px 16px', fontWeight:'600', color:BLEU }}>{t.code_trajet}</td>
                    <td style={{ padding:'12px 16px' }}>{fmt(t.heure_prise)}</td>
                    <td style={{ padding:'12px 16px' }}>{fmt(t.heure_arrivee)}</td>
                    <td style={{ padding:'12px 16px' }}>{t.type_vehicule}</td>
                    <td style={{ padding:'12px 16px', maxWidth:'220px', overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.adresse_prise}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:'12px', fontSize:'12px',
                        background: t.statut==='en_attente' ? '#fff8e1' : t.statut==='affecte' ? '#e3f2fd' : '#e8f5e9',
                        color: t.statut==='en_attente' ? '#f57f17' : t.statut==='affecte' ? '#1565c0' : '#2e7d32' }}>
                        {fmtStatut(t.statut)}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', color:'#888', fontStyle:'italic' }}>{t.notes||''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Tableau disponibilites */}
          {onglet==='disponibilites' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
              <thead>
                <tr style={{ background:BLEU, color:'white' }}>
                  {['No','Chauffeur','Type','Debut','Fin'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dispos.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding:'40px', textAlign:'center', color:'#999' }}>
                    Aucune disponibilité pour cette date
                  </td></tr>
                ) : dispos.map((d,i) => (
                  <tr key={d.id} style={{ background: i%2===0 ? '#fafafa' : 'white',
                    borderBottom:'1px solid #eee' }}>
                    <td style={{ padding:'12px 16px', fontWeight:'600', color:BLEU }}>{d.numero_chauffeur}</td>
                    <td style={{ padding:'12px 16px' }}>{d.prenom} {d.nom}</td>
                    <td style={{ padding:'12px 16px' }}>{d.type_vehicule}</td>
                    <td style={{ padding:'12px 16px' }}>{fmt(d.heure_debut)}</td>
                    <td style={{ padding:'12px 16px' }}>{fmt(d.heure_fin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
