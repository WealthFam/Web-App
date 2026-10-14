/**
 * Aether V4 Theme Color Resolver
 * Dynamically resolves CSS custom properties for HTML5 Canvas / Chart.js rendering.
 */

export function getCssToken(name: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return val || fallback
}

export function getThemeColors() {
  return {
    primary: getCssToken('--wf-color-primary', '#6366F1'),
    primaryHover: getCssToken('--wf-color-primary-hover', '#4F46E5'),
    primaryLight: getCssToken('--wf-color-primary-light', '#EEF2FF'),
    secondary: getCssToken('--wf-color-secondary', '#A855F7'),
    success: getCssToken('--wf-color-success', '#10B981'),
    error: getCssToken('--wf-color-error', '#EF4444'),
    warning: getCssToken('--wf-color-warning', '#F59E0B'),
    info: getCssToken('--wf-color-info', '#3B82F6'),
    surface: getCssToken('--wf-color-surface', '#FFFFFF'),
    textPrimary: getCssToken('--wf-color-text-primary', '#0F172A'),
    textSecondary: getCssToken('--wf-color-text-secondary', '#475569'),
    textMuted: getCssToken('--wf-color-text-muted', '#64748B'),
    border: getCssToken('--wf-color-border', '#E2E8F0'),
  }
}
