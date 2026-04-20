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
    Sparkles, Zap, RefreshCw, ZapOff
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import InvestModal from './mutual-funds/modals/InvestModal.vue'
import RedeemModal from './mutual-funds/modals/RedeemModal.vue'
import LinkGoalModal from './mutual-funds/modals/LinkGoalModal.vue'
import DeleteHoldingDeepDiveModal from './mutual-funds/modals/DeleteHoldingDeepDiveModal.vue'
import DeleteTransactionModal from './mutual-funds/modals/DeleteTransactionModal.vue'
import EditTransactionModal from './mutual-funds/modals/EditTransactionModal.vue'
import { Trash2, Edit } from 'lucide-vue-next'

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

// New Management Modals
const showDeepDiveModal = ref(false)
const showEditTxnModal = ref(false)
const showDeleteTxnModal = ref(false)
const activeTransaction = ref<any>(null)
const isManagementLoading = ref(false)
const isTimelineLoading = ref(true)
const isAiLoading = ref(false)
const aiInsights = ref<any>(null)
const aiError = ref<string | null>(null)
const benchmarkData = ref<any[]>([])

// Family Members for Ownership
const familyMembers = computed(() => authStore.familyMembers || [])
const searchQuery = ref('')

async function fetchHoldingDetails() {
    isLoading.value = true
    try {
        let res;
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
        fetchHoldingDetails() // Refresh to get correct aggregate state if needed
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
    fetchAiInsights()
}

async function fetchAiInsights(forceRefresh: boolean = false) {
    isAiLoading.value = true
    aiError.value = null
    try {
        const res = await financeApi.getHoldingInsights(holdingId, forceRefresh)
        aiInsights.value = res.data?.insights
        aiError.value = null
    } catch (e: any) {
        console.error("Failed to fetch AI insights", e)
        aiError.value = e.response?.data?.detail || "AI Advisor is temporarily overwhelmed. Please try again later."
    } finally {
        isAiLoading.value = false
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
        // For individual funds, we use the portfolio timeline API but filter for this specific item
        const res = await financeApi.getPerformanceTimeline('1y', '1d', undefined, isSchemeCode ? holdingId : undefined, isSchemeCode ? undefined : holdingId)

        // Store full timeline for chart (Value, Invested) AND Benchmark
        timelineData.value = res.data?.timeline || []
        benchmarkData.value = res.data?.benchmark || []

    } catch (e) {
        console.error("Failed to fetch timeline", e)
    } finally {
        isTimelineLoading.value = false
    }
}

const formattedSummary = computed(() => {
    if (!aiInsights.value?.summary) return ''
    return marked.parse(aiInsights.value.summary)
})

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

onMounted(() => {
    fetchHoldingDetails()
    fetchPerformanceTimeline()
    fetchAiInsights()
})

function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Filtered Users
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
        <v-container fluid class="page-container">
            <!-- Mesh Background -->
            <div class="mesh-blob blob-1"></div>
            <div class="mesh-blob blob-2"></div>

            <div class="relative-pos z-10" v-if="holding">
                <!-- Header -->
                <div class="d-flex flex-column flex-md-row justify-space-between align-md-center gap-4 mb-6">
                    <div class="d-flex align-center gap-4">
                        <v-btn icon variant="tonal" rounded="lg" color="primary" @click="router.back()">
                            <ChevronLeft :size="24" />
                        </v-btn>
                        <div>
                            <h1 class="text-h6 font-weight-black text-content line-clamp-1">{{ holding.scheme_name }}
                            </h1>
                            <div class="d-flex align-center gap-3 mt-1 flex-wrap">
                                <v-chip size="x-small" label color="primary" variant="tonal" class="font-weight-black">
                                    {{ holding.category || 'Mutual Fund' }}
                                </v-chip>
                                <div
                                    class="d-flex align-center gap-1 text-caption font-weight-bold text-medium-emphasis">
                                    <Fingerprint :size="14" class="opacity-60" />
                                    <span>{{ holding.scheme_code }}</span>
                                </div>
                                <div v-if="holding.isin_growth"
                                    class="d-flex align-center gap-1 text-caption font-weight-bold text-medium-emphasis">
                                    <Globe :size="14" class="opacity-60" />
                                    <span>{{ holding.isin_growth }} (Growth)</span>
                                </div>
                                <div v-if="holding.fund_house"
                                    class="d-flex align-center gap-1 text-caption font-weight-bold text-medium-emphasis">
                                    <Briefcase :size="14" class="opacity-60" />
                                    <span>{{ holding.fund_house }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex align-center gap-2">
                        <v-btn color="error" variant="tonal" class="font-weight-bold" @click="showDeepDiveModal = true">
                            Remove Records
                        </v-btn>
                        <v-btn color="primary" variant="tonal" class="font-weight-bold px-6"
                            @click="showRedeemModal = true">
                            Redeem
                        </v-btn>
                        <v-btn color="primary" class="font-weight-bold px-8 shadow-lg" @click="showInvestModal = true">
                            Invest More
                        </v-btn>
                    </div>
                </div>

                <v-row>
                    <!-- Left Column: Chart & Stats -->
                    <v-col cols="12" lg="8">
                        <!-- KPI Row -->
                        <v-row class="mb-4">
                            <v-col cols="12" sm="4">
                                <v-card class="premium-glass-card pa-4 h-100" rounded="xl">
                                    <div class="text-overline text-medium-emphasis font-weight-bold mb-1">Invested Value
                                    </div>
                                    <div class="text-h5 font-weight-black text-content">{{
                                        formatAmount(holding.invested_value) }}</div>
                                </v-card>
                            </v-col>
                            <v-col cols="12" sm="4">
                                <v-card class="premium-glass-card pa-4 h-100 border-primary border-opacity-10"
                                    rounded="xl">
                                    <div class="text-overline text-primary font-weight-bold mb-1">Current Value</div>
                                    <div class="text-h5 font-weight-black text-content">{{
                                        formatAmount(holding.current_value) }}</div>
                                </v-card>
                            </v-col>
                            <v-col cols="12" sm="4">
                                <v-card class="premium-glass-card pa-4 h-100" rounded="xl">
                                    <div class="text-overline text-medium-emphasis font-weight-bold mb-1">Absolute
                                        Returns</div>
                                    <div class="d-flex align-center gap-2">
                                        <div class="text-h5 font-weight-black"
                                            :class="holding.profit_loss >= 0 ? 'text-success' : 'text-error'">
                                            {{ holding.profit_loss >= 0 ? '+' : '' }}{{
                                                formatAmount(holding.profit_loss) }}
                                        </div>
                                        <v-chip size="x-small" :color="holding.profit_loss >= 0 ? 'success' : 'error'"
                                            variant="tonal" class="font-weight-black">
                                            {{ ((holding.profit_loss / (holding.invested_value || 1)) * 100).toFixed(2)
                                            }}%
                                        </v-chip>
                                    </div>
                                </v-card>
                            </v-col>
                        </v-row>

                        <v-card class="premium-glass-card pa-6 mb-6" rounded="xl">
                            <div class="d-flex align-center justify-space-between mb-6">
                                <h3 class="text-subtitle-1 font-weight-black text-content d-flex align-center gap-2">
                                    <TrendingUp :size="20" class="text-primary" /> Portfolio Growth
                                </h3>
                                <div class="text-caption font-weight-bold text-medium-emphasis">
                                    Showing history from {{ formatDate((holding.nav_history &&
                                        holding.nav_history.length) ? holding.nav_history[0].date : '') }}
                                </div>
                            </div>

                            <!-- Chart Area -->
                            <div style="height: 380px;">
                                <div v-if="isTimelineLoading" class="d-flex align-center justify-center h-100 flex-column animate-fade-in">
                                    <v-progress-circular indeterminate color="primary" size="48" width="3" />
                                    <div class="text-caption mt-4 font-weight-bold opacity-40">Calculating Growth...</div>
                                </div>
                                
                                <template v-else>
                                    <FundPerformanceChart v-if="chartData.length" :data="chartData" :markers="chartMarkers"
                                        :benchmark="benchmarkData" />
                                    <div v-else
                                        class="d-flex align-center justify-center h-100 text-medium-emphasis font-weight-bold">
                                        No history available for simulation
                                    </div>
                                </template>
                            </div>
                        </v-card>

                        <!-- Transactions History -->
                        <div class="mb-4">
                            <h3 class="text-h6 font-weight-black mb-4 d-flex align-center gap-2">
                                <History :size="20" class="text-primary" /> Activity History
                            </h3>
                            <v-card class="premium-glass-card" rounded="xl">
                                <v-table class="bg-transparent">
                                    <thead>
                                        <tr>
                                            <th
                                                class="text-caption font-weight-bold text-medium-emphasis text-uppercase">
                                                Date</th>
                                            <th
                                                class="text-caption font-weight-bold text-medium-emphasis text-uppercase">
                                                Type</th>
                                            <th
                                                class="text-right text-caption font-weight-bold text-medium-emphasis text-uppercase">
                                                Units</th>
                                            <th
                                                class="text-right text-caption font-weight-bold text-medium-emphasis text-uppercase">
                                                NAV</th>
                                            <th
                                                class="text-right text-caption font-weight-bold text-medium-emphasis text-uppercase">
                                                Amount</th>
                                            <th class="text-right text-caption font-weight-bold text-medium-emphasis text-uppercase">
                                                Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="t in transactions" :key="t.id" class="hover-row transition-colors">
                                            <td class="font-weight-bold text-body-2">{{ formatDate(t.date) }}</td>
                                            <td>
                                                <v-chip size="x-small" :color="t.type === 'BUY' ? 'success' : 'error'"
                                                    variant="tonal" class="font-weight-black">
                                                    {{ t.type }}
                                                </v-chip>
                                            </td>
                                            <td class="text-right font-weight-medium text-body-2">{{
                                                Number(t.units).toFixed(3) }}</td>
                                            <td class="text-right font-weight-medium text-body-2">{{ formatAmount(t.nav)
                                            }}</td>
                                            <td class="text-right font-weight-black text-body-2">{{
                                                formatAmount(t.amount) }}</td>
                                            <td class="text-right">
                                                <div class="d-flex justify-end gap-1">
                                                    <v-btn icon variant="text" size="x-small" color="primary" @click="openEditTxn(t)">
                                                        <Edit :size="14" />
                                                    </v-btn>
                                                    <v-btn icon variant="text" size="x-small" color="error" @click="openDeleteTxn(t)">
                                                        <Trash2 :size="14" />
                                                    </v-btn>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="!transactions.length">
                                            <td colspan="5"
                                                class="text-center py-6 text-medium-emphasis font-weight-medium">
                                                No transactions found
                                            </td>
                                        </tr>
                                    </tbody>
                                </v-table>
                            </v-card>
                        </div>
                    </v-col>

                    <!-- Right Column: Goals, Attribution, Controls -->
                    <v-col cols="12" lg="4">
                        <!-- Goal Linking Card (New feature restoration) -->
                        <v-card class="premium-glass-card pa-6 mb-6" rounded="xl">
                            <div class="d-flex align-center justify-space-between mb-4">
                                <h3 class="text-subtitle-1 font-weight-black text-content d-flex align-center gap-2">
                                    <Target :size="20" class="text-primary" /> Linked Goal
                                </h3>
                                <v-btn icon variant="text" size="small" color="primary" @click="showGoalModal = true">
                                    <Edit2 :size="16" />
                                </v-btn>
                            </div>

                            <div v-if="holding.goal"
                                class="goal-preview-box pa-4 rounded-xl border border-primary border-opacity-10 bg-primary bg-opacity-5">
                                <div class="d-flex align-center gap-4">
                                    <v-avatar :style="{ background: holding.goal.color + '20' }" rounded="lg" size="48">
                                        <span class="text-h5" :style="{ color: holding.goal.color }">{{
                                            holding.goal.icon }}</span>
                                    </v-avatar>
                                    <div>
                                        <div class="text-subtitle-1 font-weight-black text-content">{{ holding.goal.name
                                            }}</div>
                                        <div class="text-caption font-weight-bold opacity-60">TARGET: {{
                                            formatAmount(holding.goal.target_amount) }}</div>
                                    </div>
                                </div>
                                <v-progress-linear
                                    :model-value="(holding.current_value / holding.goal.target_amount) * 100"
                                    color="primary" height="6" rounded="pill" class="mt-4" />
                                <div class="d-flex justify-space-between mt-1">
                                    <span class="text-caption font-weight-bold text-primary">Contribution</span>
                                    <span class="text-caption font-weight-bold text-primary">
                                        {{ ((holding.current_value / holding.goal.target_amount) * 100).toFixed(1) }}%
                                    </span>
                                </div>
                            </div>
                            <div v-else
                                class="text-center py-6 px-4 rounded-xl border-dashed border-opacity-20 border-primary">
                                <AlertCircle :size="32" class="text-medium-emphasis opacity-20 mb-2 mx-auto d-block" />
                                <div class="text-caption font-weight-bold text-medium-emphasis mb-4">
                                    Not linked to any goal. Link it to track progress.
                                </div>
                                <v-btn variant="tonal" size="small" color="primary" class="font-weight-bold text-none"
                                    @click="showGoalModal = true">
                                    Connect to Goal
                                </v-btn>
                            </div>
                        </v-card>

                        <!-- Ownership Details -->
                        <v-card class="premium-glass-card pa-6 mb-6" rounded="xl">
                            <div class="d-flex align-center justify-space-between mb-4">
                                <h3 class="text-subtitle-1 font-weight-black text-content d-flex align-center gap-2">
                                    <Shield :size="20" class="text-primary" /> Ownership
                                </h3>
                                <v-btn icon variant="text" size="small" color="primary" @click="showUserModal = true">
                                    <Edit2 :size="16" />
                                </v-btn>
                            </div>

                            <div class="d-flex align-center gap-4 p-1">
                                <v-avatar color="primary" size="48" variant="tonal" rounded="lg">
                                    <img v-if="isImageUrl(holding.user_avatar)" :src="holding.user_avatar" alt="User" />
                                    <span v-else class="text-h6 font-weight-bold">{{ holding.user_name?.charAt(0)
                                        }}</span>
                                </v-avatar>
                                <div>
                                    <div class="text-subtitle-1 font-weight-black text-content">{{ holding.user_name ||
                                        'Unassigned' }}</div>
                                    <div class="text-caption font-weight-bold opacity-60">Assigned Member</div>
                                </div>
                            </div>

                            <v-divider class="my-4" opacity="5" />

                            <div class="space-y-4">
                                <div class="d-flex justify-space-between align-center">
                                    <div
                                        class="d-flex align-center gap-2 text-caption font-weight-bold text-medium-emphasis">
                                        <History :size="14" /> Last Updated
                                    </div>
                                    <div class="text-caption font-weight-bold text-content">
                                        {{ formatDate(holding.last_updated_at) }}
                                    </div>
                                </div>
                                <div class="d-flex justify-space-between align-center mt-2">
                                    <div class="text-caption font-weight-bold text-medium-emphasis">Folio Number</div>
                                    <div class="text-caption font-weight-bold text-content font-mono">{{
                                        holding.folio_number || 'N/A' }}</div>
                                </div>
                            </div>
                        </v-card>
                        <!-- Additional Stats -->
                        <v-card class="premium-glass-card pa-6 mb-6" rounded="xl">
                            <h3 class="text-subtitle-1 font-weight-black text-content d-flex align-center gap-2 mb-4">
                                <AlertCircle :size="20" class="text-primary" /> Key Metrics
                            </h3>
                            <div class="space-y-3">
                                <div class="d-flex justify-space-between align-center">
                                    <span class="text-caption font-weight-bold text-medium-emphasis">Avg Purchase
                                        Price</span>
                                    <span class="text-caption font-weight-bold text-content">{{
                                        formatAmount(holding.average_price) }}</span>
                                </div>
                                <div class="d-flex justify-space-between align-center">
                                    <span class="text-caption font-weight-bold text-medium-emphasis">XIRR
                                        (Personal)</span>
                                    <span class="text-caption font-weight-bold"
                                        :class="holding.xirr >= 0 ? 'text-success' : 'text-error'">
                                        {{ holding.xirr ? holding.xirr.toFixed(2) + '%' : 'N/A' }}
                                    </span>
                                </div>
                                <div class="d-flex justify-space-between align-center">
                                    <span class="text-caption font-weight-bold text-medium-emphasis">Current
                                        Units</span>
                                    <span class="text-caption font-weight-bold text-content">{{ holding.units.toFixed(3)
                                    }}</span>
                                </div>
                            </div>
                        </v-card>

                        <!-- AI Advisor Insights -->
                        <v-card class="premium-glass-card pa-0 mb-6 overflow-hidden" rounded="xl" v-if="holding">
                            <div class="pa-6 pb-0">
                                <div class="d-flex align-center justify-space-between mb-4">
                                    <h3 class="text-subtitle-1 font-weight-black text-content d-flex align-center gap-2">
                                        <Sparkles :size="20" class="text-primary" /> AI Advisor
                                    </h3>
                                    <v-btn icon variant="text" size="small" color="primary" @click="fetchAiInsights(true)" :loading="isAiLoading">
                                        <RefreshCw :size="16" :class="{ 'animate-spin': isAiLoading }" />
                                    </v-btn>
                                </div>

                                <!-- Loading State -->
                                <div v-if="isAiLoading" class="py-8 d-flex flex-column align-center justify-center">
                                    <v-progress-circular indeterminate color="primary" size="32" width="3" />
                                    <div class="text-caption mt-4 font-weight-bold opacity-40">Synthesizing Brief...</div>
                                </div>

                                <!-- Error State -->
                                <div v-else-if="aiError && !aiInsights" class="py-8 px-6 d-flex flex-column align-center text-center">
                                    <div class="pa-4 rounded-circle bg-warning-light mb-4">
                                        <ZapOff :size="28" class="text-warning" />
                                    </div>
                                    <div class="text-body-2 font-weight-bold text-content mb-2">Advisor Overwhelmed</div>
                                    <div class="text-caption opacity-60 mb-4">{{ aiError }}</div>
                                    <v-btn variant="tonal" size="small" color="primary" rounded="pill" @click="fetchAiInsights(true)">
                                        Retry Analysis
                                    </v-btn>
                                </div>

                                <template v-else-if="aiInsights">
                                    <!-- Highlights Grid -->
                                    <div class="d-flex flex-column gap-3 mb-6">
                                        <div
                                            v-for="insight in aiInsights.highlights"
                                            :key="insight.id"
                                            class="pa-4 rounded-xl border transition-all hover-translate-x"
                                            :style="{
                                                background: getInsightColor(insight.type),
                                                borderColor: getInsightBorderColor(insight.type)
                                            }"
                                        >
                                            <div class="d-flex gap-3 align-start">
                                                <span class="text-h6">{{ insight.icon }}</span>
                                                <div>
                                                    <div class="text-caption font-weight-black text-uppercase letter-spacing-1 mb-1">
                                                        {{ insight.title }}
                                                    </div>
                                                    <div class="text-body-2 font-weight-medium line-height-tight opacity-80">
                                                        {{ insight.content }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Summary Content -->
                                    <div class="pa-6 pt-0 mf-ai-markdown" v-html="formattedSummary"></div>
                                    
                                    <!-- Suggestions Section -->
                                    <div class="pa-6 pt-0" v-if="aiInsights.suggestions && aiInsights.suggestions.length">
                                        <v-divider class="mb-4" opacity="5" />
                                        <div class="text-overline font-weight-black text-primary mb-3">Tactical Moves</div>
                                        <div class="d-flex flex-column gap-3">
                                            <div v-for="suggestion in aiInsights.suggestions" :key="suggestion.id" class="d-flex gap-2">
                                                <Zap :size="14" class="text-primary mt-1 flex-shrink-0" />
                                                <div>
                                                    <div class="text-caption font-weight-black text-content">{{ suggestion.title }}</div>
                                                    <div class="text-caption font-weight-medium opacity-60">{{ suggestion.content }}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </v-card>
                    </v-col>
                </v-row>
            </div>

            <div v-if="isLoading && !holding" class="d-flex align-center justify-center h-screen-50">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            </div>
        </v-container>

        <!-- Link Goal Modal -->
        <LinkGoalModal v-model="showGoalModal" :holding="holding" @success="fetchHoldingDetails" />

        <!-- User Selection Dialog -->
        <v-dialog v-model="showUserModal" max-width="400">
            <v-card class="premium-glass-card pa-4" rounded="xl">
                <v-card-title class="font-weight-black">Assign Owner</v-card-title>
                <v-text-field v-model="searchQuery" placeholder="Search members..." density="comfortable"
                    variant="outlined" rounded="lg" class="mt-2">
                    <template v-slot:prepend-inner>
                        <Search :size="18" class="text-medium-emphasis mr-2" />
                    </template>
                </v-text-field>
                <v-list bg-color="transparent">
                    <v-list-item v-for="user in filteredUsers" :key="user.id" @click="updateOwner(user.id)" rounded="lg"
                        class="mb-1">
                        <template v-slot:prepend>
                            <v-avatar size="32" color="primary" variant="tonal">
                                <img v-if="isImageUrl(user.avatar)" :src="user.avatar" />
                                <span v-else>{{ user.avatar || user.full_name[0] }}</span>
                            </v-avatar>
                        </template>
                        <v-list-item-title class="font-weight-bold">{{ user.full_name }}</v-list-item-title>
                        <template v-slot:append>
                            <Check v-if="holding?.user_id === user.id" :size="20" class="text-primary" />
                        </template>
                    </v-list-item>
                </v-list>
            </v-card>
        </v-dialog>

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

        <!-- Modals -->
        <InvestModal v-model="showInvestModal" :fund="holding" @success="fetchHoldingDetails" />
        <RedeemModal v-model="showRedeemModal" :holding="holding" @success="fetchHoldingDetails" />

    </MainLayout>
</template>



<style scoped>
.page-container {
    min-height: calc(100vh - 64px);
}

.relative-pos {
    position: relative;
}

.z-10 {
    z-index: 10;
}

.mesh-blob {
    position: absolute;
    filter: blur(80px);
    opacity: 0.15;
    border-radius: 50%;
    z-index: 0;
}

.blob-1 {
    background: rgb(var(--v-theme-primary));
    width: 500px;
    height: 500px;
    top: -100px;
    right: -100px;
}

.blob-2 {
    background: rgb(var(--v-theme-secondary));
    width: 400px;
    height: 400px;
    bottom: 0;
    left: 0;
}

.premium-glass-card {
    background: rgba(var(--v-theme-surface), 0.7) !important;
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(var(--v-border-color), 0.15) !important;
    box-shadow: none !important;
}

.hover-bg:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.05) !important;
}

.hover-row:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.02);
}

.bg-error-light {
    background: rgba(var(--v-theme-error), 0.1);
    padding: 1rem;
}

.text-gradient {
    background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #6366f1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.hover-translate-x:hover {
    transform: translateX(4px);
}

.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.letter-spacing-1 {
    letter-spacing: 0.5px;
}

/* AI Markdown Styling */
.mf-ai-markdown {
    font-size: 0.85rem;
    line-height: 1.6;
    color: rgba(var(--v-theme-on-surface), 0.8);
}

.mf-ai-markdown :deep(h3) {
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    font-weight: 900;
    font-size: 0.85rem;
    color: rgb(var(--v-theme-primary));
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 6px;
}

.mf-ai-markdown :deep(strong) {
    color: rgb(var(--v-theme-primary));
    font-weight: 900;
}

.mf-ai-markdown :deep(p) {
    margin-bottom: 0.75rem;
}

.mf-ai-markdown :deep(ul) {
    padding-left: 1.25rem;
    margin-bottom: 0.75rem;
}

.mf-ai-markdown :deep(li) {
    margin-bottom: 4px;
}
</style>
