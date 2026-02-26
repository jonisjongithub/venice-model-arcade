/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          purple: '#9333ea',
          pink: '#ec4899',
          cyan: '#22d3ee',
          yellow: '#facc15',
          green: '#22c55e',
          red: '#ef4444',
          dark: '#0a0a0f',
          darker: '#050508',
        }
      },
      fontFamily: {
        arcade: ['Press Start 2P', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'score-pop': 'scorePop 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px #9333ea, 0 0 40px #9333ea' },
          '100%': { boxShadow: '0 0 30px #ec4899, 0 0 60px #ec4899' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scorePop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'neon-purple': '0 0 20px rgba(147, 51, 234, 0.5)',
        'neon-pink': '0 0 20px rgba(236, 72, 153, 0.5)',
        'neon-cyan': '0 0 20px rgba(34, 211, 238, 0.5)',
      }
    },
  },
  plugins: [],
}
