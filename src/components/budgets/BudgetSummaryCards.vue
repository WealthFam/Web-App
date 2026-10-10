<script setup lang="ts">
import { TrendingUp, TrendingDown, Wallet, Ban, Flame, ArrowRight } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'
import WfCard from '@/components/ui/WfCard.vue'

defineProps<{
  totalIncome: number
  totalSpent: number
  totalInvested: number
  activeTab: 'expense' | 'income' | 'investment'
  overallBudget: any
  alertGroups: any[]
}>()

const emit = defineEmits<{
  (e: 'edit', budget: any): void
  (e: 'open-details', category: string, budget: any): void
}>()

const { formatAmount } = useCurrency()
</script>

<template>
  <div class="space-y-6">
    <!-- Summary Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <!-- Income Card -->
      <WfCard v-if="activeTab !== 'investment'" class="p-4 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Income In</span>
          <div class="w-8 h-8 rounded-wf-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shadow-2xs">
            <TrendingUp class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2">
          <span class="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {{ formatAmount(totalIncome) }}
          </span>
          <p class="text-[10px] text-wf-text-muted mt-0.5">Total monthly inflows</p>
        </div>
      </WfCard>

      <!-- Outflow / Spending Card -->
      <WfCard class="p-4 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            {{ activeTab === 'investment' ? 'Total Invested' : 'Expenses' }}
          </span>
          <div
            class="w-8 h-8 rounded-wf-md flex items-center justify-center shadow-2xs border"
            :class="activeTab === 'investment' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-100 dark:border-amber-900/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-100 dark:border-rose-900/50'"
          >
            <TrendingDown class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2">
          <span
            class="text-xl font-bold tracking-tight"
            :class="activeTab === 'investment' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ formatAmount(activeTab === 'investment' ? totalInvested : totalSpent) }}
          </span>
          <p class="text-[10px] text-wf-text-muted mt-0.5">
            {{ activeTab === 'investment' ? 'Allocated investments' : 'Total monthly outflows' }}
          </p>
        </div>
      </WfCard>

      <!-- Net Balance / Savings Card -->
      <WfCard class="p-4 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            {{ activeTab === 'investment' ? 'Remaining Budget' : 'Net Savings' }}
          </span>
          <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
            <Wallet class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2">
          <span
            class="text-xl font-bold tracking-tight"
            :class="(totalIncome - totalSpent) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-wf-primary dark:text-indigo-400'"
          >
            {{ formatAmount(totalIncome - totalSpent) }}
          </span>
          <p class="text-[10px] text-wf-text-muted mt-0.5">
            {{ (totalIncome - totalSpent) >= 0 ? 'Surplus retained' : 'Deficit for month' }}
          </p>
        </div>
      </WfCard>

      <!-- Excluded Items Card (if any) or Savings Rate KPI -->
      <WfCard v-if="overallBudget?.total_excluded || overallBudget?.excluded_income" class="p-4 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Excluded Items</span>
          <div class="w-8 h-8 rounded-wf-md bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xs">
            <Ban class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2 space-y-1">
          <div v-if="overallBudget.total_excluded > 0" class="flex items-center justify-between text-xs">
            <span class="text-wf-text-secondary">Expenses</span>
            <span class="font-bold text-wf-text-primary">{{ formatAmount(overallBudget.total_excluded) }}</span>
          </div>
          <div v-if="overallBudget.excluded_income > 0" class="flex items-center justify-between text-xs">
            <span class="text-emerald-600">Income</span>
            <span class="font-bold text-emerald-600">+{{ formatAmount(overallBudget.excluded_income) }}</span>
          </div>
        </div>
      </WfCard>

      <WfCard v-else class="p-4 flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Savings Rate</span>
          <div class="w-8 h-8 rounded-wf-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shadow-2xs">
            <TrendingUp class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-2">
          <div class="flex items-baseline gap-1.5">
            <span
              class="text-xl font-bold tracking-tight"
              :class="totalIncome > 0 && ((totalIncome - totalSpent) / totalIncome) >= 0.2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-wf-primary'"
            >
              {{ totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalSpent) / totalIncome) * 100)) : 0 }}%
            </span>
            <span class="text-[10px] text-wf-text-muted">of income saved</span>
          </div>
          <p class="text-[10px] text-wf-text-muted mt-0.5">
            Burn: ~{{ formatAmount(Math.round(totalSpent / Math.max(1, new Date().getDate()))) }}/day
          </p>
        </div>
      </WfCard>
    </div>

    <!-- Budget Alerts Banner (when any category > 85%) -->
    <div v-if="alertGroups.length > 0" class="space-y-3">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-wf-sm bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center border border-amber-200 dark:border-amber-900/50">
          <Flame class="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div>
          <h3 class="text-xs font-bold text-wf-text-primary leading-none">Budget Alerts</h3>
          <p class="text-[10px] text-wf-text-muted mt-0.5 leading-none">Categories exceeding or nearing safety thresholds</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="group in alertGroups"
          :key="`alert-${group.parent.category}`"
          @click="emit('edit', group.parent)"
          class="p-3.5 rounded-wf-lg border transition-all duration-200 cursor-pointer hover:shadow-sm"
          :class="group.parent.percentage > 100 ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50' : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="w-8 h-8 rounded-wf-md flex items-center justify-center text-sm shrink-0 border"
                :class="group.parent.percentage > 100 ? 'bg-rose-100 dark:bg-rose-900/60 border-rose-300 dark:border-rose-700' : 'bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700'"
              >
                <span>{{ group.parent.icon || '🏷️' }}</span>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-wf-text-primary truncate">{{ group.parent.category }}</div>
                <div
                  class="text-[10px] font-bold mt-0.5"
                  :class="group.parent.percentage > 100 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'"
                >
                  {{ group.parent.percentage > 100 ? 'Overspent' : 'Near Limit' }} ({{ group.parent.percentage.toFixed(0) }}%)
                </div>
              </div>
            </div>

            <div class="text-right shrink-0 ml-2">
              <div class="text-xs font-bold text-wf-text-primary">
                {{ group.parent.remaining < 0 ? '-' : '' }}{{ formatAmount(Math.abs(group.parent.remaining)) }}
              </div>
              <div class="text-[9px] font-bold text-wf-text-muted uppercase">
                {{ group.parent.remaining < 0 ? 'OVERSPENT' : 'REMAINING' }}
              </div>
            </div>
          </div>

          <div class="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-end">
            <button
              type="button"
              @click.stop="emit('open-details', group.parent.category, group.parent)"
              class="text-[10px] font-bold text-wf-primary hover:underline flex items-center gap-1"
            >
              <span>View Analysis</span>
              <ArrowRight class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
