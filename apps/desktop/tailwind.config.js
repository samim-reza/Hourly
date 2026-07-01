/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parrot: {
          50: '#f4fce7',
          100: '#e8f8d4',
          200: '#d1f1a8',
          300: '#b0e67a',
          400: '#8fd447',
          500: '#6bbf2f',
          600: '#529621',
          700: '#3d7319',
          800: '#2f5614',
          900: '#1f3a0e',
        },
        feather: {
          400: '#fcd34d',
          500: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
