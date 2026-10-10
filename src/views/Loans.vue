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
    <div class="max-w-[1600px] mx-auto space-y-8 pb-16">
      <!-- PAGE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs">
            <Landmark class="w-5 h-5 text-wf-primary" />
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

        <div class="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <WfButton
            variant="secondary"
            size="md"
            :loading="insightLoading"
            @click="generatePortfolioInsights"
          >
            <TrendingUp class="w-4 h-4 mr-1.5" />
            <span>Repayment Strategy</span>
          </WfButton>

          <WfButton variant="primary" size="md" @click="openAddModal">
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
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <WfButton variant="primary" size="md" @click="openAddModal">
          <Plus class="w-4 h-4 mr-1.5" />
          <span>Add Your First Loan</span>
        </WfButton>
      </div>

      <!-- LOANS GRID -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
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
