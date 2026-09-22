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
          950: '#0b0e14',
          900: '#11151f',
          850: '#171d2b',
          800: '#1e2638',
          border: '#252f45',
          borderLight: '#323e59',
        },
        create: {
          brass: '#d4975c',
          brassLight: '#eab683',
          copper: '#c86a4b',
          steel: '#475569',
        },
        onyx: {
          950: '#040507',
          900: '#07080a',
          850: '#0b0d12',
          800: '#11141c',
          750: '#171a25',
          700: '#1e2230',
          border: '#252f45',
          borderLight: '#323e59',
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
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'onyx-card': '0 10px 35px -5px rgba(0, 0, 0, 0.7)',
      }
    },
  },
  plugins: [],
}
