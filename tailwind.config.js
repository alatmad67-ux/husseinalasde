/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          950: '#0b1120',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        brand: {
          amber: '#f59e0b',
          amberHover: '#d97706',
          emerald: '#10b981',
          emeraldHover: '#059669',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        arabic: ['var(--font-ibm)', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
