<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
    Calendar, TrendingUp, Hash, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-vue-next'

import { financeApi } from '@/api/client'
import BaseChart from '@/components/BaseChart.vue'
import { useCurrency } from '@/composables/useCurrency'
import { useAuthStore } from '@/stores/auth'
import { localDateString } from '@/utils/time'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

const { formatAmount } = useCurrency()
const authStore = useAuthStore()

const props = defineProps<{
    isOpen: boolean
    category: string
    month: number
    year: number
    budget?: any
}>()

const emit = defineEmits(['update:isOpen', 'close'])

// State
const loading = ref(false)
const transactions = ref<any[]>([])
const totalTransactions = ref(0)
const dailySpending = ref<{ day: number, amount: number }[]>([])
const merchantBreakdown = ref<any[]>([])
const serverOptions = ref({
    page: 1,
    itemsPerPage: 5,
    sortBy: 'date',
    sortOrder: 'desc'
})

const totalPages = computed(() => {
    return Math.ceil(totalTransactions.value / serverOptions.value.itemsPerPage) || 1
})

// Fetch Data
const fetchData = async () => {
    if (!props.category) return
    loading.value = true
    try {
        const startDate = localDateString(props.year, props.month - 1, 1) + 'T00:00:00'
        const endDate = localDateString(props.year, props.month, 0) + 'T23:59:59'

        // Fetch Transactions
        const res = await financeApi.getTransactions(
            undefined,
            serverOptions.value.page,
            serverOptions.value.itemsPerPage,
            startDate,
            endDate,
            undefined,
            props.category,
            serverOptions.value.sortBy,
            serverOptions.value.sortOrder,
            authStore.selectedMemberId || undefined
        )
        transactions.value = res.data.data || []
        totalTransactions.value = res.data.total || 0

        // Fetch Trends - Grouped by day
        const trendRes = await financeApi.getTransactions(
            undefined,
            1,
            1000,
            startDate,
            endDate,
            undefined,
            props.category,
            'date',
            'desc',
            authStore.selectedMemberId || undefined
        )

        processTrendData(trendRes.data.data || [])

        // Fetch Merchant Breakdown
        const merchantRes = await financeApi.getMerchantBreakdown(
            props.category,
            startDate,
            endDate,
            authStore.selectedMemberId || undefined
        )
        merchantBreakdown.value = merchantRes.data || []

    } catch (err) {
        console.error('Failed to fetch category details:', err)
    } finally {
        loading.value = false
    }
}

const processTrendData = (items: any[]) => {
    const daysInMonth = new Date(props.year, props.month, 0).getDate()
    const dailyMap = new Map()

    items.forEach(t => {
        const d = new Date(t.date).getDate()
        dailyMap.set(d, (dailyMap.get(d) || 0) + Math.abs(t.amount))
    })

    const data = []
    const now = new Date()
    const isCurrentMonth = now.getMonth() + 1 === props.month && now.getFullYear() === props.year
    const limitDay = isCurrentMonth ? now.getDate() : daysInMonth

    for (let i = 1; i <= limitDay; i++) {
        data.push({
            day: i,
            amount: dailyMap.get(i) || 0
        })
    }
    dailySpending.value = data
}

// Chart Configurations
const barChartData = computed(() => ({
    labels: dailySpending.value.map(d => d.day),
    datasets: [{
        label: 'Spending',
        data: dailySpending.value.map(d => d.amount),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 4
    }]
}))

const doughnutChartData = computed(() => {
    const sorted = [...merchantBreakdown.value].sort((a, b) => b.amount - a.amount)
    const top = sorted.slice(0, 5)
    const others = sorted.slice(5).reduce((acc, curr) => acc + curr.amount, 0)

    if (others > 0) {
        top.push({ merchant: 'Others', amount: others })
    }

    return {
        labels: top.map(v => v.merchant),
        datasets: [{
            data: top.map(v => v.amount),
            backgroundColor: [
                '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'
            ],
            borderWidth: 0
        }]
    }
})

const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: (val: any) => '₹' + val } }
    }
}

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'right' as const,
            labels: { boxWidth: 10, padding: 12, font: { size: 11 } }
        }
    },
    cutout: '70%'
}

// Watchers
watch(() => props.isOpen, (val) => {
    if (val) fetchData()
})

watch(serverOptions, () => {
    fetchData()
}, { deep: true })

const close = () => {
    emit('update:isOpen', false)
    emit('close')
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function prevPage() {
    if (serverOptions.value.page > 1) {
        serverOptions.value.page--
    }
}

function nextPage() {
    if (serverOptions.value.page < totalPages.value) {
        serverOptions.value.page++
    }
}
</script>

<template>
    <WfModal
        :model-value="isOpen"
        @update:model-value="close"
        maxWidth="xl"
    >
        <!-- MODAL HEADER -->
        <template #header>
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-wf-md bg-wf-primary-light flex items-center justify-center text-xl border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
                        <span>{{ budget?.icon || '🏷️' }}</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm font-bold text-wf-text-primary leading-none">
                                {{ category }} Breakdown
                            </h3>
                            <span class="px-2 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-surface-variant text-wf-text-secondary">
                                {{ new Date(year, month - 1).toLocaleString('default', { month: 'short', year: 'numeric' }) }}
                            </span>
                        </div>
                        <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
                            Deep dive into daily velocity, merchant distribution, and transaction history
                        </p>
                    </div>
                </div>

                <!-- Budget vs Spent Pills -->
                <div v-if="budget" class="flex items-center gap-3 bg-wf-surface-variant/70 border border-wf-border rounded-wf-md px-3 py-1.5 shadow-2xs mr-2">
                    <div class="text-right leading-none">
                        <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Limit</span>
                        <span class="text-xs font-bold text-wf-text-primary">{{ formatAmount(budget.amount_limit) }}</span>
                    </div>
                    <div class="w-px h-6 bg-wf-border"></div>
                    <div class="text-right leading-none">
                        <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Spent</span>
                        <span
                            class="text-xs font-bold"
                            :class="budget.spent > budget.amount_limit ? 'text-rose-600' : 'text-wf-primary'"
                        >
                            {{ formatAmount(budget.spent) }}
                        </span>
                    </div>
                </div>
            </div>
        </template>

        <!-- MODAL BODY -->
        <div class="space-y-5 max-h-[70vh] overflow-y-auto -mx-6 -my-6 p-6">
            <!-- Charts Section (2 Columns) -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                <!-- Daily Spending Trend -->
                <div class="md:col-span-7 p-4 rounded-wf-lg bg-wf-surface border border-wf-border shadow-2xs space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-wf-xs bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center">
                                <TrendingUp class="w-3.5 h-3.5" />
                            </div>
                            <h4 class="text-xs font-bold text-wf-text-primary">Daily Spending Trend</h4>
                        </div>
                        <span class="text-[10px] text-wf-text-muted">Through month</span>
                    </div>
                    <div class="h-44">
                        <BaseChart type="bar" :data="barChartData" :options="barOptions" :height="170" />
                    </div>
                </div>

                <!-- Merchant Breakdown -->
                <div class="md:col-span-5 p-4 rounded-wf-lg bg-wf-surface border border-wf-border shadow-2xs space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-wf-xs bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                                <Hash class="w-3.5 h-3.5" />
                            </div>
                            <h4 class="text-xs font-bold text-wf-text-primary">Top Merchants</h4>
                        </div>
                        <span class="text-[10px] text-wf-text-muted">By total volume</span>
                    </div>
                    <div class="h-44 flex items-center justify-center">
                        <BaseChart
                            v-if="merchantBreakdown.length > 0"
                            type="doughnut"
                            :data="doughnutChartData"
                            :options="doughnutOptions"
                            :height="170"
                        />
                        <span v-else class="text-xs text-wf-text-muted">No merchant records</span>
                    </div>
                </div>
            </div>

            <!-- Transaction History Table -->
            <div class="space-y-2.5">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-wf-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <Calendar class="w-3.5 h-3.5" />
                        </div>
                        <h4 class="text-xs font-bold text-wf-text-primary">Transaction History</h4>
                    </div>
                    <span class="text-[11px] text-wf-text-secondary font-medium">{{ totalTransactions }} records</span>
                </div>

                <!-- Unified Seamless Table Container -->
                <div class="border border-wf-border rounded-wf-md bg-wf-surface overflow-hidden shadow-2xs divide-y divide-wf-border-subtle">
                    <!-- Table Header -->
                    <div class="grid grid-cols-12 px-3.5 py-2 bg-wf-surface-variant/60 text-[10px] font-bold text-wf-text-secondary uppercase tracking-wider">
                        <div class="col-span-2">Date</div>
                        <div class="col-span-4">Recipient / Payee</div>
                        <div class="col-span-3">Description</div>
                        <div class="col-span-3 text-right">Amount</div>
                    </div>

                    <!-- Loading State -->
                    <div v-if="loading" class="py-8 text-center text-xs text-wf-text-muted flex items-center justify-center gap-2">
                        <RefreshCw class="w-4 h-4 animate-spin text-wf-primary" />
                        <span>Loading ledger transactions...</span>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="transactions.length === 0" class="py-8 text-center text-xs text-wf-text-muted">
                        No transactions found for this period.
                    </div>

                    <!-- Table Rows -->
                    <template v-else>
                        <div
                            v-for="item in transactions"
                            :key="item.id"
                            class="grid grid-cols-12 px-3.5 py-2.5 items-center hover:bg-wf-surface-variant/40 transition-colors text-xs"
                        >
                            <div class="col-span-2 text-wf-text-muted font-medium">
                                {{ formatDate(item.date) }}
                            </div>
                            <div class="col-span-4 font-bold text-wf-text-primary truncate pr-2">
                                {{ item.recipient || 'N/A' }}
                            </div>
                            <div class="col-span-3 text-wf-text-secondary truncate pr-2 text-[11px]">
                                {{ item.description || '-' }}
                            </div>
                            <div
                                class="col-span-3 text-right font-bold tabular-nums"
                                :class="item.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-wf-text-primary'"
                            >
                                {{ formatAmount(item.amount) }}
                            </div>
                        </div>
                    </template>

                    <!-- Table Pagination Footer -->
                    <div class="flex items-center justify-between px-3.5 py-2 bg-wf-surface-variant/30 text-xs">
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] text-wf-text-muted">Rows per page:</span>
                            <select
                                v-model="serverOptions.itemsPerPage"
                                class="bg-transparent border border-wf-border rounded-wf-xs px-1.5 py-0.5 text-xs font-semibold focus:outline-none cursor-pointer"
                            >
                                <option :value="5">5</option>
                                <option :value="10">10</option>
                                <option :value="20">20</option>
                            </select>
                        </div>

                        <div class="flex items-center gap-2">
                            <span class="text-[11px] text-wf-text-muted">
                                Page {{ serverOptions.page }} of {{ totalPages }}
                            </span>
                            <div class="flex items-center gap-1">
                                <button
                                    type="button"
                                    @click="prevPage"
                                    :disabled="serverOptions.page <= 1"
                                    class="p-1 rounded-wf-xs border border-wf-border hover:bg-wf-surface-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft class="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    @click="nextPage"
                                    :disabled="serverOptions.page >= totalPages"
                                    class="p-1 rounded-wf-xs border border-wf-border hover:bg-wf-surface-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight class="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- FOOTER -->
        <template #footer>
            <WfButton variant="primary" @click="close">
                Close Analysis
            </WfButton>
        </template>
    </WfModal>
</template>
