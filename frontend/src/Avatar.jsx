// Photo du chauffeur, ou avatar illustré (déterministe) quand il n'y en a pas encore.
const PEAUX   = ['#f1c9a5', '#e0ac82', '#c68642', '#8d5524', '#f5d7bd', '#a9744f'];
const CHEVEUX = ['#2b1d14', '#4a3222', '#1a1a1a', '#6b4a2b', '#8c8c8c', '#a0522d'];
const FONDS   = ['#cfe3f5', '#d8f0dc', '#fde4c8', '#e9d9f5', '#fbd5d5', '#d6eef0'];
const HAUTS   = ['#1F4E79', '#2e7d32', '#6a1b9a', '#c62828', '#00838f', '#ef6c00'];

function hash(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export default function Avatar({ ch, size = 36, style }) {
  const base = { width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', ...style };
  if (ch?.photo) return <img src={ch.photo} alt={`${ch.prenom || ''} ${ch.nom || ''}`} style={base} />;

  const h = hash(`${ch?.numero_chauffeur || ''}${ch?.prenom || ''}${ch?.nom || ''}`);
  const peau = PEAUX[h % 6], cheveux = CHEVEUX[(h >> 3) % 6], fond = FONDS[(h >> 6) % 6], haut = HAUTS[(h >> 9) % 6];
  const long = (h >> 12) % 3 === 0, barbe = !long && (h >> 14) % 3 === 0;
  return (
    <svg viewBox="0 0 100 100" style={base} role="img" aria-label={`${ch?.prenom || ''} ${ch?.nom || ''}`}>
      <rect width="100" height="100" fill={fond} />
      <path d="M18 100 Q18 70 50 68 Q82 70 82 100 Z" fill={haut} />
      <rect x="44" y="56" width="12" height="14" fill={peau} />
      {long && <path d="M26 52 Q22 18 50 18 Q78 18 74 52 L74 66 L26 66 Z" fill={cheveux} />}
      <ellipse cx="50" cy="44" rx="19" ry="22" fill={peau} />
      {barbe && <path d="M31 48 Q50 82 69 48 Q60 66 50 66 Q40 66 31 48 Z" fill={cheveux} opacity="0.85" />}
      <path d={long ? 'M30 40 Q50 18 70 40 Q50 30 30 40 Z' : 'M30 38 Q32 18 50 20 Q68 18 70 38 Q50 28 30 38 Z'} fill={cheveux} />
      <circle cx="42" cy="46" r="2" fill="#222" />
      <circle cx="58" cy="46" r="2" fill="#222" />
      <path d="M43 56 Q50 61 57 56" stroke="#7a3b2e" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
