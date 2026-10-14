<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Check, Info } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfSelect from '@/components/ui/WfSelect.vue'

const typeOptions = [
  { title: 'BUY (Purchase)', value: 'BUY' },
  { title: 'SELL (Redemption)', value: 'SELL' }
]

const props = defineProps<{
  modelValue: boolean
  transaction: any
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'save', payload: { id: string; data: any }): void
}>()

const formData = ref({
  date: '',
  type: 'BUY',
  amount: 0,
  units: 0,
  nav: 0
})

watch(() => props.modelValue, (val) => {
  if (val && props.transaction) {
    formData.value = {
      date: props.transaction.date,
      type: props.transaction.type,
      amount: props.transaction.amount,
      units: props.transaction.units,
      nav: props.transaction.nav
    }
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const save = () => {
  emit('save', {
    id: props.transaction.id,
    data: { ...formData.value }
  })
}

const isValid = computed(() => {
  return formData.value.date && 
         formData.value.amount > 0 && 
         formData.value.units > 0 && 
         formData.value.nav > 0
})
</script>

<template>
  <WfModal
    :model-value="modelValue"
    @update:model-value="close"
    title="Edit Transaction Record"
    description="Update historical purchase or sale data"
    maxWidth="md"
  >
    <div class="space-y-4">
      <form @submit.prevent="save" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <!-- Date -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider block">Date</label>
            <input
              v-model="formData.date"
              type="date"
              class="w-full h-10 px-3 text-xs font-mono font-medium rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary transition-all"
            />
          </div>

          <!-- Type -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider block">Type</label>
            <WfSelect
              v-model="formData.type"
              :items="typeOptions"
              size="md"
            />
          </div>
        </div>

        <!-- Total Amount -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider block">Total Amount (₹)</label>
          <div class="relative">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span class="text-xs font-bold text-wf-text-muted">₹</span>
            </div>
            <input
              v-model.number="formData.amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="w-full h-10 pl-7 pr-3 text-sm font-mono font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary transition-all"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <!-- Units -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider block">Units</label>
            <input
              v-model.number="formData.units"
              type="number"
              step="0.0001"
              placeholder="0.0000"
              class="w-full h-10 px-3 text-xs font-mono font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary transition-all"
            />
          </div>

          <!-- NAV -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider block">Executed NAV (₹)</label>
            <input
              v-model.number="formData.nav"
              type="number"
              step="0.0001"
              placeholder="0.0000"
              class="w-full h-10 px-3 text-xs font-mono font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary transition-all"
            />
          </div>
        </div>
      </form>

      <!-- Recalculation Note -->
      <div class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border flex items-start gap-2 text-xs text-wf-text-muted">
        <Info class="w-4 h-4 text-wf-primary flex-shrink-0 mt-0.5" />
        <span>Updating this transaction recalculates holding balance, unit totals, and historic portfolio timeline.</span>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        :disabled="loading"
        @click="close"
        class="px-4 py-2 text-xs font-semibold rounded-wf-md border border-wf-border text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        :disabled="!isValid || loading"
        @click="save"
        class="px-5 py-2 text-xs font-bold rounded-wf-md bg-wf-primary text-white shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
      >
        <Check :size="14" />
        <span>{{ loading ? 'Saving...' : 'Save Changes' }}</span>
      </button>
    </template>
  </WfModal>
</template>
