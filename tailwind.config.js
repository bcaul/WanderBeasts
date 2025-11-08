/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
        rare: '#A569BD',
        legendary: '#F39C12',
        background: '#1A1A2E',
        surface: '#16213E',
        text: '#FFFFFF',
      },
    },
  },
  plugins: [],
}

