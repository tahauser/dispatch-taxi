const pool = require('../models/db');
require('dotenv').config();

const trajets = [
  { code:'TVT0001', date:'2026-04-07', prise:'07:15', arrivee:'08:12', type:'TAXI',    addr_prise:'1800 Henri-Blaquiere RUE Chambly J3L 3E9', addr_arr:'Hopital Charles-Le Moyne, Greenfield Park J4V 2H1' },
  { code:'TVT0002', date:'2026-04-07', prise:'08:30', arrivee:'09:15', type:'TAXI',    addr_prise:'1000 Saint-Denis RUE Montreal H2X 0C1', addr_arr:'CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1' },
  { code:'TVT0003', date:'2026-04-07', prise:'09:00', arrivee:'10:05', type:'BERLINE', addr_prise:'730 Abbe-Theoret AV Sainte-Julie J3E 0E1', addr_arr:'Hopital Maisonneuve-Rosemont, Montreal H1T 2M4', notes:'Acces fauteuil roulant' },
  { code:'TVT0004', date:'2026-04-07', prise:'10:30', arrivee:'11:20', type:'TAXI',    addr_prise:'1800 Henri-Blaquiere RUE Chambly J3L 3E9', addr_arr:'Hopital du Sacre-Coeur, Montreal H4J 1C5' },
  { code:'TVT0005', date:'2026-04-07', prise:'11:00', arrivee:'11:55', type:'TAXI',    addr_prise:'1730 Eiffel RUE Boucherville J4B 7W1', addr_arr:'Clinique Rive-Sud, Brossard J4Y 2X2' },
  { code:'TVT0006', date:'2026-04-07', prise:'11:55', arrivee:'12:50', type:'TAXI',    addr_prise:'5515 Saint-Jacques Montreal H4A', addr_arr:'CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1' },
  { code:'TVT0007', date:'2026-04-07', prise:'13:40', arrivee:'14:32', type:'TAXI',    addr_prise:'227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8', addr_arr:'Hopital Charles-Le Moyne, Greenfield Park J4V 2H1' },
  { code:'TVT0008', date:'2026-04-07', prise:'14:39', arrivee:'15:07', type:'TAXI',    addr_prise:'61 De Montbrun RUE Boucherville J4B 5T3', addr_arr:'Hopital Maisonneuve-Rosemont, Montreal H1T 2M4' },
  { code:'TVT0009', date:'2026-04-07', prise:'15:45', arrivee:'16:29', type:'TAXI',    addr_prise:'1000 Saint-Denis RUE Montreal H2X 0C1', addr_arr:'CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1' },
  { code:'TVT0010', date:'2026-04-07', prise:'16:00', arrivee:'16:50', type:'BERLINE', addr_prise:'2100 Boulevard Lapiniere Brossard J4W 2T5', addr_arr:'Clinique Rive-Sud, Brossard J4Y 2X2', notes:'Acces fauteuil roulant' },
  { code:'TVT0011', date:'2026-04-07', prise:'17:30', arrivee:'18:20', type:'TAXI',    addr_prise:'980 Rue Sagard Montreal H2C 2X1', addr_arr:'Hopital du Sacre-Coeur, Montreal H4J 1C5' },
  { code:'TVT0012', date:'2026-04-07', prise:'20:50', arrivee:'21:56', type:'TAXI',    addr_prise:'625 Lechasseur RUE Beloeil J3G 3N1', addr_arr:'Hopital Charles-Le Moyne, Greenfield Park J4V 2H1' },
  { code:'TVT0013', date:'2026-04-07', prise:'22:45', arrivee:'23:01', type:'TAXI',    addr_prise:'3355 Autoroute Laval H7T 0H4', addr_arr:'CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1' },
  { code:'TVT0014', date:'2026-04-08', prise:'07:00', arrivee:'07:55', type:'TAXI',    addr_prise:'980 Rue Sagard Montreal H2C 2X1', addr_arr:'Hopital Maisonneuve-Rosemont, Montreal H1T 2M4' },
  { code:'TVT0015', date:'2026-04-08', prise:'08:00', arrivee:'09:10', type:'BERLINE', addr_prise:'3355 Autoroute Laval H7T 0H4', addr_arr:'Hopital du Sacre-Coeur, Montreal H4J 1C5', notes:'Acces fauteuil roulant' },
  { code:'TVT0016', date:'2026-04-08', prise:'09:30', arrivee:'10:25', type:'TAXI',    addr_prise:'730 Abbe-Theoret AV Sainte-Julie J3E 0E1', addr_arr:'Hopital Charles-Le Moyne, Greenfield Park J4V 2H1' },
  { code:'TVT0017', date:'2026-04-08', prise:'10:00', arrivee:'10:45', type:'TAXI',    addr_prise:'5515 Saint-Jacques Montreal H4A', addr_arr:'CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1' },
  { code:'TVT0018', date:'2026-04-08', prise:'11:15', arrivee:'12:10', type:'TAXI',    addr_prise:'227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8', addr_arr:'Hopital Maisonneuve-Rosemont, Montreal H1T 2M4' },
  { code:'TVT0019', date:'2026-04-08', prise:'12:30', arrivee:'13:20', type:'TAXI',    addr_prise:'625 Lechasseur RUE Beloeil J3G 3N1', addr_arr:'Clinique Rive-Sud, Brossard J4Y 2X2' },
  { code:'TVT0020', date:'2026-04-08', prise:'13:00', arrivee:'14:05', type:'BERLINE', addr_prise:'2100 Boulevard Lapiniere Brossard J4W 2T5', addr_arr:'Hopital du Sacre-Coeur, Montreal H4J 1C5' },
  { code:'TVT0021', date:'2026-04-08', prise:'14:30', arrivee:'15:15', type:'TAXI',    addr_prise:'1800 Henri-Blaquiere RUE Chambly J3L 3E9', addr_arr:'Hopital Charles-Le Moyne, Greenfield Park J4V 2H1' },
  { code:'TVT0022', date:'2026-04-08', prise:'15:00', arrivee:'15:50', type:'TAXI',    addr_prise:'1730 Eiffel RUE Boucherville J4B 7W1', addr_arr:'CHUM, 1000 Rue Saint-Denis, Montreal H2X 0C1' },
  { code:'TVT0023', date:'2026-04-08', prise:'16:30', arrivee:'17:25', type:'TAXI',    addr_prise:'227 du Golf RUE Mont-Saint-Hilaire J3H 5Z8', addr_arr:'Hopital Maisonneuve-Rosemont, Montreal H1T 2M4' },
  { code:'TVT0024', date:'2026-04-08', prise:'19:00', arrivee:'19:55', type:'TAXI',    addr_prise:'1000 Saint-Denis RUE Montreal H2X 0C1', addr_arr:'Clinique Rive-Sud, Brossard J4Y 2X2' },
  { code:'TVT0025', date:'2026-04-08', prise:'21:30', arrivee:'22:15', type:'BERLINE', addr_prise:'1730 Eiffel RUE Boucherville J4B 7W1', addr_arr:'Hopital Charles-Le Moyne, Greenfield Park J4V 2H1', notes:'Acces fauteuil roulant' },
];

async function run() {
  console.log('Import trajets...');
  let ok = 0;
  for (const t of trajets) {
    await pool.query(
      `INSERT INTO trajets (code_trajet,date_trajet,heure_prise,heure_arrivee,type_vehicule,adresse_prise,adresse_arrivee,notes,statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'en_attente')
       ON CONFLICT (code_trajet) DO UPDATE SET
         date_trajet=EXCLUDED.date_trajet,heure_prise=EXCLUDED.heure_prise,
         heure_arrivee=EXCLUDED.heure_arrivee,adresse_prise=EXCLUDED.adresse_prise,
         adresse_arrivee=EXCLUDED.adresse_arrivee,modifie_le=NOW()`,
      [t.code,t.date,t.prise,t.arrivee,t.type,t.addr_prise,t.addr_arr,t.notes||null]
    );
    console.log('  [OK] ' + t.code + ' | ' + t.date + ' | ' + t.prise);
    ok++;
  }
  console.log('Total: ' + ok + ' trajets importes');
  process.exit(0);
}
run().catch(err => { console.error(err.message); process.exit(1); });
