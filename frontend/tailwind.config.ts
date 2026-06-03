import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Couleurs dynamiques injectées via CSS variables par useTenantStore
        brand: {
          primary:   'rgb(var(--brand-primary) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
        },
        // Identité DiDi Sphere — palette fixe landing page
        ds: {
          blue:   '#2465ed',
          green:  '#11b67e',
          purple: '#6e33d8',
          'blue-dark':   '#1a4fc4',
          'green-dark':  '#0d9267',
          'purple-dark': '#5626b0',
          'blue-light':  '#e8f0fd',
          'green-light': '#e6f7f2',
          'purple-light':'#f0eafc',
        },
      },
    },
  },
  plugins: [
    // Cache la scrollbar tout en gardant la fonctionnalité scroll
    plugin(({ addUtilities }) => {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width'   : 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      })
    }),
  ],
} satisfies Config
