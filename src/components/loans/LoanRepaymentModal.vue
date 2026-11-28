<script setup lang="ts">
import { computed } from 'vue'
import { Check, Wallet } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfSelect from '@/components/ui/WfSelect.vue'

const props = defineProps<{
  modelValue: boolean
  repaymentForm: {
    amount: number
    date: string
    bank_account_id: string
    installment_no: number | null
    description: string
    is_prepayment?: boolean
  }
  accountOptions: Array<{
    label: string
    value: string
  }>
  outstandingBalance?: number
  interestRate?: number
  saving?: boolean
}>()

const formattedAccountOptions = computed(() =>
  props.accountOptions.map(a => ({ title: a.label, value: a.value }))
)

const splitPreview = computed(() => {
  const amt = Math.max(0, Number(props.repaymentForm.amount || 0))
  if (props.repaymentForm.is_prepayment) {
    return { interest: 0, principal: amt }
  }
  const bal = Math.max(0, Number(props.outstandingBalance || 0))
  const rate = Math.max(0, Number(props.interestRate || 0))
  const rawInterest = Math.round(bal * (rate / 12 / 100) * 100) / 100
  const interest = Math.min(amt, rawInterest)
  const principal = Math.max(0, Math.round((amt - interest) * 100) / 100)
  return { interest, principal }
})

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
            min="0.01"
            step="any"
            class="w-full bg-transparent text-sm font-black text-wf-text-primary focus:outline-none font-mono"
            required
          />
        </div>
      </div>

      <!-- Prepayment Toggle + Principal/Interest Split Preview -->
      <div class="p-3 rounded-wf-md bg-wf-surface-variant/50 border border-wf-border-subtle space-y-2">
        <label class="flex items-center justify-between gap-2 cursor-pointer">
          <div>
            <div class="text-xs font-bold text-wf-text-primary">Mark as Principal Prepayment</div>
            <div class="text-[11px] text-wf-text-muted">Applies 100% directly to principal without marking an EMI month paid</div>
          </div>
          <input
            v-model="repaymentForm.is_prepayment"
            type="checkbox"
            class="w-4 h-4 accent-wf-primary rounded"
          />
        </label>
        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-wf-border-subtle text-xs">
          <div>
            <span class="text-[10px] font-bold uppercase text-wf-text-muted block">Principal Reduction</span>
            <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{{ splitPreview.principal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </div>
          <div>
            <span class="text-[10px] font-bold uppercase text-wf-text-muted block">Interest Component</span>
            <span class="font-mono font-bold text-amber-600 dark:text-amber-400">₹{{ splitPreview.interest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </div>
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
        <WfSelect
          v-model="repaymentForm.bank_account_id"
          :items="formattedAccountOptions"
          placeholder="Select account..."
          size="md"
        />
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
