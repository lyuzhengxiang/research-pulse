import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Terminal / trading-desk palette.
        bg: {
          DEFAULT: '#0b0e14',
          surface: '#0f1420',
          raised: '#151b28',
        },
        border: {
          DEFAULT: '#1e2636',
          bright: '#2a3446',
        },
        ink: {
          DEFAULT: '#d4dce8',
          dim: '#7a8397',
          muted: '#4d566b',
        },
        up: '#00d97e',         // green — positive / pulse
        warn: '#ffa940',       // amber — HN / caution
        danger: '#ff5a6e',     // red — surge / alert
        info: '#60a5fa',       // blue — tags / links
        violet: '#a78bfa',     // accent purple for pulse bars
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'inset-border': 'inset 0 0 0 1px #1e2636',
      },
      animation: {
        'tick': 'tick 0.6s ease-out',
        'blink': 'blink 1.2s infinite steps(2, start)',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        tick: {
          '0%': { backgroundColor: 'rgba(0, 217, 126, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        blink: {
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
