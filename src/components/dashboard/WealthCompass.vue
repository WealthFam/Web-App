<template>
  <WfCard variant="elevated" padding="md" radius="lg" class="w-full h-full flex flex-col justify-between">
    <div class="h-full flex flex-col">
      <!-- HEADER -->
      <div class="flex items-center justify-between mb-3 pb-2.5 border-b border-wf-border-subtle shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary">
            <Compass class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <h3 class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Wealth Compass</h3>
              <button
                type="button"
                class="p-0.5 text-wf-text-muted hover:text-wf-primary transition-colors"
                @click="showInfo = true"
                title="Understanding Wealth Compass"
              >
                <Info class="w-3.5 h-3.5" />
              </button>
            </div>
            <p class="text-[11px] text-wf-text-muted">4-vector financial health index</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
            :class="compositeScore >= 70 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'"
          >
            Index: {{ compositeScore }}%
          </span>
        </div>
      </div>

      <!-- 2x2 COCKPIT GAUGES GRID -->
      <div class="grid grid-cols-2 gap-3 flex-1 items-stretch pt-0.5">
        <!-- 1. Savings Rate -->
        <div class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle hover:border-emerald-400/40 transition-colors flex items-center gap-3">
          <div class="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-slate-100 dark:text-slate-800" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="text-emerald-500 transition-all duration-700 ease-out" stroke-dasharray="100" :stroke-dashoffset="100 - savingsRate" stroke-width="3.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold tabular-nums text-wf-text-primary">{{ savingsRate }}%</span>
          </div>
          <div class="min-w-0 flex-1">
            <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Savings Rate</span>
            <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate mt-0.5">
              {{ formatAmount(totalSavings) }}
            </div>
            <span class="text-[9px] text-wf-text-muted truncate block">Retained / Mo</span>
          </div>
        </div>

        <!-- 2. Portfolio Performance -->
        <div class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle hover:border-indigo-400/40 transition-colors flex items-center gap-3">
          <div class="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-slate-100 dark:text-slate-800" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="text-indigo-500 transition-all duration-700 ease-out" stroke-dasharray="100" :stroke-dashoffset="100 - minMax(investmentGrowth, 0, 100)" stroke-width="3.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold tabular-nums text-wf-text-primary">{{ investmentGrowth }}%</span>
          </div>
          <div class="min-w-0 flex-1">
            <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Portfolio XIRR</span>
            <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums truncate mt-0.5">
              {{ formatAmount(portfolioValue) }}
            </div>
            <span class="text-[9px] text-wf-text-muted truncate block">Active Holdings</span>
          </div>
        </div>

        <!-- 3. Credit Health -->
        <div class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle hover:border-amber-400/40 transition-colors flex items-center gap-3">
          <div class="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-slate-100 dark:text-slate-800" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="text-amber-500 transition-all duration-700 ease-out" stroke-dasharray="100" :stroke-dashoffset="creditUtilization" stroke-width="3.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold tabular-nums text-wf-text-primary">{{ (100 - creditUtilization).toFixed(0) }}%</span>
          </div>
          <div class="min-w-0 flex-1">
            <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Credit Health</span>
            <div class="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums truncate mt-0.5">
              {{ formatAmount(creditDebt) }}
            </div>
            <span class="text-[9px] text-wf-text-muted truncate block">Statement Debt</span>
          </div>
        </div>

        <!-- 4. Budgeting Discipline -->
        <div class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle hover:border-sky-400/40 transition-colors flex items-center gap-3">
          <div class="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-slate-100 dark:text-slate-800" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="text-sky-500 transition-all duration-700 ease-out" stroke-dasharray="100" :stroke-dashoffset="100 - budgetEfficiency" stroke-width="3.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold tabular-nums text-wf-text-primary">{{ budgetEfficiency }}%</span>
          </div>
          <div class="min-w-0 flex-1">
            <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Discipline</span>
            <div class="text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums truncate mt-0.5">
              {{ formatAmount(totalSpent) }}
            </div>
            <span class="text-[9px] text-wf-text-muted truncate block">Month Consumption</span>
          </div>
        </div>
      </div>

      <!-- FOOTER NOTE -->
      <div class="pt-2.5 border-t border-wf-border-subtle mt-3 flex items-center justify-between text-[10px] text-wf-text-muted shrink-0">
        <span>Evaluated across 4 wealth vectors</span>
        <button type="button" @click="showInfo = true" class="font-bold text-wf-primary hover:underline">
          View Guide
        </button>
      </div>
    </div>

    <!-- Info Modal -->
    <WfModal v-model="showInfo" title="Understanding Wealth Compass" max-width="md">
      <div class="space-y-3 text-xs text-wf-text-secondary">
        <p>Your Wealth Compass correlates your financial habits into four actionable vectors:</p>
        <div class="space-y-2 pt-1">
          <div class="flex items-start gap-2.5 p-2 rounded-wf-md bg-wf-surface-variant">
            <TrendingUp class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span class="font-bold text-wf-text-primary">Savings Rate: </span>
              <span>Percentage of net income retained after consumption.</span>
            </div>
          </div>
          <div class="flex items-start gap-2.5 p-2 rounded-wf-md bg-wf-surface-variant">
            <BarChart3 class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span class="font-bold text-wf-text-primary">Portfolio Performance: </span>
              <span>Internal Rate of Return (XIRR) across investments.</span>
            </div>
          </div>
          <div class="flex items-start gap-2.5 p-2 rounded-wf-md bg-wf-surface-variant">
            <ShieldCheck class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span class="font-bold text-wf-text-primary">Credit Health: </span>
              <span>Credit headroom and utilization metrics.</span>
            </div>
          </div>
          <div class="flex items-start gap-2.5 p-2 rounded-wf-md bg-wf-surface-variant">
            <Target class="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <div>
              <span class="font-bold text-wf-text-primary">Budgeting Discipline: </span>
              <span>Adherence to allocated limits without overruns.</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <WfButton variant="primary" size="sm" @click="showInfo = false">Understood</WfButton>
      </template>
    </WfModal>
  </WfCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Compass, Info, TrendingUp, BarChart3, ShieldCheck, Target } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'

const props = defineProps<{
  metrics: any
  portfolio: any
}>()

const { formatAmount } = useCurrency()
const showInfo = ref(false)

const totalSavings = computed(() => {
  const spending = props.metrics?.monthly_spending || 0
  const income = props.metrics?.total_income || 0
  return Math.max(0, income - spending)
})

const savingsRate = computed(() => {
  return Math.max(0, Math.round(props.metrics?.savings_rate || 0))
})

const investmentGrowth = computed(() => {
  return Math.round(props.portfolio?.xirr || 0)
})

const portfolioValue = computed(() => {
  return props.portfolio?.current || 0
})

const creditUtilization = computed(() => {
  const limit = props.metrics?.breakdown?.total_credit_limit || 0
  const debt = props.metrics?.breakdown?.credit_debt || 0
  if (limit <= 0) return 0
  return (debt / limit) * 100
})

const creditDebt = computed(() => {
  return props.metrics?.breakdown?.credit_debt || 0
})

const budgetEfficiency = computed(() => {
  const percentage = props.metrics?.budget_health?.percentage || 0
  if (percentage === 0) return 100
  return Math.max(0, 100 - Math.round(percentage))
})

const totalSpent = computed(() => {
  return props.metrics?.monthly_spending || 0
})

const compositeScore = computed(() => {
  const s = savingsRate.value
  const p = minMax(investmentGrowth.value, 0, 100)
  const c = Math.max(0, 100 - Math.round(creditUtilization.value))
  const b = budgetEfficiency.value
  return Math.round((s + p + c + b) / 4)
})

function minMax(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}
</script>
