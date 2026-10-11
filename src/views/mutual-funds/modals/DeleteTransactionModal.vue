<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
  modelValue: boolean
  transaction: any
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'confirm', id: string): void
}>()

const { formatAmount } = useCurrency()

const close = () => {
  emit('update:modelValue', false)
}

const confirm = () => {
  emit('confirm', props.transaction?.id)
}
</script>

<template>
  <WfModal
    :model-value="modelValue"
    @update:model-value="close"
    title="Delete Transaction Record?"
    description="This record will be permanently deleted and your portfolio balances recalculated."
    maxWidth="sm"
  >
    <div class="space-y-4">
      <!-- Transaction Details Tile -->
      <div class="p-3.5 rounded-wf-lg border border-wf-border bg-wf-surface-variant/40 space-y-2 text-xs">
        <div class="flex justify-between items-center text-xs">
          <span class="text-wf-text-muted">Date</span>
          <span class="font-medium text-wf-text-primary">{{ transaction?.date }}</span>
        </div>
        <div class="flex justify-between items-center text-xs">
          <span class="text-wf-text-muted">Type</span>
          <span
            class="px-2 py-0.5 text-[10px] font-bold rounded-wf-sm"
            :class="transaction?.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'"
          >
            {{ transaction?.type }}
          </span>
        </div>
        <div class="flex justify-between items-center text-xs">
          <span class="text-wf-text-muted">Amount</span>
          <span class="font-mono font-bold text-wf-text-primary">{{ formatAmount(transaction?.amount) }}</span>
        </div>
        <div class="flex justify-between items-center text-xs">
          <span class="text-wf-text-muted">Units</span>
          <span class="font-mono font-semibold text-wf-text-muted">{{ Number(transaction?.units || 0).toFixed(4) }}</span>
        </div>
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
        :disabled="loading"
        @click="confirm"
        class="px-4 py-2 text-xs font-bold rounded-wf-md bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
      >
        <Trash2 :size="13" />
        <span>{{ loading ? 'Removing...' : 'Delete Record' }}</span>
      </button>
    </template>
  </WfModal>
</template>
