import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { financeApi } from '@/api/client'
import { useStorePersistence } from '@/utils/persistence'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'

export const useMutualFundStore = defineStore('mutualFunds', () => {
    const notification = useNotificationStore()
    const auth = useAuthStore()
    const memberId = computed(() => auth.selectedMemberId)

    // State
    const isSyncing = ref(false)
    const syncStatus = ref<any>(null)
    const portfolio = ref<any[]>([])
    const analytics = ref<any>(null)
    const aiAnalysis = ref<string>('')
    const activeTab = ref<string>('portfolio')

    useStorePersistence('mf_sync_status', syncStatus, memberId)
    useStorePersistence('mf_portfolio', portfolio, memberId)
    useStorePersistence('mf_analytics', analytics, memberId)
    useStorePersistence('mf_ai_analysis', aiAnalysis, memberId)
    useStorePersistence('mf_active_tab', activeTab, memberId)


    const lastFetch = ref<number>(0)

    // Actions
    async function fetchSyncStatus() {
        try {
            const { data } = await financeApi.getMutualFundSyncStatus()
            syncStatus.value = data
            lastFetch.value = Date.now()

            // Handle transition from running to completed/error
            if (isSyncing.value && data.status !== 'running') {
                isSyncing.value = false
                if (data.status === 'completed') {
                    notification.success(`Mutual Fund sync completed: ${data.updated_count} funds updated.`)
                } else if (data.status === 'error') {
                    notification.error(`Mutual Fund sync failed: ${data.error}`)
                }
            } else if (data.status === 'running') {
                isSyncing.value = true
            }
        } catch (error) {
            console.error('[MutualFundStore] Failed to fetch sync status:', error)
        }
    }

    async function triggerSync() {
        if (isSyncing.value) return

        isSyncing.value = true
        try {
            await financeApi.triggerMutualFundSync()
            notification.info('Mutual Fund background sync started...')

            // Poll sooner to catch the "running" state
            setTimeout(fetchSyncStatus, 1000)
        } catch (error) {
            isSyncing.value = false
            console.error('[MutualFundStore] Sync trigger failed:', error)
            // Error notification is handled by axios interceptor but we can add more context if needed
        }
    }

    function clearPortfolioCache() {
        // Reset local state
        portfolio.value = []
        analytics.value = null
        aiAnalysis.value = ''
        
        // localStorage is automatically updated by the useStorePersistence watchers
    }

    async function getExploreFundInfo(schemeCode: string) {
        try {
            const { data } = await financeApi.getSchemeInfo(schemeCode)
            return data
        } catch (error) {
            console.error(`[MutualFundStore] Failed to fetch explore info for ${schemeCode}:`, error)
            throw error
        }
    }

    async function recalculateFundTrends(schemeCode: string) {
        try {
            await financeApi.getNav(schemeCode)
        } catch (error) {
            console.error(`[MutualFundStore] Failed to recalculate trends for ${schemeCode}:`, error)
            throw error
        }
    }

    async function hardRefreshPortfolio() {
        try {
            await financeApi.deleteCacheTimeline()
            notification.success('Portfolio cache cleared. Recalculating trends...')
        } catch (error) {
            console.error('[MutualFundStore] Hard refresh failed:', error)
            throw error
        }
    }

    return {
        isSyncing,
        syncStatus,
        portfolio,
        analytics,
        aiAnalysis,
        activeTab,
        lastFetch,
        fetchSyncStatus,
        triggerSync,
        clearPortfolioCache,
        getExploreFundInfo,
        recalculateFundTrends,
        hardRefreshPortfolio
    }
})

