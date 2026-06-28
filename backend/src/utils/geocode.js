/* ----------------------------------------------------------------------------
 * Géocodage Nominatim côté serveur (utilisé à l'import des trajets).
 *
 * Les adresses EXO sont mal formées pour un géocodage libre : code postal collé
 * (« J3X1A9 »), ville parfois après le code postal. On construit donc plusieurs
 * variantes, de la plus précise à la plus tolérante, et on garde la première qui
 * répond :
 *   1. code postal retiré + « , Québec, Canada »
 *   2. adresse telle quelle + « , Québec, Canada »  (POI répondant avec le CP)
 *   3. repli ville seule (dernier mot)              (centre-ville, mieux que rien)
 *
 * Nominatim impose ~1 requête/seconde : un cache mémoire évite de re-interroger
 * une adresse déjà résolue (les hôpitaux/points de prise reviennent souvent).
 * -------------------------------------------------------------------------- */

const RE_CP = /\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b/;
const memCache = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function ajouterRegion(s) {
  return /canada|qu[ée]bec|\bqc\b/i.test(s) ? s : `${s}, Québec, Canada`;
}

function construireCandidats(adresse) {
  const base = String(adresse || '').replace(/\s+/g, ' ').trim();
  if (!base) return [];
  const sansCp = base.replace(RE_CP, '').replace(/\s*,\s*,/g, ',').replace(/[,\s]+$/, '').replace(/\s+/g, ' ').trim();
  // ville = dernier mot une fois le code postal retiré (« … Varennes », « … Montréal »)
  const ville = sansCp.includes(',')
    ? sansCp.split(',').pop().trim()
    : (sansCp.split(/\s+/).pop() || '').trim();
  const cands = [
    ajouterRegion(sansCp),
    ajouterRegion(base),
    ville ? ajouterRegion(ville) : '',
  ].filter(Boolean);
  return [...new Set(cands)];
}

/**
 * Géocode une adresse. Retourne { lat, lng } ou null.
 * @param {string} adresse
 * @param {object} [opts] { pause:number=1100 } délai avant chaque requête réseau (ms)
 */
async function geocoderAdresse(adresse, opts = {}) {
  const cle = String(adresse || '').trim().toLowerCase();
  if (!cle) return null;
  if (memCache.has(cle)) return memCache.get(cle);

  const pause = opts.pause ?? 1100;
  for (const q of construireCandidats(adresse)) {
    try {
      await sleep(pause); // respect du rate-limit Nominatim (~1 req/s)
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}`
        + `&format=json&limit=1&countrycodes=ca`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'fr', 'User-Agent': 'dispatch-taxi/1.0 (geocode import)' },
      });
      const data = await res.json();
      const r = Array.isArray(data) && data[0]
        ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        : null;
      if (r && Number.isFinite(r.lat) && Number.isFinite(r.lng)) {
        memCache.set(cle, r);   // on ne cache que les succès
        return r;
      }
    } catch (e) {
      console.error('[geocode] échec requête:', q, '-', e?.message);
    }
  }
  return null;
}

module.exports = { geocoderAdresse, construireCandidats };
