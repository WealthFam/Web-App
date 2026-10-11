<template>
    <MainLayout>
        <div class="space-y-5">
            <!-- Back to Sources Navigation -->
            <div>
                <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-xs font-semibold text-wf-text-muted hover:text-wf-text-primary transition-colors cursor-pointer"
                    @click="router.back()"
                >
                    <ChevronLeft :size="16" />
                    <span>Back to Sources</span>
                </button>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3">
                <div class="w-8 h-8 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
                <span class="text-xs font-medium text-wf-text-muted">Loading account telemetry...</span>
            </div>

            <!-- Account Content -->
            <div v-else-if="account" class="space-y-5">
                <!-- Header: Icon, Identity, Actions -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
                    <div class="flex items-start sm:items-center gap-3.5">
                        <div class="w-12 h-12 rounded-wf-xl flex items-center justify-center shrink-0" :class="iconBadgeStyle">
                            <component :is="getAccountTypeIcon(account.type)" :size="24" />
                        </div>
                        <div>
                            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary">
                                {{ account.name }}
                            </h1>
                            <div class="flex items-center flex-wrap gap-2 text-xs text-wf-text-muted mt-1">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" :class="iconBadgeStyle">
                                    {{ account.type.replace('_', ' ') }}
                                </span>
                                <span v-if="account.account_mask" class="font-mono text-[10px] bg-wf-surface-variant text-wf-text-secondary px-1.5 py-0.5 rounded">
                                    ••{{ account.account_mask }}
                                </span>
                                <span class="opacity-40">•</span>
                                <span class="text-xs text-wf-text-muted font-medium">
                                    Owned by {{ getOwnerName(account.owner_id) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-2 flex-wrap">
                        <WfButton
                            variant="primary"
                            size="sm"
                            @click="openAddModal"
                        >
                            <Plus :size="14" class="mr-1" />
                            <span>Add Transaction</span>
                        </WfButton>

                        <WfButton
                            v-if="account.type === 'CREDIT_CARD'"
                            variant="secondary"
                            size="sm"
                            @click="showPayBillModal = true"
                        >
                            <DollarSign :size="14" class="mr-1" />
                            <span>Pay Bill</span>
                        </WfButton>

                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="showEditModal = true"
                        >
                            <Edit2 :size="14" class="mr-1" />
                            <span>Edit</span>
                        </WfButton>

                        <WfButton
                            variant="ghost"
                            size="sm"
                            class="text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            @click="handleDelete"
                        >
                            <Trash2 :size="14" class="mr-1" />
                            <span>Delete</span>
                        </WfButton>
                    </div>
                </div>

                <!-- 4 Summary Stats Metric Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <WfCard
                        v-for="stat in summaryStats"
                        :key="stat.label"
                        variant="flat"
                        padding="md"
                        radius="xl"
                        class="border border-wf-border flex flex-col justify-between"
                    >
                        <div>
                            <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                                {{ stat.label }}
                            </div>
                            <div
                                class="text-xl sm:text-2xl font-bold font-mono tracking-tight mt-1"
                                :class="[
                                    stat.color === 'error' ? 'text-rose-600 dark:text-rose-400' : '',
                                    stat.color === 'success' ? 'text-emerald-600 dark:text-emerald-400' : '',
                                    stat.color === 'primary' ? 'text-wf-text-primary' : '',
                                    !stat.color ? 'text-wf-text-primary' : ''
                                ]"
                            >
                                {{ formatAmount(stat.value) }}
                            </div>
                        </div>
                        <div v-if="stat.subtext" class="text-[11px] text-wf-text-muted mt-2 pt-2 border-t border-wf-border-subtle">
                            {{ stat.subtext }}
                        </div>
                    </WfCard>
                </div>

                <!-- Analysis & Spending Trend Section -->
                <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border space-y-4">
                    <!-- Chart Controls Toolbar -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm font-bold text-wf-text-primary">Spending Trend</h3>
                            <span class="text-xs font-mono font-medium text-wf-text-muted">
                                Total: {{ formatAmount(totalPeriodSpend) }}
                            </span>
                        </div>

                        <div class="flex items-center gap-2 flex-wrap">
                            <!-- Period Filter Tabs -->
                            <div class="flex items-center p-0.5 bg-wf-surface-variant/60 rounded-wf-md border border-wf-border text-xs font-semibold">
                                <button
                                    v-for="p in periodOptions"
                                    :key="p.value"
                                    type="button"
                                    class="px-2.5 py-1 rounded-wf-sm transition-all cursor-pointer"
                                    :class="periodFilter === p.value
                                        ? 'bg-wf-surface text-wf-text-primary shadow-2xs font-bold'
                                        : 'text-wf-text-muted hover:text-wf-text-primary'"
                                    @click="periodFilter = p.value"
                                >
                                    {{ p.label }}
                                </button>
                            </div>

                            <!-- Custom Date Range Inputs -->
                            <div v-if="periodFilter === 'custom'" class="flex items-center gap-1.5">
                                <input
                                    v-model="customRange.start"
                                    type="date"
                                    class="h-7 text-xs bg-wf-surface border border-wf-border rounded-wf-md px-2 text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
                                />
                                <span class="text-xs text-wf-text-muted">to</span>
                                <input
                                    v-model="customRange.end"
                                    type="date"
                                    class="h-7 text-xs bg-wf-surface border border-wf-border rounded-wf-md px-2 text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Chart Canvas -->
                    <div class="h-64 sm:h-72 relative">
                        <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
                        <div v-else class="flex items-center justify-center h-full text-xs text-wf-text-muted">
                            No spending activity in selected window
                        </div>
                    </div>
                </WfCard>

                <!-- Transactions History Section -->
                <div class="space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <Landmark :size="18" class="text-wf-primary" />
                            <h2 class="text-base font-bold text-wf-text-primary">Transaction History</h2>
                            <span class="text-xs font-mono text-wf-text-muted">({{ totalTransactions }})</span>
                        </div>

                        <!-- Search Bar -->
                        <div class="relative w-full sm:w-72">
                            <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-wf-text-muted pointer-events-none" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                placeholder="Search account transactions..."
                                class="w-full h-8 pl-9 pr-8 text-xs bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary transition-colors"
                                @input="fetchTransactions"
                            />
                            <button
                                v-if="searchQuery"
                                type="button"
                                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-wf-text-muted hover:text-wf-text-primary p-0.5 rounded cursor-pointer"
                                aria-label="Clear search"
                                @click="searchQuery = ''; fetchTransactions()"
                            >
                                <X :size="13" />
                            </button>
                        </div>
                    </div>

                    <!-- Transaction Table Card -->
                    <WfCard variant="flat" padding="none" radius="xl" class="border border-wf-border overflow-hidden">
                        <TransactionTable
                            hide-actions
                            :show-select="false"
                            :transactions="transactions"
                            :total="totalTransactions"
                            :loading="txLoading"
                            :page-size="limit"
                            :page="page"
                            :selected-ids="new Set()"
                            :accounts="financeStore.accounts"
                            :categories="financeStore.categories"
                            :expense-groups="[]"
                            @optionsUpdate="fetchTransactions"
                        />
                    </WfCard>
                </div>
            </div>

            <!-- Empty / Not Found State -->
            <div v-else class="text-center py-20 animate-in">
                <div class="w-16 h-16 rounded-full bg-wf-surface-variant text-wf-text-muted flex items-center justify-center mx-auto mb-4">
                    <Landmark :size="32" class="opacity-40" />
                </div>
                <h3 class="text-base font-bold text-wf-text-primary">Account not found</h3>
                <p class="text-xs text-wf-text-muted mt-1 mb-4">This account may have been deleted or reassigned.</p>
                <WfButton variant="outline" size="sm" @click="router.push('/accounts')">
                    Go back to accounts
                </WfButton>
            </div>

            <!-- Modals Suite -->
            <!-- 1. Account Edit Modal -->
            <AccountEditModal
                v-model="showEditModal"
                :account="account"
                :family-members="familyMembers"
                @saved="refreshAll"
            />

            <!-- 2. Delete Confirmation Dialog -->
            <WfModal
                v-model="showDeleteAccountConfirm"
                max-width="sm"
                title="Delete Account?"
                description="Irreversible Action"
            >
                <div class="space-y-4 py-1">
                    <div class="p-3.5 rounded-wf-md bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <Trash2 :size="20" class="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div class="text-xs text-wf-text-primary">
                            Are you sure you want to permanently delete <strong class="text-rose-600 dark:text-rose-400">{{ account?.name }}</strong>? All associated transactions will be removed.
                        </div>
                    </div>
                </div>

                <template #footer>
                    <div class="flex items-center justify-end gap-2 w-full">
                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="showDeleteAccountConfirm = false"
                        >
                            Cancel
                        </WfButton>
                        <WfButton
                            variant="danger"
                            size="sm"
                            :loading="deleting"
                            @click="confirmDeleteAccount"
                        >
                            <Trash2 :size="13" class="mr-1" />
                            <span>Delete Forever</span>
                        </WfButton>
                    </div>
                </template>
            </WfModal>

            <!-- 3. Add Transaction Modal -->
            <TransactionModal 
                :isOpen="showModal" 
                :isEditing="isEditing" 
                :form="form" 
                :accounts="financeStore.accounts"
                :categories="financeStore.categories" 
                :budgets="budgetStore.budgets" 
                :expenseGroups="[]"
                :potentialMatches="potentialMatches" 
                :isSearchingMatches="isSearchingMatches"
                :matchesSearched="matchesSearched" 
                @close="showModal = false" 
                @submit="handleSubmit"
                @findMatches="findMatches" 
            />

            <!-- 4. Smart Prompt Modal -->
            <SmartPromptModal 
                :isOpen="showSmartPrompt" 
                :data="smartPromptData" 
                @close="showSmartPrompt = false"
                @confirm="handleSmartCategorize" 
            />

            <!-- 5. Pay Bill Modal -->
            <WfModal
                v-model="showPayBillModal"
                max-width="md"
                title="Pay Credit Bill"
                :description="`${account?.name} · Outstanding ${formatAmount(account?.balance || 0)}`"
            >
                <form @submit.prevent="handlePayBillSubmit" class="space-y-4 py-1">
                    <WfSelect
                        v-model="payBillForm.source_account_id"
                        label="Pay From Bank Account"
                        :items="bankAccountsItems"
                        placeholder="Select bank account"
                    />

                    <div class="grid grid-cols-2 gap-3">
                        <WfInput
                            v-model.number="payBillForm.amount"
                            type="number"
                            label="Amount (₹)"
                            placeholder="0.00"
                        />
                        <WfInput
                            v-model="payBillForm.date"
                            type="date"
                            label="Payment Date"
                        />
                    </div>

                    <div class="flex items-center justify-between p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
                        <div>
                            <div class="text-xs font-semibold text-wf-text-primary">Record Transaction</div>
                            <div class="text-[11px] text-wf-text-muted">Automatically debit from source bank account</div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="payBillForm.record_transaction" class="sr-only peer" />
                            <div class="w-9 h-5 bg-wf-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-wf-primary"></div>
                        </label>
                    </div>
                </form>

                <template #footer>
                    <div class="flex items-center justify-end gap-2 w-full">
                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="showPayBillModal = false"
                        >
                            Cancel
                        </WfButton>
                        <WfButton
                            variant="primary"
                            size="sm"
                            :loading="submittingPayBill"
                            :disabled="!payBillForm.source_account_id || !payBillForm.amount"
                            @click="handlePayBillSubmit"
                        >
                            Confirm Payment
                        </WfButton>
                    </div>
                </template>
            </WfModal>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import { useFinanceStore } from '@/stores/finance'
import { useBudgetStore } from '@/stores/finance/budgets'
import { useTransactionModals } from '@/composables/useTransactionModals'
import {
    ChevronLeft, Edit2, Trash2, DollarSign,
    Landmark, CreditCard, Banknote, Wallet, TrendingUp, Plus, Search, X
} from 'lucide-vue-next'
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, PointElement, LineElement
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import AccountEditModal from '@/components/finance/AccountEditModal.vue'
import TransactionTable from '@/components/transactions/TransactionTable.vue'
import TransactionModal from '@/views/transactions/TransactionModal.vue'
import SmartPromptModal from '@/components/SmartPromptModal.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement)

const route = useRoute()
const router = useRouter()
const { formatAmount } = useCurrency()
const notify = useNotificationStore()
const auth = useAuthStore()
const financeStore = useFinanceStore()
const budgetStore = useBudgetStore()

// --- State ---
const account = ref<any>(null)
const intelligence = ref<any>(null)
const loading = ref(true)
const transactions = ref<any[]>([])
const chartTransactions = ref<any[]>([])
const txLoading = ref(false)
const totalTransactions = ref(0)
const page = ref(1)
const limit = ref(50)
const searchQuery = ref('')

const periodFilter = ref('current')
const customRange = reactive({
    start: '',
    end: new Date().toISOString().split('T')[0]
})

const showEditModal = ref(false)
const showPayBillModal = ref(false)
const showDeleteAccountConfirm = ref(false)
const deleting = ref(false)
const submittingPayBill = ref(false)
const payBillForm = ref({
    source_account_id: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    record_transaction: true
})

const allAccounts = ref<any[]>([])

// --- Transaction Modal Setup ---
const showSmartPrompt = ref(false)
const smartPromptData = ref<any>({})
const {
    showModal,
    isEditing,
    form,
    potentialMatches,
    isSearchingMatches,
    matchesSearched,
    openAddModal,
    handleSubmit,
    findMatches,
    handleSmartCategorize
} = useTransactionModals(
    computed(() => account.value?.id || ''),
    computed(() => financeStore.accounts),
    computed(() => budgetStore.budgets),
    transactions,
    fetchTransactions,
    showSmartPrompt,
    smartPromptData,
    () => financeStore.fetchAccounts()
)

// --- Computed ---
const periodOptions = computed(() => {
    if (account.value?.type === 'CREDIT_CARD') {
        return [
            { label: 'Current Cycle', value: 'current' },
            { label: 'Last Cycle', value: 'last' },
            { label: 'Custom', value: 'custom' }
        ]
    }
    return [
        { label: 'This Month', value: 'month' },
        { label: 'Last Month', value: 'last_month' },
        { label: '3 Months', value: '3months' },
        { label: 'Custom', value: 'custom' }
    ]
})

const familyMembers = computed(() => auth.familyMembers)

const dateRange = computed(() => {
    const today = new Date()
    const start = new Date()
    const end = new Date()

    if (periodFilter.value === 'custom') {
        return {
            start: customRange.start ? new Date(customRange.start) : null,
            end: customRange.end ? new Date(customRange.end) : null
        }
    }

    if (account.value?.type === 'CREDIT_CARD' && account.value.billing_day) {
        const bDay = account.value.billing_day
        if (periodFilter.value === 'current') {
            start.setDate(bDay)
            if (today.getDate() < bDay) start.setMonth(start.getMonth() - 1)
            return { start, end: today }
        } else if (periodFilter.value === 'last') {
            end.setDate(bDay - 1)
            if (today.getDate() < bDay) end.setMonth(end.getMonth() - 1)
            start.setTime(end.getTime())
            start.setMonth(start.getMonth() - 1)
            start.setDate(bDay)
            return { start, end }
        }
    }

    // Default calendar periods
    if (periodFilter.value === 'month') {
        start.setDate(1)
        return { start, end: today }
    } else if (periodFilter.value === 'last_month') {
        start.setMonth(start.getMonth() - 1)
        start.setDate(1)
        end.setDate(0)
        return { start, end }
    } else if (periodFilter.value === '3months') {
        start.setMonth(start.getMonth() - 3)
        start.setDate(1)
        return { start, end: today }
    }

    return { start: null, end: today }
})

const summaryStats = computed(() => {
    if (!account.value) return []
    
    if (account.value.type === 'CREDIT_CARD') {
        return [
            { label: 'Outstanding', value: account.value.balance, color: 'error' },
            { label: 'Spent this Cycle', value: intelligence.value?.current_cycle_spend || 0, color: 'error', subtext: 'In current billing period' },
            { label: 'Statement Bal', value: intelligence.value?.statement_balance || 0, subtext: 'Last billed amount' },
            { label: 'Available Limit', value: (account.value.credit_limit || 0) - account.value.balance, color: 'success' }
        ]
    }

    // Bank / Wallet / Other
    const periodInflows = chartTransactions.value
        .filter(t => Number(t.amount) > 0 && !t.exclude_from_reports && !t.is_transfer)
        .reduce((s, t) => s + Number(t.amount), 0)
    const periodOutflows = chartTransactions.value
        .filter(t => Number(t.amount) < 0 && !t.exclude_from_reports && !t.is_transfer)
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

    return [
        { label: 'Current Balance', value: account.value.balance, color: 'primary' },
        { label: 'Period Inflows', value: periodInflows, color: 'success' },
        { label: 'Period Outflows', value: periodOutflows, color: 'error' },
        { label: 'Net Change', value: periodInflows - periodOutflows, color: (periodInflows - periodOutflows) >= 0 ? 'success' : 'error' }
    ]
})

const bankAccountsItems = computed(() => {
    return allAccounts.value
        .filter(a => a.type === 'BANK' && a.is_verified)
        .map(a => ({ title: `${a.name} (${formatAmount(a.balance)})`, value: a.id }))
})

const iconBadgeStyle = computed(() => {
    switch (account.value?.type) {
        case 'BANK': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        case 'CREDIT_CARD': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        case 'LOAN': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        case 'WALLET': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        case 'INVESTMENT': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
        default: return 'bg-wf-surface-variant text-wf-text-secondary'
    }
})

// --- Chart Logic ---
const totalPeriodSpend = computed(() => {
    return chartTransactions.value.reduce((acc, tx) => {
        if (Number(tx.amount) < 0 && !tx.exclude_from_reports && !tx.is_transfer) return acc + Math.abs(Number(tx.amount))
        return acc
    }, 0)
})

const chartData = computed(() => {
    if (!dateRange.value.start || !dateRange.value.end) return null

    const dailySpend: Record<string, number> = {}
    let curr = new Date(dateRange.value.start)
    const end = new Date(dateRange.value.end)
    
    while (curr <= end) {
        dailySpend[curr.toISOString().split('T')[0]] = 0
        curr.setDate(curr.getDate() + 1)
    }

    chartTransactions.value.forEach(tx => {
        if (Number(tx.amount) < 0 && !tx.exclude_from_reports && !tx.is_transfer) {
            const date = tx.date ? tx.date.split('T')[0] : ''
            if (date && dailySpend[date] !== undefined) {
                dailySpend[date] += Math.abs(Number(tx.amount))
            }
        }
    })

    const labels = Object.keys(dailySpend).sort().map(d => {
        const dt = new Date(d)
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    })
    const data = Object.keys(dailySpend).sort().map(d => dailySpend[d])

    return {
        labels,
        datasets: [{
            label: 'Daily Spending',
            data,
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
            borderRadius: 6,
            barThickness: 'flex' as const
        }]
    }
})

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            mode: 'index' as const,
            intersect: false,
            callbacks: {
                label: (context: any) => `Spent: ${formatAmount(context.raw)}`
            }
        }
    },
    scales: {
        x: { 
            grid: { display: false },
            ticks: {
                color: '#94a3b8',
                font: { size: 10 }
            }
        },
        y: { 
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { 
                color: '#94a3b8',
                font: { size: 10 },
                callback: (val: any) => `₹${val}` 
            }
        }
    }
}

// --- Methods ---
async function fetchAccount() {
    loading.value = true
    try {
        const id = route.params.id as string
        const [accsRes, intelRes] = await Promise.all([
            financeApi.getAccounts(),
            financeApi.getCreditIntelligence()
        ])
        allAccounts.value = accsRes.data
        account.value = accsRes.data.find((a: any) => a.id === id)
        intelligence.value = intelRes.data.find((i: any) => i.id === id)
        
        if (account.value) {
            fetchTransactions()
        }
    } catch (e) {
        notify.error("Failed to load account details")
    } finally {
        loading.value = false
    }
}

async function fetchTransactions(options?: any) {
    if (!account.value) return
    
    if (options) {
        page.value = options.page
        limit.value = options.itemsPerPage
    }

    txLoading.value = true
    try {
        const range = dateRange.value
        const sDate = range.start ? range.start.toISOString().split('T')[0] : undefined
        const eDate = range.end ? range.end.toISOString().split('T')[0] : undefined
        
        const [tableRes, chartRes] = await Promise.all([
            financeApi.getTransactions(
                account.value.id,
                page.value,
                limit.value,
                sDate,
                eDate,
                searchQuery.value || undefined
            ),
            financeApi.getTransactions(
                account.value.id,
                1,
                1000,
                sDate,
                eDate,
                searchQuery.value || undefined
            )
        ])
        
        transactions.value = tableRes.data.data
        totalTransactions.value = tableRes.data.total
        chartTransactions.value = chartRes.data.data
    } catch (e) {
        console.error("Failed to fetch transactions:", e)
    } finally {
        txLoading.value = false
    }
}

function refreshAll() {
    fetchAccount()
}

async function handlePayBillSubmit() {
    if (!account.value || !payBillForm.value.source_account_id) return
    submittingPayBill.value = true
    try {
        await financeApi.payCreditCardBill(account.value.id, {
            ...payBillForm.value,
            description: `Bill Payment: ${account.value.name}`
        })
        notify.success("Payment recorded successfully")
        showPayBillModal.value = false
        refreshAll()
    } catch (e: any) {
        notify.error(e.response?.data?.detail || "Payment failed")
    } finally {
        submittingPayBill.value = false
    }
}

function handleDelete() {
    showDeleteAccountConfirm.value = true
}

async function confirmDeleteAccount() {
    if (!account.value) return
    deleting.value = true
    try {
        await financeApi.deleteAccount(account.value.id)
        notify.success('Account deleted successfully')
        showDeleteAccountConfirm.value = false
        router.push('/accounts')
    } catch (e) {
        console.error(e)
    } finally {
        deleting.value = false
    }
}

function getAccountTypeIcon(type: string) {
    const icons: any = { BANK: Landmark, CREDIT_CARD: CreditCard, LOAN: Banknote, WALLET: Wallet, INVESTMENT: TrendingUp }
    return icons[type] || Wallet
}

function getOwnerName(id: string) {
    const member = familyMembers.value.find(m => m.id === id)
    return member ? (member.full_name || member.email) : 'Unknown'
}

// --- Watchers ---
watch([periodFilter, searchQuery, page], () => {
    fetchTransactions()
})

watch(customRange, () => {
    if (periodFilter.value === 'custom') fetchTransactions()
}, { deep: true })

onMounted(fetchAccount)
</script>
