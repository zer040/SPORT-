/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1E232B',
          slate: '#0F172A',
          emerald: '#00FF87',
          cyan: '#38BDF8',
          accent: '#10B981',
        },
      },
    },
  },
  plugins: [],
}
