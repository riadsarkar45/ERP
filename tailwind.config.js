/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8eef7',
          100: '#d1ddef',
          200: '#a3bbe0',
          300: '#7599d0',
          400: '#4778c163',
          500: '#1A3567',
          600: '#152a52',
          700: '#10203e',
          800: '#0b1529',
          900: '#050b15',
        }
      }
    },
  },
  plugins: [],
}

