export const colors = {
  primary: '#1A56DB',
  primaryLight: '#EBF2FF',
  background: '#F3F4F6',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  border: '#E5E7EB',
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',
  statutStop: {
    en_attente: '#6B7280',
    en_approche: '#2563EB',
    arrive: '#059669',
    skip: '#D97706',
  } as const,
  statutRoute: {
    planifiee: '#6B7280',
    en_cours: '#2563EB',
    terminee: '#059669',
    annulee: '#DC2626',
  } as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  small: { fontSize: 14, color: colors.textSecondary },
  xs: { fontSize: 12, color: colors.textSecondary },
  label: { fontSize: 14, fontWeight: '500' as const, color: colors.text },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
};
