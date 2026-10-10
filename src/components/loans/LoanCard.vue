<script setup lang="ts">
import { computed } from 'vue'
import { Calendar, ChevronRight } from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
  loan: any
}>()

const emit = defineEmits<{
  (e: 'click', id: string): void
}>()

const { formatAmount } = useCurrency()

const loanTypeOptions: Record<string, string> = {
  HOME_LOAN: '🏠',
  PERSONAL_LOAN: '👤',
  CAR_LOAN: '🚗',
  EDUCATION_LOAN: '🎓',
  CREDIT_CARD: '💳',
  OTHER: '💰'
}

const loanIcon = computed(() => {
  return loanTypeOptions[props.loan.loan_type] || '💰'
})

const loanTypeLabel = computed(() => {
  return (props.loan.loan_type?.replace(/_/g, ' ') || 'LOAN').toUpperCase()
})

const progressPercentage = computed(() => {
  return Math.max(0, Math.min(100, Math.round(props.loan.progress_percentage || 0)))
})

const nextDueDateFormatted = computed(() => {
  if (!props.loan.next_emi_date) return 'N/A'
  return new Date(props.loan.next_emi_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
})
</script>

<template>
  <WfCard
    variant="flat"
    padding="none"
    radius="lg"
    class="relative flex flex-col justify-between overflow-hidden group hover:border-wf-border cursor-pointer transition-all duration-200 shadow-2xs"
    @click="emit('click', loan.id)"
  >
    <!-- Top Padding Section -->
    <div class="p-5 space-y-4">
      <!-- Header Row: Icon, Title & APR Badge -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-11 h-11 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-xl shrink-0 border border-wf-border-subtle shadow-2xs">
            <span>{{ loanIcon }}</span>
          </div>
          <div class="truncate">
            <h3 class="text-sm font-bold text-wf-text-primary truncate" :title="loan.name">
              {{ loan.name }}
            </h3>
            <span class="text-[10px] font-bold text-wf-text-muted tracking-wider">
              {{ loanTypeLabel }}
            </span>
          </div>
        </div>

        <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50 shrink-0 font-mono">
          {{ loan.interest_rate }}% APR
        </span>
      </div>

      <!-- Repayment Progress Bar -->
      <div class="space-y-1.5 pt-1">
        <div class="flex items-center justify-between text-[11px] font-bold">
          <span class="text-wf-text-secondary uppercase tracking-wider text-[10px]">
            Repaid
          </span>
          <span class="text-wf-primary font-mono">
            {{ progressPercentage }}%
          </span>
        </div>
        <div class="w-full bg-wf-surface-variant rounded-wf-pill h-2 overflow-hidden">
          <div
            class="bg-wf-primary h-full rounded-wf-pill transition-all duration-500"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
      </div>

      <!-- Metrics Row: Outstanding & EMI -->
      <div class="grid grid-cols-2 gap-2 pt-1 border-t border-wf-border-subtle">
        <div>
          <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">
            Outstanding
          </span>
          <div class="text-sm font-black text-wf-text-primary font-mono mt-0.5">
            {{ formatAmount(loan.outstanding_balance) }}
          </div>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">
            Monthly EMI
          </span>
          <div class="text-sm font-black text-wf-text-primary font-mono mt-0.5">
            {{ formatAmount(loan.emi_amount) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Bar: Next Due Date -->
    <div class="px-5 py-2.5 bg-wf-surface-variant/40 border-t border-wf-border-subtle flex items-center justify-between">
      <div class="flex items-center gap-1.5 text-[11px] font-medium text-wf-text-secondary">
        <Calendar class="w-3.5 h-3.5 text-wf-text-muted" />
        <span>Next Due: <strong class="text-wf-text-primary font-bold">{{ nextDueDateFormatted }}</strong></span>
      </div>
      <ChevronRight class="w-4 h-4 text-wf-text-muted group-hover:text-wf-primary transition-colors group-hover:translate-x-0.5 duration-150" />
    </div>
  </WfCard>
</template>
