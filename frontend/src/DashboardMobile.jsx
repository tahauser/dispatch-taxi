import { useState, useEffect, useRef } from 'react';
import api from './api';

const BLEU = '#1F4E79';

function fmt(h) { return String(h||'').substring(0,5); }
function addDays(d, n) {
  const r = new Date(d + 'T00:00:00');
  r.setDate(r.getDate() + n);
  return r.toISOString().split('T')[0];
}
function fmtDateLong(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
}

const STATUT_LABEL = {
  proposee:'Proposée', envoyee:'Envoyée', confirmee:'Confirmée',
  en_attente:'En attente', affectee:'Affectée', affecte:'Affecté',
  termine:'Terminé', annule:'Annulé',
};
function fmtStatut(s) { return STATUT_LABEL[s] || s; }

function StatutBadge({ statut }) {
  const cfg = {
    envoyee:    { bg:'#e8f5e9', color:'#2e7d32' },
    proposee:   { bg:'#fff8e1', color:'#f57f17' },
    affectee:   { bg:'#e3f2fd', color:'#1565c0' },
    affecte:    { bg:'#e3f2fd', color:'#1565c0' },
    en_attente: { bg:'#fff8e1', color:'#f57f17' },
    confirmee:  { bg:'#e8f5e9', color:'#2e7d32' },
  }[statut] || { bg:'#f3f4f6', color:'#555' };
  return (
    <span style={{ padding:'2px 8px', borderRadius:'10px', fontSize:'11px',
      fontWeight:'600', background:cfg.bg, color:cfg.color }}>
      {fmtStatut(statut)}
    </span>
  );
}

function ActionBtn({ onClick, disabled, color, label, icon }) {
  const active = !disabled;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        flex:1, padding:'10px 4px', border:'none', borderRadius:'10px',
        cursor: active ? 'pointer' : 'not-allowed',
        background: active ? color : '#e0e0e0',
        color: active ? 'white' : '#aaa',
        display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
        fontSize:'10px', fontWeight:'600',
      }}>
      <span style={{ fontSize:'20px', lineHeight:1 }}>{icon}</span>
      <span style={{ lineHeight:1.2, textAlign:'center' }}>{label}</span>
    </button>
  );
}

export default function DashboardMobile({ user, onLogout }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate]               = useState(today);
  const [trajets, setTrajets]         = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [dispos, setDispos]           = useState([]);
  const [onglet, setOnglet]           = useState('affectations');
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState('');
  const [msgType, setMsgType]         = useState('ok');
  const [dejaPropose, setDejaPropose] = useState(false);
  const [dejaEnvoye, setDejaEnvoye]   = useState(false);
  const msgTimer = useRef(null);

  useEffect(() => { charger(); }, [date]);

  async function charger() {
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
      setDejaEnvoye(a.data.length > 0 && a.data.every(x => x.statut === 'envoyee'));
      setDispos(d.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function showMsg(text, type = 'ok') {
    setMessage(text); setMsgType(type);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMessage(''), 6000);
  }

  async function proposer() {
    setLoading(true);
    try {
      const res = await api.post(`/affectations/proposer?date=${date}`);
      showMsg(res.data.message, 'ok');
      setDejaPropose(true);
      await charger();
    } catch (err) { showMsg(err.response?.data?.message || 'Erreur', 'err'); }
    setLoading(false);
  }

  async function reinitialiser() {
    if (!window.confirm('Supprimer TOUTES les affectations du ' + date + ' ?')) return;
    setLoading(true);
    try {
      const res = await api.delete(`/affectations/reinitialiser?date=${date}`);
      showMsg(res.data.message, 'ok');
      setDejaPropose(false); setDejaEnvoye(false);
      await charger();
    } catch (err) { showMsg(err.response?.data?.message || 'Erreur', 'err'); }
    setLoading(false);
  }

  async function envoyer() {
    if (!confirm('Envoyer les programmes par email à tous les chauffeurs ?')) return;
    setLoading(true);
    try {
      const res = await api.post(`/affectations/envoyer?date=${date}`);
      showMsg(res.data.message, 'ok');
      setDejaEnvoye(true);
      await charger();
    } catch (err) { showMsg(err.response?.data?.message || 'Erreur', 'err'); }
    setLoading(false);
  }

  async function renvoyer() {
    if (!confirm('Renvoyer tous les programmes par email ?')) return;
    setLoading(true);
    try {
      const res = await api.post(`/affectations/envoyer?date=${date}`);
      showMsg(res.data.message, 'ok');
      await charger();
    } catch (err) { showMsg(err.response?.data?.message || 'Erreur', 'err'); }
    setLoading(false);
  }

  const nbAffectes     = affectations.length;
  const nbNonAffectes  = trajets.filter(t => !affectations.find(a => a.trajet_id === t.id)).length;
  const nbDisposChauff = [...new Set(dispos.map(d => d.chauffeur_id))].length;
  const estAujourdhui  = date === today;

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8', fontFamily:'Arial,sans-serif',
      display:'flex', flexDirection:'column' }}>

      {/* Overlay chargement */}
      {loading && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)',
          zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', padding:'24px 36px', borderRadius:'12px',
            textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize:'28px', marginBottom:'8px' }}>⏳</div>
            <div style={{ fontSize:'14px', fontWeight:'600', color:BLEU }}>En cours...</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:BLEU,
        paddingTop:'calc(14px + env(safe-area-inset-top))',
        paddingBottom:'12px', paddingLeft:'16px', paddingRight:'16px',
        flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <div>
            <div style={{ color:'white', fontWeight:'700', fontSize:'17px' }}>Dispatch Taxi</div>
            <div style={{ color:'#D6E4F0', fontSize:'11px' }}>{user.prenom} {user.nom}</div>
          </div>
          <button onClick={onLogout}
            style={{ background:'transparent', border:'1px solid #ffffff66', color:'white',
              padding:'5px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>
            Déconnexion
          </button>
        </div>

        {/* Sélecteur de date */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button onClick={() => setDate(d => addDays(d, -1))}
            style={{ width:'34px', height:'34px', background:'rgba(255,255,255,0.15)',
              border:'1px solid rgba(255,255,255,0.3)', borderRadius:'50%',
              color:'white', cursor:'pointer', fontSize:'18px',
              display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>

          <div style={{ flex:1, textAlign:'center' }}>
            <div style={{ color:'white', fontWeight:'600', fontSize:'13px', textTransform:'capitalize' }}>
              {fmtDateLong(date)}
            </div>
            {estAujourdhui && (
              <span style={{ fontSize:'10px', background:'rgba(255,255,255,0.2)',
                color:'white', padding:'1px 8px', borderRadius:'10px' }}>
                Aujourd'hui
              </span>
            )}
          </div>

          <button onClick={() => setDate(d => addDays(d, 1))}
            style={{ width:'34px', height:'34px', background:'rgba(255,255,255,0.15)',
              border:'1px solid rgba(255,255,255,0.3)', borderRadius:'50%',
              color:'white', cursor:'pointer', fontSize:'18px',
              display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 12px',
        paddingBottom:'calc(72px + env(safe-area-inset-bottom))' }}>

        {/* Stats résumé */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'12px' }}>
          {[
            { label:'Trajets',   value: trajets.length,     color:'#1F4E79', bg:'#e3f2fd' },
            { label:'Affectés',  value: nbAffectes,          color:'#2e7d32', bg:'#e8f5e9' },
            { label:'Attente',   value: nbNonAffectes,       color: nbNonAffectes > 0 ? '#c62828' : '#2e7d32', bg: nbNonAffectes > 0 ? '#ffebee' : '#e8f5e9' },
            { label:'Dispos',    value: nbDisposChauff,      color:'#1565c0', bg:'#e8eaf6' },
          ].map(s => (
            <div key={s.label} style={{ background:s.bg, borderRadius:'10px', padding:'8px 4px',
              textAlign:'center' }}>
              <div style={{ fontSize:'20px', fontWeight:'700', color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:s.color, marginTop:'2px', fontWeight:'500' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Boutons d'action */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
          <ActionBtn icon="🎯" label="Proposer" onClick={proposer}
            disabled={loading || dejaPropose || trajets.length === 0} color="#2E75B6" />
          <ActionBtn icon="🗑️" label="Réinit." onClick={reinitialiser}
            disabled={loading || !dejaPropose} color="#c62828" />
          <ActionBtn icon="📧" label="Envoyer" onClick={envoyer}
            disabled={loading || nbAffectes === 0 || dejaEnvoye} color="#375623" />
          <ActionBtn icon="🔄" label="Renvoyer" onClick={renvoyer}
            disabled={loading || !dejaEnvoye} color="#5c6bc0" />
          <ActionBtn icon="↻" label="Actualiser" onClick={charger}
            disabled={loading} color="#607D8B" />
        </div>

        {/* Message */}
        {message && (
          <div style={{ background: msgType === 'err' ? '#ffebee' : '#e8f5e9',
            color: msgType === 'err' ? '#c62828' : '#2e7d32',
            padding:'10px 14px', borderRadius:'8px', marginBottom:'12px',
            fontSize:'13px', fontWeight:'500', display:'flex', justifyContent:'space-between' }}>
            <span>{message}</span>
            <button onClick={() => setMessage('')}
              style={{ background:'none', border:'none', cursor:'pointer',
                fontSize:'16px', color:'inherit', lineHeight:1 }}>×</button>
          </div>
        )}

        {/* Contenu onglet */}
        {onglet === 'affectations' && (
          affectations.length === 0 ? (
            <div style={{ textAlign:'center', padding:'50px 20px', color:'#bbb' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>📋</div>
              <div style={{ fontSize:'15px', fontWeight:'500' }}>Aucune affectation</div>
              <div style={{ fontSize:'13px', marginTop:'4px' }}>Appuyez sur "Proposer" pour lancer l'algorithme</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {affectations.map(a => (
                <div key={a.id} style={{ background:'white', borderRadius:'12px',
                  boxShadow:'0 1px 6px rgba(0,0,0,0.08)', overflow:'hidden' }}>
                  <div style={{ background:BLEU, padding:'8px 14px',
                    display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ color:'white', fontWeight:'700', fontSize:'15px' }}>{a.code_trajet}</span>
                    <span style={{ color:'#D6E4F0', fontSize:'13px' }}>
                      {fmt(a.heure_prise)} → {fmt(a.heure_arrivee)}
                    </span>
                  </div>
                  <div style={{ padding:'10px 14px', display:'flex',
                    justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:'600', color:'#333' }}>
                        {a.prenom} {a.nom}
                      </div>
                      <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>
                        N° {a.numero_chauffeur} · {a.type_vehicule}
                      </div>
                      {a.adresse_prise && (
                        <div style={{ fontSize:'11px', color:'#666', marginTop:'4px',
                          display:'flex', gap:'4px', alignItems:'flex-start' }}>
                          <span>📍</span>
                          <span style={{ lineHeight:'1.3' }}>{a.adresse_prise}</span>
                        </div>
                      )}
                    </div>
                    <StatutBadge statut={a.statut} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {onglet === 'trajets' && (
          trajets.length === 0 ? (
            <div style={{ textAlign:'center', padding:'50px 20px', color:'#bbb' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>🚕</div>
              <div style={{ fontSize:'15px', fontWeight:'500' }}>Aucun trajet ce jour</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {trajets.map(t => {
                const affecte = affectations.find(a => a.trajet_id === t.id);
                return (
                  <div key={t.id} style={{ background:'white', borderRadius:'12px',
                    boxShadow:'0 1px 6px rgba(0,0,0,0.08)', overflow:'hidden' }}>
                    <div style={{ background: affecte ? '#1F4E79' : '#FF9800',
                      padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color:'white', fontWeight:'700', fontSize:'15px' }}>{t.code_trajet}</span>
                      <span style={{ color:'rgba(255,255,255,0.85)', fontSize:'13px' }}>
                        {fmt(t.heure_prise)} → {fmt(t.heure_arrivee)}
                      </span>
                    </div>
                    <div style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'flex-start', marginBottom:'6px' }}>
                        <div style={{ fontSize:'12px', color:'#555', fontWeight:'500' }}>
                          {t.type_vehicule}
                        </div>
                        <StatutBadge statut={affecte ? 'affecte' : 'en_attente'} />
                      </div>
                      {t.adresse_prise && (
                        <div style={{ fontSize:'12px', color:'#666',
                          display:'flex', gap:'4px', alignItems:'flex-start' }}>
                          <span>📍</span>
                          <span style={{ lineHeight:'1.3' }}>{t.adresse_prise}</span>
                        </div>
                      )}
                      {affecte && (
                        <div style={{ marginTop:'6px', fontSize:'12px', color:BLEU, fontWeight:'600' }}>
                          👤 {affecte.prenom} {affecte.nom} (N° {affecte.numero_chauffeur})
                        </div>
                      )}
                      {t.notes && (
                        <div style={{ marginTop:'4px', fontSize:'11px', color:'#888',
                          fontStyle:'italic' }}>📝 {t.notes}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {onglet === 'dispos' && (
          nbDisposChauff === 0 ? (
            <div style={{ textAlign:'center', padding:'50px 20px', color:'#bbb' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>🕐</div>
              <div style={{ fontSize:'15px', fontWeight:'500' }}>Aucune disponibilité</div>
              <div style={{ fontSize:'13px', marginTop:'4px' }}>
                Aucun chauffeur n'a soumis ses disponibilités pour ce jour
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {/* Grouper les dispos par chauffeur */}
              {Object.values(
                dispos.reduce((acc, d) => {
                  if (!acc[d.chauffeur_id]) acc[d.chauffeur_id] = { ...d, plages: [] };
                  acc[d.chauffeur_id].plages.push({ debut: d.heure_debut, fin: d.heure_fin });
                  return acc;
                }, {})
              ).map(ch => (
                <div key={ch.chauffeur_id} style={{ background:'white', borderRadius:'12px',
                  boxShadow:'0 1px 6px rgba(0,0,0,0.08)', padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', marginBottom:'6px' }}>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:'700', color:'#333' }}>
                        {ch.prenom} {ch.nom}
                      </div>
                      <div style={{ fontSize:'11px', color:'#888' }}>
                        N° {ch.numero_chauffeur} · {ch.type_vehicule}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:'11px', background:'#e8f5e9', color:'#2e7d32',
                        padding:'2px 8px', borderRadius:'10px', fontWeight:'600' }}>
                        {affectations.filter(a => a.chauffeur_id === ch.chauffeur_id).length} trajet(s)
                      </span>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                    {ch.plages.map((p, i) => (
                      <span key={i} style={{ background:'#E3F2FD', color:BLEU,
                        padding:'3px 10px', borderRadius:'8px', fontSize:'12px', fontWeight:'500' }}>
                        🕐 {fmt(p.debut)} – {fmt(p.fin)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Navigation bas */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:'white', borderTop:'1px solid #e0e0e0',
        paddingBottom:'env(safe-area-inset-bottom)',
        display:'flex', zIndex:100,
        boxShadow:'0 -2px 10px rgba(0,0,0,0.08)'
      }}>
        {[
          { id:'affectations', icon:'📋', label:'Affectations', badge: nbAffectes },
          { id:'trajets',      icon:'🚕', label:'Trajets',       badge: trajets.length },
          { id:'dispos',       icon:'🕐', label:'Disponibilités', badge: nbDisposChauff },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            style={{
              flex:1, padding:'10px 4px 8px', border:'none', background:'transparent',
              cursor:'pointer', display:'flex', flexDirection:'column',
              alignItems:'center', gap:'3px',
              color: onglet === o.id ? BLEU : '#999',
              borderTop: onglet === o.id ? `3px solid ${BLEU}` : '3px solid transparent',
            }}>
            <span style={{ fontSize:'22px', lineHeight:1, position:'relative' }}>
              {o.icon}
              {o.badge > 0 && (
                <span style={{ position:'absolute', top:'-2px', right:'-6px',
                  background: o.id === 'trajets' && nbNonAffectes > 0 ? '#c62828' : BLEU,
                  color:'white', borderRadius:'10px', fontSize:'9px', fontWeight:'700',
                  padding:'1px 4px', minWidth:'14px', textAlign:'center',
                  lineHeight:'14px', display:'inline-block' }}>
                  {o.badge}
                </span>
              )}
            </span>
            <span style={{ fontSize:'11px', fontWeight: onglet === o.id ? '700' : '400' }}>
              {o.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
