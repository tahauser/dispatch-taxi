import { useState } from 'react';
import CalendrierProgramme from './CalendrierProgramme';
import CalendrierDispo from './CalendrierDispo';

const BLEU = '#1F4E79';

export default function PortailChauffeur({ user, onLogout }) {
  const [onglet, setOnglet] = useState('programme');

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
            { id:'disponibilites', label:'🕐  Mes disponibilites' },
          ].map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)}
              style={{ padding:'10px 24px', border:'none', borderRadius:'6px 6px 0 0',
                cursor:'pointer', fontWeight: onglet===o.id ? '600' : '400',
                background: onglet===o.id ? 'white' : '#e0e9f3',
                color: onglet===o.id ? BLEU : '#555', fontSize:'14px' }}>
              {o.label}
            </button>
          ))}
        </div>

        <div style={{ background:'white', borderRadius:'0 10px 10px 10px',
          boxShadow:'0 2px 8px rgba(0,0,0,0.08)', padding:'24px' }}>
          {onglet === 'programme'      && <CalendrierProgramme user={user} />}
          {onglet === 'disponibilites' && <CalendrierDispo user={user} />}
        </div>
      </div>
    </div>
  );
}
