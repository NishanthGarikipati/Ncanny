/**
 * Shared Tailwind preset for Ncanny.
 *
 * Colours resolve to CSS variables so that light and dark themes are a single
 * attribute switch rather than duplicated class names, and so that product code
 * only ever references semantic names (`surface`, `primary`) rather than raw
 * palette values.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--ncanny-surface) / <alpha-value>)',
          raised: 'rgb(var(--ncanny-surface-raised) / <alpha-value>)',
          sunken: 'rgb(var(--ncanny-surface-sunken) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--ncanny-border) / <alpha-value>)',
          strong: 'rgb(var(--ncanny-border-strong) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--ncanny-text) / <alpha-value>)',
          muted: 'rgb(var(--ncanny-text-muted) / <alpha-value>)',
          inverse: 'rgb(var(--ncanny-text-inverse) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--ncanny-primary) / <alpha-value>)',
          strong: 'rgb(var(--ncanny-primary-strong) / <alpha-value>)',
          soft: 'rgb(var(--ncanny-primary-soft) / <alpha-value>)',
          contrast: 'rgb(var(--ncanny-primary-contrast) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--ncanny-accent) / <alpha-value>)',
          soft: 'rgb(var(--ncanny-accent-soft) / <alpha-value>)',
          contrast: 'rgb(var(--ncanny-accent-contrast) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--ncanny-success) / <alpha-value>)',
          soft: 'rgb(var(--ncanny-success-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--ncanny-warning) / <alpha-value>)',
          soft: 'rgb(var(--ncanny-warning-soft) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--ncanny-danger) / <alpha-value>)',
          soft: 'rgb(var(--ncanny-danger-soft) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--ncanny-info) / <alpha-value>)',
          soft: 'rgb(var(--ncanny-info-soft) / <alpha-value>)',
        },
        overlay: 'rgb(var(--ncanny-overlay) / 0.6)',
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.625rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      boxShadow: {
        'level-1': '0 1px 2px 0 rgb(15 23 42 / 0.06)',
        'level-2': '0 4px 12px -2px rgb(15 23 42 / 0.10)',
        'level-3': '0 12px 32px -8px rgb(15 23 42 / 0.18)',
        // Reserved for focus, achievement and live state — never resting elements.
        hud: '0 0 0 1px rgb(var(--ncanny-primary) / 0.35), 0 0 24px -6px rgb(var(--ncanny-primary) / 0.45)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '240ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
      },
    },
  },
};
