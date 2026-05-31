/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#08111f',
        panel: '#111c2e',
        panelSoft: '#17243a',
        grid: '#26364f',
      },
    },
  },
  plugins: [],
};
