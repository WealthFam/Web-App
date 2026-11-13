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
                        <h1 class="text-h6 font-weight-black text-content mb-1">Fixed & Recurring Deposits</h1>
                        <p class="text-subtitle-2 text-on-surface opacity-70 font-weight-bold d-flex align-center">
                            Track guaranteed-return deposits, compounding interest & maturity schedules
                        </p>
                    </div>
                    <div class="d-flex gap-3 align-center">
                        <v-btn color="primary" variant="flat" rounded="pill" height="44" class="px-6 font-weight-bold"
                            @click="openAddModal">
                            <Plus :size="18" class="mr-2" />
                            Add Deposit
                        </v-btn>
                    </div>
                </div>

                <!-- Summary Stats -->
                <v-row class="mb-8">
                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Principal Invested</div>
                                <Landmark :size="18" class="text-primary opacity-70" />
                            </div>
                            <div class="text-h4 font-weight-black text-content">{{ formatAmount(totalPrincipal) }}</div>
                            <div class="text-caption text-medium-emphasis mt-1">{{ deposits.length }} active deposit{{ deposits.length === 1 ? '' : 's' }}</div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Projected Maturity</div>
                                <TrendingUp :size="18" class="text-success opacity-70" />
                            </div>
                            <div class="text-h4 font-weight-black text-success">{{ formatAmount(totalMaturity) }}</div>
                            <div class="text-caption text-success font-weight-bold mt-1">
                                +{{ formatAmount(totalProjectedInterest) }} Returns
                            </div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Accrued Interest</div>
                                <Coins :size="18" class="text-info opacity-70" />
                            </div>
                            <div class="text-h4 font-weight-black text-info">{{ formatAmount(totalAccrued) }}</div>
                            <div class="text-caption text-medium-emphasis mt-1">Earned to date</div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Next Maturity</div>
                                <Calendar :size="18" class="text-warning opacity-70" />
                            </div>
                            <div class="text-h5 font-weight-black text-content">{{ nextMaturityNotice }}</div>
                            <div class="text-caption font-weight-bold text-warning mt-1">{{ nextMaturityDays }}</div>
                        </v-card>
                    </v-col>
                </v-row>

                <!-- Empty State -->
                <div v-if="!loading && deposits.length === 0"
                    class="premium-glass-card d-flex flex-column align-center justify-center py-16 px-10 text-center mx-auto"
                    style="max-width: 600px; margin-top: 50px;">
                    <v-avatar color="primary" variant="tonal" size="100" class="mb-8">
                        <Landmark :size="50" class="text-primary" />
                    </v-avatar>
                    <h3 class="text-h4 font-weight-black mb-1">No Deposits Added</h3>
                    <p class="text-subtitle-1 text-on-surface opacity-70 font-weight-bold mb-8">
                        Track bank FDs and RDs with auto-calculated compounding growth and maturity dates.
                    </p>
                    <v-btn color="primary" variant="flat" rounded="pill" height="52"
                        class="px-10 font-weight-black elevation-2" @click="openAddModal">
                        Add Your First Deposit
                    </v-btn>
                </div>

                <!-- Deposits Grid -->
                <div v-else>
                    <v-row>
                        <v-col v-for="dep in deposits" :key="dep.id" cols="12" md="6" lg="4">
                            <v-card class="premium-glass-card pa-5 h-100 d-flex flex-column justify-space-between" elevation="0">
                                <div>
                                    <!-- Header -->
                                    <div class="d-flex justify-space-between align-start mb-3">
                                        <div>
                                            <div class="d-flex align-center gap-2 mb-1">
                                                <v-chip size="x-small" :color="dep.deposit_type === 'RECURRING' ? 'info' : 'primary'" variant="flat" class="font-weight-black">
                                                    {{ dep.deposit_type === 'RECURRING' ? 'RECURRING (RD)' : 'FIXED (FD)' }}
                                                </v-chip>
                                                <v-chip v-if="dep.is_tax_saver" size="x-small" color="success" variant="tonal" class="font-weight-bold">
                                                    80C Tax Saver
                                                </v-chip>
                                            </div>
                                            <div class="text-h6 font-weight-black text-content line-clamp-1">{{ dep.name }}</div>
                                            <div class="text-caption text-medium-emphasis">
                                                {{ dep.bank_name }} <span v-if="dep.deposit_number">• Certificate #{{ dep.deposit_number }}</span>
                                            </div>
                                        </div>
                                        <div class="d-flex align-center gap-1">
                                            <v-chip size="small" color="primary" variant="tonal" class="font-weight-black">
                                                {{ dep.interest_rate }}% p.a.
                                            </v-chip>
                                            <v-menu location="bottom end">
                                                <template v-slot:activator="{ props }">
                                                    <v-btn icon size="x-small" variant="text" v-bind="props">
                                                        <MoreVertical :size="16" />
                                                    </v-btn>
                                                </template>
                                                <v-list density="compact" rounded="lg">
                                                    <v-list-item @click="openEditModal(dep)">
                                                        <template v-slot:prepend><Edit2 :size="14" class="mr-2" /></template>
                                                        <v-list-item-title class="font-weight-bold">Edit</v-list-item-title>
                                                    </v-list-item>
                                                    <v-list-item @click="confirmDeleteDeposit(dep)" class="text-error">
                                                        <template v-slot:prepend><Trash2 :size="14" class="mr-2 text-error" /></template>
                                                        <v-list-item-title class="font-weight-bold">Delete</v-list-item-title>
                                                    </v-list-item>
                                                </v-list>
                                            </v-menu>
                                        </div>
                                    </div>

                                    <!-- Progress to Maturity -->
                                    <div class="mb-4">
                                        <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                                            <span class="text-medium-emphasis">Maturity Progress</span>
                                            <span class="text-primary">{{ dep.progress_percentage }}%</span>
                                        </div>
                                        <v-progress-linear :model-value="dep.progress_percentage" color="primary" height="6" rounded="pill" />
                                        <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
                                            <span>Starts: {{ formatDate(dep.start_date) }}</span>
                                            <span class="font-weight-bold text-content">Matures: {{ formatDate(dep.maturity_date) }}</span>
                                        </div>
                                    </div>

                                    <!-- Metrics Grid -->
                                    <v-row dense class="pa-2 rounded-lg bg-surface-variant bg-opacity-20 mb-3">
                                        <v-col cols="6">
                                            <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Principal</div>
                                            <div class="text-body-1 font-weight-black text-content">{{ formatAmount(dep.principal_amount) }}</div>
                                        </v-col>
                                        <v-col cols="6" class="text-right">
                                            <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">Maturity Value</div>
                                            <div class="text-body-1 font-weight-black text-success">{{ formatAmount(dep.maturity_amount) }}</div>
                                        </v-col>
                                        <v-col cols="6" class="mt-2">
                                            <div class="text-caption text-medium-emphasis">Accrued Interest</div>
                                            <div class="text-body-2 font-weight-bold text-info">+{{ formatAmount(dep.accrued_interest) }}</div>
                                        </v-col>
                                        <v-col cols="6" class="mt-2 text-right">
                                            <div class="text-caption text-medium-emphasis">Days Remaining</div>
                                            <div class="text-body-2 font-weight-bold" :class="dep.days_to_maturity <= 30 ? 'text-warning font-weight-black' : 'text-content'">
                                                {{ dep.is_matured ? 'Matured 🎉' : `${dep.days_to_maturity} days` }}
                                            </div>
                                        </v-col>
                                    </v-row>
                                </div>
                            </v-card>
                        </v-col>
                    </v-row>
                </div>
            </div>

            <!-- Add / Edit Modal -->
            <v-dialog v-model="depositModal" max-width="600" persistent>
                <v-card class="premium-glass-card pa-6 rounded-2xl" elevation="0">
                    <div class="d-flex justify-space-between align-center mb-6">
                        <div class="text-h6 font-weight-black text-content">
                            {{ isEditing ? 'Edit Deposit' : 'Add Deposit' }}
                        </div>
                        <v-btn icon size="small" variant="text" @click="depositModal = false">
                            <X :size="18" />
                        </v-btn>
                    </div>

                    <v-form @submit.prevent="saveDeposit">
                        <v-text-field v-model="depositForm.name" label="Deposit Name *" placeholder="e.g. HDFC 1-Year Tax Saver FD"
                            variant="outlined" density="comfortable" rounded="lg" class="mb-4 font-weight-bold"
                            :rules="[v => !!v || 'Name is required']" />

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-text-field v-model="depositForm.bank_name" label="Bank / Institution *" placeholder="e.g. SBI, HDFC Bank"
                                    variant="outlined" density="comfortable" rounded="lg"
                                    :rules="[v => !!v || 'Bank name is required']" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-select v-model="depositForm.deposit_type" :items="typeOptions" item-title="label" item-value="value"
                                    label="Deposit Type *" variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                        </v-row>

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-text-field v-model.number="depositForm.principal_amount" label="Principal Amount (₹) *"
                                    type="number" prefix="₹" variant="outlined" density="comfortable" rounded="lg" class="font-weight-black"
                                    @update:model-value="calculateMaturity"
                                    :rules="[v => v > 0 || 'Principal must be > 0']" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field v-model.number="depositForm.interest_rate" label="Interest Rate (% p.a.) *"
                                    type="number" suffix="%" variant="outlined" density="comfortable" rounded="lg" class="font-weight-bold"
                                    @update:model-value="calculateMaturity"
                                    :rules="[v => v > 0 || 'Rate must be > 0']" />
                            </v-col>
                        </v-row>

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-text-field v-model="depositForm.start_date" label="Start Date *" type="date"
                                    variant="outlined" density="comfortable" rounded="lg"
                                    @update:model-value="calculateMaturity" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field v-model.number="depositForm.tenure_months" label="Tenure (Months) *" type="number"
                                    variant="outlined" density="comfortable" rounded="lg"
                                    @update:model-value="calculateMaturity" />
                            </v-col>
                        </v-row>

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-text-field v-model="depositForm.maturity_date" label="Maturity Date *" type="date"
                                    variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field v-model.number="depositForm.maturity_amount" label="Projected Maturity Amount (₹) *"
                                    type="number" prefix="₹" variant="outlined" density="comfortable" rounded="lg" class="font-weight-black" />
                            </v-col>
                        </v-row>

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-text-field v-model="depositForm.deposit_number" label="Certificate / FDR Number" placeholder="Optional"
                                    variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-checkbox v-model="depositForm.is_tax_saver" label="5-Year 80C Tax Saver" density="comfortable" hide-details />
                            </v-col>
                        </v-row>

                        <div class="d-flex justify-end gap-3 mt-6">
                            <v-btn variant="text" rounded="pill" @click="depositModal = false">Cancel</v-btn>
                            <v-btn color="primary" variant="flat" rounded="pill" class="px-8 font-weight-black" type="submit" :loading="saving">
                                {{ isEditing ? 'Save Changes' : 'Create Deposit' }}
                            </v-btn>
                        </div>
                    </v-form>
                </v-card>
            </v-dialog>
        </v-container>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
    Landmark, Plus, TrendingUp, Coins, Calendar, MoreVertical, Edit2, Trash2, X
} from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'

const { formatAmount } = useCurrency()
const notification = useNotificationStore()

const loading = ref(true)
const deposits = ref<any[]>([])

const typeOptions = [
    { label: 'Fixed Deposit (FD)', value: 'FIXED' },
    { label: 'Recurring Deposit (RD)', value: 'RECURRING' }
]

const depositModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)

const depositForm = reactive({
    id: '',
    name: '',
    bank_name: '',
    deposit_type: 'FIXED',
    deposit_number: '',
    principal_amount: 100000,
    interest_rate: 7.25,
    compounding_frequency: 'QUARTERLY',
    start_date: new Date().toISOString().substring(0, 10),
    tenure_months: 12,
    maturity_date: new Date(Date.now() + 365 * 86400000).toISOString().substring(0, 10),
    maturity_amount: 107450,
    monthly_deposit: 0,
    deposit_day_of_month: 5,
    is_tax_saver: false
})

const totalPrincipal = computed(() => deposits.value.reduce((s, d) => s + Number(d.principal_amount || 0), 0))
const totalMaturity = computed(() => deposits.value.reduce((s, d) => s + Number(d.maturity_amount || 0), 0))
const totalProjectedInterest = computed(() => Math.max(0, totalMaturity.value - totalPrincipal.value))
const totalAccrued = computed(() => deposits.value.reduce((s, d) => s + Number(d.accrued_interest || 0), 0))

const nextMaturityDeposit = computed(() => {
    const unMatured = deposits.value.filter(d => !d.is_matured)
    if (!unMatured.length) return null
    return unMatured.sort((a, b) => (a.days_to_maturity || 999) - (b.days_to_maturity || 999))[0]
})

const nextMaturityNotice = computed(() => {
    if (!nextMaturityDeposit.value) return 'No upcoming maturities'
    return formatDate(nextMaturityDeposit.value.maturity_date)
})

const nextMaturityDays = computed(() => {
    if (!nextMaturityDeposit.value) return ''
    return `In ${nextMaturityDeposit.value.days_to_maturity} days (${nextMaturityDeposit.value.name})`
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

function calculateMaturity() {
    const p = depositForm.principal_amount
    const r = depositForm.interest_rate / 100
    const m = depositForm.tenure_months
    if (p > 0 && r > 0 && m > 0) {
        // Quarterly compounding: A = P * (1 + r/4)^(4 * m/12)
        const t = m / 12
        const a = p * Math.pow(1 + r / 4, 4 * t)
        depositForm.maturity_amount = Math.round(a)

        // Calculate maturity date from start date
        const s = new Date(depositForm.start_date)
        s.setMonth(s.getMonth() + m)
        depositForm.maturity_date = s.toISOString().substring(0, 10)
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
    depositForm.deposit_number = ''
    depositForm.principal_amount = 100000
    depositForm.interest_rate = 7.25
    depositForm.start_date = new Date().toISOString().substring(0, 10)
    depositForm.tenure_months = 12
    calculateMaturity()
    depositForm.is_tax_saver = false
    depositModal.value = true
}

function openEditModal(dep: any) {
    isEditing.value = true
    depositForm.id = dep.account_id || dep.id
    depositForm.name = dep.name
    depositForm.bank_name = dep.bank_name
    depositForm.deposit_type = dep.deposit_type
    depositForm.deposit_number = dep.deposit_number || ''
    depositForm.principal_amount = Number(dep.principal_amount)
    depositForm.interest_rate = Number(dep.interest_rate)
    depositForm.start_date = dep.start_date ? new Date(dep.start_date).toISOString().substring(0, 10) : ''
    depositForm.tenure_months = dep.tenure_months || 12
    depositForm.maturity_date = dep.maturity_date ? new Date(dep.maturity_date).toISOString().substring(0, 10) : ''
    depositForm.maturity_amount = Number(dep.maturity_amount)
    depositForm.is_tax_saver = dep.is_tax_saver || false
    depositModal.value = true
}

async function saveDeposit() {
    saving.value = true
    try {
        const payload = {
            name: depositForm.name,
            bank_name: depositForm.bank_name,
            deposit_type: depositForm.deposit_type,
            deposit_number: depositForm.deposit_number || null,
            principal_amount: depositForm.principal_amount,
            interest_rate: depositForm.interest_rate,
            compounding_frequency: depositForm.compounding_frequency,
            start_date: new Date(depositForm.start_date).toISOString(),
            tenure_months: depositForm.tenure_months,
            maturity_date: new Date(depositForm.maturity_date).toISOString(),
            maturity_amount: depositForm.maturity_amount,
            is_tax_saver: depositForm.is_tax_saver
        }

        if (isEditing.value) {
            await financeApi.updateFixedDeposit(depositForm.id, payload)
            notification.success('Deposit updated')
        } else {
            await financeApi.createFixedDeposit(payload)
            notification.success('Deposit created')
        }
        depositModal.value = false
        await fetchDeposits()
    } catch (e) {
        console.error('Failed to save deposit', e)
        notification.error('Failed to save deposit')
    } finally {
        saving.value = false
    }
}

async function confirmDeleteDeposit(dep: any) {
    if (!confirm(`Delete deposit "${dep.name}"?`)) return
    try {
        await financeApi.deleteFixedDeposit(dep.account_id || dep.id)
        notification.success('Deposit deleted')
        await fetchDeposits()
    } catch (e) {
        console.error('Failed to delete deposit', e)
        notification.error('Failed to delete deposit')
    }
}

onMounted(() => {
    fetchDeposits()
})
</script>
