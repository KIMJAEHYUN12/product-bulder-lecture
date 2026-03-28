/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f172a',
        card: '#1e293b',
        border: '#334155',
      },
    },
  },
  plugins: [],
};
