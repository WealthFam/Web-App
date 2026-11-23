import { ref, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const IDLE_LIMIT_MS = 15 * 60 * 1000 // 15 minutes
const WARNING_WINDOW_MS = 60 * 1000  // 60 seconds warning before timeout
const STORAGE_KEY = 'wealthfam_last_active_at'

export function useIdleTimeout() {
  const router = useRouter()
  const authStore = useAuthStore()

  const isWarningVisible = ref(false)
  const remainingSeconds = ref(60)

  let checkInterval: ReturnType<typeof setInterval> | null = null
  let countdownTimer: ReturnType<typeof setInterval> | null = null
  let lastRecordedActivity = Date.now()

  function recordActivity() {
    const now = Date.now()
    // Debounce activity writes (at most once every 5 seconds)
    if (now - lastRecordedActivity > 5000) {
      lastRecordedActivity = now
      try {
        localStorage.setItem(STORAGE_KEY, now.toString())
      } catch {}
    }
  }

  function handleStorageEvent(e: StorageEvent) {
    if (e.key === STORAGE_KEY && e.newValue) {
      const remoteActivity = parseInt(e.newValue, 10)
      if (!isNaN(remoteActivity) && remoteActivity > lastRecordedActivity) {
        lastRecordedActivity = remoteActivity
        if (isWarningVisible.value) {
          isWarningVisible.value = false
          if (countdownTimer) clearInterval(countdownTimer)
        }
      }
    }
  }

  function checkInactivity() {
    if (!authStore.isAuthenticated) {
      if (isWarningVisible.value) {
        isWarningVisible.value = false
        if (countdownTimer) clearInterval(countdownTimer)
      }
      return
    }

    let storedActivity = lastRecordedActivity
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) storedActivity = Math.max(lastRecordedActivity, parseInt(raw, 10))
    } catch {}

    const elapsed = Date.now() - storedActivity

    if (elapsed >= IDLE_LIMIT_MS) {
      // Time is completely up - execute auto logout
      executeTimeoutLogout()
    } else if (elapsed >= IDLE_LIMIT_MS - WARNING_WINDOW_MS) {
      // Within the 60-second warning window
      const timeLeft = Math.max(1, Math.ceil((IDLE_LIMIT_MS - elapsed) / 1000))
      remainingSeconds.value = timeLeft
      if (!isWarningVisible.value) {
        isWarningVisible.value = true
        startCountdown()
      }
    } else {
      if (isWarningVisible.value) {
        isWarningVisible.value = false
        if (countdownTimer) clearInterval(countdownTimer)
      }
    }
  }

  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = setInterval(() => {
      if (remainingSeconds.value > 1) {
        remainingSeconds.value -= 1
      } else {
        clearInterval(countdownTimer!)
        executeTimeoutLogout()
      }
    }, 1000)
  }

  function stayLoggedIn() {
    lastRecordedActivity = Date.now()
    try {
      localStorage.setItem(STORAGE_KEY, lastRecordedActivity.toString())
    } catch {}

    isWarningVisible.value = false
    if (countdownTimer) clearInterval(countdownTimer)

    // Refresh backend session token
    authStore.refreshToken()
  }

  function executeTimeoutLogout() {
    isWarningVisible.value = false
    if (countdownTimer) clearInterval(countdownTimer)
    authStore.logout()
    router.push({ path: '/login', query: { reason: 'session_timeout' } })
  }

  const monitoredEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']

  if (getCurrentInstance()) {
    onMounted(() => {
      lastRecordedActivity = Date.now()
      try {
        localStorage.setItem(STORAGE_KEY, lastRecordedActivity.toString())
      } catch {}

      monitoredEvents.forEach((evt) => {
        window.addEventListener(evt, recordActivity, { passive: true })
      })
      window.addEventListener('storage', handleStorageEvent)

      // Check inactivity every 5 seconds
      checkInterval = setInterval(checkInactivity, 5000)
    })

    onUnmounted(() => {
      monitoredEvents.forEach((evt) => {
        window.removeEventListener(evt, recordActivity)
      })
      window.removeEventListener('storage', handleStorageEvent)
      if (checkInterval) clearInterval(checkInterval)
      if (countdownTimer) clearInterval(countdownTimer)
    })
  }

  return {
    isWarningVisible,
    remainingSeconds,
    stayLoggedIn,
    logoutNow: executeTimeoutLogout,
  }
}
