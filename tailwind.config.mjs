/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        navy:   '#0D1B3E',
        'navy-light': '#162550',
        'navy-dark':  '#080F22',
        accent: '#E8F531',
        'accent-dark': '#C9D420',
        white:  '#FFFFFF',
        'gray-50':  '#F8FAFC',
        'gray-100': '#F1F5F9',
        'gray-200': '#E2E8F0',
        'gray-400': '#94A3B8',
        'gray-600': '#475569',
        'gray-800': '#1E293B',
        success: '#16A34A',
        danger:  '#DC2626',
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
        'display-md': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        'xl':  '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'glow-accent': '0 0 40px rgba(232, 245, 49, 0.15)',
        'card':        '0 2px 20px rgba(13, 27, 62, 0.08)',
        'card-hover':  '0 8px 40px rgba(13, 27, 62, 0.15)',
      },
    },
  },
  plugins: [],
}
