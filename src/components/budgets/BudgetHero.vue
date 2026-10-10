<script setup lang="ts">
import { computed } from 'vue'
import { Sparkles, Pencil, Plus, Flame } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
  overallBudget: any
}>()

const emit = defineEmits<{
  (e: 'edit', budget: any): void
  (e: 'set-limit'): void
}>()

const { formatAmount } = useCurrency()

/**
 * Spending Velocity Analysis logic encapsulated
 */
const spendingVelocity = computed(() => {
  const d = new Date()
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const dayOfMonth = d.getDate()
  const monthProgress = (dayOfMonth / daysInMonth) * 100

  if (!props.overallBudget || !props.overallBudget.amount_limit) {
    return { status: 'stable', diff: 0, monthProgress }
  }

  const diff = props.overallBudget.percentage - monthProgress
  let status = 'stable'
  if (diff > 15) status = 'aggressive'
  else if (diff > 5) status = 'warning'

  return { status, diff, monthProgress }
})
</script>

<template>
  <div v-if="overallBudget" class="relative rounded-wf-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white p-6 sm:p-8 shadow-wf-card overflow-hidden">
    <!-- Ambient Background Glow -->
    <div class="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="relative z-10 space-y-6">
      <!-- Top Row: Target Chip & Action Edit Button -->
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-3">
          <div class="inline-flex items-center px-2.5 py-0.5 rounded-wf-pill text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/15">
            Monthly Target
          </div>

          <!-- Spent vs Budget -->
          <div class="flex items-baseline gap-2.5 flex-wrap">
            <span class="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {{ formatAmount(overallBudget.spent) }}
            </span>
            <span class="text-xl sm:text-2xl text-slate-500 font-light">/</span>
            <span class="text-xl sm:text-2xl font-bold text-slate-400">
              {{ overallBudget.amount_limit ? formatAmount(overallBudget.amount_limit) : '∞' }}
            </span>
          </div>
        </div>

        <div>
          <button
            v-if="overallBudget.budget_id"
            type="button"
            @click="emit('edit', overallBudget)"
            class="p-2.5 rounded-wf-md bg-white/10 hover:bg-white/20 text-white transition-colors shadow-2xs border border-white/10"
            title="Edit Monthly Limit"
          >
            <Pencil class="w-4 h-4" />
          </button>
          <button
            v-else
            type="button"
            @click="emit('set-limit')"
            class="p-2.5 rounded-wf-md bg-wf-primary hover:bg-wf-primary-hover text-white transition-colors shadow-2xs"
            title="Set Monthly Limit"
          >
            <Plus class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Velocity Status Card -->
      <div v-if="overallBudget.amount_limit" class="p-3.5 rounded-wf-lg bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3.5">
        <div
          class="w-9 h-9 rounded-wf-md flex items-center justify-center shrink-0 shadow-xs"
          :class="spendingVelocity.status === 'aggressive' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : spendingVelocity.status === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'"
        >
          <Sparkles class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">
            Status Analysis
          </div>
          <div class="text-xs font-semibold text-slate-200">
            <template v-if="spendingVelocity.status === 'aggressive'">
              Spending is <strong class="text-rose-400">{{ spendingVelocity.diff.toFixed(0) }}% ahead</strong> of the monthly curve.
            </template>
            <template v-else-if="spendingVelocity.status === 'warning'">
              Slightly above pace. {{ formatAmount(overallBudget.remaining) }} left.
            </template>
            <template v-else-if="spendingVelocity.status === 'stable'">
              Under control. Spend-aligned with month progress.
            </template>
            <template v-else>
              Monthly activity snapshot.
            </template>
          </div>
        </div>
      </div>

      <!-- Progress Section -->
      <div v-if="overallBudget.amount_limit" class="space-y-3 pt-2">
        <div class="relative">
          <!-- Main Progress Bar -->
          <div class="h-3 w-full bg-slate-800 rounded-wf-pill overflow-hidden relative shadow-inner">
            <div
              class="h-full rounded-wf-pill transition-all duration-500"
              :class="overallBudget.percentage > 90 ? 'bg-gradient-to-r from-rose-600 to-rose-400' : overallBudget.percentage > 70 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'"
              :style="{ width: `${Math.max(0, Math.min(overallBudget.percentage, 100))}%` }"
            ></div>
          </div>

          <!-- Overspent Indicator -->
          <div
            v-if="overallBudget.percentage > 100"
            class="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/50 z-20"
          >
            <Flame class="w-3.5 h-3.5 text-white animate-pulse" />
          </div>

          <!-- Today Marker -->
          <div
            class="absolute -top-1.5 bottom-0 z-10 pointer-events-none flex flex-col items-center"
            :style="{ left: `${spendingVelocity.monthProgress}%` }"
          >
            <div class="w-0.5 h-6 bg-white shadow-md rounded-full"></div>
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Today</span>
          </div>
        </div>

        <!-- Footer Stats -->
        <div class="flex items-center justify-between text-xs font-bold pt-1">
          <div class="text-white">
            <span>{{ overallBudget.percentage?.toFixed(1) }}%</span>
            <span class="text-slate-400 font-normal ml-1">Utilized</span>
          </div>
          <div class="text-white">
            <span>{{ overallBudget.remaining < 0 ? '-' : '' }}{{ formatAmount(Math.abs(overallBudget.remaining)) }}</span>
            <span class="text-[10px] font-bold ml-1" :class="overallBudget.remaining < 0 ? 'text-rose-400' : 'text-emerald-400'">
              {{ overallBudget.remaining < 0 ? 'OVERSPENT' : 'REMAINING' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
