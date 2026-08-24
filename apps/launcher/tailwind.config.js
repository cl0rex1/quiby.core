/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        quiby: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          accent: '#06b6d4',
          cyan: '#0891b2',
          gold: '#eab308',
          dark: '#0b0f17',
          card: '#111827',
          panel: '#1a2234',
          border: '#243048',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        minecraft: ['"Minecraft"', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 25px -5px rgba(34, 197, 94, 0.4)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.4)',
      }
    },
  },
  plugins: [],
}
