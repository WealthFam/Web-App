<script setup lang="ts">
import { Landmark, Wallet, Layers } from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import { useCurrency } from '@/composables/useCurrency'

defineProps<{
  totalOutstanding: number
  totalMonthlyEmi: number
  activeCount: number
}>()

const { formatAmount } = useCurrency()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <!-- Total Outstanding -->
    <WfCard variant="flat" padding="md" radius="lg" class="relative overflow-hidden group hover:border-rose-500/40 transition-colors shadow-2xs">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Total Outstanding
        </span>
        <div class="w-7 h-7 rounded-wf-md bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
          <Landmark class="w-3.5 h-3.5" />
        </div>
      </div>
      <div class="text-xl sm:text-2xl font-black text-wf-text-primary tracking-tight font-mono">
        {{ formatAmount(totalOutstanding) }}
      </div>
      <p class="text-[11px] text-wf-text-muted mt-1 font-medium">
        Cumulative debt balance across all loans
      </p>
    </WfCard>

    <!-- Monthly Commitment -->
    <WfCard variant="flat" padding="md" radius="lg" class="relative overflow-hidden group hover:border-wf-primary/40 transition-colors shadow-2xs">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Monthly Commitment
        </span>
        <div class="w-7 h-7 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50">
          <Wallet class="w-3.5 h-3.5" />
        </div>
      </div>
      <div class="text-xl sm:text-2xl font-black text-wf-text-primary tracking-tight font-mono">
        {{ formatAmount(totalMonthlyEmi) }}
      </div>
      <p class="text-[11px] text-wf-text-muted mt-1 font-medium">
        Total monthly EMI obligations
      </p>
    </WfCard>

    <!-- Active Loans Count -->
    <WfCard variant="flat" padding="md" radius="lg" class="relative overflow-hidden group hover:border-emerald-500/40 transition-colors shadow-2xs">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Active Loans
        </span>
        <div class="w-7 h-7 rounded-wf-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
          <Layers class="w-3.5 h-3.5" />
        </div>
      </div>
      <div class="text-xl sm:text-2xl font-black text-wf-text-primary tracking-tight font-mono">
        {{ activeCount }}
      </div>
      <p class="text-[11px] text-wf-text-muted mt-1 font-medium">
        Active liability schedules
      </p>
    </WfCard>
  </div>
</template>
