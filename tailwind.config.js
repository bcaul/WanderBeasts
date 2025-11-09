/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7e9278',
        secondary: '#aabda0',
        accent: '#beccc0',
        rare: '#6e7864',
        legendary: '#8b7355',
        background: '#5b695d',
        surface: '#6e7864',
        text: '#FFFFFF',
      },
    },
  },
  plugins: [],
}

