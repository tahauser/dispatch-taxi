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
  const now      = new Date();
  const heure    = parseInt(process.env.DEADLINE_HEURE  || '18');
  const minute   = parseInt(process.env.DEADLINE_MINUTE || '0');
  const deadline = new Date();
  deadline.setHours(heure, minute, 0, 0);
  if (now >= deadline)
    return res.status(403).json({ message: `Saisie fermee apres ${heure}h${String(minute).padStart(2,'0')}` });
  next();
}

module.exports = { authMiddleware, requireRole, checkDeadline };
