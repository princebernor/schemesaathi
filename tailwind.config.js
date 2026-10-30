/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Tamil"', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', '"Noto Sans"', 'sans-serif'],
      },
      colors: {
        navy: { 50: '#eef3fb', 100: '#d9e4f5', 600: '#1e4fa3', 700: '#173f86', 800: '#12306a', 900: '#0c2150' },
        leaf: { 50: '#ecf8f1', 100: '#d2efdd', 500: '#1f9d55', 600: '#178046', 700: '#116637' },
        saffron: { 500: '#f28c28' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,40,80,.06), 0 4px 16px rgba(16,40,80,.06)',
        lift: '0 8px 30px rgba(16,40,80,.14)',
      },
    },
  },
  plugins: [],
};
