<template>
  <MainLayout>
    <div class="space-y-5">
      <!-- HEADER: Greeting & Sync Action -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs">
            <component :is="greetingIcon" class="w-5 h-5 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary">
                {{ getGreeting() }}, {{ userName }}
              </h1>
              <span class="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                Live
              </span>
            </div>
            <p class="text-xs text-wf-text-secondary">
              Family wealth command center & real-time insights.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <WfButton
            variant="outline"
            size="sm"
            @click="fetchAllData()"
            :loading="loading"
            class="h-8.5 px-3.5 text-xs font-semibold shadow-2xs"
          >
            <RefreshCw class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': loading }" />
            <span>Sync Live</span>
          </WfButton>
        </div>
      </div>

      <!-- TOP FINANCIAL INTELLIGENCE HORIZONTAL BAR -->
      <FinancialIntelligenceBar
        :insights="formattedInsights"
        :is-cached="isInsightsCached"
        :refreshing="refreshingInsights"
        :loading="loading && !budgetInsights"
        @refresh="forceRefreshInsights"
      />

      <!-- SKELETON LOADING STATE -->
      <div v-if="loading && !metrics" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div v-for="i in 5" :key="`skel-${i}`" class="h-28 rounded-wf-lg bg-wf-surface border border-wf-border animate-pulse p-4 flex flex-col justify-between">
            <div class="w-8 h-8 rounded-wf-md bg-slate-200 dark:bg-slate-700"></div>
            <div class="w-24 h-6 rounded bg-slate-200 dark:bg-slate-700"></div>
          </div>
        </div>
        <div class="h-64 rounded-wf-lg bg-wf-surface border border-wf-border animate-pulse"></div>
      </div>

      <!-- MAIN DASHBOARD CONTENT -->
      <div v-else class="space-y-5">
        <!-- ROW 1: 5 Key Financial Metric Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <!-- 1. Total Net Worth -->
          <WfCard
            variant="elevated"
            padding="md"
            radius="lg"
            class="cursor-pointer hover:border-wf-primary/40 transition-all flex flex-col justify-between"
            @click="router.push('/accounts')"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary">
                <Landmark class="w-4 h-4" />
              </div>
              <div v-if="netWorthTrend.length > 1" class="ml-auto">
                <Sparkline :data="netWorthTrend" :labels="netWorthLabels" color="#6366f1" :height="22" :width="70" fill />
              </div>
            </div>
            <div>
              <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block mb-0.5">Total Net Worth</span>
              <div class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary tabular-nums">
                {{ formatSignedAmount(netWorth) }}
              </div>
            </div>
            <div class="pt-2 border-t border-wf-border-subtle mt-2 flex items-center justify-between text-[11px]">
              <div
                class="flex items-center font-semibold"
                :class="netWorthChange >= 0 ? 'text-wf-success' : 'text-wf-error'"
              >
                <TrendingUp v-if="netWorthChange >= 0" class="w-3 h-3 mr-1 shrink-0" />
                <TrendingDown v-else class="w-3 h-3 mr-1 shrink-0" />
                <span>{{ Number(Math.abs(netWorthChange || 0)).toFixed(1) }}% MoM</span>
              </div>
            </div>
          </WfCard>

          <!-- 2. Expenses -->
          <WfCard
            variant="elevated"
            padding="md"
            radius="lg"
            class="cursor-pointer hover:border-rose-400/40 transition-all flex flex-col justify-between"
            @click="router.push('/transactions')"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-wf-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-wf-error">
                <Wallet class="w-4 h-4" />
              </div>
              <div v-if="sixMonthSpendingTrend.length > 1" class="ml-auto">
                <Sparkline :data="sixMonthSpendingTrend" :labels="sixMonthLabels" color="#f43f5e" :height="22" :width="70" fill />
              </div>
            </div>
            <div>
              <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block mb-0.5">Monthly Expenses</span>
              <div class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary tabular-nums">
                {{ formatAmount(metrics?.monthly_spending || 0) }}
              </div>
            </div>
            <div class="pt-2 border-t border-wf-border-subtle mt-2 flex items-center justify-between text-[11px]">
              <div
                class="flex items-center font-semibold"
                :class="spendingChange <= 0 ? 'text-wf-success' : 'text-wf-error'"
              >
                <TrendingDown v-if="spendingChange <= 0" class="w-3 h-3 mr-1 shrink-0" />
                <TrendingUp v-else class="w-3 h-3 mr-1 shrink-0" />
                <span>{{ Number(Math.abs(spendingChange || 0)).toFixed(1) }}% MoM</span>
              </div>
            </div>
          </WfCard>

          <!-- 3. Monthly Invested -->
          <WfCard
            variant="elevated"
            padding="md"
            radius="lg"
            class="cursor-pointer hover:border-emerald-400/40 transition-all flex flex-col justify-between"
            @click="router.push('/transactions')"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-wf-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-wf-success">
                <Zap class="w-4 h-4" />
              </div>
              <div v-if="sixMonthInvestmentTrend.length > 0" class="ml-auto">
                <Sparkline :data="sixMonthInvestmentTrend" :labels="sixMonthLabels" color="#10b981" :height="22" :width="70" fill />
              </div>
              <div v-else class="text-right">
                <span class="text-[9px] text-wf-text-muted uppercase font-bold block">Rate</span>
                <span class="text-xs font-bold text-wf-success tabular-nums">{{ (metrics?.savings_rate || 0).toFixed(1) }}%</span>
              </div>
            </div>
            <div>
              <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block mb-0.5">Monthly Invested</span>
              <div class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary tabular-nums">
                {{ formatAmount(metrics?.monthly_investment || 0) }}
              </div>
            </div>
            <div class="pt-2 border-t border-wf-border-subtle mt-2 flex items-center justify-between text-[11px]">
              <div
                class="flex items-center font-semibold"
                :class="investmentChange >= 0 ? 'text-wf-success' : 'text-wf-error'"
              >
                <TrendingUp v-if="investmentChange >= 0" class="w-3 h-3 mr-1 shrink-0" />
                <TrendingDown v-else class="w-3 h-3 mr-1 shrink-0" />
                <span>{{ Number(Math.abs(investmentChange || 0)).toFixed(1) }}% MoM</span>
              </div>
            </div>
          </WfCard>

          <!-- 4. Portfolio Value -->
          <WfCard
            variant="elevated"
            padding="md"
            radius="lg"
            class="cursor-pointer hover:border-teal-400/40 transition-all flex flex-col justify-between"
            @click="router.push('/mutual-funds')"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-wf-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Briefcase class="w-4 h-4" />
              </div>
              <div class="text-right">
                <span class="text-[9px] text-wf-text-muted uppercase font-bold block">XIRR</span>
                <span class="text-xs font-bold text-teal-600 dark:text-teal-400 tabular-nums">{{ Number(mfPortfolio.xirr || 0).toFixed(1) }}%</span>
              </div>
            </div>
            <div>
              <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block mb-0.5">Portfolio Value</span>
              <div class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary tabular-nums">
                {{ formatAmount(mfPortfolio.current) }}
              </div>
            </div>
            <div class="pt-2 border-t border-wf-border-subtle mt-2 flex items-center text-[11px] text-wf-success font-semibold">
              <TrendingUp class="w-3 h-3 mr-1 shrink-0" />
              <span class="tabular-nums">{{ formatAmount(mfPortfolio.pl) }} gains</span>
            </div>
          </WfCard>

          <!-- 5. Remaining Budget -->
          <WfCard
            variant="elevated"
            padding="md"
            radius="lg"
            class="cursor-pointer hover:border-amber-400/40 transition-all flex flex-col justify-between"
            @click="router.push('/budgets')"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-wf-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-wf-warning">
                <PieChart class="w-4 h-4" />
              </div>
              <div class="text-right">
                <span class="text-[9px] text-wf-text-muted uppercase font-bold block">Utilized</span>
                <span
                  class="text-xs font-bold tabular-nums"
                  :class="(metrics?.budget_health?.percentage || 0) <= 90 ? 'text-wf-success' : 'text-wf-error'"
                >
                  {{ Number(metrics?.budget_health?.percentage || 0).toFixed(0) }}%
                </span>
              </div>
            </div>
            <div>
              <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block mb-0.5">Remaining Budget</span>
              <div class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary tabular-nums">
                {{ formatSignedAmount((metrics?.budget_health?.limit || 0) - (metrics?.budget_health?.spent || 0)) }}
              </div>
            </div>
            <div class="pt-2 border-t border-wf-border-subtle mt-2">
              <div class="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="(metrics?.budget_health?.percentage || 0) > 90 ? 'bg-rose-500' : 'bg-emerald-500'"
                  :style="{ width: `${Math.min(100, Number(metrics?.budget_health?.percentage || 0))}%` }"
                ></div>
              </div>
            </div>
          </WfCard>
        </div>

        <!-- ROW 2: Expense & Cashflow Dynamics (8 cols) & Wealth Compass (4 cols) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Left: Expense & Cashflow Dynamics -->
          <div class="lg:col-span-7 xl:col-span-8 flex">
            <ExpenseTrajectory class="w-full" />
          </div>

          <!-- Right: Wealth Compass -->
          <div class="lg:col-span-5 xl:col-span-4 flex">
            <WealthCompass :metrics="metrics" :portfolio="mfPortfolio" class="w-full" />
          </div>
        </div>

        <!-- ROW 3: Unified Family Pulse & Activity Timeline (Full Width) -->
        <HorizontalActivityTimeline
          :transactions="metrics?.recent_transactions || []"
          :activities="activities"
          :upcoming-bills="upcomingBills"
          :categories="categories"
        />

        <!-- ROW 4: Credit Wallet & Liquidity Headroom (Full Width) -->
        <CreditWalletWidget :cards="metrics?.credit_intelligence || []" />
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi } from '@/api/client'
import { useRouter } from 'vue-router'
import { useDashboardHelpers } from '@/composables/useDashboardHelpers'
import { useAuthStore } from '@/stores/auth'
import { useCurrency } from '@/composables/useCurrency'
import Sparkline from '@/components/Sparkline.vue'
import WealthCompass from '@/components/dashboard/WealthCompass.vue'
import ExpenseTrajectory from '@/components/dashboard/ExpenseTrajectory.vue'
import FinancialIntelligenceBar from '@/components/dashboard/FinancialIntelligenceBar.vue'
import HorizontalActivityTimeline from '@/components/dashboard/HorizontalActivityTimeline.vue'
import CreditWalletWidget from '@/components/dashboard/CreditWalletWidget.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useBudgetStore } from '@/stores/finance/budgets'
import { useExpenseGroupStore } from '@/stores/expenseGroups'
import { useFinanceStore } from '@/stores/finance'
import { useActivityStore } from '@/stores/activity'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import {
  Landmark,
  Wallet,
  Briefcase,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  PieChart,
  Sun,
  Sunrise,
  Moon
} from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()
const dashboardStore = useDashboardStore()
const financeStore = useFinanceStore()
const budgetStore = useBudgetStore()
const expenseGroupStore = useExpenseGroupStore()
const activityStore = useActivityStore()
const { formatAmount } = useCurrency()
const { getGreeting } = useDashboardHelpers()

const activities = computed(() => activityStore.activities || [])

function formatSignedAmount(val: number) {
  if (val < 0) {
    return `-${formatAmount(Math.abs(val))}`
  }
  return formatAmount(val)
}

// --- State & Computed ---
const metrics = computed(() => dashboardStore.metrics)
const mfPortfolio = computed(() => dashboardStore.mfPortfolio || { current: 0, invested: 0, pl: 0, plPercent: 0, xirr: 0, dayChange: 0, dayChangePercent: 0, loading: true })
const netWorthTrend = computed(() => dashboardStore.netWorthTrend || [])
const netWorthLabels = computed(() => dashboardStore.netWorthLabels || [])
const sixMonthSpendingTrend = computed(() => dashboardStore.sixMonthSpendingTrend || [])
const sixMonthInvestmentTrend = computed(() => dashboardStore.sixMonthInvestmentTrend || [])
const sixMonthLabels = computed(() => dashboardStore.sixMonthLabels || [])
const budgetInsights = computed(() => dashboardStore.budgetInsights)
const loading = computed(() => dashboardStore.loading)

const categories = computed(() => financeStore.categories)
const recurringTransactions = ref<any[]>([])

const userName = computed(() => {
  const full = auth.user?.full_name || auth.user?.email || 'User'
  return full.split('@')[0].split(' ')[0]
})

const netWorth = computed(() => {
  if (metrics.value?.breakdown?.net_worth !== undefined) {
    return Number(metrics.value.breakdown.net_worth)
  }
  const liquid = (metrics.value?.breakdown?.bank_balance || 0) + (metrics.value?.breakdown?.cash_balance || 0)
  const investment = (metrics.value?.breakdown?.investment_value || 0)
  const debt = (metrics.value?.breakdown?.total_debt || 0)
  return liquid + investment - debt
})

const netWorthChange = computed(() => {
  if (netWorthTrend.value.length < 2) return 0
  const current = netWorthTrend.value[netWorthTrend.value.length - 1]
  const previous = netWorthTrend.value[netWorthTrend.value.length - 2]
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
})

const formattedInsights = computed(() => {
  if (!budgetInsights.value) return []
  if (typeof budgetInsights.value === 'string') {
    return budgetInsights.value.split('\n').filter((l: string) => l.trim()).map((l: string, i: number) => {
      const clean = l.replace(/^[-*•🚨💸🛡️💡⚠️📊\s]+/, '')
      return { type: i, title: clean.split(':')[0] || 'Insight', content: clean.includes(':') ? clean.split(':')[1] : clean }
    }).slice(0, 3)
  }
  if (Array.isArray(budgetInsights.value)) return budgetInsights.value.slice(0, 3)
  return []
})

const isInsightsCached = computed(() => {
  if (Array.isArray(budgetInsights.value)) {
    return budgetInsights.value.some((i: any) => i.is_cached)
  }
  return false
})

const refreshingInsights = ref(false)
async function forceRefreshInsights() {
  refreshingInsights.value = true
  await dashboardStore.fetchBudgetInsights(true)
  refreshingInsights.value = false
}

const upcomingBills = computed(() => {
  const now = new Date()
  const nextMonth = new Date()
  nextMonth.setMonth(now.getMonth() + 1)

  return [...recurringTransactions.value]
    .filter(t => {
      if (!t.is_active) return false
      const rawDate = t.next_run_date || t.next_date
      if (!rawDate) return true
      const nextDate = new Date(rawDate)
      return isNaN(nextDate.getTime()) || (nextDate >= now && nextDate <= nextMonth)
    })
    .sort((a, b) => {
      const dA = a.next_run_date || a.next_date ? new Date(a.next_run_date || a.next_date).getTime() : 0
      const dB = b.next_run_date || b.next_date ? new Date(b.next_run_date || b.next_date).getTime() : 0
      return dA - dB
    })
    .slice(0, 4)
})

const greetingIcon = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return Sunrise
  if (hour < 18) return Sun
  return Moon
})

const spendingChange = computed(() => {
  if (!metrics.value?.last_month_spending || metrics.value.last_month_spending === 0) return 0
  const current = metrics.value.monthly_spending || 0
  const last = metrics.value.last_month_spending
  return ((current - last) / last) * 100
})

const investmentChange = computed(() => {
  if (!metrics.value?.last_month_investment || metrics.value.last_month_investment === 0) return 0
  const current = metrics.value.monthly_investment || 0
  const last = metrics.value.last_month_investment
  return ((current - last) / last) * 100
})

// --- Actions ---
async function fetchAllData() {
  dashboardStore.fetchDashboardData()
  financeApi.getRecurringTransactions()
    .then(res => { recurringTransactions.value = res.data })
}

async function fetchMetadata() {
  const userId = auth.selectedMemberId || undefined
  await Promise.all([
    financeStore.fetchCategories(),
    budgetStore.fetchBudgets(new Date().getFullYear(), new Date().getMonth() + 1, userId),
    financeStore.fetchAccounts(),
    expenseGroupStore.fetchGroups()
  ])
}

onMounted(async () => {
  await fetchMetadata()
  fetchAllData()
})

watch(() => auth.selectedMemberId, async () => {
  await fetchMetadata()
  fetchAllData()
})
</script>
