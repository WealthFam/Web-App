<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import BaseChart from '@/components/BaseChart.vue'
import {
    Store,
    ArrowLeft,
    TrendingUp,
    Calendar,
    CreditCard,
    Receipt,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    Timer,
    Loader2,
    Download
} from 'lucide-vue-next'
import { financeApi } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useCurrency } from '@/composables/useCurrency'
import { format, parseISO } from 'date-fns'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { formatAmount } = useCurrency()

const merchantName = computed(() => (route.params.id as string) || '')
const transactions = ref<any[]>([])
const isLoading = ref(true)
const transactionsCount = computed(() => transactions.value.length)

const totalSpent = computed(() => {
    return transactions.value.reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0)
})

const averageTx = computed(() => {
    return transactionsCount.value > 0 ? totalSpent.value / transactionsCount.value : 0
})

const lastTransaction = computed(() => {
    if (transactions.value.length === 0) return null
    return transactions.value[0]
})

async function fetchMerchantData() {
    isLoading.value = true
    try {
        const userId = auth.selectedMemberId || undefined
        const res = await financeApi.getTransactions(
            undefined, // accountId
            1,         // page
            1000,      // limit
            undefined, // startDate
            undefined, // endDate
            merchantName.value, // search
            undefined, // category
            'date',    // sortBy
            'desc',    // sortOrder
            userId     // userId
        )
        if (res.data && res.data.data) {
            transactions.value = res.data.data
        }
    } catch (e) {
        console.error("Failed to fetch merchant data", e)
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    fetchMerchantData()
})

watch(merchantName, () => {
    fetchMerchantData()
})

function getTransactionColor(type: string) {
    return type === 'DEBIT' ? 'text-wf-error' : 'text-wf-success'
}

function getTransactionIcon(type: string) {
    return type === 'DEBIT' ? ArrowUpRight : ArrowDownRight
}

const categoryBreakdown = computed(() => {
    const cats: Record<string, number> = {}
    transactions.value.forEach(tx => {
        const cat = tx.category || 'Uncategorized'
        cats[cat] = (cats[cat] || 0) + Math.abs(Number(tx.amount))
    })
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5)
})

const spendingTrendData = computed(() => {
    if (!transactions.value.length) return null

    // Group by month
    const groups: Record<string, number> = {}
    transactions.value.forEach(tx => {
        try {
            const month = format(parseISO(tx.date), 'MMM yyyy')
            groups[month] = (groups[month] || 0) + Math.abs(Number(tx.amount))
        } catch {
            // ignore unparseable date
        }
    })

    const labels = Object.keys(groups).reverse()
    const data = labels.map(l => groups[l])

    return {
        labels,
        datasets: [{
            label: 'Spending',
            data: data,
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6
        }]
    }
})

function downloadReport() {
    if (!transactions.value.length) return
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Account ID']
    const rows = transactions.value.map(tx => [
        tx.date,
        `"${(tx.description || merchantName.value).replace(/"/g, '""')}"`,
        Math.abs(Number(tx.amount)),
        tx.type || (Number(tx.amount) < 0 ? 'DEBIT' : 'CREDIT'),
        `"${(tx.category || '').replace(/"/g, '""')}"`,
        tx.account_id
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${merchantName.value.replace(/[^a-z0-9]/gi, '_')}_transactions.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
</script>

<template>
    <MainLayout>
        <div class="max-w-[1600px] mx-auto space-y-5 px-1">
            <!-- Header -->
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <button
                        type="button"
                        @click="router.back()"
                        aria-label="Go back"
                        class="w-9 h-9 rounded-wf-md border border-wf-border bg-wf-surface text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant flex items-center justify-center transition-colors"
                    >
                        <ArrowLeft :size="18" />
                    </button>
                    <div>
                        <div class="flex items-center gap-1.5 text-[11px] font-bold text-wf-primary uppercase tracking-wider">
                            <Store :size="13" />
                            <span>Merchant Profile</span>
                        </div>
                        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary mt-0.5">
                            {{ merchantName }}
                        </h1>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <WfButton
                        variant="secondary"
                        size="sm"
                        :disabled="transactions.length === 0"
                        @click="downloadReport"
                    >
                        <Download :size="14" />
                        <span>Export CSV</span>
                    </WfButton>
                </div>
            </div>

            <!-- Stats Grid (4 cols) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <!-- 1. Total Spent -->
                <WfCard variant="elevated" padding="md" radius="lg">
                    <div class="flex items-center justify-between mb-2">
                        <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary">
                            <Wallet :size="16" />
                        </div>
                        <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">Total Spent</span>
                    </div>
                    <div class="text-xl sm:text-2xl font-bold tracking-tight font-mono tabular-nums text-wf-text-primary">
                        {{ formatAmount(totalSpent) }}
                    </div>
                    <div class="text-[11px] text-wf-text-muted mt-1 font-medium">
                        Across {{ transactionsCount }} payments
                    </div>
                </WfCard>

                <!-- 2. Avg Transaction -->
                <WfCard variant="elevated" padding="md" radius="lg">
                    <div class="flex items-center justify-between mb-2">
                        <div class="w-8 h-8 rounded-wf-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
                            <Timer :size="16" />
                        </div>
                        <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">Avg Payment</span>
                    </div>
                    <div class="text-xl sm:text-2xl font-bold tracking-tight font-mono tabular-nums text-wf-text-primary">
                        {{ formatAmount(averageTx) }}
                    </div>
                    <div class="text-[11px] text-wf-text-muted mt-1 font-medium">
                        Spending velocity
                    </div>
                </WfCard>

                <!-- 3. Latest Payment -->
                <WfCard variant="elevated" padding="md" radius="lg">
                    <div class="flex items-center justify-between mb-2">
                        <div class="w-8 h-8 rounded-wf-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-wf-success">
                            <Calendar :size="16" />
                        </div>
                        <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">Latest Payment</span>
                    </div>
                    <div class="text-base sm:text-lg font-bold tracking-tight text-wf-text-primary truncate">
                        {{ lastTransaction ? format(parseISO(lastTransaction.date), 'MMM dd, yyyy') : 'No history' }}
                    </div>
                    <div class="text-[11px] text-wf-text-muted mt-1 font-medium">
                        {{ lastTransaction ? format(parseISO(lastTransaction.date), 'h:mm a') : '—' }}
                    </div>
                </WfCard>

                <!-- 4. Primary Category -->
                <WfCard variant="elevated" padding="md" radius="lg">
                    <div class="flex items-center justify-between mb-2">
                        <div class="w-8 h-8 rounded-wf-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-wf-warning">
                            <PieChart :size="16" />
                        </div>
                        <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">Primary Category</span>
                    </div>
                    <div class="text-base sm:text-lg font-bold tracking-tight text-wf-text-primary truncate">
                        {{ categoryBreakdown.length ? categoryBreakdown[0][0] : 'Mixed' }}
                    </div>
                    <div class="text-[11px] text-wf-text-muted mt-1 font-medium">
                        {{ categoryBreakdown.length ? `${Math.round((categoryBreakdown[0][1] / (totalSpent || 1)) * 100)}% of total volume` : '—' }}
                    </div>
                </WfCard>
            </div>

            <!-- Visualization: Spending Dynamics Chart -->
            <WfCard v-if="transactions.length > 2" variant="elevated" padding="md" radius="lg">
                <div class="flex items-center justify-between mb-3 pb-2.5 border-b border-wf-border-subtle">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary">
                            <TrendingUp :size="15" />
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Spending Dynamics</h3>
                            <p class="text-[11px] text-wf-text-muted">Monthly spend distribution at {{ merchantName }}</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-wf-surface-variant text-wf-text-secondary border border-wf-border-subtle">
                        {{ spendingTrendData?.labels?.length || 0 }} MONTHS
                    </span>
                </div>
                <div class="h-[210px] w-full pt-1">
                    <BaseChart v-if="spendingTrendData" type="line" :data="spendingTrendData" :height="210" />
                </div>
            </WfCard>

            <!-- Main Content: History + Breakdown -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <!-- Transactions List (8 cols) -->
                <div class="lg:col-span-8 flex flex-col">
                    <WfCard variant="elevated" padding="none" radius="lg" class="overflow-hidden flex-1">
                        <div class="p-3.5 border-b border-wf-border-subtle flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <Receipt :size="16" class="text-wf-primary" />
                                <h3 class="text-xs font-bold uppercase tracking-wider text-wf-text-primary">Payment History</h3>
                            </div>
                            <span class="text-xs font-mono text-wf-text-muted">
                                {{ transactionsCount }} <span class="text-[11px] font-normal">records</span>
                            </span>
                        </div>

                        <!-- Loading State -->
                        <div v-if="isLoading" class="py-16 text-center">
                            <Loader2 class="w-8 h-8 mx-auto animate-spin text-wf-primary" />
                            <p class="mt-2 text-xs font-semibold text-wf-text-muted">Loading merchant history...</p>
                        </div>

                        <!-- Empty State -->
                        <div v-else-if="transactions.length === 0" class="py-16 text-center text-wf-text-muted">
                            <Receipt :size="32" class="mx-auto mb-2 opacity-40" />
                            <h4 class="text-sm font-semibold text-wf-text-primary">No Transactions Found</h4>
                            <p class="text-xs text-wf-text-muted mt-0.5">No transactions recorded for "{{ merchantName }}".</p>
                        </div>

                        <!-- Table List -->
                        <div v-else class="divide-y divide-wf-divider">
                            <div
                                v-for="tx in transactions"
                                :key="tx.id"
                                class="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-wf-surface-variant/40 transition-colors"
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <div
                                        class="w-8 h-8 rounded-wf-md flex items-center justify-center shrink-0"
                                        :class="tx.type === 'DEBIT' ? 'bg-rose-50 dark:bg-rose-950/60 text-wf-error' : 'bg-emerald-50 dark:bg-emerald-950/60 text-wf-success'"
                                    >
                                        <component :is="getTransactionIcon(tx.type)" :size="15" />
                                    </div>
                                    <div class="min-w-0">
                                        <div class="text-xs font-bold text-wf-text-primary truncate">
                                            {{ tx.description || merchantName }}
                                        </div>
                                        <div class="flex items-center flex-wrap gap-2 text-[10px] text-wf-text-muted mt-0.5 font-medium">
                                            <span class="flex items-center gap-1">
                                                <Calendar :size="11" />
                                                {{ format(parseISO(tx.date), 'MMM dd, yyyy h:mm a') }}
                                            </span>
                                            <span v-if="tx.account_id" class="flex items-center gap-1 font-mono">
                                                <CreditCard :size="11" />
                                                ...{{ tx.account_id.slice(-4) }}
                                            </span>
                                            <span
                                                v-if="tx.category"
                                                class="px-1.5 py-0.2 rounded-wf-xs bg-wf-surface-variant text-wf-text-secondary font-semibold"
                                            >
                                                {{ tx.category }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="text-right shrink-0">
                                    <div
                                        class="font-mono tabular-nums text-sm font-bold"
                                        :class="getTransactionColor(tx.type)"
                                    >
                                        {{ tx.type === 'DEBIT' ? '-' : '+' }}{{ formatAmount(Math.abs(tx.amount)) }}
                                    </div>
                                    <div class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted">
                                        {{ tx.type || (Number(tx.amount) < 0 ? 'DEBIT' : 'CREDIT') }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </WfCard>
                </div>

                <!-- Sidebar Breakdown & Insights (4 cols) -->
                <div class="lg:col-span-4 space-y-4">
                    <!-- Category Breakdown -->
                    <WfCard variant="elevated" padding="md" radius="lg">
                        <div class="flex items-center gap-2 mb-3 pb-2 border-b border-wf-border-subtle">
                            <PieChart :size="15" class="text-wf-primary" />
                            <h3 class="text-xs font-bold uppercase tracking-wider text-wf-text-primary">Spending Breakdown</h3>
                        </div>

                        <div v-if="categoryBreakdown.length === 0" class="text-xs text-wf-text-muted py-4 text-center">
                            No category data available
                        </div>

                        <div v-else class="space-y-3">
                            <div v-for="[cat, val] in categoryBreakdown" :key="cat">
                                <div class="flex items-center justify-between text-xs mb-1">
                                    <span class="font-semibold text-wf-text-primary truncate">{{ cat }}</span>
                                    <span class="font-mono font-bold text-wf-text-secondary tabular-nums">{{ formatAmount(val) }}</span>
                                </div>
                                <div class="w-full h-1.5 rounded-full bg-wf-surface-variant overflow-hidden">
                                    <div
                                        class="h-full rounded-full bg-wf-primary transition-all duration-500"
                                        :style="{ width: `${Math.min(100, Math.round((val / (totalSpent || 1)) * 100))}%` }"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </WfCard>

                    <!-- Smart Merchant Insight Card -->
                    <WfCard variant="elevated" padding="md" radius="lg" class="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/20">
                        <div class="flex items-center gap-2 mb-2 text-wf-primary">
                            <TrendingUp :size="16" />
                            <h3 class="text-xs font-bold uppercase tracking-wider">Merchant Insight</h3>
                        </div>
                        <p class="text-xs leading-relaxed text-wf-text-secondary">
                            You spend most of your funds at <span class="font-bold text-wf-text-primary">{{ merchantName }}</span> on
                            <span class="font-bold text-wf-text-primary">{{ categoryBreakdown.length ? categoryBreakdown[0][0] : 'various items' }}</span>.
                            Tracking these patterns helps identify potential subscription savings and category budgeting opportunities.
                        </p>
                    </WfCard>
                </div>
            </div>
        </div>
    </MainLayout>
</template>
