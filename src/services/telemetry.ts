import type { App } from 'vue'
import type { Router } from 'vue-router'

// ------------------------------------------------------------------------------
// Anonymous Session Identification (Reset per browser session, zero user linkage)
// ------------------------------------------------------------------------------

function getOrCreateSessionHash(): string {
  try {
    const key = 'wf_anon_telemetry_session'
    let hash = sessionStorage.getItem(key)
    if (!hash) {
      const rand = Math.random().toString(36).substring(2, 10)
      const ts = Date.now().toString(36)
      hash = `web_${ts}_${rand}`.substring(0, 32)
      sessionStorage.setItem(key, hash)
    }
    return hash
  } catch {
    return 'anon_web_session'
  }
}

function detectOsVersion(): string {
  if (typeof navigator === 'undefined') return 'Web'
  const ua = navigator.userAgent
  if (/windows/i.test(ua)) return 'Windows'
  if (/macintosh|mac os x/i.test(ua)) return 'MacOS'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Web'
}

// ------------------------------------------------------------------------------
// Route Path & PII Scrubbing
// ------------------------------------------------------------------------------

const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g
const NUMERIC_ID_RE = /\/\d+(?=\/|$)/g

export function scrubRoutePath(path: string): string {
  if (!path) return '/'
  const clean = path.split('?')[0]
  return clean.replace(UUID_RE, '{id}').replace(NUMERIC_ID_RE, '/{id}')
}

const FORBIDDEN_KEYS = new Set([
  'email',
  'user_id',
  'tenant_id',
  'password',
  'token',
  'amount',
  'account_number',
  'pan',
  'phone',
  'raw_message',
  'body',
  'content',
])

function scrubMetadata(meta?: Record<string, any>): Record<string, any> | undefined {
  if (!meta) return undefined
  const clean: Record<string, any> = {}
  for (const [key, val] of Object.entries(meta)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue
    if (typeof val === 'string' && val.length > 100) {
      clean[key] = val.substring(0, 100)
    } else {
      clean[key] = val
    }
  }
  return clean
}

// ------------------------------------------------------------------------------
// Telemetry Batch Manager
// ------------------------------------------------------------------------------

export interface ClientEventIn {
  client_type: string
  app_version: string
  os_version: string
  session_hash: string
  event_category: string
  event_name: string
  duration_ms?: number
  status: string
  metadata?: Record<string, any>
  timestamp?: string
}

class WebTelemetryManager {
  private queue: ClientEventIn[] = []
  private timer: any = null
  private _enabled: boolean = this.readOptInPreference()

  private readOptInPreference(): boolean {
    try {
      if (import.meta.env.VITE_DISABLE_TELEMETRY === 'true') {
        return false
      }
      if (typeof localStorage === 'undefined') return true
      const stored = localStorage.getItem('wf_telemetry_opt_in')
      return stored !== null ? stored === 'true' : true
    } catch {
      return true
    }
  }

  public get ingestUrl(): string {
    const base = (import.meta.env.VITE_TELEMETRY_URL || '/telemetry').replace(/\/+$/, '')
    return `${base}/ingest`
  }

  public get isEnabled(): boolean {
    return this._enabled
  }

  public setEnabled(enabled: boolean): void {
    this._enabled = enabled
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('wf_telemetry_opt_in', String(enabled))
      }
    } catch {}
    if (!enabled) {
      this.queue = []
    }
  }

  public destroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
  private readonly maxQueueSize = 50
  private readonly batchSize = 15
  private readonly flushIntervalMs = 15000
  private sessionHash: string = getOrCreateSessionHash()
  private osVersion: string = detectOsVersion()
  private appVersion: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '3.0.17'

  constructor() {
    this.startPeriodicFlush()
    this.attachUnloadListener()
  }

  public enqueueEvent(
    category: string,
    name: string,
    durationMs?: number,
    status: 'ok' | 'error' = 'ok',
    meta?: Record<string, any>
  ): void {
    if (!this._enabled) return

    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift() // Drop oldest to avoid memory accumulation
    }

    const event: ClientEventIn = {
      client_type: 'web_app',
      app_version: this.appVersion,
      os_version: this.osVersion,
      session_hash: this.sessionHash,
      event_category: category.substring(0, 48),
      event_name: name.substring(0, 80),
      duration_ms: durationMs !== undefined ? Math.round(durationMs * 100) / 100 : undefined,
      status,
      metadata: scrubMetadata(meta),
      timestamp: new Date().toISOString(),
    }

    this.queue.push(event)

    if (this.queue.length >= this.batchSize) {
      this.flush()
    }
  }

  public async flush(): Promise<void> {
    if (!this._enabled || this.queue.length === 0) return

    const items = this.queue.splice(0, this.batchSize)
    const payload = {
      api_metrics: [],
      parser_events: [],
      client_events: items,
    }

    try {
      if (typeof fetch !== 'undefined') {
        await fetch(this.ingestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        })
      }
    } catch {
      // Silent fail: client telemetry must never disrupt user experience
    }
  }

  private startPeriodicFlush(): void {
    if (typeof window === 'undefined') return
    this.timer = setInterval(() => {
      this.flush()
    }, this.flushIntervalMs)
  }

  private attachUnloadListener(): void {
    if (typeof window === 'undefined') return

    const sendPending = () => {
      if (!this._enabled || this.queue.length === 0) return
      const payload = JSON.stringify({
        api_metrics: [],
        parser_events: [],
        client_events: this.queue,
      })
      this.queue = []

      const endpoint = this.ingestUrl
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(endpoint, blob)
      } else if (typeof fetch !== 'undefined') {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    }

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendPending()
      }
    })
    window.addEventListener('pagehide', sendPending)
  }
}

export const telemetry = new WebTelemetryManager()

// ------------------------------------------------------------------------------
// Vue App & Router Integration
// ------------------------------------------------------------------------------

export function initWebTelemetry(app: App, router: Router): void {
  // 1. Navigation Timing (Measuring Client-Side Route Transitions)
  let routeStartTime = performance.now()

  router.beforeEach((_to, _from, next) => {
    routeStartTime = performance.now()
    next()
  })

  router.afterEach((to) => {
    const elapsed = performance.now() - routeStartTime
    const routeName = (to.name as string) || scrubRoutePath(to.path)
    telemetry.enqueueEvent('navigation', routeName, elapsed, 'ok', {
      path: scrubRoutePath(to.path),
    })
  })

  // 2. Vue Component Error Handler
  const originalErrorHandler = app.config.errorHandler
  app.config.errorHandler = (err: unknown, instance, info) => {
    const errName = err instanceof Error ? err.name : 'VueError'
    const errMessage = err instanceof Error ? err.message : String(err)
    telemetry.enqueueEvent('error', errName, undefined, 'error', {
      info: info ? String(info).substring(0, 100) : undefined,
      msg: errMessage.substring(0, 100),
    })

    if (originalErrorHandler) {
      originalErrorHandler(err, instance, info)
    } else {
      console.error('[Vue Telemetry Caught]', err)
    }
  }

  // 3. Unhandled Rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      const errName = reason instanceof Error ? reason.name : 'UnhandledRejection'
      const errMessage = reason instanceof Error ? reason.message : String(reason)
      telemetry.enqueueEvent('error', errName, undefined, 'error', {
        type: 'unhandled_rejection',
        msg: errMessage.substring(0, 100),
      })
    })
  }
}
