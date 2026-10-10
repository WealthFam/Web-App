<script setup lang="ts">
import { computed } from 'vue'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  PieChart,
  Target
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
  overallStats: {
    current: number
    target: number
    progress: number
    dayChange: number
    dayChangePct: number
    remaining: number
  }
  assetDistribution: Array<{
    label: string
    value: number
    color: string
    icon: any
  }>
}>()

const { formatAmount } = useCurrency()

const progressClamped = computed(() => {
  return Math.min(100, Math.max(0, props.overallStats.progress))
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Card 1: Current Progress -->
    <WfCard variant="flat" padding="md" radius="lg" class="relative overflow-hidden group hover:border-wf-primary/40 transition-colors shadow-2xs">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50">
            <Target class="w-3.5 h-3.5" />
          </div>
          <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Current Progress
          </span>
        </div>
        <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
          {{ Math.round(overallStats.progress) }}% TOTAL
        </span>
      </div>

      <div class="space-y-1 mb-4">
        <div class="text-xl sm:text-2xl font-black text-wf-text-primary tracking-tight font-mono">
          {{ formatAmount(overallStats.current) }}
        </div>
        <div class="flex items-center gap-2">
          <div
            v-if="overallStats.dayChange !== 0"
            class="flex items-center text-[11px] font-bold"
            :class="overallStats.dayChange >= 0 ? 'text-emerald-500' : 'text-rose-500'"
          >
            <TrendingUp v-if="overallStats.dayChange >= 0" class="w-3 h-3 mr-0.5" />
            <TrendingDown v-else class="w-3 h-3 mr-0.5" />
            {{ overallStats.dayChange >= 0 ? '+' : '' }}{{ formatAmount(overallStats.dayChange) }}
            ({{ overallStats.dayChangePct.toFixed(2) }}%)
          </div>
          <span class="text-[10px] text-wf-text-muted font-semibold uppercase">
            Day movement
          </span>
        </div>
      </div>

      <!-- Progress Track -->
      <div class="w-full bg-wf-surface-variant rounded-wf-pill h-2 overflow-hidden">
        <div
          class="bg-wf-primary h-full rounded-wf-pill transition-all duration-500"
          :style="{ width: `${progressClamped}%` }"
        ></div>
      </div>
    </WfCard>

    <!-- Card 2: Wealth Gap -->
    <WfCard variant="flat" padding="md" radius="lg" class="relative overflow-hidden group hover:border-amber-500/40 transition-colors shadow-2xs">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-wf-md bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <ArrowUpRight class="w-3.5 h-3.5" />
          </div>
          <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Wealth Gap
          </span>
        </div>
        <span class="text-[10px] text-wf-text-muted font-semibold">
          Target: {{ formatAmount(overallStats.target) }}
        </span>
      </div>

      <div class="space-y-1 mb-4">
        <div class="text-xl sm:text-2xl font-black text-wf-text-primary tracking-tight font-mono">
          {{ formatAmount(overallStats.remaining) }}
        </div>
        <p class="text-[11px] text-wf-text-secondary font-medium">
          Remaining across all targets
        </p>
      </div>

      <!-- Segmented Milestone Indicators -->
      <div class="grid grid-cols-5 gap-1.5 h-2">
        <div
          v-for="i in 5"
          :key="i"
          class="rounded-wf-pill transition-colors duration-300"
          :class="i <= Math.ceil(overallStats.progress / 20) ? 'bg-amber-500' : 'bg-wf-surface-variant'"
        ></div>
      </div>
    </WfCard>

    <!-- Card 3: Asset Mix -->
    <WfCard variant="flat" padding="md" radius="lg" class="relative overflow-hidden group hover:border-wf-primary/40 transition-colors shadow-2xs">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-wf-md bg-wf-surface-variant text-wf-text-secondary flex items-center justify-center border border-wf-border-subtle">
            <PieChart class="w-3.5 h-3.5" />
          </div>
          <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Asset Mix
          </span>
        </div>
        <span class="text-[10px] text-wf-text-muted font-semibold">
          {{ assetDistribution.length }} Allocation Types
        </span>
      </div>

      <div v-if="assetDistribution.length === 0" class="flex items-center justify-center h-14 text-xs text-wf-text-muted">
        No linked assets found
      </div>

      <div v-else class="space-y-2 pt-0.5">
        <div
          v-for="asset in assetDistribution"
          :key="asset.label"
          class="flex items-center justify-between text-xs"
        >
          <div class="flex items-center gap-2">
            <component
              :is="asset.icon"
              class="w-3.5 h-3.5"
              :class="asset.color === 'primary' ? 'text-wf-primary' : (asset.color === 'success' ? 'text-emerald-500' : 'text-amber-500')"
            />
            <span class="text-wf-text-secondary font-semibold">{{ asset.label }}</span>
          </div>
          <span class="font-mono font-bold text-wf-text-primary">
            {{ formatAmount(asset.value) }}
          </span>
        </div>
      </div>
    </WfCard>
  </div>
</template>
