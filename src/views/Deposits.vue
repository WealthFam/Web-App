<template>
    <MainLayout>
        <div class="space-y-5">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
                        <Landmark class="w-4.5 h-4.5 text-wf-primary" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-lg sm:text-xl font-bold text-wf-text-primary tracking-tight leading-tight">
                                Fixed & Recurring Deposits
                            </h1>
                            <span class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                {{ deposits.length }} Active
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary mt-0.5">
                            Track guaranteed-return deposits, compounding interest & maturity schedules.
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 self-start sm:self-auto">
                    <WfButton
                        variant="primary"
                        size="sm"
                        @click="openAddModal"
                        class="h-8 px-3 text-xs font-semibold"
                    >
                        <Plus :size="14" class="mr-1" />
                        <span>Add Deposit</span>
                    </WfButton>
                </div>
            </div>

            <!-- Summary Stats Strip -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Principal Invested -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-info-light text-wf-info border border-blue-500/20 flex items-center justify-center shrink-0">
                            <Landmark :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Principal Invested
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-wf-text-primary mt-0.5">
                            {{ formatAmount(totalPrincipal) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Across {{ deposits.length }} active deposit{{ deposits.length === 1 ? '' : 's' }}
                        </div>
                    </div>
                </WfCard>

                <!-- Projected Maturity -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-success-light text-wf-success border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <TrendingUp :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Projected Maturity
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-wf-success mt-0.5">
                            {{ formatAmount(totalMaturity) }}
                        </div>
                        <div class="text-[11px] text-wf-success font-semibold mt-1">
                            +{{ formatAmount(totalProjectedInterest) }} Guaranteed Returns
                        </div>
                    </div>
                </WfCard>

                <!-- Accrued Interest -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <Coins :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Accrued Interest
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {{ formatAmount(totalAccrued) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Interest earned to date
                        </div>
                    </div>
                </WfCard>

                <!-- Next Maturity -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-warning-light text-wf-warning border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Calendar :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Next Maturity
                        </div>
                        <div class="text-base sm:text-lg font-bold font-mono tracking-tight text-wf-text-primary truncate mt-0.5">
                            {{ nextMaturityNotice }}
                        </div>
                        <div class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 truncate">
                            {{ nextMaturityDays }}
                        </div>
                    </div>
                </WfCard>
            </div>

            <!-- Unified Toolbar (Matching Accounts.vue) -->
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
                            placeholder="Search by deposit name, bank or certificate #..."
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

                    <!-- Add Deposit CTA -->
                    <WfButton
                        variant="primary"
                        size="sm"
                        class="shrink-0"
                        @click="openAddModal"
                    >
                        <Plus :size="14" class="mr-1" />
                        <span>Add Deposit</span>
                    </WfButton>
                </div>
            </WfCard>

            <!-- Loading State -->
            <div v-if="loading" class="p-12 text-center flex flex-col items-center justify-center text-wf-text-muted">
                <div class="w-8 h-8 border-2 border-wf-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                <span class="text-xs font-semibold">Loading fixed deposits...</span>
            </div>

            <!-- Empty State (No Deposits Added) -->
            <div 
                v-else-if="deposits.length === 0"
                class="p-12 rounded-wf-xl bg-wf-surface border border-wf-border text-center max-w-lg mx-auto shadow-sm"
            >
                <div class="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-wf-primary flex items-center justify-center mx-auto mb-4 border border-indigo-200 dark:border-indigo-900/60">
                    <Landmark :size="32" />
                </div>
                <h3 class="text-base font-bold text-wf-text-primary mb-1">No Deposits Added</h3>
                <p class="text-xs text-wf-text-secondary mb-6 leading-relaxed">
                    Track bank Fixed Deposits (FDs) and Recurring Deposits (RDs) with automatic compounding math and maturity schedules.
                </p>
                <WfButton
                    variant="primary"
                    size="md"
                    @click="openAddModal"
                    class="h-9 px-5 text-xs font-semibold"
                >
                    <Plus :size="14" class="mr-1.5" />
                    <span>Add Your First Deposit</span>
                </WfButton>
            </div>

            <!-- Deposits Grid -->
            <div v-else class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <WfCard 
                        v-for="dep in filteredDeposits" 
                        :key="dep.id"
                        variant="flat"
                        padding="sm"
                        radius="lg"
                        class="group h-full flex flex-col justify-between transition-all duration-150 hover:shadow-wf-card-hover border border-wf-border hover:border-wf-primary/40 cursor-pointer"
                        @click="openEditModal(dep)"
                    >
                        <div>
                            <!-- Header -->
                            <div class="flex items-start justify-between gap-2 mb-2">
                                <div class="flex items-start gap-2.5 min-w-0 flex-1">
                                    <div class="w-8 h-8 rounded-wf-md flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <Landmark :size="16" />
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="text-xs sm:text-sm font-bold text-wf-text-primary truncate" :title="dep.name">
                                            {{ dep.name }}
                                        </div>
                                        <div class="flex items-center gap-1.5 text-xs text-wf-text-muted mt-0.5">
                                            <span class="text-[10px] font-semibold uppercase tracking-wider">
                                                {{ dep.deposit_type === 'RECURRING' ? 'RD' : 'FD' }}
                                            </span>
                                            <span v-if="dep.bank_name" class="truncate text-[10px] text-wf-text-muted">
                                                • {{ dep.bank_name }}
                                            </span>
                                            <span v-if="dep.is_tax_saver" class="font-bold text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded-wf-xs">
                                                80C
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex items-center gap-1 shrink-0" @click.stop>
                                    <span class="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                                        {{ dep.interest_rate }}%
                                    </span>

                                    <!-- Dropdown Menu (Using WfMenu) -->
                                    <WfMenu align="right">
                                        <template #trigger>
                                            <MoreVertical :size="14" />
                                        </template>
                                        <div class="py-1">
                                            <button 
                                                type="button" 
                                                class="w-full text-left px-3 py-1.5 text-xs font-semibold text-wf-text-primary hover:bg-wf-surface-variant flex items-center gap-2 cursor-pointer"
                                                @click="openEditModal(dep)"
                                            >
                                                <Edit2 :size="13" class="text-wf-text-muted" />
                                                <span>Edit</span>
                                            </button>
                                            <button 
                                                type="button" 
                                                class="w-full text-left px-3 py-1.5 text-xs font-semibold text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                                                @click="requestDeleteDeposit(dep)"
                                            >
                                                <Trash2 :size="13" class="text-wf-error" />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </WfMenu>
                                </div>
                            </div>

                            <!-- Progress to Maturity -->
                            <div class="space-y-1 my-2">
                                <div class="flex items-center justify-between text-[11px]">
                                    <span class="text-wf-text-muted">Matures: {{ formatDate(dep.maturity_date) }}</span>
                                    <span class="font-bold text-wf-primary font-mono">{{ dep.progress_percentage }}%</span>
                                </div>
                                <div class="w-full bg-wf-surface-variant rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        class="h-1.5 rounded-full bg-wf-primary transition-all duration-300"
                                        :style="{ width: `${Math.min(100, Math.max(0, dep.progress_percentage))}%` }"
                                    ></div>
                                </div>
                            </div>

                            <!-- Financial Breakdown Strip -->
                            <div class="p-2 rounded-wf-sm bg-wf-surface-variant/40 border border-wf-border-subtle grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                    <div class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted">Maturity Value</div>
                                    <div class="text-xs font-black text-wf-success tabular-nums mt-0.5">
                                        {{ formatAmount(dep.maturity_amount) }}
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted">Time Left</div>
                                    <div 
                                        class="text-xs font-bold mt-0.5"
                                        :class="dep.days_to_maturity <= 30 ? 'text-amber-500' : 'text-wf-text-primary'"
                                    >
                                        {{ dep.is_matured ? 'Matured 🎉' : `${dep.days_to_maturity}d` }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Card Footer -->
                        <div class="pt-2 border-t border-wf-border-subtle flex items-baseline justify-between mt-3">
                            <div>
                                <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider">Principal Invested</div>
                                <div class="text-sm sm:text-base font-bold font-mono tracking-tight text-wf-text-primary mt-0.5">
                                    {{ formatAmount(dep.principal_amount) }}
                                </div>
                            </div>
                            <span class="text-[11px] font-semibold text-wf-primary group-hover:underline">
                                Details
                            </span>
                        </div>
                    </WfCard>

                    <!-- Compact Add Deposit Placeholder Card (Matching Accounts.vue) -->
                    <div
                        v-if="!searchQuery"
                        class="border-2 border-dashed border-wf-border hover:border-wf-primary/50 rounded-wf-lg p-5 flex flex-col items-center justify-center transition-all cursor-pointer group hover:bg-wf-primary/[0.02] min-h-[140px]"
                        @click="openAddModal"
                    >
                        <div class="w-8 h-8 rounded-full bg-wf-primary/10 text-wf-primary flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
                            <Plus :size="18" />
                        </div>
                        <div class="text-xs font-bold text-wf-text-primary">
                            Add Deposit
                        </div>
                        <div class="text-[11px] text-wf-text-muted mt-0.5 text-center">
                            Create a fixed or recurring deposit
                        </div>
                    </div>
                </div>

                <!-- Empty Search State -->
                <div v-if="filteredDeposits.length === 0 && !loading" class="text-center py-16 animate-in">
                    <div class="w-16 h-16 rounded-full bg-wf-surface-variant text-wf-text-muted flex items-center justify-center mx-auto mb-4">
                        <Search :size="32" class="opacity-40" />
                    </div>
                    <h3 class="text-base font-bold text-wf-text-primary">No matching deposits</h3>
                    <p class="text-xs text-wf-text-muted mt-1 mb-4">Try adjusting your search query</p>
                    <WfButton variant="outline" size="sm" @click="searchQuery = ''">
                        <RotateCcw :size="13" class="mr-1.5" />
                        <span>Clear search</span>
                    </WfButton>
                </div>
            </div>

            <!-- Add / Edit Modal -->
            <WfModal
                v-model="depositModal"
                max-width="md"
                :title="isEditing ? 'Edit Deposit' : 'Add Deposit'"
                description="Configure principal amount, interest rate, tenure, and compounding"
            >
                <form @submit.prevent="saveDeposit" class="space-y-4 py-1">
                    <WfInput
                        v-model="depositForm.name"
                        label="Deposit Name"
                        placeholder="e.g. HDFC 1-Year Tax Saver FD, SBI 5-Year Recurring"
                        required
                    />

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfInput
                            v-model="depositForm.bank_name"
                            label="Bank / Institution"
                            placeholder="e.g. SBI, HDFC Bank, ICICI"
                            required
                        />
                        <WfSelect
                            v-model="depositForm.deposit_type"
                            label="Deposit Type"
                            :items="typeOptions"
                            required
                        />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfInput
                            v-model.number="depositForm.principal_amount"
                            label="Principal Amount (₹)"
                            type="number"
                            required
                            @input="recalculateMaturity"
                        />
                        <WfInput
                            v-model.number="depositForm.interest_rate"
                            label="Interest Rate (% p.a.)"
                            type="number"
                            step="0.05"
                            required
                            @input="recalculateMaturity"
                        />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfInput
                            v-model="depositForm.start_date"
                            label="Start Date"
                            type="date"
                            required
                            @change="recalculateMaturity"
                        />
                        <WfInput
                            v-model="depositForm.maturity_date"
                            label="Maturity Date"
                            type="date"
                            required
                            @change="recalculateMaturity"
                        />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfInput
                            v-model.number="depositForm.maturity_amount"
                            label="Projected Maturity Amount (₹)"
                            type="number"
                            required
                        />
                        <WfInput
                            v-model="depositForm.deposit_number"
                            label="Certificate / Account Number"
                            placeholder="Optional certificate #"
                        />
                    </div>

                    <!-- Tax Saver Checkbox -->
                    <div class="flex items-center gap-2 p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
                        <input
                            type="checkbox"
                            id="is_tax_saver"
                            v-model="depositForm.is_tax_saver"
                            class="rounded border-wf-border text-wf-primary focus:ring-wf-primary cursor-pointer"
                        />
                        <label for="is_tax_saver" class="text-xs font-semibold text-wf-text-primary cursor-pointer select-none">
                            Section 80C Tax Saver Deposit (5-Year Lock-in)
                        </label>
                    </div>

                    <div class="flex items-center justify-end gap-2 pt-3 border-t border-wf-border">
                        <WfButton
                            variant="outline"
                            size="sm"
                            type="button"
                            @click="depositModal = false"
                        >
                            Cancel
                        </WfButton>
                        <WfButton
                            variant="primary"
                            size="sm"
                            type="submit"
                            :loading="savingDeposit"
                        >
                            {{ isEditing ? 'Save Changes' : 'Create Deposit' }}
                        </WfButton>
                    </div>
                </form>
            </WfModal>

            <!-- Delete Confirmation Modal (Matching Accounts.vue) -->
            <WfModal
                v-model="showDeleteConfirm"
                max-width="sm"
                title="Delete Deposit?"
                description="Irreversible Action"
            >
                <div class="space-y-4 py-1">
                    <div class="p-3.5 rounded-wf-md bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <Trash2 :size="20" class="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div class="text-xs text-wf-text-primary">
                            You are about to permanently delete <strong class="text-rose-600 dark:text-rose-400">{{ depositToDelete?.name }}</strong>.
                        </div>
                    </div>

                    <div class="text-[11px] text-wf-text-muted italic bg-wf-surface-variant/20 p-2.5 rounded-wf-sm border border-wf-border-subtle">
                        Warning: This will remove the deposit and projected interest from portfolio net worth calculations.
                    </div>
                </div>

                <template #footer>
                    <div class="flex items-center justify-end gap-2 w-full">
                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="showDeleteConfirm = false"
                        >
                            Keep Deposit
                        </WfButton>
                        <WfButton
                            variant="danger"
                            size="sm"
                            :loading="isDeletingDeposit"
                            @click="confirmDeleteDepositAction"
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import {
    Landmark, Plus, TrendingUp, Coins, Calendar, MoreVertical, Edit2, Trash2,
    Search, X, RotateCcw
} from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfMenu from '@/components/ui/WfMenu.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'

const { formatAmount } = useCurrency()
const notification = useNotificationStore()

const loading = ref(true)
const deposits = ref<any[]>([])
const activeMenuId = ref<string | null>(null)
const searchQuery = ref('')

// Delete modal state
const showDeleteConfirm = ref(false)
const depositToDelete = ref<any>(null)
const isDeletingDeposit = ref(false)

// Deposit Modal State
const depositModal = ref(false)
const isEditing = ref(false)
const savingDeposit = ref(false)
const depositForm = reactive({
    id: '',
    name: '',
    bank_name: '',
    deposit_type: 'FIXED',
    principal_amount: 100000,
    interest_rate: 7.25,
    compounding_frequency: 'QUARTERLY',
    start_date: new Date().toISOString().substring(0, 10),
    maturity_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    maturity_amount: 107450,
    is_tax_saver: false,
    deposit_number: ''
})

const typeOptions = [
    { title: 'Fixed Deposit (FD)', value: 'FIXED' },
    { title: 'Recurring Deposit (RD)', value: 'RECURRING' }
]

// Filtered deposits based on search
const filteredDeposits = computed(() => {
    if (!searchQuery.value) return deposits.value
    const q = searchQuery.value.toLowerCase()
    return deposits.value.filter(d => 
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.bank_name && d.bank_name.toLowerCase().includes(q)) ||
        (d.deposit_number && d.deposit_number.toLowerCase().includes(q))
    )
})

// Metrics computed
const totalPrincipal = computed(() => deposits.value.reduce((s, d) => s + Number(d.principal_amount || 0), 0))
const totalMaturity = computed(() => deposits.value.reduce((s, d) => s + Number(d.maturity_amount || 0), 0))
const totalAccrued = computed(() => deposits.value.reduce((s, d) => s + Number(d.accrued_interest || 0), 0))
const totalProjectedInterest = computed(() => Math.max(0, totalMaturity.value - totalPrincipal.value))

const nextMaturityDeposit = computed(() => {
    const active = deposits.value.filter(d => !d.is_matured && d.days_to_maturity >= 0)
    if (!active.length) return null
    return active.sort((a, b) => a.days_to_maturity - b.days_to_maturity)[0]
})

const nextMaturityNotice = computed(() => {
    if (!nextMaturityDeposit.value) return 'No upcoming maturities'
    return nextMaturityDeposit.value.name
})

const nextMaturityDays = computed(() => {
    if (!nextMaturityDeposit.value) return 'All deposits matured or none active'
    const d = nextMaturityDeposit.value.days_to_maturity
    return `Matures in ${d} day${d === 1 ? '' : 's'} (${formatDate(nextMaturityDeposit.value.maturity_date)})`
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

async function fetchDeposits() {
    loading.value = true
    try {
        const res = await financeApi.getFixedDeposits()
        deposits.value = res.data || []
    } catch (e) {
        console.error('Failed to fetch deposits', e)
        notification.error('Failed to load deposits')
    } finally {
        loading.value = false
    }
}

function openAddModal() {
    isEditing.value = false
    depositForm.id = ''
    depositForm.name = ''
    depositForm.bank_name = ''
    depositForm.deposit_type = 'FIXED'
    depositForm.principal_amount = 100000
    depositForm.interest_rate = 7.25
    depositForm.compounding_frequency = 'QUARTERLY'
    depositForm.start_date = new Date().toISOString().substring(0, 10)
    depositForm.maturity_date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    depositForm.is_tax_saver = false
    depositForm.deposit_number = ''
    recalculateMaturity()
    depositModal.value = true
}

function openEditModal(dep: any) {
    isEditing.value = true
    depositForm.id = dep.id
    depositForm.name = dep.name
    depositForm.bank_name = dep.bank_name
    depositForm.deposit_type = dep.deposit_type
    depositForm.principal_amount = Number(dep.principal_amount || 0)
    depositForm.interest_rate = Number(dep.interest_rate || 0)
    depositForm.compounding_frequency = dep.compounding_frequency || 'QUARTERLY'
    depositForm.start_date = dep.start_date ? new Date(dep.start_date).toISOString().substring(0, 10) : ''
    depositForm.maturity_date = dep.maturity_date ? new Date(dep.maturity_date).toISOString().substring(0, 10) : ''
    depositForm.maturity_amount = Number(dep.maturity_amount || 0)
    depositForm.is_tax_saver = Boolean(dep.is_tax_saver)
    depositForm.deposit_number = dep.deposit_number || ''
    depositModal.value = true
}

function recalculateMaturity() {
    if (isEditing.value) return
    const p = Number(depositForm.principal_amount || 0)
    const r = Number(depositForm.interest_rate || 0) / 100
    const start = new Date(depositForm.start_date).getTime()
    const end = new Date(depositForm.maturity_date).getTime()
    const years = Math.max(0.1, (end - start) / (365.25 * 24 * 60 * 60 * 1000))

    if (depositForm.deposit_type === 'FIXED') {
        // A = P * (1 + r/4)^(4*t)
        const amt = p * Math.pow(1 + r / 4, 4 * years)
        depositForm.maturity_amount = Math.round(amt)
    } else {
        // RD compound approximation
        const months = Math.round(years * 12)
        const monthlyRate = r / 12
        let amt = 0
        for (let m = 1; m <= months; m++) {
            amt += p * Math.pow(1 + monthlyRate, m)
        }
        depositForm.maturity_amount = Math.round(amt)
    }
}

async function saveDeposit() {
    savingDeposit.value = true
    try {
        if (isEditing.value) {
            await financeApi.updateFixedDeposit(depositForm.id, {
                name: depositForm.name,
                bank_name: depositForm.bank_name,
                deposit_type: depositForm.deposit_type,
                principal_amount: depositForm.principal_amount,
                interest_rate: depositForm.interest_rate,
                compounding_frequency: depositForm.compounding_frequency,
                start_date: depositForm.start_date,
                maturity_date: depositForm.maturity_date,
                maturity_amount: depositForm.maturity_amount,
                is_tax_saver: depositForm.is_tax_saver,
                deposit_number: depositForm.deposit_number
            })
            notification.success('Deposit updated successfully')
        } else {
            await financeApi.createFixedDeposit(depositForm)
            notification.success('Deposit created successfully')
        }
        depositModal.value = false
        await fetchDeposits()
    } catch (e) {
        console.error('Failed to save deposit', e)
        notification.error('Failed to save deposit')
    } finally {
        savingDeposit.value = false
    }
}

function requestDeleteDeposit(dep: any) {
    depositToDelete.value = dep
    showDeleteConfirm.value = true
}

async function confirmDeleteDepositAction() {
    if (!depositToDelete.value) return
    isDeletingDeposit.value = true
    try {
        await financeApi.deleteFixedDeposit(depositToDelete.value.id)
        notification.success('Deposit deleted')
        showDeleteConfirm.value = false
        await fetchDeposits()
    } catch (e) {
        console.error('Failed to delete deposit', e)
        notification.error('Failed to delete deposit')
    } finally {
        isDeletingDeposit.value = false
    }
}

function closeDropdowns() {
    activeMenuId.value = null
}

onMounted(() => {
    fetchDeposits()
    window.addEventListener('click', closeDropdowns)
})

onUnmounted(() => {
    window.removeEventListener('click', closeDropdowns)
})
</script>
