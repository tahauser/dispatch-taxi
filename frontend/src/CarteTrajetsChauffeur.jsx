import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BLEU = '#1F4E79';

/* ----------------------------------------------------------------------------
 * Géocodage Nominatim avec cache persistant (localStorage) + cache mémoire.
 * Nominatim impose ~1 requête/seconde : on sérialise les appels.
 * -------------------------------------------------------------------------- */
const CACHE_KEY = 'geocache_v1';
const memCache = new Map();

function chargerCache() {
  if (memCache.size) return;
  try {
    const brut = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    Object.entries(brut).forEach(([k, v]) => memCache.set(k, v));
  } catch { /* cache corrompu : on ignore */ }
}

function sauverCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(memCache)));
  } catch { /* quota dépassé : on ignore */ }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Code postal canadien : A1A 1A1 (espace optionnel)
const RE_CP = /\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b/;

/* ----------------------------------------------------------------------------
 * Construction des requêtes Nominatim.
 *
 * Les adresses EXO sont mal formées pour un géocodage libre :
 *   - code postal "collé" sans virgule           → "… Chambly J3L 3E9"
 *   - type de voie au milieu (RUE / AV / BOUL)   → "1800 Henri-Blaquiere RUE Chambly"
 * Nominatim renvoie alors 0 résultat. On génère donc plusieurs variantes, de la
 * plus précise à la plus tolérante, et on garde la première qui répond.
 * (Variantes validées en direct contre Nominatim.)
 * -------------------------------------------------------------------------- */
function ajouterRegion(s) {
  return /canada|qu[ée]bec|\bqc\b/i.test(s) ? s : `${s}, Québec, Canada`;
}

function villeAvantCP(adresse) {
  const m = adresse.match(RE_CP);
  const avant = (m ? adresse.slice(0, m.index) : adresse).replace(/[,\s]+$/, '').trim();
  if (!avant) return '';
  // dernier segment après une virgule, sinon dernier mot
  return (avant.includes(',') ? avant.split(',').pop() : avant.split(/\s+/).pop()).trim();
}

function construireCandidats(adresse) {
  const base = String(adresse || '').replace(/\s+/g, ' ').trim();
  if (!base) return [];
  const sansCp = base.replace(RE_CP, '').replace(/\s*,\s*,/g, ',').replace(/[,\s]+$/, '').replace(/\s+/g, ' ').trim();
  const ville  = villeAvantCP(base);
  const cands = [
    ajouterRegion(sansCp),                 // sans code postal (résout la majorité des cas)
    ajouterRegion(base),                   // tel quel (POI qui répondent avec le CP)
    ville ? ajouterRegion(ville) : '',     // repli : centre de la ville (mieux qu'aucun marqueur)
  ].filter(Boolean);
  return [...new Set(cands)];              // dédoublonnage en conservant l'ordre
}

async function geocoder(adresse) {
  const cle = String(adresse || '').trim().toLowerCase();
  if (!cle) { console.warn('[geocoder] adresse vide → null'); return null; }
  if (memCache.has(cle)) {
    console.log('[geocoder] cache HIT', { adresse, coords: memCache.get(cle) });
    return memCache.get(cle);
  }

  const candidats = construireCandidats(adresse);
  for (let i = 0; i < candidats.length; i++) {
    const q = candidats[i];
    try {
      await sleep(1100); // Nominatim impose ~1 req/s
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}`
        + `&format=json&limit=1&countrycodes=ca`;
      console.log(`[geocoder] tentative ${i + 1}/${candidats.length}`, { adresse, requete: q });
      const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const data = await res.json();
      const r = Array.isArray(data) && data[0]
        ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        : null;
      console.log('[geocoder] réponse Nominatim', { requete: q, status: res.status, nbResultats: Array.isArray(data) ? data.length : 'non-array', coords: r });
      if (r) {
        // On ne met en cache QUE les résultats valides : un échec ponctuel
        // (rate-limit 429) ne doit pas être mémorisé pour toujours.
        memCache.set(cle, r);
        sauverCache();
        return r;
      }
    } catch (e) {
      console.error('[geocoder] exception fetch', { requete: q, erreur: e?.message });
    }
  }
  console.warn('[geocoder] aucun résultat après toutes les tentatives → coords null', { adresse, candidats });
  return null;
}

/* coordonnées valides directement depuis la BD ? */
function coordsDirectes(lat, lng) {
  const la = parseFloat(lat), ln = parseFloat(lng);
  if (Number.isFinite(la) && Number.isFinite(ln) && (la !== 0 || ln !== 0)) {
    return { lat: la, lng: ln };
  }
  return null;
}

/* ----------------------------------------------------------------------------
 * Icônes personnalisées (divIcon)
 * -------------------------------------------------------------------------- */
function iconePastille(numero, couleur) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${couleur};color:#fff;width:26px;height:26px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${numero}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

const iconeDomicile = L.divIcon({
  className: '',
  html: `<div style="background:${BLEU};color:#fff;width:30px;height:30px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;font-size:16px;
    border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)">⭐</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -16],
});

/* Recentre la carte sur l'ensemble des points */
function AjusterVue({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
    } else {
      map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
}

function fmt(h) { return String(h || '').substring(0, 5); }

function dureeMin(debut, fin) {
  const toMin = t => {
    const p = String(t || '').split(':');
    return Number(p[0]) * 60 + Number(p[1] || 0);
  };
  const d = toMin(fin) - toMin(debut);
  if (!Number.isFinite(d) || d <= 0) return '';
  const h = Math.floor(d / 60), m = d % 60;
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}

/* Durée au format « 1h 05min » / « 45min » (libellé des lignes) */
function dureeHM(debut, fin) {
  const toMin = t => {
    const p = String(t || '').split(':');
    return Number(p[0]) * 60 + Number(p[1] || 0);
  };
  const d = toMin(fin) - toMin(debut);
  if (!Number.isFinite(d) || d <= 0) return '';
  const h = Math.floor(d / 60), m = d % 60;
  if (h && m) return `${h}h ${String(m).padStart(2, '0')}min`;
  return h ? `${h}h` : `${m}min`;
}

/* Distance Haversine en km (1 décimale) entre deux points {lat,lng} */
function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const rad = x => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}

const milieu = (a, b) => [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];

/* Étiquette texte centrée sur un point (libellé au milieu d'une ligne) */
function iconeLabel(texte) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-50%);display:inline-block;white-space:nowrap;
      background:#fff;border:1px solid #2196F3;color:#1565C0;font-size:11px;font-weight:700;
      padding:1px 7px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${texte}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/* ----------------------------------------------------------------------------
 * Composant principal
 * -------------------------------------------------------------------------- */
export default function CarteTrajetsChauffeur({ chauffeur, trajets, date, onClose }) {
  const [geo, setGeo]         = useState({});   // index -> { depart:{lat,lng}, arrivee:{lat,lng} }
  const [domicile, setDom]    = useState(null);
  const [chargement, setChg]  = useState(true);
  const [progres, setProgres] = useState(0);
  const annule = useRef(false);

  // trajets triés chronologiquement
  const trajetsTries = useMemo(
    () => [...(trajets || [])].sort((a, b) => fmt(a.heure_prise).localeCompare(fmt(b.heure_prise))),
    [trajets]
  );

  useEffect(() => {
    annule.current = false;
    chargerCache();
    setChg(true); setProgres(0); setGeo({}); setDom(null);

    (async () => {
      // total de géocodages à effectuer (pour la barre de progression)
      let total = 1 + trajetsTries.length * 2;
      let fait = 0;
      const avancer = () => { fait++; if (!annule.current) setProgres(Math.round(fait / total * 100)); };

      // Domicile
      let dom = coordsDirectes(chauffeur?.lat_domicile, chauffeur?.lng_domicile);
      if (!dom && chauffeur?.adresse_domicile) {
        const q = [chauffeur.adresse_domicile, chauffeur.ville, chauffeur.province]
          .filter(Boolean).join(', ');
        dom = await geocoder(q);
      }
      if (annule.current) return;
      setDom(dom); avancer();

      // Trajets (départ + arrivée)
      const resultat = {};
      for (let i = 0; i < trajetsTries.length; i++) {
        const t = trajetsTries[i];

        // 1) Diagnostic : champs reçus depuis /api/affectations pour ce trajet
        console.log(`[carte] trajet #${i + 1} ${t.code_trajet}`, {
          adresse_prise: t.adresse_prise,
          adresse_arrivee: t.adresse_arrivee,
          a_le_champ_adresse_arrivee: 'adresse_arrivee' in t,
          lat_prise: t.lat_prise, lng_prise: t.lng_prise,
          lat_arrivee: t.lat_arrivee, lng_arrivee: t.lng_arrivee,
        });

        let dep = coordsDirectes(t.lat_prise, t.lng_prise);
        if (!dep && t.adresse_prise) {
          dep = await geocoder(t.adresse_prise);
        }
        if (annule.current) return;
        avancer();

        let arr = coordsDirectes(t.lat_arrivee, t.lng_arrivee);
        if (!arr && t.adresse_arrivee) {
          arr = await geocoder(t.adresse_arrivee);
        }
        // 3) Diagnostic : pourquoi les coords d'arrivée sont nulles
        if (!arr) {
          const raison = t.lat_arrivee || t.lng_arrivee
            ? 'coords BD présentes mais invalides (0/non numériques)'
            : !t.adresse_arrivee
              ? 'adresse_arrivee absente/vide dans la réponse API → géocodage non tenté'
              : 'géocodage Nominatim a échoué (voir logs [geocoder])';
          console.warn(`[carte] trajet #${i + 1} ${t.code_trajet} : arrivée NON localisée — ${raison}`);
        }
        if (annule.current) return;
        avancer();

        resultat[i] = { depart: dep, arrivee: arr };
        setGeo({ ...resultat });
      }
      if (!annule.current) setChg(false);
    })();

    return () => { annule.current = true; };
  }, [trajetsTries, chauffeur]);

  // Tous les points résolus (pour fitBounds)
  const tousPoints = useMemo(() => {
    const pts = [];
    if (domicile) pts.push(domicile);
    trajetsTries.forEach((_, i) => {
      if (geo[i]?.depart) pts.push(geo[i].depart);
      if (geo[i]?.arrivee) pts.push(geo[i].arrivee);
    });
    return pts;
  }, [domicile, geo, trajetsTries]);

  // Lignes de liaison.
  // Chaque segment porte une clé dérivée de ses coordonnées : comme le géocodage
  // se résout de façon asynchrone et dans le désordre, une clé basée sur l'index
  // ferait réutiliser un même <Polyline> pour un autre segment sans redessiner le
  // tracé (bug react-leaflet). Une clé par coordonnées force un remount propre dès
  // que les points sont disponibles → les lignes bleues s'affichent bien.
  const lignes = useMemo(() => {
    const grises = [];   // pointillé gris (liaisons à vide)
    const bleues = [];   // trajet en charge
    let precedent = domicile;
    trajetsTries.forEach((t, i) => {
      const dep = geo[i]?.depart, arr = geo[i]?.arrivee;
      if (precedent && dep) grises.push({
        key: `g${i}-${precedent.lat},${precedent.lng}-${dep.lat},${dep.lng}`,
        seg: [[precedent.lat, precedent.lng], [dep.lat, dep.lng]],
        dist: distanceKm(precedent, dep),
      });
      if (dep && arr) bleues.push({
        key: `b${i}-${dep.lat},${dep.lng}-${arr.lat},${arr.lng}`,
        seg: [[dep.lat, dep.lng], [arr.lat, arr.lng]],
        mid: milieu(dep, arr),
        code: t.code_trajet,
        dist: distanceKm(dep, arr),
        duree: dureeHM(t.heure_prise, t.heure_arrivee),
      });
      precedent = arr || dep || precedent;
    });
    if (precedent && domicile && trajetsTries.length)
      grises.push({
        key: `gretour-${precedent.lat},${precedent.lng}-${domicile.lat},${domicile.lng}`,
        seg: [[precedent.lat, precedent.lng], [domicile.lat, domicile.lng]],
        dist: distanceKm(precedent, domicile),
      });
    return { grises, bleues };
  }, [domicile, geo, trajetsTries]);

  const centreDefaut = [46.8139, -71.2080]; // Québec

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'Arial,sans-serif' }}>
      {/* En-tête */}
      <div style={{ background: BLEU, color: 'white', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '16px' }}>
            🗺️ Trajets — {chauffeur?.prenom} {chauffeur?.nom}
            {chauffeur?.numero_chauffeur ? ` (N°${chauffeur.numero_chauffeur})` : ''}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.85 }}>
            {date} · {trajetsTries.length} trajet{trajetsTries.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
      </div>

      {/* Barre de progression géocodage */}
      {chargement && (
        <div style={{ background: '#FFF3E0', color: '#E65100', padding: '8px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span>⏳ Géolocalisation des adresses… {progres}%</span>
          <div style={{ flex: 1, height: 6, background: '#FFE0B2', borderRadius: 3, overflow: 'hidden', maxWidth: 240 }}>
            <div style={{ width: `${progres}%`, height: '100%', background: '#FB8C00', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Panneau latéral */}
        <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid #e0e0e0', overflowY: 'auto', background: '#fafafa' }}>
          {/* Domicile */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px' }}>⭐</span>
            <div>
              <div style={{ fontWeight: '700', color: BLEU, fontSize: '13px' }}>Domicile</div>
              <div style={{ fontSize: '12px', color: '#555' }}>{chauffeur?.adresse_domicile || '—'}</div>
              {!domicile && !chargement && (
                <div style={{ fontSize: '11px', color: '#c62828' }}>Adresse non localisée</div>
              )}
            </div>
          </div>

          {/* Liste trajets */}
          {trajetsTries.map((t, i) => {
            const localise = geo[i]?.depart || geo[i]?.arrivee;
            return (
              <div key={t.id ?? i} style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ background: '#4CAF50', color: 'white', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: BLEU }}>{t.code_trajet}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#555' }}>
                    {fmt(t.heure_prise)}–{fmt(t.heure_arrivee)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#333', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0 }}>🟢</span>
                  <span>{t.adresse_prise || '—'}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#333', display: 'flex', gap: '6px', alignItems: 'flex-start', marginTop: '2px' }}>
                  <span style={{ flexShrink: 0 }}>🔴</span>
                  <span>{t.adresse_arrivee || '—'}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', display: 'flex', gap: '10px' }}>
                  {dureeMin(t.heure_prise, t.heure_arrivee) && <span>⏱️ {dureeMin(t.heure_prise, t.heure_arrivee)}</span>}
                  {!localise && !chargement && <span style={{ color: '#c62828' }}>⚠️ non localisé</span>}
                </div>
              </div>
            );
          })}
          {trajetsTries.length === 0 && (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              Aucun trajet affecté pour cette date.
            </div>
          )}
        </div>

        {/* Carte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <MapContainer center={centreDefaut} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AjusterVue points={tousPoints} />

            {/* Liaisons à vide (pointillé gris) — distance au survol */}
            {lignes.grises.map(l => (
              <Polyline key={l.key} positions={l.seg} pathOptions={{ color: '#9e9e9e', weight: 2, dashArray: '6 8' }}>
                <Tooltip sticky>À vide{l.dist != null ? ` · ${l.dist} km` : ''}</Tooltip>
              </Polyline>
            ))}
            {/* Trajets en charge (bleu plein) — tooltip détaillé au survol */}
            {lignes.bleues.map(l => (
              <Polyline key={l.key} positions={l.seg} pathOptions={{ color: '#2196F3', weight: 4 }}>
                <Tooltip sticky>
                  <strong>{l.code}</strong><br />
                  📏 {l.dist != null ? `${l.dist} km` : '—'}<br />
                  ⏱️ {l.duree || '—'}
                </Tooltip>
              </Polyline>
            ))}
            {/* Libellé « X km / Xh Xmin » au milieu de chaque trajet en charge */}
            {lignes.bleues.map(l => (
              <Marker
                key={`lbl-${l.key}`}
                position={l.mid}
                interactive={false}
                icon={iconeLabel(`${l.dist != null ? `${l.dist} km` : '—'}${l.duree ? ` / ${l.duree}` : ''}`)}
              />
            ))}

            {/* Domicile */}
            {domicile && (
              <Marker position={[domicile.lat, domicile.lng]} icon={iconeDomicile}>
                <Popup>
                  <strong>Domicile</strong><br />
                  {chauffeur?.prenom} {chauffeur?.nom}<br />
                  {chauffeur?.adresse_domicile}
                </Popup>
              </Marker>
            )}

            {/* Départs / arrivées numérotés */}
            {trajetsTries.map((t, i) => (
              <Fragment key={t.id ?? i}>
                {geo[i]?.depart && (
                  <Marker position={[geo[i].depart.lat, geo[i].depart.lng]} icon={iconePastille(i + 1, '#4CAF50')}>
                    <Popup>
                      <strong>🟢 Départ - {t.code_trajet}</strong><br />
                      {fmt(t.heure_prise)}<br />
                      {t.adresse_prise}
                    </Popup>
                  </Marker>
                )}
                {geo[i]?.arrivee && (
                  <Marker position={[geo[i].arrivee.lat, geo[i].arrivee.lng]} icon={iconePastille(i + 1, '#F44336')}>
                    <Popup>
                      <strong>🔴 Arrivée - {t.code_trajet}</strong><br />
                      {fmt(t.heure_arrivee)}<br />
                      {t.adresse_arrivee}
                    </Popup>
                  </Marker>
                )}
              </Fragment>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
