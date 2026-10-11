<template>
    <WfModal v-model="internalValue" max-width="md">
        <template #header>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-wf-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                    {{ (vendorName || 'V').slice(0, 2).toUpperCase() }}
                </div>
                <div>
                    <div class="flex items-center gap-1.5">
                        <h3 class="text-base font-bold text-wf-text-primary">{{ vendorName }}</h3>
                        <span class="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Verified
                        </span>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5 text-xs text-wf-text-muted">
                        <span>Merchant Profile</span>
                        <span>•</span>
                        <router-link
                            :to="`/merchants/${encodeURIComponent(vendorName)}`"
                            @click="internalValue = false"
                            class="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                            title="Open Merchant Profile page"
                        >
                            <span>Full Analytics</span>
                            <ExternalLink :size="11" />
                        </router-link>
                    </div>
                </div>
            </div>
        </template>

        <div class="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-12" role="status">
                <Loader2 class="w-9 h-9 mx-auto animate-spin text-wf-primary" aria-hidden="true" />
                <p class="mt-3 text-xs font-semibold text-wf-text-muted">Analyzing spending patterns...</p>
            </div>

            <!-- Content Area -->
            <div v-else-if="stats" class="space-y-4">
                <!-- Chart Hero Section -->
                <WfCard variant="flat" padding="none" radius="lg" class="p-3.5 border border-wf-border-subtle bg-wf-surface-variant/30">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-1.5 text-wf-text-primary">
                            <TrendingUp :size="14" class="text-wf-primary" />
                            <span class="text-xs font-bold uppercase tracking-wider">Spending Dynamics</span>
                        </div>
                        <span class="text-[10px] font-mono font-bold bg-wf-surface-variant text-wf-text-muted px-2 py-0.5 rounded-full border border-wf-border-subtle">
                            LAST 6 MONTHS
                        </span>
                    </div>
                    
                    <div class="h-[130px] w-full pt-1">
                        <BaseChart 
                            v-if="chartData" 
                            type="line" 
                            :data="chartData" 
                            :options="chartOptions"
                            :height="130" 
                        />
                        <div v-else class="h-full flex items-center justify-center text-xs text-wf-text-muted">
                            No recent trend data
                        </div>
                    </div>
                </WfCard>

                <!-- Key Metrics Cards -->
                <div class="grid grid-cols-3 gap-2.5">
                    <WfCard variant="flat" padding="none" radius="lg" class="p-3 text-center border border-wf-border-subtle bg-wf-surface-variant/40">
                        <div class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider mb-1">
                            Total Spent
                        </div>
                        <div class="text-xs sm:text-sm font-bold font-mono text-rose-600 dark:text-rose-400 truncate">
                            {{ formatAmount(stats.total_spent || 0) }}
                        </div>
                    </WfCard>

                    <WfCard variant="flat" padding="none" radius="lg" class="p-3 text-center border border-wf-border-subtle bg-wf-surface-variant/40">
                        <div class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider mb-1">
                            Avg Payment
                        </div>
                        <div class="text-xs sm:text-sm font-bold font-mono text-wf-text-primary truncate">
                            {{ formatAmount(stats.average_transaction || 0) }}
                        </div>
                    </WfCard>

                    <WfCard variant="flat" padding="none" radius="lg" class="p-3 text-center border border-wf-border-subtle bg-wf-surface-variant/40">
                        <div class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider mb-1">
                            Txn Count
                        </div>
                        <div class="text-xs sm:text-sm font-bold font-mono text-wf-primary truncate">
                            {{ stats.transaction_count || 0 }}
                        </div>
                    </WfCard>
                </div>

                <!-- Recent History -->
                <div>
                    <div class="flex items-center justify-between mb-2 px-1">
                        <div class="flex items-center gap-1.5 text-xs font-bold text-wf-text-primary">
                            <History :size="14" class="text-primary-500" />
                            <span>Recent History</span>
                        </div>
                        <span class="text-[10px] font-mono font-bold text-wf-text-muted uppercase">
                            {{ stats.transaction_count }} Total
                        </span>
                    </div>
                    
                    <div class="space-y-1.5">
                        <div 
                            v-for="txn in stats.recent_transactions" 
                            :key="txn.id" 
                            class="flex items-center justify-between p-2.5 rounded-wf-lg border border-wf-border-subtle bg-wf-surface hover:bg-wf-surface-variant/40 transition-colors"
                        >
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="w-8 h-8 rounded-wf-md flex items-center justify-center text-sm shrink-0" :style="{ backgroundColor: getCategoryDisplay(txn.category).color + '20' }">
                                    {{ getCategoryDisplay(txn.category).icon }}
                                </div>
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-wf-text-primary truncate">{{ txn.description }}</div>
                                    <div class="text-[10px] text-wf-text-muted">{{ formatDate(txn.date).day }}</div>
                                </div>
                            </div>
                            
                            <div class="text-right shrink-0 font-mono font-bold text-xs" :class="txn.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-wf-text-primary'">
                                {{ txn.amount > 0 ? '+' : '' }}{{ formatAmount(Math.abs(txn.amount)) }}
                            </div>
                        </div>
                    </div>

                    <!-- Paginator -->
                    <div v-if="totalPages > 1" class="mt-3 flex items-center justify-center gap-2">
                        <WfButton variant="outline" size="sm" :disabled="page <= 1" aria-label="Previous page" @click="goToPage(page - 1)">
                            <ChevronLeft :size="14" />
                        </WfButton>
                        <span class="text-xs font-mono text-wf-text-muted">{{ page }} / {{ totalPages }}</span>
                        <WfButton variant="outline" size="sm" :disabled="page >= totalPages" aria-label="Next page" @click="goToPage(page + 1)">
                            <ChevronRight :size="14" />
                        </WfButton>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-12 text-wf-text-muted">
                <Database :size="36" class="mx-auto mb-2 opacity-40" />
                <p class="text-xs font-semibold">No transaction data available for this merchant.</p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end w-full">
                <WfButton variant="outline" size="sm" @click="internalValue = false">
                    Close
                </WfButton>
            </div>
        </template>
    </WfModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useTransactionHelpers } from '@/composables/useTransactionHelpers'
import { useFinanceStore } from '@/stores/finance'
import { ExternalLink, TrendingUp, History, Database, Loader2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useExpenseGroupStore } from '@/stores/expenseGroups'
import WfModal from '@/components/ui/WfModal.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import BaseChart from '@/components/BaseChart.vue'

const props = defineProps<{
    modelValue: boolean
    vendorName: string
}>()

const emit = defineEmits(['update:modelValue'])

const financeStore = useFinanceStore()
const expenseGroupStore = useExpenseGroupStore()

const { formatAmount } = useCurrency()
const { formatDate, getCategoryDisplay } = useTransactionHelpers(
    computed(() => financeStore.accounts),
    computed(() => financeStore.categories),
    computed(() => expenseGroupStore.groups)
)

const internalValue = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const stats = ref<any>(null)
const loading = ref(false)
const page = ref(1)
const pageSize = 3

const totalPages = computed(() => {
    if (!stats.value?.transaction_count) return 0
    return Math.ceil(stats.value.transaction_count / pageSize)
})

const chartData = computed(() => {
    if (!stats.value?.chart_data?.length) return null

    const labels = stats.value.chart_data.map((p: any) => {
        try {
            const [y, m] = p.month.split('-')
            const date = new Date(parseInt(y), parseInt(m) - 1, 1)
            return date.toLocaleString('default', { month: 'short' })
        } catch {
            return p.month
        }
    })
    const data = stats.value.chart_data.map((p: any) => p.amount)

    return {
        labels,
        datasets: [{
            label: 'Spending',
            data,
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

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false }
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
        },
        y: {
            grid: { display: false },
            ticks: {
                font: { size: 9 },
                maxTicksLimit: 3
            },
            beginAtZero: true
        }
    }
}

function goToPage(p: number) {
    page.value = p
    fetchStats()
}

async function fetchStats() {
    if (!props.vendorName || !props.modelValue) return
    loading.value = true
    try {
        const skip = (page.value - 1) * pageSize
        const response = await financeApi.getVendorStats(props.vendorName, skip, pageSize)
        stats.value = {
            ...response.data,
            recent_transactions: response.data.recent_transactions.slice(0, pageSize)
        }
    } catch (error) {
        console.error('[VendorInsights] Failed to fetch stats', error)
        stats.value = null
    } finally {
        loading.value = false
    }
}


function resetPagination() {
    page.value = 1
}

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        resetPagination()
        fetchStats()
    }
})

watch(() => props.vendorName, () => {
    if (props.modelValue) {
        resetPagination()
        fetchStats()
    }
})
</script>
