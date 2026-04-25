import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sora)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'Menlo', 'monospace'],
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Liquid Carbon surfaces
        carbon: {
          950: '#09090b',
          900: '#111113',
          800: '#18181b',
          700: '#1f1f23',
          600: '#26262a',
          500: '#2e2e32',
          400: '#3a3a3e',
        },
        // Border system
        line: {
          subtle:  'rgba(255,255,255,0.06)',
          dim:     'rgba(255,255,255,0.08)',
          default: 'rgba(255,255,255,0.10)',
          strong:  'rgba(255,255,255,0.16)',
          focus:   'rgba(245,166,35,0.5)',
        },
        // Text hierarchy
        ink: {
          DEFAULT: '#fafaf9',
          muted:   '#a1a1a0',
          dim:     '#6b6b69',
          faint:   '#3d3d3b',
        },
        // Primary accent
        amber: {
          DEFAULT: '#F5A623',
          hover:   '#f7b84b',
          dim:     'rgba(245,166,35,0.10)',
          border:  'rgba(245,166,35,0.25)',
          glow:    'rgba(245,166,35,0.06)',
        },
        // Semantic status
        emerald: { DEFAULT: '#34d399', dim: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
        rose:    { DEFAULT: '#f43f5e', dim: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.25)'  },
        sky:     { DEFAULT: '#38bdf8', dim: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)' },
        violet:  { DEFAULT: '#a78bfa', dim: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
        orange:  { DEFAULT: '#fb923c', dim: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.25)' },
      },
      borderRadius: {
        sm:  '4px',
        DEFAULT: '6px',
        md:  '8px',
        lg:  '10px',
        xl:  '12px',
        '2xl': '16px',
        '3xl': '20px',
        full: '9999px',
      },
      spacing: {
        sidebar: '56px',
        'sidebar-expanded': '220px',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)'   },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)'    },
        },
        pulseAmber: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(245,166,35,0.4)' },
          '50%':      { opacity: '0.8', boxShadow: '0 0 0 4px rgba(245,166,35,0)' },
        },
        countUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      animation: {
        shimmer:     'shimmer 1.8s ease-in-out infinite',
        'fade-in':   'fadeIn 0.15s ease',
        'slide-up':  'slideUp 0.2s ease',
        'slide-down':'slideDown 0.15s ease',
        'scale-in':  'scaleIn 0.15s ease',
        'pulse-amber': 'pulseAmber 2s ease-in-out infinite',
        'count-up':  'countUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      },
    },
  },
  plugins: [],
}

export default config
