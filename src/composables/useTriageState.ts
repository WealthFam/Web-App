import { ref, watch, type Ref } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'

/**
 * Triage State Management Composable
 * Handles pending inbox triage transactions
 */
export function useTriageState(
    accounts: Ref<any[]>,
    categories: Ref<any[]>,
    showSmartPrompt: Ref<boolean>,
    smartPromptData: Ref<any>,
    fetchData: Function
) {
    const notify = useNotificationStore()
    const auth = useAuthStore()

    // Triage State
    const triageTransactions = ref<any[]>([])
    const triagePagination = ref({ total: 0, limit: 12, skip: 0 })
    const triageSearchQuery = ref('')
    const triageSourceFilter = ref<'ALL' | 'SMS' | 'EMAIL'>('ALL')
    const triageSortKey = ref('date')
    const triageSortOrder = ref<'asc' | 'desc'>('desc')
    const selectedTriageIds = ref<string[]>([])

    // Modal States
    const showDiscardConfirm = ref(false)
    const createIgnoreRule = ref(false)
    const triageIdToDiscard = ref<string | null>(null)

    const loading = ref(false)
    const isProcessingBulk = ref(false)

    /**
     * Fetch triage data
     */
    async function fetchTriage(resetSkip = false) {
        loading.value = true
        try {
            if (resetSkip) {
                triagePagination.value.skip = 0
            }

            // Ensure we have accounts and categories for rendering
            if (accounts.value.length === 0 || categories.value.length === 0) {
                const [accRes, catRes] = await Promise.all([
                    financeApi.getAccounts(auth.selectedMemberId || undefined),
                    financeApi.getCategories(true)
                ])
                accounts.value = accRes.data
                categories.value = catRes.data
            }

            const res = await financeApi.getTriage({
                limit: triagePagination.value.limit,
                skip: triagePagination.value.skip,
                sort_by: triageSortKey.value,
                sort_order: triageSortOrder.value,
                search: triageSearchQuery.value || undefined,
                source: triageSourceFilter.value !== 'ALL' ? triageSourceFilter.value : undefined,
                user_id: auth.selectedMemberId || undefined
            } as any)

            triageTransactions.value = res.data.data.map((t: any) => ({
                ...t,
                category: t.category || 'Uncategorized',
                is_transfer: !!t.is_transfer,
                create_rule: false
            }))
            triagePagination.value.total = res.data.total
            selectedTriageIds.value = []
        } catch (e) {
            console.error('Failed to fetch triage', e)
        } finally {
            loading.value = false
        }
    }

    /**
     * Approve a triage transaction
     */
    async function approveTriage(txn: any) {
        try {
            const res = await financeApi.approveTriage(txn.id, {
                category: txn.category,
                is_transfer: txn.is_transfer,
                to_account_id: txn.to_account_id,
                exclude_from_reports: txn.exclude_from_reports,
                create_rule: false
            })
            notify.success('Transaction approved')

            // Smart Categorization Prompt Logic
            if (!txn.is_transfer && txn.category && txn.category !== 'Uncategorized') {
                const pattern = txn.recipient || txn.description
                const newTxnId = res.data.transaction_id

                smartPromptData.value = {
                    txnId: newTxnId,
                    category: txn.category,
                    pattern: pattern,
                    count: 0,
                    createRule: true,
                    applyToSimilar: false,
                    excludeFromReports: false
                }
                showSmartPrompt.value = true
            }

            fetchTriage()
            fetchData() // Refresh list view
        } catch (e) {
            notify.error('Approval failed')
        }
    }

    /**
     * Reject a triage transaction
     */
    async function rejectTriage(id: string) {
        triageIdToDiscard.value = id
        showDiscardConfirm.value = true
    }

    /**
     * Confirm discard of triage transaction
     */
    async function confirmDiscard() {
        if (!triageIdToDiscard.value) return
        try {
            await financeApi.rejectTriage(triageIdToDiscard.value, createIgnoreRule.value)
            if (createIgnoreRule.value) {
                notify.success('Pattern will be ignored in future')
            } else {
                notify.success('Transaction discarded')
            }
            fetchTriage()
            showDiscardConfirm.value = false
            triageIdToDiscard.value = null
            createIgnoreRule.value = false
        } catch (e) {
            notify.error('Failed to discard')
        }
    }

    /**
     * Bulk reject triage transactions
     */
    async function handleBulkRejectTriage() {
        if (selectedTriageIds.value.length === 0) return
        isProcessingBulk.value = true
        try {
            await financeApi.bulkRejectTriage(selectedTriageIds.value, createIgnoreRule.value)
            if (createIgnoreRule.value) {
                notify.success(`Ignored ${selectedTriageIds.value.length} patterns for the future`)
            } else {
                notify.success(`Discarded ${selectedTriageIds.value.length} items`)
            }
            createIgnoreRule.value = false
            showDiscardConfirm.value = false
            fetchTriage()
        } catch (e) {
            notify.error('Bulk reject failed')
        } finally {
            isProcessingBulk.value = false
        }
    }

    /**
     * Toggle select all triage
     */
    function toggleSelectAllTriage() {
        if (selectedTriageIds.value.length === triageTransactions.value.length) {
            selectedTriageIds.value = []
        } else {
            selectedTriageIds.value = triageTransactions.value.map(t => t.id)
        }
    }

    // Watchers
    watch([triageSortKey, triageSortOrder], () => {
        triagePagination.value.skip = 0
        fetchTriage()
    })

    // Watch source filter changes (immediate)
    watch(triageSourceFilter, () => {
        triagePagination.value.skip = 0
        fetchTriage()
    })

    // Watch search query changes (debounced)
    let searchDebounce: any = null
    watch(triageSearchQuery, () => {
        if (searchDebounce) clearTimeout(searchDebounce)
        searchDebounce = setTimeout(() => {
            triagePagination.value.skip = 0
            fetchTriage()
        }, 400)
    })

    return {
        // State
        triageTransactions,
        triagePagination,
        triageSearchQuery,
        triageSourceFilter,
        triageSortKey,
        triageSortOrder,
        selectedTriageIds,
        showDiscardConfirm,
        createIgnoreRule,
        triageIdToDiscard,
        loading,
        isProcessingBulk,

        // Methods
        fetchTriage,
        approveTriage,
        rejectTriage,
        confirmDiscard,
        handleBulkRejectTriage,
        toggleSelectAllTriage
    }
}
