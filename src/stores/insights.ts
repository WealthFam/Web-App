import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { financeApi } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useStorePersistence } from '@/utils/persistence'

export const useInsightsStore = defineStore('insights', () => {
    const auth = useAuthStore()
    const memberId = computed(() => auth.selectedMemberId)

    // State
    const analyticsData = ref<any>({
        income: 0,
        expense_total: 0,
        investment_total: 0,
        net: 0,
        categories: [],
        investment_breakdown: [],
        merchants: [],
        heatmap: { grid: {}, categories: [], hours: [], max: 0 },
        excludedExpense: 0,
        excludedIncome: 0,
        excludedCategories: [],
        accounts: [],
        types: [],
        count: 0
    })
    const loading = ref(false)

    // Persistence (Standard WealthFam pattern)
    useStorePersistence('insights_analytics', analyticsData, memberId)

    // Actions
    async function fetchAnalytics(params: {
        account_id?: string,
        start_date?: string,
        end_date?: string,
        category?: string
    }) {
        loading.value = true
        try {
            const userId = auth.selectedMemberId || undefined
            const res = await financeApi.getDetailedAnalytics(
                params.account_id,
                params.start_date,
                params.end_date,
                userId,
                params.category
            )
            analyticsData.value = res.data
            return res.data
        } catch (e) {
            console.error('[InsightsStore] Failed to fetch analytics', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        analyticsData,
        loading,
        fetchAnalytics
    }
})
