import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

/* ---- Géocodage ---- */
const CACHE_KEY = 'geocache_v1';
const memCache = new Map();
function chargerCache() {
  if (memCache.size) return;
  try { const b = JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'); Object.entries(b).forEach(([k,v])=>memCache.set(k,v)); } catch {}
}
function sauverCache() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(memCache))); } catch {}
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RE_CP = /\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b/;
function ajouterRegion(s) { return /canada|qu[ée]bec|\bqc\b/i.test(s) ? s : `${s}, Québec, Canada`; }
function construireCandidats(adresse) {
  const base = String(adresse||'').replace(/\s+/g,' ').trim();
  if (!base) return [];
  const sansCp = base.replace(RE_CP,'').replace(/\s*,\s*,/g,',').replace(/[,\s]+$/,'').replace(/\s+/g,' ').trim();
  const ville = sansCp.includes(',') ? sansCp.split(',').pop().trim() : (sansCp.split(/\s+/).pop()||'').trim();
  const rue = ville ? sansCp.replace(new RegExp(`[,\\s]*${ville.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*$`,'i'),'').trim() || sansCp : sansCp;
  return [...new Set([
    ville ? ajouterRegion(`${rue}, ${ville}`) : '',
    ajouterRegion(sansCp),
    ajouterRegion(base),
    ville ? ajouterRegion(ville) : '',
  ].filter(Boolean))];
}
async function geocoder(adresse) {
  const cle = String(adresse||'').trim().toLowerCase();
  if (!cle) return null;
  if (memCache.has(cle)) return memCache.get(cle);
  for (const q of construireCandidats(adresse)) {
    try {
      await sleep(1100);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ca&viewbox=-74.2,45.2,-73.2,45.8&bounded=0`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      const r = Array.isArray(data) && data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
      if (r) { memCache.set(cle, r); sauverCache(); return r; }
    } catch {}
  }
  return null;
}
function coordsDirectes(lat, lng) {
  const la=parseFloat(lat), ln=parseFloat(lng);
  return (Number.isFinite(la) && Number.isFinite(ln) && (la!==0||ln!==0)) ? {lat:la,lng:ln} : null;
}

/* ---- Icônes ---- */
function iconePastille(n, couleur) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${couleur};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
    iconSize: [26,26], iconAnchor: [13,13], popupAnchor: [0,-14],
  });
}
function iconeLabel(texte) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-50%);display:inline-block;white-space:nowrap;background:#fff;border:1px solid #2196F3;color:#1565C0;font-size:11px;font-weight:700;padding:1px 7px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.3)">${texte}</div>`,
    iconSize: [0,0], iconAnchor: [0,0],
  });
}

function AjusterVue({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 13);
    else map.fitBounds(L.latLngBounds(points.map(p=>[p.lat,p.lng])), { padding:[50,50] });
  }, [points, map]);
  return null;
}

function distKm(a, b) {
  if (!a||!b) return null;
  const R=6371, rad=x=>x*Math.PI/180;
  const dL=rad(b.lat-a.lat), dG=rad(b.lng-a.lng);
  const s=Math.sin(dL/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dG/2)**2;
  return Math.round(2*R*Math.asin(Math.sqrt(s))*10)/10;
}
function dureeHM(d, f) {
  const tm=t=>{const p=String(t||'').split(':');return Number(p[0])*60+Number(p[1]||0);};
  const diff=tm(f)-tm(d);
  if (!Number.isFinite(diff)||diff<=0) return '';
  const h=Math.floor(diff/60), m=diff%60;
  return h&&m ? `${h}h ${String(m).padStart(2,'0')}min` : h ? `${h}h` : `${m}min`;
}
const milieu = (a, b) => [(a.lat+b.lat)/2, (a.lng+b.lng)/2];

/* ---- Carte inline ---- */
function CarteInline({ chauffeur, trajets }) {
  const [geo, setGeo]        = useState({});
  const [chargement, setChg] = useState(true);
  const [progres, setProg]   = useState(0);
  const annule = useRef(false);

  const trajetsTries = useMemo(
    () => [...(trajets||[])].sort((a,b)=>fmt(a.heure_prise).localeCompare(fmt(b.heure_prise))),
    [trajets]
  );

  useEffect(() => {
    annule.current = false;
    chargerCache();
    setChg(true); setProg(0); setGeo({});
    (async () => {
      const total = trajetsTries.length * 2;
      let fait = 0;
      const av = () => { fait++; if (!annule.current) setProg(total ? Math.round(fait/total*100) : 100); };
      const res = {};
      for (let i = 0; i < trajetsTries.length; i++) {
        const t = trajetsTries[i];
        let dep = coordsDirectes(t.lat_prise, t.lng_prise);
        if (!dep && t.adresse_prise) dep = await geocoder(t.adresse_prise);
        if (annule.current) return; av();
        let arr = coordsDirectes(t.lat_arrivee, t.lng_arrivee);
        if (!arr && t.adresse_arrivee) arr = await geocoder(t.adresse_arrivee);
        if (annule.current) return; av();
        res[i] = { depart: dep, arrivee: arr };
        setGeo({...res});
      }
      if (!annule.current) setChg(false);
    })();
    return () => { annule.current = true; };
  }, [trajetsTries]);

  const tousPoints = useMemo(() => {
    const pts = [];
    trajetsTries.forEach((_,i) => {
      if (geo[i]?.depart) pts.push(geo[i].depart);
      if (geo[i]?.arrivee) pts.push(geo[i].arrivee);
    });
    return pts;
  }, [geo, trajetsTries]);

  const lignes = useMemo(() => {
    return trajetsTries.reduce((acc, t, i) => {
      const dep=geo[i]?.depart, arr=geo[i]?.arrivee;
      if (dep && arr) acc.push({
        key: `b${i}-${dep.lat},${dep.lng}-${arr.lat},${arr.lng}`,
        seg: [[dep.lat,dep.lng],[arr.lat,arr.lng]],
        mid: milieu(dep, arr),
        code: t.code_trajet,
        dist: distKm(dep, arr),
        duree: dureeHM(t.heure_prise, t.heure_arrivee),
      });
      return acc;
    }, []);
  }, [geo, trajetsTries]);

  return (
    <div style={{ marginTop:'24px', borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ background:BLEU, color:'white', padding:'12px 20px', fontSize:'15px', fontWeight:'700' }}>
        🗺️ Carte des trajets
      </div>
      {chargement && (
        <div style={{ background:'#FFF3E0', color:'#E65100', padding:'8px 20px', fontSize:'13px', display:'flex', alignItems:'center', gap:'10px' }}>
          <span>⏳ Géolocalisation… {progres}%</span>
          <div style={{ flex:1, height:6, background:'#FFE0B2', borderRadius:3, overflow:'hidden', maxWidth:200 }}>
            <div style={{ width:`${progres}%`, height:'100%', background:'#FB8C00', transition:'width 0.3s' }} />
          </div>
        </div>
      )}
      <div style={{ height:'450px' }}>
        <MapContainer center={[45.7, -73.4]} zoom={10} style={{ height:'100%', width:'100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AjusterVue points={tousPoints} />
          {lignes.map(l => (
            <Polyline key={l.key} positions={l.seg} pathOptions={{ color:'#2196F3', weight:4 }}>
              <Tooltip sticky>
                <strong>{l.code}</strong><br />
                📏 {l.dist!=null ? `${l.dist} km` : '—'}<br />
                ⏱️ {l.duree||'—'}
              </Tooltip>
            </Polyline>
          ))}
          {lignes.map(l => (
            <Marker key={`lbl-${l.key}`} position={l.mid} interactive={false}
              icon={iconeLabel(`${l.dist!=null?`${l.dist} km`:'—'}${l.duree?` / ${l.duree}`:''}`)} />
          ))}
          {trajetsTries.map((t, i) => (
            <Fragment key={t.id??i}>
              {geo[i]?.depart && (
                <Marker position={[geo[i].depart.lat, geo[i].depart.lng]} icon={iconePastille(i+1, '#4CAF50')}>
                  <Popup><strong>🟢 Départ — {t.code_trajet}</strong><br />{fmt(t.heure_prise)}<br />{t.adresse_prise}</Popup>
                </Marker>
              )}
              {geo[i]?.arrivee && (
                <Marker position={[geo[i].arrivee.lat, geo[i].arrivee.lng]} icon={iconePastille(i+1, '#F44336')}>
                  <Popup><strong>🔴 Arrivée — {t.code_trajet}</strong><br />{fmt(t.heure_arrivee)}<br />{t.adresse_arrivee}</Popup>
                </Marker>
              )}
            </Fragment>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

/* ---- Page principale ---- */
export default function ConsultationPage({ token, user, onLoginRequest }) {
  const [data, setData]       = useState(null);
  const [erreur, setErreur]   = useState('');
  const [loading, setLoading] = useState(true);
  const [consulteLe, setConsulteLe] = useState(null);

  useEffect(() => {
    if (!user) return;
    charger();
  }, [user, token]);

  async function charger() {
    setLoading(true); setErreur('');
    try {
      const res = await api.get(`/consultation/${token}`);
      setData(res.data);
      setConsulteLe(new Date());
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur de chargement');
    }
    setLoading(false);
  }

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
            <strong>{erreur}</strong><br /><br />
            <small>Ce lien est peut-être expiré (validité 7 jours) ou ne vous est pas destiné.</small>
          </div>
        )}

        {data && !loading && (
          <>
            <div style={{ background:'white', borderRadius:'12px 12px 0 0',
              padding:'24px', borderBottom:'3px solid '+BLEU }}>
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
                  <strong style={{ color:BLEU }}>{data.trajets.length} trajet{data.trajets.length>1?'s':''}</strong> assigné{data.trajets.length>1?'s':''}
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
                      <tr key={t.code_trajet} style={{ background:i%2===0?'#fafafa':'white', borderBottom:'1px solid #eee' }}>
                        <td style={{ padding:'12px 14px', fontWeight:'700', color:BLEU }}>{t.code_trajet}</td>
                        <td style={{ padding:'12px 14px', fontWeight:'600' }}>{fmt(t.heure_prise)}</td>
                        <td style={{ padding:'12px 14px' }}>{fmt(t.heure_arrivee)}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <span style={{ background:t.type_vehicule==='BERLINE'?'#e3f2fd':'#f3f4f6',
                            color:t.type_vehicule==='BERLINE'?'#1565c0':'#555',
                            padding:'2px 8px', borderRadius:'10px', fontSize:'12px' }}>
                            {t.type_vehicule||'TAXI'}
                          </span>
                        </td>
                        <td style={{ padding:'12px 14px', maxWidth:'200px' }}>{t.adresse_prise}</td>
                        <td style={{ padding:'12px 14px', maxWidth:'200px', color:'#555' }}>{t.adresse_arrivee||'—'}</td>
                        <td style={{ padding:'12px 14px', color:'#888', fontStyle:'italic' }}>{t.notes||''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.trajets.length > 0 && (
              <CarteInline chauffeur={data.chauffeur} trajets={data.trajets} />
            )}

            <div style={{ marginTop:'20px', textAlign:'center', color:'#999', fontSize:'12px', paddingBottom:'32px' }}>
              Ce lien est personnel et valable 7 jours. Ne le partagez pas.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function extraireDateDuToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.date_programme || null;
  } catch { return null; }
}
