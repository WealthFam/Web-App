import DOMPurify from 'dompurify'
import { marked } from 'marked'

/**
 * Safely renders Markdown into sanitized HTML using DOMPurify to prevent XSS.
 */
export function renderSafeMarkdown(markdown: string | null | undefined): string {
  if (!markdown) return ''
  const rawHtml = marked.parse(markdown, { async: false }) as string
  return DOMPurify.sanitize(rawHtml)
}
