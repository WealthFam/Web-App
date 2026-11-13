/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        wf: {
          primary: 'var(--wf-color-primary)',
          'primary-hover': 'var(--wf-color-primary-hover)',
          'primary-light': 'var(--wf-color-primary-light)',
          secondary: 'var(--wf-color-secondary)',
          'secondary-hover': 'var(--wf-color-secondary-hover)',
          background: 'var(--wf-color-background)',
          surface: 'var(--wf-color-surface)',
          'surface-variant': 'var(--wf-color-surface-variant)',
          'surface-muted': 'var(--wf-color-surface-muted)',
          'text-primary': 'var(--wf-color-text-primary)',
          'text-secondary': 'var(--wf-color-text-secondary)',
          'text-muted': 'var(--wf-color-text-muted)',
          border: 'var(--wf-color-border)',
          'border-subtle': 'var(--wf-color-border-subtle)',
          divider: 'var(--wf-color-divider)',
          success: 'var(--wf-color-success)',
          'success-light': 'var(--wf-color-success-light)',
          error: 'var(--wf-color-error)',
          'error-light': 'var(--wf-color-error-light)',
          warning: 'var(--wf-color-warning)',
          'warning-light': 'var(--wf-color-warning-light)',
          info: 'var(--wf-color-info)',
          'info-light': 'var(--wf-color-info-light)',
        },
      },
      borderRadius: {
        'wf-xs': 'var(--wf-radius-xs)',
        'wf-sm': 'var(--wf-radius-sm)',
        'wf-md': 'var(--wf-radius-md)',
        'wf-lg': 'var(--wf-radius-lg)',
        'wf-xl': 'var(--wf-radius-xl)',
        'wf-2xl': 'var(--wf-radius-2xl)',
        'wf-pill': 'var(--wf-radius-pill)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      maxWidth: {
        'wf-container': '1600px',
      },
      boxShadow: {
        'wf-flat': 'none',
        'wf-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'wf-card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
        'wf-modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'wf-glass': '0 10px 30px -10px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
