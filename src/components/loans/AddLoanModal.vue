<script setup lang="ts">
import { Check, Plus } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
  modelValue: boolean
  form: {
    name: string
    principal_amount: number
    interest_rate: number
    tenure_months: number
    start_date: string
    emi_date: number
    emi_amount: number
    loan_type: string
  }
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'submit'): void
  (e: 'close'): void
}>()

const { formatAmount } = useCurrency()

const loanTypeOptions = [
  { label: 'Home Loan', value: 'HOME_LOAN', icon: '🏠' },
  { label: 'Personal Loan', value: 'PERSONAL_LOAN', icon: '👤' },
  { label: 'Car Loan', value: 'CAR_LOAN', icon: '🚗' },
  { label: 'Education Loan', value: 'EDUCATION_LOAN', icon: '🎓' },
  { label: 'Credit Card', value: 'CREDIT_CARD', icon: '💳' },
  { label: 'Other', value: 'OTHER', icon: '💰' }
]

function calculateEmi() {
  const p = props.form.principal_amount
  const r = (props.form.interest_rate / 12) / 100
  const n = props.form.tenure_months

  if (p > 0 && r > 0 && n > 0) {
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    props.form.emi_amount = Math.round(emi * 100) / 100
  } else {
    props.form.emi_amount = 0
  }
}

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <WfModal
    :model-value="modelValue"
    @update:model-value="handleClose"
    maxWidth="md"
  >
    <!-- Header -->
    <template #header>
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
          <Plus class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary leading-none">
            Add New Loan / Liability
          </h3>
          <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
            Track principal repayment schedules, EMI dates, and interest costs
          </p>
        </div>
      </div>
    </template>

    <!-- Body Form -->
    <form @submit.prevent="emit('submit')" class="space-y-4">
      <!-- Loan Name -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Loan Title / Name
        </label>
        <input
          v-model="form.name"
          type="text"
          placeholder="e.g. HDFC Home Loan, SBI Car Loan"
          class="w-full h-10 px-3 bg-wf-surface text-xs font-semibold text-wf-text-primary border border-wf-border rounded-wf-md focus:border-wf-primary focus:outline-none shadow-2xs placeholder:text-wf-text-muted/60"
          required
        />
      </div>

      <!-- Loan Type Select -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Loan Type
        </label>
        <div class="flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
          <select
            v-model="form.loan_type"
            class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none cursor-pointer"
          >
            <option
              v-for="opt in loanTypeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.icon }} {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Principal & Interest Rate -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Principal Amount -->
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Principal Amount (₹)
          </label>
          <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
            <span class="text-sm font-bold text-wf-text-muted mr-1.5">₹</span>
            <input
              v-model.number="form.principal_amount"
              type="number"
              min="1"
              step="1000"
              placeholder="500,000"
              @input="calculateEmi"
              class="w-full bg-transparent text-sm font-bold text-wf-text-primary focus:outline-none font-mono"
              required
            />
          </div>
        </div>

        <!-- Interest Rate -->
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Interest Rate (%)
          </label>
          <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
            <input
              v-model.number="form.interest_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="8.5"
              @input="calculateEmi"
              class="w-full bg-transparent text-sm font-bold text-wf-text-primary focus:outline-none font-mono"
              required
            />
            <span class="text-xs font-bold text-wf-text-muted ml-1">%</span>
          </div>
        </div>
      </div>

      <!-- Tenure & Start Date -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Tenure in Months -->
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Tenure (Months)
          </label>
          <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
            <input
              v-model.number="form.tenure_months"
              type="number"
              min="1"
              max="600"
              placeholder="120"
              @input="calculateEmi"
              class="w-full bg-transparent text-sm font-bold text-wf-text-primary focus:outline-none font-mono"
              required
            />
          </div>
        </div>

        <!-- Start Date -->
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Start Date
          </label>
          <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
            <input
              v-model="form.start_date"
              type="date"
              class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none"
              required
            />
          </div>
        </div>
      </div>

      <!-- EMI Due Day -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Monthly EMI Due Day (1 - 31)
        </label>
        <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
          <input
            v-model.number="form.emi_date"
            type="number"
            min="1"
            max="31"
            placeholder="5"
            class="w-full bg-transparent text-sm font-bold text-wf-text-primary focus:outline-none font-mono"
            required
          />
        </div>
      </div>

      <!-- Calculated EMI Box -->
      <div class="p-3 bg-wf-primary-light/60 dark:bg-indigo-950/40 rounded-wf-md border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between shadow-2xs">
        <div>
          <span class="text-[10px] font-bold text-wf-primary uppercase tracking-wider block">
            Estimated Monthly EMI
          </span>
          <span class="text-[11px] text-wf-text-muted">
            Auto-calculated from principal, rate & tenure
          </span>
        </div>
        <div class="text-base font-black text-wf-primary font-mono">
          {{ formatAmount(form.emi_amount) }}
        </div>
      </div>
    </form>

    <!-- Footer Actions -->
    <template #footer>
      <WfButton variant="ghost" @click="handleClose">
        Cancel
      </WfButton>
      <WfButton variant="primary" :loading="saving" @click="emit('submit')">
        <Check class="w-3.5 h-3.5 mr-1" />
        <span>Create Loan</span>
      </WfButton>
    </template>
  </WfModal>
</template>
