import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdleTimeout } from '../useIdleTimeout'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: { access_token: 'refreshed-token' } }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}))

describe('useIdleTimeout Composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes warning as invisible', () => {
    const { isWarningVisible, remainingSeconds } = useIdleTimeout()
    expect(isWarningVisible.value).toBe(false)
    expect(remainingSeconds.value).toBe(60)
  })

  it('stayLoggedIn resets warning and updates storage timestamp', () => {
    const { isWarningVisible, stayLoggedIn } = useIdleTimeout()
    isWarningVisible.value = true

    stayLoggedIn()

    expect(isWarningVisible.value).toBe(false)
    expect(localStorage.getItem('wealthfam_last_active_at')).not.toBeNull()
  })
})
