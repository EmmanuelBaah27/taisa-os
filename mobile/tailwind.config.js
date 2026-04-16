/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        background: '#0A0A0F',
        surface: '#13131A',
        'surface-elevated': '#1C1C27',

        // Borders
        border: '#2A2A38',
        'border-subtle': '#1E1E2A',

        // Accent
        accent: '#7C6FFF',
        'accent-muted': '#2D2B50',
        'accent-glow': '#7C6FFF30',

        // Semantic
        positive: '#4ADE80',
        'positive-muted': '#1A3D2B',
        warning: '#FBBF24',
        'warning-muted': '#3D3010',
        error: '#F87171',
        'error-muted': '#3D1515',
        info: '#60A5FA',

        // Text
        'text-primary': '#F0F0F8',
        'text-secondary': '#8888A8',
        'text-tertiary': '#55556A',
        'text-accent': '#A89FFF',

        // Momentum signals
        momentum: {
          accelerating: '#4ADE80',
          steady: '#60A5FA',
          stalling: '#FBBF24',
          recovering: '#A78BFA',
        },

        // Sentiment
        sentiment: {
          'very-positive': '#4ADE80',
          positive: '#86EFAC',
          neutral: '#60A5FA',
          challenging: '#FBBF24',
          difficult: '#F87171',
        },
      },

      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
      },

      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },

      fontSize: {
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['15px', { lineHeight: '22px' }],
        md: ['17px', { lineHeight: '24px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['24px', { lineHeight: '32px' }],
        '2xl': ['30px', { lineHeight: '38px' }],
        display: ['38px', { lineHeight: '46px' }],
      },
    },
  },
  plugins: [],
};
