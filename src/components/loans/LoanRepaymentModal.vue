<script setup lang="ts">
import { Check, Wallet } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

defineProps<{
  modelValue: boolean
  repaymentForm: {
    amount: number
    date: string
    bank_account_id: string
    installment_no: number | null
    description: string
  }
  accountOptions: Array<{
    label: string
    value: string
  }>
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'submit'): void
  (e: 'close'): void
}>()

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
        <div class="w-9 h-9 rounded-wf-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-2xs">
          <Wallet class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary leading-none">
            Record EMI Repayment #{{ repaymentForm.installment_no }}
          </h3>
          <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
            Mark installment as paid and deduct from linked account
          </p>
        </div>
      </div>
    </template>

    <!-- Body Form -->
    <form @submit.prevent="emit('submit')" class="space-y-4">
      <!-- Amount -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Payment Amount (₹)
        </label>
        <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
          <span class="text-sm font-bold text-wf-text-muted mr-1.5">₹</span>
          <input
            v-model.number="repaymentForm.amount"
            type="number"
            min="1"
            step="1"
            class="w-full bg-transparent text-sm font-black text-wf-text-primary focus:outline-none font-mono"
            required
          />
        </div>
      </div>

      <!-- Date -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Payment Date
        </label>
        <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
          <input
            v-model="repaymentForm.date"
            type="date"
            class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none"
            required
          />
        </div>
      </div>

      <!-- Paid From Account -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Paid From Account
        </label>
        <div class="flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
          <select
            v-model="repaymentForm.bank_account_id"
            class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none cursor-pointer"
            required
          >
            <option value="" disabled>Select account...</option>
            <option
              v-for="acc in accountOptions"
              :key="acc.value"
              :value="acc.value"
            >
              {{ acc.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Notes -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Notes / Reference (Optional)
        </label>
        <input
          v-model="repaymentForm.description"
          type="text"
          placeholder="e.g. Paid via Net Banking, Autopay"
          class="w-full h-10 px-3 bg-wf-surface text-xs font-semibold text-wf-text-primary border border-wf-border rounded-wf-md focus:border-wf-primary focus:outline-none shadow-2xs"
        />
      </div>
    </form>

    <!-- Footer Actions -->
    <template #footer>
      <WfButton variant="ghost" @click="handleClose">
        Cancel
      </WfButton>
      <WfButton variant="primary" :loading="saving" @click="emit('submit')">
        <Check class="w-3.5 h-3.5 mr-1" />
        <span>Record Payment</span>
      </WfButton>
    </template>
  </WfModal>
</template>
