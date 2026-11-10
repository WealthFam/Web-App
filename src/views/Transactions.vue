<template>
    <MainLayout>
        <div class="space-y-4">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
                        <Wallet class="w-4.5 h-4.5 text-wf-primary" />
                    </div>
                    <div>
                        <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary leading-tight">Transactions</h1>
                        <p class="text-xs text-wf-text-secondary mt-0.5">
                            Track and manage your family's spending ledger and automated categorization.
                        </p>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="flex items-center gap-2 self-start sm:self-auto">
                    <div class="flex items-center p-0.5 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md shadow-2xs">
                        <button
                            type="button"
                            class="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-wf-sm transition-all"
                            :class="activeTab === 'list'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'"
                            @click="activeTab = 'list'; fetchData()"
                        >
                            <LayoutList :size="14" />
                            <span>List</span>
                        </button>
                        <button
                            type="button"
                            class="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-wf-sm transition-all"
                            :class="activeTab === 'pending'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'"
                            @click="activeTab = 'pending'; fetchTriage()"
                        >
                            <Inbox :size="14" />
                            <span>Inbox</span>
                            <span
                                v-if="triagePagination.total > 0"
                                class="px-1.5 py-0.2 text-[10px] font-bold rounded-wf-pill bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50"
                            >
                                {{ triagePagination.total }}
                            </span>
                        </button>
                        <button
                            type="button"
                            class="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-wf-sm transition-all"
                            :class="activeTab === 'heatmap'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'"
                            @click="activeTab = 'heatmap'"
                        >
                            <MapIcon :size="14" />
                            <span>Heatmap</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- CONTENT AREA -->
            <div v-show="activeTab === 'list'" class="space-y-2.5">
                <!-- QUICK CHART ROW (Compact & Collapsible) -->
                <WfCard
                    v-if="forecastData && forecastData.trend.length > 0"
                    variant="flat"
                    padding="none"
                    radius="lg"
                    class="border border-wf-border transition-all"
                    :class="showVelocityChart ? 'overflow-visible' : 'overflow-hidden'"
                >
                    <div class="px-4 py-2 flex items-center justify-between cursor-pointer select-none hover:bg-wf-surface-variant transition-colors" @click="showVelocityChart = !showVelocityChart">
                        <div class="flex items-center gap-2">
                            <Activity :size="14" class="text-wf-primary" />
                            <span class="text-xs sm:text-sm font-bold text-wf-text-primary">Spending Velocity & Forecast</span>
                            <span class="text-[10px] font-bold font-mono bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50 px-2 py-0.5 rounded-wf-pill">
                                AVG {{ formatAmount(metrics.avg_daily_spending || 0) }}/DAY
                            </span>
                        </div>
                        <div class="flex items-center gap-1 text-xs text-wf-text-muted font-semibold">
                            <span>{{ showVelocityChart ? 'Hide' : 'Show' }}</span>
                            <ChevronDown :size="14" class="transition-transform duration-200" :class="{ 'rotate-180': showVelocityChart }" />
                        </div>
                    </div>

                    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
                        <div v-if="showVelocityChart && forecastData" ref="chartContainer" class="px-4 pb-2.5 pt-0 overflow-visible relative" style="min-height: 125px; width: 100%;">
                            <SpendingForecastChart :trend="forecastData.trend" :user-names="forecastData.user_names"
                                :height="95" :width="chartWidth" />
                        </div>
                    </Transition>
                </WfCard>

                        <TransactionList v-bind="{
                            transactions, accounts, categories, expenseGroups,
                            loading, total, selectedAccount, categoryFilter,
                            searchQuery, startDate, endDate, selectedTimeRange,
                            page, pageSize, txnSortKey, txnSortOrder, metrics,
                            dailyTrend: forecastData?.trend
                        }" v-model:selectedIds="selectedIds"
                            @update:selectedAccount="selectedAccount = $event; page = 1; fetchData()"
                            @update:categoryFilter="categoryFilter = $event; page = 1; fetchData()"
                            @update:searchQuery="searchQuery = $event"
                            @update:startDate="startDate = $event; page = 1; fetchData()"
                            @update:endDate="endDate = $event; page = 1; fetchData()"
                            @update:selectedTimeRange="selectedTimeRange = $event; handleTimeRangeChange($event)"
                            @update:page="page = $event; fetchData()"
                            @update:pageSize="pageSize = $event; page = 1; fetchData()" @sortChange="toggleTxnSort"
                            @editTxn="(t) => { fetchModalData(); openEditModal(t) }"
                            @deleteSelected="showDeleteConfirm = true" @importCsv="showImportModal = true"
                            @fetchData="fetchData" @showVendorInsights="openVendorInsights"
                            @resetFilters="selectedTimeRange = 'all'; startDate = ''; endDate = ''; searchQuery = ''; categoryFilter = ''; fetchData()" />
            </div>

            <div v-show="activeTab === 'pending'">
                <TransactionTriage v-bind="{
                    activeSubTab: 'pending', accounts, categories,
                    triageTransactions, triagePagination, triageSearchQuery,
                    triageSourceFilter, triageSortKey, triageSortOrder,
                    // Confirmation States
                    showDiscardConfirm, createIgnoreRule,
                    triageIdToDiscard
                }" v-model:selectedTriageIds="selectedTriageIds"
                    @update:activeSubTab="activeTriageSubTab = $event"
                    @update:triageSearchQuery="triageSearchQuery = $event"
                    @update:triageSourceFilter="triageSourceFilter = $event as any"
                    @update:triageSortKey="triageSortKey = $event"
                    @update:triageSortOrder="triageSortOrder = $event"
                    @update:triagePagination="triagePagination = $event; fetchTriage()"
                    @update:showDiscardConfirm="showDiscardConfirm = $event"
                    @update:createIgnoreRule="createIgnoreRule = $event" @approveTriage="approveTriage"
                    @rejectTriage="rejectTriage" @bulkRejectTriage="handleBulkRejectTriage"
                    @confirmDiscard="confirmDiscard"
                    @confirmBulkDiscard="handleBulkRejectTriage"
                    @refreshTriage="() => { fetchTriage(); fetchData(); }" />
            </div>

            <div v-show="activeTab === 'heatmap'">
                <SpendingHeatmap :start-date="startDate" :end-date="endDate" />
            </div>
        </div>

        <!-- Modals -->
        <ImportModal :isOpen="showImportModal" @close="showImportModal = false" @import-success="fetchData" />
        <SmartPromptModal :isOpen="showSmartPrompt" :data="smartPromptData" @close="showSmartPrompt = false"
            @confirm="handleSmartCategorize" />
        <TransactionModal :isOpen="showModal" :isEditing="isEditing" :form="form" :accounts="accounts"
            :categories="categories" :budgets="budgets" :expenseGroups="expenseGroups"
            :potentialMatches="potentialMatches" :isSearchingMatches="isSearchingMatches"
            :matchesSearched="matchesSearched" @close="showModal = false" @submit="handleSubmit"
            @findMatches="findMatches" />

        <VendorInsightsModal v-model="showVendorModal" :vendor-name="selectedVendorForInsights" />

        <!-- Delete Confirmation Dialog -->
        <WfModal
            v-model="showDeleteConfirm"
            title="Delete Transactions"
            description="Permanent action. This cannot be undone."
            max-width="sm"
        >
            <div class="py-2 text-center">
                <div class="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3">
                    <Trash2 :size="24" />
                </div>
                <p class="text-sm text-wf-text-secondary">
                    Are you sure you want to delete <span class="font-bold text-wf-text-primary">{{ selectedIds.size }}</span> selected transactions?
                </p>
            </div>
            <template #footer>
                <div class="flex items-center justify-end gap-2 w-full">
                    <WfButton
                        variant="ghost"
                        size="sm"
                        :disabled="loading"
                        @click="showDeleteConfirm = false"
                    >
                        Cancel
                    </WfButton>
                    <WfButton
                        variant="danger"
                        size="sm"
                        :disabled="loading"
                        :loading="loading"
                        @click="async () => { await confirmDelete(); fetchData(); showDeleteConfirm = false }"
                    >
                        <Trash2 :size="14" class="mr-1" />
                        <span>Delete Forever</span>
                    </WfButton>
                </div>
            </template>
        </WfModal>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useRoute } from 'vue-router'
import { financeApi } from '@/api/client'

import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import ImportModal from '@/components/ImportModal.vue'
import SmartPromptModal from '@/components/SmartPromptModal.vue'

import SpendingHeatmap from '@/components/SpendingHeatmap.vue'
import TransactionList from './transactions/TransactionList.vue'
import TransactionTriage from './transactions/TransactionTriage.vue'
import TransactionModal from './transactions/TransactionModal.vue'
import VendorInsightsModal from '@/components/transactions/VendorInsightsModal.vue'
import {
    LayoutList,
    Inbox,
    Map as MapIcon,
    Activity,
    Trash2,
    ChevronDown,
    Wallet
} from 'lucide-vue-next'
import SpendingForecastChart from '@/components/SpendingForecastChart.vue'

const showVelocityChart = ref(false)


// Composables

import { useTransactionState } from '@/composables/useTransactionState'
import { useTriageState } from '@/composables/useTriageState'
import { useTransactionModals } from '@/composables/useTransactionModals'
import { useCurrency } from '@/composables/useCurrency'
import { useAuthStore } from '@/stores/auth'
import { useFinanceStore } from '@/stores/finance'
import { useBudgetStore } from '@/stores/finance/budgets'
import { useExpenseGroupStore } from '@/stores/expenseGroups'

const { formatAmount } = useCurrency()

// Global State
const route = useRoute()
const financeStore = useFinanceStore()
const budgetStore = useBudgetStore()
const groupStore = useExpenseGroupStore()

// Master Data (shared across composables, backed by stores)
const accounts = computed(() => financeStore.accounts)
const categories = computed(() => financeStore.categories)
const budgets = computed(() => budgetStore.budgets)
const expenseGroups = computed(() => groupStore.groups)

// UI State
const showImportModal = ref(false)
const activeTab = ref<'list' | 'analytics' | 'pending' | 'heatmap'>('list')
const activeTriageSubTab = ref<string>('pending')



// Smart Categorization Modal (shared between composables)
const showSmartPrompt = ref(false)
const smartPromptData = ref({
    txnId: '',
    category: '',
    pattern: '',
    count: 0,
    createRule: true,
    applyToSimilar: true,
    excludeFromReports: false
})

const showVendorModal = ref(false)
const selectedVendorForInsights = ref('')

function openVendorInsights(name: string) {
    selectedVendorForInsights.value = name
    showVendorModal.value = true
}



// Initialize Transaction State Composable
const {
    transactions,
    loading,
    forecastData,
    total,
    metrics,
    selectedAccount,
    searchQuery,
    categoryFilter,
    startDate,
    endDate,
    selectedTimeRange,

    page,
    pageSize,
    txnSortKey,
    txnSortOrder,
    selectedIds,
    showDeleteConfirm,
    fetchData,
    fetchModalData, // [NEW] Lazy load budgets/loans
    handleTimeRangeChange,
    toggleTxnSort,
    refreshAccounts,
    confirmDelete
} = useTransactionState(route, accounts)

// Chart Responsiveness
const chartContainer = ref<HTMLElement | null>(null)
const chartWidth = ref(1200)

watch(chartContainer, (el) => {
    if (el) {
        chartWidth.value = el.clientWidth
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                chartWidth.value = entries[0].contentRect.width
            }
        })
        observer.observe(el)
    }
})

const {
    triageTransactions,
    triagePagination,
    triageSearchQuery,
    triageSourceFilter,
    triageSortKey,
    triageSortOrder,
    selectedTriageIds,
    fetchTriage,
    approveTriage,
    rejectTriage,
    handleBulkRejectTriage,
    // Confirmation States
    showDiscardConfirm,
    createIgnoreRule,
    triageIdToDiscard,
    // Methods
    confirmDiscard
} = useTriageState(accounts, categories, showSmartPrompt, smartPromptData, fetchData)

// Initialize Modals Composable
const {
    showModal,
    isEditing,
    potentialMatches,
    isSearchingMatches,
    matchesSearched,
    form,
    openEditModal,
    handleSubmit,
    handleSmartCategorize,
    findMatches
} = useTransactionModals(selectedAccount, accounts, budgets, transactions, fetchData, showSmartPrompt,
    smartPromptData, refreshAccounts)


// Search debounce
let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
    if (searchDebounce) clearTimeout(searchDebounce)
    searchDebounce = setTimeout(() => {
        page.value = 1
        fetchData()
    }, 400)
})

// Watch for global member filter changes
const auth = useAuthStore()
watch(() => auth.selectedMemberId, () => {
    // Reset page and re-fetch. Stores handle their own member-specific caching/resets.
    page.value = 1
    fetchData()
    fetchTriage()
})

// Deep-link handling
async function checkDeepLink() {
    const txnId = route.query.id as string
    if (txnId) {
        try {
            const res = await financeApi.getTransaction(txnId)
            if (res.data) {
                // Ensure master data for modal is loaded
                await fetchModalData()
                openEditModal(res.data)
            }
        } catch (e) {
            console.error('Failed to load deep-linked transaction', e)
        }
    }
}

watch(() => route.query.id, () => {
    checkDeepLink()
})

onMounted(() => {
    fetchData()
    fetchTriage() // Pre-fetch count
    checkDeepLink()
})
</script>
