import type { Config } from 'tailwindcss'

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
  plugins: [],
} satisfies Config
