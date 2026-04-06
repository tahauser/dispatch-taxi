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
function toMin(t) {
  if (!t) return 0;
  const p = String(t).split(':');
  return Number(p[0]) * 60 + Number(p[1] || 0);
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

// Modal sélection chauffeur
function ModalAffecter({ trajet, chauffeurs, dispos, affectations, onAffecter, onClose }) {
  function hasConflict(chId) {
    const tD = toMin(trajet.heure_prise), tF = toMin(trajet.heure_arrivee);
    return affectations.filter(a => a.chauffeur_id === chId).some(a => {
      if (a.trajet_id === trajet.id) return false;
      return toMin(a.heure_prise) < tF && toMin(a.heure_arrivee) > tD;
    });
  }
  function hasDispo(chId) {
    return dispos.some(d => {
      if (d.chauffeur_id !== chId) return false;
      const hP = toMin(trajet.heure_prise);
      return toMin(d.heure_debut) <= hP && toMin(d.heure_fin) > hP;
    });
  }

  const sorted = [...chauffeurs].sort((a, b) => {
    const aOk = hasDispo(a.id) && !hasConflict(a.id);
    const bOk = hasDispo(b.id) && !hasConflict(b.id);
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    return a.nom.localeCompare(b.nom);
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9998, display:'flex',
      flexDirection:'column', justifyContent:'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'absolute', inset:0,
        background:'rgba(0,0,0,0.5)' }} />

      {/* Bottom sheet */}
      <div style={{ position:'relative', background:'white', borderRadius:'20px 20px 0 0',
        maxHeight:'75vh', display:'flex', flexDirection:'column',
        paddingBottom:'env(safe-area-inset-bottom)' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
          <div style={{ width:'40px', height:'4px', background:'#ddd', borderRadius:'2px' }} />
        </div>

        {/* Titre */}
        <div style={{ padding:'8px 20px 12px', borderBottom:'1px solid #f0f0f0' }}>
          <div style={{ fontWeight:'700', color:BLEU, fontSize:'16px' }}>
            Affecter {trajet.code_trajet}
          </div>
          <div style={{ fontSize:'13px', color:'#888', marginTop:'2px' }}>
            {fmt(trajet.heure_prise)} → {fmt(trajet.heure_arrivee)} · {trajet.type_vehicule}
          </div>
        </div>

        {/* Liste chauffeurs */}
        <div style={{ overflowY:'auto', flex:1 }}>
          {sorted.map(ch => {
            const conflict = hasConflict(ch.id);
            const dispo    = hasDispo(ch.id);
            const nbAff    = affectations.filter(a => a.chauffeur_id === ch.id).length;
            return (
              <button key={ch.id}
                onClick={() => onAffecter(ch)}
                style={{
                  width:'100%', padding:'14px 20px', border:'none', borderBottom:'1px solid #f5f5f5',
                  background: conflict ? '#fff8f8' : dispo ? '#f0fdf4' : 'white',
                  cursor: conflict ? 'not-allowed' : 'pointer',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  textAlign:'left',
                }}>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:'600',
                    color: conflict ? '#aaa' : '#333' }}>
                    {ch.prenom} {ch.nom}
                  </div>
                  <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>
                    N° {ch.numero_chauffeur} · {ch.type_vehicule}
                    {nbAff > 0 && ` · ${nbAff} trajet(s) ce jour`}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column',
                  alignItems:'flex-end', gap:'4px', flexShrink:0, marginLeft:'12px' }}>
                  {conflict ? (
                    <span style={{ fontSize:'11px', background:'#ffebee', color:'#c62828',
                      padding:'2px 8px', borderRadius:'8px', fontWeight:'600' }}>⚠️ Conflit</span>
                  ) : dispo ? (
                    <span style={{ fontSize:'11px', background:'#e8f5e9', color:'#2e7d32',
                      padding:'2px 8px', borderRadius:'8px', fontWeight:'600' }}>✓ Disponible</span>
                  ) : (
                    <span style={{ fontSize:'11px', background:'#fff8e1', color:'#f57f17',
                      padding:'2px 8px', borderRadius:'8px', fontWeight:'600' }}>Sans dispo</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Annuler */}
        <div style={{ padding:'12px 20px' }}>
          <button onClick={onClose}
            style={{ width:'100%', padding:'13px', background:'#f0f4f8', border:'none',
              borderRadius:'10px', cursor:'pointer', fontSize:'14px',
              fontWeight:'600', color:'#555' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardMobile({ user, onLogout }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate]               = useState(today);
  const [trajets, setTrajets]         = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [dispos, setDispos]           = useState([]);
  const [chauffeurs, setChauffeurs]   = useState([]);
  const [onglet, setOnglet]           = useState('affectations');
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState('');
  const [msgType, setMsgType]         = useState('ok');
  const [dejaPropose, setDejaPropose] = useState(false);
  const [dejaEnvoye, setDejaEnvoye]   = useState(false);
  const [trajetAAffecter, setTrajetAAffecter] = useState(null);
  const msgTimer = useRef(null);

  useEffect(() => { charger(); }, [date]);

  async function charger() {
    setLoading(true);
    try {
      const [t, a, d, c] = await Promise.all([
        api.get(`/trajets?date=${date}`),
        api.get(`/affectations?date=${date}`),
        api.get(`/disponibilites?date=${date}`),
        api.get('/chauffeurs'),
      ]);
      setTrajets(t.data);
      setAffectations(a.data);
      setDejaPropose(a.data.length > 0);
      setDejaEnvoye(a.data.length > 0 && a.data.every(x => x.statut === 'envoyee'));
      setDispos(d.data);
      setChauffeurs(c.data);
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

  async function affecter(trajet, chauffeur) {
    setTrajetAAffecter(null);
    setLoading(true);
    try {
      await api.post('/affectations/affecter', {
        trajet_id: trajet.id, chauffeur_id: chauffeur.id, date
      });
      showMsg(`✅ ${trajet.code_trajet} affecté à ${chauffeur.prenom} ${chauffeur.nom}`, 'ok');
      setDejaPropose(true);
      await charger();
    } catch (err) { showMsg('❌ ' + (err.response?.data?.message || 'Erreur'), 'err'); }
    setLoading(false);
  }

  async function retirerAff(aff) {
    if (!window.confirm(`Retirer l'affectation de ${aff.code_trajet} ?`)) return;
    setLoading(true);
    try {
      await api.delete(`/affectations/${aff.id}`);
      showMsg(`${aff.code_trajet} retiré`, 'ok');
      await charger();
    } catch { showMsg('Erreur', 'err'); }
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

      {/* Modal affectation manuelle */}
      {trajetAAffecter && (
        <ModalAffecter
          trajet={trajetAAffecter}
          chauffeurs={chauffeurs}
          dispos={dispos}
          affectations={affectations}
          onAffecter={ch => affecter(trajetAAffecter, ch)}
          onClose={() => setTrajetAAffecter(null)}
        />
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
      <div style={{ flex:1, overflowY:'auto', padding:'12px',
        paddingBottom:'calc(72px + env(safe-area-inset-bottom))' }}>

        {/* Stats résumé */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'12px' }}>
          {[
            { label:'Trajets',  value: trajets.length,    color:'#1F4E79', bg:'#e3f2fd' },
            { label:'Affectés', value: nbAffectes,         color:'#2e7d32', bg:'#e8f5e9' },
            { label:'Attente',  value: nbNonAffectes,      color: nbNonAffectes > 0 ? '#c62828' : '#2e7d32', bg: nbNonAffectes > 0 ? '#ffebee' : '#e8f5e9' },
            { label:'Dispos',   value: nbDisposChauff,     color:'#1565c0', bg:'#e8eaf6' },
          ].map(s => (
            <div key={s.label} style={{ background:s.bg, borderRadius:'10px', padding:'8px 4px', textAlign:'center' }}>
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

        {/* ── Onglet Affectations ── */}
        {onglet === 'affectations' && (
          trajets.length === 0 ? (
            <div style={{ textAlign:'center', padding:'50px 20px', color:'#bbb' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>📋</div>
              <div style={{ fontSize:'15px', fontWeight:'500' }}>Aucun trajet ce jour</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {/* Trajets non affectés en premier */}
              {trajets.filter(t => !affectations.find(a => a.trajet_id === t.id)).map(t => (
                <div key={t.id} style={{ background:'white', borderRadius:'12px',
                  boxShadow:'0 1px 6px rgba(0,0,0,0.08)', overflow:'hidden',
                  border:'2px solid #FFB74D' }}>
                  <div style={{ background:'#FF9800', padding:'8px 14px',
                    display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ color:'white', fontWeight:'700', fontSize:'15px' }}>{t.code_trajet}</span>
                    <span style={{ color:'rgba(255,255,255,0.9)', fontSize:'13px' }}>
                      {fmt(t.heure_prise)} → {fmt(t.heure_arrivee)}
                    </span>
                  </div>
                  <div style={{ padding:'10px 14px', display:'flex',
                    justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:'12px', color:'#555', fontWeight:'500' }}>{t.type_vehicule}</div>
                      {t.adresse_prise && (
                        <div style={{ fontSize:'11px', color:'#666', marginTop:'4px',
                          display:'flex', gap:'4px' }}>
                          <span>📍</span>
                          <span style={{ lineHeight:'1.3' }}>{t.adresse_prise}</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setTrajetAAffecter(t)}
                      style={{ padding:'8px 14px', background:BLEU, color:'white',
                        border:'none', borderRadius:'8px', cursor:'pointer',
                        fontSize:'13px', fontWeight:'600', flexShrink:0, marginLeft:'10px' }}>
                      👤 Affecter
                    </button>
                  </div>
                </div>
              ))}

              {/* Séparateur si les deux existent */}
              {affectations.length > 0 && nbNonAffectes > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'4px 0' }}>
                  <div style={{ flex:1, height:'1px', background:'#e0e0e0' }} />
                  <span style={{ fontSize:'11px', color:'#aaa', fontWeight:'600' }}>
                    AFFECTÉS ({affectations.length})
                  </span>
                  <div style={{ flex:1, height:'1px', background:'#e0e0e0' }} />
                </div>
              )}

              {/* Trajets affectés */}
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
                  <div style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:'14px', fontWeight:'600', color:'#333' }}>
                          {a.prenom} {a.nom}
                        </div>
                        <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>
                          N° {a.numero_chauffeur} · {a.type_vehicule}
                        </div>
                        {a.adresse_prise && (
                          <div style={{ fontSize:'11px', color:'#666', marginTop:'4px',
                            display:'flex', gap:'4px' }}>
                            <span>📍</span>
                            <span style={{ lineHeight:'1.3' }}>{a.adresse_prise}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column',
                        alignItems:'flex-end', gap:'6px', flexShrink:0, marginLeft:'10px' }}>
                        <StatutBadge statut={a.statut} />
                        <button onClick={() => retirerAff(a)}
                          style={{ fontSize:'11px', padding:'4px 10px', background:'#ffebee',
                            color:'#c62828', border:'none', borderRadius:'8px',
                            cursor:'pointer', fontWeight:'600' }}>
                          ✕ Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Onglet Trajets ── */}
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
                    <div style={{ background: affecte ? BLEU : '#FF9800',
                      padding:'8px 14px', display:'flex',
                      justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color:'white', fontWeight:'700', fontSize:'15px' }}>{t.code_trajet}</span>
                      <span style={{ color:'rgba(255,255,255,0.9)', fontSize:'13px' }}>
                        {fmt(t.heure_prise)} → {fmt(t.heure_arrivee)}
                      </span>
                    </div>
                    <div style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'flex-start' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'12px', color:'#555', fontWeight:'500',
                            marginBottom:'4px' }}>
                            {t.type_vehicule}
                          </div>
                          {t.adresse_prise && (
                            <div style={{ fontSize:'12px', color:'#666',
                              display:'flex', gap:'4px', alignItems:'flex-start' }}>
                              <span>📍</span>
                              <span style={{ lineHeight:'1.3' }}>{t.adresse_prise}</span>
                            </div>
                          )}
                          {affecte ? (
                            <div style={{ marginTop:'8px' }}>
                              <div style={{ fontSize:'12px', color:BLEU, fontWeight:'600', marginBottom:'6px' }}>
                                👤 {affecte.prenom} {affecte.nom} (N° {affecte.numero_chauffeur})
                              </div>
                              <div style={{ display:'flex', gap:'6px' }}>
                                <button onClick={() => setTrajetAAffecter(t)}
                                  style={{ padding:'6px 12px', background:'#E3F2FD', color:BLEU,
                                    border:'none', borderRadius:'8px', cursor:'pointer',
                                    fontSize:'12px', fontWeight:'600' }}>
                                  🔄 Réaffecter
                                </button>
                                <button onClick={() => retirerAff(affecte)}
                                  style={{ padding:'6px 12px', background:'#ffebee', color:'#c62828',
                                    border:'none', borderRadius:'8px', cursor:'pointer',
                                    fontSize:'12px', fontWeight:'600' }}>
                                  ✕ Retirer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setTrajetAAffecter(t)}
                              style={{ marginTop:'8px', padding:'7px 14px',
                                background:BLEU, color:'white', border:'none',
                                borderRadius:'8px', cursor:'pointer',
                                fontSize:'13px', fontWeight:'600' }}>
                              👤 Affecter un chauffeur
                            </button>
                          )}
                          {t.notes && (
                            <div style={{ marginTop:'4px', fontSize:'11px',
                              color:'#888', fontStyle:'italic' }}>📝 {t.notes}</div>
                          )}
                        </div>
                        <div style={{ flexShrink:0, marginLeft:'10px' }}>
                          <StatutBadge statut={affecte ? 'affecte' : 'en_attente'} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Onglet Dispos ── */}
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
                    <span style={{ fontSize:'11px', background:'#e8f5e9', color:'#2e7d32',
                      padding:'2px 8px', borderRadius:'10px', fontWeight:'600' }}>
                      {affectations.filter(a => a.chauffeur_id === ch.chauffeur_id).length} trajet(s)
                    </span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                    {ch.plages.map((p, i) => (
                      <span key={i} style={{ background:'#E3F2FD', color:BLEU,
                        padding:'3px 10px', borderRadius:'8px',
                        fontSize:'12px', fontWeight:'500' }}>
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
          { id:'trajets',      icon:'🚕', label:'Trajets',      badge: nbNonAffectes, badgeRed: nbNonAffectes > 0 },
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
                  background: o.badgeRed ? '#c62828' : BLEU,
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
