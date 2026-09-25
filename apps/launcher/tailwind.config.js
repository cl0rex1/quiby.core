/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#100e16',
          900: '#191622',
          850: '#211d2b',
          800: '#292333',
          border: '#3a3244',
          borderLight: '#4c4056',
        },
        create: {
          brass: '#bb74ff',
          brassLight: '#d7b6ff',
          copper: '#a452dc',
          steel: '#475569',
        },
        onyx: {
          950: '#040507',
          900: '#07080a',
          850: '#0b0d12',
          800: '#11141c',
          750: '#171a25',
          700: '#1e2230',
          border: '#3a3244',
          borderLight: '#4c4056',
        },
        quiby: {
          purple: '#6d28d9',
          purpleLight: '#8b5cf6',
          purpleDark: '#4c1d95',
          indigo: '#4f46e5',
          accent: '#7c3aed',
          text: '#f1f5f9',
          textMuted: '#788299',
          textDim: '#475066',
        }
      },
      fontFamily: {
        sans: ['"Golos Text"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'onyx-card': '0 10px 35px -5px rgba(0, 0, 0, 0.7)',
      }
    },
  },
  plugins: [],
}
