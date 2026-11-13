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
                        <h1 class="text-h6 font-weight-black text-content mb-1">Provident & Retirement Funds</h1>
                        <p class="text-subtitle-2 text-on-surface opacity-70 font-weight-bold d-flex align-center">
                            Track EPF, PPF, NPS & government-backed retirement corpus with Section 80C monitoring
                        </p>
                    </div>
                    <div class="d-flex gap-3 align-center">
                        <v-btn color="primary" variant="flat" rounded="pill" height="44" class="px-6 font-weight-bold"
                            @click="openAddModal">
                            <Plus :size="18" class="mr-2" />
                            Add Fund Account
                        </v-btn>
                    </div>
                </div>

                <!-- Summary Stats -->
                <v-row class="mb-8">
                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Total Corpus</div>
                                <ShieldCheck :size="18" class="text-primary opacity-70" />
                            </div>
                            <div class="text-h4 font-weight-black text-content">{{ formatAmount(totalCorpus) }}</div>
                            <div class="text-caption text-medium-emphasis mt-1">{{ funds.length }} retirement instrument{{ funds.length === 1 ? '' : 's' }}</div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">80C FY Tracker</div>
                                <v-chip size="x-small" :color="taxProgress >= 100 ? 'success' : 'warning'" variant="tonal" class="font-weight-black">
                                    {{ taxProgress >= 100 ? 'Cap Met (₹1.5L)' : `${taxProgress.toFixed(0)}%` }}
                                </v-chip>
                            </div>
                            <div class="text-h4 font-weight-black text-success">{{ formatAmount(totalFyContrib) }}</div>
                            <v-progress-linear :model-value="taxProgress" :color="taxProgress >= 100 ? 'success' : 'primary'" height="6" rounded="pill" class="mt-2" />
                            <div class="text-caption text-medium-emphasis mt-1">₹1,50,000 Annual Ceiling</div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">EPF Balance</div>
                                <Briefcase :size="18" class="text-info opacity-70" />
                            </div>
                            <div class="text-h4 font-weight-black text-info">{{ formatAmount(totalEpf) }}</div>
                            <div class="text-caption text-medium-emphasis mt-1">Employee + Employer</div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" sm="6" lg="3">
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">PPF & NPS Balance</div>
                                <Coins :size="18" class="text-warning opacity-70" />
                            </div>
                            <div class="text-h4 font-weight-black text-warning">{{ formatAmount(totalPpfAndNps) }}</div>
                            <div class="text-caption text-medium-emphasis mt-1">Tax-free compounding</div>
                        </v-card>
                    </v-col>
                </v-row>

                <!-- Empty State -->
                <div v-if="!loading && funds.length === 0"
                    class="premium-glass-card d-flex flex-column align-center justify-center py-16 px-10 text-center mx-auto"
                    style="max-width: 600px; margin-top: 50px;">
                    <v-avatar color="primary" variant="tonal" size="100" class="mb-8">
                        <ShieldCheck :size="50" class="text-primary" />
                    </v-avatar>
                    <h3 class="text-h4 font-weight-black mb-1">No Provident Funds Added</h3>
                    <p class="text-subtitle-1 text-on-surface opacity-70 font-weight-bold mb-8">
                        Add your EPF passbook, PPF account, or NPS Tier-1 to track long-term retirement wealth.
                    </p>
                    <v-btn color="primary" variant="flat" rounded="pill" height="52"
                        class="px-10 font-weight-black elevation-2" @click="openAddModal">
                        Add Your First Fund
                    </v-btn>
                </div>

                <!-- Funds Grid -->
                <div v-else>
                    <v-row>
                        <v-col v-for="fund in funds" :key="fund.id" cols="12" md="6" lg="4">
                            <v-card class="premium-glass-card pa-5 h-100 d-flex flex-column justify-space-between" elevation="0">
                                <div>
                                    <!-- Header -->
                                    <div class="d-flex justify-space-between align-start mb-3">
                                        <div>
                                            <div class="d-flex align-center gap-2 mb-1">
                                                <v-chip size="x-small" :color="getFundColor(fund.fund_type)" variant="flat" class="font-weight-black">
                                                    {{ fund.fund_type }}
                                                </v-chip>
                                                <span v-if="fund.employer_name" class="text-caption font-weight-bold text-medium-emphasis">
                                                    {{ fund.employer_name }}
                                                </span>
                                            </div>
                                            <div class="text-h6 font-weight-black text-content line-clamp-1">{{ fund.name }}</div>
                                            <div class="text-caption font-mono text-medium-emphasis">
                                                <span v-if="fund.uan_number">UAN: {{ fund.uan_number }}</span>
                                                <span v-else-if="fund.member_id">A/c: {{ fund.member_id }}</span>
                                                <span v-else>Retirement Account</span>
                                            </div>
                                        </div>
                                        <div class="d-flex align-center gap-1">
                                            <v-chip size="small" color="primary" variant="tonal" class="font-weight-black">
                                                {{ fund.annual_interest_rate }}% p.a.
                                            </v-chip>
                                            <v-menu location="bottom end">
                                                <template v-slot:activator="{ props }">
                                                    <v-btn icon size="x-small" variant="text" v-bind="props">
                                                        <MoreVertical :size="16" />
                                                    </v-btn>
                                                </template>
                                                <v-list density="compact" rounded="lg">
                                                    <v-list-item @click="openEditModal(fund)">
                                                        <template v-slot:prepend><Edit2 :size="14" class="mr-2" /></template>
                                                        <v-list-item-title class="font-weight-bold">Edit Details</v-list-item-title>
                                                    </v-list-item>
                                                    <v-list-item @click="confirmDeleteFund(fund)" class="text-error">
                                                        <template v-slot:prepend><Trash2 :size="14" class="mr-2 text-error" /></template>
                                                        <v-list-item-title class="font-weight-bold">Delete</v-list-item-title>
                                                    </v-list-item>
                                                </v-list>
                                            </v-menu>
                                        </div>
                                    </div>

                                    <!-- Total Balance -->
                                    <div class="mb-4">
                                        <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Accumulated Corpus</div>
                                        <div class="text-h4 font-weight-black text-content">{{ formatAmount(fund.balance) }}</div>
                                    </div>

                                    <!-- EPF Tri-part Split if EPF -->
                                    <div v-if="fund.fund_type === 'EPF'" class="pa-3 rounded-lg bg-surface-variant bg-opacity-20 mb-3">
                                        <div class="text-caption font-weight-bold text-medium-emphasis mb-2">EPF Passbook Breakdown</div>
                                        <div class="d-flex justify-space-between text-caption mb-1">
                                            <span>Employee Share (12%):</span>
                                            <strong class="text-content">{{ formatAmount(fund.employee_share) }}</strong>
                                        </div>
                                        <div class="d-flex justify-space-between text-caption mb-1">
                                            <span>Employer Share (3.67%):</span>
                                            <strong class="text-content">{{ formatAmount(fund.employer_share) }}</strong>
                                        </div>
                                        <div class="d-flex justify-space-between text-caption">
                                            <span class="text-medium-emphasis">Pension Fund (EPS 8.33%):</span>
                                            <span class="text-medium-emphasis">{{ formatAmount(fund.pension_share) }}</span>
                                        </div>
                                    </div>

                                    <!-- PPF Maturity if PPF -->
                                    <div v-else-if="fund.fund_type === 'PPF'" class="pa-3 rounded-lg bg-surface-variant bg-opacity-20 mb-3">
                                        <div class="d-flex justify-space-between text-caption mb-1">
                                            <span class="text-medium-emphasis">Opened:</span>
                                            <span class="font-weight-bold">{{ formatDate(fund.opening_date) }}</span>
                                        </div>
                                        <div class="d-flex justify-space-between text-caption">
                                            <span class="text-medium-emphasis">15-Year Maturity:</span>
                                            <span class="font-weight-bold text-success">{{ formatDate(fund.maturity_date) }}</span>
                                        </div>
                                    </div>

                                    <!-- FY 80C Contribution -->
                                    <div class="d-flex justify-space-between align-center text-caption font-weight-bold px-1">
                                        <span class="text-medium-emphasis">Current FY Deposits (80C):</span>
                                        <span class="text-primary">{{ formatAmount(fund.fy_contributions) }}</span>
                                    </div>
                                </div>
                            </v-card>
                        </v-col>
                    </v-row>
                </div>
            </div>

            <!-- Add / Edit Modal -->
            <v-dialog v-model="fundModal" max-width="600" persistent>
                <v-card class="premium-glass-card pa-6 rounded-2xl" elevation="0">
                    <div class="d-flex justify-space-between align-center mb-6">
                        <div class="text-h6 font-weight-black text-content">
                            {{ isEditing ? 'Edit Fund Account' : 'Add Fund Account' }}
                        </div>
                        <v-btn icon size="small" variant="text" @click="fundModal = false">
                            <X :size="18" />
                        </v-btn>
                    </div>

                    <v-form @submit.prevent="saveFund">
                        <v-text-field v-model="fundForm.name" label="Account Nickname *" placeholder="e.g. Current Company EPF, SBI PPF"
                            variant="outlined" density="comfortable" rounded="lg" class="mb-4 font-weight-bold"
                            :rules="[v => !!v || 'Name is required']" />

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-select v-model="fundForm.fund_type" :items="fundTypes" label="Instrument Type *"
                                    variant="outlined" density="comfortable" rounded="lg"
                                    @update:model-value="onTypeChange" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field v-model.number="fundForm.annual_interest_rate" label="Annual Interest Rate (%) *"
                                    type="number" suffix="%" variant="outlined" density="comfortable" rounded="lg" class="font-weight-bold" />
                            </v-col>
                        </v-row>

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-text-field v-model="fundForm.uan_number" label="UAN (Universal Account Number)" placeholder="12-digit UAN"
                                    variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field v-model="fundForm.member_id" label="Member ID / Account Number" placeholder="e.g. MH/BAN/..."
                                    variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                        </v-row>

                        <v-text-field v-if="fundForm.fund_type === 'EPF'" v-model="fundForm.employer_name" label="Employer / Company Name"
                            placeholder="e.g. Google India, Infosys" variant="outlined" density="comfortable" rounded="lg" class="mb-4" />

                        <!-- EPF Specific Share breakdown -->
                        <div v-if="fundForm.fund_type === 'EPF'">
                            <div class="text-caption font-weight-bold text-medium-emphasis mb-2">Balances from EPFO Passbook (₹)</div>
                            <v-row dense class="mb-2">
                                <v-col cols="12" sm="4">
                                    <v-text-field v-model.number="fundForm.employee_share" label="Employee Share" type="number" prefix="₹"
                                        variant="outlined" density="comfortable" rounded="lg" class="font-weight-bold" />
                                </v-col>
                                <v-col cols="12" sm="4">
                                    <v-text-field v-model.number="fundForm.employer_share" label="Employer Share" type="number" prefix="₹"
                                        variant="outlined" density="comfortable" rounded="lg" class="font-weight-bold" />
                                </v-col>
                                <v-col cols="12" sm="4">
                                    <v-text-field v-model.number="fundForm.pension_share" label="Pension (EPS)" type="number" prefix="₹"
                                        variant="outlined" density="comfortable" rounded="lg" />
                                </v-col>
                            </v-row>
                        </div>

                        <!-- General Initial Balance for PPF / NPS -->
                        <v-text-field v-else v-model.number="fundForm.initial_balance" label="Current Total Balance (₹) *"
                            type="number" prefix="₹" variant="outlined" density="comfortable" rounded="lg" class="mb-4 font-weight-black" />

                        <v-row dense class="mb-2">
                            <v-col cols="12" sm="6">
                                <v-text-field v-model.number="fundForm.fy_contributions" label="Current FY 80C Deposit (₹)"
                                    type="number" prefix="₹" variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field v-model="fundForm.opening_date" label="Account Opening Date" type="date"
                                    variant="outlined" density="comfortable" rounded="lg" />
                            </v-col>
                        </v-row>

                        <div class="d-flex justify-end gap-3 mt-6">
                            <v-btn variant="text" rounded="pill" @click="fundModal = false">Cancel</v-btn>
                            <v-btn color="primary" variant="flat" rounded="pill" class="px-8 font-weight-black" type="submit" :loading="saving">
                                {{ isEditing ? 'Save Changes' : 'Create Fund' }}
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
    ShieldCheck, Plus, Coins, Briefcase, MoreVertical, Edit2, Trash2, X
} from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'

const { formatAmount } = useCurrency()
const notification = useNotificationStore()

const loading = ref(true)
const funds = ref<any[]>([])

const fundTypes = ['EPF', 'PPF', 'VPF', 'NPS_TIER_1', 'NPS_TIER_2', 'SSY']

const fundModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)

const fundForm = reactive({
    id: '',
    name: '',
    fund_type: 'EPF',
    annual_interest_rate: 8.25,
    uan_number: '',
    member_id: '',
    employer_name: '',
    initial_balance: 0,
    employee_share: 0,
    employer_share: 0,
    pension_share: 0,
    fy_contributions: 0,
    opening_date: new Date().toISOString().substring(0, 10),
    maturity_date: ''
})

const totalCorpus = computed(() => funds.value.reduce((s, f) => s + Number(f.balance || 0), 0))
const totalFyContrib = computed(() => funds.value.reduce((s, f) => s + Number(f.fy_contributions || 0), 0))
const taxProgress = computed(() => Math.min(100, (totalFyContrib.value / 150000) * 100))

const totalEpf = computed(() => {
    return funds.value
        .filter(f => f.fund_type === 'EPF' || f.fund_type === 'VPF')
        .reduce((s, f) => s + Number(f.balance || 0), 0)
})

const totalPpfAndNps = computed(() => {
    return funds.value
        .filter(f => f.fund_type !== 'EPF' && f.fund_type !== 'VPF')
        .reduce((s, f) => s + Number(f.balance || 0), 0)
})

function getFundColor(type: string) {
    switch (type) {
        case 'EPF': return 'primary'
        case 'PPF': return 'success'
        case 'NPS_TIER_1':
        case 'NPS_TIER_2': return 'warning'
        case 'SSY': return 'info'
        default: return 'secondary'
    }
}

function formatDate(iso?: string) {
    if (!iso) return 'N/A'
    try {
        const d = new Date(iso)
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
        return iso
    }
}

function onTypeChange(type: string) {
    if (type === 'EPF') {
        fundForm.annual_interest_rate = 8.25
    } else if (type === 'PPF') {
        fundForm.annual_interest_rate = 7.10
        // Set default 15-year maturity for PPF
        const d = new Date()
        d.setFullYear(d.getFullYear() + 15)
        fundForm.maturity_date = d.toISOString().substring(0, 10)
    } else if (type.startsWith('NPS')) {
        fundForm.annual_interest_rate = 10.0
    } else if (type === 'SSY') {
        fundForm.annual_interest_rate = 8.20
    }
}

async function fetchFunds() {
    loading.value = true
    try {
        const res = await financeApi.getProvidentFunds()
        funds.value = res.data || []
    } catch (e) {
        console.error('Failed to fetch provident funds', e)
        notification.error('Failed to load provident funds')
    } finally {
        loading.value = false
    }
}

function openAddModal() {
    isEditing.value = false
    fundForm.id = ''
    fundForm.name = ''
    fundForm.fund_type = 'EPF'
    fundForm.annual_interest_rate = 8.25
    fundForm.uan_number = ''
    fundForm.member_id = ''
    fundForm.employer_name = ''
    fundForm.initial_balance = 0
    fundForm.employee_share = 0
    fundForm.employer_share = 0
    fundForm.pension_share = 0
    fundForm.fy_contributions = 0
    fundForm.opening_date = new Date().toISOString().substring(0, 10)
    fundForm.maturity_date = ''
    fundModal.value = true
}

function openEditModal(fund: any) {
    isEditing.value = true
    fundForm.id = fund.account_id || fund.id
    fundForm.name = fund.name
    fundForm.fund_type = fund.fund_type
    fundForm.annual_interest_rate = Number(fund.annual_interest_rate)
    fundForm.uan_number = fund.uan_number || ''
    fundForm.member_id = fund.member_id || ''
    fundForm.employer_name = fund.employer_name || ''
    fundForm.initial_balance = Number(fund.balance || 0)
    fundForm.employee_share = Number(fund.employee_share || 0)
    fundForm.employer_share = Number(fund.employer_share || 0)
    fundForm.pension_share = Number(fund.pension_share || 0)
    fundForm.fy_contributions = Number(fund.fy_contributions || 0)
    fundForm.opening_date = fund.opening_date ? new Date(fund.opening_date).toISOString().substring(0, 10) : ''
    fundForm.maturity_date = fund.maturity_date ? new Date(fund.maturity_date).toISOString().substring(0, 10) : ''
    fundModal.value = true
}

async function saveFund() {
    saving.value = true
    try {
        const payload: any = {
            name: fundForm.name,
            fund_type: fundForm.fund_type,
            annual_interest_rate: fundForm.annual_interest_rate,
            uan_number: fundForm.uan_number || null,
            member_id: fundForm.member_id || null,
            employer_name: fundForm.employer_name || null,
            fy_contributions: fundForm.fy_contributions,
            opening_date: fundForm.opening_date ? new Date(fundForm.opening_date).toISOString() : null,
            maturity_date: fundForm.maturity_date ? new Date(fundForm.maturity_date).toISOString() : null
        }

        if (fundForm.fund_type === 'EPF') {
            payload.employee_share = fundForm.employee_share
            payload.employer_share = fundForm.employer_share
            payload.pension_share = fundForm.pension_share
            payload.initial_balance = fundForm.employee_share + fundForm.employer_share
        } else {
            payload.initial_balance = fundForm.initial_balance
        }

        if (isEditing.value) {
            await financeApi.updateProvidentFund(fundForm.id, payload)
            notification.success('Fund account updated')
        } else {
            await financeApi.createProvidentFund(payload)
            notification.success('Fund account created')
        }
        fundModal.value = false
        await fetchFunds()
    } catch (e) {
        console.error('Failed to save fund', e)
        notification.error('Failed to save fund account')
    } finally {
        saving.value = false
    }
}

async function confirmDeleteFund(fund: any) {
    if (!confirm(`Delete "${fund.name}"?`)) return
    try {
        await financeApi.deleteProvidentFund(fund.account_id || fund.id)
        notification.success('Fund deleted')
        await fetchFunds()
    } catch (e) {
        console.error('Failed to delete fund', e)
        notification.error('Failed to delete fund')
    }
}

onMounted(() => {
    fetchFunds()
})
</script>
