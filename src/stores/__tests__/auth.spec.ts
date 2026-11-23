import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { id: 'u1', email: 'test@wealthfam.com' } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}))

describe('Auth Store (auth.ts)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('initializes with unauthenticated state when localStorage is empty', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('selects and deselects family members correctly', () => {
    const auth = useAuthStore()
    auth.familyMembers = [
      { id: 'member-1', full_name: 'Alice Wealth', email: 'alice@example.com' },
      { id: 'member-2', full_name: 'Bob Wealth', email: 'bob@example.com' }
    ]

    expect(auth.selectedMemberName).toBe('All Members')

    auth.selectMember('member-1')
    expect(auth.selectedMemberId).toBe('member-1')
    expect(auth.selectedMemberName).toBe('Alice Wealth')

    auth.selectMember(null)
    expect(auth.selectedMemberName).toBe('All Members')
  })

  it('clears token, user, and localStorage upon logout', () => {
    localStorage.setItem('access_token', 'mock-valid-token')
    const auth = useAuthStore()
    auth.token = 'mock-valid-token'
    auth.user = { id: 'user-1', email: 'test@wealthfam.com', role: 'OWNER', tenant_id: 'tenant-1' }

    expect(auth.isAuthenticated).toBe(true)

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})
