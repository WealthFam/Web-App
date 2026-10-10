<template>
  <WfCard variant="elevated" padding="md" radius="lg" class="w-full flex flex-col justify-between">
    <div class="h-full flex flex-col">
      <!-- HEADER & CONTROLS -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-wf-border-subtle shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-wf-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-wf-error">
            <TrendingDown class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Expense & Cashflow Dynamics</h3>
            </div>
            <p class="text-[11px] text-wf-text-muted">6-month spending velocity & allocation breakdown</p>
          </div>
        </div>

        <!-- View Mode Switcher -->
        <div class="flex items-center gap-1 bg-wf-surface-variant p-0.5 rounded-wf-md border border-wf-border-subtle self-start sm:self-auto">
          <button
            type="button"
            class="px-2.5 py-1 text-[11px] font-bold rounded-wf-sm transition-all"
            :class="viewMode === 'trend' ? 'bg-wf-surface text-wf-primary shadow-2xs font-semibold' : 'text-wf-text-muted hover:text-wf-text-primary'"
            @click="viewMode = 'trend'"
          >
            6M Trajectory
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-[11px] font-bold rounded-wf-sm transition-all"
            :class="viewMode === 'bars' ? 'bg-wf-surface text-wf-primary shadow-2xs font-semibold' : 'text-wf-text-muted hover:text-wf-text-primary'"
            @click="viewMode = 'bars'"
          >
            Monthly Compare
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-[11px] font-bold rounded-wf-sm transition-all"
            :class="viewMode === 'mtd' ? 'bg-wf-surface text-wf-primary shadow-2xs font-semibold' : 'text-wf-text-muted hover:text-wf-text-primary'"
            @click="viewMode = 'mtd'"
          >
            MTD Pace
          </button>
        </div>
      </div>

      <!-- KEY STATS STRIP ("More Info") -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 shrink-0">
        <!-- 1. 6-Mo Average Spend -->
        <div class="p-2 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
          <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">6-Mo Monthly Avg</span>
          <div class="text-xs sm:text-sm font-bold text-wf-text-primary tabular-nums mt-0.5">
            {{ formatAmount(sixMonthAverage) }}
          </div>
        </div>

        <!-- 2. Daily Burn Rate -->
        <div class="p-2 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
          <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Daily Burn Rate</span>
          <div class="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            {{ formatAmount(dailyBurnRate) }} <span class="text-[10px] text-wf-text-muted font-normal">/day</span>
          </div>
        </div>

        <!-- 3. Peak Spend Month -->
        <div class="p-2 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
          <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Peak Month</span>
          <div class="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5 truncate">
            {{ peakMonth.month || 'N/A' }} <span class="text-[10px] text-wf-text-muted font-normal">({{ formatAmount(peakMonth.amount) }})</span>
          </div>
        </div>

        <!-- 4. Invest vs Expense Ratio -->
        <div class="p-2 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
          <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Invest / Spend Ratio</span>
          <div class="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {{ investRatio.toFixed(1) }}%
          </div>
        </div>
      </div>

      <!-- CHART AREA -->
      <div class="flex-1 min-h-[190px] relative w-full pt-1">
        <BaseChart
          v-if="chartData && chartData.labels && chartData.labels.length > 0"
          :type="chartType"
          :data="chartData"
          :options="chartOptions"
          :height="190"
        />
        <div v-else class="h-full flex items-center justify-center text-xs text-wf-text-muted">
          No historical expense records available for this period.
        </div>
      </div>

      <!-- FOOTER LEGEND / NOTE -->
      <div class="flex items-center justify-between pt-2 border-t border-wf-border-subtle mt-2 text-[10px] text-wf-text-muted shrink-0">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span class="font-medium text-wf-text-secondary">Expenses</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span class="font-medium text-wf-text-secondary">Investments</span>
          </div>
          <div v-if="viewMode === 'mtd'" class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block"></span>
            <span class="font-medium text-wf-text-secondary">Cumulative MTD</span>
          </div>
        </div>
        <span class="hidden sm:inline">Updated automatically with live transactions</span>
      </div>
    </div>
  </WfCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TrendingDown } from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import BaseChart from '@/components/BaseChart.vue'
import { useCurrency } from '@/composables/useCurrency'
import { useDashboardStore } from '@/stores/dashboard'

const dashboardStore = useDashboardStore()
const { formatAmount } = useCurrency()

type ViewMode = 'trend' | 'bars' | 'mtd'
const viewMode = ref<ViewMode>('trend')

const sixMonthSpending = computed(() => dashboardStore.sixMonthSpendingTrend || [])
const sixMonthInvestment = computed(() => dashboardStore.sixMonthInvestmentTrend || [])
const sixMonthLabels = computed(() => dashboardStore.sixMonthLabels || [])

const sixMonthAverage = computed(() => {
  const vals = sixMonthSpending.value.filter(v => v > 0)
  if (vals.length === 0) return dashboardStore.metrics?.monthly_spending || 0
  const sum = vals.reduce((a, b) => a + b, 0)
  return Math.round(sum / vals.length)
})

const dailyBurnRate = computed(() => {
  const currentSpend = dashboardStore.metrics?.monthly_spending || 0
  const today = new Date().getDate() || 1
  return Math.round(currentSpend / today)
})

const peakMonth = computed(() => {
  if (sixMonthSpending.value.length === 0) return { month: '', amount: 0 }
  let maxVal = 0
  let maxIdx = 0
  sixMonthSpending.value.forEach((v, idx) => {
    if (v > maxVal) {
      maxVal = v
      maxIdx = idx
    }
  })
  return {
    month: sixMonthLabels.value[maxIdx] || 'This Month',
    amount: maxVal
  }
})

const investRatio = computed(() => {
  const spend = dashboardStore.metrics?.monthly_spending || 0
  const invest = dashboardStore.metrics?.monthly_investment || 0
  if (spend + invest === 0) return 0
  return (invest / (spend + invest)) * 100
})

const chartType = computed(() => {
  if (viewMode.value === 'bars') return 'bar'
  return 'line'
})

const chartData = computed(() => {
  if (viewMode.value === 'mtd') {
    const labels = dashboardStore.spendingLabels.length > 0 ? dashboardStore.spendingLabels : ['Day 1', 'Today']
    const data = dashboardStore.spendingTrend.length > 0 ? dashboardStore.spendingTrend : [0, dashboardStore.metrics?.monthly_spending || 0]

    return {
      labels,
      datasets: [
        {
          label: 'Daily Spending',
          data,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5
        }
      ]
    }
  }

  if (viewMode.value === 'bars') {
    return {
      labels: sixMonthLabels.value,
      datasets: [
        {
          label: 'Expenses',
          data: sixMonthSpending.value,
          backgroundColor: '#f43f5e',
          borderRadius: 4
        },
        {
          label: 'Investments',
          data: sixMonthInvestment.value,
          backgroundColor: '#10b981',
          borderRadius: 4
        }
      ]
    }
  }

  // Default: 'trend' (6M Line Trajectory)
  return {
    labels: sixMonthLabels.value,
    datasets: [
      {
        label: 'Expenses',
        data: sixMonthSpending.value,
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 6
      },
      {
        label: 'Investments',
        data: sixMonthInvestment.value,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6
      }
    ]
  }
})

const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: 'bold' } }
      },
      y: {
        grid: { drawBorder: false },
        ticks: { font: { size: 10, weight: 'bold' } }
      }
    }
  }
})
</script>
