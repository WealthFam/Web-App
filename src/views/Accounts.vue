<template>
    <MainLayout>
        <v-container fluid class="page-container dashboard-page py-6">
            <!-- Animated Mesh Background -->
            <div class="mesh-blob blob-1"></div>
            <div class="mesh-blob blob-2"></div>
            <div class="mesh-blob blob-3"></div>

            <div class="relative-pos z-10">
                <!-- Header Section -->
                <v-row class="mb-6 align-center">
                    <v-col cols="12" md="4">
                        <div class="d-flex align-center">
                            <h1 class="text-h6 font-weight-black text-content">Financial Sources</h1>
                        </div>
                        <p class="text-subtitle-2 text-medium-emphasis font-weight-bold mt-1 opacity-70">
                            Managing {{ verifiedAccounts.length }} active capital streams
                        </p>
                    </v-col>

                    <v-col cols="12" md="8" class="d-flex flex-column flex-md-row align-md-center justify-end gap-3">
                        <!-- Navigation Tabs -->
                        <div class="premium-pill-tabs flex-grow-1 flex-md-grow-0 d-flex overflow-x-auto">
                            <v-tabs v-model="activeTab" color="primary" density="comfortable" hide-slider show-arrows class="rounded-xl">
                                <v-tab value="approved" class="premium-tab" rounded="xl">
                                    <div class="d-flex align-center gap-2">
                                        <Landmark :size="16" />
                                        <span>Approved</span>
                                    </div>
                                </v-tab>
                                <v-tab value="triage" class="premium-tab" rounded="xl">
                                    <div class="d-flex align-center gap-2">
                                        <AlertCircle :size="16" />
                                        <span>Triage</span>
                                        <v-chip v-if="untrustedAccounts.length > 0" size="x-small" color="primary" class="ml-1 font-weight-black">
                                            {{ untrustedAccounts.length }}
                                        </v-chip>
                                    </div>
                                </v-tab>
                            </v-tabs>
                        </div>
                    </v-col>
                </v-row>

                <!-- Account Summary Grid -->
                <v-row class="mb-10">
                    <v-col cols="12" sm="6" md="3">
                        <v-hover v-slot="{ isHovering, props }">
                            <v-card v-bind="props" class="m3-card metric-card pa-6 h-100 d-flex flex-column" :class="{ 'raised': isHovering }" rounded="xl" elevation="1">
                                <div class="d-flex justify-space-between align-start mb-6">
                                    <v-avatar class="premium-gradient-primary elevation-2" rounded="lg" size="48">
                                        <Scale :size="24" color="white" />
                                    </v-avatar>
                                </div>
                                <div class="text-overline opacity-60 font-weight-black letter-spacing-1">Net Liquid Assets</div>
                                <div class="text-h4 font-weight-black text-primary mb-1">{{ formatAmount(accountMetrics.total) }}</div>
                                <div class="mt-auto text-caption font-weight-bold opacity-60">Total available capital</div>
                            </v-card>
                        </v-hover>
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <v-hover v-slot="{ isHovering, props }">
                            <v-card v-bind="props" class="m3-card metric-card pa-6 h-100 d-flex flex-column" :class="{ 'raised': isHovering }" rounded="xl" elevation="1">
                                <div class="d-flex justify-space-between align-start mb-6">
                                    <v-avatar class="premium-gradient-success elevation-2" rounded="lg" size="48">
                                        <Landmark :size="24" color="white" />
                                    </v-avatar>
                                </div>
                                <div class="text-overline opacity-60 font-weight-black letter-spacing-1">Bank Balances</div>
                                <div class="text-h4 font-weight-black text-success mb-1">{{ formatAmount(accountMetrics.bank) }}</div>
                                <div class="mt-auto text-caption font-weight-bold opacity-60">Cash in hand</div>
                            </v-card>
                        </v-hover>
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <v-hover v-slot="{ isHovering, props }">
                            <v-card v-bind="props" class="m3-card metric-card pa-6 h-100 d-flex flex-column" :class="{ 'raised': isHovering }" rounded="xl" elevation="1">
                                <div class="d-flex justify-space-between align-start mb-6">
                                    <v-avatar class="premium-gradient-error elevation-2" rounded="lg" size="48">
                                        <CreditCard :size="24" color="white" />
                                    </v-avatar>
                                </div>
                                <div class="text-overline opacity-60 font-weight-black letter-spacing-1">Active Credit Debt</div>
                                <div class="text-h4 font-weight-black text-error mb-1">{{ formatAmount(accountMetrics.credit) }}</div>
                                <div class="mt-auto text-caption font-weight-bold opacity-60">Utilized limits</div>
                            </v-card>
                        </v-hover>
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <v-hover v-slot="{ isHovering, props }">
                            <v-card v-bind="props" class="m3-card metric-card pa-6 h-100 d-flex flex-column" :class="{ 'raised': isHovering }" rounded="xl" elevation="1">
                                <div class="d-flex justify-space-between align-start mb-6">
                                    <v-avatar class="premium-gradient-warning elevation-2" rounded="lg" size="48">
                                        <Zap :size="24" color="white" />
                                    </v-avatar>
                                    <div class="text-h5 font-weight-black text-warning">{{ totalUtilization.toFixed(0) }}%</div>
                                </div>
                                <div class="text-overline opacity-60 font-weight-black letter-spacing-1">Credit Utilization</div>
                                <v-progress-linear :model-value="totalUtilization" color="warning" class="mt-2 mb-2" rounded height="6"></v-progress-linear>
                                <div class="mt-auto text-caption font-weight-bold opacity-60">Weighted average</div>
                            </v-card>
                        </v-hover>
                    </v-col>
                </v-row>

                <!-- Premium Toolbar -->
                <v-card class="premium-glass-card mb-6 border-thin premium-toolbar" rounded="xl">
                    <v-row no-gutters class="align-center">
                        <!-- Account Type Selector -->
                        <v-col cols="12" md="3" class="px-2">
                            <v-autocomplete
                                v-model="selectedType"
                                :items="accountTypeItems"
                                placeholder="All Asset Types"
                                variant="solo-filled"
                                flat
                                density="compact"
                                hide-details
                                rounded="pill"
                                bg-color="surface"
                                class="font-weight-black text-caption custom-autocomplete"
                            >
                                <template v-slot:prepend-inner>
                                    <v-icon size="16" class="text-primary opacity-60 mr-1">mdi-filter-variant</v-icon>
                                </template>
                            </v-autocomplete>
                        </v-col>

                        <!-- Global Search -->
                        <v-col cols="12" md="6" class="px-2">
                            <v-text-field
                                v-model="searchQuery"
                                placeholder="Search by name, institution or mask..."
                                variant="solo-filled"
                                flat
                                density="compact"
                                hide-details
                                rounded="pill"
                                clearable
                                bg-color="surface"
                                class="search-input"
                            >
                                <template v-slot:prepend-inner>
                                    <Search :size="18" class="text-primary opacity-60" />
                                </template>
                            </v-text-field>
                        </v-col>

                        <v-spacer></v-spacer>

                        <!-- Add Source CTA -->
                        <v-col cols="12" md="auto" class="d-flex align-center ga-3">
                            <div class="d-flex ga-2 bg-surface pa-1 rounded-pill border-thin shadow-sm">
                                <v-btn variant="text" size="small" rounded="pill" color="primary"
                                    class="text-none font-weight-black px-4" @click="openCreateAccountModal">
                                    <template v-slot:prepend>
                                        <Plus :size="14" />
                                    </template>
                                    Add Source
                                </v-btn>
                            </div>
                        </v-col>
                    </v-row>
                </v-card>

                <!-- CONTENT AREA -->
                <v-window v-model="activeTab" class="overflow-visible">
                    <!-- Approved Tab -->
                    <v-window-item value="approved">
                        <v-row>
                            <v-col v-for="acc in filteredAccounts" :key="acc.id" cols="12" md="6" lg="4">
                                <AccountCard 
                                    :account="acc" 
                                    :intelligence="getIntelligenceForAccount(acc.id)" 
                                    @view="handleViewAccount"
                                    @edit="openEditAccountModal" 
                                    @pay-bill="openPayBillModal" 
                                    @delete="deleteAccountRequest" 
                                />
                            </v-col>
                            
                            <!-- Empty State -->
                            <v-col v-if="filteredAccounts.length === 0 && !loading" cols="12" class="text-center py-12">
                                <v-avatar size="120" color="primary-lighten-5" class="mb-6">
                                    <Search :size="64" class="text-primary opacity-30" />
                                </v-avatar>
                                <h3 class="text-h4 font-weight-black opacity-60 mb-2">No matching sources</h3>
                                <p class="text-subtitle-1 opacity-40 mb-8">Try adjusting your filters or search query</p>
                                <v-btn color="primary" variant="tonal" height="44" rounded="pill" class="px-8 font-weight-bold" @click="resetFilters">
                                    <v-icon class="mr-2">mdi-refresh</v-icon> Clear all filters
                                </v-btn>
                            </v-col>

                            <!-- Add Placeholder Card -->
                            <v-col v-if="!searchQuery && !auth.selectedMemberId && (selectedType === 'all' || selectedType === 'bank')" cols="12" md="6" lg="4">
                                <v-card class="add-account-placeholder h-100 pa-8 d-flex flex-column align-center justify-center" @click="openCreateAccountModal">
                                    <v-avatar color="primary-lighten-5" size="64" class="mb-4">
                                        <Plus :size="32" class="text-primary" />
                                    </v-avatar>
                                    <div class="text-h6 font-weight-bold">Add Source</div>
                                    <div class="text-caption text-medium-emphasis">Link a new bank, card or loan</div>
                                </v-card>
                            </v-col>
                        </v-row>
                    </v-window-item>

                    <!-- Triage Tab -->
                    <v-window-item value="triage">
                        <div class="mb-6">
                            <h3 class="text-h5 font-weight-black d-flex align-center gap-2 mb-1">
                                <AlertCircle :size="24" class="text-warning" />
                                Detected Sources
                            </h3>
                            <p class="text-subtitle-2 text-medium-emphasis">Verify accounts detected from your financial messages</p>
                        </div>

                        <v-row v-if="untrustedAccounts.length > 0">
                            <v-col v-for="acc in untrustedAccounts" :key="acc.id" cols="12" md="6" lg="4">
                                <v-card class="premium-glass-card untrusted-card" elevation="0">
                                    <div class="pa-5">
                                        <div class="d-flex justify-space-between align-start mb-4">
                                            <div class="acc-icon-circle warning">
                                                <AlertCircle :size="24" />
                                            </div>
                                            <div class="d-flex gap-2">
                                                <v-btn icon size="small" color="success" variant="tonal" @click="openEditAccountModal(acc, true)">
                                                    <Check :size="18" />
                                                    <v-tooltip activator="parent" location="top">Verify Source</v-tooltip>
                                                </v-btn>
                                                <v-btn icon size="small" color="error" variant="tonal" @click="deleteAccountRequest(acc)">
                                                    <X :size="18" />
                                                    <v-tooltip activator="parent" location="top">Reject & Delete</v-tooltip>
                                                </v-btn>
                                            </div>
                                        </div>
                                        <div class="text-h6 font-weight-bold mb-1">{{ acc.name }}</div>
                                        <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-4">
                                            {{ getAccountTypeLabel(acc.type) }} • {{ acc.account_mask ? `**${acc.account_mask}` : 'New Source' }}
                                        </div>
                                        <div class="d-flex justify-space-between align-end">
                                            <div>
                                                <div class="text-caption font-weight-bold text-medium-emphasis">Opening Balance</div>
                                                <div class="text-h5 font-weight-black">{{ formatAmount(acc.balance) }}</div>
                                            </div>
                                            <v-btn variant="plain" class="text-none font-weight-black" color="primary" @click="openEditAccountModal(acc)">
                                                Review Details
                                            </v-btn>
                                        </div>
                                    </div>
                                </v-card>
                            </v-col>
                        </v-row>

                        <!-- Empty Triage -->
                        <div v-else class="text-center py-12">
                            <v-avatar size="120" color="success-lighten-5" class="mb-6">
                                <Check :size="64" class="text-success opacity-30" />
                            </v-avatar>
                            <h3 class="text-h4 font-weight-black opacity-60 mb-2">All clear!</h3>
                            <p class="text-subtitle-1 opacity-40">No unverified sources require attention</p>
                        </div>
                    </v-window-item>
                </v-window>

                <!-- Modals -->
                <AccountEditModal v-model="showAccountModal" :account="editingAccount" :family-members="familyMembers" @saved="fetchData" @delete="deleteAccountRequest" />
                
                <v-dialog v-model="showAccountDeleteConfirm" max-width="480">
                    <v-card class="rounded-xl overflow-hidden border-error">
                        <div class="bg-error-lighten-5 pa-8 text-center border-b">
                            <v-avatar color="error" size="80" class="mb-4 elevation-4">
                                <Trash2 :size="40" class="text-white" />
                            </v-avatar>
                            <h3 class="text-h4 font-weight-black text-error mb-1">Delete Account?</h3>
                            <div class="text-subtitle-2 font-weight-bold text-error uppercase ls-1">Irreversible Action</div>
                        </div>
                        
                        <v-card-text class="pa-8">
                            <p class="text-body-1 mb-6 text-center">
                                You are about to permanently delete <strong class="text-error">{{ accountToDelete?.name }}</strong>.
                            </p>
                            
                            <v-card variant="flat" class="pa-4 rounded-xl bg-grey-lighten-4 mb-8 border d-flex align-center gap-4">
                                <div class="stat-icon-wrapper red">
                                    <AlertTriangle :size="20" />
                                </div>
                                <div>
                                    <div class="text-h6 font-weight-black">{{ accountTxCount }}</div>
                                    <div class="text-caption font-weight-bold text-medium-emphasis uppercase ls-1">Historical Transactions</div>
                                </div>
                            </v-card>

                            <div class="bg-red-lighten-5 pa-4 rounded-lg mb-8 d-flex gap-3 align-center">
                                <v-icon color="error" size="small">mdi-alert-octagon</v-icon>
                                <span class="text-caption text-error font-weight-bold">Warning: This will also remove the account from all family reports and linked budget cycles.</span>
                            </div>

                            <div class="d-flex gap-3">
                                <v-btn variant="tonal" height="44" class="flex-grow-1 rounded-xl font-weight-bold text-none" @click="showAccountDeleteConfirm = false">
                                    <v-icon class="mr-1">mdi-arrow-left</v-icon> Keep Account
                                </v-btn>
                                <v-btn color="error" height="44" class="flex-grow-1 rounded-xl font-weight-black text-none" elevation="4" :loading="isDeletingAccount" @click="confirmAccountDelete">
                                    <Trash2 :size="18" class="mr-1" /> Confirm Delete
                                </v-btn>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-dialog>

                <!-- Pay Bill Modal -->
                <v-dialog v-model="showPayBillModal" max-width="450" persistent>
                    <v-card class="no-hover pa-8" rounded="xl" elevation="24" color="white">
                        <v-avatar color="primary" variant="tonal" size="72" class="mb-4 mx-auto elevation-2 d-flex">
                            <CreditCard :size="36" />
                        </v-avatar>
                        <h3 class="text-h5 font-weight-black text-center mb-1">Pay Credit Bill</h3>
                        <p class="text-subtitle-2 font-weight-medium opacity-60 text-center mb-6">
                            {{ payBillTarget?.name }} · Outstanding <strong class="text-error">{{ formatAmount(payBillTarget?.balance || 0) }}</strong>
                        </p>

                        <v-form @submit.prevent="handlePayBillSubmit">
                            <v-autocomplete
                                v-model="payBillForm.source_account_id"
                                label="Pay From"
                                :items="bankAccountsItems"
                                variant="outlined"
                                rounded="xl"
                                class="mb-4"
                                placeholder="Select bank account"
                            ></v-autocomplete>

                            <v-row dense>
                                <v-col cols="6">
                                    <v-text-field v-model.number="payBillForm.amount" label="Amount" type="number" variant="outlined" rounded="xl" class="mb-4" prefix="₹"></v-text-field>
                                </v-col>
                                <v-col cols="6">
                                    <v-text-field v-model="payBillForm.date" label="Date" type="date" variant="outlined" rounded="xl" class="mb-4"></v-text-field>
                                </v-col>
                            </v-row>

                            <div class="d-flex align-center justify-space-between pa-3 rounded-xl mb-6" style="background: rgba(var(--v-theme-on-surface), 0.03);">
                                <div>
                                    <div class="text-subtitle-2 font-weight-bold">Record Transaction</div>
                                    <div class="text-caption text-medium-emphasis">Debit from source account</div>
                                </div>
                                <v-switch v-model="payBillForm.record_transaction" color="primary" hide-details density="compact"></v-switch>
                            </div>

                            <div class="d-flex ga-3 justify-center">
                                <v-btn variant="text" rounded="pill" class="text-none font-weight-bold px-6" height="44" @click="showPayBillModal = false">
                                    Cancel
                                </v-btn>
                                <v-btn type="submit" color="primary" rounded="pill" class="text-none font-weight-black px-8 elevation-4" height="44" :loading="submittingPayBill">
                                    Confirm Payment
                                </v-btn>
                            </div>
                        </v-form>
                    </v-card>
                </v-dialog>
            </div>
        </v-container>
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
    Scale, Landmark, CreditCard, Plus, Check, X, AlertCircle, 
    Zap, Trash2, AlertTriangle, Search
} from 'lucide-vue-next'
import AccountCard from '@/components/finance/AccountCard.vue'
import AccountEditModal from '@/components/finance/AccountEditModal.vue'

const notify = useNotificationStore()
const router = useRouter()
const { formatAmount } = useCurrency()

// --- State ---
const accounts = ref<any[]>([])
const creditIntelligence = ref<any[]>([])
const auth = useAuthStore()
const loading = ref(false)
const activeTab = ref<'approved' | 'triage'>('approved')
const selectedType = ref('all')
const searchQuery = ref('')

// Modals
const showAccountModal = ref(false)
const editingAccount = ref<any>(null)
const showAccountDeleteConfirm = ref(false)
const accountToDelete = ref<any>(null)
const accountTxCount = ref(0)
const isDeletingAccount = ref(false)

const showPayBillModal = ref(false)
const payBillTarget = ref<any>(null)
const payBillForm = ref({
    source_account_id: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    record_transaction: true
})
const submittingPayBill = ref(false)

// --- Computed ---
const filteredAccounts = computed(() => {
    let list = accounts.value.filter(a => a.is_verified !== false)
    
    // Type filtering
    if (selectedType.value === 'bank') list = list.filter(a => a.type === 'BANK')
    if (selectedType.value === 'credit') list = list.filter(a => a.type === 'CREDIT_CARD')
    if (selectedType.value === 'loan') list = list.filter(a => a.type === 'LOAN')
    if (selectedType.value === 'investment') list = list.filter(a => a.type === 'INVESTMENT')
    if (selectedType.value === 'wallet') list = list.filter(a => a.type === 'WALLET')
    if (selectedType.value === 'other') list = list.filter(a => !['BANK', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'WALLET'].includes(a.type))
    
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

const untrustedAccounts = computed(() => accounts.value.filter(a => a.is_verified === false))

const accountMetrics = computed(() => {
    let total = 0; let bank = 0; let credit = 0
    accounts.value.forEach(a => {
        const bal = Number(a.balance || 0)
        if (a.type === 'CREDIT_CARD' || a.type === 'LOAN') {
            credit += bal
            total -= bal
        } else {
            total += bal
            if (a.type === 'BANK') bank += bal
        }
    })
    return { total, bank, credit }
})

const totalUtilization = computed(() => {
    let totalLimit = 0; let totalUsed = 0
    accounts.value.filter(a => a.type === 'CREDIT_CARD').forEach(a => {
        totalLimit += Number(a.credit_limit || 0)
        totalUsed += Number(a.balance || 0)
    })
    return totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0
})

const bankAccountsItems = computed(() => {
    return accounts.value
        .filter(a => a.type === 'BANK' && a.is_verified)
        .map(a => ({ title: `${a.name} (${formatAmount(a.balance)})`, value: a.id }))
})

const familyMembers = computed(() => auth.familyMembers)

const verifiedAccounts = computed(() => accounts.value.filter(a => a.is_verified !== false))

const accountTypeItems = computed(() => [
    { title: 'All Asset Types', value: 'all' },
    { title: '🏦 Bank Accounts', value: 'bank' },
    { title: '💳 Credit Cards', value: 'credit' },
    { title: '💸 Loans / EMIs', value: 'loan' },
    { title: '📈 Investments', value: 'investment' },
    { title: '👛 Wallets', value: 'wallet' },
    { title: '📁 Other', value: 'other' }
])


// --- Methods ---
async function fetchData() {
    loading.value = true
    try {
        const [accRes, intelRes] = await Promise.all([
            financeApi.getAccounts(auth.selectedMemberId || undefined, true),
            financeApi.getCreditIntelligence(auth.selectedMemberId || undefined)
        ])
        accounts.value = accRes.data
        creditIntelligence.value = intelRes.data
    } catch (err) {
        notify.error("Failed to load accounts")
    } finally {
        loading.value = false
    }
}

function getIntelligenceForAccount(id: string) {
    return creditIntelligence.value.find(i => i.id === id)
}

function getAccountTypeLabel(type: string) {
    const labels: any = { BANK: 'Bank Account', CREDIT_CARD: 'Credit Card', LOAN: 'Loan', WALLET: 'Wallet', INVESTMENT: 'Investment' }
    return labels[type] || type
}

function handleViewAccount(account: any) {
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

function openPayBillModal(account: any) {
    payBillTarget.value = account
    const intel = getIntelligenceForAccount(account.id)
    payBillForm.value = {
        source_account_id: '',
        amount: intel?.statement_balance || 0,
        date: new Date().toISOString().split('T')[0],
        description: `Bill Payment: ${account.name}`,
        record_transaction: true
    }
    showPayBillModal.value = true
}

async function handlePayBillSubmit() {
    if (!payBillTarget.value || !payBillForm.value.source_account_id) return
    submittingPayBill.value = true
    try {
        await financeApi.payCreditCardBill(payBillTarget.value.id, payBillForm.value)
        notify.success("Payment recorded successfully")
        showPayBillModal.value = false
        fetchData()
    } catch (e: any) {
        notify.error(e.response?.data?.detail || "Payment failed")
    } finally {
        submittingPayBill.value = false
    }
}

function resetFilters() {
    searchQuery.value = ''
    selectedType.value = 'all'
}

watch(() => auth.selectedMemberId, () => {
    fetchData()
})

onMounted(fetchData)
</script>

<style scoped>
.acc-icon-circle {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.acc-icon-circle.warning {
    background: #fffbeb;
    color: #d97706;
}

.stat-icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.metric-card {
    cursor: default;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.metric-card.raised {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px -10px rgba(var(--v-theme-primary), 0.15) !important;
    border-color: rgba(var(--v-theme-primary), 0.3) !important;
}

.premium-gradient-primary { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%) !important; }
.premium-gradient-success { background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%) !important; }
.premium-gradient-error { background: linear-gradient(135deg, #f43f5e 0%, #fb923c 100%) !important; }
.premium-gradient-warning { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%) !important; }

.stat-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(var(--v-theme-on-surface), 0.2);
}
.stat-dot.active {
    background: rgb(var(--v-theme-success));
    box-shadow: 0 0 0 2px rgba(var(--v-theme-success), 0.2);
    animation: pulse 2s infinite;
}

/* Mesh Background */
.mesh-blob {
    position: absolute;
    filter: blur(80px);
    opacity: 0.15;
    z-index: 1;
    border-radius: 50%;
    animation: blob-float 20s infinite alternate;
}

.blob-1 {
    background: rgb(var(--v-theme-primary));
    width: 600px;
    height: 600px;
    top: -200px;
    right: -100px;
}

.blob-2 {
    background: rgb(var(--v-theme-secondary));
    width: 400px;
    height: 400px;
    bottom: -100px;
    left: -100px;
    animation-delay: -5s;
}

.blob-3 {
    background: rgb(var(--v-theme-success));
    width: 300px;
    height: 300px;
    top: 40%;
    left: 30%;
    animation-delay: -8s;
}

@keyframes blob-float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(20px, -20px) scale(1.1); }
}

.relative-pos { position: relative; }
.z-10 { z-index: 10; }

@keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(var(--v-theme-success), 0); }
    100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-success), 0); }
}

.untrusted-card {
    border-left: 4px solid rgb(var(--v-theme-warning)) !important;
}

.add-account-placeholder {
    border: 2px dashed rgba(var(--v-border-color), 0.2);
    background: transparent !important;
    cursor: pointer;
    transition: all 0.3s ease;
}
.add-account-placeholder:hover {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.05) !important;
}

/* Premium Tabs */
.premium-pill-tabs {
    background: rgba(var(--v-theme-surface), 0.6);
    backdrop-filter: blur(10px);
    padding: 6px;
    border-radius: 24px;
    border: 1px solid rgba(var(--v-border-color), 0.1);
}

.premium-tab {
    text-transform: none !important;
    letter-spacing: 0;
    font-weight: 700;
    font-size: 0.9rem;
    color: rgb(var(--v-theme-on-surface), 0.6);
    transition: all 0.3s ease;
    min-width: 120px;
}

.premium-tab.v-tab--selected {
    background: rgb(var(--v-theme-primary));
    color: white !important;
    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
}

.search-field :deep(.v-field__outline),
.type-selector :deep(.v-field__outline) {
    display: none;
}

.search-field :deep(.v-field),
.type-selector :deep(.v-field) {
    background: rgba(var(--v-theme-on-surface), 0.03) !important;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.ls-1 { letter-spacing: 0.05em; }

.line-height-1 { line-height: 1; }

.btn-primary-glow {
    box-shadow: 0 4px 15px rgba(var(--v-theme-primary), 0.3);
}

.no-hover:hover {
    transform: none !important;
    box-shadow: none !important;
}

.border-b {
    border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}
</style>
