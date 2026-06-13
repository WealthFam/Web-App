<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi } from '@/api/client'
import { useRouter } from 'vue-router'
import { useTransactionHelpers } from '@/composables/useTransactionHelpers'
import { useDashboardHelpers } from '@/composables/useDashboardHelpers'
import { useAuthStore } from '@/stores/auth'
import { useCurrency } from '@/composables/useCurrency'
import Sparkline from '@/components/Sparkline.vue'
import WealthCompass from '@/components/dashboard/WealthCompass.vue'
import ActivityPulse from '@/components/dashboard/ActivityPulse.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useBudgetStore } from '@/stores/finance/budgets'
import { useExpenseGroupStore } from '@/stores/expenseGroups'
import { useFinanceStore } from '@/stores/finance'
import {
  Activity, Landmark, Wallet, PieChart, Sparkles, 
  CalendarClock, CreditCard, TrendingUp, TrendingDown, 
  RefreshCw, Zap, ArrowRight
} from 'lucide-vue-next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const router = useRouter()
const auth = useAuthStore()
const dashboardStore = useDashboardStore()
const financeStore = useFinanceStore()
const budgetStore = useBudgetStore()
const expenseGroupStore = useExpenseGroupStore()
const { formatAmount } = useCurrency()

// State & Computed
const metrics = computed(() => dashboardStore.metrics)
const mfPortfolio = computed(() => dashboardStore.mfPortfolio || { current: 0, invested: 0, pl: 0, plPercent: 0, xirr: 0, dayChange: 0, dayChangePercent: 0, loading: true })
const netWorthTrend = computed(() => dashboardStore.netWorthTrend || [])
const netWorthLabels = computed(() => dashboardStore.netWorthLabels || [])
const sixMonthSpendingTrend = computed(() => dashboardStore.sixMonthSpendingTrend || [])
const sixMonthInvestmentTrend = computed(() => dashboardStore.sixMonthInvestmentTrend || [])
const sixMonthLabels = computed(() => dashboardStore.sixMonthLabels || [])
const projectedBudgetTrend = computed(() => dashboardStore.projectedBudgetTrend || [])
const projectedBudgetLabels = computed(() => dashboardStore.projectedBudgetLabels || [])
const aiInsights = computed(() => dashboardStore.aiInsights)
const loading = computed(() => dashboardStore.loading)

const accounts = computed(() => financeStore.accounts)
const categories = computed(() => financeStore.categories)
const expenseGroups = computed(() => expenseGroupStore.groups)
const recurringTransactions = ref<any[]>([])

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
    if (!aiInsights.value) return []
    if (typeof aiInsights.value === 'string') {
        return aiInsights.value.split('\n').filter((l: string) => l.trim()).map((l: string) => {
            const clean = l.replace(/^[-*•]\s+/, '')
            return { icon: '✨', title: 'Observation', content: clean }
        }).slice(0, 3)
    }
    if (Array.isArray(aiInsights.value)) return aiInsights.value.slice(0, 3)
    return []
})

const isAiCached = computed(() => {
    if (Array.isArray(aiInsights.value)) {
        return aiInsights.value.some((i: any) => i.is_cached)
    }
    return false
})

const refreshingAi = ref(false)
async function forceRefreshAi() {
    refreshingAi.value = true
    await dashboardStore.fetchAiInsights(true)
    refreshingAi.value = false
}

const creditSummary = computed(() => {
    const cards = metrics.value?.credit_intelligence || []
    if (cards.length === 0) return { utilization: 0, total_balance: 0, total_limit: 0 }
    const total_balance = cards.reduce((acc: number, c: any) => acc + Number(c.statement_balance || 0), 0)
    const total_limit = cards.reduce((acc: number, c: any) => acc + Number(c.credit_limit || 0), 0)
    const utilization = total_limit > 0 ? (total_balance / total_limit) * 100 : 0
    return { utilization, total_balance, total_limit }
})

const sortedCredit = computed(() => {
    return [...(metrics.value?.credit_intelligence || [])].sort((a, b) => (a.days_until_due || 999) - (b.days_until_due || 999))
})

const upcomingBills = computed(() => {
    const now = new Date()
    const nextMonth = new Date()
    nextMonth.setMonth(now.getMonth() + 1)
    return [...recurringTransactions.value]
        .filter(t => {
            if (!t.is_active || !t.next_run_date) return false
            const nextDate = new Date(t.next_run_date)
            return nextDate >= now && nextDate <= nextMonth
        })
        .sort((a, b) => new Date(a.next_run_date).getTime() - new Date(b.next_run_date).getTime())
        .slice(0, 4)
})

const { formatDate, getCategoryDisplay } = useTransactionHelpers(accounts, categories, expenseGroups)
const { getGreeting, getBankBrand } = useDashboardHelpers()

function getCategoryDetails(name: string) {
    const display = getCategoryDisplay(name)
    return { icon: display.icon, color: display.color }
}

const greetingEmoji = computed(() => {
    const hour = new Date().getHours()
    if (hour < 12) return '🌅'
    if (hour < 18) return '☀️'
    return '🌙'
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

<template>
  <MainLayout>
    <div class="flex-1 space-y-6">
      <!-- Header section -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-3xl">{{ greetingEmoji }}</span>
            <h1 class="text-3xl font-bold tracking-tight">
              {{ getGreeting() }}, {{ (auth.user?.full_name || auth.user?.email || 'User')?.split(' ')[0] }}
            </h1>
          </div>
          <p class="text-muted-foreground">
            Your family wealth at a glance.
          </p>
        </div>
        <Button @click="fetchAllData()" :disabled="loading" class="gap-2">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Sync
        </Button>
      </div>

      <div v-if="loading && !metrics" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div v-for="i in 4" :key="`skel-${i}`" class="h-32 rounded-xl bg-muted animate-pulse"></div>
        <div class="h-[200px] col-span-full rounded-xl bg-muted animate-pulse"></div>
      </div>

      <template v-else>
        <!-- TOP ROW: High Impact Metrics -->
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <!-- Total Net Worth -->
          <Card class="premium-card cursor-pointer" @click="router.push('/accounts')">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Landmark class="h-5 w-5 text-primary" />
              </div>
              <div class="h-10 w-[100px] opacity-70" v-if="netWorthTrend.length > 1">
                 <Sparkline :data="netWorthTrend" :labels="netWorthLabels" color="#6366f1" :height="40" :width="100" fill />
              </div>
            </CardHeader>
            <CardContent>
              <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Net Worth</div>
              <div class="text-2xl font-bold text-primary">{{ formatAmount(netWorth) }}</div>
              <div class="flex items-center text-xs font-medium mt-2" :class="netWorthChange >= 0 ? 'text-emerald-500' : 'text-red-500'">
                <TrendingUp v-if="netWorthChange >= 0" class="h-3 w-3 mr-1" />
                <TrendingDown v-else class="h-3 w-3 mr-1" />
                {{ Number(Math.abs(netWorthChange || 0)).toFixed(1) }}% vs last month
              </div>
            </CardContent>
          </Card>

          <!-- Expenses -->
          <Card class="premium-card cursor-pointer" @click="router.push('/transactions')">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <div class="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Wallet class="h-5 w-5 text-red-500" />
              </div>
              <div class="h-10 w-[100px] opacity-70" v-if="sixMonthSpendingTrend.length > 1">
                 <Sparkline :data="sixMonthSpendingTrend" :labels="sixMonthLabels" color="#ef4444" :height="40" :width="100" fill />
              </div>
            </CardHeader>
            <CardContent>
              <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Expenses</div>
              <div class="text-2xl font-bold text-red-500">{{ formatAmount(metrics?.monthly_spending || 0) }}</div>
              <div class="flex items-center text-xs font-medium mt-2" :class="spendingChange <= 0 ? 'text-emerald-500' : 'text-red-500'">
                <TrendingDown v-if="spendingChange <= 0" class="h-3 w-3 mr-1" />
                <TrendingUp v-else class="h-3 w-3 mr-1" />
                {{ Number(Math.abs(spendingChange || 0)).toFixed(1) }}% vs last month
              </div>
            </CardContent>
          </Card>

          <!-- Monthly Investment -->
          <Card class="premium-card cursor-pointer" @click="router.push('/transactions')">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <div class="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Zap class="h-5 w-5 text-emerald-500" />
              </div>
              <div class="h-10 w-[100px] opacity-70" v-if="sixMonthInvestmentTrend.length > 0">
                 <Sparkline :data="sixMonthInvestmentTrend" :labels="sixMonthLabels" color="#10b981" :height="40" :width="100" fill />
              </div>
              <div v-else class="text-right">
                 <div class="text-[10px] uppercase font-bold text-muted-foreground">Savings Rate</div>
                 <div class="text-sm font-bold text-emerald-500">{{ (metrics?.savings_rate || 0).toFixed(1) }}%</div>
              </div>
            </CardHeader>
            <CardContent>
              <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Monthly Investment</div>
              <div class="text-2xl font-bold text-emerald-500">{{ formatAmount(metrics?.monthly_investment || 0) }}</div>
              <div class="flex items-center text-xs font-medium mt-2" :class="investmentChange >= 0 ? 'text-emerald-500' : 'text-red-500'">
                <TrendingUp v-if="investmentChange >= 0" class="h-3 w-3 mr-1" />
                <TrendingDown v-else class="h-3 w-3 mr-1" />
                {{ Number(Math.abs(investmentChange || 0)).toFixed(1) }}% vs last month
              </div>
            </CardContent>
          </Card>

          <!-- Portfolio Value -->
          <Card class="premium-card cursor-pointer" @click="router.push('/mutual-funds')">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <div class="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Sparkles class="h-5 w-5 text-emerald-500" />
              </div>
              <div class="h-10 w-[100px] opacity-70" v-if="netWorthTrend.length > 1">
                 <Sparkline :data="netWorthTrend" :labels="netWorthLabels" color="#10b981" :height="40" :width="100" fill />
              </div>
              <div v-else class="text-right">
                 <div class="text-[10px] uppercase font-bold text-muted-foreground">Overall XIRR</div>
                 <div class="text-sm font-bold text-emerald-500">{{ Number(mfPortfolio.xirr || 0).toFixed(1) }}%</div>
              </div>
            </CardHeader>
            <CardContent>
              <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Portfolio Value</div>
              <div class="text-2xl font-bold text-emerald-500">{{ formatAmount(mfPortfolio.current) }}</div>
              <div class="flex items-center text-xs font-medium mt-2 text-emerald-500">
                <TrendingUp class="h-3 w-3 mr-1" />
                {{ formatAmount(mfPortfolio.pl) }} total gains
              </div>
            </CardContent>
          </Card>

          <!-- Remaining Budget -->
          <Card class="premium-card cursor-pointer" @click="router.push('/budgets')">
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <div class="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <PieChart class="h-5 w-5 text-amber-500" />
              </div>
              <div class="h-10 w-[100px] opacity-70" v-if="projectedBudgetTrend.length > 1">
                 <Sparkline :data="projectedBudgetTrend" :labels="projectedBudgetLabels" color="#f59e0b" :height="40" :width="100" fill />
              </div>
            </CardHeader>
            <CardContent>
              <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Remaining Budget</div>
              <div class="text-2xl font-bold text-amber-500">
                {{ formatAmount((metrics?.budget_health?.limit || 0) - (metrics?.budget_health?.spent || 0)) }}
              </div>
              <div class="flex items-center text-xs font-medium mt-2" :class="metrics?.budget_health?.percentage <= 90 ? 'text-emerald-500' : 'text-red-500'">
                <PieChart class="h-3 w-3 mr-1" />
                {{ Number(metrics?.budget_health?.percentage || 0).toFixed(0) }}% budget utilized
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- MIDDLE ROW: Wealth Compass & AI Intelligence -->
        <div class="grid gap-4 md:grid-cols-3">
          <div class="col-span-2">
            <!-- WealthCompass component currently uses v-card internally, will need refactoring later, 
                 but for now we place it here -->
            <WealthCompass :metrics="metrics" :portfolio="mfPortfolio" class="h-full" />
          </div>

          <Card class="premium-card flex flex-col relative">
            <CardHeader class="pb-2">
              <div class="flex items-center justify-between">
                <CardTitle class="flex items-center gap-2 text-lg">
                  <Zap class="h-5 w-5 text-primary" />
                  AI Intelligence
                </CardTitle>
                <div class="flex items-center gap-2">
                  <Badge v-if="isAiCached" variant="secondary" class="text-[10px]">Cached</Badge>
                  <Button variant="ghost" size="icon" class="h-8 w-8" @click="forceRefreshAi" :disabled="refreshingAi">
                    <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': refreshingAi }" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent class="flex-1 flex flex-col">
              <div v-if="aiInsights" class="space-y-3">
                <div v-for="(insight, idx) in formattedInsights" :key="idx" class="rounded-lg border bg-muted/50 p-3">
                  <div class="flex items-start gap-3">
                    <span class="text-lg leading-none">{{ insight.icon }}</span>
                    <div class="grid gap-1">
                      <div class="text-sm font-semibold">{{ insight.title }}</div>
                      <div class="text-xs text-muted-foreground">{{ insight.content }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="flex-1 flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p class="text-sm font-medium">Analyzing your financial DNA...</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- ROW 3: Family Pulse & Activity -->
        <div class="grid gap-4 md:grid-cols-3">
          <div class="col-span-1">
             <ActivityPulse class="h-full" />
          </div>
          <Card class="premium-card col-span-2">
            <CardHeader class="flex flex-row items-center justify-between">
              <CardTitle class="flex items-center gap-2 text-lg">
                <Activity class="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <Button variant="link" class="px-0" @click="router.push('/transactions')">See More</Button>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div v-for="txn in (metrics?.recent_transactions || []).slice(0, 5)" :key="txn.id" class="flex items-center gap-4 rounded-xl border p-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 border shadow-sm">
                    <span class="text-lg">{{ txn.category_icon || getCategoryDetails(txn.category).icon }}</span>
                  </div>
                  <div class="flex-1 overflow-hidden">
                    <div class="text-sm font-semibold truncate">{{ txn.description }}</div>
                    <div class="text-xs text-muted-foreground">{{ formatDate(txn.date).day }} • {{ txn.account_owner_name || 'Personal' }}</div>
                  </div>
                  <div class="text-sm font-bold whitespace-nowrap" :class="txn.amount > 0 ? 'text-emerald-500' : ''">
                    {{ txn.amount > 0 ? '+' : '' }}{{ formatAmount(Math.abs(txn.amount)) }}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- ROW 4: Bills & Credit Outlook -->
        <div class="grid gap-4 md:grid-cols-12">
          <Card class="premium-card col-span-12 md:col-span-5">
            <CardHeader class="flex flex-row items-center justify-between">
              <CardTitle class="flex items-center gap-2 text-lg">
                <CalendarClock class="h-5 w-5 text-primary" />
                Upcoming Bills
              </CardTitle>
              <Button variant="link" class="px-0 gap-1" @click="router.push('/insights?tab=1')">
                Manage <ArrowRight class="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <div v-if="upcomingBills.length > 0" class="space-y-3">
                <div v-for="bill in upcomingBills" :key="bill.id" class="flex items-center gap-4 rounded-xl border bg-muted/20 p-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted border">
                    <span class="text-lg">{{ getCategoryDetails(bill.category).icon }}</span>
                  </div>
                  <div class="flex-1 overflow-hidden">
                    <div class="text-sm font-semibold truncate">{{ bill.description }}</div>
                    <div class="text-xs font-bold text-red-500">Due {{ formatDate(bill.next_date).day }}</div>
                  </div>
                  <div class="text-sm font-bold whitespace-nowrap">{{ formatAmount(bill.amount) }}</div>
                </div>
              </div>
              <div v-else class="py-10 text-center text-muted-foreground">
                <div class="text-3xl mb-2">📅</div>
                <p class="text-sm font-semibold">No bills due in the next 30 days. You're clear!</p>
              </div>
            </CardContent>
          </Card>

          <Card class="premium-card col-span-12 md:col-span-7">
            <CardHeader class="flex flex-row items-center justify-between">
              <CardTitle class="flex items-center gap-2 text-lg">
                <CreditCard class="h-5 w-5 text-primary" />
                Credit Outlook
              </CardTitle>
              <div class="text-right">
                <div class="text-[10px] font-bold text-muted-foreground uppercase">Utilization</div>
                <div class="text-lg font-bold text-primary">{{ Number(creditSummary.utilization || 0).toFixed(0) }}%</div>
              </div>
            </CardHeader>
            <CardContent>
              <div class="grid gap-4 sm:grid-cols-2">
                <div v-for="card in sortedCredit.slice(0, 4)" :key="card.id" class="rounded-xl border bg-card p-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2 overflow-hidden">
                      <div class="h-5 w-8 rounded bg-gradient-to-tr shadow-sm border border-white/20" :style="{ background: getBankBrand(card.name).gradient }"></div>
                      <div class="overflow-hidden">
                        <div class="text-xs font-bold truncate">{{ card.name }}</div>
                        <div class="text-[10px] font-semibold" :class="card.days_until_due <= 5 ? 'text-red-500' : 'text-muted-foreground'">
                          Due in {{ card.days_until_due }}d
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-bold">{{ formatAmount(card.statement_balance) }}</div>
                      <div class="text-[10px] font-bold text-primary">{{ Number(card.utilization || 0).toFixed(0) }}% Used</div>
                    </div>
                  </div>

                  <div class="flex justify-between py-2 border-t border-b border-muted my-2">
                    <div class="text-center">
                      <div class="text-[10px] font-semibold text-muted-foreground">Current</div>
                      <div class="text-[10px] font-bold text-red-500">{{ formatAmount(card.unbilled_spend) }}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[10px] font-semibold text-muted-foreground">Last</div>
                      <div class="text-[10px] font-bold text-muted-foreground">{{ card.last_cycle_spend > 0 ? formatAmount(card.last_cycle_spend) : '0' }}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[10px] font-semibold text-muted-foreground">Paid</div>
                      <div class="text-[10px] font-bold text-emerald-500">{{ formatAmount(card.current_cycle_payments) }}</div>
                    </div>
                  </div>

                  <Progress :model-value="Math.max(0, card.utilization)" class="h-1.5" :class="card.utilization > 75 ? 'bg-red-500/20' : ''">
                    <div class="h-full w-full flex-1 transition-all" :class="card.utilization > 75 ? 'bg-red-500' : 'bg-primary'" :style="`transform: translateX(-${100 - (card.utilization || 0)}%);`" />
                  </Progress>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </template>
    </div>
  </MainLayout>
</template>
