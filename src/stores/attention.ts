import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { financeApi } from '@/api/client'

export interface AttentionCategoryStatements {
    pending_password: number
    failed: number
    unattended_parsed: number
    total: number
    route: string
}

export interface AttentionCategorySimple {
    count: number
    route: string
}

export interface AttentionCategories {
    statements: AttentionCategoryStatements
    triage: AttentionCategorySimple
    transfers: AttentionCategorySimple
    rules: AttentionCategorySimple
    accounts: AttentionCategorySimple
    offline_queue: AttentionCategorySimple
    credit_cards?: AttentionCategorySimple
    budgets?: AttentionCategorySimple
    loans?: AttentionCategorySimple
    recurring?: AttentionCategorySimple
    cas_freshness?: AttentionCategorySimple
}

export interface AttentionItem {
    id: string
    type: string
    severity: 'ERROR' | 'WARNING' | 'INFO'
    title: string
    description: string
    count: number
    route: string
    query?: Record<string, any>
}

export interface AttentionSummary {
    total_attention_count: number
    categories: AttentionCategories
    items: AttentionItem[]
}

export const useAttentionStore = defineStore('attention', () => {
    const summary = ref<AttentionSummary | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const totalCount = computed(() => summary.value?.total_attention_count ?? 0)
    const items = computed(() => summary.value?.items ?? [])
    const categories = computed(() => summary.value?.categories ?? null)

    async function fetchSummary(userId?: string) {
        loading.value = true
        error.value = null
        try {
            const res = await financeApi.getAttentionSummary(userId)
            summary.value = res.data
        } catch (e: any) {
            console.error('[AttentionStore] Failed to fetch attention summary', e)
            error.value = e?.message || 'Failed to fetch attention summary'
        } finally {
            loading.value = false
        }
    }

    return {
        summary,
        loading,
        error,
        totalCount,
        items,
        categories,
        fetchSummary
    }
})
