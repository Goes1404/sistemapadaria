/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crosta: {
          50: '#fdf8f3', 100: '#f8ead9', 200: '#f0d3b0',
          300: '#e4b47f', 400: '#d6924f', 500: '#c77733',
          600: '#a95c28', 700: '#8a4622', 800: '#703a21',
          900: '#5c311e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
