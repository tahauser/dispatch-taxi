const express = require('express');
const pool    = require('../models/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const svc     = require('../services/dispoRappels');
const router  = express.Router();
const dispatch = requireRole('dispatch', 'admin');

router.get('/', authMiddleware, dispatch, async (req, res) => {
  try {
    res.json({ parametres: await svc.lireParametres(), manquants: await svc.manquants(),
               sms_configure: svc.smsDisponible(), heure_limite: svc.heureLimite() });
  } catch (e) { console.error(e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

router.put('/', authMiddleware, dispatch, async (req, res) => {
  const { actif, heure_rappel, canal_email, canal_sms, notifier_admins } = req.body;
  const h = parseInt(heure_rappel, 10);
  if (!Number.isInteger(h) || h < 0 || h >= svc.heureLimite())
    return res.status(400).json({ message: `L'heure de rappel doit être avant ${svc.heureLimite()}h` });
  try {
    await pool.query(`UPDATE dispo_rappels_parametres SET actif=$1, heure_rappel=$2, canal_email=$3, canal_sms=$4, notifier_admins=$5 WHERE id=1`,
      [!!actif, h, !!canal_email, !!canal_sms, !!notifier_admins]);
    res.json(await svc.lireParametres());
  } catch (e) { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.post('/executer', authMiddleware, dispatch, async (req, res) => {
  try { res.json(await svc.executer()); }
  catch (e) { console.error(e.message); res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
