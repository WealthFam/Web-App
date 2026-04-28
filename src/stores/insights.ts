import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { financeApi, aiApi } from '@/api/client'
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
    const aiInsights = ref<string>('')
    const loading = ref(false)
    const generatingAI = ref(false)

    // Persistence (Standard WealthFam pattern)
    useStorePersistence('insights_analytics', analyticsData, memberId)
    useStorePersistence('insights_ai', aiInsights, memberId)

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

    async function generateAIInsights(promptData: any, forceRefresh: boolean = false) {
        if (generatingAI.value) return
        generatingAI.value = true
        try {
            const res = await aiApi.generateSummaryInsights(promptData, forceRefresh)
            if (res.data && res.data.insights) {
                aiInsights.value = res.data.insights
            }
            return aiInsights.value
        } catch (e) {
            console.error('[InsightsStore] Failed to generate AI insights', e)
            throw e
        } finally {
            generatingAI.value = false
        }
    }

    return {
        analyticsData,
        aiInsights,
        loading,
        generatingAI,
        fetchAnalytics,
        generateAIInsights
    }
})
