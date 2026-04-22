import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Terminal / trading-desk palette, v2 — brighter text, fewer
        // muted tones, so readers don't squint.
        bg: {
          DEFAULT: '#0a0d16',   // deep navy-black (slightly richer blue than v1)
          surface: '#10162a',
          raised: '#171f38',
        },
        border: {
          DEFAULT: '#242d44',
          bright: '#3a4663',
        },
        ink: {
          DEFAULT: '#f0f4fa',   // primary text, near-white (was #d4dce8)
          dim: '#aab4d0',       // secondary, still WCAG AA on bg (was #7a8397)
          muted: '#6b7795',     // tertiary — passes 3:1 for large text
        },
        up: '#26e08a',
        warn: '#ffb44d',
        danger: '#ff6b7f',
        info: '#7aaeff',
        violet: '#b69dff',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Tighten defaults — we use these explicitly a lot.
        xs: ['12px', { lineHeight: '1.55' }],
        sm: ['13.5px', { lineHeight: '1.6' }],
        base: ['15px', { lineHeight: '1.6' }],
        lg: ['17px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.3' }],
      },
      boxShadow: {
        'inset-border': 'inset 0 0 0 1px #242d44',
      },
      animation: {
        'tick': 'tick 0.7s ease-out',
        'blink': 'blink 1.2s infinite steps(2, start)',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        tick: {
          '0%': { backgroundColor: 'rgba(38, 224, 138, 0.22)' },
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
