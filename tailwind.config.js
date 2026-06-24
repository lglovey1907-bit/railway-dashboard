/** @type {import('tailwindcss').Config} */
module.exports = {
  // No dark mode — light only
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Railway Navy — primary brand
        navy: {
          900: '#0F2744',
          800: '#1E3A5F',
          700: '#1D4ED8',
        },
        // Action blue
        rail: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        // Surfaces
        surface: {
          page:    '#F0F4F8',
          default: '#F7F9FC',
          card:    '#FFFFFF',
          hover:   '#F1F5F9',
          active:  '#EFF6FF',
          input:   '#F8FAFC',
        },
        // Semantic
        success: { DEFAULT: '#059669', light: '#DCFCE7', border: '#BBF7D0', text: '#15803D' },
        warning: { DEFAULT: '#D97706', light: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
        danger:  { DEFAULT: '#DC2626', light: '#FEE2E2', border: '#FECACA', text: '#991B1B' },
        info:    { DEFAULT: '#0EA5E9', light: '#E0F2FE', border: '#BAE6FD', text: '#075985' },
        amber: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
        },
        // Border
        border: {
          DEFAULT: '#E2E8F0',
          strong:  '#CBD5E1',
          focus:   '#2563EB',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'xs':  '0 1px 2px rgba(15,23,42,0.04)',
        'sm':  '0 1px 2px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.06)',
        'md':  '0 2px 4px rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.08)',
        'lg':  '0 4px 8px rgba(15,23,42,0.04), 0 16px 32px rgba(15,23,42,0.10)',
        'xl':  '0 8px 16px rgba(15,23,42,0.05), 0 32px 64px rgba(15,23,42,0.12)',
        // Keep old names for compatibility
        'elevation-xs': '0 1px 2px rgba(15,23,42,0.04)',
        'elevation-sm': '0 1px 2px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.06)',
        'elevation-md': '0 2px 4px rgba(15,23,42,0.04), 0 6px 16px rgba(15,23,42,0.08)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s linear infinite',
        'fade-in': 'fadeIn 0.2s ease',
        'slide-up': 'slideUp 0.2s ease',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
