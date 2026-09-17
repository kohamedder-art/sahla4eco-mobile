import { StyleSheet, type TextStyle } from 'react-native';

export const LIGHT_COLORS = {
  primary: '#1d4ed8',
  primaryDark: '#1e40af',
  primaryLight: '#dbeafe',
  primaryFaint: '#eff6ff',
  success: '#047857',
  successLight: '#d1fae5',
  successFaint: '#ecfdf5',
  warning: '#b45309',
  warningLight: '#fef3c7',
  warningFaint: '#fffbeb',
  danger: '#b91c1c',
  dangerLight: '#fee2e2',
  dangerFaint: '#fef2f2',
  info: '#0e7490',
  infoLight: '#cffafe',
  infoFaint: '#ecfeff',
  surface: '#ffffff',
  background: '#f4f6fa',
  backgroundDark: '#0f172a',
  card: '#ffffff',
  text: '#111c2e',
  textSecondary: '#475569',
  textMuted: '#8a94a6',
  border: '#e3e8f0',
  borderLight: '#eef1f6',
  notification: '#dc2626',
};

export const DARK_COLORS: typeof LIGHT_COLORS = {
  primary: '#5b93ff',
  primaryDark: '#3b82f6',
  primaryLight: '#16294d',
  primaryFaint: '#0f1f3d',
  success: '#34d399',
  successLight: '#064e3b',
  successFaint: '#052e22',
  warning: '#fbbf24',
  warningLight: '#422006',
  warningFaint: '#2e1f04',
  danger: '#f87171',
  dangerLight: '#450a0a',
  dangerFaint: '#330b0b',
  info: '#22d3ee',
  infoLight: '#083344',
  infoFaint: '#062a33',
  surface: '#101a2e',
  background: '#0a1120',
  backgroundDark: '#020617',
  card: '#101a2e',
  text: '#eef2f9',
  textSecondary: '#9aa7bd',
  textMuted: '#64748f',
  border: '#223047',
  borderLight: '#182642',
  notification: '#ef4444',
};

export const COLORS = LIGHT_COLORS;

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 20, full: 9999,
};

export const FONT = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 34,
};

/**
 * Arabic-safe weights: never use letterSpacing or uppercase transforms
 * on Arabic text — they break letter connections. Numbers use tabular
 * figures so prices don't jitter.
 */
export const TYPE: { tabularNumbers: TextStyle } = {
  tabularNumbers: { fontVariant: ['tabular-nums'] },
};

export const SHADOW = {
  card: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  button: {
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};

/** Crisp 1px card outline — what makes cards read on Android. */
export const cardBorder = (borderColor: string) => ({
  borderWidth: StyleSheet.hairlineWidth,
  borderColor,
});

export const STATUS_COLORS: Record<string, string> = {
  pending: LIGHT_COLORS.warning,
  confirmed: LIGHT_COLORS.primary,
  processing: LIGHT_COLORS.info,
  shipped: LIGHT_COLORS.success,
  delivered: LIGHT_COLORS.success,
  cancelled: LIGHT_COLORS.danger,
  returned: LIGHT_COLORS.danger,
  fake: LIGHT_COLORS.danger,
  duplicate: LIGHT_COLORS.warning,
  no_answer_1: LIGHT_COLORS.warning,
  no_answer_2: LIGHT_COLORS.danger,
  no_answer_3: LIGHT_COLORS.danger,
  waiting_callback: LIGHT_COLORS.info,
  postponed: LIGHT_COLORS.warning,
};
