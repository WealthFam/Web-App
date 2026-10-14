<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { marked } from 'marked'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import FundPerformanceChart from './mutual-funds/components/FundPerformanceChart.vue'
import { useCurrency } from '@/composables/useCurrency'
import {
    History, Shield, Edit2, ChevronLeft, Check, TrendingUp,
    Target, Briefcase, Globe, Fingerprint, AlertCircle, Search,
    Zap, RefreshCw, ZapOff, Trash2, Edit
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import WfCard from '@/components/ui/WfCard.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'
import InvestModal from './mutual-funds/modals/InvestModal.vue'
import RedeemModal from './mutual-funds/modals/RedeemModal.vue'
import LinkGoalModal from './mutual-funds/modals/LinkGoalModal.vue'
import DeleteHoldingDeepDiveModal from './mutual-funds/modals/DeleteHoldingDeepDiveModal.vue'
import DeleteTransactionModal from './mutual-funds/modals/DeleteTransactionModal.vue'
import EditTransactionModal from './mutual-funds/modals/EditTransactionModal.vue'

const route = useRoute()
const router = useRouter()
const notify = useNotificationStore()
const authStore = useAuthStore()
const { formatAmount } = useCurrency()

const holdingId = route.params.id as string
const holding = ref<any>(null)
const isLoading = ref(true)

// Modals
const showInvestModal = ref(false)
const showRedeemModal = ref(false)
const showUserModal = ref(false)
const showGoalModal = ref(false)

// Management Modals
const showDeepDiveModal = ref(false)
const showEditTxnModal = ref(false)
const showDeleteTxnModal = ref(false)
const activeTransaction = ref<any>(null)
const isManagementLoading = ref(false)
const isTimelineLoading = ref(true)
const isInsightsLoading = ref(false)
const fundInsights = ref<any>(null)
const insightsError = ref<string | null>(null)
const benchmarkData = ref<any[]>([])
const benchmarksData = ref<any[]>([])
const selectedBenchmarkSymbols = ref<string[]>(['120716']) // Default to Nifty 50
const showBenchmarkDropdown = ref(false)

const filteredBenchmarksData = computed(() => {
    return benchmarksData.value.filter(bm => selectedBenchmarkSymbols.value.includes(bm.symbol))
})

// Family Members for Ownership
const familyMembers = computed(() => authStore.familyMembers || [])
const searchQuery = ref('')

async function fetchHoldingDetails() {
    isLoading.value = true
    try {
        let res
        const isSchemeCode = /^\d+$/.test(holdingId) || route.query.type === 'aggregate'
        if (isSchemeCode) {
            res = await financeApi.getSchemeDetails(holdingId)
        } else {
            res = await financeApi.getHoldingDetails(holdingId)
        }

        holding.value = res.data
    } catch (e) {
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

// Chart Data from Backend API
const timelineData = ref<any[]>([])

const chartData = computed(() => {
    return timelineData.value.map(point => ({
        date: point.date,
        value: point.value,
        invested: point.invested
    }))
})

const chartMarkers = computed(() => {
    return (holding.value?.transactions || []).map((t: any) => ({
        date: t.date,
        type: t.type,
        amount: Number(t.amount),
        units: Number(t.units)
    }))
})

const transactions = computed(() => {
    return holding.value?.transactions || []
})

// Owner Update Logic
async function updateOwner(userId: string | null) {
    try {
        await financeApi.updateHolding(holdingId, { user_id: userId })
        notify.success("Ownership updated")
        fetchHoldingDetails()
    } catch (e) {
        notify.error("Failed to update ownership")
    } finally {
        showUserModal.value = false
    }
}

async function deleteHolding() {
    isManagementLoading.value = true
    try {
        await financeApi.deleteHolding(holdingId)
        notify.success("Holding removed permanently")
        router.push('/mutual-funds')
    } catch (e) {
        notify.error("Failed to delete holding")
    } finally {
        isManagementLoading.value = false
        showDeepDiveModal.value = false
    }
}

async function handleBulkDelete(txnIds: string[]) {
    isManagementLoading.value = true
    try {
        await financeApi.bulkDeleteFundTransactions(txnIds)
        notify.success(`Removed ${txnIds.length} transactions`)
        refreshAll()
    } catch (e) {
        notify.error("Failed to delete transactions")
    } finally {
        isManagementLoading.value = false
        showDeepDiveModal.value = false
    }
}

async function handleEditTransaction(payload: { id: string, data: any }) {
    isManagementLoading.value = true
    try {
        await financeApi.editFundTransaction(payload.id, payload.data)
        notify.success("Transaction updated")
        refreshAll()
    } catch (e) {
        notify.error("Failed to update transaction")
    } finally {
        isManagementLoading.value = false
        showEditTxnModal.value = false
    }
}

async function handleSingleDelete(txnId: string) {
    isManagementLoading.value = true
    try {
        await financeApi.bulkDeleteFundTransactions([txnId])
        notify.success("Transaction removed")
        refreshAll()
    } catch (e) {
        notify.error("Failed to delete transaction")
    } finally {
        isManagementLoading.value = false
        showDeleteTxnModal.value = false
    }
}

function refreshAll() {
    fetchHoldingDetails()
    fetchPerformanceTimeline()
    fetchFundInsights()
}

async function fetchFundInsights(forceRefresh: boolean = false) {
    isInsightsLoading.value = true
    insightsError.value = null
    try {
        const res = await financeApi.getHoldingInsights(holdingId, forceRefresh)
        fundInsights.value = res.data?.insights
        insightsError.value = null
    } catch (e: any) {
        console.error("Failed to fetch insights", e)
        insightsError.value = e.response?.data?.detail || "Fund insights are currently unavailable."
    } finally {
        isInsightsLoading.value = false
    }
}

function openEditTxn(txn: any) {
    activeTransaction.value = txn
    showEditTxnModal.value = true
}

function openDeleteTxn(txn: any) {
    activeTransaction.value = txn
    showDeleteTxnModal.value = true
}

async function fetchPerformanceTimeline() {
    isTimelineLoading.value = true
    try {
        const isSchemeCode = /^\d+$/.test(holdingId) || route.query.type === 'aggregate'
        const res = await financeApi.getPerformanceTimeline(
            'all',
            '1d',
            undefined,
            isSchemeCode ? holdingId : undefined,
            isSchemeCode ? undefined : holdingId
        )

        timelineData.value = res.data?.timeline || []
        benchmarkData.value = res.data?.benchmark || []
        benchmarksData.value = res.data?.benchmarks || []

        if (res.data?.category_benchmark_symbol) {
            selectedBenchmarkSymbols.value = [res.data.category_benchmark_symbol]
        }
    } catch (e) {
        console.error("Failed to fetch timeline", e)
    } finally {
        isTimelineLoading.value = false
    }
}

const formattedSummary = computed(() => {
    if (!fundInsights.value?.summary) return ''
    return marked.parse(fundInsights.value.summary)
})

const getInsightColor = (type: string) => {
    const t = (type || '').toLowerCase()
    switch (t) {
        case 'success': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
        case 'danger':
        case 'error': return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        default: return 'bg-wf-primary-light border-indigo-200 dark:border-indigo-900/50 text-wf-primary'
    }
}

onMounted(() => {
    fetchHoldingDetails()
    fetchPerformanceTimeline()
    fetchFundInsights()
})

function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

const filteredUsers = computed(() => {
    if (!searchQuery.value) return familyMembers.value
    const q = searchQuery.value.toLowerCase()
    return familyMembers.value.filter(u =>
        u.full_name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    )
})

function isImageUrl(url: string) {
    return url && (url.startsWith('http') || url.startsWith('/'))
}
</script>

<template>
    <MainLayout>
        <div class="space-y-4 pb-8">
            <!-- Loading State -->
            <div v-if="isLoading && !holding" class="flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <div class="w-9 h-9 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
                <span class="text-xs font-semibold text-wf-text-muted">Loading holding architecture...</span>
            </div>

            <template v-else-if="holding">
                <!-- Header Card -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                @click="router.back()"
                                class="h-8 w-8 rounded-wf-md border border-wf-border bg-wf-surface-variant hover:bg-wf-surface-variant/80 flex items-center justify-center text-wf-text-muted hover:text-wf-text-primary transition-colors flex-shrink-0"
                                title="Go Back"
                            >
                                <ChevronLeft :size="18" />
                            </button>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2.5 flex-wrap">
                                    <h1 class="text-base sm:text-lg font-bold text-wf-text-primary truncate">
                                        {{ holding.scheme_name }}
                                    </h1>
                                    <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-wf-pill bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                        {{ holding.category || 'Mutual Fund' }}
                                    </span>
                                </div>
                                <div class="flex items-center gap-3.5 mt-1 flex-wrap text-xs text-wf-text-muted">
                                    <div class="flex items-center gap-1 font-mono text-xs">
                                        <Fingerprint :size="13" class="opacity-70 text-wf-primary" />
                                        <span>{{ holding.scheme_code }}</span>
                                    </div>
                                    <div v-if="holding.isin_growth" class="flex items-center gap-1 font-mono text-xs">
                                        <Globe :size="13" class="opacity-70" />
                                        <span>{{ holding.isin_growth }}</span>
                                    </div>
                                    <div v-if="holding.fund_house" class="flex items-center gap-1 font-medium">
                                        <Briefcase :size="13" class="opacity-70" />
                                        <span>{{ holding.fund_house }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                            <WfButton
                                variant="outline"
                                size="sm"
                                @click="showDeepDiveModal = true"
                                class="!border-rose-500/20 !bg-rose-500/10 !text-rose-600 dark:!text-rose-400 hover:!bg-rose-500/20 font-semibold"
                            >
                                <Trash2 :size="13" />
                                <span>Manage Records</span>
                            </WfButton>
                            <WfButton
                                variant="outline"
                                size="sm"
                                @click="showRedeemModal = true"
                                class="font-semibold"
                            >
                                Redeem
                            </WfButton>
                            <WfButton
                                variant="primary"
                                size="sm"
                                @click="showInvestModal = true"
                                class="shadow-2xs font-bold shrink-0"
                            >
                                <span>Invest More</span>
                            </WfButton>
                        </div>
                    </div>
                </WfCard>

                <!-- KPI Metric Strip (4 Cards) -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <!-- Invested Value -->
                    <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs">
                        <div class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted mb-1.5">
                            Invested Value
                        </div>
                        <div class="text-base sm:text-xl font-bold font-mono text-wf-text-primary">
                            {{ formatAmount(holding.invested_value) }}
                        </div>
                    </WfCard>

                    <!-- Current Value -->
                    <WfCard variant="flat" padding="md" radius="lg" class="border border-indigo-200 dark:border-indigo-900/50 bg-wf-primary-light/30 shadow-2xs">
                        <div class="text-[10px] font-bold uppercase tracking-wider text-wf-primary mb-1.5">
                            Current Value
                        </div>
                        <div class="text-base sm:text-xl font-bold font-mono text-wf-primary">
                            {{ formatAmount(holding.current_value) }}
                        </div>
                    </WfCard>

                    <!-- Absolute Returns -->
                    <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs">
                        <div class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted mb-1.5">
                            Absolute Returns
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span
                                class="text-base sm:text-xl font-bold font-mono"
                                :class="holding.profit_loss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                            >
                                {{ holding.profit_loss >= 0 ? '+' : '' }}{{ formatAmount(holding.profit_loss) }}
                            </span>
                            <span
                                class="px-1.5 py-0.5 text-[10px] font-bold rounded-wf-xs font-mono"
                                :class="holding.profit_loss >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
                            >
                                {{ ((holding.profit_loss / (holding.invested_value || 1)) * 100).toFixed(2) }}%
                            </span>
                        </div>
                    </WfCard>

                    <!-- Personal XIRR -->
                    <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs">
                        <div class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted mb-1.5">
                            Personal XIRR
                        </div>
                        <div class="text-base sm:text-xl font-bold font-mono" :class="holding.xirr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                            {{ holding.xirr ? holding.xirr.toFixed(2) + '%' : 'N/A' }}
                        </div>
                    </WfCard>
                </div>

                <!-- Main Content Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                    <!-- Left: Performance Chart & Activity History (8 cols) -->
                    <div class="lg:col-span-8 space-y-3.5">
                        <!-- Portfolio Growth Chart -->
                        <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs">
                            <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
                                <div class="flex items-center gap-2">
                                    <TrendingUp :size="16" class="text-wf-primary" />
                                    <span class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary">Portfolio Growth Timeline</span>
                                    <span v-if="holding.nav_history?.length" class="text-xs text-wf-text-muted">
                                        (from {{ formatDate(holding.nav_history[0].date) }})
                                    </span>
                                </div>

                                <!-- Benchmarks Dropdown Menu -->
                                <div class="relative">
                                    <button
                                        type="button"
                                        @click="showBenchmarkDropdown = !showBenchmarkDropdown"
                                        class="h-7 px-2.5 text-xs font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 hover:bg-wf-surface-variant text-wf-text-secondary flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <span>BENCHMARKS ({{ selectedBenchmarkSymbols.length }})</span>
                                    </button>
                                    <div
                                        v-if="showBenchmarkDropdown"
                                        class="absolute right-0 top-full mt-1.5 z-50 p-2.5 rounded-wf-lg border border-wf-border bg-wf-surface shadow-wf-modal min-w-[220px] space-y-1"
                                    >
                                        <div class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted px-2 py-1">Benchmark Indices</div>
                                        <div
                                            v-for="bm in benchmarksData"
                                            :key="bm.symbol"
                                            class="flex items-center justify-between p-2 rounded-wf-md hover:bg-wf-surface-variant cursor-pointer text-xs transition-colors"
                                            @click="selectedBenchmarkSymbols.includes(bm.symbol) ? selectedBenchmarkSymbols = selectedBenchmarkSymbols.filter(s => s !== bm.symbol) : selectedBenchmarkSymbols.push(bm.symbol)"
                                        >
                                            <div class="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    :checked="selectedBenchmarkSymbols.includes(bm.symbol)"
                                                    class="rounded border-wf-border text-wf-primary focus:ring-0"
                                                />
                                                <span class="font-medium text-wf-text-primary text-xs">{{ bm.label }}</span>
                                            </div>
                                            <div class="w-2.5 h-2.5 rounded-full" :style="{ background: bm.styling?.color || 'var(--wf-color-text-muted, #94a3b8)' }"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Chart Canvas -->
                            <div class="h-[340px] sm:h-[380px] w-full">
                                <div v-if="isTimelineLoading" class="flex flex-col items-center justify-center h-full gap-2">
                                    <div class="w-8 h-8 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
                                    <span class="text-xs font-medium text-wf-text-muted">Calculating Portfolio History...</span>
                                </div>
                                <template v-else>
                                    <FundPerformanceChart
                                        v-if="chartData.length"
                                        :data="chartData"
                                        :markers="chartMarkers"
                                        :benchmarks="filteredBenchmarksData"
                                        @toggle-benchmark="(symbol) => {
                                            if (selectedBenchmarkSymbols.includes(symbol)) {
                                                selectedBenchmarkSymbols = selectedBenchmarkSymbols.filter(s => s !== symbol)
                                            } else {
                                                selectedBenchmarkSymbols.push(symbol)
                                            }
                                        }"
                                    />
                                    <div v-else class="flex items-center justify-center h-full text-xs font-medium text-wf-text-muted">
                                        No historical records available for simulation
                                    </div>
                                </template>
                            </div>
                        </WfCard>

                        <!-- Activity History Table -->
                        <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <History :size="16" class="text-wf-primary" />
                                    <span class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary">Activity History</span>
                                </div>
                                <span class="px-2 py-0.5 text-xs font-bold rounded-wf-pill bg-wf-surface-variant text-wf-text-secondary border border-wf-border">
                                    {{ transactions.length }} Records
                                </span>
                            </div>

                            <div class="overflow-x-auto rounded-wf-md border border-wf-border">
                                <table class="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr class="bg-wf-surface-variant/40 border-b border-wf-border text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">
                                            <th class="py-2.5 px-3">Date</th>
                                            <th class="py-2.5 px-3">Type</th>
                                            <th class="py-2.5 px-3 text-right">Units</th>
                                            <th class="py-2.5 px-3 text-right">NAV</th>
                                            <th class="py-2.5 px-3 text-right">Amount</th>
                                            <th class="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-wf-border-subtle">
                                        <tr v-for="t in transactions" :key="t.id" class="hover:bg-wf-surface-variant/30 transition-colors">
                                            <td class="py-2.5 px-3 font-medium text-wf-text-primary">
                                                {{ formatDate(t.date) }}
                                            </td>
                                            <td class="py-2.5 px-3">
                                                <span
                                                    class="px-2 py-0.5 text-[10px] font-bold rounded-wf-xs font-mono"
                                                    :class="t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
                                                >
                                                    {{ t.type }}
                                                </span>
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-mono text-wf-text-secondary">
                                                {{ Number(t.units).toFixed(3) }}
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-mono text-wf-text-secondary">
                                                {{ formatAmount(t.nav) }}
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-mono font-bold text-wf-text-primary">
                                                {{ formatAmount(t.amount) }}
                                            </td>
                                            <td class="py-2.5 px-3 text-right">
                                                <div class="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        @click="openEditTxn(t)"
                                                        class="h-7 w-7 rounded-wf-xs hover:bg-wf-surface-variant flex items-center justify-center text-wf-primary transition-colors cursor-pointer"
                                                        title="Edit Transaction"
                                                    >
                                                        <Edit :size="13" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        @click="openDeleteTxn(t)"
                                                        class="h-7 w-7 rounded-wf-xs hover:bg-rose-500/10 flex items-center justify-center text-rose-500 transition-colors cursor-pointer"
                                                        title="Delete Transaction"
                                                    >
                                                        <Trash2 :size="13" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="!transactions.length">
                                            <td colspan="6" class="py-8 text-center text-xs font-medium text-wf-text-muted">
                                                No transactions recorded for this holding
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </WfCard>
                    </div>

                    <!-- Right: Goal, Ownership, Key Metrics, Insights (4 cols) -->
                    <div class="lg:col-span-4 space-y-3.5">
                        <!-- Linked Goal Card -->
                        <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary flex items-center gap-1.5">
                                    <Target :size="14" class="text-wf-primary" />
                                    <span>Linked Goal</span>
                                </span>
                                <button
                                    type="button"
                                    @click="showGoalModal = true"
                                    class="h-7 w-7 rounded-wf-xs hover:bg-wf-surface-variant flex items-center justify-center text-wf-primary transition-colors cursor-pointer"
                                    title="Edit Goal Link"
                                >
                                    <Edit2 :size="13" />
                                </button>
                            </div>

                            <div v-if="holding.goal" class="p-3 rounded-wf-md border border-wf-border-subtle bg-wf-surface-variant/30 space-y-2.5">
                                <div class="flex items-center gap-2.5">
                                    <div
                                        class="w-8 h-8 rounded-wf-sm flex items-center justify-center text-sm font-bold flex-shrink-0"
                                        :style="{ background: (holding.goal.color || '#3b82f6') + '20', color: holding.goal.color || '#3b82f6' }"
                                    >
                                        {{ holding.goal.icon || '🎯' }}
                                    </div>
                                    <div class="min-w-0">
                                        <div class="text-xs font-bold text-wf-text-primary truncate">{{ holding.goal.name }}</div>
                                        <div class="text-[11px] font-mono text-wf-text-muted">Target: {{ formatAmount(holding.goal.target_amount) }}</div>
                                    </div>
                                </div>
                                <div class="space-y-1">
                                    <div class="w-full bg-wf-surface-variant rounded-full h-1.5 overflow-hidden">
                                        <div
                                            class="bg-wf-primary h-full rounded-full transition-all"
                                            :style="{ width: Math.min(100, Math.max(0, (holding.current_value / (holding.goal.target_amount || 1)) * 100)) + '%' }"
                                        ></div>
                                    </div>
                                    <div class="flex justify-between text-[11px] font-semibold text-wf-primary">
                                        <span>Contribution</span>
                                        <span class="font-mono">{{ ((holding.current_value / (holding.goal.target_amount || 1)) * 100).toFixed(1) }}%</span>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="p-4 text-center rounded-wf-md border border-dashed border-wf-border space-y-2">
                                <AlertCircle :size="20" class="text-wf-text-muted opacity-40 mx-auto" />
                                <div class="text-xs text-wf-text-muted">Not linked to any goal. Link to monitor target allocation.</div>
                                <WfButton
                                    variant="primary"
                                    size="sm"
                                    @click="showGoalModal = true"
                                    class="shadow-2xs font-semibold"
                                >
                                    Connect to Goal
                                </WfButton>
                            </div>
                        </WfCard>

                        <!-- Ownership Card -->
                        <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary flex items-center gap-1.5">
                                    <Shield :size="14" class="text-wf-primary" />
                                    <span>Ownership & Account</span>
                                </span>
                                <button
                                    type="button"
                                    @click="showUserModal = true"
                                    class="h-7 w-7 rounded-wf-xs hover:bg-wf-surface-variant flex items-center justify-center text-wf-primary transition-colors cursor-pointer"
                                    title="Change Owner"
                                >
                                    <Edit2 :size="13" />
                                </button>
                            </div>

                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-wf-pill bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                                    <img v-if="isImageUrl(holding.user_avatar)" :src="holding.user_avatar" class="w-full h-full object-cover" />
                                    <span v-else>{{ holding.user_name?.charAt(0) || 'U' }}</span>
                                </div>
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-wf-text-primary truncate">
                                        {{ holding.user_name || 'Unassigned Folio' }}
                                    </div>
                                    <div class="text-[11px] text-wf-text-muted">Assigned Member</div>
                                </div>
                            </div>

                            <div class="pt-2 border-t border-wf-border-subtle space-y-2 text-xs">
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-wf-text-muted">Folio Number</span>
                                    <span class="font-mono font-bold text-wf-text-primary">{{ holding.folio_number || 'N/A' }}</span>
                                </div>
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-wf-text-muted">Last Updated</span>
                                    <span class="text-wf-text-primary font-medium">{{ formatDate(holding.last_updated_at) }}</span>
                                </div>
                            </div>
                        </WfCard>

                        <!-- Key Metrics Card -->
                        <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs space-y-3">
                            <span class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary flex items-center gap-1.5">
                                <AlertCircle :size="14" class="text-wf-primary" />
                                <span>Holding Parameters</span>
                            </span>
                            <div class="space-y-2 text-xs">
                                <div class="flex justify-between items-center">
                                    <span class="text-wf-text-muted">Avg Purchase NAV</span>
                                    <span class="font-mono font-bold text-wf-text-primary">{{ formatAmount(holding.average_price) }}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-wf-text-muted">Holding Units</span>
                                    <span class="font-mono font-bold text-wf-text-primary">{{ Number(holding.units || 0).toFixed(3) }}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-wf-text-muted">Latest NAV</span>
                                    <span class="font-mono font-bold text-wf-primary">{{ formatAmount(holding.last_nav) }}</span>
                                </div>
                            </div>
                        </WfCard>

                        <!-- AI Fund Insights Card -->
                        <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border bg-wf-surface shadow-2xs space-y-3">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary flex items-center gap-1.5">
                                    <TrendingUp :size="14" class="text-wf-primary" />
                                    <span>Fund Analysis</span>
                                </span>
                                <button
                                    type="button"
                                    @click="fetchFundInsights(true)"
                                    :disabled="isInsightsLoading"
                                    class="h-7 w-7 rounded-wf-xs hover:bg-wf-surface-variant flex items-center justify-center text-wf-primary disabled:opacity-50 transition-colors cursor-pointer"
                                    title="Recalculate Analysis"
                                >
                                    <RefreshCw :size="13" :class="{ 'animate-spin': isInsightsLoading }" />
                                </button>
                            </div>

                            <div v-if="isInsightsLoading" class="py-8 flex flex-col items-center justify-center gap-2">
                                <div class="w-6 h-6 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
                                <span class="text-xs font-medium text-wf-text-muted">Computing AI Intelligence...</span>
                            </div>

                            <div v-else-if="insightsError && !fundInsights" class="py-6 text-center space-y-2">
                                <ZapOff :size="20" class="text-amber-500 mx-auto" />
                                <div class="text-xs font-bold text-wf-text-primary">Analysis Unavailable</div>
                                <div class="text-[11px] text-wf-text-muted">{{ insightsError }}</div>
                                <WfButton
                                    variant="primary"
                                    size="sm"
                                    @click="fetchFundInsights(true)"
                                    class="shadow-2xs font-semibold mt-1"
                                >
                                    Retry Analysis
                                </WfButton>
                            </div>

                            <template v-else-if="fundInsights">
                                <!-- Highlights -->
                                <div class="space-y-2">
                                    <div
                                        v-for="insight in fundInsights.highlights"
                                        :key="insight.id"
                                        class="p-2.5 rounded-wf-md border text-xs"
                                        :class="getInsightColor(insight.type)"
                                    >
                                        <div class="flex items-start gap-2">
                                            <span class="text-sm flex-shrink-0">{{ insight.icon }}</span>
                                            <div>
                                                <div class="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-wf-text-primary">
                                                    {{ insight.title }}
                                                </div>
                                                <div class="text-[11px] leading-relaxed text-wf-text-secondary">
                                                    {{ insight.content }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Summary Markdown -->
                                <div class="text-xs leading-relaxed text-wf-text-secondary mf-insights-markdown" v-html="formattedSummary"></div>

                                <!-- Tactical Suggestions -->
                                <div v-if="fundInsights.suggestions?.length" class="pt-2 border-t border-wf-border-subtle space-y-2">
                                    <div class="text-[10px] font-bold uppercase tracking-wider text-wf-primary">Tactical Suggestions</div>
                                    <div v-for="suggestion in fundInsights.suggestions" :key="suggestion.id" class="flex items-start gap-2 text-xs">
                                        <Zap :size="13" class="text-wf-primary mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div class="font-bold text-wf-text-primary text-[11px]">{{ suggestion.title }}</div>
                                            <div class="text-[11px] text-wf-text-muted">{{ suggestion.content }}</div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </WfCard>
                    </div>
                </div>
            </template>
        </div>

        <!-- Modals -->
        <LinkGoalModal v-model="showGoalModal" :holding="holding" @success="fetchHoldingDetails" />

        <!-- User Selection Dialog using WfModal -->
        <WfModal
            v-model="showUserModal"
            title="Assign Ownership"
            description="Designate folio ownership to a family member"
            maxWidth="sm"
        >
            <div class="space-y-3">
                <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search :size="15" class="text-wf-text-muted shrink-0" />
                    </div>
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Search members..."
                        class="w-full h-9 pl-9 pr-3 text-xs rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary transition-all"
                    />
                </div>
                <div class="max-h-60 overflow-y-auto space-y-1 divide-y divide-wf-border/40 pr-1">
                    <button
                        v-for="user in filteredUsers"
                        :key="user.id"
                        type="button"
                        @click="updateOwner(user.id)"
                        class="w-full p-2.5 rounded-wf-md hover:bg-wf-surface-variant flex items-center justify-between text-left transition-colors"
                    >
                        <div class="flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-full bg-wf-primary/10 text-wf-primary flex items-center justify-center text-xs font-bold overflow-hidden">
                                <img v-if="isImageUrl(user.avatar)" :src="user.avatar" class="w-full h-full object-cover" />
                                <span v-else>{{ user.avatar || user.full_name[0] }}</span>
                            </div>
                            <span class="text-xs font-semibold text-wf-text-primary">{{ user.full_name }}</span>
                        </div>
                        <Check v-if="holding?.user_id === user.id" :size="15" class="text-wf-primary flex-shrink-0" />
                    </button>
                </div>
            </div>
        </WfModal>

        <!-- Management Modals -->
        <DeleteHoldingDeepDiveModal
            v-model="showDeepDiveModal"
            :holding="holding"
            :loading="isManagementLoading"
            @delete-holding="deleteHolding"
            @delete-transactions="handleBulkDelete"
        />

        <EditTransactionModal
            v-model="showEditTxnModal"
            :transaction="activeTransaction"
            :loading="isManagementLoading"
            @save="handleEditTransaction"
        />

        <DeleteTransactionModal
            v-model="showDeleteTxnModal"
            :transaction="activeTransaction"
            :loading="isManagementLoading"
            @confirm="handleSingleDelete"
        />

        <InvestModal v-model="showInvestModal" :fund="holding" @success="fetchHoldingDetails" />
        <RedeemModal v-model="showRedeemModal" :holding="holding" @success="fetchHoldingDetails" />
    </MainLayout>
</template>

<style scoped>
.mf-insights-markdown :deep(h3) {
    font-size: 0.75rem;
    font-weight: 800;
    margin-top: 0.75rem;
    margin-bottom: 0.25rem;
    color: var(--wf-color-text-primary, #0f172a);
    text-transform: uppercase;
}

.mf-insights-markdown :deep(strong) {
    color: var(--wf-color-text-primary, #0f172a);
    font-weight: 700;
}

.mf-insights-markdown :deep(p) {
    margin-bottom: 0.5rem;
}

.mf-insights-markdown :deep(ul) {
    padding-left: 1rem;
    margin-bottom: 0.5rem;
}

.mf-insights-markdown :deep(li) {
    margin-bottom: 2px;
}
</style>
