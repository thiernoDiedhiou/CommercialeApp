import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Couleurs dynamiques injectées via CSS variables par useTenantStore
        brand: {
          primary:   'rgb(var(--brand-primary) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
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
