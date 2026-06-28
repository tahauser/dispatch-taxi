import { useState, useEffect, useRef } from 'react';
import api from './api';
import CarteTrajetsChauffeur from './CarteTrajetsChauffeur';

const BLEU = '#1F4E79';

const VEHICULES = ['TAXI', 'BERLINE', 'VAN', 'MINIBUS'];

const PROVINCES = [
  'Québec', 'Ontario', 'Colombie-Britannique', 'Alberta', 'Manitoba',
  'Saskatchewan', 'Nouvelle-Écosse', 'Nouveau-Brunswick',
  'Terre-Neuve-et-Labrador', 'Île-du-Prince-Édouard'
];

const VIDE = {
  numero_chauffeur: '', nom: '', prenom: '', email: '', telephone: '',
  type_vehicule: 'TAXI', adresse_domicile: '', code_postal: '', ville: '',
  province: 'Québec', lat_domicile: '', lng_domicile: ''
};

export default function GestionChauffeurs() {
  const [chauffeurs, setChauffeurs]   = useState([]);
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState({ text: '', ok: true });
  const [modalOuvert, setModalOuvert] = useState(false);
  const [forme, setForme]             = useState(VIDE);
  const [editing, setEditing]         = useState(null); // id en édition
  const [mdpTemp, setMdpTemp]         = useState('');
  const [showTous, setShowTous]       = useState(true);

  // Carte des trajets
  const today = new Date().toISOString().slice(0, 10);
  const [carteCh, setCarteCh]         = useState(null);   // chauffeur dont on choisit la date
  const [carteDate, setCarteDate]     = useState(today);
  const [carteTrajets, setCarteTrajets] = useState(null); // affectations chargées -> ouvre la carte
  const [carteLoading, setCarteLoading] = useState(false);

  async function ouvrirCarte(ch, dateChoisie) {
    setCarteLoading(true);
    try {
      const res = await api.get(`/affectations?date=${dateChoisie}`);
      setCarteTrajets(res.data.filter(a => a.chauffeur_id === ch.id));
    } catch {
      setCarteTrajets([]);
    }
    setCarteLoading(false);
  }

  // Autocomplétion adresse (Nominatim)
  const [suggestions, setSuggestions]   = useState([]);
  const [showSuggest, setShowSuggest]   = useState(false);
  const [searching, setSearching]       = useState(false);
  const debounceRef = useRef(null);
  const skipSearchRef = useRef(false); // évite une recherche juste après sélection

  useEffect(() => { charger(); }, [showTous]);

  // Debounce 300ms sur le champ adresse
  useEffect(() => {
    if (skipSearchRef.current) { skipSearchRef.current = false; return; }
    const q = forme.adresse_domicile?.trim();
    if (!modalOuvert || !q || q.length < 3) {
      setSuggestions([]); setShowSuggest(false); setSearching(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(() => rechercherAdresse(q), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [forme.adresse_domicile, modalOuvert]);

  async function rechercherAdresse(query) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}`
        + `&format=json&limit=5&countrycodes=ca&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
      setShowSuggest(true);
    } catch {
      setSuggestions([]); setShowSuggest(false);
    }
    setSearching(false);
  }

  // Map des provinces Nominatim (anglais/abréviations) vers nos libellés
  const PROVINCE_MAP = {
    'quebec': 'Québec', 'québec': 'Québec',
    'ontario': 'Ontario',
    'british columbia': 'Colombie-Britannique', 'colombie-britannique': 'Colombie-Britannique',
    'alberta': 'Alberta',
    'manitoba': 'Manitoba',
    'saskatchewan': 'Saskatchewan',
    'nova scotia': 'Nouvelle-Écosse', 'nouvelle-écosse': 'Nouvelle-Écosse',
    'new brunswick': 'Nouveau-Brunswick', 'nouveau-brunswick': 'Nouveau-Brunswick',
    'newfoundland and labrador': 'Terre-Neuve-et-Labrador', 'terre-neuve-et-labrador': 'Terre-Neuve-et-Labrador',
    'prince edward island': 'Île-du-Prince-Édouard', 'île-du-prince-édouard': 'Île-du-Prince-Édouard'
  };

  function choisirSuggestion(s) {
    const a = s.address || {};
    const ville = a.city || a.town || a.village || a.municipality || a.hamlet || '';
    const numero = a.house_number ? a.house_number + ' ' : '';
    const rue = a.road || '';
    const adresse = (numero + rue).trim() || s.display_name.split(',')[0];
    const provBrut = (a.state || '').toLowerCase();
    const province = PROVINCE_MAP[provBrut] || forme.province || 'Québec';
    skipSearchRef.current = true; // ne pas relancer la recherche après remplissage
    setForme(f => ({
      ...f,
      adresse_domicile: adresse,
      code_postal: a.postcode || '',
      ville,
      province,
      lat_domicile: s.lat || '',
      lng_domicile: s.lon || ''
    }));
    setSuggestions([]); setShowSuggest(false);
  }

  async function charger() {
    setLoading(true);
    try {
      const res = await api.get(`/chauffeurs?tous=${showTous ? '1' : '0'}`);
      setChauffeurs(res.data);
    } catch (err) { affMsg('Erreur de chargement', false); }
    setLoading(false);
  }

  function affMsg(text, ok = true) {
    setMessage({ text, ok });
    setTimeout(() => setMessage({ text: '', ok: true }), 5000);
  }

  function ouvrir(chauffeur = null) {
    if (chauffeur) {
      setEditing(chauffeur.id);
      setForme({
        numero_chauffeur: chauffeur.numero_chauffeur,
        nom: chauffeur.nom,
        prenom: chauffeur.prenom,
        email: chauffeur.email,
        telephone: chauffeur.telephone || '',
        type_vehicule: chauffeur.type_vehicule || 'TAXI',
        adresse_domicile: chauffeur.adresse_domicile || '',
        code_postal: chauffeur.code_postal || '',
        ville: chauffeur.ville || '',
        province: chauffeur.province || 'Québec',
        lat_domicile: chauffeur.lat_domicile || '',
        lng_domicile: chauffeur.lng_domicile || ''
      });
    } else {
      setEditing(null);
      setForme(VIDE);
    }
    skipSearchRef.current = true; // pré-remplissage : ne pas déclencher de recherche
    setSuggestions([]); setShowSuggest(false);
    setMdpTemp('');
    setModalOuvert(true);
  }

  async function sauvegarder(e) {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (editing) {
        res = await api.put(`/chauffeurs/${editing}`, forme);
        affMsg(`✓ Chauffeur ${res.data.prenom} ${res.data.nom} mis à jour`);
      } else {
        res = await api.post('/chauffeurs', forme);
        setMdpTemp(res.data.mot_de_passe_temp || '');
        affMsg(`✓ Chauffeur créé — mot de passe temporaire affiché`);
      }
      setModalOuvert(false);
      charger();
    } catch (err) {
      affMsg(err.response?.data?.message || 'Erreur', false);
    }
    setLoading(false);
  }

  async function toggleActif(ch) {
    try {
      await api.patch(`/chauffeurs/${ch.id}/actif`, { actif: !ch.actif });
      affMsg(`Chauffeur ${ch.prenom} ${ch.nom} ${!ch.actif ? 'activé' : 'désactivé'}`);
      charger();
    } catch { affMsg('Erreur activation', false); }
  }

  async function resetMdp(ch) {
    if (!window.confirm(`Réinitialiser le mot de passe de ${ch.prenom} ${ch.nom} ?`)) return;
    try {
      const res = await api.post(`/chauffeurs/${ch.id}/reset-password`);
      setMdpTemp(res.data.mot_de_passe_temp);
      affMsg('Mot de passe réinitialisé — affiché ci-dessous');
    } catch { affMsg('Erreur réinitialisation', false); }
  }

  function champ(field, label, type = 'text', required = false) {
    return (
      <div style={{ marginBottom:'14px' }}>
        <label style={{ display:'block', marginBottom:'5px', fontWeight:'500', color:'#333', fontSize:'13px' }}>{label}{required ? ' *' : ''}</label>
        <input type={type} value={forme[field] || ''} required={required}
          onChange={e => setForme(f => ({ ...f, [field]: e.target.value }))}
          style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd',
            borderRadius:'6px', fontSize:'14px', boxSizing:'border-box' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Barre d'outils */}
      <div style={{ display:'flex', gap:'12px', alignItems:'center', padding:'16px',
        borderBottom:'1px solid #eee', flexWrap:'wrap' }}>
        <button onClick={() => ouvrir()}
          style={{ background:BLEU, color:'white', border:'none', padding:'9px 20px',
            borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
          + Nouveau chauffeur
        </button>
        <label style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'14px',
          color:'#555', cursor:'pointer' }}>
          <input type="checkbox" checked={showTous} onChange={e => setShowTous(e.target.checked)} />
          Afficher les inactifs
        </label>
        <button onClick={charger} style={{ background:'white', border:'1px solid #ddd',
          color:BLEU, padding:'8px 16px', borderRadius:'6px', cursor:'pointer', fontSize:'14px' }}>
          Actualiser
        </button>
        <span style={{ color:'#888', fontSize:'13px' }}>
          {chauffeurs.length} chauffeur{chauffeurs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {message.text && (
        <div style={{ background: message.ok ? '#e8f5e9' : '#ffebee',
          color: message.ok ? '#2e7d32' : '#c62828',
          padding:'12px 16px', margin:'12px 16px', borderRadius:'6px', fontSize:'14px' }}>
          {message.text}
        </div>
      )}

      {mdpTemp && (
        <div style={{ background:'#fff3e0', border:'2px solid #FF9800', borderRadius:'8px',
          padding:'16px', margin:'12px 16px' }}>
          <strong style={{ color:'#E65100' }}>⚠️ Mot de passe temporaire (à communiquer au chauffeur) :</strong>
          <div style={{ fontFamily:'monospace', fontSize:'18px', fontWeight:'bold',
            color:'#BF360C', marginTop:'8px', letterSpacing:'2px' }}>{mdpTemp}</div>
          <button onClick={() => setMdpTemp('')}
            style={{ marginTop:'8px', background:'none', border:'1px solid #ccc',
              padding:'4px 12px', borderRadius:'4px', cursor:'pointer', fontSize:'12px' }}>
            Fermer
          </button>
        </div>
      )}

      {/* Tableau */}
      {loading && <div style={{ padding:'40px', textAlign:'center', color:'#888' }}>Chargement...</div>}
      {!loading && (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
          <thead>
            <tr style={{ background:BLEU, color:'white' }}>
              {['N°','Nom','Prénom','Email','Téléphone','Véhicule','Statut','Actions'].map(h => (
                <th key={h} style={{ padding:'12px 14px', textAlign:'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chauffeurs.length === 0 ? (
              <tr><td colSpan="8" style={{ padding:'40px', textAlign:'center', color:'#999' }}>
                Aucun chauffeur trouvé
              </td></tr>
            ) : chauffeurs.map((c, i) => (
              <tr key={c.id} style={{ background: !c.actif ? '#fff8f8' : i%2===0 ? '#fafafa' : 'white',
                borderBottom:'1px solid #eee', opacity: c.actif ? 1 : 0.7 }}>
                <td style={{ padding:'10px 14px', fontWeight:'700', color:BLEU }}>{c.numero_chauffeur}</td>
                <td style={{ padding:'10px 14px', fontWeight:'600' }}>{c.nom}</td>
                <td style={{ padding:'10px 14px' }}>{c.prenom}</td>
                <td style={{ padding:'10px 14px', color:'#555' }}>{c.email}</td>
                <td style={{ padding:'10px 14px' }}>{c.telephone || '—'}</td>
                <td style={{ padding:'10px 14px' }}>
                  <span style={{ background: c.type_vehicule === 'BERLINE' ? '#e3f2fd' : '#f3f4f6',
                    color: c.type_vehicule === 'BERLINE' ? '#1565c0' : '#555',
                    padding:'2px 8px', borderRadius:'10px', fontSize:'12px' }}>
                    {c.type_vehicule}
                  </span>
                </td>
                <td style={{ padding:'10px 14px' }}>
                  <span style={{ background: c.actif ? '#e8f5e9' : '#fce4ec',
                    color: c.actif ? '#2e7d32' : '#c62828',
                    padding:'2px 10px', borderRadius:'10px', fontSize:'12px', fontWeight:'600' }}>
                    {c.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td style={{ padding:'10px 14px' }}>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    <button onClick={() => ouvrir(c)}
                      style={{ background:'#e3f2fd', color:'#1565c0', border:'none',
                        padding:'5px 10px', borderRadius:'4px', cursor:'pointer', fontSize:'12px' }}>
                      Modifier
                    </button>
                    <button onClick={() => toggleActif(c)}
                      style={{ background: c.actif ? '#fce4ec' : '#e8f5e9',
                        color: c.actif ? '#c62828' : '#2e7d32',
                        border:'none', padding:'5px 10px', borderRadius:'4px',
                        cursor:'pointer', fontSize:'12px' }}>
                      {c.actif ? 'Désactiver' : 'Activer'}
                    </button>
                    <button onClick={() => resetMdp(c)}
                      style={{ background:'#fff3e0', color:'#E65100', border:'none',
                        padding:'5px 10px', borderRadius:'4px', cursor:'pointer', fontSize:'12px' }}>
                      Réinit. mdp
                    </button>
                    <button onClick={() => { setCarteCh(c); setCarteDate(today); }}
                      style={{ background:'#e8f5e9', color:'#2e7d32', border:'none',
                        padding:'5px 10px', borderRadius:'4px', cursor:'pointer', fontSize:'12px' }}>
                      🗺️ Voir trajets
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal formulaire */}
      {modalOuvert && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:'12px', padding:'28px',
            maxWidth:'540px', width:'90%', maxHeight:'90vh', overflowY:'auto',
            boxShadow:'0 8px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h2 style={{ margin:0, color:BLEU, fontSize:'18px' }}>
                {editing ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}
              </h2>
              <button onClick={() => setModalOuvert(false)}
                style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#888' }}>×</button>
            </div>
            <form onSubmit={sauvegarder}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                {champ('numero_chauffeur', 'N° chauffeur', 'text', true)}
                {champ('type_vehicule', 'Type véhicule', 'text', false)}
                {champ('prenom', 'Prénom', 'text', true)}
                {champ('nom', 'Nom', 'text', true)}
                {champ('email', 'Email', 'email', true)}
                {champ('telephone', 'Téléphone')}
              </div>
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', marginBottom:'5px', fontWeight:'500', color:'#333', fontSize:'13px' }}>Type véhicule</label>
                <select value={forme.type_vehicule}
                  onChange={e => setForme(f => ({ ...f, type_vehicule: e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd',
                    borderRadius:'6px', fontSize:'14px', boxSizing:'border-box' }}>
                  {VEHICULES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {/* Adresse avec autocomplétion Nominatim */}
              <div style={{ marginBottom:'14px', position:'relative' }}>
                <label style={{ display:'block', marginBottom:'5px', fontWeight:'500', color:'#333', fontSize:'13px' }}>
                  Adresse (numéro + rue)
                </label>
                <input type="text" value={forme.adresse_domicile || ''} autoComplete="off"
                  placeholder="Commencez à taper une adresse…"
                  onChange={e => setForme(f => ({ ...f, adresse_domicile: e.target.value }))}
                  onFocus={() => { if (suggestions.length) setShowSuggest(true); }}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd',
                    borderRadius:'6px', fontSize:'14px', boxSizing:'border-box' }} />
                {searching && (
                  <span style={{ position:'absolute', right:'12px', top:'34px',
                    fontSize:'12px', color:'#888' }}>⏳ recherche…</span>
                )}
                {showSuggest && suggestions.length > 0 && (
                  <ul style={{ listStyle:'none', margin:'2px 0 0', padding:0,
                    position:'absolute', left:0, right:0, zIndex:10, background:'white',
                    border:'1px solid #ddd', borderRadius:'6px', maxHeight:'220px',
                    overflowY:'auto', boxShadow:'0 6px 20px rgba(0,0,0,0.15)' }}>
                    {suggestions.map(s => (
                      <li key={s.place_id} onClick={() => choisirSuggestion(s)}
                        style={{ padding:'9px 12px', cursor:'pointer', fontSize:'13px',
                          borderBottom:'1px solid #f0f0f0', color:'#333' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f8fc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        {s.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                {champ('code_postal', 'Code postal')}
                {champ('ville', 'Ville')}
              </div>

              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', marginBottom:'5px', fontWeight:'500', color:'#333', fontSize:'13px' }}>Province</label>
                <select value={forme.province || 'Québec'}
                  onChange={e => setForme(f => ({ ...f, province: e.target.value }))}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd',
                    borderRadius:'6px', fontSize:'14px', boxSizing:'border-box' }}>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <div style={{ marginBottom:'14px' }}>
                  <label style={{ display:'block', marginBottom:'5px', fontWeight:'500', color:'#333', fontSize:'13px' }}>Latitude GPS</label>
                  <input type="text" value={forme.lat_domicile || ''} readOnly
                    placeholder="auto"
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd',
                      borderRadius:'6px', fontSize:'14px', boxSizing:'border-box',
                      background:'#f5f5f5', color:'#666' }} />
                </div>
                <div style={{ marginBottom:'14px' }}>
                  <label style={{ display:'block', marginBottom:'5px', fontWeight:'500', color:'#333', fontSize:'13px' }}>Longitude GPS</label>
                  <input type="text" value={forme.lng_domicile || ''} readOnly
                    placeholder="auto"
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd',
                      borderRadius:'6px', fontSize:'14px', boxSizing:'border-box',
                      background:'#f5f5f5', color:'#666' }} />
                </div>
              </div>
              {!editing && (
                <div style={{ background:'#e8f5e9', padding:'10px 14px', borderRadius:'6px',
                  fontSize:'13px', color:'#2e7d32', marginBottom:'14px' }}>
                  Le mot de passe temporaire sera affiché après création.
                </div>
              )}
              <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end', marginTop:'8px' }}>
                <button type="button" onClick={() => setModalOuvert(false)}
                  style={{ background:'white', border:'1px solid #ddd', padding:'10px 20px',
                    borderRadius:'6px', cursor:'pointer', fontSize:'14px' }}>
                  Annuler
                </button>
                <button type="submit" disabled={loading}
                  style={{ background:BLEU, color:'white', border:'none', padding:'10px 24px',
                    borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
                  {loading ? '...' : editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal choix de date pour la carte */}
      {carteCh && !carteTrajets && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1500,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:'12px', padding:'24px',
            maxWidth:'380px', width:'90%', boxShadow:'0 8px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ margin:0, color:BLEU, fontSize:'16px' }}>
                🗺️ Trajets de {carteCh.prenom} {carteCh.nom}
              </h3>
              <button onClick={() => setCarteCh(null)}
                style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#888' }}>×</button>
            </div>
            <label style={{ display:'block', marginBottom:'6px', fontWeight:'500', color:'#333', fontSize:'13px' }}>Date</label>
            <input type="date" value={carteDate} onChange={e => setCarteDate(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1px solid #ddd',
                borderRadius:'6px', fontSize:'14px', boxSizing:'border-box', marginBottom:'18px' }} />
            <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
              <button onClick={() => setCarteCh(null)}
                style={{ background:'white', border:'1px solid #ddd', padding:'9px 18px',
                  borderRadius:'6px', cursor:'pointer', fontSize:'14px' }}>Annuler</button>
              <button onClick={() => ouvrirCarte(carteCh, carteDate)} disabled={carteLoading}
                style={{ background:BLEU, color:'white', border:'none', padding:'9px 20px',
                  borderRadius:'6px', cursor:'pointer', fontWeight:'600', fontSize:'14px' }}>
                {carteLoading ? '...' : 'Afficher la carte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Carte plein écran */}
      {carteCh && carteTrajets && (
        <CarteTrajetsChauffeur
          chauffeur={carteCh}
          trajets={carteTrajets}
          date={carteDate}
          onClose={() => { setCarteCh(null); setCarteTrajets(null); }}
        />
      )}
    </div>
  );
}
