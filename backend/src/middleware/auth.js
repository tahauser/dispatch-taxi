const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Token manquant ou invalide' });
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token expire ou invalide' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({ message: 'Acces refuse' });
    next();
  };
}

function checkDeadline(req, res, next) {
  const now    = new Date();
  const heure  = parseInt(process.env.DEADLINE_HEURE  || '18');
  const minute = parseInt(process.env.DEADLINE_MINUTE || '0');
  const deadline = new Date();
  deadline.setHours(heure, minute, 0, 0);

  // Avant la deadline → toujours autorisé
  if (now < deadline) { next(); return; }

  // Après la deadline : bloquer seulement si date_dispo === demain
  const date_dispo = req.body?.date_dispo;
  if (date_dispo) {
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    const strDemain = `${demain.getFullYear()}-${String(demain.getMonth()+1).padStart(2,'0')}-${String(demain.getDate()).padStart(2,'0')}`;
    if (date_dispo !== strDemain) { next(); return; } // Après-demain et plus → OK
  }

  return res.status(403).json({
    message: `Saisie fermée après ${heure}h${String(minute).padStart(2,'0')} pour le lendemain`
  });
}

module.exports = { authMiddleware, requireRole, checkDeadline };
