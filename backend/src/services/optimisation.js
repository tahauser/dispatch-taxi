// Constantes algorithme d'affectation
const BUFFER_MIN      = 20;   // temps tampon minimum entre deux trajets (minutes)
const SEUIL_PROXIMITE = 120;  // 2h — au-delà de ce délai on favorise la proximité domicile
const RAYON_PROCHE    = 10;   // km — bonus proximité domicile
const RAYON_TRES_PROCHE = 5;  // km — bonus proximité supplémentaire

// Distance Haversine entre deux points GPS (km)
function distanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 9999;
  const R = 6371;
  const dLat = ((lat2-lat1)*Math.PI)/180;
  const dLng = ((lng2-lng1)*Math.PI)/180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h,m] = String(timeStr).split(':').map(Number);
  return h*60+m;
}

function hhmm(timeStr) {
  return String(timeStr || '').substring(0,5);
}

// Zone de prise en charge : ville extraite de l'adresse, sinon grille GPS (~5 km).
// Sert à chaîner les trajets d'une même zone sur le même chauffeur — cas EXO :
// plusieurs patients pris en charge à Varennes vers des hôpitaux de Montréal ;
// on garde le chauffeur sur sa zone de prise plutôt que d'en mobiliser un nouveau.
function zonePrise(trajet) {
  const adr = String(trajet.adresse_prise || '').trim();
  // Code postal canadien "A1A 1A1" suivi de la ville en fin d'adresse
  const m = adr.match(/[A-Za-z]\d[A-Za-z]\s*\d[A-Za-z]\d\s+(.+)$/);
  if (m) return m[1].trim().toLowerCase();
  // Repli : grille GPS ~0.05° (~5 km)
  if (trajet.lat_prise && trajet.lng_prise)
    return `${Math.round(trajet.lat_prise/0.05)}:${Math.round(trajet.lng_prise/0.05)}`;
  return '?';
}

// 1. Cohérence type de véhicule : strict si le trajet impose un type
function typeCompatible(trajet, chauffeur) {
  if (!trajet.type_vehicule) return true;
  return chauffeur.type_vehicule === trajet.type_vehicule;
}

// Le chauffeur a-t-il une disponibilité couvrant le trajet ?
//  - complet=false : disponible au moins à l'heure de prise en charge
//  - complet=true  : disponible sur toute la durée du trajet
function dispoCouvrante(chauffeur, hPrise, hArr, complet) {
  const dispos = chauffeur.disponibilites || [];
  return dispos.some(d => {
    const deb = toMinutes(d.heure_debut);
    const fin = toMinutes(d.heure_fin);
    return complet ? (deb <= hPrise && fin >= hArr) : (deb <= hPrise && fin > hPrise);
  });
}

// 5. Détermine la raison précise pour laquelle aucun chauffeur n'a pu être affecté
function raisonNonAffecte(trajet, chauffeurs, etat, hPrise, hArr) {
  const typeT = trajet.type_vehicule || '?';

  // Aucun chauffeur du bon type de véhicule
  const bonsTypes = chauffeurs.filter(c => typeCompatible(trajet, c));
  if (bonsTypes.length === 0) return `Aucun chauffeur de type ${typeT} disponible`;

  // Aucun chauffeur du bon type avec une dispo sur cette plage
  const avecDispo = bonsTypes.filter(c => dispoCouvrante(c, hPrise, hArr, false));
  if (avecDispo.length === 0) return `Aucun chauffeur ${typeT} libre sur cette plage`;

  // Il reste des conflits horaires / tampons insuffisants
  let conflit = null, tamponMin = null;
  for (const c of avecDispo) {
    const st = etat[c.id];
    if (st.libre_a <= 0) continue;
    const gap = hPrise - st.libre_a;
    if (gap < 0)              conflit  = st.dernier_code;            // chevauchement
    else if (gap < BUFFER_MIN && (tamponMin === null || gap < tamponMin)) tamponMin = gap;
  }
  if (conflit)            return `Conflit horaire avec ${conflit}`;
  if (tamponMin !== null) return `Temps tampon insuffisant (${tamponMin} min, minimum ${BUFFER_MIN} min requis)`;
  return `Aucun chauffeur disponible pour cette heure`;
}

// Score d'affectation d'un trajet pour un chauffeur, selon l'état courant
// (st = position et heure de libération avant ce trajet).
function scoreAffectation(chauffeur, trajet, st, hPrise, hArr) {
  let score = 100; // +100 type véhicule compatible (toujours vrai à ce stade)
  if (dispoCouvrante(chauffeur, hPrise, hArr, true)) score += 50;     // +50 dispo sur toute la durée

  const gap = st.libre_a > 0 ? hPrise - st.libre_a : null;
  if (gap === null || gap > BUFFER_MIN) score += 30;                   // +30 tampon > 20 min (ou 1er trajet)

  const distDom = distanceKm(chauffeur.lat_domicile, chauffeur.lng_domicile, trajet.lat_prise, trajet.lng_prise);
  if (distDom < RAYON_PROCHE)      score += 20;                        // +20 domicile < 10 km
  if (distDom < RAYON_TRES_PROCHE) score += 10;                        // +10 domicile < 5 km (bonus)
  return score;
}

// --- Trajets à vide (dead runs) --------------------------------------------

// Vérifie qu'une séquence ordonnée de trajets reste réalisable par un chauffeur,
// avec exactement les contraintes dures de l'affectation gloutonne :
// type véhicule, disponibilité à la prise, et tampon BUFFER_MIN entre trajets.
function sequenceRealisable(seq, chauffeur) {
  let libre_a = 0;
  for (const t of seq) {
    const hP = toMinutes(t.heure_prise);
    const hA = toMinutes(t.heure_arrivee);
    if (!typeCompatible(t, chauffeur)) return false;
    if (!dispoCouvrante(chauffeur, hP, hA, false)) return false;
    if (libre_a > 0 && (hP - libre_a) < BUFFER_MIN) return false;
    libre_a = hA;
  }
  return true;
}

// Distance totale à vide d'une séquence : domicile → 1ère prise,
// puis arrivee_N → prise_N+1 entre trajets consécutifs.
function deadRunSequence(seq, chauffeur) {
  let total = 0;
  let lat = chauffeur.lat_domicile, lng = chauffeur.lng_domicile;
  for (const t of seq) {
    total += distanceKm(lat, lng, t.lat_prise, t.lng_prise);
    lat = t.lat_arrivee; lng = t.lng_arrivee;
  }
  return total;
}

function deadRunTotal(seqs, chauffeursById) {
  let total = 0;
  for (const id of Object.keys(seqs)) total += deadRunSequence(seqs[id], chauffeursById[id]);
  return total;
}

const trierParPrise = (seq) =>
  [...seq].sort((a,b) => toMinutes(a.heure_prise)-toMinutes(b.heure_prise));
const remplacer = (seq, idx, trajet) => seq.map((t,i) => i===idx ? trajet : t);
const retirer   = (seq, idx) => seq.filter((_,i) => i!==idx);

// 7. Optimisation locale : réduire la distance à vide TOTALE (somme des trajets
// à vide de tous les chauffeurs). Recherche par meilleure amélioration : à chaque
// passe on évalue, pour chaque paire de chauffeurs (A,B), tous les mouvements :
//   - SWAP     : échanger un trajet de A avec un trajet de B
//   - RELOCATE : déplacer un trajet de A vers B (et inversement)
// et on applique le seul mouvement qui fait le plus baisser le total global.
// Un mouvement n'est retenu que s'il garde les deux séquences réalisables
// (type, dispo, tampon 20 min) ET réduit le total à vide (les autres chauffeurs
// étant inchangés, la baisse de la paire = baisse du total global).
// Renvoie { avant, apres } en km pour journalisation.
function optimiserEchanges(seqs, chauffeursById) {
  const ids = Object.keys(seqs);
  const SEUIL = 1e-6;
  const avant = deadRunTotal(seqs, chauffeursById);
  let garde = 0;

  while (garde < 5000) {
    garde++;
    let meilleurGain = SEUIL, meilleurMove = null;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const A = ids[i], B = ids[j];
        const chA = chauffeursById[A], chB = chauffeursById[B];
        const coutBase = deadRunSequence(seqs[A], chA) + deadRunSequence(seqs[B], chB);

        const evaluer = (nA, nB) => {
          if (!sequenceRealisable(nA, chA) || !sequenceRealisable(nB, chB)) return;
          const gain = coutBase - (deadRunSequence(nA, chA) + deadRunSequence(nB, chB));
          if (gain > meilleurGain) { meilleurGain = gain; meilleurMove = { A, B, nA, nB }; }
        };

        // SWAP
        for (let a = 0; a < seqs[A].length; a++)
          for (let b = 0; b < seqs[B].length; b++)
            evaluer(
              trierParPrise(remplacer(seqs[A], a, seqs[B][b])),
              trierParPrise(remplacer(seqs[B], b, seqs[A][a]))
            );
        // RELOCATE A → B
        for (let a = 0; a < seqs[A].length; a++)
          evaluer(retirer(seqs[A], a), trierParPrise([...seqs[B], seqs[A][a]]));
        // RELOCATE B → A
        for (let b = 0; b < seqs[B].length; b++)
          evaluer(trierParPrise([...seqs[A], seqs[B][b]]), retirer(seqs[B], b));
      }
    }

    if (!meilleurMove) break;            // optimum local atteint
    seqs[meilleurMove.A] = meilleurMove.nA;
    seqs[meilleurMove.B] = meilleurMove.nB;
  }

  const apres = deadRunTotal(seqs, chauffeursById);
  return { avant, apres };
}

function optimiserAffectations(trajets, chauffeurs) {
  // 6. Traiter les trajets par ordre chronologique
  const trajetsTries = trierParPrise(trajets);

  // État courant de chaque chauffeur + séquence de trajets affectés
  const etat = {}, seqs = {}, chauffeursById = {};
  chauffeurs.forEach(c => {
    etat[c.id] = { libre_a: 0, lat: c.lat_domicile, lng: c.lng_domicile, dernier_code: null, zone_prise: null };
    seqs[c.id] = [];
    chauffeursById[c.id] = c;
  });

  const nonAffectes = [], details = [];

  for (const trajet of trajetsTries) {
    const hPrise = toMinutes(trajet.heure_prise);
    const hArr   = toMinutes(trajet.heure_arrivee);

    // Sélection des candidats (contraintes dures)
    const candidats = chauffeurs.filter(c => {
      if (!typeCompatible(trajet, c)) return false;             // 1. type véhicule
      if (!dispoCouvrante(c, hPrise, hArr, false)) return false; // disponible à la prise
      const st = etat[c.id];
      if (st.libre_a > 0 && (hPrise - st.libre_a) < BUFFER_MIN) return false; // 2. tampon 20 min
      return true;
    });

    if (candidats.length === 0) {
      nonAffectes.push(trajet.code_trajet);
      const raison = raisonNonAffecte(trajet, chauffeurs, etat, hPrise, hArr);
      details.push(`${trajet.code_trajet} (${hhmm(trajet.heure_prise)}-${hhmm(trajet.heure_arrivee)} ${trajet.type_vehicule || '?'}): ${raison}`);
      continue;
    }

    // 4. Score d'affectation par candidat
    const zoneT = zonePrise(trajet);
    let meilleur = null, meilleurScore = -1, meilleurZone = -1, meilleurDist = Infinity;
    for (const c of candidats) {
      const st = etat[c.id];
      const score = scoreAffectation(c, trajet, st, hPrise, hArr);

      // Affinité de zone : ce chauffeur vient-il de prendre en charge dans la même
      // zone (même ville/quartier) ? On chaîne alors les trajets consécutifs d'une
      // même zone sur lui plutôt que de mobiliser un nouveau chauffeur.
      const zoneMatch = (st.libre_a > 0 && st.zone_prise === zoneT) ? 1 : 0;

      // Critère de départage : si le délai > 2h on favorise la proximité du domicile,
      // sinon la proximité depuis la position courante (fin du trajet précédent)
      const gap     = st.libre_a > 0 ? hPrise - st.libre_a : null;
      const delai   = gap === null ? Infinity : gap;
      const distRef = (delai > SEUIL_PROXIMITE)
        ? distanceKm(c.lat_domicile, c.lng_domicile, trajet.lat_prise, trajet.lng_prise)
        : distanceKm(st.lat, st.lng, trajet.lat_prise, trajet.lng_prise);

      // Départage à score égal : d'abord l'affinité de zone, puis la distance à vide.
      if (score > meilleurScore ||
          (score === meilleurScore && zoneMatch > meilleurZone) ||
          (score === meilleurScore && zoneMatch === meilleurZone && distRef < meilleurDist)) {
        meilleurScore = score; meilleurZone = zoneMatch; meilleurDist = distRef; meilleur = c;
      }
    }

    seqs[meilleur.id].push(trajet);
    // Après le trajet, le chauffeur est au point d'ARRIVÉE (pas à la prise) :
    // c'est de là que part le prochain trajet à vide.
    etat[meilleur.id] = {
      libre_a: hArr, lat: trajet.lat_arrivee, lng: trajet.lng_arrivee,
      dernier_code: trajet.code_trajet, zone_prise: zoneT
    };
  }

  // 7. Réduire les trajets à vide par échanges / déplacements entre chauffeurs
  const { avant, apres } = optimiserEchanges(seqs, chauffeursById);
  const gain = avant - apres;
  console.log(
    `[optimisation] trajets à vide total : ${avant.toFixed(1)} km -> ${apres.toFixed(1)} km ` +
    `(gain ${gain.toFixed(1)} km / ${avant > 0 ? ((gain/avant)*100).toFixed(1) : '0.0'} %)`
  );

  // Reconstruction des affectations à partir des séquences optimisées.
  // distance_km = trajet à vide réel en amont (domicile/arrivée précédente → prise).
  const affectations = [];
  for (const c of chauffeurs) {
    let st = { libre_a: 0, lat: c.lat_domicile, lng: c.lng_domicile };
    for (const t of seqs[c.id]) {
      const hP = toMinutes(t.heure_prise), hA = toMinutes(t.heure_arrivee);
      const distVide = distanceKm(st.lat, st.lng, t.lat_prise, t.lng_prise);
      affectations.push({
        trajet_id: t.id,
        chauffeur_id: c.id,
        score: scoreAffectation(c, t, st, hP, hA),
        distance_km: Math.round(distVide*10)/10,
        proposee_par: 'systeme'
      });
      st = { libre_a: hA, lat: t.lat_arrivee, lng: t.lng_arrivee };
    }
  }

  const deadRunKm      = Math.round(apres*10)/10;
  const deadRunAvantKm = Math.round(avant*10)/10;
  return { affectations, nonAffectes, details, deadRunKm, deadRunAvantKm };
}

module.exports = { optimiserAffectations, distanceKm, toMinutes, deadRunTotal };
