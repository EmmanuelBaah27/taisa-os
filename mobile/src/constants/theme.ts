export const colors = {
  // Primary palette — deep, premium feel
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1C1C27',
  border: '#2A2A38',
  borderSubtle: '#1E1E2A',

  // Accent
  accent: '#7C6FFF',        // Purple — primary action
  accentMuted: '#2D2B50',   // Muted accent for backgrounds
  accentGlow: '#7C6FFF30',

  // Semantic
  positive: '#4ADE80',      // Green — wins, positive sentiment
  positiveMuted: '#1A3D2B',
  warning: '#FBBF24',       // Yellow — stalling, caution
  warningMuted: '#3D3010',
  error: '#F87171',         // Red — challenging, difficult
  errorMuted: '#3D1515',
  info: '#60A5FA',          // Blue — decisions, info

  // Text
  textPrimary: '#F0F0F8',
  textSecondary: '#8888A8',
  textTertiary: '#55556A',
  textAccent: '#A89FFF',

  // Momentum signals
  momentum: {
    accelerating: '#4ADE80',
    steady: '#60A5FA',
    stalling: '#FBBF24',
    recovering: '#A78BFA',
  },

  // Sentiment
  sentiment: {
    very_positive: '#4ADE80',
    positive: '#86EFAC',
    neutral: '#60A5FA',
    challenging: '#FBBF24',
    difficult: '#F87171',
  },
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  display: 38,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
