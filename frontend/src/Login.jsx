import { useState } from 'react';
import api from './api';

export default function Login({ onLogin }) {
  const [email, setEmail]   = useState('');
  const [mdp, setMdp]       = useState('');
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);
  const [oubli, setOubli]   = useState(false);
  const [info, setInfo]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setErreur('');
    try {
      const res = await api.post('/auth/login', { email, mot_de_passe: mdp });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.chauffeur));
      onLogin(res.data.chauffeur);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur de connexion');
    } finally { setLoading(false); }
  }

  async function handleOubli(e) {
    e.preventDefault();
    setLoading(true); setErreur(''); setInfo('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setInfo(res.data.message);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', background:'#f0f4f8' }}>
      <div style={{ background:'white', padding:'40px', borderRadius:'12px',
        boxShadow:'0 4px 20px rgba(0,0,0,0.1)', width:'360px' }}>
        <div style={{ textAlign:'center', marginBottom:'30px' }}>
          <h1 style={{ color:'#1F4E79', fontSize:'24px', margin:'0' }}>Dispatch Taxi</h1>
          <p style={{ color:'#666', marginTop:'8px' }}>{oubli ? 'Mot de passe oublié' : 'Connexion'}</p>
        </div>
        <form onSubmit={oubli ? handleOubli : handleSubmit} method="post" action="/login" autoComplete="on">
          <div style={{ marginBottom:'16px' }}>
            <label style={{ display:'block', marginBottom:'6px', color:'#333', fontWeight:'500' }}>Email</label>
            <input type="email" name="email" id="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required
              style={{ width:'100%', padding:'10px 12px', border:'1px solid #ddd',
                borderRadius:'6px', fontSize:'14px', boxSizing:'border-box' }} />
          </div>
          {!oubli && <div style={{ marginBottom:'24px' }}>
            <label style={{ display:'block', marginBottom:'6px', color:'#333', fontWeight:'500' }}>Mot de passe</label>
            <input type="password" name="password" id="password" autoComplete="current-password" value={mdp} onChange={e=>setMdp(e.target.value)} required
              style={{ width:'100%', padding:'10px 12px', border:'1px solid #ddd',
                borderRadius:'6px', fontSize:'14px', boxSizing:'border-box' }} />
          </div>}
          {info && <div style={{ background:'#e8f5e9', color:'#2e7d32', padding:'10px',
            borderRadius:'6px', marginBottom:'16px', fontSize:'14px' }}>{info}</div>}
          {erreur && <div style={{ background:'#ffebee', color:'#c62828', padding:'10px',
            borderRadius:'6px', marginBottom:'16px', fontSize:'14px' }}>{erreur}</div>}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'12px', background:'#1F4E79', color:'white',
              border:'none', borderRadius:'6px', fontSize:'16px', fontWeight:'600',
              cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Patientez...' : (oubli ? 'Envoyer le lien' : 'Se connecter')}
          </button>
          <div style={{ textAlign:'center', marginTop:'16px' }}>
            <a href="#" onClick={e => { e.preventDefault(); setOubli(o => !o); setErreur(''); setInfo(''); }}
              style={{ color:'#1F4E79', fontSize:'13px' }}>
              {oubli ? '← Retour à la connexion' : 'Mot de passe oublié ?'}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
