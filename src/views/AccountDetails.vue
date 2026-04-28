<template>
    <MainLayout>
        <v-container fluid class="page-container dashboard-page">
            <!-- Animated Mesh Background -->
            <div class="relative-pos z-10">
                <div class="mb-6">
                    <v-btn variant="text" color="primary" class="pl-0 font-weight-bold" @click="router.back()">
                        <ChevronLeft :size="20" class="mr-1" />
                        Back to Sources
                    </v-btn>
                </div>

                <div v-if="loading" class="text-center py-12">
                    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
                </div>

                <div v-else-if="account">
                    <!-- Header -->
                    <div class="d-flex flex-column flex-md-row justify-space-between align-md-center mb-8 gap-6">
                        <div class="d-flex align-center gap-5">
                            <div class="account-icon-detail" :class="account.type.toLowerCase()">
                                <component :is="getAccountTypeIcon(account.type)" :size="32" />
                            </div>
                            <div>
                                <h1 class="text-h4 font-weight-black text-content mb-1 letter-spacing-negative-1">
                                    {{ account.name }}
                                </h1>
                                <div class="d-flex align-center gap-2 text-medium-emphasis font-weight-bold">
                                    <v-chip size="small" :color="getAccountTypeColor(account.type)" variant="flat" class="text-uppercase px-3">
                                        {{ account.type.replace('_', ' ') }}
                                    </v-chip>
                                    <v-chip v-if="account.account_mask" size="small" variant="tonal" class="font-weight-black">
                                        ••{{ account.account_mask }}
                                    </v-chip>
                                    <span class="opacity-40">•</span>
                                    <span class="text-caption font-weight-bold opacity-70">
                                        Owned by {{ getOwnerName(account.owner_id) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="d-flex ga-3">
                            <v-btn color="primary" variant="tonal" rounded="pill" height="48" class="px-6 font-weight-black" @click="openAddModal">
                                <Plus :size="18" class="mr-2" /> Add Transaction
                            </v-btn>
                            <v-btn v-if="account.type === 'CREDIT_CARD'" color="primary" variant="tonal" rounded="pill" height="48" class="px-6 font-weight-black" @click="showPayBillModal = true">
                                <DollarSign :size="18" class="mr-2" /> Pay Bill
                            </v-btn>
                            <v-btn color="primary" variant="tonal" rounded="pill" height="48" class="px-6 font-weight-black" @click="showEditModal = true">
                                <Edit2 :size="18" class="mr-2" /> Edit
                            </v-btn>
                            <v-btn variant="tonal" color="error" rounded="pill" height="48" class="px-6 font-weight-black" @click="handleDelete">
                                <Trash2 :size="18" class="mr-2" /> Delete
                                <v-tooltip activator="parent" location="bottom">Delete Source</v-tooltip>
                            </v-btn>
                        </div>
                    </div>

                    <!-- Stats Grid -->
                    <v-row class="mb-8">
                        <v-col v-for="stat in summaryStats" :key="stat.label" cols="12" sm="6" md="3">
                            <v-card class="premium-glass-card pa-5 h-100 d-flex flex-column" rounded="xl" elevation="0">
                                <div class="text-overline font-weight-black opacity-50 mb-1">{{ stat.label }}</div>
                                <div class="text-h4 font-weight-black" :class="stat.color ? `text-${stat.color}` : ''">
                                    {{ formatCurrency(stat.value) }}
                                </div>
                                <div v-if="stat.subtext" class="mt-auto pt-2 text-caption font-weight-bold opacity-60">
                                    {{ stat.subtext }}
                                </div>
                            </v-card>
                        </v-col>
                    </v-row>

                    <!-- Analysis & Filters Section -->
                    <v-card class="premium-glass-card mb-8 overflow-hidden" rounded="xl" elevation="0">
                        <div class="pa-6 border-b d-flex flex-column flex-md-row justify-space-between align-md-center gap-4">
                            <div class="d-flex align-center gap-4">
                                <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
                                    <Filter :size="20" />
                                </v-avatar>
                                <div class="premium-pill-tabs d-flex">
                                    <v-tabs v-model="periodFilter" color="primary" density="comfortable" hide-slider class="rounded-xl">
                                        <v-tab v-for="p in periodOptions" :key="p.value" :value="p.value" class="period-tab" rounded="xl">
                                            {{ p.label }}
                                        </v-tab>
                                    </v-tabs>
                                </div>
                            </div>

                            <div v-if="periodFilter === 'custom'" class="d-flex align-center gap-2">
                                <v-text-field v-model="customRange.start" type="date" density="compact" hide-details variant="outlined" rounded="lg" class="date-input" />
                                <span class="opacity-40">to</span>
                                <v-text-field v-model="customRange.end" type="date" density="compact" hide-details variant="outlined" rounded="lg" class="date-input" />
                            </div>
                        </div>

                        <!-- Chart Section -->
                        <div class="pa-6">
                            <div class="d-flex justify-space-between align-center mb-6">
                                <h3 class="text-subtitle-1 font-weight-black uppercase letter-spacing-1">Spending Trend</h3>
                                <div class="text-caption font-weight-bold opacity-60">Total: {{ formatCurrency(totalPeriodSpend) }}</div>
                            </div>
                            <div style="height: 300px; position: relative;">
                                <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
                            </div>
                        </div>
                    </v-card>

                    <!-- Transactions Section -->
                    <div class="mb-12">
                        <div class="d-flex align-center justify-space-between mb-6">
                            <div class="d-flex align-center gap-3">
                                <Landmark :size="20" class="text-primary" />
                                <h2 class="text-h5 font-weight-black">Transaction History</h2>
                            </div>
                             <div style="width: 320px;">
                                <v-text-field v-model="searchQuery" prepend-inner-icon="mdi-magnify" label="Search transactions..." variant="outlined" density="compact" rounded="pill" hide-details @update:model-value="fetchTransactions"></v-text-field>
                            </div>
                        </div>

                        <v-card class="premium-glass-card no-hover overflow-hidden" rounded="xl">
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
                        </v-card>
                    </div>
                </div>

                <div v-else class="text-center py-12">
                    <h3 class="text-h5 font-weight-black opacity-60">Account not found</h3>
                    <v-btn variant="text" color="primary" class="mt-4 font-weight-bold" @click="router.push('/accounts')">
                        Go back to accounts
                    </v-btn>
                </div>
            </div>

            <!-- Modals -->
            <AccountEditModal v-model="showEditModal" :account="account" :family-members="familyMembers" @saved="refreshAll" />
            
            <!-- Delete Account Confirmation -->
            <v-dialog v-model="showDeleteAccountConfirm" max-width="450">
                <v-card class="premium-glass-card" rounded="xl" elevation="0">
                    <v-card-text class="text-center pa-10">
                        <div class="text-h2 mb-6">🗑️</div>
                        <h3 class="text-h5 font-weight-black mb-2">Delete Account?</h3>
                        <p class="text-body-1 text-medium-emphasis mb-10">
                            Are you sure you want to delete <span class="font-weight-black text-error">{{ account?.name }}</span>? All associated transactions will be permanently removed.
                        </p>
                        <div class="d-flex ga-3 justify-center">
                            <v-btn variant="text" rounded="pill" height="48" class="px-6 font-weight-black" @click="showDeleteAccountConfirm = false">
                                Cancel
                            </v-btn>
                            <v-btn color="error" variant="flat" rounded="pill" height="48" class="px-8 font-weight-black" @click="confirmDeleteAccount" :loading="deleting">
                                <Trash2 :size="18" class="mr-2" /> Delete Forever
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>
            </v-dialog>
            
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

            <SmartPromptModal 
                :isOpen="showSmartPrompt" 
                :data="smartPromptData" 
                @close="showSmartPrompt = false"
                @confirm="handleSmartCategorize" 
            />
            
            <!-- Pay Bill Modal (Extracted Logic from Accounts.vue) -->
            <v-dialog v-model="showPayBillModal" max-width="450" persistent>
                <v-card class="pa-8" rounded="xl" elevation="24">
                    <v-avatar color="primary" variant="tonal" size="72" class="mb-4 mx-auto d-flex">
                        <CreditCard :size="36" />
                    </v-avatar>
                    <h3 class="text-h5 font-weight-black text-center mb-1">Pay Credit Bill</h3>
                    <p class="text-subtitle-2 font-weight-medium opacity-60 text-center mb-6">
                        {{ account?.name }} · Outstanding <strong class="text-error">{{ formatCurrency(account?.balance || 0) }}</strong>
                    </p>

                    <v-form @submit.prevent="handlePayBillSubmit">
                        <v-autocomplete v-model="payBillForm.source_account_id" label="Pay From" :items="bankAccountsItems" variant="outlined" rounded="xl" class="mb-4" placeholder="Select bank account"></v-autocomplete>

                        <v-row dense>
                            <v-col cols="6">
                                <v-text-field v-model.number="payBillForm.amount" label="Amount" type="number" variant="outlined" rounded="xl" class="mb-4" prefix="₹"></v-text-field>
                            </v-col>
                            <v-col cols="6">
                                <v-text-field v-model="payBillForm.date" label="Date" type="date" variant="outlined" rounded="xl" class="mb-4"></v-text-field>
                            </v-col>
                        </v-row>

                        <div class="d-flex align-center justify-space-between pa-4 rounded-xl mb-6 bg-grey-lighten-4">
                            <div>
                                <div class="text-subtitle-2 font-weight-bold">Record Transaction</div>
                                <div class="text-caption text-medium-emphasis">Debit from source account</div>
                            </div>
                            <v-switch v-model="payBillForm.record_transaction" color="primary" hide-details density="compact"></v-switch>
                        </div>

                        <div class="d-flex ga-3 justify-center">
                            <v-btn variant="text" rounded="pill" class="text-none font-weight-bold px-6" height="44" @click="showPayBillModal = false">Cancel</v-btn>
                            <v-btn type="submit" color="primary" rounded="pill" class="text-none font-weight-black px-8 elevation-4" height="44" :loading="submittingPayBill">Confirm Payment</v-btn>
                        </div>
                    </v-form>
                </v-card>
            </v-dialog>
        </v-container>
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
import AccountEditModal from '@/components/finance/AccountEditModal.vue'
import TransactionTable from '@/components/transactions/TransactionTable.vue'
import TransactionModal from '@/views/transactions/TransactionModal.vue'
import SmartPromptModal from '@/components/SmartPromptModal.vue'
import { useFinanceStore } from '@/stores/finance'
import { useBudgetStore } from '@/stores/finance/budgets'
import { useTransactionModals } from '@/composables/useTransactionModals'
import {
    ChevronLeft, Edit2, Trash2, DollarSign, Filter,
    Landmark, CreditCard, Banknote, Wallet, TrendingUp, Plus
} from 'lucide-vue-next'
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, PointElement, LineElement
} from 'chart.js'
import { Bar } from 'vue-chartjs'

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

const periodFilter = ref('current') // current, last, month, 3months, custom
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

const allAccounts = ref<any[]>([]) // For bank selection in pay bill

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
        end.setDate(0) // Last day of previous month
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
            const date = tx.date.split('T')[0]
            if (dailySpend[date] !== undefined) {
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
                label: (context: any) => `Spent: ${formatCurrency(context.raw)}`
            }
        }
    },
    scales: {
        x: { grid: { display: false } },
        y: { 
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: (val: any) => `₹${val}` }
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
        
        // Parallel fetch: Paginated for table, All for chart/stats
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
                1000, // Reasonable limit for chart context
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

function getAccountTypeColor(type: string) {
    const colors: any = { BANK: 'primary', CREDIT_CARD: 'error', WALLET: 'success', INVESTMENT: 'indigo', LOAN: 'warning' }
    return colors[type] || 'grey'
}

function getOwnerName(id: string) {
    const member = familyMembers.value.find(m => m.id === id)
    return member ? (member.full_name || member.email) : 'Unknown'
}

function formatCurrency(amount: any) {
    return formatAmount(amount)
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

<style scoped>
.account-icon-detail {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px -8px rgba(0,0,0,0.15);
}
.account-icon-detail.bank { background: linear-gradient(135deg, #eff6ff, #dbeafe); color: #2563eb; }
.account-icon-detail.credit_card { background: linear-gradient(135deg, #fef2f2, #fee2e2); color: #dc2626; }
.account-icon-detail.wallet { background: linear-gradient(135deg, #f0fdf4, #dcfce7); color: #16a34a; }
.account-icon-detail.investment { background: linear-gradient(135deg, #f5f3ff, #ede9fe); color: #7c3aed; }
.account-icon-detail.loan { background: linear-gradient(135deg, #fffbeb, #fef3c7); color: #d97706; }

.premium-glass-card {
    background: rgba(var(--v-theme-surface), 0.6) !important;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(var(--v-border-color), 0.08) !important;
}

.premium-pill-tabs {
    background: rgba(var(--v-theme-on-surface), 0.04);
    padding: 4px;
    border-radius: 20px;
}

.period-tab {
    text-transform: none !important;
    font-weight: 800;
    font-size: 0.75rem;
    letter-spacing: 0.02em;
    min-width: 100px;
}

.date-input { width: 150px; }

.shadow-primary {
    box-shadow: 0 8px 20px -6px rgba(var(--v-theme-primary), 0.4) !important;
}

.text-tiny { font-size: 0.65rem; }
</style>
