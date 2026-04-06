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

function optimiserAffectations(trajets, chauffeurs) {
  const trajetsTries = [...trajets].sort((a,b) => toMinutes(a.heure_prise)-toMinutes(b.heure_prise));
  const etat = {};
  chauffeurs.forEach(c => {
    etat[c.id] = { libre_a: 0, lat: c.lat_domicile, lng: c.lng_domicile };
  });
  const affectations = [], nonAffectes = [];

  for (const trajet of trajetsTries) {
    const hPrise = toMinutes(trajet.heure_prise);
    const hArr   = toMinutes(trajet.heure_arrivee);
    const candidats = chauffeurs.filter(c => {
      if (trajet.type_vehicule && trajet.type_vehicule !== 'TAXI' &&
          c.type_vehicule !== trajet.type_vehicule) return false;
      if (etat[c.id].libre_a > hPrise) return false;
      return c.disponibilites?.some(d =>
        toMinutes(d.heure_debut) <= hPrise && toMinutes(d.heure_fin) > hPrise
      );
    });
    if (candidats.length === 0) { nonAffectes.push(trajet.code_trajet); continue; }
    let meilleur = null, distMin = Infinity;
    for (const c of candidats) {
      const dist = distanceKm(etat[c.id].lat, etat[c.id].lng, trajet.lat_prise, trajet.lng_prise);
      if (dist < distMin) { distMin = dist; meilleur = c; }
    }
    if (meilleur) {
      affectations.push({ trajet_id: trajet.id, chauffeur_id: meilleur.id,
        distance_km: Math.round(distMin*10)/10, proposee_par: 'systeme' });
      etat[meilleur.id] = { libre_a: hArr, lat: trajet.lat_prise, lng: trajet.lng_prise };
    }
  }
  return { affectations, nonAffectes };
}

module.exports = { optimiserAffectations, distanceKm, toMinutes };
