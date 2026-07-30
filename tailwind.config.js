/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Âmbar da logo — cor de ação e destaque
        bela: {
          50: '#fffaed', 100: '#fff2d0', 200: '#ffe3a1',
          300: '#fdcf67', 400: '#fabb3c', 500: '#f5a623',
          600: '#d9860f', 700: '#b46610', 800: '#925014',
          900: '#784214',
        },
        // Verde-mata da logo — cor institucional e de texto forte
        mata: {
          50: '#f1f7f2', 100: '#dcebe0', 200: '#bad7c2',
          300: '#8fbb9c', 400: '#5f9a73', 500: '#3e7d55',
          600: '#2d6442', 700: '#265037', 800: '#1f4a2c',
          900: '#16331f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        vidro: '0 8px 32px -8px rgba(31, 74, 44, 0.18), 0 2px 8px -2px rgba(31, 74, 44, 0.08)',
        'vidro-alto': '0 20px 48px -12px rgba(31, 74, 44, 0.26), 0 4px 12px -2px rgba(31, 74, 44, 0.10)',
      },
    },
  },
  plugins: [],
}
