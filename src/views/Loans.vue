<template>
    <MainLayout>
        <v-container fluid class="page-container dashboard-page">
            <!-- Animated Mesh Background -->
            <div class="mesh-blob blob-1"
                style="background: rgba(var(--v-theme-primary), 0.1); width: 600px; height: 600px; top: -200px; right: -100px;">
            </div>
            <div class="mesh-blob blob-2"
                style="background: rgba(var(--v-theme-secondary), 0.05); width: 400px; height: 400px; bottom: -100px; left: -100px;">
            </div>

            <div class="relative-pos z-10">
                <!-- Header -->
                <div class="d-flex flex-column flex-md-row justify-space-between align-md-center mb-8">
                    <div class="mb-4 mb-md-0">
                        <h1 class="text-h6 font-weight-black text-content mb-1">Loans</h1>
                        <p class="text-subtitle-2 text-on-surface opacity-70 font-weight-bold d-flex align-center">
                            Manage your debts and repayment schedules
                        </p>
                    </div>
                    <div class="d-flex gap-3 align-center">
                        <v-btn color="primary" variant="tonal" rounded="pill" height="44" class="px-6 font-weight-bold"
                            @click="generatePortfolioInsights" :loading="insightLoading">
                            <Sparkles :size="18" class="mr-2" />
                            AI Analysis
                        </v-btn>
                        <v-btn color="primary" variant="flat" rounded="pill" height="44" class="px-6 font-weight-bold"
                            @click="openAddModal">
                            <Plus :size="18" class="mr-2" />
                            Add Loan
                        </v-btn>
                    </div>
                </div>

                <!-- Summary Stats -->
                <v-row class="mb-8">
                    <v-col cols="12" md="4" v-if="loading">
                        <PremiumSkeleton type="stat-card" glass />
                    </v-col>
                    <v-col cols="12" md="4" v-else>
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase mb-2">Total
                                Outstanding</div>
                            <div class="text-h4 font-weight-black text-content">{{ formatCurrency(totalOutstanding) }}
                            </div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" md="4" v-if="loading">
                        <PremiumSkeleton type="stat-card" glass />
                    </v-col>
                    <v-col cols="12" md="4" v-else>
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase mb-2">Monthly
                                Commitment</div>
                            <div class="text-h4 font-weight-black text-content">{{ formatCurrency(totalMonthlyEmi) }}
                            </div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" md="4" v-if="loading">
                        <PremiumSkeleton type="stat-card" glass />
                    </v-col>
                    <v-col cols="12" md="4" v-else>
                        <v-card class="premium-glass-card pa-6 h-100" elevation="0">
                            <div class="text-caption font-weight-bold text-medium-emphasis text-uppercase mb-2">Active
                                Loans</div>
                            <div class="text-h4 font-weight-black text-content">{{ loans.length }}</div>
                        </v-card>
                    </v-col>
                </v-row>

                <!-- Loading Grid -->
                <v-row v-if="loading" class="pb-16">
                    <v-col v-for="i in 3" :key="`skel-${i}`" cols="12" sm="6" lg="4">
                        <PremiumSkeleton type="category-card" glass />
                    </v-col>
                </v-row>

                <!-- Empty State -->
                <div v-else-if="loans.length === 0"
                    class="premium-glass-card d-flex flex-column align-center justify-center py-16 px-10 text-center mx-auto"
                    style="max-width: 600px; margin-top: 50px;">
                    <v-avatar color="primary" variant="tonal" size="100" class="mb-8">
                        <Landmark :size="50" class="text-primary" />
                    </v-avatar>
                    <h3 class="text-h4 font-weight-black mb-1">No Active Loans</h3>
                    <p class="text-subtitle-1 text-on-surface opacity-70 font-weight-bold mb-8">
                        Add a loan to start tracking your repayment progress.
                    </p>
                    <v-btn color="primary" variant="flat" rounded="pill" height="52"
                        class="px-10 font-weight-black elevation-2" @click="openAddModal">
                        Add Your First Loan
                    </v-btn>
                </div>

                <!-- Loans Grid -->
                <v-row v-else class="pb-16">
                    <!-- Add New Loan Card -->
                    <v-col cols="12" sm="6" lg="4">
                        <v-card @click="openAddModal"
                            class="premium-glass-card h-100 d-flex flex-column justify-center align-center border-dashed border-primary hover-lift group cursor-pointer"
                            style="border-width: 2px !important; min-height: 240px; background: rgba(var(--v-theme-primary), 0.05)"
                            rounded="xl">
                            <v-avatar color="primary" size="64" class="mb-4 elevation-8 group-on-hover-scale"
                                style="box-shadow: 0 0 20px rgba(var(--v-theme-primary), 0.3)">
                                <Plus :size="36" color="white" stroke-width="3" />
                            </v-avatar>
                            <span class="text-h6 font-weight-black text-primary">Add Loan</span>
                            <span class="text-caption font-weight-bold opacity-60 text-medium-emphasis">Track a new
                                debt</span>
                        </v-card>
                    </v-col>

                    <!-- Existing Loans -->
                    <v-col v-for="loan in loans" :key="loan.id" cols="12" sm="6" lg="4">
                        <v-card class="premium-glass-card h-100 d-flex flex-column group overflow-hidden hover-lift"
                            elevation="0" @click="viewDetails(loan.id)" rounded="xl">
                            <div class="pa-5 flex-grow-1">
                                <div class="d-flex justify-space-between align-start mb-4">
                                    <div class="d-flex align-center gap-3">
                                        <v-avatar size="48" variant="tonal" color="primary" rounded="lg">
                                            <span class="text-h5">{{ getLoanIcon(loan.loan_type) }}</span>
                                        </v-avatar>
                                        <div>
                                            <div class="text-h6 font-weight-black text-content line-clamp-1">{{
                                                loan.name }}</div>
                                            <div class="text-caption font-weight-bold text-medium-emphasis">
                                                {{ loan.lender_name ? `${loan.lender_name} • ` : '' }}{{ loan.loan_type?.replace('_', ' ') || 'LOAN' }}
                                                <span v-if="loan.loan_account_number" class="ml-1 opacity-70">#{{ loan.loan_account_number }}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold">
                                        {{ loan.interest_rate }}% APR
                                    </v-chip>
                                </div>

                                <div class="mb-4">
                                    <div class="d-flex justify-space-between text-caption font-weight-bold mb-1">
                                        <span class="text-medium-emphasis">Progress</span>
                                        <span class="text-primary">{{ loan.progress_percentage }}%</span>
                                    </div>
                                    <v-progress-linear :model-value="Math.max(0, loan.progress_percentage)" height="10"
                                        rounded="pill" class="loan-progress-premium">
                                    </v-progress-linear>
                                </div>

                                <v-row dense class="mt-2">
                                    <v-col cols="6">
                                        <div class="text-caption text-medium-emphasis font-weight-bold">OUTSTANDING
                                        </div>
                                        <div class="text-body-1 font-weight-black text-content">
                                            {{ formatCurrency(loan.outstanding_balance) }}
                                        </div>
                                    </v-col>
                                    <v-col cols="6" class="text-right">
                                        <div class="text-caption text-medium-emphasis font-weight-bold">EMI AMOUNT</div>
                                        <div class="text-body-1 font-weight-black text-content">
                                            {{ formatCurrency(loan.emi_amount) }}
                                        </div>
                                    </v-col>
                                </v-row>
                            </div>
                            <v-divider class="border-opacity-10"></v-divider>
                            <div class="px-5 py-3 bg-surface-variant bg-opacity-5 d-flex align-center">
                                <Calendar :size="14" class="text-primary mr-2" />
                                <span class="text-caption font-weight-black text-on-surface">
                                    Next Due: {{ getNextDueDate(loan.next_emi_date) }}
                                </span>
                            </div>

                            <!-- Subtle background icon -->
                            <div class="card-bg-icon-standard">
                                <Landmark :size="120" />
                            </div>
                        </v-card>
                    </v-col>
                </v-row>
            </div>

            <!-- Add Loan Modal -->
            <v-dialog v-model="showModal" max-width="600" transition="dialog-bottom-transition">
                <v-card rounded="xl" class="premium-glass-modal elevation-24">
                    <div class="px-6 pt-6 pb-2 d-flex justify-space-between align-center">
                        <div>
                            <div class="text-overline font-weight-black text-primary mb-1 letter-spacing-2">NEW LOAN
                            </div>
                            <h2 class="text-h5 font-weight-black text-content">Add Liability</h2>
                        </div>
                        <v-btn icon variant="text" @click="showModal = false" density="comfortable"
                            class="bg-surface-variant bg-opacity-10 opacity-70 hover:opacity-100">
                            <X :size="20" />
                        </v-btn>
                    </div>

                    <v-card-text class="px-6 py-4">
                        <v-form @submit.prevent="submitLoan">
                            <v-text-field v-model="form.name" label="Loan Name" placeholder="e.g. Home Loan"
                                variant="outlined" density="comfortable" hide-details rounded="lg" bg-color="surface"
                                class="mb-4 font-weight-bold" autofocus>
                            </v-text-field>

                            <v-row dense class="mb-4">
                                <v-col cols="12" sm="6">
                                    <v-text-field v-model="form.lender_name" label="Lender / Bank" placeholder="e.g. HDFC Bank, SBI"
                                        variant="outlined" density="comfortable" hide-details rounded="lg" bg-color="surface">
                                    </v-text-field>
                                </v-col>
                                <v-col cols="12" sm="6">
                                    <v-text-field v-model="form.loan_account_number" label="Loan Account No (LAN)" placeholder="e.g. HDFC-HL-109283"
                                        variant="outlined" density="comfortable" hide-details rounded="lg" bg-color="surface">
                                    </v-text-field>
                                </v-col>
                            </v-row>

                            <v-select v-model="form.loan_type" :items="loanTypeOptions" item-title="label"
                                item-value="value" label="Loan Type" variant="outlined" density="comfortable"
                                hide-details rounded="lg" bg-color="surface" class="mb-4">
                                <template v-slot:append-inner>
                                    <ChevronDown :size="16" class="text-primary opacity-70" />
                                </template>
                                <template v-slot:item="{ props, item }">
                                    <v-list-item v-bind="props" :prepend-icon="undefined">
                                        <template v-slot:prepend>
                                            <span class="mr-2 text-h6">{{ item.raw.icon }}</span>
                                        </template>
                                    </v-list-item>
                                </template>
                                <template v-slot:selection="{ item }">
                                    <span class="mr-2">{{ item.raw.icon }}</span>
                                    {{ item.title }}
                                </template>
                            </v-select>

                            <v-row>
                                <v-col cols="12" sm="6">
                                    <v-text-field v-model.number="form.principal_amount" label="Principal Amount"
                                        type="number" prefix="₹" variant="outlined" density="comfortable" hide-details
                                        rounded="lg" bg-color="surface" class="font-weight-black"
                                        @update:model-value="calculateEmi">
                                    </v-text-field>
                                </v-col>
                                <v-col cols="12" sm="6">
                                    <v-text-field v-model.number="form.interest_rate" label="Interest Rate (%)"
                                        type="number" suffix="%" variant="outlined" density="comfortable" hide-details
                                        rounded="lg" bg-color="surface" class="font-weight-bold" step="0.01"
                                        @update:model-value="calculateEmi">
                                    </v-text-field>
                                </v-col>
                            </v-row>

                            <v-row class="mt-2">
                                <v-col cols="12" sm="6">
                                    <v-text-field v-model.number="form.tenure_months" label="Tenure (Months)"
                                        type="number" variant="outlined" density="comfortable" hide-details rounded="lg"
                                        bg-color="surface" @update:model-value="calculateEmi">
                                    </v-text-field>
                                </v-col>
                                <v-col cols="12" sm="6">
                                    <v-text-field v-model="form.start_date" label="Start Date" type="date"
                                        variant="outlined" density="comfortable" hide-details rounded="lg"
                                        bg-color="surface">
                                    </v-text-field>
                                </v-col>
                            </v-row>

                            <v-text-field v-model.number="form.emi_date" label="EMI Due Day (1-31)" type="number"
                                variant="outlined" density="comfortable" hide-details rounded="lg" bg-color="surface"
                                class="mt-4" min="1" max="31">
                            </v-text-field>

                            <!-- Calculated EMI Box -->
                            <div
                                class="mt-6 pa-4 bg-primary bg-opacity-10 rounded-lg border border-primary border-opacity-20 d-flex justify-space-between align-center">
                                <span class="text-subtitle-2 font-weight-bold text-on-surface">Calculated EMI</span>
                                <span class="text-h5 font-weight-black text-primary">{{ formatCurrency(form.emi_amount)
                                    }}</span>
                            </div>
                        </v-form>
                    </v-card-text>

                    <v-card-actions class="px-6 pb-6 pt-2">
                        <v-btn variant="text" @click="showModal = false" height="48" rounded="lg"
                            class="px-6 font-weight-bold text-none text-medium-emphasis">
                            Cancel
                        </v-btn>
                        <v-spacer />
                        <v-btn color="primary" variant="flat" rounded="lg" height="48"
                            class="px-8 font-weight-black text-none elevation-4" @click="submitLoan">
                            Create Loan
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- AI Insights Modal -->
            <v-dialog v-model="showInsightModal" max-width="700">
                <v-card rounded="xl" class="premium-glass-modal elevation-24">
                    <div class="px-6 pt-6 pb-2 d-flex justify-space-between align-center">
                        <div class="d-flex align-center gap-2">
                            <Sparkles :size="24" class="text-primary" />
                            <h2 class="text-h5 font-weight-black text-content">Debt Strategy</h2>
                        </div>
                        <v-btn icon variant="text" @click="showInsightModal = false" density="comfortable"
                            class="bg-surface-variant bg-opacity-10 opacity-70 hover:opacity-100">
                            <X :size="20" />
                        </v-btn>
                    </div>

                    <v-card-text class="px-6 py-4" style="max-height: 60vh; overflow-y: auto;">
                        <div v-if="insightLoading" class="text-center py-12">
                            <v-progress-circular indeterminate color="primary" size="48" />
                            <p class="mt-4 text-medium-emphasis font-weight-bold">Analyzing debt portfolio...</p>
                        </div>
                        <div v-else class="markdown-body premium-markdown" v-html="renderedInsights"></div>
                    </v-card-text>

                    <v-card-actions class="px-6 pb-6 pt-2 justify-end">
                        <v-btn color="primary" variant="flat" rounded="lg" height="48" class="px-8 font-weight-bold"
                            @click="showInsightModal = false">
                            Done
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-container>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { todayLocalString } from '@/utils/time'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi as api } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import { useLoanStore } from '@/stores/finance/loans'
import WfButton from '@/components/ui/WfButton.vue'
import LoanSummaryCards from '@/components/loans/LoanSummaryCards.vue'
import LoanCard from '@/components/loans/LoanCard.vue'
import AddLoanModal from '@/components/loans/AddLoanModal.vue'
import DebtStrategyModal from '@/components/loans/DebtStrategyModal.vue'
import { Landmark, TrendingUp, Plus } from 'lucide-vue-next'

const router = useRouter()
const notificationStore = useNotificationStore()
const authStore = useAuthStore()
const loanStore = useLoanStore()

// State - seed from store cache
const loans = computed(() => loanStore.loans)
const loading = ref(loanStore.loans.length === 0)
const showModal = ref(false)
const showInsightModal = ref(false)
const insightLoading = ref(false)
const portfolioInsights = ref('')
const savingLoan = ref(false)

const form = reactive({
  name: '',
  lender_name: '',
  loan_account_number: '',
  principal_amount: 0,
  interest_rate: 0,
  tenure_months: 12,
  start_date: todayLocalString(),
  emi_date: 5,
  emi_amount: 0,
  loan_type: 'HOME_LOAN'
})

const calculateEmi = () => {
  const p = form.principal_amount
  const r = (form.interest_rate / 12) / 100
  const n = form.tenure_months

  if (p > 0 && r > 0 && n > 0) {
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    form.emi_amount = Math.round(emi * 100) / 100
  } else {
    form.emi_amount = 0
  }
}

const totalOutstanding = computed(() => {
  return loans.value.reduce((sum, loan) => sum + Number(loan.outstanding_balance || 0), 0)
})

const totalMonthlyEmi = computed(() => {
  return loans.value.reduce((sum, loan) => sum + Number(loan.emi_amount || 0), 0)
})

const fetchLoans = async () => {
  if (loanStore.loans.length === 0) loading.value = true
  try {
    await loanStore.fetchLoans()
  } catch (e) {
    console.error('Failed to fetch loans', e)
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  form.name = ''
  form.lender_name = ''
  form.loan_account_number = ''
  form.principal_amount = 0
  form.interest_rate = 0
  form.tenure_months = 12
  form.start_date = todayLocalString()
  form.emi_date = 5
  form.emi_amount = 0
  form.loan_type = 'HOME_LOAN'
  showModal.value = true
}

const submitLoan = async () => {
  if (!form.name.trim()) {
    notificationStore.error('Please enter a loan name')
    return
  }
  if (!form.principal_amount || form.principal_amount <= 0) {
    notificationStore.error('Please enter a valid principal amount')
    return
  }

  savingLoan.value = true
  try {
    calculateEmi()
    await api.createLoan(form)
    notificationStore.success('Loan created successfully!')
    showModal.value = false
    fetchLoans()
  } catch (e) {
    console.error('Failed to create loan', e)
    notificationStore.error('Failed to create loan. Please check your inputs.')
  } finally {
    savingLoan.value = false
  }
}

const generatePortfolioInsights = async () => {
  if (loans.value.length === 0) {
    notificationStore.error('Add some loans first to analyze them.')
    return
  }

  showInsightModal.value = true
  insightLoading.value = true
  try {
    const res = await api.getPortfolioInsights()
    portfolioInsights.value = res.data.insights
  } catch (e) {
    console.error('Failed to generate insights', e)
    notificationStore.error('Analysis failed. Please try again.')
    showInsightModal.value = false
  } finally {
    insightLoading.value = false
  }
}

const viewDetails = (id: string) => {
  router.push(`/loans/${id}`)
}

onMounted(() => {
  fetchLoans()
})

watch(() => authStore.selectedMemberId, () => {
  fetchLoans()
})
</script>

<template>
  <MainLayout>
    <div class="space-y-5 pb-8">
      <!-- PAGE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
            <Landmark class="w-4.5 h-4.5 text-wf-primary" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary">
                Loans & Liabilities
              </h1>
              <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                {{ loans.length }} Active
              </span>
            </div>
            <p class="text-xs text-wf-text-secondary">
              Manage your debts, EMI schedules, and prepayment optimization.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <WfButton
            variant="secondary"
            size="sm"
            :loading="insightLoading"
            @click="generatePortfolioInsights"
          >
            <TrendingUp class="w-4 h-4 mr-1.5" />
            <span>Repayment Strategy</span>
          </WfButton>

          <WfButton variant="primary" size="sm" @click="openAddModal">
            <Plus class="w-4 h-4 mr-1.5" />
            <span>Add Loan</span>
          </WfButton>
        </div>
      </div>

      <!-- HERO SUMMARY STATS -->
      <LoanSummaryCards
        v-if="loans.length > 0 || !loading"
        :total-outstanding="totalOutstanding"
        :total-monthly-emi="totalMonthlyEmi"
        :active-count="loans.length"
      />

      <!-- LOADING SKELETONS -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <div
          v-for="i in 3"
          :key="`skel-${i}`"
          class="h-64 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border-subtle animate-pulse p-6 space-y-4"
        >
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-wf-lg bg-wf-surface-variant"></div>
            <div class="space-y-2 flex-grow">
              <div class="h-4 bg-wf-surface-variant rounded w-3/4"></div>
              <div class="h-3 bg-wf-surface-variant rounded w-1/2"></div>
            </div>
          </div>
          <div class="h-2 bg-wf-surface-variant rounded-full w-full mt-6"></div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="h-8 bg-wf-surface-variant rounded"></div>
            <div class="h-8 bg-wf-surface-variant rounded"></div>
          </div>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-else-if="loans.length === 0"
        class="flex flex-col items-center justify-center p-12 text-center rounded-wf-xl bg-wf-surface border border-wf-border shadow-2xs max-w-lg mx-auto mt-12 space-y-4"
      >
        <div class="w-16 h-16 rounded-full bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-sm">
          <Landmark class="w-8 h-8" />
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-wf-text-primary">No Active Loans</h3>
          <p class="text-xs text-wf-text-secondary max-w-sm">
            Add a loan to track your principal balance, calculate savings from prepayments, and schedule monthly EMIs.
          </p>
        </div>
        <WfButton variant="primary" size="sm" @click="openAddModal">
          <Plus class="w-4 h-4 mr-1.5" />
          <span>Add Your First Loan</span>
        </WfButton>
      </div>

      <!-- LOANS GRID -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-8">
        <!-- Add New Loan Quick Action Card -->
        <div
          @click="openAddModal"
          class="flex flex-col items-center justify-center min-h-[220px] p-6 rounded-wf-lg border-2 border-dashed border-wf-border hover:border-wf-primary/60 bg-wf-surface hover:bg-wf-primary-light/10 cursor-pointer transition-all duration-200 group text-center space-y-3"
        >
          <div class="w-12 h-12 rounded-full bg-wf-primary-light text-wf-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs border border-indigo-200 dark:border-indigo-900/50">
            <Plus class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-wf-text-primary group-hover:text-wf-primary transition-colors">
              Add New Loan
            </h4>
            <p class="text-xs text-wf-text-muted mt-0.5">
              Track a new liability or debt schedule
            </p>
          </div>
        </div>

        <!-- Loan Cards -->
        <LoanCard
          v-for="loan in loans"
          :key="loan.id"
          :loan="loan"
          @click="viewDetails"
        />
      </div>

      <!-- ADD LOAN MODAL -->
      <AddLoanModal
        v-model="showModal"
        :form="form"
        :saving="savingLoan"
        @submit="submitLoan"
      />

      <!-- DEBT STRATEGY MODAL -->
      <DebtStrategyModal
        v-model="showInsightModal"
        :portfolio-insights="portfolioInsights"
        :loading="insightLoading"
      />
    </div>
  </MainLayout>
</template>
