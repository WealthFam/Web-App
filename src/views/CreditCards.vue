<template>
    <MainLayout>
        <v-container fluid class="page-container dashboard-page">
            <!-- Animated Mesh Background -->
            <div class="mesh-blob blob-1"
                style="background: rgba(var(--v-theme-primary), 0.08); width: 600px; height: 600px; top: -200px; right: -100px;">
            </div>
            <div class="mesh-blob blob-2"
                style="background: rgba(var(--v-theme-secondary), 0.05); width: 450px; height: 450px; bottom: -100px; left: -100px;">
            </div>

            <div class="relative-pos z-10">
                <!-- Header -->
                <div class="d-flex flex-column flex-md-row justify-space-between align-md-center mb-8">
                    <div class="mb-4 mb-md-0">
                        <h1 class="text-h6 font-weight-black text-content mb-1">Credit Cards</h1>
                        <p class="text-subtitle-2 text-on-surface opacity-70 font-weight-bold d-flex align-center">
                            Track billing cycles, unbilled spends, due dates & credit utilization
                        </p>
                    </div>
                    <div class="d-flex gap-3 align-center">
                        <v-btn color="primary" variant="flat" rounded="pill" height="44" class="px-6 font-weight-bold"
                            @click="openAddModal">
                            <Plus :size="18" class="mr-2" />
                            Add Credit Card
                        </v-btn>
                    </div>
                </div>

                <!-- Summary Stats -->
                <v-row class="mb-8">
                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Total Outstanding</div>
                                <CreditCard :size="18" class="text-error opacity-70" />
                            </div>
                            <div class="text-h4 font-weight-black text-error">{{ formatAmount(totalOutstanding) }}</div>
                            <div class="text-caption text-medium-emphasis mt-1">Across {{ cards.length }} active card{{ cards.length === 1 ? '' : 's' }}</div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Available Limit</div>
                                <ShieldCheck :size="18" class="text-success opacity-70" />
                            </div>
                            <div class="text-h4 font-weight-black text-success">{{ formatAmount(totalAvailableLimit) }}</div>
                            <div class="text-caption text-medium-emphasis mt-1">Total Limit: {{ formatAmount(totalLimit) }}</div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Credit Utilization</div>
                                <v-chip size="x-small" :color="utilizationColor" variant="tonal" class="font-weight-black">
                                    {{ utilizationStatus }}
                                </v-chip>
                            </div>
                            <div class="text-h4 font-weight-black" :class="`text-${utilizationColor}`">
                                {{ overallUtilization.toFixed(1) }}%
                            </div>
                            <v-progress-linear :model-value="overallUtilization" :color="utilizationColor" height="6" rounded="pill" class="mt-2" />
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Upcoming Payment</div>
                                <Clock :size="18" class="text-warning opacity-70" />
                            </div>
                            <div class="text-h4 font-weight-black text-content">{{ formatAmount(nextDueAmount) }}</div>
                            <div class="text-caption font-weight-bold mt-1" :class="nextDueStatusClass">
                                {{ nextDueNotice }}
                            </div>
                        </v-card>
                    </v-col>
                </v-row>

                <!-- Empty State -->
                <div v-if="!loading && cards.length === 0"
                    class="premium-glass-card d-flex flex-column align-center justify-center py-16 px-10 text-center mx-auto"
                    style="max-width: 600px; margin-top: 50px;">
                    <v-avatar color="primary" variant="tonal" size="100" class="mb-8">
                        <CreditCard :size="50" class="text-primary" />
                    </v-avatar>
                    <h3 class="text-h4 font-weight-black mb-1">No Credit Cards</h3>
                    <p class="text-subtitle-1 text-on-surface opacity-70 font-weight-bold mb-8">
                        Add a credit card to track billing periods, unbilled purchases, and payment due dates.
                    </p>
                    <v-btn color="primary" variant="flat" rounded="pill" height="52"
                        class="px-10 font-weight-black elevation-2" @click="openAddModal">
                        Add Your First Card
                    </v-btn>
                </div>

                <!-- Cards & Cycles Content -->
                <div v-else>
                    <!-- Cards Grid -->
                    <h2 class="text-subtitle-1 font-weight-black text-uppercase text-medium-emphasis letter-spacing-1 mb-4">
                        Your Cards ({{ cards.length }})
                    </h2>
                    <v-row class="mb-8">
                        <v-col v-for="card in cards" :key="card.id" cols="12" md="6" lg="4">
                            <v-card class="premium-glass-card card-item pa-5 h-100 d-flex flex-column justify-space-between"
                                :class="{ 'is-active-card': selectedCard?.id === card.id }"
                                @click="selectCard(card)"
                                elevation="0">
                                <div>
                                    <!-- Card Header: Network + Name + More -->
                                    <div class="d-flex justify-space-between align-start mb-4">
                                        <div>
                                            <div class="d-flex align-center gap-2 mb-1">
                                                <v-chip size="x-small" :color="getNetworkColor(card.card_network)" variant="flat" class="font-weight-black">
                                                    {{ card.card_network || 'CARD' }}
                                                </v-chip>
                                                <span v-if="card.card_tier" class="text-caption font-weight-bold text-medium-emphasis">
                                                    {{ card.card_tier }}
                                                </span>
                                            </div>
                                            <div class="text-h6 font-weight-black text-content line-clamp-1">{{ card.name }}</div>
                                            <div class="text-caption font-mono text-medium-emphasis">
                                                •••• {{ card.card_last_4 || 'XXXX' }}
                                            </div>
                                        </div>
                                        <div class="d-flex align-center gap-1">
                                            <v-chip size="x-small" :color="getStatusColor(card.status)" variant="tonal" class="font-weight-black">
                                                {{ card.status }}
                                            </v-chip>
                                            <v-menu location="bottom end">
                                                <template v-slot:activator="{ props }">
                                                    <v-btn icon size="x-small" variant="text" v-bind="props" @click.stop>
                                                        <MoreVertical :size="16" />
                                                    </v-btn>
                                                </template>
                                                <v-list density="compact" rounded="lg">
                                                    <v-list-item @click="openPayModal(card)">
                                                        <template v-slot:prepend><DollarSign :size="14" class="mr-2 text-primary" /></template>
                                                        <v-list-item-title class="font-weight-bold">Pay Bill</v-list-item-title>
                                                    </v-list-item>
                                                    <v-list-item @click="openEditModal(card)">
                                                        <template v-slot:prepend><Edit2 :size="14" class="mr-2" /></template>
                                                        <v-list-item-title class="font-weight-bold">Edit Details</v-list-item-title>
                                                    </v-list-item>
                                                    <v-list-item @click="confirmDeleteCard(card)" class="text-error">
                                                        <template v-slot:prepend><Trash2 :size="14" class="mr-2 text-error" /></template>
                                                        <v-list-item-title class="font-weight-bold">Delete Card</v-list-item-title>
                                                    </v-list-item>
                                                </v-list>
                                            </v-menu>
                                        </div>
                                    </div>

                                    <!-- Outstanding & Limit -->
                                    <div class="mb-4">
                                        <div class="d-flex justify-space-between align-end mb-1">
                                            <div>
                                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Current Outstanding</div>
                                                <div class="text-h5 font-weight-black text-error">{{ formatAmount(card.balance) }}</div>
                                            </div>
                                            <div class="text-right">
                                                <div class="text-caption font-weight-bold text-medium-emphasis">LIMIT: {{ formatAmount(card.credit_limit) }}</div>
                                                <div class="text-caption font-weight-bold text-success">Avail: {{ formatAmount(card.available_limit) }}</div>
                                            </div>
                                        </div>
                                        <v-progress-linear :model-value="card.utilization" :color="card.utilization > 70 ? 'error' : (card.utilization > 30 ? 'warning' : 'primary')" height="6" rounded="pill" />
                                        <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
                                            <span>{{ card.utilization }}% utilized</span>
                                            <span>Statement Day: {{ card.billing_day || 'N/A' }}</span>
                                        </div>
                                    </div>

                                    <!-- Cycle Timeline Stepper -->
                                    <div class="cycle-timeline-box pa-3 rounded-lg mb-4">
                                        <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                                            <span class="text-medium-emphasis">Last Bill: {{ formatDate(card.last_statement_date) }}</span>
                                            <span :class="card.days_until_due != null && card.days_until_due <= 3 ? 'text-error font-weight-black' : 'text-primary'">
                                                {{ card.days_until_due != null ? (card.days_until_due < 0 ? 'Overdue!' : `Due in ${card.days_until_due}d`) : 'Due Date' }}
                                            </span>
                                        </div>
                                        <div class="d-flex justify-space-between align-center text-caption">
                                            <span>Bill Due: <strong>{{ formatAmount(card.statement_balance) }}</strong></span>
                                            <span class="text-secondary">Unbilled: <strong>{{ formatAmount(card.unbilled_spend) }}</strong></span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Card Actions -->
                                <div class="d-flex gap-2 mt-2">
                                    <v-btn color="primary" variant="flat" size="small" rounded="pill" class="flex-grow-1 font-weight-bold" @click.stop="openPayModal(card)">
                                        <CheckCircle2 :size="14" class="mr-1" />
                                        Pay Bill
                                    </v-btn>
                                    <v-btn variant="tonal" size="small" rounded="pill" class="font-weight-bold" @click.stop="selectCard(card)">
                                        <Layers :size="14" class="mr-1" />
                                        View Cycle
                                    </v-btn>
                                </div>
                            </v-card>
                        </v-col>
                    </v-row>

                    <!-- Cycle Transactions Section -->
                    <div v-if="selectedCard" class="mt-8">
                        <div class="d-flex flex-column flex-md-row justify-space-between align-md-center mb-4">
                            <div>
                                <h2 class="text-h6 font-weight-black text-content d-flex align-center">
                                    <Receipt :size="20" class="mr-2 text-primary" />
                                    {{ selectedCard.name }} — Cycle Ledger
                                </h2>
                                <p class="text-caption text-medium-emphasis">
                                    Transactions filtered strictly by billing cycle rather than calendar month.
                                </p>
                            </div>

                            <!-- Cycle Horizon Switcher -->
                            <div class="d-flex gap-2 mt-3 mt-md-0">
                                <v-btn-toggle v-model="selectedCycle" mandatory rounded="pill" density="comfortable" color="primary" variant="tonal">
                                    <v-btn value="current_unbilled" class="text-none font-weight-bold">
                                        Unbilled Spends
                                    </v-btn>
                                    <v-btn value="last_statement" class="text-none font-weight-bold">
                                        Last Statement
                                    </v-btn>
                                    <v-btn value="all" class="text-none font-weight-bold">
                                        All History
                                    </v-btn>
                                </v-btn-toggle>
                            </div>
                        </div>

                        <!-- Cycle Summary Snippet -->
                        <div class="premium-glass-card pa-4 mb-4 rounded-xl d-flex flex-wrap justify-space-between align-center">
                            <div class="d-flex align-center gap-4">
                                <div>
                                    <span class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Horizon:</span>
                                    <span class="font-weight-black text-primary ml-2">{{ cycleHorizonLabel }}</span>
                                </div>
                                <v-divider vertical class="mx-2" />
                                <div>
                                    <span class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Cycle Total:</span>
                                    <span class="font-weight-black ml-2" :class="selectedCycle === 'current_unbilled' ? 'text-secondary' : 'text-error'">
                                        {{ formatAmount(selectedCycle === 'current_unbilled' ? selectedCard.unbilled_spend : selectedCard.statement_balance) }}
                                    </span>
                                </div>
                            </div>
                            <div class="text-caption text-medium-emphasis font-weight-bold">
                                Statement Day: {{ selectedCard.billing_day || 'N/A' }} | Next Due: {{ formatDate(selectedCard.next_due_date) }}
                            </div>
                        </div>

                        <!-- Transactions Table -->
                        <v-card class="premium-glass-card pa-0 overflow-hidden" elevation="0">
                            <v-data-table
                                :headers="txHeaders"
                                :items="cycleTransactions"
                                :loading="loadingTransactions"
                                density="comfortable"
                                class="bg-transparent"
                                hide-default-footer
                            >
                                <template v-slot:item.date="{ item }">
                                    <div class="font-weight-bold text-caption">{{ formatDate(item.date) }}</div>
                                </template>
                                <template v-slot:item.description="{ item }">
                                    <div class="font-weight-bold text-body-2">{{ item.recipient || item.description || 'Transaction' }}</div>
                                    <div class="text-caption text-medium-emphasis line-clamp-1">{{ item.description }}</div>
                                </template>
                                <template v-slot:item.category="{ item }">
                                    <v-chip size="x-small" variant="tonal" color="primary" class="font-weight-bold">
                                        {{ item.category || 'Uncategorized' }}
                                    </v-chip>
                                </template>
                                <template v-slot:item.amount="{ item }">
                                    <div class="font-weight-black text-body-1" :class="Number(item.amount) >= 0 ? 'text-success' : 'text-error'">
                                        {{ Number(item.amount) >= 0 ? '+' : '-' }}{{ formatAmount(Math.abs(item.amount)) }}
                                    </div>
                                </template>
                                <template v-slot:no-data>
                                    <div class="py-12 text-center text-medium-emphasis">
                                        <CheckCircle2 :size="32" class="mb-2 text-success opacity-50" />
                                        <div class="font-weight-bold">No transactions found in this cycle</div>
                                        <div class="text-caption">Transactions made after the statement closing date will appear here.</div>
                                    </div>
                                </template>
                            </v-data-table>
                        </v-card>
                    </div>
                </div>
            </div>

            <!-- Add / Edit Card Modal -->
            <v-dialog v-model="cardModal" max-width="600" persistent>
                <v-card class="premium-glass-card pa-6 rounded-2xl" elevation="0">
                    <div class="d-flex justify-space-between align-center mb-6">
                        <div class="text-h6 font-weight-black text-content">
                            {{ isEditingCard ? 'Edit Credit Card' : 'Add Credit Card' }}
                        </div>
                        <v-btn icon size="small" variant="text" @click="cardModal = false">
                            <X :size="18" />
                        </v-btn>
                    </div>

                    <v-form @submit.prevent="saveCard">
                        <v-text-field v-model="cardForm.name" label="Card Name *" placeholder="e.g. HDFC Swiggy, ICICI Sapphiro"
                            variant="outlined" density="comfortable" rounded="lg" class="mb-4 font-weight-bold"
                            :rules="[rules.required]" />

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-text-field v-model.number="cardForm.credit_limit" label="Total Credit Limit (₹) *"
                                    type="number" prefix="₹" variant="outlined" density="comfortable" rounded="lg" class="font-weight-bold"
                                    :rules="[rules.positive]" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field v-model="cardForm.card_last_4" label="Last 4 Digits" placeholder="7119" maxlength="4"
                                    variant="outlined" density="comfortable" rounded="lg" class="font-weight-bold" />
                            </v-col>
                        </v-row>

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-text-field v-model.number="cardForm.billing_day" label="Statement / Billing Day (1-31)"
                                    type="number" min="1" max="31" variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field v-model.number="cardForm.due_day" label="Payment Due Day (1-31)"
                                    type="number" min="1" max="31" variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                        </v-row>

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-select v-model="cardForm.card_network" :items="networkOptions" label="Card Network"
                                    variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field v-model="cardForm.card_tier" label="Card Tier / Program" placeholder="e.g. Rewards, Cashback, Miles"
                                    variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                        </v-row>

                        <v-text-field v-if="!isEditingCard" v-model.number="cardForm.initial_balance" label="Current Outstanding Balance (₹)"
                            type="number" prefix="₹" variant="outlined" density="comfortable" rounded="lg" class="mb-4 font-weight-bold"
                            hint="Amount you currently owe on this card" persistent-hint />

                        <div class="d-flex justify-end gap-3 mt-6">
                            <v-btn variant="text" rounded="pill" @click="cardModal = false">Cancel</v-btn>
                            <v-btn color="primary" variant="flat" rounded="pill" class="px-8 font-weight-black" type="submit" :loading="savingCard">
                                {{ isEditingCard ? 'Save Changes' : 'Create Card' }}
                            </v-btn>
                        </div>
                    </v-form>
                </v-card>
            </v-dialog>

            <!-- Pay Bill Modal -->
            <v-dialog v-model="payModal" max-width="500" persistent>
                <v-card class="premium-glass-card pa-6 rounded-2xl" elevation="0">
                    <div class="d-flex justify-space-between align-center mb-6">
                        <div>
                            <div class="text-h6 font-weight-black text-content">Pay Credit Card Bill</div>
                            <div class="text-caption text-medium-emphasis">{{ payingCard?.name }}</div>
                        </div>
                        <v-btn icon size="small" variant="text" @click="payModal = false">
                            <X :size="18" />
                        </v-btn>
                    </div>

                    <v-form @submit.prevent="submitBillPayment">
                        <v-select v-model="payForm.source_account_id" :items="bankAccountOptions" item-title="title" item-value="value"
                            label="Pay From (Bank Account) *" variant="outlined" density="comfortable" rounded="lg" class="mb-4 font-weight-bold"
                            :rules="[rules.required]" />

                        <div class="d-flex gap-2 mb-3">
                            <v-btn size="x-small" variant="tonal" rounded="pill" color="primary" @click="setPayAmount(payingCard?.statement_balance)">
                                Statement Due: {{ formatAmount(payingCard?.statement_balance || 0) }}
                            </v-btn>
                            <v-btn size="x-small" variant="tonal" rounded="pill" color="warning" @click="setPayAmount(payingCard?.minimum_due)">
                                Min Due: {{ formatAmount(payingCard?.minimum_due || 0) }}
                            </v-btn>
                            <v-btn size="x-small" variant="tonal" rounded="pill" color="error" @click="setPayAmount(payingCard?.balance)">
                                Total Owed: {{ formatAmount(payingCard?.balance || 0) }}
                            </v-btn>
                        </div>

                        <v-text-field v-model.number="payForm.amount" label="Payment Amount (₹) *" type="number" prefix="₹"
                            variant="outlined" density="comfortable" rounded="lg" class="mb-4 font-weight-black"
                            :rules="[rules.positive]" />

                        <v-text-field v-model="payForm.date" label="Payment Date *" type="date"
                            variant="outlined" density="comfortable" rounded="lg" class="mb-4 font-weight-bold" />

                        <v-text-field v-model="payForm.description" label="Remarks / Note" placeholder="Bill Payment"
                            variant="outlined" density="comfortable" rounded="lg" class="mb-4" />

                        <div class="d-flex justify-end gap-3 mt-6">
                            <v-btn variant="text" rounded="pill" @click="payModal = false">Cancel</v-btn>
                            <v-btn color="primary" variant="flat" rounded="pill" class="px-8 font-weight-black" type="submit" :loading="payingBill">
                                Record Payment
                            </v-btn>
                        </div>
                    </v-form>
                </v-card>
            </v-dialog>
        </v-container>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
    CreditCard, Plus, ShieldCheck, Clock, Layers, Receipt, CheckCircle2,
    MoreVertical, Edit2, Trash2, DollarSign, X
} from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'

const { formatAmount } = useCurrency()
const notification = useNotificationStore()

const rules = {
    required: (v: any) => !!v || 'This field is required',
    positive: (v: any) => Number(v) > 0 || 'Must be greater than 0'
}

const loading = ref(true)
const cards = ref<any[]>([])
const selectedCard = ref<any>(null)

// Cycle transactions state
const selectedCycle = ref('current_unbilled')
const cycleTransactions = ref<any[]>([])
const loadingTransactions = ref(false)

const txHeaders = [
    { title: 'Date', key: 'date', sortable: true, width: '120px' },
    { title: 'Merchant / Description', key: 'description' },
    { title: 'Category', key: 'category', width: '150px' },
    { title: 'Amount', key: 'amount', align: 'end' as const, width: '150px' }
]

const networkOptions = ['VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'OTHER']

// Bank accounts for bill pay
const bankAccounts = ref<any[]>([])

// Card Modal State
const cardModal = ref(false)
const isEditingCard = ref(false)
const savingCard = ref(false)
const cardForm = reactive({
    id: '',
    name: '',
    credit_limit: 100000,
    card_last_4: '',
    billing_day: 15,
    due_day: 5,
    card_network: 'VISA',
    card_tier: '',
    initial_balance: 0
})

// Pay Modal State
const payModal = ref(false)
const payingCard = ref<any>(null)
const payingBill = ref(false)
const payForm = reactive({
    source_account_id: '',
    amount: 0,
    date: new Date().toISOString().substring(0, 10),
    description: 'Credit Card Bill Payment'
})

// Metrics computed
const totalOutstanding = computed(() => cards.value.reduce((s, c) => s + Number(c.balance || 0), 0))
const totalLimit = computed(() => cards.value.reduce((s, c) => s + Number(c.credit_limit || 0), 0))
const totalAvailableLimit = computed(() => cards.value.reduce((s, c) => s + Number(c.available_limit || 0), 0))

const overallUtilization = computed(() => {
    if (totalLimit.value <= 0) return 0
    return Math.min(100, Math.max(0, (totalOutstanding.value / totalLimit.value) * 100))
})

const utilizationColor = computed(() => {
    if (overallUtilization.value > 70) return 'error'
    if (overallUtilization.value > 30) return 'warning'
    return 'success'
})

const utilizationStatus = computed(() => {
    if (overallUtilization.value > 70) return 'High Debt'
    if (overallUtilization.value > 30) return 'Moderate'
    return 'Optimal (<30%)'
})

const nextDueCard = computed(() => {
    const withDue = cards.value.filter(c => c.days_until_due != null && Number(c.statement_balance || 0) > 0)
    if (!withDue.length) return null
    return withDue.sort((a, b) => (a.days_until_due || 999) - (b.days_until_due || 999))[0]
})

const nextDueAmount = computed(() => nextDueCard.value ? Number(nextDueCard.value.statement_balance || 0) : 0)

const nextDueNotice = computed(() => {
    if (!nextDueCard.value) return 'No pending statement bills'
    const days = nextDueCard.value.days_until_due
    if (days < 0) return `⚠️ Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}!`
    if (days === 0) return '⚡ Due Today!'
    if (days <= 3) return `🔥 Due in ${days} day${days === 1 ? '' : 's'} (${nextDueCard.value.name})`
    return `Due in ${days} days on ${formatDate(nextDueCard.value.next_due_date)}`
})

const nextDueStatusClass = computed(() => {
    if (!nextDueCard.value) return 'text-medium-emphasis'
    const days = nextDueCard.value.days_until_due
    if (days <= 3) return 'text-error font-weight-black'
    return 'text-warning'
})

const cycleHorizonLabel = computed(() => {
    if (selectedCycle.value === 'current_unbilled') return 'Current Unbilled Cycle (Live Spends)'
    if (selectedCycle.value === 'last_statement') return 'Last Closed Statement Period'
    return 'All Lifetime Transactions'
})

const bankAccountOptions = computed(() => {
    return bankAccounts.value.map(b => ({
        title: `${b.name} (${formatAmount(b.balance)})`,
        value: b.id
    }))
})

function formatDate(iso?: string) {
    if (!iso) return 'N/A'
    try {
        const d = new Date(iso)
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
        return iso
    }
}

function getNetworkColor(network?: string) {
    switch ((network || '').toUpperCase()) {
        case 'VISA': return 'primary'
        case 'MASTERCARD': return 'warning'
        case 'RUPAY': return 'success'
        case 'AMEX': return 'info'
        default: return 'secondary'
    }
}

function getStatusColor(status?: string) {
    switch (status) {
        case 'Healthy': return 'success'
        case 'Moderate': return 'warning'
        case 'High Utilization': return 'error'
        case 'Due Soon': return 'warning'
        case 'Overdue': return 'error'
        default: return 'primary'
    }
}

async function fetchCards() {
    loading.value = true
    try {
        const res = await financeApi.getCreditCards()
        cards.value = res.data || []
        if (cards.value.length > 0 && !selectedCard.value) {
            selectCard(cards.value[0])
        }
    } catch (e) {
        console.error('Failed to fetch credit cards', e)
        notification.error('Failed to load credit cards')
    } finally {
        loading.value = false
    }
}

async function fetchBankAccounts() {
    try {
        const res = await financeApi.getAccounts()
        const raw = res.data?.data || res.data || []
        bankAccounts.value = raw.filter((a: any) => a.type === 'BANK' && !a.is_deleted)
    } catch (e) {
        console.error('Failed to load bank accounts', e)
    }
}

async function selectCard(card: any) {
    selectedCard.value = card
    await fetchCycleTransactions()
}

async function fetchCycleTransactions() {
    if (!selectedCard.value) return
    loadingTransactions.value = true
    try {
        const res = await financeApi.getCreditCardCycleTransactions(selectedCard.value.account_id, {
            cycle: selectedCycle.value,
            limit: 50
        })
        cycleTransactions.value = res.data?.items || []
    } catch (e) {
        console.error('Failed to fetch cycle transactions', e)
    } finally {
        loadingTransactions.value = false
    }
}

watch(selectedCycle, () => {
    fetchCycleTransactions()
})

function openAddModal() {
    isEditingCard.value = false
    cardForm.id = ''
    cardForm.name = ''
    cardForm.credit_limit = 100000
    cardForm.card_last_4 = ''
    cardForm.billing_day = 15
    cardForm.due_day = 5
    cardForm.card_network = 'VISA'
    cardForm.card_tier = ''
    cardForm.initial_balance = 0
    cardModal.value = true
}

function openEditModal(card: any) {
    isEditingCard.value = true
    cardForm.id = card.account_id || card.id
    cardForm.name = card.name
    cardForm.credit_limit = Number(card.credit_limit || 0)
    cardForm.card_last_4 = card.card_last_4 || ''
    cardForm.billing_day = card.billing_day || 15
    cardForm.due_day = card.due_day || 5
    cardForm.card_network = card.card_network || 'VISA'
    cardForm.card_tier = card.card_tier || ''
    cardModal.value = true
}

async function saveCard() {
    savingCard.value = true
    try {
        if (isEditingCard.value) {
            await financeApi.updateCreditCard(cardForm.id, {
                name: cardForm.name,
                credit_limit: cardForm.credit_limit,
                billing_day: cardForm.billing_day,
                due_day: cardForm.due_day,
                card_network: cardForm.card_network,
                card_tier: cardForm.card_tier,
                card_last_4: cardForm.card_last_4
            })
            notification.success('Credit card updated successfully')
        } else {
            await financeApi.createCreditCard(cardForm)
            notification.success('Credit card created successfully')
        }
        cardModal.value = false
        await fetchCards()
    } catch (e) {
        console.error('Failed to save credit card', e)
        notification.error('Failed to save credit card')
    } finally {
        savingCard.value = false
    }
}

async function confirmDeleteCard(card: any) {
    if (!confirm(`Are you sure you want to delete ${card.name}? All transaction history will be preserved.`)) return
    try {
        await financeApi.deleteCreditCard(card.account_id || card.id)
        notification.success('Card deleted')
        if (selectedCard.value?.id === card.id) selectedCard.value = null
        await fetchCards()
    } catch (e) {
        console.error('Failed to delete card', e)
        notification.error('Failed to delete card')
    }
}

function openPayModal(card: any) {
    payingCard.value = card
    payForm.source_account_id = bankAccounts.value[0]?.id || ''
    payForm.amount = Number(card.statement_balance || card.balance || 0)
    payForm.date = new Date().toISOString().substring(0, 10)
    payForm.description = `Bill Payment for ${card.name}`
    payModal.value = true
}

function setPayAmount(amount: any) {
    payForm.amount = Number(amount || 0)
}

async function submitBillPayment() {
    if (!payingCard.value) return
    payingBill.value = true
    try {
        await financeApi.payCardBill(payingCard.value.account_id || payingCard.value.id, {
            source_account_id: payForm.source_account_id,
            amount: payForm.amount,
            date: payForm.date,
            description: payForm.description
        })
        notification.success('Payment recorded successfully!')
        payModal.value = false
        await fetchCards()
        if (selectedCard.value?.id === payingCard.value.id) {
            await fetchCycleTransactions()
        }
    } catch (e) {
        console.error('Failed to record payment', e)
        notification.error('Payment record failed')
    } finally {
        payingBill.value = false
    }
}

onMounted(() => {
    fetchCards()
    fetchBankAccounts()
})
</script>

<style scoped>
.is-active-card {
    border: 2px solid rgb(var(--v-theme-primary)) !important;
    background: rgba(var(--v-theme-primary), 0.04) !important;
}

.cycle-timeline-box {
    background: rgba(var(--v-theme-surface-variant), 0.3);
    border: 1px solid rgba(var(--v-theme-outline), 0.15);
}
</style>
