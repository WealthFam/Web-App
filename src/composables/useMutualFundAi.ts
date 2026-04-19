import { ref, computed } from 'vue'
import { financeApi } from '@/api/client'
import { marked } from 'marked'

export function useMutualFundAi() {
    const isAnalyzing = ref(false)
    const aiAnalysis = ref<any>(null)
    const error = ref<string | null>(null)

    const highlights = computed(() => aiAnalysis.value?.highlights || [])
    const suggestions = computed(() => aiAnalysis.value?.suggestions || [])

    const formattedSummary = computed(() => {
        if (!aiAnalysis.value?.summary) return ''
        // Wrap markers in span for styling if needed, but marked handles bolding
        return marked.parse(aiAnalysis.value.summary)
    })

    const fetchInsights = async (force = false) => {
        // Optimization: Use cache-first unless forced
        isAnalyzing.value = true
        error.value = null
        try {
            const response = await financeApi.getMutualFundPortfolioInsights(undefined, force)
            aiAnalysis.value = response.data.insights
        } catch (e: any) {
            console.error('Failed to fetch AI insights:', e)
            error.value = 'Our AI Advisor is currently offline. Please try again shortly.'
        } finally {
            isAnalyzing.value = false
        }
    }

    const getInsightColor = (type: string) => {
        const t = (type || '').toLowerCase()
        switch (t) {
            case 'success': return 'rgba(var(--v-theme-success), 0.1)'
            case 'warning': return 'rgba(var(--v-theme-warning), 0.1)'
            case 'danger': 
            case 'error': return 'rgba(var(--v-theme-error), 0.1)'
            default: return 'rgba(var(--v-theme-primary), 0.05)'
        }
    }

    const getInsightBorderColor = (type: string) => {
        const t = (type || '').toLowerCase()
        switch (t) {
            case 'success': return 'rgba(var(--v-theme-success), 0.4)'
            case 'warning': return 'rgba(var(--v-theme-warning), 0.4)'
            case 'danger':
            case 'error': return 'rgba(var(--v-theme-error), 0.4)'
            default: return 'rgba(var(--v-theme-primary), 0.2)'
        }
    }

    const getInsightIconColor = (type: string) => {
        const t = (type || '').toLowerCase()
        switch (t) {
            case 'success': return 'success'
            case 'warning': return 'warning'
            case 'danger':
            case 'error': return 'error'
            default: return 'primary'
        }
    }

    return {
        isAnalyzing,
        aiAnalysis,
        error,
        highlights,
        suggestions,
        formattedSummary,
        fetchInsights,
        getInsightColor,
        getInsightBorderColor,
        getInsightIconColor
    }
}
