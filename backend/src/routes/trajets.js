const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const multer  = require('multer');
const XLSX    = require('xlsx');
const router  = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', authMiddleware, async (req, res) => {
  const { date, statut } = req.query;
  try {
    let query, params;
    if (req.user.role === 'chauffeur') {
      query = `
        SELECT t.id, t.code_trajet, t.date_trajet, t.heure_prise, t.heure_arrivee,
               t.type_vehicule, t.adresse_prise, t.code_fixe, t.notes, t.statut
        FROM trajets t
        JOIN affectations a ON a.trajet_id = t.id AND a.chauffeur_id = $1
        WHERE ($2::date IS NULL OR t.date_trajet = $2)
        ORDER BY t.date_trajet, t.heure_prise`;
      params = [req.user.id, date || null];
    } else {
      query = `
        SELECT t.*,
               c.nom AS chauffeur_nom, c.prenom AS chauffeur_prenom, c.numero_chauffeur,
               a.statut AS statut_affectation, a.proposee_par
        FROM trajets t
        LEFT JOIN affectations a ON a.trajet_id = t.id AND a.date_programme = t.date_trajet
        LEFT JOIN chauffeurs c ON c.id = a.chauffeur_id
        WHERE ($1::date IS NULL OR t.date_trajet = $1)
          AND ($2::varchar IS NULL OR t.statut = $2)
        ORDER BY t.date_trajet, t.heure_prise`;
      params = [date || null, statut || null];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET trajets:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/dates/disponibles', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT date_trajet,
             COUNT(*) AS nb_trajets,
             SUM(CASE WHEN statut='en_attente' THEN 1 ELSE 0 END) AS nb_non_affectes
      FROM trajets
      WHERE date_trajet >= CURRENT_DATE
      GROUP BY date_trajet ORDER BY date_trajet`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

// POST /api/trajets/import-excel — import format EXO
router.post('/import-excel', authMiddleware, requireRole('dispatch','admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Fichier Excel requis (champ: file)' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) return res.status(400).json({ message: 'Fichier vide ou format invalide' });

    // Normalise une clé de colonne (strip accents, lower, trim)
    function normKey(k) {
      return String(k).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    }

    // Build alias map from first row keys
    const sampleKeys = Object.keys(rows[0]);
    const aliasMap = {};
    sampleKeys.forEach(k => { aliasMap[normKey(k)] = k; });

    function col(row, ...aliases) {
      for (const a of aliases) {
        const norm = normKey(a);
        if (aliasMap[norm] !== undefined) {
          const val = row[aliasMap[norm]];
          if (val !== undefined && val !== '') return String(val).trim();
        }
      }
      return '';
    }

    function parseDate(v) {
      if (!v) return null;
      if (v instanceof Date) return v.toISOString().split('T')[0];
      // Excel serial number
      if (typeof v === 'number') {
        const d = XLSX.SSF.parse_date_code(v);
        if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
      }
      // String like DD/MM/YYYY or YYYY-MM-DD
      const s = String(v).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (m) {
        const y = m[3].length === 2 ? '20' + m[3] : m[3];
        return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
      }
      return s;
    }

    function parseTime(v) {
      if (!v) return null;
      if (v instanceof Date) return v.toTimeString().substring(0,5);
      if (typeof v === 'number') {
        // Excel time fraction
        const totalMin = Math.round(v * 24 * 60);
        const h = Math.floor(totalMin / 60) % 24;
        const m = totalMin % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      }
      const s = String(v).trim();
      const m = s.match(/^(\d{1,2}):(\d{2})/);
      if (m) return `${m[1].padStart(2,'0')}:${m[2]}`;
      return s;
    }

    let importes = 0, doublons = 0, erreurs = 0;
    const erreursDetail = [];

    for (const row of rows) {
      try {
        const codeTrajet = col(row, 'Code trajet', 'Code_trajet', 'code trajet', 'CODE TRAJET');
        if (!codeTrajet) { erreurs++; erreursDetail.push('Ligne sans code trajet ignorée'); continue; }

        const dateTrajet = parseDate(col(row, 'Date', 'DATE'));
        if (!dateTrajet) { erreurs++; erreursDetail.push(`${codeTrajet}: date invalide`); continue; }

        const heurePrise   = parseTime(col(row, 'Heure prise', 'Heure_prise', 'HEURE PRISE'));
        const heureArrivee = parseTime(col(row, 'Heure arrivée', 'Heure arrivee', 'Heure_arrivee', 'HEURE ARRIVEE'));
        if (!heurePrise || !heureArrivee) {
          erreurs++; erreursDetail.push(`${codeTrajet}: heure invalide`); continue;
        }

        const cpPrise      = col(row, 'CP prise', 'CP_prise');
        const villePrise   = col(row, 'Ville prise', 'Ville_prise');
        const adresseBase  = col(row, 'Adresse prise', 'Adresse_prise');
        const adressePrise = [adresseBase, cpPrise, villePrise].filter(Boolean).join(' ');

        const cpDest       = col(row, 'CP dest', 'CP_dest');
        const villeDest    = col(row, 'Ville dest', 'Ville_dest');
        const destBase     = col(row, 'Adresse destination', 'Adresse_destination', 'Adresse dest');
        const adresseDest  = [destBase, cpDest, villeDest].filter(Boolean).join(' ');

        const typeVehicule = col(row, 'Type véhicule', 'Type vehicule', 'Type_vehicule', 'TYPE VEHICULE') || 'TAXI';
        const notesExo     = col(row, 'Notes', 'NOTES');
        const clientNom    = col(row, 'Client Nom', 'Client_Nom', 'NOM');
        const clientPrenom = col(row, 'Client Prénom', 'Client Prenom', 'Client_Prenom', 'PRENOM');
        const codeTaxi     = col(row, 'Code taxi affecté', 'Code taxi affecte', 'Code_taxi_affecte');
        const statutExo    = col(row, 'Statut', 'STATUT') || 'en_attente';

        // Build notes field
        const noteParts = [];
        if (clientNom || clientPrenom) noteParts.push(`Client: ${[clientPrenom, clientNom].filter(Boolean).join(' ')}`);
        if (notesExo) noteParts.push(notesExo);
        const notes = noteParts.join(' | ') || null;

        const statutNorm = ['en_attente','affecte','termine','annule'].includes(statutExo.toLowerCase())
          ? statutExo.toLowerCase() : 'en_attente';

        const r = await pool.query(
          `INSERT INTO trajets
             (code_trajet, date_trajet, heure_prise, heure_arrivee, type_vehicule,
              adresse_prise, adresse_arrivee, code_fixe, notes, statut)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (code_trajet) DO NOTHING
           RETURNING id`,
          [codeTrajet, dateTrajet, heurePrise, heureArrivee, typeVehicule.toUpperCase(),
           adressePrise || 'Non spécifiée', adresseDest || null, codeTaxi || null, notes, statutNorm]
        );
        if (r.rowCount > 0) importes++; else doublons++;
      } catch (err) {
        erreurs++;
        erreursDetail.push(err.message);
      }
    }

    res.json({
      message: `Import terminé: ${importes} importé(s), ${doublons} doublon(s) ignoré(s), ${erreurs} erreur(s)`,
      importes,
      doublons,
      erreurs,
      erreurs_detail: erreursDetail.slice(0, 20)
    });
  } catch (err) {
    console.error('Erreur import-excel:', err.message);
    res.status(500).json({ message: 'Erreur lors de la lecture du fichier: ' + err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.nom AS chauffeur_nom, c.prenom AS chauffeur_prenom, a.statut AS statut_affectation
       FROM trajets t
       LEFT JOIN affectations a ON a.trajet_id = t.id
       LEFT JOIN chauffeurs c ON c.id = a.chauffeur_id
       WHERE t.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Trajet non trouve' });
    const trajet = result.rows[0];
    if (req.user.role === 'chauffeur') delete trajet.adresse_arrivee;
    res.json(trajet);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
