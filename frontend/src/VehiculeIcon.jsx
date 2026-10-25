// Pictogramme du type de véhicule (remplace le texte TAXI / BERLINE / VAN / MINIBUS).
const STYLES = {
  TAXI:    { corps: '#f9c80e', vitre: '#dff1fb', enseigne: true },
  BERLINE: { corps: '#1F4E79', vitre: '#dff1fb', enseigne: false },
  VAN:     { corps: '#607d8b', vitre: '#dff1fb', enseigne: false, haut: true },
  MINIBUS: { corps: '#2e7d32', vitre: '#dff1fb', enseigne: false, haut: true, long: true },
};

export default function VehiculeIcon({ type, size = 30, style }) {
  const t = String(type || 'TAXI').toUpperCase();
  const s = STYLES[t] || STYLES.TAXI;
  const toit = s.haut ? 9 : 15;
  return (
    <svg viewBox="0 0 64 40" width={size * 1.6} height={size} role="img" aria-label={t} style={{ flexShrink: 0, ...style }}>
      <title>{t}</title>
      {s.enseigne && <rect x="27" y={toit - 5} width="10" height="5" rx="1.5" fill="#222" />}
      <path d={`M6 30 L8 26 Q10 ${toit + 4} 20 ${toit} L${s.long ? 54 : 44} ${toit} Q${s.long ? 58 : 50} ${toit + 2} 54 26 L58 28 Q60 30 60 32 L60 33 L4 33 L4 32 Q4 30 6 30 Z`} fill={s.corps} />
      <path d={`M16 26 Q18 ${toit + 4} 23 ${toit + 3} L${s.long ? 51 : 43} ${toit + 3} Q${s.long ? 54 : 48} ${toit + 4} 50 26 Z`} fill={s.vitre} />
      <circle cx="18" cy="33" r="5" fill="#222" /><circle cx="18" cy="33" r="2" fill="#bbb" />
      <circle cx="46" cy="33" r="5" fill="#222" /><circle cx="46" cy="33" r="2" fill="#bbb" />
    </svg>
  );
}
