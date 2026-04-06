import { useState } from 'react';
import CalendrierProgramme from './CalendrierProgramme';
import CalendrierProgrammeMobile from './CalendrierProgrammeMobile';
import CalendrierDispo from './CalendrierDispo';
import CalendrierDispoMobile from './CalendrierDispoMobile';
import useIsMobile from './hooks/useIsMobile';

const BLEU = '#1F4E79';

export default function PortailChauffeur({ user, onLogout }) {
  const [onglet, setOnglet] = useState('programme');
  const [disposDirty, setDisposDirty] = useState(false);
  const isMobile = useIsMobile();

  function changerOnglet(id) {
    if (id !== 'disponibilites' && disposDirty) {
      if (!window.confirm('Vous avez des disponibilités non sauvegardées. Quitter sans sauvegarder ?')) return;
    }
    setOnglet(id);
  }

  if (isMobile) {
    return (
      <div style={{ minHeight:'100vh', background:'#f0f4f8', fontFamily:'Arial,sans-serif',
        display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ background:BLEU, paddingTop:'calc(16px + env(safe-area-inset-top))',
          paddingBottom:'14px', paddingLeft:'16px', paddingRight:'16px',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          flexShrink:0 }}>
          <div>
            <div style={{ color:'white', fontWeight:'700', fontSize:'18px' }}>Dispatch Taxi</div>
            <div style={{ color:'#D6E4F0', fontSize:'12px' }}>
              {user.prenom} {user.nom} · N° {user.numero_chauffeur}
            </div>
          </div>
          <button onClick={onLogout}
            style={{ background:'transparent', border:'1px solid #ffffff66', color:'white',
              padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>
            Déconnexion
          </button>
        </div>

        {/* Contenu scrollable */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px',
          paddingBottom:'calc(72px + env(safe-area-inset-bottom))' }}>
          {onglet === 'programme'      && <CalendrierProgrammeMobile user={user} />}
          {onglet === 'disponibilites' && <CalendrierDispoMobile user={user} onDirtyChange={setDisposDirty} />}
        </div>

        {/* Navigation bas */}
        <div style={{
          position:'fixed', bottom:0, left:0, right:0,
          background:'white',
          borderTop:'1px solid #e0e0e0',
          paddingBottom:'env(safe-area-inset-bottom)',
          display:'flex',
          zIndex:100,
          boxShadow:'0 -2px 10px rgba(0,0,0,0.08)'
        }}>
          {[
            { id:'programme',      icon:'📅', label:'Mon programme' },
            { id:'disponibilites', icon:'🕐', label:'Mes dispos' },
          ].map(o => (
            <button key={o.id} onClick={() => changerOnglet(o.id)}
              style={{
                flex:1,
                padding:'10px 4px 8px',
                border:'none',
                background:'transparent',
                cursor:'pointer',
                display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
                color: onglet === o.id ? BLEU : '#999',
                borderTop: onglet === o.id ? `3px solid ${BLEU}` : '3px solid transparent',
                transition:'color 0.15s',
              }}>
              <span style={{ fontSize:'22px', lineHeight:1, position:'relative' }}>
                {o.icon}
                {o.id === 'disponibilites' && disposDirty && (
                  <span style={{ position:'absolute', top:0, right:'-4px', width:'8px', height:'8px',
                    background:'#e53935', borderRadius:'50%', border:'1.5px solid white' }} />
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

  // ── Version desktop ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8', fontFamily:'Arial,sans-serif' }}>
      <div style={{ background:BLEU, paddingTop:'calc(16px + env(safe-area-inset-top))', paddingBottom:'16px', paddingLeft:'24px', paddingRight:'24px', display:'flex',
        justifyContent:'space-between', alignItems:'center' }}>
        <h1 style={{ color:'white', margin:0, fontSize:'20px' }}>Dispatch Taxi</h1>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <span style={{ color:'#D6E4F0', fontSize:'14px' }}>
            {user.prenom} {user.nom} — N° {user.numero_chauffeur}
          </span>
          <button onClick={onLogout}
            style={{ background:'transparent', border:'1px solid #ffffff66', color:'white',
              padding:'6px 14px', borderRadius:'6px', cursor:'pointer', fontSize:'13px' }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ padding:'24px', maxWidth:'100%', margin:'0 auto' }}>
        <div style={{ display:'flex', gap:'4px', marginBottom:'0' }}>
          {[
            { id:'programme',      label:'📅  Mon programme' },
            { id:'disponibilites', label:'🕐  Mes disponibilités' },
          ].map(o => (
            <button key={o.id} onClick={() => changerOnglet(o.id)}
              style={{ padding:'10px 24px', border:'none', borderRadius:'6px 6px 0 0',
                cursor:'pointer', fontWeight: onglet===o.id ? '600' : '400',
                background: onglet===o.id ? 'white' : '#e0e9f3',
                color: onglet===o.id ? BLEU : '#555', fontSize:'14px',
                position:'relative' }}>
              {o.label}
              {o.id === 'disponibilites' && disposDirty && (
                <span style={{ position:'absolute', top:'8px', right:'8px', width:'7px', height:'7px',
                  background:'#e53935', borderRadius:'50%' }} />
              )}
            </button>
          ))}
        </div>

        <div style={{ background:'white', borderRadius:'0 10px 10px 10px',
          boxShadow:'0 2px 8px rgba(0,0,0,0.08)', padding:'24px' }}>
          {onglet === 'programme'      && <CalendrierProgramme user={user} />}
          {onglet === 'disponibilites' && <CalendrierDispo user={user} onDirtyChange={setDisposDirty} />}
        </div>
      </div>
    </div>
  );
}
