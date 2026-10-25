import { useState } from 'react';
import api from './api';

const input = { width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'14px', boxSizing:'border-box' };

export default function ResetPassword({ token }) {
  const [mdp, setMdp] = useState('');
  const [mdp2, setMdp2] = useState('');
  const [erreur, setErreur] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErreur('');
    if (mdp.length < 8) return setErreur('Minimum 8 caractères');
    if (mdp !== mdp2) return setErreur('Les mots de passe ne correspondent pas');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, nouveau_mdp: mdp });
      setOk(true);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f4f8' }}>
      <div style={{ background:'white', padding:'40px', borderRadius:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', width:'360px', maxWidth:'92vw' }}>
        <h1 style={{ color:'#1F4E79', fontSize:'22px', margin:'0 0 20px', textAlign:'center' }}>Nouveau mot de passe</h1>
        {ok ? (
          <>
            <div style={{ background:'#e8f5e9', color:'#2e7d32', padding:'10px', borderRadius:'6px', marginBottom:'16px', fontSize:'14px' }}>
              Mot de passe mis à jour.
            </div>
            <a href="/" style={{ display:'block', textAlign:'center', padding:'12px', background:'#1F4E79', color:'white', borderRadius:'6px', textDecoration:'none', fontWeight:600 }}>
              Se connecter
            </a>
          </>
        ) : (
          <form onSubmit={submit} method="post" action="/login" autoComplete="on">
            <label style={{ display:'block', marginBottom:'6px', fontWeight:500 }}>Nouveau mot de passe</label>
            <input type="password" name="new-password" autoComplete="new-password" value={mdp} onChange={e => setMdp(e.target.value)} required style={{ ...input, marginBottom:'16px' }} />
            <label style={{ display:'block', marginBottom:'6px', fontWeight:500 }}>Confirmer</label>
            <input type="password" name="confirm-password" autoComplete="new-password" value={mdp2} onChange={e => setMdp2(e.target.value)} required style={{ ...input, marginBottom:'20px' }} />
            {erreur && <div style={{ background:'#ffebee', color:'#c62828', padding:'10px', borderRadius:'6px', marginBottom:'16px', fontSize:'14px' }}>{erreur}</div>}
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'12px', background:'#1F4E79', color:'white', border:'none', borderRadius:'6px', fontSize:'16px', fontWeight:600, cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Patientez...' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
