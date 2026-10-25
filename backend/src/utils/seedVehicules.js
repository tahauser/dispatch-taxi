// Parc de démonstration (idempotent). Usage : node src/utils/seedVehicules.js
require('dotenv').config();
const pool = require('../models/db');

const j = (n) => { const d = new Date(Date.now() + n * 86400000); return d.toISOString().substring(0, 10); };

const VEHICULES = [
  ['T-101', 'H47 KTP', 'Toyota', 'Camry Hybrid', 2022, 'Blanc',  'TAXI',    4, 61200, 'actif',       j(210), j(300), j(40)],
  ['T-102', 'J83 MRD', 'Toyota', 'Prius',        2021, 'Blanc',  'TAXI',    4, 98400, 'actif',       j(150), j(120), j(-6)],
  ['T-103', 'K29 LBN', 'Hyundai','Sonata Hybrid',2023, 'Blanc',  'TAXI',    4, 28750, 'actif',       j(320), j(340), j(75)],
  ['T-104', 'L51 WQC', 'Ford',   'Escape Hybrid',2022, 'Blanc',  'TAXI',    4, 54300, 'actif',       j(18),  j(200), j(22)],
  ['T-105', 'M16 ZHA', 'Honda',  'Accord',       2020, 'Blanc',  'TAXI',    4, 132900,'actif',       j(95),  j(60),  j(10)],
  ['T-106', 'N72 XFE', 'Toyota', 'Corolla',      2021, 'Blanc',  'TAXI',    4, 87100, 'actif',       j(260), j(250), j(55)],
  ['B-201', 'P38 GVS', 'Lexus',  'ES 300h',      2023, 'Noir',   'BERLINE', 4, 22400, 'actif',       j(330), j(310), j(90)],
  ['B-202', 'R64 DTK', 'Chrysler','300',         2021, 'Noir',   'BERLINE', 4, 71800, 'actif',       j(140), j(180), j(30)],
  ['B-203', 'S95 YJP', 'Genesis','G80',          2022, 'Gris',   'BERLINE', 4, 47000, 'maintenance', j(200), j(220), j(-2)],
];

(async () => {
  try {
    for (const v of VEHICULES) {
      await pool.query(
        `INSERT INTO vehicules (numero_unite, immatriculation, marque, modele, annee, couleur, type_vehicule, nb_places,
           kilometrage, statut, date_assurance_exp, date_immat_exp, date_prochain_entretien)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (numero_unite) DO NOTHING`, v);
    }
    // Historique : 009 a déjà conduit T-101 (terminé) ; 021 conduit actuellement T-102
    const id = async (sql, p) => (await pool.query(sql, p)).rows[0]?.id;
    const ch = n => id(`SELECT id FROM chauffeurs WHERE numero_chauffeur=$1`, [n]);
    const ve = n => id(`SELECT id FROM vehicules WHERE numero_unite=$1`, [n]);
    const add = async (c, v, debut, fin) => {
      const cid = await ch(c), vid = await ve(v);
      if (!cid || !vid) return;
      const dej = await pool.query(`SELECT 1 FROM vehicule_affectations WHERE chauffeur_id=$1 AND vehicule_id=$2 AND date_debut=$3`, [cid, vid, debut]);
      if (!dej.rows.length)
        await pool.query(`INSERT INTO vehicule_affectations (vehicule_id, chauffeur_id, date_debut, date_fin) VALUES ($1,$2,$3,$4)`, [vid, cid, debut, fin]);
    };
    await add('009', 'T-101', j(-60), j(-30));
    await add('021', 'T-102', j(-20), null);
    // Inspections de démonstration
    const insp = async (v, type, depuis, prochaine, km, res, insp_, ko = []) => {
      const vid = await ve(v); if (!vid) return;
      const dej = await pool.query(`SELECT 1 FROM vehicule_inspections WHERE vehicule_id=$1 AND date_inspection=$2`, [vid, depuis]);
      if (dej.rows.length) return;
      const cl = Object.fromEntries(['freins','pneus','feux','essuie_glaces','ceintures','retroviseurs','extincteur','enseigne','carrosserie','proprete'].map(k => [k, !ko.includes(k)]));
      await pool.query(`INSERT INTO vehicule_inspections (vehicule_id, type_inspection, date_inspection, date_prochaine, kilometrage, resultat, inspecteur, checklist, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [vid, type, depuis, prochaine, km, res, insp_, JSON.stringify(cl), ko.length ? 'À corriger : ' + ko.join(', ') : null]);
    };
    await insp('T-101', 'periodique', j(-120), j(60),  60100, 'conforme',         'Garage Varennes');
    await insp('T-102', 'periodique', j(-200), j(-15), 97000, 'conforme',         'Garage Varennes');
    await insp('T-103', 'periodique', j(-30),  j(150), 28000, 'conforme',         'Garage Varennes');
    await insp('T-104', 'mecanique',  j(-170), j(10),  53500, 'conforme_reserve', 'Centre Auto Boucherville', ['pneus']);
    await insp('B-201', 'periodique', j(-60),  j(120), 22000, 'conforme',         'Garage Varennes');
    await insp('B-203', 'mecanique',  j(-5),   null,   47000, 'non_conforme',     'Centre Auto Boucherville', ['freins', 'feux']);
    // T-105, T-106, B-202 : jamais inspectés (pour montrer l'alerte)
    const n = await pool.query('SELECT COUNT(*)::int AS n FROM vehicules');
    console.log(`Parc OK : ${n.rows[0].n} véhicules`);
  } catch (e) { console.error('Erreur seed véhicules:', e.message); process.exitCode = 1; }
  await pool.end();
})();
