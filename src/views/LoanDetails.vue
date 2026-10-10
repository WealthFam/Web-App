<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { todayLocalString } from '@/utils/time'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi as api } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useCurrency } from '@/composables/useCurrency'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler } from 'chart.js'
import { Pie, Bar, Line } from 'vue-chartjs'
import { marked } from 'marked'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import LoanRepaymentModal from '@/components/loans/LoanRepaymentModal.vue'
import {
  ChevronLeft,
  TrendingUp,
  Calendar,
  Landmark,
  Wallet,
  CalendarClock,
  Target,
  Sparkles,
  CheckCircle2
} from 'lucide-vue-next'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler)

const route = useRoute()
const router = useRouter()
const notificationStore = useNotificationStore()
const { formatAmount } = useCurrency()

const loading = ref(true)
const loan = ref<any>(null)
const accounts = ref<any[]>([])
const insightLoading = ref(false)
const insights = ref<string | null>(null)
const simulations = ref<any | null>(null)
const customSimResult = ref<any | null>(null)
const customSimLoading = ref(false)
const isSubmitting = ref(false)

const customSimForm = reactive({
  extra_monthly_payment: 0,
  one_time_prepayment: 0
})

const showRepaymentModal = ref(false)
const repaymentForm = ref({
  amount: 0,
  date: todayLocalString(),
  bank_account_id: '',
  installment_no: null as number | null,
  description: ''
})

const loanTypeOptions: Record<string, string> = {
  HOME_LOAN: '🏠',
  PERSONAL_LOAN: '👤',
  CAR_LOAN: '🚗',
  EDUCATION_LOAN: '🎓',
  CREDIT_CARD: '💳',
  OTHER: '💰'
}

const getLoanIcon = (type: string) => {
  return loanTypeOptions[type] || '💰'
}

const accountOptions = computed(() => {
  return accounts.value
    .filter(a => a.type === 'BANK' || a.type === 'WALLET')
    .map(a => ({ label: `${a.name} (${formatAmount(a.balance)})`, value: a.id }))
})

const openRepaymentModal = (item: any) => {
  repaymentForm.value = {
    amount: item.emi,
    date: item.due_date ? item.due_date.split('T')[0] : todayLocalString(),
    bank_account_id: loan.value?.bank_account_id || (accounts.value[0]?.id || ''),
    installment_no: item.installment_no,
    description: `EMI #${item.installment_no} for ${loan.value?.name || 'Loan'}`
  }
  showRepaymentModal.value = true
}

const submitRepayment = async () => {
  if (!repaymentForm.value.bank_account_id) {
    notificationStore.error('Please select a bank account')
    return
  }

  isSubmitting.value = true
  try {
    const id = route.params.id as string
    await api.recordLoanRepayment(id, repaymentForm.value)
    notificationStore.success('Repayment recorded successfully')
    showRepaymentModal.value = false
    fetchLoanDetails()
  } catch (e) {
    console.error('Failed to record repayment', e)
    notificationStore.error('Failed to record repayment')
  } finally {
    isSubmitting.value = false
  }
}

const renderedInsights = computed(() => {
  return insights.value ? marked(insights.value) : ''
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const totalInterest = computed(() => {
  if (!loan.value || !loan.value.amortization_schedule) return 0
  return loan.value.amortization_schedule.reduce(
    (sum: number, item: any) => sum + Number(item.interest_component),
    0
  )
})

const chartData = computed(() => {
  if (!loan.value) return null
  return {
    labels: ['Principal', 'Total Interest'],
    datasets: [
      {
        backgroundColor: ['#6366F1', '#EF4444'],
        data: [Number(loan.value.principal_amount), totalInterest.value],
        borderWidth: 0
      }
    ]
  }
})

// --- Monthly Amortization Chart Logic ---
const amortizationChartData = computed(() => {
  if (!loan.value || !loan.value.amortization_schedule) return null

  const monthlyData: Record<string, { principal: number; interest: number }> = {}
  const labelOrder: string[] = []

  loan.value.amortization_schedule.forEach((item: any) => {
    const date = new Date(item.due_date)
    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = { principal: 0, interest: 0 }
      labelOrder.push(monthYear)
    }
    monthlyData[monthYear].principal += Number(item.principal_component)
    monthlyData[monthYear].interest += Number(item.interest_component)
  })

  const principalData = labelOrder.map(label => Math.round(monthlyData[label].principal))
  const interestData = labelOrder.map(label => Math.round(monthlyData[label].interest))

  return {
    labels: labelOrder,
    datasets: [
      {
        label: 'Principal',
        backgroundColor: '#6366F1',
        data: principalData,
        stack: 'Stack 0',
        borderRadius: 3
      },
      {
        label: 'Interest',
        backgroundColor: '#EF4444',
        data: interestData,
        stack: 'Stack 0',
        borderRadius: 3
      }
    ]
  }
})

const amortizationChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { font: { family: 'Inter', size: 10 } }
    },
    y: {
      stacked: true,
      border: { display: false },
      grid: { color: 'rgba(128, 128, 128, 0.08)' },
      ticks: {
        callback: (value: any) => formatAmount(value),
        font: { family: 'Inter', size: 10 }
      }
    }
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 16,
        font: { family: 'Inter', size: 11, weight: 'bold' as const }
      }
    },
    tooltip: {
      callbacks: {
        label: function (context: any) {
          let label = context.dataset.label || ''
          if (label) label += ': '
          if (context.parsed.y !== null) {
            label += formatAmount(context.parsed.y)
          }
          return label
        }
      }
    }
  }
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 16,
        font: { family: 'Inter', size: 11, weight: 'bold' as const }
      }
    }
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return { label: 'PAID', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
    case 'OVERDUE':
      return { label: 'OVERDUE', class: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
    case 'PENDING':
    default:
      return { label: 'PENDING', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
  }
}

const fetchLoanDetails = async () => {
  loading.value = true
  try {
    const [loanRes, accRes] = await Promise.all([
      api.getLoanDetails(route.params.id as string),
      api.getAccounts()
    ])
    loan.value = loanRes.data
    accounts.value = accRes.data
  } catch (e) {
    console.error('Failed to fetch loan details', e)
    notificationStore.error('Failed to load loan details')
  } finally {
    loading.value = false
  }
}

const generateInsights = async () => {
  insightLoading.value = true
  try {
    const id = route.params.id as string
    const response = await api.getLoanInsights(id)
    insights.value = response.data.insights
    simulations.value = response.data.simulations
    notificationStore.success('Optimization report generated!')
  } catch (e) {
    console.error('Failed to generate insights', e)
    notificationStore.error('Failed to generate debt optimization analysis.')
  } finally {
    insightLoading.value = false
  }
}

const runCustomSimulation = async () => {
  customSimLoading.value = true
  try {
    const id = route.params.id as string
    const response = await api.simulateLoanPrepayment(id, customSimForm)
    customSimResult.value = response.data
  } catch (e) {
    console.error('Failed to run custom simulation', e)
    notificationStore.error('Failed to simulate. Ensure values are valid.')
  } finally {
    customSimLoading.value = false
  }
}

const simulationChartData = computed(() => {
  if (!customSimResult.value?.custom_schedule || !customSimResult.value?.standard_schedule) return null

  const custom = customSimResult.value.custom_schedule
  const standard = customSimResult.value.standard_schedule

  const totalMax = Math.max(custom.length, standard.length)
  const step = Math.max(1, Math.ceil(totalMax / 50))

  const labels = []
  const standardData = []
  const customData = []

  for (let i = 0; i < totalMax; i += step) {
    labels.push(`M${i}`)
    standardData.push(i < standard.length ? standard[i].balance : 0)
    customData.push(i < custom.length ? custom[i].balance : 0)
  }

  if (totalMax % step !== 0) {
    labels.push(`M${totalMax}`)
    standardData.push(0)
    customData.push(0)
  }

  return {
    labels,
    datasets: [
      {
        label: 'Standard Path',
        data: standardData,
        borderColor: 'rgba(99, 102, 241, 0.4)',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        borderDash: [4, 4],
        tension: 0.3,
        pointRadius: 0,
        fill: true
      },
      {
        label: 'Strategic Path',
        data: customData,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 0,
        fill: true
      }
    ]
  }
})

const simulationChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(128, 128, 128, 0.08)' },
      ticks: {
        callback: (value: any) => formatAmount(value),
        font: { family: 'Inter', size: 10 }
      }
    },
    x: {
      grid: { display: false },
      ticks: { maxRotation: 0, font: { family: 'Inter', size: 10 } }
    }
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { usePointStyle: true, font: { family: 'Inter', size: 11, weight: 'bold' as const } }
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        label: (context: any) => `${context.dataset.label}: ${formatAmount(context.parsed.y)}`
      }
    }
  }
}

onMounted(() => {
  fetchLoanDetails()
})
</script>

<template>
  <MainLayout>
    <div class="max-w-[1600px] mx-auto space-y-8 pb-16">
      <!-- Back Link -->
      <div>
        <button
          type="button"
          @click="router.back()"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-wf-text-secondary hover:text-wf-primary transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
          <span>Back to Loans</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="`skel-top-${i}`" class="h-28 rounded-wf-lg bg-wf-surface-variant/40 animate-pulse"></div>
        </div>
        <div class="h-64 rounded-wf-lg bg-wf-surface-variant/40 animate-pulse"></div>
      </div>

      <!-- Loan Detail Content -->
      <div v-else-if="loan" class="space-y-8">
        <!-- HEADER ROW -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-wf-border-subtle">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-wf-xl bg-wf-surface-variant flex items-center justify-center text-3xl border border-wf-border-subtle shadow-2xs">
              <span>{{ getLoanIcon(loan.loan_type) }}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-black tracking-tight text-wf-text-primary">
                  {{ loan.name }}
                </h1>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50 uppercase tracking-wider">
                  {{ loan.loan_type?.replace(/_/g, ' ') || 'LOAN' }}
                </span>
              </div>
              <div class="flex items-center gap-3 text-xs text-wf-text-muted mt-1 font-semibold">
                <div class="flex items-center gap-1">
                  <Calendar class="w-3.5 h-3.5" />
                  <span>{{ loan.tenure_months }} Months</span>
                </div>
                <span>•</span>
                <div class="flex items-center gap-1 text-rose-500 font-bold">
                  <TrendingUp class="w-3.5 h-3.5" />
                  <span>{{ loan.interest_rate }}% Interest</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Outstanding Callout Card -->
          <div class="p-4 bg-wf-primary-light/40 dark:bg-indigo-950/30 rounded-wf-lg border border-indigo-200 dark:border-indigo-900/50 self-start md:self-auto min-w-[220px]">
            <span class="text-[10px] font-bold text-wf-primary uppercase tracking-wider block">
              Current Outstanding
            </span>
            <div class="text-2xl font-black text-wf-primary font-mono mt-0.5">
              {{ formatAmount(loan.outstanding_balance) }}
            </div>
          </div>
        </div>

        <!-- 4 METRIC STAT CARDS -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Principal -->
          <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-7 h-7 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50">
                <Landmark class="w-3.5 h-3.5" />
              </div>
              <span class="text-[10px] font-bold text-wf-text-secondary uppercase tracking-wider">Principal</span>
            </div>
            <div class="text-lg font-black text-wf-text-primary font-mono">
              {{ formatAmount(loan.principal_amount) }}
            </div>
          </WfCard>

          <!-- Monthly EMI -->
          <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-7 h-7 rounded-wf-md bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <Wallet class="w-3.5 h-3.5" />
              </div>
              <span class="text-[10px] font-bold text-wf-text-secondary uppercase tracking-wider">Monthly EMI</span>
            </div>
            <div class="text-lg font-black text-wf-text-primary font-mono">
              {{ formatAmount(loan.emi_amount) }}
            </div>
          </WfCard>

          <!-- Next Due Date -->
          <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-7 h-7 rounded-wf-md bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <CalendarClock class="w-3.5 h-3.5" />
              </div>
              <span class="text-[10px] font-bold text-wf-text-secondary uppercase tracking-wider">Next Due Date</span>
            </div>
            <div class="text-sm font-bold text-wf-text-primary mt-1">
              {{ formatDate(loan.next_emi_date) }}
            </div>
          </WfCard>

          <!-- Repayment Progress -->
          <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-wf-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <Target class="w-3.5 h-3.5" />
                </div>
                <span class="text-[10px] font-bold text-wf-text-secondary uppercase tracking-wider">Progress</span>
              </div>
              <span class="text-xs font-black text-wf-primary font-mono">{{ Math.round(loan.progress_percentage || 0) }}%</span>
            </div>
            <div class="w-full bg-wf-surface-variant rounded-wf-pill h-2 overflow-hidden mt-2">
              <div
                class="bg-emerald-500 h-full rounded-wf-pill transition-all duration-500"
                :style="{ width: `${Math.max(0, Math.min(100, loan.progress_percentage || 0))}%` }"
              ></div>
            </div>
          </WfCard>
        </div>

        <!-- STRATEGIC DEBT OPTIMIZATION CARD -->
        <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden border border-wf-border">
          <!-- Section Header -->
          <div class="p-6 bg-wf-surface-variant/30 border-b border-wf-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
                <Sparkles class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-wf-text-primary">
                  Strategic Debt Optimization & Shredder
                </h3>
                <p class="text-[11px] text-wf-text-muted">
                  Simulate EMI top-ups and lumpsum prepayments to eliminate debt years early
                </p>
              </div>
            </div>

            <WfButton
              variant="primary"
              size="sm"
              :loading="insightLoading"
              @click="generateInsights"
            >
              <Sparkles class="w-3.5 h-3.5 mr-1" />
              <span>{{ insights ? 'Refresh Analysis' : 'Generate AI Insights' }}</span>
            </WfButton>
          </div>

          <!-- Pre-computed Strategic Simulations -->
          <div v-if="simulations && simulations.scenarios" class="p-6 border-b border-wf-border-subtle space-y-3">
            <h4 class="text-[11px] font-bold text-wf-primary uppercase tracking-wider">
              Recommended Scenarios
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                v-for="scen in simulations.scenarios"
                :key="scen.name"
                class="p-4 rounded-wf-md bg-wf-surface border border-wf-border hover:border-wf-primary/40 transition-colors shadow-2xs space-y-3"
              >
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-wf-xs bg-wf-primary-light text-wf-primary flex items-center justify-center">
                    <TrendingUp class="w-3 h-3" />
                  </div>
                  <h5 class="text-xs font-bold text-wf-text-primary">{{ scen.name }}</h5>
                </div>
                <p class="text-[11px] text-wf-text-secondary leading-relaxed">{{ scen.description }}</p>
                <div class="space-y-1.5 pt-2 border-t border-wf-border-subtle text-xs">
                  <div class="flex justify-between">
                    <span class="text-wf-text-muted text-[11px]">Interest Saved</span>
                    <span class="font-bold text-emerald-500 font-mono">{{ formatAmount(scen.interest_saved) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-wf-text-muted text-[11px]">Time Saved</span>
                    <span class="font-bold text-wf-primary">{{ scen.months_saved }} Months</span>
                  </div>
                  <div class="flex justify-between text-[11px]">
                    <span class="text-wf-text-muted">Revised Tenure</span>
                    <span class="font-semibold text-wf-text-primary">{{ scen.months }} months</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Interactive Debt Shredder Simulator -->
          <div class="p-6 border-b border-wf-border-subtle space-y-4">
            <h4 class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
              Interactive Debt Shredder Simulator
            </h4>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Controls -->
              <div class="space-y-4">
                <!-- Extra Monthly Payment -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-bold text-wf-text-secondary">
                      Extra Monthly Payment (EMI Top-up)
                    </label>
                    <span class="text-xs font-black text-wf-primary font-mono">
                      {{ formatAmount(customSimForm.extra_monthly_payment) }}
                    </span>
                  </div>
                  <input
                    v-model.number="customSimForm.extra_monthly_payment"
                    type="range"
                    :min="0"
                    :max="loan.emi_amount"
                    :step="1000"
                    class="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <!-- One-time Lumpsum Prepayment -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-bold text-wf-text-secondary">
                      One-time Lumpsum Prepayment
                    </label>
                    <span class="text-xs font-black text-wf-primary font-mono">
                      {{ formatAmount(customSimForm.one_time_prepayment) }}
                    </span>
                  </div>
                  <input
                    v-model.number="customSimForm.one_time_prepayment"
                    type="range"
                    :min="0"
                    :max="Math.max(100000, loan.outstanding_balance / 2)"
                    :step="5000"
                    class="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <WfButton
                  variant="primary"
                  size="md"
                  block
                  :loading="customSimLoading"
                  @click="runCustomSimulation"
                >
                  <span>Run Custom Simulation</span>
                </WfButton>
              </div>

              <!-- Simulation Result Card -->
              <div v-if="customSimResult" class="p-4 rounded-wf-md bg-emerald-500/5 border border-emerald-500/20 space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-emerald-500 font-bold text-xs">
                    <CheckCircle2 class="w-4 h-4" />
                    <span>Impact Analysis</span>
                  </div>
                  <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Optimized Plan</span>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="p-2.5 rounded-wf-sm bg-wf-surface border border-emerald-500/20">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">Interest Saved</span>
                    <div class="text-base font-black text-emerald-500 font-mono mt-0.5">
                      {{ formatAmount(customSimResult.interest_saved) }}
                    </div>
                  </div>
                  <div class="p-2.5 rounded-wf-sm bg-wf-surface border border-emerald-500/20">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">Time Saved</span>
                    <div class="text-base font-black text-wf-primary font-mono mt-0.5">
                      {{ customSimResult.months_saved }} Months
                    </div>
                  </div>
                </div>

                <!-- Simulation Line Chart -->
                <div class="h-44 bg-wf-surface rounded-wf-md p-2 border border-wf-border-subtle">
                  <Line
                    v-if="simulationChartData"
                    :data="simulationChartData as any"
                    :options="simulationChartOptions as any"
                  />
                </div>
              </div>

              <!-- Awaiting Inputs -->
              <div v-else class="flex flex-col items-center justify-center p-8 rounded-wf-md border border-dashed border-wf-border text-center space-y-2">
                <div class="w-10 h-10 rounded-full bg-wf-primary-light text-wf-primary flex items-center justify-center">
                  <Target class="w-5 h-5" />
                </div>
                <h5 class="text-xs font-bold text-wf-text-primary">Awaiting Simulation</h5>
                <p class="text-[11px] text-wf-text-muted max-w-xs">
                  Adjust prepayments and click 'Run Custom Simulation' to calculate your interest reduction.
                </p>
              </div>
            </div>
          </div>

          <!-- Optimization Report Markdown -->
          <div v-if="insights" class="p-6 bg-wf-surface-variant/20 space-y-3">
            <div class="flex items-center gap-2 text-wf-primary font-bold text-xs uppercase tracking-wider">
              <TrendingUp class="w-4 h-4" />
              <span>Optimization Analysis Report</span>
            </div>
            <div class="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-wf-text-secondary" v-html="renderedInsights"></div>
          </div>
        </WfCard>

        <!-- CHARTS SECTION -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Monthly Amortization Stacked Bar Chart -->
          <WfCard variant="flat" padding="md" radius="lg" class="lg:col-span-2 shadow-2xs space-y-4">
            <div>
              <h3 class="text-sm font-bold text-wf-text-primary">Monthly Amortization Breakdown</h3>
              <p class="text-[11px] text-wf-text-muted">Projected Principal vs. Interest split across payments</p>
            </div>
            <div class="h-72">
              <Bar
                v-if="amortizationChartData"
                :data="amortizationChartData as any"
                :options="amortizationChartOptions as any"
              />
            </div>
          </WfCard>

          <!-- Principal vs Total Interest Donut Chart -->
          <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <h3 class="text-sm font-bold text-wf-text-primary">Principal vs Interest Ratio</h3>
              <p class="text-[11px] text-wf-text-muted">Total cost composition</p>
            </div>

            <div class="h-48">
              <Pie
                v-if="chartData"
                :data="chartData as any"
                :options="chartOptions as any"
              />
            </div>

            <div class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-wf-md text-center">
              <span class="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                Total Interest Payable
              </span>
              <div class="text-lg font-black text-rose-500 font-mono mt-0.5">
                {{ formatAmount(totalInterest) }}
              </div>
            </div>
          </WfCard>
        </div>

        <!-- AMORTIZATION SCHEDULE TABLE -->
        <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden border border-wf-border">
          <div class="px-6 py-4 border-b border-wf-border-subtle flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-wf-text-primary">Amortization Schedule</h3>
              <p class="text-[11px] text-wf-text-muted">Detailed installment breakdown and repayment log</p>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-surface-variant text-wf-text-secondary border border-wf-border-subtle">
              {{ loan.amortization_schedule?.length || 0 }} Installments
            </span>
          </div>

          <div class="overflow-x-auto max-h-[500px]">
            <table class="w-full text-left text-xs divide-y divide-wf-border-subtle">
              <thead class="bg-wf-surface-variant/50 sticky top-0 z-10 text-[10px] font-bold text-wf-text-secondary uppercase tracking-wider">
                <tr>
                  <th class="px-4 py-3">#</th>
                  <th class="px-4 py-3">Due Date</th>
                  <th class="px-4 py-3 text-right">EMI</th>
                  <th class="px-4 py-3 text-right">Principal</th>
                  <th class="px-4 py-3 text-right">Interest</th>
                  <th class="px-4 py-3 text-right">Closing Balance</th>
                  <th class="px-4 py-3 text-center">Status</th>
                  <th class="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-wf-border-subtle bg-wf-surface font-mono">
                <tr
                  v-for="item in loan.amortization_schedule"
                  :key="item.installment_no"
                  class="hover:bg-wf-surface-variant/30 transition-colors"
                >
                  <td class="px-4 py-3 font-sans text-wf-text-muted">{{ item.installment_no }}</td>
                  <td class="px-4 py-3 font-sans font-medium text-wf-text-primary">{{ formatDate(item.due_date) }}</td>
                  <td class="px-4 py-3 text-right font-black text-wf-text-primary">{{ formatAmount(item.emi) }}</td>
                  <td class="px-4 py-3 text-right font-bold text-wf-primary">{{ formatAmount(item.principal_component) }}</td>
                  <td class="px-4 py-3 text-right font-bold text-rose-500">{{ formatAmount(item.interest_component) }}</td>
                  <td class="px-4 py-3 text-right text-wf-text-muted">{{ formatAmount(item.closing_balance) }}</td>
                  <td class="px-4 py-3 text-center font-sans">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[9px] font-bold border"
                      :class="getStatusBadge(item.status).class"
                    >
                      {{ getStatusBadge(item.status).label }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center font-sans">
                    <WfButton
                      v-if="item.status !== 'PAID'"
                      variant="primary"
                      size="sm"
                      @click="openRepaymentModal(item)"
                    >
                      <span>Pay</span>
                    </WfButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </WfCard>
      </div>

      <!-- REPAYMENT MODAL -->
      <LoanRepaymentModal
        v-model="showRepaymentModal"
        :repayment-form="repaymentForm"
        :account-options="accountOptions"
        :saving="isSubmitting"
        @submit="submitRepayment"
      />
    </div>
  </MainLayout>
</template>
