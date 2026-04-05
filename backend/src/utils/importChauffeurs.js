const bcrypt = require('bcryptjs');
const pool   = require('../models/db');
require('dotenv').config();

const chauffeurs = [
  { numero:'009', nom:'Tadili',   prenom:'Hatim',   email:'hatim.tadili@taxiexpress.ca',   tel:'514-384-1830', adresse:'500 Boul. Cremazie Est, Montreal H2P 1E7',   type:'TAXI' },
  { numero:'012', nom:'Dubois',   prenom:'Marc',    email:'marc.dubois@taxiexpress.ca',    tel:'514-555-0012', adresse:'227 Rue Principale, Longueuil J4H 1A1',       type:'TAXI' },
  { numero:'015', nom:'Tremblay', prenom:'Sophie',  email:'sophie.tremblay@taxiexpress.ca',tel:'514-555-0015', adresse:'1800 Henri-Blaquiere, Chambly J3L 3E9',       type:'BERLINE' },
  { numero:'021', nom:'Gagnon',   prenom:'Pierre',  email:'pierre.gagnon@taxiexpress.ca',  tel:'514-555-0021', adresse:'730 Abbe-Theoret, Sainte-Julie J3E 0E1',      type:'TAXI' },
  { numero:'034', nom:'Roy',      prenom:'Marie',   email:'marie.roy@taxiexpress.ca',      tel:'514-555-0034', adresse:'61 De Montbrun, Boucherville J4B 5T3',        type:'TAXI' },
  { numero:'041', nom:'Belanger', prenom:'Luc',     email:'luc.belanger@taxiexpress.ca',   tel:'514-555-0041', adresse:'3355 Autoroute, Laval H7T 0H4',              type:'TAXI' },
  { numero:'055', nom:'Cote',     prenom:'Julie',   email:'julie.cote@taxiexpress.ca',     tel:'514-555-0055', adresse:'2100 Boul. Lapiniere, Brossard J4W 2T5',     type:'BERLINE' },
];

async function importChauffeurs() {
  console.log('Import chauffeurs...');
  let ok = 0;
  for (const c of chauffeurs) {
    const mdp  = c.numero + 'Dispatch2026!';
    const hash = await bcrypt.hash(mdp, 10);
    await pool.query(
      `INSERT INTO chauffeurs
         (numero_chauffeur,nom,prenom,email,telephone,adresse_domicile,type_vehicule,actif,mot_de_passe_hash,role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,'chauffeur')
       ON CONFLICT (numero_chauffeur) DO UPDATE SET
         nom=EXCLUDED.nom, prenom=EXCLUDED.prenom, email=EXCLUDED.email,
         telephone=EXCLUDED.telephone, adresse_domicile=EXCLUDED.adresse_domicile,
         modifie_le=NOW()`,
      [c.numero,c.nom,c.prenom,c.email,c.tel,c.adresse,c.type,hash]
    );
    console.log(`  [OK] ${c.numero} | ${c.prenom} ${c.nom} | mdp: ${mdp}`);
    ok++;
  }
  console.log(`\nTotal: ${ok} chauffeurs importes`);
  process.exit(0);
}
importChauffeurs().catch(err => { console.error(err.message); process.exit(1); });
