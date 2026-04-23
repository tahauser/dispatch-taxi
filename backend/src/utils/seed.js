/**
 * Script de génération de données de test
 * Efface et recrée des trajets + disponibilités aléatoires pour avril 2026 (7→30)
 * Usage: node src/utils/seed.js
 */

const pool = require('../models/db');
require('dotenv').config();

// ── Données de référence ──────────────────────────────────────────────────────

const ADRESSES_PRISE = [
  '1800 Henri-Blaquiere RUE Chambly J3L 3E9',
  '1000 Saint-Denis RUE Montreal H2X 0C1',
  '730 Abbe-Theoret AV Sainte-Julie J3E 0E1',
  '1730 Eiffel RUE Boucherville J4B 7W1',
  '5515 Saint-Jacques Montreal H4A 3A2',
  '227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8',
  '61 De Montbrun RUE Boucherville J4B 5T3',
  '2100 Boulevard Lapiniere Brossard J4W 2T5',
  '625 Lechasseur RUE Beloeil J3G 3N1',
  '3355 Autoroute Laval H7T 0H4',
  '980 Rue Sagard Montreal H2C 2X1',
  '450 Rue Sherbrooke E Montreal H2L 1J7',
  '1700 Boulevard Taschereau Longueuil J4G 1A4',
  '2505 Rue Ontario E Montreal H2K 1X3',
  '1070 Rue Sanguinet Montreal H2X 3E3',
  '3400 de Maisonneuve O Montreal H3Z 3B8',
  '88 Rue des Seigneurs Longueuil J4H 1W2',
  '150 Rue du Boisé Varennes J3X 1N4',
  '555 Rue Roland-Therrien Longueuil J4H 3V7',
  '2000 Chemin du Tremblay Boucherville J4B 6Y1',
];

const ADRESSES_ARRIVEE = [
  'Hopital Charles-Le Moyne, 3120 Boul. Taschereau Greenfield Park J4V 2H1',
  'CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1',
  'Hopital Maisonneuve-Rosemont, 5415 Boul. Assomption Montreal H1T 2M4',
  'Hopital du Sacre-Coeur, 5400 Gouin O Montreal H4J 1C5',
  'Clinique Rive-Sud, 5320 Cousineau Brossard J4Y 2X2',
  'Hopital Jean-Talon, 1385 Rue Jean-Talon E Montreal H2E 1S6',
  'CUSM - Glen, 1001 Decarie Montreal H4A 3J1',
  'Hopital Santa Cabrini, 5655 Rue Saint-Zotique E Montreal H1T 1P7',
  'Centre Hospitalier Pierre-Boucher, 1333 Montarville Longueuil J4M 2A5',
  'Clinique Medicale Sainte-Julie, 585 Rue Saint-Louis Sainte-Julie J3E 2A8',
  'Polyclinique de Longueuil, 800 Ch. Tiffin Longueuil J4P 3J7',
  'Hopital Anna-Laberge, 200 Boul. Brisebois Chateauguay J6K 4W8',
  'CLSC Longueuil-Est, 1905 Rue Alexandre-de-Sève Longueuil J4K 2P8',
  'Institut de Readaptation Gingras-Lindsay, 6300 Darlington Montreal H3S 2J4',
  'Hopital de Verdun, 4000 Boul. Lasalle Verdun H4G 2A3',
];

const NOTES_TRAJET = [
  null, null, null, null, null, // majorité sans note
  'Accès fauteuil roulant',
  'Patient fragile — conduite prudente',
  'Appeler à l\'arrivée',
  'Retour à confirmer',
  'Accompagnateur présent',
];

const NOTES_DISPO = [
  null, null, null, null, // majorité sans note
  'Disponible seulement le matin',
  'Pas de longue distance',
  'Zone Rive-Sud uniquement',
  'Disponible toute la journée',
  'Préfère les trajets courts',
];

const TYPES_VEHICULE = ['TAXI', 'TAXI', 'TAXI', 'BERLINE']; // 75% TAXI

// ── Utilitaires ───────────────────────────────────────────────────────────────

function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[ri(0, arr.length - 1)]; }
function pad(n) { return String(n).padStart(2, '0'); }
function hm(h, m = 0) { return `${pad(h)}:${pad(m)}`; }

function getDates() {
  const dates = [];
  for (let d = 7; d <= 30; d++) {
    dates.push(`2026-04-${pad(d)}`);
  }
  return dates;
}

function isWeekend(dateStr) {
  const day = new Date(dateStr + 'T12:00:00Z').getUTCDay();
  return day === 0 || day === 6;
}

// ── Script principal ──────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════');
  console.log('   SEED — Données de test Avril 2026');
  console.log('═══════════════════════════════════════════\n');

  // 1. Nettoyage
  console.log('🗑  Suppression des données existantes...');
  await pool.query('DELETE FROM envois_email');
  await pool.query('DELETE FROM affectations');
  await pool.query('DELETE FROM disponibilites');
  await pool.query('DELETE FROM trajets');
  console.log('   ✓ Tables vidées\n');

  // 2. Récupérer les chauffeurs actifs
  const { rows: chauffeurs } = await pool.query(
    'SELECT id, numero_chauffeur, nom, prenom, type_vehicule FROM chauffeurs WHERE actif = TRUE ORDER BY numero_chauffeur'
  );
  if (chauffeurs.length === 0) {
    console.error('❌ Aucun chauffeur actif trouvé. Importez d\'abord les chauffeurs.');
    process.exit(1);
  }
  console.log(`👥 ${chauffeurs.length} chauffeur(s) actif(s) trouvé(s)`);
  chauffeurs.forEach(c => console.log(`   • ${c.numero_chauffeur} — ${c.prenom} ${c.nom} (${c.type_vehicule})`));
  console.log();

  const dates = getDates();
  let trajetCount = 0;
  let dispoCount = 0;
  let affectCount = 0;

  // 3. Trajets par jour
  console.log('🚖 Génération des trajets...');
  const trajetsByDate = {};

  for (const date of dates) {
    const weekend = isWeekend(date);
    const nb = weekend ? ri(2, 5) : ri(4, 9);
    trajetsByDate[date] = [];

    // Générer des créneaux horaires non chevauchants dans la journée
    const slots = [];
    let cursor = 6 * 60; // début à 6h00

    for (let i = 0; i < nb; i++) {
      if (cursor >= 23 * 60) break;
      const gap = ri(10, 40);       // temps entre trajets
      const duree = ri(25, 95);     // durée du trajet
      const debut = cursor + gap;
      const fin = debut + duree;
      if (fin > 24 * 60) break;
      slots.push({ debut, fin });
      cursor = fin;
    }

    for (let i = 0; i < slots.length; i++) {
      const { debut, fin } = slots[i];
      const hDeb = Math.floor(debut / 60);
      const mDeb = debut % 60;
      const hFin = Math.floor(fin / 60);
      const mFin = fin % 60;

      // Code trajet: T + YYYYMMDD + seq (01..99)
      const seq = String(i + 1).padStart(2, '0');
      const code = `T${date.replace(/-/g, '')}${seq}`;
      const type = pick(TYPES_VEHICULE);
      const adressPrise = pick(ADRESSES_PRISE);
      const adressArr = pick(ADRESSES_ARRIVEE);
      const note = pick(NOTES_TRAJET);

      await pool.query(
        `INSERT INTO trajets
           (code_trajet, date_trajet, heure_prise, heure_arrivee, type_vehicule,
            adresse_prise, adresse_arrivee, notes, statut)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'en_attente')`,
        [code, date, hm(hDeb, mDeb), hm(hFin, mFin), type, adressPrise, adressArr, note]
      );
      trajetsByDate[date].push({ id: null, code, debut, fin, type });
      trajetCount++;
    }

    process.stdout.write(`\r   ${date} — ${slots.length} trajet(s)   `);
  }
  console.log(`\n   ✓ ${trajetCount} trajets créés\n`);

  // Récupérer les IDs des trajets insérés (pour les affectations)
  const { rows: allTrajets } = await pool.query(
    `SELECT id, code_trajet, date_trajet,
            EXTRACT(EPOCH FROM heure_prise)/3600  AS h_debut,
            EXTRACT(EPOCH FROM heure_arrivee)/3600 AS h_fin,
            type_vehicule
     FROM trajets ORDER BY date_trajet, heure_prise`
  );
  // Index par code
  const trajetById = {};
  allTrajets.forEach(t => {
    if (!trajetsByDate[t.date_trajet]) trajetsByDate[t.date_trajet] = [];
    // Met à jour l'id
    const existing = trajetsByDate[t.date_trajet].find(x => x.code === t.code_trajet);
    if (existing) existing.id = t.id;
    trajetById[t.id] = t;
  });

  // 4. Disponibilités par chauffeur par jour
  console.log('📅 Génération des disponibilités...');

  for (const chauffeur of chauffeurs) {
    for (const date of dates) {
      const weekend = isWeekend(date);
      const prob = weekend ? 0.35 : 0.80; // probabilité d'être disponible
      if (Math.random() > prob) continue;

      // 1 ou 2 blocs
      const deuxBlocs = Math.random() < 0.25;
      const note = pick(NOTES_DISPO);

      let blocs = [];
      if (!deuxBlocs) {
        const hDeb = ri(6, 13);
        const hFin = Math.min(hDeb + ri(4, 10), 24);
        blocs.push([hDeb, hFin]);
      } else {
        // matin + après-midi
        const hDeb1 = ri(6, 9);
        const hFin1 = ri(hDeb1 + 2, 13);
        const hDeb2 = ri(13, 16);
        const hFin2 = Math.min(hDeb2 + ri(2, 6), 24);
        blocs.push([hDeb1, hFin1], [hDeb2, hFin2]);
      }

      for (const [hD, hF] of blocs) {
        await pool.query(
          `INSERT INTO disponibilites
             (chauffeur_id, date_dispo, heure_debut, heure_fin, note_journee)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (chauffeur_id, date_dispo, heure_debut) DO NOTHING`,
          [chauffeur.id, date, hm(hD), hm(hF), note]
        );
        dispoCount++;
      }
    }

    process.stdout.write(`\r   ${chauffeur.numero_chauffeur} — ${chauffeur.prenom} OK   `);
  }
  console.log(`\n   ✓ ${dispoCount} créneaux de disponibilité créés\n`);

  // 5. Affectations aléatoires (~50% des trajets affectés)
  console.log('🔗 Génération des affectations...');

  // Récupérer les dispos avec leurs plages horaires
  const { rows: allDispos } = await pool.query(
    `SELECT chauffeur_id, date_dispo,
            EXTRACT(EPOCH FROM heure_debut)/3600 AS h_debut,
            EXTRACT(EPOCH FROM heure_fin)/3600   AS h_fin
     FROM disponibilites ORDER BY date_dispo, chauffeur_id`
  );

  // Index dispos par date → chauffeur_id → [blocs]
  const dispoMap = {};
  for (const d of allDispos) {
    const dateKey = d.date_dispo instanceof Date
      ? d.date_dispo.toISOString().split('T')[0]
      : String(d.date_dispo).split('T')[0];
    if (!dispoMap[dateKey]) dispoMap[dateKey] = {};
    if (!dispoMap[dateKey][d.chauffeur_id]) dispoMap[dateKey][d.chauffeur_id] = [];
    dispoMap[dateKey][d.chauffeur_id].push({
      debut: parseFloat(d.h_debut),
      fin:   parseFloat(d.h_fin),
    });
  }

  for (const trajet of allTrajets) {
    if (Math.random() > 0.55) continue; // ~45% des trajets restent non affectés

    const dateKey = trajet.date_trajet instanceof Date
      ? trajet.date_trajet.toISOString().split('T')[0]
      : String(trajet.date_trajet).split('T')[0];

    const tDeb = parseFloat(trajet.h_debut);
    const tFin = parseFloat(trajet.h_fin);
    const tType = trajet.type_vehicule;

    // Trouver les chauffeurs disponibles pour ce créneau
    const disponibles = chauffeurs.filter(ch => {
      // Compatibilité de type (BERLINE peut faire TAXI, TAXI peut faire TAXI)
      const typeOk = tType === 'TAXI' || ch.type_vehicule === tType;
      if (!typeOk) return false;
      const blocs = dispoMap[dateKey]?.[ch.id] || [];
      return blocs.some(b => b.debut <= tDeb && b.fin >= tFin);
    });

    if (disponibles.length === 0) continue;

    const choix = pick(disponibles);
    try {
      await pool.query(
        `INSERT INTO affectations
           (trajet_id, chauffeur_id, date_programme, proposee_par, statut)
         VALUES ($1,$2,$3,'manuel','proposee')`,
        [trajet.id, choix.id, dateKey]
      );
      affectCount++;
    } catch {
      // Conflit UNIQUE (trajet déjà affecté) — ignoré
    }
  }
  console.log(`   ✓ ${affectCount} affectation(s) créées\n`);

  // 6. Routes multi-stops de test
  console.log('6. Création des routes et stops de test…');

  // Adresses réalistes à Montréal pour les stops
  const STOPS_MONTREAL = [
    { adresse: '1000 Rue Saint-Denis, Montréal H2X 0C1',          lat: 45.5120, lng: -73.5615 },
    { adresse: 'CHUM, 1051 Rue Sanguinet, Montréal H2X 3E4',       lat: 45.5103, lng: -73.5601 },
    { adresse: 'Marché Jean-Talon, 7070 Av. Henri-Julien, Montréal H2S 3S3', lat: 45.5365, lng: -73.6164 },
    { adresse: '500 Rue Sherbrooke O, Montréal H3A 3C6',            lat: 45.5136, lng: -73.5772 },
    { adresse: 'Gare Centrale, 895 Rue de la Gauchetière O, Montréal H3B 4G1', lat: 45.4998, lng: -73.5697 },
    { adresse: 'Aéroport YUL, 975 Boul. Roméo-Vachon N, Dorval H4Y 1H1', lat: 45.4643, lng: -73.7440 },
    { adresse: '4000 Boul. Lasalle, Verdun H4G 2A3',                lat: 45.4658, lng: -73.5792 },
    { adresse: '3120 Boul. Taschereau, Greenfield Park J4V 2H1',    lat: 45.4752, lng: -73.4832 },
    { adresse: 'Université de Montréal, 2900 Boul. Édouard-Montpetit H3T 1J4', lat: 45.5008, lng: -73.6174 },
    { adresse: '5415 Boul. de l\'Assomption, Montréal H1T 2M4',     lat: 45.5607, lng: -73.5542 },
  ];

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  let routeCount = 0;
  let stopCount  = 0;

  // Supprimer les routes de test existantes
  await pool.query(`DELETE FROM routes WHERE nom LIKE 'Tournée seed%'`);

  // Créer 2 routes (une par chauffeur parmi les 2 premiers disponibles)
  const chauffeurRows = await pool.query(
    `SELECT id, nom, prenom FROM chauffeurs WHERE actif = true ORDER BY cree_le LIMIT 2`
  );

  const ROUTES_DEF = [
    { nom: 'Tournée seed matin', date: today,    heure_base: '08:00', nb_stops: 5 },
    { nom: 'Tournée seed aprèm', date: tomorrow, heure_base: '13:00', nb_stops: 5 },
  ];

  for (let r = 0; r < ROUTES_DEF.length; r++) {
    if (r >= chauffeurRows.rows.length) break;
    const chauffeur = chauffeurRows.rows[r];
    const def = ROUTES_DEF[r];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const routeRes = await client.query(
        `INSERT INTO routes (chauffeur_id, nom, date_planifiee)
         VALUES ($1, $2, $3) RETURNING *`,
        [chauffeur.id, def.nom, def.date]
      );
      const route = routeRes.rows[0];
      routeCount++;

      // 5 stops avec des horaires espacés de 30 min
      const stopsSlice = STOPS_MONTREAL.slice(r * 5, r * 5 + def.nb_stops);
      const [baseH, baseM] = def.heure_base.split(':').map(Number);

      for (let i = 0; i < stopsSlice.length; i++) {
        const s = stopsSlice[i];
        const minutesTotal = baseH * 60 + baseM + i * 30;
        const hh = String(Math.floor(minutesTotal / 60)).padStart(2, '0');
        const mm = String(minutesTotal % 60).padStart(2, '0');
        const heurePrevue = `${def.date}T${hh}:${mm}:00`;

        await client.query(
          `INSERT INTO stops
             (route_id, ordre, adresse, latitude, longitude,
              rayon_geofence_m, heure_arrivee_prevue)
           VALUES ($1,$2,$3,$4,$5,75,$6)`,
          [route.id, i + 1, s.adresse, s.lat, s.lng, heurePrevue]
        );
        stopCount++;
      }

      await client.query('COMMIT');
      console.log(`   ✓ Route "${def.nom}" — chauffeur ${chauffeur.prenom} ${chauffeur.nom} — ${def.nb_stops} stops`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`   ✗ Erreur route "${def.nom}":`, err.message);
    } finally {
      client.release();
    }
  }
  console.log(`   ✓ ${routeCount} route(s), ${stopCount} stop(s) créés\n`);

  // 7. Bilan final
  console.log('═══════════════════════════════════════════');
  console.log('✅  SEED TERMINÉ');
  console.log(`   Trajets        : ${trajetCount}`);
  console.log(`   Disponibilités : ${dispoCount}`);
  console.log(`   Affectations   : ${affectCount}`);
  console.log(`   Routes         : ${routeCount}`);
  console.log(`   Stops          : ${stopCount}`);
  console.log(`   Période        : 7 avril → 30 avril 2026`);
  console.log('═══════════════════════════════════════════\n');

  process.exit(0);
}

// ── Compte de test mobile (standalone) ───────────────────────────────────────

async function seedMobileTest() {
  const bcrypt = require('bcryptjs');
  console.log('═══════════════════════════════════════════');
  console.log('   SEED MOBILE TEST');
  console.log('═══════════════════════════════════════════\n');

  const passwordHash = await bcrypt.hash('MobileTest2026!', 10);

  // Upsert chauffeur sans ON CONFLICT (pas de contrainte UNIQUE sur email)
  const existing = await pool.query(
    `SELECT id FROM chauffeurs WHERE email = $1`,
    ['mobile-test@dispatchtaxi.local']
  );
  let mobileId;
  if (existing.rows.length > 0) {
    mobileId = existing.rows[0].id;
    await pool.query(
      `UPDATE chauffeurs SET mot_de_passe_hash = $1, actif = true WHERE id = $2`,
      [passwordHash, mobileId]
    );
  } else {
    const { rows } = await pool.query(`
      INSERT INTO chauffeurs
        (numero_chauffeur, nom, prenom, email, adresse_domicile,
         type_vehicule, actif, mot_de_passe_hash, role)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id`,
      [
        'MOB-001', 'Test', 'Mobile',
        'mobile-test@dispatchtaxi.local',
        '1 Rue Test, Montréal H0H 0H0',
        'TAXI', true, passwordHash, 'chauffeur',
      ]
    );
    mobileId = rows[0].id;
  }
  console.log(`✓ Chauffeur mobile-test (id: ${mobileId})`);

  // Route idempotente — SEED_DATE override pour tests multi-timezone
  const today = process.env.SEED_DATE || new Date().toISOString().split('T')[0];
  await pool.query(
    `DELETE FROM routes WHERE chauffeur_id = $1 AND nom = 'Tournée Mobile Test'`,
    [mobileId]
  );

  const routeRes = await pool.query(
    `INSERT INTO routes (chauffeur_id, nom, date_planifiee)
     VALUES ($1, 'Tournée Mobile Test', $2) RETURNING id`,
    [mobileId, today]
  );
  const routeId = routeRes.rows[0].id;

  const STOPS = [
    { ordre: 1, adresse: '1000 Rue de la Gauchetière O, Montréal', lat: 45.5009, lng: -73.5694, offset: 0 },
    { ordre: 2, adresse: '1500 Boul René-Lévesque O, Montréal',    lat: 45.4977, lng: -73.5786, offset: 30 },
    { ordre: 3, adresse: '2000 Rue Saint-Catherine O, Montréal',   lat: 45.4933, lng: -73.5829, offset: 60 },
  ];

  for (const s of STOPS) {
    const total = 8 * 60 + s.offset;
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    await pool.query(
      `INSERT INTO stops
         (route_id, ordre, adresse, latitude, longitude, rayon_geofence_m, heure_arrivee_prevue)
       VALUES ($1,$2,$3,$4,$5,50,$6)`,
      [routeId, s.ordre, s.adresse, s.lat, s.lng, `${today}T${hh}:${mm}:00`]
    );
  }

  console.log(`✓ Route 'Tournée Mobile Test' — ${STOPS.length} stops pour ${today}`);

  // Trajet + affectation pour le portail web (système trajets/affectations)
  const codeTrajet = `MOB-TRJ-${today.replace(/-/g, '')}`;
  const { rows: trajetRows } = await pool.query(
    `INSERT INTO trajets
       (code_trajet, date_trajet, heure_prise, heure_arrivee,
        type_vehicule, adresse_prise, adresse_arrivee, notes, statut)
     VALUES ($1,$2,'09:00','10:00','TAXI',
             '1 Rue Test, Montréal H0H 0H0',
             'CHUM, 1000 Rue Saint-Denis, Montréal H2X 0C1',
             'Trajet de test mobile','en_attente')
     ON CONFLICT (code_trajet) DO UPDATE
       SET date_trajet = EXCLUDED.date_trajet
     RETURNING id`,
    [codeTrajet, today]
  );
  const trajetId = trajetRows[0].id;

  await pool.query(
    `DELETE FROM affectations WHERE chauffeur_id = $1 AND date_programme = $2`,
    [mobileId, today]
  );
  await pool.query(
    `INSERT INTO affectations (trajet_id, chauffeur_id, date_programme, proposee_par, statut)
     VALUES ($1,$2,$3,'manuel','confirmee')`,
    [trajetId, mobileId, today]
  );
  console.log(`✓ Trajet '${codeTrajet}' + affectation (portail web) pour ${today}`);

  console.log(`✓ Email        : mobile-test@dispatchtaxi.local`);
  console.log(`✓ Mot de passe : MobileTest2026!`);
  console.log('═══════════════════════════════════════════\n');
}

if (process.env.MOBILE_ONLY === 'true') {
  seedMobileTest()
    .then(() => process.exit(0))
    .catch(err => { console.error('❌', err.message); process.exit(1); });
} else {
  run().catch(err => {
    console.error('\n❌ Erreur seed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}
