import { ref, watch } from 'vue'
import { financeApi } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

export interface HeatmapDataPoint {
    id?: string
    latitude: number
    longitude: number
    amount: number
    date?: string | null
    category_id?: string | null
    category?: string
    category_icon?: string | null
    category_color?: string | null
    description?: string
    recipient?: string | null
    account_id?: string | null
    account_name?: string | null
    expense_group_id?: string | null
}

export interface HeatmapFilters {
    period?: string
    categoryIds?: string[]
    accountId?: string
    expenseGroupId?: string
    minAmount?: number
    maxAmount?: number
    search?: string
}

export function useHeatmapData(
    startDate: () => string,
    endDate: () => string,
    filters?: () => HeatmapFilters
) {
    const data = ref<HeatmapDataPoint[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const auth = useAuthStore()

    async function fetchHeatmap() {
        loading.value = true
        error.value = null
        try {
            const activeFilters = filters ? filters() : undefined
            const res = await financeApi.getHeatmapData(
                startDate(),
                endDate(),
                auth.selectedMemberId || undefined,
                activeFilters
            )
            data.value = Array.isArray(res.data) ? res.data : []
        } catch (e: any) {
            console.error('Failed to fetch heatmap', e)
            error.value = e?.response?.data?.detail || 'Failed to load spending map data'
        } finally {
            loading.value = false
        }
    }

    watch(
        [startDate, endDate, () => auth.selectedMemberId, () => (filters ? JSON.stringify(filters()) : '')],
        () => {
            fetchHeatmap()
        }
    )

    return {
        data,
        loading,
        error,
        fetchHeatmap
    }
}
