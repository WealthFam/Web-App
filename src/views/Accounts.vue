<template>
    <MainLayout>
        <div class="space-y-5">
            <!-- Header Section -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
                        <Landmark class="w-4.5 h-4.5 text-wf-primary" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-lg sm:text-xl font-bold text-wf-text-primary tracking-tight leading-tight">
                                Bank Accounts
                            </h1>
                            <span class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                {{ verifiedAccounts.length }} Active
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary mt-0.5">
                            Manage linked savings, current accounts, digital wallets, and cash reserves.
                        </p>
                    </div>
                </div>

                <!-- Navigation Tabs (Pill Segmented Switcher) -->
                <div class="flex items-center p-0.5 bg-wf-surface-variant/80 rounded-wf-md border border-wf-border shadow-2xs text-xs font-semibold self-start sm:self-auto">
                    <button
                        type="button"
                        class="flex items-center gap-1.5 px-3 py-1 rounded-wf-sm transition-all cursor-pointer"
                        :class="activeTab === 'approved'
                            ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                            : 'text-wf-text-secondary hover:text-wf-text-primary'"
                        @click="activeTab = 'approved'"
                    >
                        <Landmark :size="14" />
                        <span>Approved</span>
                    </button>
                    <button
                        type="button"
                        class="flex items-center gap-1.5 px-3 py-1 rounded-wf-sm transition-all cursor-pointer"
                        :class="activeTab === 'triage'
                            ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                            : 'text-wf-text-secondary hover:text-wf-text-primary'"
                        @click="activeTab = 'triage'"
                    >
                        <AlertCircle :size="14" class="text-amber-500" />
                        <span>Triage</span>
                        <span
                            v-if="untrustedAccounts.length > 0"
                            class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        >
                            {{ untrustedAccounts.length }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- Account Summary Metric Strip -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Net Liquid Assets -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-info-light text-wf-info border border-blue-500/20 flex items-center justify-center shrink-0">
                            <Scale :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Total Liquid Balance
                        </div>
                        <div
                            class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight mt-0.5"
                            :class="accountMetrics.total < 0 ? 'text-wf-error' : 'text-wf-text-primary'"
                        >
                            {{ formatAmount(accountMetrics.total) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Available cash across all liquid accounts
                        </div>
                    </div>
                </WfCard>

                <!-- Bank Balances -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-success-light text-wf-success border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <Landmark :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Savings & Current
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-wf-success mt-0.5">
                            {{ formatAmount(accountMetrics.bank) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Core institutional deposits
                        </div>
                    </div>
                </WfCard>

                <!-- Digital Wallets & Cash -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                            <Wallet :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Wallets & Cash
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-purple-600 dark:text-purple-400 mt-0.5">
                            {{ formatAmount(accountMetrics.wallet) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Fast payment liquidity
                        </div>
                    </div>
                </WfCard>

                <!-- Active Accounts Count -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-warning-light text-wf-warning border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Building2 :size="20" />
                        </div>
                        <div class="text-lg font-bold font-mono tabular-nums text-wf-text-primary">
                            {{ verifiedAccounts.length }}
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Active Accounts
                        </div>
                        <div class="text-base sm:text-lg font-bold font-mono tabular-nums tracking-tight text-wf-text-primary mt-0.5">
                            Avg: {{ formatAmount(averageBalance) }}
                        </div>
                        <div class="text-[11px] text-wf-text-muted mt-1">
                            Average balance per account
                        </div>
                    </div>
                </WfCard>
            </div>

            <!-- Unified Toolbar (36px control heights - Top Filter Removed) -->
            <WfCard variant="flat" padding="sm" radius="lg" class="border border-wf-border">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <!-- Global Search Input -->
                    <div class="relative flex-1 min-w-[200px]">
                        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search :size="14" class="text-wf-text-muted shrink-0" />
                        </div>
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Search by bank name, institution or mask..."
                            class="w-full h-8 pl-9 pr-8 text-xs bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary transition-colors"
                        />
                        <div v-if="searchQuery" class="absolute inset-y-0 right-0 flex items-center pr-2.5">
                            <button
                                type="button"
                                class="text-wf-text-muted hover:text-wf-text-primary p-0.5 rounded cursor-pointer flex items-center justify-center"
                                aria-label="Clear search"
                                @click="searchQuery = ''"
                            >
                                <X :size="13" />
                            </button>
                        </div>
                    </div>

                    <!-- Add Source CTA -->
                    <WfButton
                        variant="primary"
                        size="sm"
                        class="shrink-0"
                        @click="openCreateAccountModal"
                    >
                        <Plus :size="14" class="mr-1" />
                        <span>Add Bank Account</span>
                    </WfButton>
                </div>
            </WfCard>

            <!-- TAB 1: Approved Accounts -->
            <div v-show="activeTab === 'approved'" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <AccountCard
                        v-for="acc in filteredAccounts"
                        :key="acc.id"
                        :account="acc"
                        @view="handleViewAccount"
                        @edit="openEditAccountModal"
                        @delete="deleteAccountRequest"
                    />

                    <!-- Compact Add Source Placeholder Card -->
                    <div
                        v-if="!searchQuery && !auth.selectedMemberId"
                        class="border-2 border-dashed border-wf-border hover:border-wf-primary/50 rounded-wf-lg p-5 flex flex-col items-center justify-center transition-all cursor-pointer group hover:bg-wf-primary/[0.02] min-h-[140px]"
                        @click="openCreateAccountModal"
                    >
                        <div class="w-8 h-8 rounded-full bg-wf-primary/10 text-wf-primary flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
                            <Plus :size="18" />
                        </div>
                        <div class="text-xs font-bold text-wf-text-primary">
                            Add Bank Account
                        </div>
                        <div class="text-[11px] text-wf-text-muted mt-0.5 text-center">
                            Link a savings, current or wallet account
                        </div>
                    </div>
                </div>

                <!-- Empty State for Approved -->
                <div v-if="filteredAccounts.length === 0 && !loading" class="text-center py-16 animate-in">
                    <div class="w-16 h-16 rounded-full bg-wf-surface-variant text-wf-text-muted flex items-center justify-center mx-auto mb-4">
                        <Search :size="32" class="opacity-40" />
                    </div>
                    <h3 class="text-base font-bold text-wf-text-primary">No matching accounts</h3>
                    <p class="text-xs text-wf-text-muted mt-1 mb-4">Try adjusting your search query</p>
                    <WfButton variant="outline" size="sm" @click="searchQuery = ''">
                        <RotateCcw :size="13" class="mr-1.5" />
                        <span>Clear search</span>
                    </WfButton>
                </div>
            </div>

            <!-- TAB 2: Triage Accounts -->
            <div v-show="activeTab === 'triage'" class="space-y-4">
                <!-- Triage Intake Info Banner -->
                <div class="flex items-start gap-3 p-3.5 rounded-wf-md bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                    <div class="w-9 h-9 rounded-wf-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <AlertCircle :size="18" />
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-wf-text-primary">Detected Financial Sources</h3>
                        <p class="text-xs text-wf-text-muted mt-0.5">Verify and classify accounts automatically detected from your transaction streams before adding to ledger.</p>
                    </div>
                </div>

                <!-- Triage Cards Grid (Compact 4-column) -->
                <div v-if="untrustedAccounts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <WfCard
                        v-for="acc in untrustedAccounts"
                        :key="acc.id"
                        variant="flat"
                        padding="sm"
                        radius="lg"
                        class="border border-wf-border hover:shadow-wf-card-hover transition-all flex flex-col justify-between"
                    >
                        <div>
                            <div class="flex items-start justify-between gap-2 mb-2">
                                <div class="w-8 h-8 rounded-wf-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                    <AlertCircle :size="16" />
                                </div>
                                <div class="flex items-center gap-1">
                                    <WfButton
                                        variant="primary"
                                        size="sm"
                                        class="h-6 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                                        @click="openEditAccountModal(acc, true)"
                                    >
                                        <Check :size="12" class="mr-0.5" />
                                        <span>Verify</span>
                                    </WfButton>
                                    <WfButton
                                        variant="ghost"
                                        size="sm"
                                        class="h-6 px-1.5 text-[11px] text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        @click="deleteAccountRequest(acc)"
                                    >
                                        <X :size="13" />
                                    </WfButton>
                                </div>
                            </div>

                            <div class="mb-2">
                                <div class="text-xs sm:text-sm font-bold text-wf-text-primary truncate" :title="acc.name">
                                    {{ acc.name }}
                                </div>
                                <div class="flex items-center gap-1.5 text-xs text-wf-text-muted mt-0.5">
                                    <span class="text-[10px] font-semibold uppercase tracking-wider">
                                        {{ getAccountTypeLabel(acc.type) }}
                                    </span>
                                    <span v-if="acc.account_mask" class="font-mono text-[9px] bg-wf-surface-variant text-wf-text-secondary px-1 py-0.2 rounded-wf-xs">
                                        ••{{ acc.account_mask }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="pt-2 border-t border-wf-border-subtle flex items-baseline justify-between mt-auto">
                            <div>
                                <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider">Opening Balance</div>
                                <div class="text-sm sm:text-base font-bold font-mono tracking-tight text-wf-text-primary mt-0.5">
                                    {{ formatAmount(acc.balance) }}
                                </div>
                            </div>
                            <button
                                type="button"
                                class="text-[11px] font-semibold text-wf-primary hover:underline cursor-pointer"
                                @click="openEditAccountModal(acc)"
                            >
                                Details
                            </button>
                        </div>
                    </WfCard>
                </div>

                <!-- Empty Triage (Inbox Zero) -->
                <div v-else class="text-center py-16 animate-in">
                    <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <Check :size="32" />
                    </div>
                    <h3 class="text-base font-bold text-wf-text-primary">All clear!</h3>
                    <p class="text-xs text-wf-text-muted mt-1">No unverified sources require attention</p>
                </div>
            </div>

            <!-- Modals Suite -->
            <!-- 1. Account Edit / Create Modal -->
            <AccountEditModal
                v-model="showAccountModal"
                :account="editingAccount"
                :family-members="familyMembers"
                @saved="fetchData"
                @delete="deleteAccountRequest"
            />

            <!-- 2. Account Delete Confirmation Modal -->
            <WfModal
                v-model="showAccountDeleteConfirm"
                max-width="sm"
                title="Delete Account?"
                description="Irreversible Action"
            >
                <div class="space-y-4 py-1">
                    <div class="p-3.5 rounded-wf-md bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <Trash2 :size="20" class="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div class="text-xs text-wf-text-primary">
                            You are about to permanently delete <strong class="text-rose-600 dark:text-rose-400">{{ accountToDelete?.name }}</strong>.
                        </div>
                    </div>

                    <div class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle flex items-center justify-between">
                        <div class="text-xs text-wf-text-muted font-medium">Historical Transactions</div>
                        <div class="text-sm font-bold font-mono text-wf-text-primary">{{ accountTxCount }}</div>
                    </div>

                    <div class="text-[11px] text-wf-text-muted italic bg-wf-surface-variant/20 p-2.5 rounded-wf-sm border border-wf-border-subtle">
                        Warning: This will also remove the account from family wealth calculations and linked budget cycles.
                    </div>
                </div>

                <template #footer>
                    <div class="flex items-center justify-end gap-2 w-full">
                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="showAccountDeleteConfirm = false"
                        >
                            Keep Account
                        </WfButton>
                        <WfButton
                            variant="danger"
                            size="sm"
                            :loading="isDeletingAccount"
                            @click="confirmAccountDelete"
                        >
                            <Trash2 :size="13" class="mr-1" />
                            <span>Confirm Delete</span>
                        </WfButton>
                    </div>
                </template>
            </WfModal>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useCurrency } from '@/composables/useCurrency'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import { 
    Scale, Landmark, Wallet, Building2, Plus, Check, X, AlertCircle, 
    Trash2, Search, RotateCcw
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import AccountCard from '@/components/finance/AccountCard.vue'
import AccountEditModal from '@/components/finance/AccountEditModal.vue'

const notify = useNotificationStore()
const router = useRouter()
const { formatAmount } = useCurrency()

// --- State ---
const accounts = ref<any[]>([])
const auth = useAuthStore()
const loading = ref(false)
const activeTab = ref<'approved' | 'triage'>('approved')
const searchQuery = ref('')

// Modals
const showAccountModal = ref(false)
const editingAccount = ref<any>(null)
const showAccountDeleteConfirm = ref(false)
const accountToDelete = ref<any>(null)
const accountTxCount = ref(0)
const isDeletingAccount = ref(false)

// --- Computed ---
// Strict liquid accounts bifurcation: Only Bank accounts, Wallets, and Cash belong on the Bank Accounts view.
// Specialized instruments are managed in their dedicated views:
// Credit Cards -> /credit-cards
// Fixed & Recurring Deposits -> /fixed-deposits
// Provident Funds (PPF/EPF) -> /provident-funds
// Loans & Liabilities -> /loans
// Mutual Funds -> /mutual-funds
const liquidAccounts = computed(() => {
    return accounts.value.filter(a => ['BANK', 'WALLET', 'CASH'].includes(a.type))
})

const filteredAccounts = computed(() => {
    let list = liquidAccounts.value.filter(a => a.is_verified !== false)
    
    // Search filtering
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        list = list.filter(a => 
            a.name.toLowerCase().includes(q) || 
            (a.account_mask && a.account_mask.includes(q)) ||
            (a.institution_name && a.institution_name.toLowerCase().includes(q))
        )
    }

    return list
})

// Triage shows all unverified non-credit accounts pending review
const untrustedAccounts = computed(() => accounts.value.filter(a => a.type !== 'CREDIT_CARD' && a.is_verified === false))
const verifiedAccounts = computed(() => liquidAccounts.value.filter(a => a.is_verified !== false))

const accountMetrics = computed(() => {
    let total = 0
    let bank = 0
    let wallet = 0

    verifiedAccounts.value.forEach(a => {
        const bal = Number(a.balance || 0)
        total += bal
        if (a.type === 'BANK') {
            bank += bal
        } else if (a.type === 'WALLET' || a.type === 'CASH') {
            wallet += bal
        }
    })
    return { total, bank, wallet }
})

const averageBalance = computed(() => {
    if (verifiedAccounts.value.length === 0) return 0
    return accountMetrics.value.total / verifiedAccounts.value.length
})

const familyMembers = computed(() => auth.familyMembers)

// --- Methods ---
async function fetchData() {
    loading.value = true
    try {
        const accRes = await financeApi.getAccounts(auth.selectedMemberId || undefined, true)
        accounts.value = accRes.data
    } catch (err) {
        notify.error("Failed to load accounts")
    } finally {
        loading.value = false
    }
}

function getAccountTypeLabel(type: string) {
    const labels: any = { 
        BANK: 'Bank Account', 
        WALLET: 'Wallet', 
        CASH: 'Cash', 
        INVESTMENT: 'Investment', 
        LOAN: 'Loan',
        FIXED_DEPOSIT: 'Fixed Deposit',
        RECURRING_DEPOSIT: 'Recurring Deposit',
        PROVIDENT_FUND: 'Provident Fund'
    }
    return labels[type] || type
}

function handleViewAccount(account: any) {
    if (account.type === 'LOAN') {
        router.push('/loans')
        return
    }
    if (account.type === 'CREDIT_CARD') {
        router.push(`/credit-cards/${account.id}`)
        return
    }
    if (account.type === 'FIXED_DEPOSIT' || account.type === 'RECURRING_DEPOSIT') {
        router.push('/fixed-deposits')
        return
    }
    if (account.type === 'PROVIDENT_FUND') {
        router.push('/provident-funds')
        return
    }
    router.push(`/accounts/${account.id}`)
}

function openCreateAccountModal() {
    editingAccount.value = null
    showAccountModal.value = true
}

function openEditAccountModal(account: any, autoVerify = false) {
    editingAccount.value = { ...account }
    if (autoVerify) editingAccount.value.is_verified = true
    showAccountModal.value = true
}

async function deleteAccountRequest(account: any) {
    accountToDelete.value = account
    try {
        const res = await financeApi.getAccountTransactionCount(account.id)
        accountTxCount.value = res.data.count
    } catch { accountTxCount.value = 0 }
    showAccountDeleteConfirm.value = true
}

async function confirmAccountDelete() {
    if (!accountToDelete.value) return
    isDeletingAccount.value = true
    try {
        await financeApi.deleteAccount(accountToDelete.value.id)
        notify.success("Account deleted")
        showAccountDeleteConfirm.value = false
        fetchData()
    } catch (e: any) {
        notify.error(e.response?.data?.detail || "Delete failed")
    } finally {
        isDeletingAccount.value = false
    }
}

watch(() => auth.selectedMemberId, () => {
    fetchData()
})

onMounted(fetchData)
</script>
