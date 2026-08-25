/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        onyx: {
          950: '#040507',
          900: '#07080a',
          850: '#0b0d12',
          800: '#11141c',
          750: '#171a25',
          700: '#1e2230',
          border: '#151822',
          borderLight: '#232738',
        },
        quiby: {
          purple: '#8b5cf6',
          purpleLight: '#a78bfa',
          purpleDark: '#6d28d9',
          indigo: '#6366f1',
          accent: '#c084fc',
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
        'onyx-glow': '0 0 40px -10px rgba(139, 92, 246, 0.35)',
        'onyx-card': '0 10px 35px -5px rgba(0, 0, 0, 0.7)',
        'play-btn': '0 0 30px -5px rgba(139, 92, 246, 0.5), 0 0 15px 0 rgba(99, 102, 241, 0.3)',
      }
    },
  },
  plugins: [],
}
