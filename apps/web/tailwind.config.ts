import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The Research Almanac — print broadsheet palette.
        paper: {
          DEFAULT: '#f1ece1', // page
          2: '#e9e2d2',       // pull-quote / alt-row
          3: '#dfd6c2',       // tertiary
        },
        ink: {
          DEFAULT: '#16110b',
          rule: '#1f1a14',
          'rule-dim': '#bdb29b',
          mute: '#6b6055',
        },
        almanac: {
          red: '#b1342a',
          blue: '#214a8a',
          gold: '#a07a2c',
          brown: '#5a4220',
          ochre: '#7a4f0c',
        },
        // Today's Reading — dark gilt cards on paper
        card: {
          bg: '#16110b',
          'bg-2': '#1f1812',
          edge: '#0a0805',
          ink: '#f1ece1',
          'ink-dim': '#d9cfb4',
          gilt: '#c2964a',
          'gilt-dim': '#7a5d20',
          wax: '#b1342a',
          mute: '#9c8e72',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Almanac type scale.
        'ticker': ['10px', { lineHeight: '1.3' }],
        'kicker': ['10px', { lineHeight: '1.3' }],
        'meta': ['11px', { lineHeight: '1.3' }],
        'body': ['14px', { lineHeight: '1.62' }],
        'list': ['16px', { lineHeight: '1.25' }],
        'lead-title': ['42px', { lineHeight: '1.05' }],
        'page-title': ['38px', { lineHeight: '1.1' }],
        'title-xl': ['54px', { lineHeight: '1.02' }],
        'today-title': ['46px', { lineHeight: '1.05' }],
        'subscriber': ['36px', { lineHeight: '1.1' }],
        'pull-quote': ['21px', { lineHeight: '1.4' }],
        'reader': ['18px', { lineHeight: '1.55' }],
      },
      letterSpacing: {
        'mast': '-0.02em',
        'lead': '-0.01em',
        'tight-1': '-0.015em',
        'kicker': '0.3em',
        'masthead-meta': '0.4em',
        'mono-uc': '0.18em',
      },
      boxShadow: {
        'tarot': '0 14px 28px rgba(31,26,20,0.28), 0 2px 6px rgba(31,26,20,0.18), 0 0 0 1px #0a0805',
      },
    },
  },
  plugins: [],
};

export default config;
