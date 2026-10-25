const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { distanceKm, deadRunSequence } = require('../services/optimisation');
const { construireReleve } = require('./facturation');
const router  = express.Router();

const AUJ = `(NOW() AT TIME ZONE 'America/Montreal')::date`;
const dateOk = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const arr = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const pct = (a, b) => b > 0 ? arr(a * 100 / b) : null;

// GET /api/kpi?du=&au=&tolerance=5   (défaut : 30 derniers jours)
router.get('/', authMiddleware, requireRole('dispatch', 'admin'), async (req, res) => {
  try {
    const t = (await pool.query(`SELECT ${AUJ}::text AS auj, (${AUJ} - 29)::text AS d30`)).rows[0];
    const du = dateOk(req.query.du) ? req.query.du : t.d30;
    const au = dateOk(req.query.au) ? req.query.au : t.auj;
    const tol = Math.max(0, Math.min(60, parseInt(req.query.tolerance, 10) || 5));

    // Courses de la période
    const r = await pool.query(
      `SELECT a.id, a.chauffeur_id, a.date_programme::text AS date, a.statut_course,
              t.heure_prise::text AS heure_prise, t.heure_arrivee::text AS heure_arrivee,
              t.lat_prise, t.lng_prise, t.lat_arrivee, t.lng_arrivee, t.distance_km::float AS distance_km,
              c.prenom, c.nom, c.numero_chauffeur, c.lat_domicile, c.lng_domicile,
              ((a.t_arrive AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'America/Montreal')::time AS arrive_locale,
              (EXTRACT(EPOCH FROM (a.t_termine - a.t_a_bord))/60)::float AS minutes_reelles
       FROM affectations a JOIN trajets t ON t.id=a.trajet_id JOIN chauffeurs c ON c.id=a.chauffeur_id
       WHERE a.date_programme BETWEEN $1 AND $2`, [du, au]);
    const lignes = r.rows;
    const tr = await pool.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM affectations a WHERE a.trajet_id=trajets.id))::int AS affectes
        FROM trajets WHERE date_trajet BETWEEN $1 AND $2`, [du, au]);

    const minutes = h => { const [x, y] = String(h).split(':'); return (+x) * 60 + (+y); };
    const kmDe = l => l.distance_km ?? (l.lat_prise != null && l.lat_arrivee != null ? distanceKm(+l.lat_prise, +l.lng_prise, +l.lat_arrivee, +l.lng_arrivee) * 1.3 : 0);
    const minDe = l => l.minutes_reelles >= 1 ? l.minutes_reelles : (minutes(l.heure_arrivee) - minutes(l.heure_prise) + 1440) % 1440;

    // Ponctualité : arrivée enregistrée ≤ heure de prise + tolérance
    const mesures = lignes.filter(l => l.arrive_locale);
    let aLHeure = 0, sommeRetard = 0, nbRetard = 0;
    for (const l of mesures) {
      const ecart = minutes(String(l.arrive_locale)) - minutes(l.heure_prise);
      if (ecart <= tol) aLHeure++; else { sommeRetard += ecart; nbRetard++; }
    }

    // Km à vide : domicile → 1re prise puis arrivée → prise suivante, par chauffeur et par jour
    const parJour = new Map();
    for (const l of lignes) {
      if (l.lat_prise == null || l.lat_arrivee == null || l.lat_domicile == null) continue;
      const k = l.chauffeur_id + '|' + l.date;
      if (!parJour.has(k)) parJour.set(k, { ch: { lat_domicile: +l.lat_domicile, lng_domicile: +l.lng_domicile }, id: l.chauffeur_id, date: l.date, seq: [] });
      parJour.get(k).seq.push({ heure_prise: l.heure_prise, lat_prise: +l.lat_prise, lng_prise: +l.lng_prise, lat_arrivee: +l.lat_arrivee, lng_arrivee: +l.lng_arrivee });
    }
    let kmVide = 0; const videParCh = {}; const videParJour = {};
    for (const g of parJour.values()) {
      g.seq.sort((a, b) => minutes(a.heure_prise) - minutes(b.heure_prise));
      const d = deadRunSequence(g.seq, g.ch);
      kmVide += d; videParCh[g.id] = (videParCh[g.id] || 0) + d; videParJour[g.date] = (videParJour[g.date] || 0) + d;
    }

    // Par chauffeur
    const chs = new Map();
    for (const l of lignes) {
      if (!chs.has(l.chauffeur_id)) chs.set(l.chauffeur_id, { id: l.chauffeur_id, prenom: l.prenom, nom: l.nom, numero_chauffeur: l.numero_chauffeur,
        courses: 0, terminees: 0, km: 0, minutes: 0, mesures: 0, a_lheure: 0 });
      const c = chs.get(l.chauffeur_id);
      c.courses++;
      if (l.statut_course === 'termine') { c.terminees++; c.km += kmDe(l); c.minutes += minDe(l); }
      if (l.arrive_locale) { c.mesures++; if (minutes(String(l.arrive_locale)) - minutes(l.heure_prise) <= tol) c.a_lheure++; }
    }
    const chauffeurs = [...chs.values()].map(c => ({ ...c, km: arr(c.km), heures: arr(c.minutes / 60), ponctualite: pct(c.a_lheure, c.mesures),
      km_vide: arr(videParCh[c.id] || 0), courses_par_heure: c.minutes > 0 ? arr(c.terminees / (c.minutes / 60), 2) : null }))
      .sort((a, b) => b.terminees - a.terminees || b.courses - a.courses);

    // Séries par jour
    const jours = {};
    for (const l of lignes) { const j = jours[l.date] = jours[l.date] || { date: l.date, courses: 0, terminees: 0 }; j.courses++; if (l.statut_course === 'termine') j.terminees++; }
    const serie = Object.values(jours).sort((a, b) => a.date.localeCompare(b.date)).map(j => ({ ...j, km_vide: arr(videParJour[j.date] || 0) }));

    // Coûts et revenus
    const cout = (await pool.query(`SELECT COALESCE(SUM(montant),0)::float AS total FROM vehicule_couts WHERE date_cout BETWEEN $1 AND $2`, [du, au])).rows[0].total;
    const rel = await construireReleve({ du, au, inclure: 'termine' });
    const terminees = lignes.filter(l => l.statut_course === 'termine').length;
    const noShow = lignes.filter(l => l.statut_course === 'no_show').length;
    const passees = lignes.filter(l => l.date <= t.auj).length;

    res.json({
      periode: { du, au, tolerance: tol },
      courses: { total: lignes.length, terminees, no_show: noShow, taux_completion: pct(terminees, passees) },
      remplissage: { trajets: tr.rows[0].total, affectes: tr.rows[0].affectes, taux: pct(tr.rows[0].affectes, tr.rows[0].total) },
      ponctualite: { mesures: mesures.length, a_lheure: aLHeure, taux: pct(aLHeure, mesures.length), retard_moyen_min: nbRetard ? arr(sommeRetard / nbRetard) : null },
      km_vide: { total: arr(kmVide), par_course: lignes.length ? arr(kmVide / lignes.length) : null },
      couts: { total: arr(cout, 2), par_course: terminees ? arr(cout / terminees, 2) : null, revenus: rel.total, marge: arr(rel.total - cout, 2) },
      chauffeurs, serie,
    });
  } catch (e) { console.error('kpi:', e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
