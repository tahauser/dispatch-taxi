const express  = require('express');
const pool     = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { optimiserAffectations }       = require('../services/optimisation');
const router   = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const { date } = req.query;
  try {
    let query, params;
    if (req.user.role === 'chauffeur') {
      query = `SELECT a.*, t.code_trajet, t.heure_prise, t.heure_arrivee,
               t.adresse_prise, t.type_vehicule, t.notes, t.date_trajet
               FROM affectations a JOIN trajets t ON t.id = a.trajet_id
               WHERE a.chauffeur_id = $1 AND ($2::date IS NULL OR a.date_programme = $2)
               ORDER BY t.heure_prise`;
      params = [req.user.id, date || null];
    } else {
      query = `SELECT a.*, t.code_trajet, t.heure_prise, t.heure_arrivee,
               t.adresse_prise, t.type_vehicule, t.notes, t.date_trajet,
               c.nom, c.prenom, c.numero_chauffeur
               FROM affectations a
               JOIN trajets t ON t.id = a.trajet_id
               JOIN chauffeurs c ON c.id = a.chauffeur_id
               WHERE ($1::date IS NULL OR a.date_programme = $1)
               ORDER BY t.heure_prise`;
      params = [date || null];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET affectations:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/proposer', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Parametre date requis' });
  try {
    const trajetsRes = await pool.query(
      `SELECT id, code_trajet, heure_prise, heure_arrivee,
              type_vehicule, adresse_prise, lat_prise, lng_prise
       FROM trajets WHERE date_trajet = $1 AND statut = 'en_attente'
       ORDER BY heure_prise`, [date]
    );
    if (trajetsRes.rows.length === 0)
      return res.status(404).json({ message: 'Aucun trajet en attente' });

    const chauffeursRes = await pool.query(
      `SELECT c.id, c.numero_chauffeur, c.nom, c.prenom, c.type_vehicule,
              c.lat_domicile, c.lng_domicile,
              json_agg(json_build_object('heure_debut',d.heure_debut,'heure_fin',d.heure_fin)) AS disponibilites
       FROM chauffeurs c
       JOIN disponibilites d ON d.chauffeur_id = c.id AND d.date_dispo = $1
       WHERE c.actif = TRUE GROUP BY c.id`, [date]
    );
    if (chauffeursRes.rows.length === 0)
      return res.status(404).json({ message: 'Aucun chauffeur disponible' });

    const { affectations, nonAffectes } = optimiserAffectations(trajetsRes.rows, chauffeursRes.rows);

    let sauvegardes = 0; let ignorees = 0;
    for (const aff of affectations) {
      const r = await pool.query(
        `INSERT INTO affectations (trajet_id, chauffeur_id, date_programme, proposee_par, statut)
         VALUES ($1,$2,$3,'systeme','proposee')
         ON CONFLICT (trajet_id, date_programme) DO UPDATE SET
           chauffeur_id = CASE WHEN affectations.proposee_par='dispatch'
             THEN affectations.chauffeur_id ELSE EXCLUDED.chauffeur_id END,
           proposee_par = CASE WHEN affectations.proposee_par='dispatch'
             THEN 'dispatch' ELSE 'systeme' END,
           modifie_le = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [aff.trajet_id, aff.chauffeur_id, date]
      );
      if (r.rows[0]?.inserted) sauvegardes++; else ignorees++;
    }
    // Analyser pourquoi les trajets ne sont pas affectes
    const details = [];
    for (const code of nonAffectes) {
      const trajet = trajetsRes.rows.find(t => t.code_trajet === code);
      if (!trajet) continue;
      const hPrise = trajet.heure_prise;
      const hArr   = trajet.heure_arrivee;
      const tDeb   = parseInt(hPrise.split(':')[0]) * 60 + parseInt(hPrise.split(':')[1]);
      const tFin   = parseInt(hArr.split(':')[0])  * 60 + parseInt(hArr.split(':')[1]);

      // Chauffeurs avec bon type de vehicule
      const bonsTypes = chauffeursRes.rows.filter(c =>
        !trajet.type_vehicule || trajet.type_vehicule === 'TAXI' || c.type_vehicule === trajet.type_vehicule
      );
      if (bonsTypes.length === 0) {
        details.push(`${code}: aucun chauffeur ${trajet.type_vehicule} disponible`);
        continue;
      }
      // Chauffeurs avec dispo couvrant ce trajet
      const avecDispo = bonsTypes.filter(c => {
        const dispos = c.disponibilites || [];
        return dispos.some(d => {
          const dD = parseInt(d.heure_debut.split(':')[0])*60;
          const dF = parseInt(d.heure_fin.split(':')[0])*60;
          return dD <= tDeb && dF >= tFin;
        });
      });
      if (avecDispo.length === 0) {
        details.push(`${code} (${hPrise.substring(0,5)}-${hArr.substring(0,5)} ${trajet.type_vehicule}): aucun chauffeur ${trajet.type_vehicule} libre sur cette plage`);
      } else {
        details.push(`${code} (${hPrise.substring(0,5)}-${hArr.substring(0,5)}): Aucun chauffeur disponible pour cette heure`);
      }
    }

    const raisonMsg = details.length > 0 ? ' | Non affectés: ' + details.join(' / ') : '';
    const msg = sauvegardes > 0
      ? `${sauvegardes} nouvelle(s) affectation(s)${ignorees>0?' ('+ignorees+' conservées)':''}${raisonMsg}`
      : `Aucune nouvelle affectation${raisonMsg}`;
    res.json({ message: msg, affectations: sauvegardes, non_affectes: nonAffectes });
  } catch (err) {
    console.error('Erreur proposer:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/:id', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { chauffeur_id, notes_dispatch } = req.body;
  try {
    const result = await pool.query(
      `UPDATE affectations SET
         chauffeur_id=COALESCE($1,chauffeur_id),
         notes_dispatch=COALESCE($2,notes_dispatch),
         proposee_par='dispatch', modifiee_par=$3, modifie_le=NOW()
       WHERE id=$4 RETURNING *`,
      [chauffeur_id||null, notes_dispatch||null, req.user.id, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Affectation non trouvée' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.post('/envoyer', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Parametre date requis' });
  try {
    const result = await pool.query(
      `SELECT c.id AS chauffeur_id, c.nom, c.prenom, c.email,
              json_agg(json_build_object(
                'code_trajet',t.code_trajet,'heure_prise',t.heure_prise,
                'heure_arrivee',t.heure_arrivee,'adresse_prise',t.adresse_prise,
                'type_vehicule',t.type_vehicule,'notes',t.notes
              ) ORDER BY t.heure_prise) AS trajets
       FROM affectations a
       JOIN chauffeurs c ON c.id = a.chauffeur_id
       JOIN trajets t ON t.id = a.trajet_id
       WHERE a.date_programme=$1 AND a.statut IN ('proposee','confirmee','envoyee')
       GROUP BY c.id`, [date]
    );
    const emailService = require('../services/email');
    let envoyes = 0, erreurs = 0;

    // Envoyer programmes aux chauffeurs affectes
    for (const row of result.rows) {
      try {
        await emailService.envoyerProgramme(row, date);
        await pool.query(
          `UPDATE affectations SET statut='envoyee', email_envoye_le=NOW()
           WHERE chauffeur_id=$1 AND date_programme=$2`,
          [row.chauffeur_id, date]
        );
        await pool.query(
          `INSERT INTO envois_email (chauffeur_id, date_programme, envoye_par, nb_trajets, statut_envoi)
           VALUES ($1,$2,$3,$4,'envoye')`,
          [row.chauffeur_id, date, req.user.id, row.trajets.length]
        );
        envoyes++;
      } catch (err) {
        console.error('Erreur email:', err.message);
        erreurs++;
      }
    }

    // IDs des chauffeurs affectés
    const affectesIds = result.rows.map(r => r.chauffeur_id);

    // Chauffeurs dispos sans affectation → "aucun trajet"
    const qDispos = affectesIds.length > 0
      ? await pool.query(
          `SELECT DISTINCT c.id, c.nom, c.prenom, c.email
           FROM disponibilites d JOIN chauffeurs c ON c.id = d.chauffeur_id
           WHERE d.date_dispo = $1 AND c.role != 'dispatch' AND c.id != ALL($2::uuid[])`,
          [date, affectesIds])
      : await pool.query(
          `SELECT DISTINCT c.id, c.nom, c.prenom, c.email
           FROM disponibilites d JOIN chauffeurs c ON c.id = d.chauffeur_id
           WHERE d.date_dispo = $1 AND c.role != 'dispatch'`,
          [date]);
    for (const ch of qDispos.rows) {
      try {
        await emailService.envoyerAucunTrajet(ch, date);
        envoyes++;
      } catch (err) {
        console.error('Erreur email aucun trajet:', err.message);
        erreurs++;
      }
    }

    // Chauffeurs sans dispo ET sans affectation → "aucune disponibilite recue"
    const disposIds = qDispos.rows.map(r => r.id);
    const tousContactesIds = [...affectesIds, ...disposIds];
    const qSansDispo = tousContactesIds.length > 0
      ? await pool.query(
          `SELECT id, nom, prenom, email FROM chauffeurs
           WHERE role != 'dispatch' AND actif = true AND id != ALL($1::uuid[])`,
          [tousContactesIds])
      : await pool.query(
          `SELECT id, nom, prenom, email FROM chauffeurs
           WHERE role != 'dispatch' AND actif = true`);
    for (const ch of qSansDispo.rows) {
      try {
        await emailService.envoyerAucuneDisponibilite(ch, date);
        envoyes++;
      } catch (err) {
        console.error('Erreur email aucune dispo:', err.message);
        erreurs++;
      }
    }

    if (envoyes === 0)
      return res.status(404).json({ message: 'Aucun email a envoyer' });
    res.json({ message: envoyes + ' emails envoyes, ' + erreurs + ' echecs', envoyes, erreurs });
  } catch (err) {
    console.error('Erreur envoyer:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/affectations/envoyer/:chauffeurId - envoi individuel
router.post('/envoyer/:chauffeurId', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { date } = req.query;
  const { chauffeurId } = req.params;
  if (!date) return res.status(400).json({ message: 'Parametre date requis' });
  try {
    const emailService = require('../services/email');
    // Chercher affectations du chauffeur
    const result = await pool.query(
      `SELECT c.id AS chauffeur_id, c.nom, c.prenom, c.email,
              json_agg(json_build_object(
                'code_trajet',t.code_trajet,'heure_prise',t.heure_prise,
                'heure_arrivee',t.heure_arrivee,'adresse_prise',t.adresse_prise,
                'type_vehicule',t.type_vehicule,'notes',t.notes
              ) ORDER BY t.heure_prise) AS trajets
       FROM affectations a
       JOIN chauffeurs c ON c.id = a.chauffeur_id
       JOIN trajets t ON t.id = a.trajet_id
       WHERE a.date_programme=$1 AND a.chauffeur_id=$2
       AND a.statut IN ('proposee','confirmee','envoyee')
       GROUP BY c.id`, [date, chauffeurId]
    );
    if (result.rows.length > 0) {
      await emailService.envoyerProgramme(result.rows[0], date);
      await pool.query(
        `UPDATE affectations SET statut='envoyee', email_envoye_le=NOW()
         WHERE chauffeur_id=$1 AND date_programme=$2`,
        [chauffeurId, date]
      );
    } else {
      // Verifier si le chauffeur a des disponibilites
      const ch = await pool.query('SELECT id, nom, prenom, email FROM chauffeurs WHERE id=$1', [chauffeurId]);
      if (ch.rows.length > 0) {
        const dispo = await pool.query(
          'SELECT 1 FROM disponibilites WHERE chauffeur_id=$1 AND date_dispo=$2 LIMIT 1',
          [chauffeurId, date]
        );
        if (dispo.rows.length > 0) {
          await emailService.envoyerAucunTrajet(ch.rows[0], date);
        } else {
          await emailService.envoyerAucuneDisponibilite(ch.rows[0], date);
        }
      }
    }
    res.json({ message: 'Email envoye' });
  } catch (err) {
    console.error('Erreur envoi individuel:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

// POST /api/affectations/affecter - affectation directe (drag & drop)
router.post('/affecter', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { trajet_id, chauffeur_id, date } = req.body;
  if (!trajet_id || !chauffeur_id || !date)
    return res.status(400).json({ message: 'trajet_id, chauffeur_id et date requis' });
  try {
    const result = await pool.query(
      `INSERT INTO affectations (trajet_id, chauffeur_id, date_programme, proposee_par, statut)
       VALUES ($1,$2,$3,'dispatch','proposee')
       ON CONFLICT (trajet_id, date_programme) DO UPDATE SET
         chauffeur_id=EXCLUDED.chauffeur_id, proposee_par='dispatch',
         statut='proposee', modifie_le=NOW()
       RETURNING *`,
      [trajet_id, chauffeur_id, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur affecter:', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /api/affectations/reinitialiser?date= - supprimer toutes les affectations
router.delete('/reinitialiser', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Parametre date requis' });
  try {
    const result = await pool.query(
      'DELETE FROM affectations WHERE date_programme = $1', [date]
    );
    res.json({ message: `${result.rowCount} affectation(s) supprimée(s)`, supprimees: result.rowCount });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /api/affectations/:id - retirer une affectation
router.delete('/:id', authMiddleware, requireRole('dispatch','admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM affectations WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Affectation non trouvée' });
    res.json({ message: 'Affectation retiree' });
  } catch (err) { res.status(500).json({ message: 'Erreur serveur' }); }
});
