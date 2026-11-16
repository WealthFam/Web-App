<template>
    <MainLayout>
        <div class="space-y-5">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
                        <ShieldCheck class="w-4.5 h-4.5 text-wf-primary" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-lg sm:text-xl font-bold text-wf-text-primary tracking-tight leading-tight">
                                Provident & Retirement Funds
                            </h1>
                            <span class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                {{ funds.length }} Active
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary mt-0.5">
                            Track EPF, PPF, NPS & statutory retirement corpus with annual investment caps & compounding schedules.
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
                        <span>Add Fund Account</span>
                    </WfButton>
                </div>
            </div>

            <!-- Summary Stats Strip -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Total Corpus -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-info-light text-wf-info border border-blue-500/20 flex items-center justify-center shrink-0">
                            <ShieldCheck :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Total Corpus
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-wf-text-primary mt-0.5">
                            {{ formatAmount(totalCorpus) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Across {{ funds.length }} retirement instrument{{ funds.length === 1 ? '' : 's' }}
                        </div>
                    </div>
                </WfCard>

                <!-- Annual Deposit Limit Tracker -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-success-light text-wf-success border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <TrendingUp :size="20" />
                        </div>
                        <span 
                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                            :class="taxProgress >= 100 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60' 
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'"
                        >
                            {{ taxProgress >= 100 ? 'Cap Met (₹1.5L)' : `${taxProgress.toFixed(0)}%` }}
                        </span>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Annual FY Deposits
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-wf-success mt-0.5">
                            {{ formatAmount(totalFyContrib) }}
                        </div>
                        <div class="w-full bg-wf-surface-variant rounded-full h-1.5 mt-2 overflow-hidden">
                            <div 
                                class="h-1.5 rounded-full transition-all duration-300"
                                :class="taxProgress >= 100 ? 'bg-emerald-500' : 'bg-wf-primary'"
                                :style="{ width: `${Math.min(100, Math.max(0, taxProgress))}%` }"
                            ></div>
                        </div>
                    </div>
                </WfCard>

                <!-- EPF Balance -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <Briefcase :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            EPF Balance
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {{ formatAmount(totalEpf) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Employee + Employer Corpus
                        </div>
                    </div>
                </WfCard>

                <!-- PPF & NPS Balance -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-warning-light text-wf-warning border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Coins :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            PPF & NPS Balance
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400 mt-0.5">
                            {{ formatAmount(totalPpfAndNps) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Tax-free compounding growth
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
                            placeholder="Search by fund name, UAN, or employer..."
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

                    <!-- Add Fund CTA -->
                    <WfButton
                        variant="primary"
                        size="sm"
                        class="shrink-0"
                        @click="openAddModal"
                    >
                        <Plus :size="14" class="mr-1" />
                        <span>Add Fund Account</span>
                    </WfButton>
                </div>
            </WfCard>

            <!-- Loading State -->
            <div v-if="loading" class="p-12 text-center flex flex-col items-center justify-center text-wf-text-muted">
                <div class="w-8 h-8 border-2 border-wf-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                <span class="text-xs font-semibold">Loading provident funds...</span>
            </div>

            <!-- Empty State (No Funds Added) -->
            <div 
                v-else-if="funds.length === 0"
                class="p-12 rounded-wf-xl bg-wf-surface border border-wf-border text-center max-w-lg mx-auto shadow-sm"
            >
                <div class="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-wf-primary flex items-center justify-center mx-auto mb-4 border border-indigo-200 dark:border-indigo-900/60">
                    <ShieldCheck :size="32" />
                </div>
                <h3 class="text-base font-bold text-wf-text-primary mb-1">No Provident Funds Added</h3>
                <p class="text-xs text-wf-text-secondary mb-6 leading-relaxed">
                    Add your EPF passbook, PPF account, or NPS Tier-1 to monitor long-term retirement wealth and annual deposit ceilings.
                </p>
                <WfButton
                    variant="primary"
                    size="md"
                    @click="openAddModal"
                    class="h-9 px-5 text-xs font-semibold"
                >
                    <Plus :size="14" class="mr-1.5" />
                    <span>Add Your First Fund</span>
                </WfButton>
            </div>

            <!-- Funds Grid -->
            <div v-else class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <WfCard 
                        v-for="fund in filteredFunds" 
                        :key="fund.id"
                        variant="flat"
                        padding="sm"
                        radius="lg"
                        class="group h-full flex flex-col justify-between transition-all duration-150 hover:shadow-wf-card-hover border border-wf-border hover:border-wf-primary/40 cursor-pointer"
                        @click="openEditModal(fund)"
                    >
                        <div>
                            <!-- Header -->
                            <div class="flex items-start justify-between gap-2 mb-2">
                                <div class="flex items-start gap-2.5 min-w-0 flex-1">
                                    <div class="w-8 h-8 rounded-wf-md flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <ShieldCheck :size="16" />
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="text-xs sm:text-sm font-bold text-wf-text-primary truncate" :title="fund.name">
                                            {{ fund.name }}
                                        </div>
                                        <div class="flex items-center gap-1.5 text-xs text-wf-text-muted mt-0.5">
                                            <span class="text-[10px] font-semibold uppercase tracking-wider">
                                                {{ fund.fund_type }}
                                            </span>
                                            <span v-if="fund.employer_name" class="truncate text-[10px] text-wf-text-muted">
                                                • {{ fund.employer_name }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex items-center gap-1 shrink-0" @click.stop>
                                    <span class="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                                        {{ fund.annual_interest_rate }}%
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
                                                @click="openEditModal(fund)"
                                            >
                                                <Edit2 :size="13" class="text-wf-text-muted" />
                                                <span>Edit</span>
                                            </button>
                                            <button 
                                                type="button" 
                                                class="w-full text-left px-3 py-1.5 text-xs font-semibold text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                                                @click="requestDeleteFund(fund)"
                                            >
                                                <Trash2 :size="13" class="text-wf-error" />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </WfMenu>
                                </div>
                            </div>

                            <!-- EPF Tri-part Split if EPF -->
                            <div v-if="fund.fund_type === 'EPF'" class="p-2 rounded-wf-sm bg-wf-surface-variant/40 border border-wf-border-subtle text-[11px] space-y-1 my-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-wf-text-secondary">Employee:</span>
                                    <strong class="text-wf-text-primary tabular-nums">{{ formatAmount(fund.employee_share) }}</strong>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-wf-text-secondary">Employer:</span>
                                    <strong class="text-wf-text-primary tabular-nums">{{ formatAmount(fund.employer_share) }}</strong>
                                </div>
                                <div class="flex items-center justify-between pt-1 border-t border-wf-border-subtle text-[10px] text-wf-text-muted">
                                    <span>Pension Fund:</span>
                                    <span class="tabular-nums">{{ formatAmount(fund.pension_share) }}</span>
                                </div>
                            </div>

                            <!-- PPF Maturity if PPF -->
                            <div v-else-if="fund.fund_type === 'PPF'" class="p-2 rounded-wf-sm bg-wf-surface-variant/40 border border-wf-border-subtle text-[11px] space-y-1 my-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-wf-text-muted">Opened:</span>
                                    <span class="font-semibold text-wf-text-primary">{{ formatDate(fund.opening_date) }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-wf-text-muted">15-Yr Maturity:</span>
                                    <span class="font-bold text-wf-success">{{ formatDate(fund.maturity_date) }}</span>
                                </div>
                            </div>

                            <!-- Default Info Strip for NPS / VPF -->
                            <div v-else class="p-2 rounded-wf-sm bg-wf-surface-variant/40 border border-wf-border-subtle text-[11px] my-2">
                                <span class="text-wf-text-muted font-mono">
                                    {{ fund.member_id ? `A/c: ${fund.member_id}` : 'Government Backed Scheme' }}
                                </span>
                            </div>

                            <!-- FY Deposit Contribution -->
                            <div class="flex items-center justify-between text-[11px] text-wf-text-muted pt-1">
                                <span>Current FY Deposits:</span>
                                <span class="font-semibold text-wf-primary tabular-nums">{{ formatAmount(fund.fy_contributions) }}</span>
                            </div>
                        </div>

                        <!-- Card Footer -->
                        <div class="pt-2 border-t border-wf-border-subtle flex items-baseline justify-between mt-3">
                            <div>
                                <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider">Accumulated Corpus</div>
                                <div class="text-sm sm:text-base font-bold font-mono tracking-tight text-wf-text-primary mt-0.5">
                                    {{ formatAmount(fund.balance) }}
                                </div>
                            </div>
                            <span class="text-[11px] font-semibold text-wf-primary group-hover:underline">
                                Details
                            </span>
                        </div>
                    </WfCard>

                    <!-- Compact Add Fund Placeholder Card (Matching Accounts.vue) -->
                    <div
                        v-if="!searchQuery"
                        class="border-2 border-dashed border-wf-border hover:border-wf-primary/50 rounded-wf-lg p-5 flex flex-col items-center justify-center transition-all cursor-pointer group hover:bg-wf-primary/[0.02] min-h-[140px]"
                        @click="openAddModal"
                    >
                        <div class="w-8 h-8 rounded-full bg-wf-primary/10 text-wf-primary flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
                            <Plus :size="18" />
                        </div>
                        <div class="text-xs font-bold text-wf-text-primary">
                            Add Fund Account
                        </div>
                        <div class="text-[11px] text-wf-text-muted mt-0.5 text-center">
                            Link an EPF passbook, PPF or NPS
                        </div>
                    </div>
                </div>

                <!-- Empty Search State -->
                <div v-if="filteredFunds.length === 0 && !loading" class="text-center py-16 animate-in">
                    <div class="w-16 h-16 rounded-full bg-wf-surface-variant text-wf-text-muted flex items-center justify-center mx-auto mb-4">
                        <Search :size="32" class="opacity-40" />
                    </div>
                    <h3 class="text-base font-bold text-wf-text-primary">No matching funds</h3>
                    <p class="text-xs text-wf-text-muted mt-1 mb-4">Try adjusting your search query</p>
                    <WfButton variant="outline" size="sm" @click="searchQuery = ''">
                        <RotateCcw :size="13" class="mr-1.5" />
                        <span>Clear search</span>
                    </WfButton>
                </div>
            </div>

            <!-- Add / Edit Modal -->
            <WfModal
                v-model="fundModal"
                max-width="md"
                :title="isEditing ? 'Edit Fund Account' : 'Add Fund Account'"
                description="Configure retirement scheme, statutory rates, UAN, and initial shares"
            >
                <form @submit.prevent="saveFund" class="space-y-4 py-1">
                    <WfInput
                        v-model="fundForm.name"
                        label="Account Nickname"
                        placeholder="e.g. Current Company EPF, SBI 15-Yr PPF, HDFC NPS Tier 1"
                        required
                    />

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfSelect
                            v-model="fundForm.fund_type"
                            label="Instrument Type"
                            :items="fundTypes"
                            required
                            @update:model-value="onTypeChange"
                        />
                        <WfInput
                            v-model.number="fundForm.annual_interest_rate"
                            label="Annual Interest Rate (%)"
                            type="number"
                            step="0.05"
                            required
                        />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfInput
                            v-model="fundForm.employer_name"
                            label="Employer / Sponsoring Entity"
                            placeholder="e.g. Acme Tech Corp, Self-employed"
                        />
                        <WfInput
                            v-model="fundForm.uan_number"
                            label="UAN / PRAN / Member ID"
                            placeholder="12-digit UAN or PRAN"
                        />
                    </div>

                    <!-- Balance & Contribution -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfInput
                            v-model.number="fundForm.balance"
                            label="Current Total Corpus (₹)"
                            type="number"
                            required
                        />
                        <WfInput
                            v-model.number="fundForm.fy_contributions"
                            label="Current FY Deposits (₹)"
                            type="number"
                            hint="Statutory maximum deposit limit is ₹1.5L per financial year per PPF account"
                        />
                    </div>

                    <!-- EPF Tri-part Split if EPF -->
                    <div v-if="fundForm.fund_type === 'EPF'" class="p-3.5 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle space-y-3">
                        <div class="text-xs font-bold text-wf-text-primary">Passbook Balance Breakdown</div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <WfInput
                                v-model.number="fundForm.employee_share"
                                label="Employee (12%)"
                                type="number"
                            />
                            <WfInput
                                v-model.number="fundForm.employer_share"
                                label="Employer (3.67%)"
                                type="number"
                            />
                            <WfInput
                                v-model.number="fundForm.pension_share"
                                label="Pension (8.33%)"
                                type="number"
                            />
                        </div>
                    </div>

                    <!-- PPF Dates if PPF -->
                    <div v-if="fundForm.fund_type === 'PPF'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfInput
                            v-model="fundForm.opening_date"
                            label="Opening Date"
                            type="date"
                        />
                        <WfInput
                            v-model="fundForm.maturity_date"
                            label="15-Year Maturity Date"
                            type="date"
                        />
                    </div>

                    <div class="flex items-center justify-end gap-2 pt-3 border-t border-wf-border">
                        <WfButton
                            variant="outline"
                            size="sm"
                            type="button"
                            @click="fundModal = false"
                        >
                            Cancel
                        </WfButton>
                        <WfButton
                            variant="primary"
                            size="sm"
                            type="submit"
                            :loading="savingFund"
                        >
                            {{ isEditing ? 'Save Changes' : 'Create Fund' }}
                        </WfButton>
                    </div>
                </form>
            </WfModal>

            <!-- Delete Confirmation Modal (Matching Accounts.vue) -->
            <WfModal
                v-model="showDeleteConfirm"
                max-width="sm"
                title="Delete Retirement Fund?"
                description="Irreversible Action"
            >
                <div class="space-y-4 py-1">
                    <div class="p-3.5 rounded-wf-md bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <Trash2 :size="20" class="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div class="text-xs text-wf-text-primary">
                            You are about to permanently delete <strong class="text-rose-600 dark:text-rose-400">{{ fundToDelete?.name }}</strong>.
                        </div>
                    </div>

                    <div class="text-[11px] text-wf-text-muted italic bg-wf-surface-variant/20 p-2.5 rounded-wf-sm border border-wf-border-subtle">
                        Warning: This will remove the accumulated retirement corpus from your family wealth calculation.
                    </div>
                </div>

                <template #footer>
                    <div class="flex items-center justify-end gap-2 w-full">
                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="showDeleteConfirm = false"
                        >
                            Keep Fund
                        </WfButton>
                        <WfButton
                            variant="danger"
                            size="sm"
                            :loading="isDeletingFund"
                            @click="confirmDeleteFundAction"
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
    ShieldCheck, Plus, TrendingUp, Briefcase, Coins, MoreVertical, Edit2, Trash2,
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
const funds = ref<any[]>([])
const activeMenuId = ref<string | null>(null)
const searchQuery = ref('')

// Delete modal state
const showDeleteConfirm = ref(false)
const fundToDelete = ref<any>(null)
const isDeletingFund = ref(false)

// Fund Modal State
const fundModal = ref(false)
const isEditing = ref(false)
const savingFund = ref(false)
const fundForm = reactive({
    id: '',
    name: '',
    fund_type: 'EPF',
    annual_interest_rate: 8.25,
    employer_name: '',
    uan_number: '',
    member_id: '',
    balance: 500000,
    employee_share: 250000,
    employer_share: 175000,
    pension_share: 75000,
    fy_contributions: 50000,
    opening_date: '',
    maturity_date: ''
})

const fundTypes = [
    { title: 'Employees Provident Fund (EPF)', value: 'EPF' },
    { title: 'Public Provident Fund (PPF)', value: 'PPF' },
    { title: 'National Pension Scheme (NPS)', value: 'NPS' },
    { title: 'Voluntary Provident Fund (VPF)', value: 'VPF' },
    { title: 'Sukanya Samriddhi Yojana (SSY)', value: 'SSY' }
]

// Filtered funds based on search
const filteredFunds = computed(() => {
    if (!searchQuery.value) return funds.value
    const q = searchQuery.value.toLowerCase()
    return funds.value.filter(f => 
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.employer_name && f.employer_name.toLowerCase().includes(q)) ||
        (f.uan_number && f.uan_number.includes(q)) ||
        (f.fund_type && f.fund_type.toLowerCase().includes(q))
    )
})

// Metrics computed
const totalCorpus = computed(() => funds.value.reduce((s, f) => s + Number(f.balance || 0), 0))
const totalFyContrib = computed(() => funds.value.reduce((s, f) => s + Number(f.fy_contributions || 0), 0))
const taxProgress = computed(() => (totalFyContrib.value / 150000) * 100)

const totalEpf = computed(() => {
    return funds.value
        .filter(f => f.fund_type === 'EPF' || f.fund_type === 'VPF')
        .reduce((s, f) => s + Number(f.balance || 0), 0)
})

const totalPpfAndNps = computed(() => {
    return funds.value
        .filter(f => f.fund_type === 'PPF' || f.fund_type === 'NPS' || f.fund_type === 'SSY')
        .reduce((s, f) => s + Number(f.balance || 0), 0)
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

async function fetchFunds() {
    loading.value = true
    try {
        const res = await financeApi.getProvidentFunds()
        funds.value = res.data || []
    } catch (e) {
        console.error('Failed to fetch funds', e)
        notification.error('Failed to load provident funds')
    } finally {
        loading.value = false
    }
}

function onTypeChange(type: any) {
    if (type === 'EPF') fundForm.annual_interest_rate = 8.25
    else if (type === 'PPF') fundForm.annual_interest_rate = 7.10
    else if (type === 'NPS') fundForm.annual_interest_rate = 10.50
    else if (type === 'SSY') fundForm.annual_interest_rate = 8.20
}

function openAddModal() {
    isEditing.value = false
    fundForm.id = ''
    fundForm.name = ''
    fundForm.fund_type = 'EPF'
    fundForm.annual_interest_rate = 8.25
    fundForm.employer_name = ''
    fundForm.uan_number = ''
    fundForm.member_id = ''
    fundForm.balance = 500000
    fundForm.employee_share = 250000
    fundForm.employer_share = 175000
    fundForm.pension_share = 75000
    fundForm.fy_contributions = 50000
    fundForm.opening_date = ''
    fundForm.maturity_date = ''
    fundModal.value = true
}

function openEditModal(fund: any) {
    isEditing.value = true
    fundForm.id = fund.id
    fundForm.name = fund.name
    fundForm.fund_type = fund.fund_type
    fundForm.annual_interest_rate = Number(fund.annual_interest_rate || 8.25)
    fundForm.employer_name = fund.employer_name || ''
    fundForm.uan_number = fund.uan_number || ''
    fundForm.member_id = fund.member_id || ''
    fundForm.balance = Number(fund.balance || 0)
    fundForm.employee_share = Number(fund.employee_share || 0)
    fundForm.employer_share = Number(fund.employer_share || 0)
    fundForm.pension_share = Number(fund.pension_share || 0)
    fundForm.fy_contributions = Number(fund.fy_contributions || 0)
    fundForm.opening_date = fund.opening_date ? new Date(fund.opening_date).toISOString().substring(0, 10) : ''
    fundForm.maturity_date = fund.maturity_date ? new Date(fund.maturity_date).toISOString().substring(0, 10) : ''
    fundModal.value = true
}

async function saveFund() {
    savingFund.value = true
    try {
        if (isEditing.value) {
            await financeApi.updateProvidentFund(fundForm.id, {
                name: fundForm.name,
                fund_type: fundForm.fund_type,
                annual_interest_rate: fundForm.annual_interest_rate,
                employer_name: fundForm.employer_name,
                uan_number: fundForm.uan_number,
                member_id: fundForm.member_id,
                balance: fundForm.balance,
                employee_share: fundForm.employee_share,
                employer_share: fundForm.employer_share,
                pension_share: fundForm.pension_share,
                fy_contributions: fundForm.fy_contributions,
                opening_date: fundForm.opening_date || null,
                maturity_date: fundForm.maturity_date || null
            })
            notification.success('Fund updated successfully')
        } else {
            await financeApi.createProvidentFund({
                name: fundForm.name,
                fund_type: fundForm.fund_type,
                annual_interest_rate: fundForm.annual_interest_rate,
                employer_name: fundForm.employer_name,
                uan_number: fundForm.uan_number,
                member_id: fundForm.member_id,
                balance: fundForm.balance,
                employee_share: fundForm.employee_share,
                employer_share: fundForm.employer_share,
                pension_share: fundForm.pension_share,
                fy_contributions: fundForm.fy_contributions,
                opening_date: fundForm.opening_date || null,
                maturity_date: fundForm.maturity_date || null
            })
            notification.success('Fund created successfully')
        }
        fundModal.value = false
        await fetchFunds()
    } catch (e) {
        console.error('Failed to save fund', e)
        notification.error('Failed to save fund')
    } finally {
        savingFund.value = false
    }
}

function requestDeleteFund(fund: any) {
    fundToDelete.value = fund
    showDeleteConfirm.value = true
}

async function confirmDeleteFundAction() {
    if (!fundToDelete.value) return
    isDeletingFund.value = true
    try {
        await financeApi.deleteProvidentFund(fundToDelete.value.id)
        notification.success('Fund deleted')
        showDeleteConfirm.value = false
        await fetchFunds()
    } catch (e) {
        console.error('Failed to delete fund', e)
        notification.error('Failed to delete fund')
    } finally {
        isDeletingFund.value = false
    }
}

function closeDropdowns() {
    activeMenuId.value = null
}

onMounted(() => {
    fetchFunds()
    window.addEventListener('click', closeDropdowns)
})

onUnmounted(() => {
    window.removeEventListener('click', closeDropdowns)
})
</script>
