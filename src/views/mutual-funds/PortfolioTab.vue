<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
    TrendingUp, TrendingDown, Clock, Search, Target,
    Eye as EyeIconMain, ChevronDown, ChevronRight, ChevronLeft,
    Trash2, Activity, RefreshCcw, Settings, Calendar, RefreshCw,
    Zap, ArrowUpDown, PieChart, X
} from 'lucide-vue-next'

import WfCard from '@/components/ui/WfCard.vue'
import { useMutualFundStore } from '@/stores/finance/mutualFunds'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'

import Sparkline from '@/components/Sparkline.vue'
import FundPerformanceChart from './components/FundPerformanceChart.vue'
import PortfolioDonutChart from './components/PortfolioDonutChart.vue'
import LinkGoalModal from './modals/LinkGoalModal.vue'
import DeleteHoldingDeepDiveModal from './modals/DeleteHoldingDeepDiveModal.vue'

const mfStore = useMutualFundStore()
const authStore = useAuthStore()
const { formatAmount } = useCurrency()
const notify = useNotificationStore()

// Props & State
const props = defineProps<{
    active?: boolean
}>()

const portfolio = ref<any[]>([])
const analytics = ref<any>(null)
const timelineData = ref<any[]>([])
const benchmarkData = ref<any[]>([])
const benchmarksData = ref<any[]>([])
const selectedBenchmarkSymbols = ref<string[]>([])
const isLoading = ref(true)
const isTimelineLoading = ref(true)
const isTimelineRefreshing = ref(false)
const search = ref('')
const selectedCategory = ref('ALL')
const intelligenceTab = ref<'allocation' | 'movers'>('allocation')
const allocationType = ref<'category' | 'asset'>('category')
const expanded = ref<string[]>([])
const selectedHolding = ref<any>(null)
const showLinkGoalModal = ref(false)
const showDeleteModal = ref(false)
const isManagementLoading = ref(false)
const marketIndices = ref<any[]>([])
const marketPulsePeriod = ref('1d')
const isMarketPulseLoading = ref(false)
const isRebuilding = ref(false)
const showSettingsMenu = ref(false)
const showBenchmarkMenu = ref(false)

// Pagination & Sorting State
const currentPage = ref(1)
const pageSize = ref(10)
const sortKey = ref<'current_value' | 'invested_value' | 'profit_loss' | 'scheme_name'>('current_value')
const sortOrder = ref<'asc' | 'desc'>('desc')

function setSort(key: 'current_value' | 'invested_value' | 'profit_loss' | 'scheme_name') {
    if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortKey.value = key
        sortOrder.value = 'desc'
    }
}

// Computed
const portfolioStats = computed(() => {
    if (!portfolio.value.length) return { invested: 0, current: 0, pl: 0, plPercent: 0 }
    const invested = portfolio.value.reduce((s, i) => s + (Number(i.invested_value) || 0), 0)
    const current = portfolio.value.reduce((s, i) => s + (Number(i.current_value) || 0), 0)
    const pl = current - invested
    return { invested, current, pl, plPercent: invested ? (pl / invested) * 100 : 0 }
})

const cvSparkline = computed(() => timelineData.value.map(d => d.value))
const icSparkline = computed(() => timelineData.value.map(d => d.invested))
const ngSparkline = computed(() => timelineData.value.map(d => d.value - d.invested))

const latestInsights = computed(() => {
    if (timelineData.value.length < 2) return { dayChange: 0, dayChangePercent: 0 }
    const last = timelineData.value[timelineData.value.length - 1]
    const prev = timelineData.value[timelineData.value.length - 2]
    const dayChange = (last.value - prev.value)
    const dayChangePercent = prev.value ? (dayChange / prev.value) * 100 : 0
    return { dayChange, dayChangePercent }
})

const sortedPortfolio = computed(() => {
    if (!Array.isArray(portfolio.value)) return []
    const groups: Record<string, any[]> = {}
    portfolio.value.forEach(item => {
        const code = item.scheme_code
        if (!groups[code]) groups[code] = []
        groups[code].push(item)
    })

    const result: any[] = []
    Object.keys(groups).forEach(code => {
        const items = groups[code]
        if (items.length > 1) {
            const totalInv = items.reduce((s, i) => s + Number(i.invested_value), 0)
            const totalCur = items.reduce((s, i) => s + Number(i.current_value), 0)
            result.push({
                id: `group-${code}`,
                scheme_code: code,
                scheme_name: items[0].scheme_name,
                category: items[0].category,
                sparkline: items[0].sparkline,
                last_nav: items[0].last_nav,
                last_updated_at: items[0].last_updated_at,
                units: items.reduce((s, i) => s + Number(i.units), 0),
                average_price: totalInv / items.reduce((s, i) => s + Number(i.units), 1),
                goal_name: items.find(i => i.goal_name)?.goal_name,
                invested_value: totalInv,
                current_value: totalCur,
                profit_loss: totalCur - totalInv,
                profit_loss_pct: ((totalCur - totalInv) / (totalInv || 1)) * 100,
                has_multiple: true,
                children: items
            })
        } else {
            result.push({ ...items[0], has_multiple: false })
        }
    })
    return result
})

const availableCategories = computed(() => {
    const cats = new Set<string>()
    sortedPortfolio.value.forEach(item => {
        if (item.category) cats.add(item.category.toUpperCase())
    })
    return ['ALL', ...Array.from(cats)]
})

const filteredHoldings = computed(() => {
    let list = [...sortedPortfolio.value]
    if (selectedCategory.value !== 'ALL') {
        list = list.filter(item => item.category?.toUpperCase() === selectedCategory.value)
    }
    if (search.value && search.value.trim()) {
        const q = search.value.toLowerCase().trim()
        list = list.filter(item =>
            item.scheme_name?.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q) ||
            item.scheme_code?.toString().includes(q)
        )
    }

    list.sort((a, b) => {
        let valA = a[sortKey.value]
        let valB = b[sortKey.value]
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()
        if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
        return 0
    })

    return list
})

const totalPages = computed(() => Math.ceil(filteredHoldings.value.length / pageSize.value) || 1)

const paginatedHoldings = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredHoldings.value.slice(start, start + pageSize.value)
})

watch([search, selectedCategory], () => {
    currentPage.value = 1
})

const topGainers = computed(() => sortedPortfolio.value.filter(i => i.profit_loss > 0).sort((a, b) => b.profit_loss - a.profit_loss).slice(0, 3))
const topLosers = computed(() => sortedPortfolio.value.filter(i => i.profit_loss < 0).sort((a, b) => a.profit_loss - b.profit_loss).slice(0, 3))

const categoryData = computed(() => {
    if (!analytics.value?.category_allocation) return []
    return Object.entries(analytics.value.category_allocation).map(([label, value]) => ({
        label,
        value: Number(value)
    })).sort((a, b) => b.value - a.value)
})

const assetData = computed(() => {
    if (!analytics.value?.asset_allocation) return []
    return Object.entries(analytics.value.asset_allocation).map(([label, value]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value: Number(value)
    })).filter(i => i.value > 0)
})

const filteredBenchmarksData = computed(() => {
    return benchmarksData.value.filter(bm => selectedBenchmarkSymbols.value.includes(bm.symbol))
})

// API Operations
async function fetchPortfolio() {
    isLoading.value = true
    try {
        const res = await financeApi.getPortfolio(authStore.selectedMemberId || undefined)
        const data = res.data?.data || res.data
        portfolio.value = Array.isArray(data) ? data : []
        mfStore.portfolio = portfolio.value
    } catch (e) {
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

async function fetchAnalytics() {
    try {
        const res = await financeApi.getAnalytics(authStore.selectedMemberId || undefined)
        analytics.value = res.data?.data || res.data
        mfStore.analytics = analytics.value
    } catch (e) {
        console.error(e)
    }
}

async function fetchPortfolioTimeline() {
    isTimelineLoading.value = true
    try {
        const res = await financeApi.getPerformanceTimeline('1y', '1d', authStore.selectedMemberId || undefined)
        timelineData.value = res.data?.timeline || []
        benchmarkData.value = res.data?.benchmark || []
        benchmarksData.value = res.data?.benchmarks || []
        if (selectedBenchmarkSymbols.value.length === 0 && benchmarksData.value.length > 0) {
            const nifty = benchmarksData.value.find(b => b.symbol === '120716')
            selectedBenchmarkSymbols.value = nifty ? [nifty.symbol] : [benchmarksData.value[0].symbol]
        }
    } catch (e) {
        console.error("Failed to fetch portfolio timeline", e)
    } finally {
        isTimelineLoading.value = false
    }
}

async function fetchMarketIndices() {
    isMarketPulseLoading.value = true
    try {
        const res = await financeApi.getMarketIndices(marketPulsePeriod.value)
        marketIndices.value = res.data?.data || res.data || []
    } catch (e) {
        console.error("Failed to fetch market indices", e)
    } finally {
        isMarketPulseLoading.value = false
    }
}

async function handleRebuildHoldings() {
    isRebuilding.value = true
    try {
        await mfStore.rebuildHoldings()
        await refreshAll()
    } finally {
        isRebuilding.value = false
    }
}

async function handleManualSync() {
    await mfStore.triggerSync()
    startSyncPolling()
}

let syncPollInterval: any = null
function startSyncPolling() {
    if (syncPollInterval) return
    syncPollInterval = setInterval(async () => {
        await mfStore.fetchSyncStatus()
        if (mfStore.syncStatus?.status !== 'running') {
            stopSyncPolling()
            if (mfStore.syncStatus?.status === 'completed') {
                await refreshAll()
            }
        }
    }, 5000)
}

function stopSyncPolling() {
    if (syncPollInterval) {
        clearInterval(syncPollInterval)
        syncPollInterval = null
    }
}

async function handleCleanupDuplicates() {
    try {
        await mfStore.cleanupDuplicates()
        await refreshAll()
    } catch (e) {
        console.error(e)
    }
}

async function refreshAll() {
    await Promise.all([
        fetchPortfolio(),
        fetchAnalytics(),
        fetchPortfolioTimeline()
    ])
}

function formatDateShort(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function openDeleteModal(item: any) {
    selectedHolding.value = item
    showDeleteModal.value = true
}

async function handleDeleteHolding(id: string) {
    isManagementLoading.value = true
    try {
        await financeApi.deleteHolding(id)
        notify.success("Holding removed")
        await fetchPortfolio()
    } catch (e) {
        notify.error("Delete failed")
    } finally {
        isManagementLoading.value = false
        showDeleteModal.value = false
    }
}

async function handleBulkDelete(ids: string[]) {
    isManagementLoading.value = true
    try {
        await financeApi.bulkDeleteFundTransactions(ids)
        notify.success(`Cleaned ${ids.length} records`)
        await fetchPortfolio()
    } catch (e) {
        notify.error("Cleanup failed")
    } finally {
        isManagementLoading.value = false
        showDeleteModal.value = false
    }
}

function toggleGroup(id: string) {
    const idx = expanded.value.indexOf(id)
    if (idx !== -1) expanded.value.splice(idx, 1)
    else expanded.value.push(id)
}

function getRandomColor(name: string) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
}

async function hardRefreshTimeline() {
    isTimelineRefreshing.value = true
    try {
        await mfStore.hardRefreshPortfolio()
        await fetchPortfolioTimeline()
    } catch (e) {
        console.error("Manual refresh failed:", e)
    } finally {
        isTimelineRefreshing.value = false
    }
}

onMounted(() => {
    fetchPortfolio()
    fetchAnalytics()
    fetchPortfolioTimeline()
    fetchMarketIndices()
})

watch(() => props.active, (isActive) => {
    if (isActive) {
        refreshAll()
        fetchMarketIndices()
        if (mfStore.syncStatus?.status === 'running') {
            startSyncPolling()
        }
    } else {
        stopSyncPolling()
    }
})

onUnmounted(() => {
    stopSyncPolling()
})

const emit = defineEmits(['update:count'])
watch(portfolio, (val) => emit('update:count', val.length))
</script>

<template>
    <div class="space-y-4">
        <!-- 1. Market Pulse Mini Bar -->
        <WfCard variant="flat" padding="none" radius="lg" class="border border-wf-border p-3 sm:p-4 shadow-2xs">
            <div class="flex items-center justify-between mb-2.5">
                <div class="flex items-center gap-1.5 text-xs font-bold text-wf-text-secondary uppercase tracking-wider">
                    <Zap :size="13" class="text-amber-500" />
                    <span>Market Pulse</span>
                </div>
                <div class="flex items-center p-0.5 rounded-wf-sm bg-wf-surface-variant border border-wf-border">
                    <button v-for="p in ['1d', '7d', '30d']" :key="p"
                        @click="marketPulsePeriod = p; fetchMarketIndices()"
                        class="px-2 py-0.5 text-[10px] font-bold rounded-wf-xs transition-all uppercase"
                        :class="marketPulsePeriod === p ? 'bg-wf-surface text-wf-primary shadow-xs font-black' : 'text-wf-text-muted hover:text-wf-text-primary'">
                        {{ p }}
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <template v-if="isMarketPulseLoading && !marketIndices.length">
                    <div v-for="i in 6" :key="`skel-pulse-${i}`"
                        class="p-2.5 rounded-wf-sm bg-wf-surface-variant/40 animate-pulse h-14"></div>
                </template>
                <template v-else>
                    <div v-for="index in marketIndices" :key="index.symbol"
                        class="p-2.5 rounded-wf-sm bg-wf-surface-variant/30 border border-wf-border-subtle flex flex-col justify-between hover:border-wf-border transition-all">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold text-wf-text-secondary truncate max-w-[85px]"
                                :title="index.name">{{ index.name }}</span>
                            <span class="text-[10px] font-bold font-mono"
                                :class="index.isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                                {{ index.percent || (((index.changePercent != null ? index.changePercent : 0) >= 0 ? '+' : '') + Number(index.changePercent || 0).toFixed(2) + '%') }}
                            </span>
                        </div>
                        <div class="flex items-baseline justify-between mt-1">
                            <span class="text-xs font-bold font-mono text-wf-text-primary">{{
                                index.value || (index.currentPrice != null ? index.currentPrice.toLocaleString('en-IN') : '0') }}</span>
                            <div class="w-14 h-4">
                                <Sparkline v-if="index.sparkline && index.sparkline.length > 1" :data="index.sparkline"
                                    :labels="index.labels" :color="index.isUp ? '#10b981' : '#ef4444'" :height="16"
                                    :smooth="true" :glow="true" :is-currency="false" />
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </WfCard>

        <!-- 2. Portfolio Header KPI Cards (4 Cards Grid) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <template v-if="isLoading">
                <div v-for="i in 4" :key="`skel-card-${i}`"
                    class="p-4 sm:p-5 rounded-wf-lg border border-wf-border bg-wf-surface h-28 animate-pulse flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <div class="h-3 w-24 bg-wf-surface-variant rounded-wf-xs"></div>
                        <div class="w-6 h-6 rounded-wf-sm bg-wf-surface-variant"></div>
                    </div>
                    <div class="h-6 w-32 bg-wf-surface-variant rounded-wf-xs mt-2"></div>
                    <div class="pt-2 border-t border-wf-border-subtle flex items-center justify-between">
                        <div class="h-2.5 w-16 bg-wf-surface-variant rounded-wf-xs"></div>
                        <div class="h-2.5 w-20 bg-wf-surface-variant rounded-wf-xs"></div>
                    </div>
                </div>
            </template>
            <template v-else>
                <!-- Card 1: Current Value -->
                <WfCard variant="flat" padding="none" radius="lg"
                    class="border border-wf-border p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-wf-primary/40 transition-all">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">Current Value</span>
                            <div class="w-7 h-7 rounded-wf-sm flex items-center justify-center shrink-0"
                                :class="latestInsights.dayChange >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'">
                                <TrendingUp v-if="latestInsights.dayChange >= 0" :size="14" />
                                <TrendingDown v-else :size="14" />
                            </div>
                        </div>
                        <div class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary font-mono">
                            {{ formatAmount(portfolioStats.current) }}
                        </div>
                        <div class="flex items-center gap-1.5 mt-1 text-xs font-semibold">
                            <span :class="latestInsights.dayChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                                {{ latestInsights.dayChange >= 0 ? '+' : '' }}{{ formatAmount(latestInsights.dayChange) }}
                                ({{ Number(latestInsights?.dayChangePercent || 0).toFixed(2) }}%)
                            </span>
                            <span class="text-[10px] text-wf-text-muted uppercase">vs yesterday</span>
                        </div>
                    </div>

                    <div class="mt-3.5 pt-2.5 border-t border-wf-border-subtle flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase text-wf-text-secondary">7D Net Trend</span>
                        <div class="w-24 h-5">
                            <Sparkline v-if="cvSparkline.length > 1" :data="cvSparkline"
                                :color="latestInsights.dayChange >= 0 ? '#10b981' : '#ef4444'" :height="20" />
                        </div>
                    </div>
                </WfCard>

                <!-- Card 2: Invested Capital -->
                <WfCard variant="flat" padding="none" radius="lg"
                    class="border border-wf-border p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-wf-primary/40 transition-all">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">Invested Capital</span>
                            <div class="w-7 h-7 rounded-wf-sm bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <Clock :size="14" />
                            </div>
                        </div>
                        <div class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary font-mono">
                            {{ formatAmount(portfolioStats.invested) }}
                        </div>
                        <div class="flex items-center gap-1.5 mt-1 text-xs font-semibold">
                            <span class="text-wf-primary font-mono font-bold">
                                {{ (portfolioStats.invested ? portfolioStats.current / portfolioStats.invested : 1).toFixed(2) }}x
                            </span>
                            <span class="text-[10px] text-wf-text-muted uppercase">Growth factor</span>
                        </div>
                    </div>

                    <div class="mt-3.5 pt-2.5 border-t border-wf-border-subtle flex items-center justify-between">
                        <span class="text-[10px] font-bold text-wf-text-muted uppercase">{{ portfolio.length }} Active Folios</span>
                        <div class="w-24 h-5">
                            <Sparkline v-if="icSparkline.length > 1" :data="icSparkline" color="#3b82f6" :height="20" />
                        </div>
                    </div>
                </WfCard>

                <!-- Card 3: Net Gain/Loss -->
                <WfCard variant="flat" padding="none" radius="lg"
                    class="border border-wf-border p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-wf-primary/40 transition-all">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">Total Return</span>
                            <div class="w-7 h-7 rounded-wf-sm flex items-center justify-center shrink-0"
                                :class="portfolioStats.pl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'">
                                <Target :size="14" />
                            </div>
                        </div>
                        <div class="text-xl sm:text-2xl font-bold tracking-tight font-mono"
                            :class="portfolioStats.pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                            {{ portfolioStats.pl >= 0 ? '+' : '' }}{{ formatAmount(portfolioStats.pl) }}
                        </div>
                        <div class="flex items-center gap-1.5 mt-1 text-xs font-semibold">
                            <span class="px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold font-mono"
                                :class="portfolioStats.pl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'">
                                {{ (portfolioStats?.pl || 0) >= 0 ? '+' : '' }}{{ Number(portfolioStats?.plPercent || 0).toFixed(2) }}% Absolute
                            </span>
                        </div>
                    </div>

                    <div class="mt-3.5 pt-2.5 border-t border-wf-border-subtle flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase text-wf-text-secondary">P&L Curve</span>
                        <div class="w-24 h-5">
                            <Sparkline v-if="ngSparkline.length > 1" :data="ngSparkline"
                                :color="portfolioStats.pl >= 0 ? '#10b981' : '#ef4444'" :height="20" />
                        </div>
                    </div>
                </WfCard>

                <!-- Card 4: Portfolio XIRR / Annualized -->
                <WfCard variant="flat" padding="none" radius="lg"
                    class="border border-wf-border p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-wf-primary/40 transition-all">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">Portfolio XIRR</span>
                            <div class="w-7 h-7 rounded-wf-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Zap :size="14" />
                            </div>
                        </div>
                        <div class="text-xl sm:text-2xl font-bold tracking-tight font-mono text-wf-text-primary">
                            {{ analytics?.xirr != null ? Number(analytics.xirr).toFixed(2) + '%' : 'N/A' }}
                        </div>
                        <div class="flex items-center gap-1.5 mt-1 text-xs font-semibold">
                            <span class="text-wf-text-secondary font-mono text-[11px]">
                                Annualized CAGR
                            </span>
                            <span class="px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold bg-wf-surface-variant text-wf-primary uppercase">
                                Active
                            </span>
                        </div>
                    </div>

                    <div class="mt-3.5 pt-2.5 border-t border-wf-border-subtle flex items-center justify-between text-[10px] text-wf-text-muted">
                        <span>NAV Sync</span>
                        <span class="font-mono text-wf-text-secondary">{{ analytics?.last_updated_at || 'Recent' }}</span>
                    </div>
                </WfCard>
            </template>
        </div>

        <!-- 3. Executive Split Row: Performance Timeline (7 cols) + Intelligence Hub (5 cols) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <!-- Left: Performance Timeline Chart (7 cols) -->
            <WfCard variant="flat" padding="none" radius="lg"
                class="lg:col-span-7 border border-wf-border p-4 sm:p-5 shadow-2xs overflow-hidden flex flex-col justify-between">
                <div>
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
                        <div class="min-w-0">
                            <h3 class="text-xs sm:text-sm font-bold text-wf-text-primary flex items-center gap-2">
                                <Activity :size="16" class="text-wf-primary shrink-0" />
                                <span class="truncate">Performance Timeline</span>
                            </h3>
                            <p class="text-[11px] text-wf-text-secondary truncate">Historical valuation vs invested capital curve</p>
                        </div>

                        <div class="flex flex-wrap items-center gap-1.5">
                            <!-- Sync Status Indicator -->
                            <div v-if="mfStore.syncStatus"
                                class="flex items-center gap-1.5 px-2 py-0.5 rounded-wf-sm bg-wf-surface-variant border border-wf-border text-[10px] font-semibold text-wf-text-secondary">
                                <div class="status-dot"
                                    :class="mfStore.isSyncing ? 'status-syncing' : (mfStore.syncStatus.status === 'completed' ? 'status-online' : 'status-error')">
                                </div>
                                <span>{{ mfStore.isSyncing ? 'Syncing...' : (mfStore.syncStatus.status === 'completed' ? 'NAVs Current' : 'Sync Error') }}</span>
                                <span v-if="!mfStore.isSyncing && mfStore.syncStatus.completed_at"
                                    class="text-[9px] text-wf-text-muted">
                                    {{ formatDateShort(mfStore.syncStatus.completed_at) }}
                                </span>
                            </div>

                            <button type="button" @click="handleManualSync"
                                :disabled="mfStore.isSyncing || mfStore.syncStatus?.status === 'running'"
                                class="h-7 px-2.5 rounded-wf-sm text-xs font-semibold bg-wf-primary-light text-wf-primary hover:bg-indigo-100 border border-transparent transition-all flex items-center gap-1.5 disabled:opacity-50">
                                <RefreshCw :size="12" :class="{ 'animate-spin': mfStore.isSyncing }" />
                                <span>Sync NAVs</span>
                            </button>

                            <button type="button" @click="hardRefreshTimeline" :disabled="isTimelineRefreshing"
                                class="h-7 px-2 rounded-wf-sm text-xs font-semibold bg-wf-surface-variant text-wf-text-secondary hover:text-wf-text-primary border border-wf-border transition-all flex items-center gap-1 disabled:opacity-50"
                                title="Recalculate portfolio history">
                                <RefreshCcw :size="12" :class="{ 'animate-spin': isTimelineRefreshing }" />
                            </button>

                            <!-- Settings Menu -->
                            <div class="relative">
                                <button type="button" @click="showSettingsMenu = !showSettingsMenu; showBenchmarkMenu = false"
                                    class="h-7 w-7 rounded-wf-sm bg-wf-surface-variant hover:bg-wf-surface border border-wf-border text-wf-text-secondary flex items-center justify-center transition-colors"
                                    title="Timeline Options">
                                    <Settings :size="13" />
                                </button>
                                <div v-if="showSettingsMenu"
                                    class="absolute right-0 top-full mt-1 z-30 p-1.5 rounded-wf-md border border-wf-border bg-wf-surface shadow-lg min-w-[200px] space-y-1 text-xs">
                                    <button type="button" @click="handleRebuildHoldings(); showSettingsMenu = false" :disabled="isRebuilding"
                                        class="w-full px-2.5 py-1.5 rounded-wf-sm text-left hover:bg-wf-surface-variant flex items-center gap-2 text-amber-500">
                                        <Activity :size="13" />
                                        <div>
                                            <div class="font-semibold text-wf-text-primary">Rebuild Holdings</div>
                                            <div class="text-[9px] text-wf-text-muted">Fixes unit/cost desync</div>
                                        </div>
                                    </button>
                                    <button type="button" @click="handleCleanupDuplicates(); showSettingsMenu = false"
                                        class="w-full px-2.5 py-1.5 rounded-wf-sm text-left hover:bg-rose-500/10 flex items-center gap-2 text-rose-500">
                                        <Trash2 :size="13" />
                                        <span>Cleanup Duplicates</span>
                                    </button>
                                </div>
                            </div>

                            <span class="px-2 py-0.5 text-[10px] font-bold rounded-wf-sm bg-wf-surface-variant text-wf-primary border border-wf-border flex items-center gap-1">
                                <Calendar :size="12" /> 1Y
                            </span>

                            <!-- Benchmarks Popover -->
                            <div class="relative">
                                <button type="button" @click="showBenchmarkMenu = !showBenchmarkMenu; showSettingsMenu = false"
                                    class="h-7 px-2.5 rounded-wf-sm text-xs font-semibold bg-wf-primary-light text-wf-primary hover:bg-indigo-100 border border-transparent transition-all flex items-center gap-1.5">
                                    <TrendingUp :size="12" />
                                    <span>Benchmarks ({{ selectedBenchmarkSymbols.length }})</span>
                                </button>
                                <div v-if="showBenchmarkMenu"
                                    class="absolute right-0 top-full mt-1 z-30 p-2 rounded-wf-md border border-wf-border bg-wf-surface shadow-lg min-w-[210px] space-y-1">
                                    <div class="flex items-center justify-between px-2 py-1">
                                        <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">Select Indices</span>
                                        <button type="button" @click="showBenchmarkMenu = false" class="text-wf-text-muted hover:text-wf-text-primary">
                                            <X :size="12" />
                                        </button>
                                    </div>
                                    <div v-for="bm in benchmarksData" :key="bm.symbol"
                                        @click="selectedBenchmarkSymbols.includes(bm.symbol) ? selectedBenchmarkSymbols = selectedBenchmarkSymbols.filter(s => s !== bm.symbol) : selectedBenchmarkSymbols.push(bm.symbol)"
                                        class="flex items-center justify-between p-1.5 rounded-wf-sm hover:bg-wf-surface-variant cursor-pointer text-xs">
                                        <div class="flex items-center gap-2">
                                            <input type="checkbox" :checked="selectedBenchmarkSymbols.includes(bm.symbol)"
                                                class="rounded border-wf-border text-wf-primary focus:ring-0" />
                                            <span class="font-medium text-wf-text-primary text-[11px]">{{ bm.label }}</span>
                                        </div>
                                        <div class="w-2.5 h-2.5 rounded-xs" :style="{ background: bm.styling?.color }"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Chart Canvas -->
                    <div class="w-full relative overflow-hidden pb-1">
                        <div v-if="isTimelineLoading" class="h-[260px] flex items-center justify-center">
                            <div class="w-6 h-6 border-2 border-wf-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <FundPerformanceChart v-else-if="timelineData.length" :data="timelineData"
                            :benchmarks="filteredBenchmarksData" :height="260" valueLabel="Portfolio Value"
                            investedLabel="Net Invested" @toggle-benchmark="(symbol) => {
                                if (selectedBenchmarkSymbols.includes(symbol)) {
                                    selectedBenchmarkSymbols = selectedBenchmarkSymbols.filter(s => s !== symbol)
                                } else {
                                    selectedBenchmarkSymbols.push(symbol)
                                }
                            }" />
                        <div v-else class="h-[260px] flex flex-col items-center justify-center opacity-40">
                            <div class="p-3 rounded-full bg-wf-surface-variant mb-2">
                                <TrendingUp :size="24" />
                            </div>
                            <div class="text-xs font-semibold">Awaiting historical data synchronization...</div>
                        </div>
                    </div>
                </div>
            </WfCard>

            <!-- Right: Allocation & Top Movers Intelligence Hub (5 cols) -->
            <WfCard variant="flat" padding="none" radius="lg"
                class="lg:col-span-5 border border-wf-border p-4 sm:p-5 shadow-2xs overflow-hidden flex flex-col justify-between">
                <div>
                    <!-- Intelligence Hub Header with Tabs -->
                    <div class="flex items-center justify-between pb-3 mb-3 border-b border-wf-border-subtle">
                        <div class="flex items-center p-0.5 bg-wf-surface-variant border border-wf-border rounded-wf-sm">
                            <button type="button" @click="intelligenceTab = 'allocation'"
                                class="px-2.5 py-1 text-xs font-bold rounded-wf-xs transition-all flex items-center gap-1.5"
                                :class="intelligenceTab === 'allocation' ? 'bg-wf-surface text-wf-primary shadow-xs' : 'text-wf-text-secondary hover:text-wf-text-primary'">
                                <PieChart :size="13" />
                                <span>Allocation</span>
                            </button>
                            <button type="button" @click="intelligenceTab = 'movers'"
                                class="px-2.5 py-1 text-xs font-bold rounded-wf-xs transition-all flex items-center gap-1.5"
                                :class="intelligenceTab === 'movers' ? 'bg-wf-surface text-wf-primary shadow-xs' : 'text-wf-text-secondary hover:text-wf-text-primary'">
                                <TrendingUp :size="13" />
                                <span>Top Movers</span>
                            </button>
                        </div>

                        <!-- Sub-selector for Allocation -->
                        <div v-if="intelligenceTab === 'allocation'" class="flex items-center gap-1">
                            <button type="button" @click="allocationType = 'category'"
                                class="px-2 py-0.5 text-[10px] font-bold rounded-wf-xs transition-all uppercase"
                                :class="allocationType === 'category' ? 'bg-wf-primary-light text-wf-primary font-black border border-indigo-200 dark:border-indigo-900/50' : 'text-wf-text-muted hover:text-wf-text-primary'">
                                Category
                            </button>
                            <button type="button" @click="allocationType = 'asset'"
                                class="px-2 py-0.5 text-[10px] font-bold rounded-wf-xs transition-all uppercase"
                                :class="allocationType === 'asset' ? 'bg-wf-primary-light text-wf-primary font-black border border-indigo-200 dark:border-indigo-900/50' : 'text-wf-text-muted hover:text-wf-text-primary'">
                                Asset Class
                            </button>
                        </div>

                        <div v-else class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">
                            Gainers / Losers
                        </div>
                    </div>

                    <!-- Tab 1: Allocation Donut Charts -->
                    <div v-if="intelligenceTab === 'allocation'" class="space-y-2">
                        <!-- Category Allocation View -->
                        <div v-if="allocationType === 'category'">
                            <div class="flex items-center justify-between mb-1.5 text-xs">
                                <span class="font-bold text-wf-text-secondary uppercase text-[10px] tracking-wider">Category Exposure</span>
                                <span class="font-mono text-[10px] text-wf-text-muted">{{ categoryData.length }} Sectors</span>
                            </div>
                            <PortfolioDonutChart v-if="categoryData.length" :data="categoryData" :size="160" :show-legend="true" />
                            <div v-else class="py-12 text-center text-xs text-wf-text-muted">No category allocation data</div>
                        </div>

                        <!-- Asset Class View -->
                        <div v-else>
                            <div class="flex items-center justify-between mb-1.5 text-xs">
                                <span class="font-bold text-wf-text-secondary uppercase text-[10px] tracking-wider">Asset Class Breakdown</span>
                                <span class="font-mono text-[10px] text-wf-text-muted">{{ assetData.length }} Classes</span>
                            </div>
                            <PortfolioDonutChart v-if="assetData.length" :data="assetData" :size="160" :show-legend="true" />
                            <div v-else class="py-12 text-center text-xs text-wf-text-muted">No asset allocation data</div>
                        </div>
                    </div>

                    <!-- Tab 2: Top Movers View -->
                    <div v-else class="space-y-3.5">
                        <!-- Top Gainers -->
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp :size="12" /> Top Gainers
                                </span>
                                <span class="text-[10px] font-mono text-wf-text-muted">Realized P&L</span>
                            </div>
                            <div class="space-y-1.5">
                                <div v-for="item in topGainers" :key="item.id"
                                    class="flex items-center justify-between p-2 rounded-wf-sm bg-wf-surface-variant/30 hover:bg-wf-surface-variant border border-wf-border-subtle transition-all cursor-pointer group"
                                    @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                                    <span class="text-xs font-semibold text-wf-text-primary group-hover:text-wf-primary transition-colors truncate mr-2">
                                        {{ item.scheme_name }}
                                    </span>
                                    <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 font-mono">
                                        +{{ formatAmount(item.profit_loss) }}
                                    </span>
                                </div>
                                <div v-if="!topGainers.length" class="text-xs text-wf-text-muted py-2 text-center">No gainers found</div>
                            </div>
                        </div>

                        <!-- Top Losers -->
                        <div class="pt-2 border-t border-wf-border-subtle">
                            <div class="flex items-center justify-between mb-1.5">
                                <span class="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                    <TrendingDown :size="12" /> Top Losers
                                </span>
                                <span class="text-[10px] font-mono text-wf-text-muted">Realized P&L</span>
                            </div>
                            <div class="space-y-1.5">
                                <div v-for="item in topLosers" :key="item.id"
                                    class="flex items-center justify-between p-2 rounded-wf-sm bg-wf-surface-variant/30 hover:bg-wf-surface-variant border border-wf-border-subtle transition-all cursor-pointer group"
                                    @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                                    <span class="text-xs font-semibold text-wf-text-primary group-hover:text-wf-primary transition-colors truncate mr-2">
                                        {{ item.scheme_name }}
                                    </span>
                                    <span class="text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0 font-mono">
                                        {{ formatAmount(item.profit_loss) }}
                                    </span>
                                </div>
                                <div v-if="!topLosers.length" class="text-xs text-wf-text-muted py-2 text-center">All funds positive</div>
                            </div>
                        </div>
                    </div>
                </div>
            </WfCard>
        </div>

        <!-- 4. Portfolio Holdings Semantic Table Card (Aether V4 Standard) -->
        <WfCard variant="flat" padding="none" radius="lg"
            class="border border-wf-border bg-wf-surface overflow-hidden flex flex-col shadow-2xs">
            <!-- Toolbar with Category Filters & Search -->
            <div class="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-wf-border bg-wf-surface">
                <div class="flex flex-wrap items-center gap-2">
                    <div>
                        <h3 class="text-xs sm:text-sm font-bold text-wf-text-primary leading-tight">Portfolio Holdings</h3>
                        <p class="text-[11px] text-wf-text-muted leading-tight">Complete breakdown of registered folios</p>
                    </div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                        {{ filteredHoldings.length }} Schemes
                    </span>
                </div>

                <div class="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <!-- Category Filter Dropdown -->
                    <select v-model="selectedCategory"
                        class="h-8 px-2.5 rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-wf-primary focus:border-wf-primary cursor-pointer shrink-0 max-w-[200px] truncate">
                        <option v-for="cat in availableCategories" :key="cat" :value="cat">
                            {{ cat === 'ALL' ? 'All Categories' : cat }}
                        </option>
                    </select>

                    <!-- Search Input -->
                    <div class="relative w-full sm:w-60">
                        <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-wf-text-muted pointer-events-none" />
                        <input v-model="search" type="text" placeholder="Search schemes or folios..."
                            class="w-full h-8 pl-8 pr-7 text-xs rounded-wf-md border border-wf-border bg-wf-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-wf-primary focus:border-wf-primary text-wf-text-primary placeholder:text-wf-text-muted transition-all" />
                        <button v-if="search" @click="search = ''"
                            class="absolute right-2 top-1/2 -translate-y-1/2 text-wf-text-muted hover:text-wf-text-primary">
                            <X :size="12" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="p-4 sm:p-5 space-y-2.5">
                <div v-for="i in 5" :key="`skel-table-${i}`"
                    class="h-10 rounded-wf-md bg-wf-surface-variant/50 animate-pulse">
                </div>
            </div>

            <!-- Semantic Table -->
            <div v-else-if="filteredHoldings.length > 0" class="overflow-x-auto flex-1 min-h-0">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="border-b border-wf-border bg-wf-surface-variant/40 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
                            <th class="py-2.5 px-3.5 cursor-pointer select-none hover:text-wf-text-primary"
                                @click="setSort('scheme_name')">
                                <div class="flex items-center gap-1">
                                    <span>Scheme Details</span>
                                    <ArrowUpDown :size="10" />
                                </div>
                            </th>
                            <th class="py-2.5 px-3.5 w-[120px]">Category</th>
                            <th class="py-2.5 px-3.5 text-center w-[100px]">Trend</th>
                            <th class="py-2.5 px-3.5 text-right w-[120px] cursor-pointer select-none hover:text-wf-text-primary"
                                @click="setSort('invested_value')">
                                <div class="flex items-center justify-end gap-1">
                                    <span>Invested</span>
                                    <ArrowUpDown :size="10" />
                                </div>
                            </th>
                            <th class="py-2.5 px-3.5 text-right w-[130px] cursor-pointer select-none hover:text-wf-text-primary"
                                @click="setSort('current_value')">
                                <div class="flex items-center justify-end gap-1">
                                    <span>Current Value</span>
                                    <ArrowUpDown :size="10" />
                                </div>
                            </th>
                            <th class="py-2.5 px-3.5 text-right w-[120px] cursor-pointer select-none hover:text-wf-text-primary"
                                @click="setSort('profit_loss')">
                                <div class="flex items-center justify-end gap-1">
                                    <span>Returns</span>
                                    <ArrowUpDown :size="10" />
                                </div>
                            </th>
                            <th class="py-2.5 px-3.5 text-right w-[70px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-wf-border-subtle">
                        <template v-for="item in paginatedHoldings" :key="item.id">
                            <!-- Parent Row -->
                            <tr class="hover:bg-wf-surface-variant/30 transition-colors group">
                                <!-- Scheme Details -->
                                <td class="py-2.5 px-3.5">
                                    <div class="flex items-center">
                                        <div class="mr-2.5 shrink-0 w-1 h-7 rounded-wf-pill"
                                            :style="{ background: getRandomColor(item.scheme_name) }"></div>

                                        <button v-if="item.has_multiple" type="button"
                                            @click.stop="toggleGroup(item.id)"
                                            class="w-5 h-5 rounded-wf-xs flex items-center justify-center mr-1.5 text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant transition-all shrink-0"
                                            title="Toggle Grouped Folios">
                                            <ChevronDown v-if="expanded.includes(item.id)" :size="14" />
                                            <ChevronRight v-else :size="14" />
                                        </button>
                                        <div v-else class="w-2 shrink-0"></div>

                                        <div class="cursor-pointer group/link flex-grow overflow-hidden min-w-0"
                                            @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                                            <div class="font-bold text-xs text-wf-text-primary group-hover/link:text-wf-primary transition-colors truncate"
                                                :title="item.scheme_name">
                                                {{ item.scheme_name }}
                                            </div>
                                            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span class="text-[10px] text-wf-text-muted font-mono">{{
                                                    item.scheme_code }}</span>
                                                <span v-if="item.goal_name"
                                                    class="px-1 py-0.2 rounded-wf-pill text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                    {{ item.goal_name }}
                                                </span>
                                                <span v-if="item.units"
                                                    class="text-[10px] font-semibold text-wf-primary font-mono">
                                                    {{ Number(item?.units || 0).toFixed(2) }} Units @ {{
                                                    formatAmount(item.average_price) }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- Category -->
                                <td class="py-2.5 px-3.5">
                                    <span
                                        class="px-1.5 py-0.5 rounded-wf-xs text-[9px] font-bold bg-wf-surface-variant text-wf-primary border border-wf-border-subtle uppercase">
                                        {{ item.category?.toUpperCase() || 'MUTUAL FUND' }}
                                    </span>
                                </td>

                                <!-- Sparkline -->
                                <td class="py-2.5 px-3.5 text-center">
                                    <div class="flex items-center justify-center">
                                        <div v-if="item.sparkline && item.sparkline.length > 1" class="w-16 h-4">
                                            <Sparkline :data="item.sparkline"
                                                :color="item.profit_loss >= 0 ? '#10b981' : '#ef4444'" :height="16"
                                                :width="64" />
                                        </div>
                                        <span v-else class="text-[9px] text-wf-text-muted uppercase">N/A</span>
                                    </div>
                                </td>

                                <!-- Invested Value -->
                                <td class="py-2.5 px-3.5 text-right font-mono font-semibold text-wf-text-primary">
                                    {{ formatAmount(item.invested_value) }}
                                </td>

                                <!-- Current Value -->
                                <td class="py-2.5 px-3.5 text-right">
                                    <div class="font-mono font-bold text-wf-text-primary">{{
                                        formatAmount(item.current_value) }}</div>
                                    <div v-if="item.last_nav" class="text-[9px] text-wf-text-muted font-mono">
                                        NAV {{ formatAmount(item.last_nav) }}
                                    </div>
                                </td>

                                <!-- Returns -->
                                <td class="py-2.5 px-3.5 text-right">
                                    <div :class="item.profit_loss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                                        class="font-mono font-bold">
                                        {{ item.profit_loss >= 0 ? '+' : '' }}{{ formatAmount(item.profit_loss) }}
                                    </div>
                                    <div :class="item.profit_loss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                                        class="text-[10px] font-bold font-mono">
                                        {{ item.profit_loss >= 0 ? '▲' : '▼' }} {{ Number(item.profit_loss_pct ||
                                        0).toFixed(2) }}%
                                    </div>
                                </td>

                                <!-- Actions -->
                                <td class="py-2.5 px-3.5 text-right">
                                    <div class="flex items-center justify-end gap-1">
                                        <button type="button"
                                            @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)"
                                            class="w-6 h-6 rounded-wf-xs flex items-center justify-center text-wf-primary hover:bg-wf-primary/10 transition-colors"
                                            title="View Details">
                                            <EyeIconMain :size="13" />
                                        </button>
                                        <button type="button" @click="openDeleteModal(item)"
                                            class="w-6 h-6 rounded-wf-xs flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors"
                                            title="Remove Holding">
                                            <Trash2 :size="13" />
                                        </button>
                                    </div>
                                </td>
                            </tr>

                            <!-- Nested Child Folios Row -->
                            <tr v-if="item.has_multiple && expanded.includes(item.id)" class="bg-wf-surface-variant/20">
                                <td colspan="7" class="p-0">
                                    <div
                                        class="divide-y divide-wf-border-subtle border-t border-b border-wf-border-subtle pl-6">
                                        <div v-for="child in item.children" :key="child.id"
                                            class="flex items-center justify-between px-4 py-2 hover:bg-wf-surface-variant/40 transition-colors text-xs">
                                            <div class="min-w-0 pr-4">
                                                <div
                                                    class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted">
                                                    Folio Number</div>
                                                <div class="font-mono font-bold text-wf-text-primary">{{
                                                    child.folio_number || 'Direct' }}</div>
                                            </div>
                                            <div class="text-right px-4 font-mono">
                                                <div
                                                    class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted">
                                                    Units</div>
                                                <div class="font-semibold text-wf-text-primary">{{
                                                    Number(child?.units || 0).toFixed(3) }}</div>
                                            </div>
                                            <div class="text-right px-4 font-mono">
                                                <div
                                                    class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted">
                                                    Current Value</div>
                                                <div class="font-bold text-wf-text-primary">{{
                                                    formatAmount(child.current_value) }}</div>
                                            </div>
                                            <div class="flex items-center gap-1 pl-4">
                                                <button type="button" @click="$router.push(`/mutual-funds/${child.id}`)"
                                                    class="w-5 h-5 rounded-wf-xs flex items-center justify-center text-wf-primary hover:bg-wf-primary/10 transition-colors"
                                                    title="View Folio">
                                                    <EyeIconMain :size="12" />
                                                </button>
                                                <button type="button" @click="openDeleteModal(child)"
                                                    class="w-5 h-5 rounded-wf-xs flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                    title="Remove Folio">
                                                    <Trash2 :size="12" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <!-- Empty Search Results -->
            <div v-else class="text-center py-12 px-4 space-y-1">
                <p class="text-xs font-semibold text-wf-text-primary">No matching mutual fund holdings</p>
                <p class="text-[11px] text-wf-text-muted">Try clearing your filters or search query, or import your CAS statement.
                </p>
            </div>

            <!-- Custom Compact Pagination (Aether V4 Standard) -->
            <div
                class="p-3 px-4 sm:px-5 border-t border-wf-border bg-wf-surface flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <div class="text-[11px] text-wf-text-muted">
                    Showing <span class="font-semibold text-wf-text-primary">{{ filteredHoldings.length ? (currentPage - 1) * pageSize + 1 : 0 }}</span>
                    to <span class="font-semibold text-wf-text-primary">{{ Math.min(currentPage * pageSize, filteredHoldings.length) }}</span>
                    of <span class="font-semibold text-wf-text-primary">{{ filteredHoldings.length }}</span> holdings
                </div>

                <div class="flex items-center gap-2">
                    <!-- Page Size Selector -->
                    <div class="flex items-center gap-1 text-[11px] text-wf-text-muted">
                        <span>Rows:</span>
                        <select v-model="pageSize"
                            class="h-6.5 px-2 rounded-wf-xs border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary text-[11px] font-semibold focus:outline-none focus:border-wf-primary cursor-pointer">
                            <option :value="10">10</option>
                            <option :value="25">25</option>
                            <option :value="50">50</option>
                        </select>
                    </div>

                    <!-- Navigation Controls -->
                    <div class="flex items-center gap-1">
                        <button type="button" :disabled="currentPage === 1" @click="currentPage--"
                            class="h-6.5 w-6.5 rounded-wf-xs border border-wf-border bg-wf-surface-variant/30 hover:bg-wf-surface-variant flex items-center justify-center text-wf-text-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            title="Previous Page">
                            <ChevronLeft :size="13" />
                        </button>
                        <span class="px-2 text-[11px] font-semibold text-wf-text-primary">
                            {{ currentPage }} / {{ totalPages }}
                        </span>
                        <button type="button" :disabled="currentPage === totalPages" @click="currentPage++"
                            class="h-6.5 w-6.5 rounded-wf-xs border border-wf-border bg-wf-surface-variant/30 hover:bg-wf-surface-variant flex items-center justify-center text-wf-text-secondary disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            title="Next Page">
                            <ChevronRight :size="13" />
                        </button>
                    </div>
                </div>
            </div>
        </WfCard>

        <!-- Modals -->
        <LinkGoalModal v-model="showLinkGoalModal" :holding="selectedHolding" @saved="fetchPortfolio" />
        <DeleteHoldingDeepDiveModal v-model="showDeleteModal" :holding="selectedHolding" :loading="isManagementLoading"
            @delete-holding="handleDeleteHolding" @delete-transactions="handleBulkDelete" />
    </div>
</template>

<style scoped>
.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.status-online {
    background-color: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-syncing {
    background-color: #6366f1;
    animation: pulse 1.5s infinite;
}

.status-error {
    background-color: #ef4444;
}

@keyframes pulse {
    0% { transform: scale(0.9); opacity: 0.7; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.7; }
}
</style>
