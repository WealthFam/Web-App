<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { financeApi } from '@/api/client'
import { Trash2, ArrowRight, AlertOctagon } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
  modelValue: boolean
  holding: any
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'delete-transactions', txIds: string[]): void
  (e: 'delete-holding', holdingId: string): void
}>()

const { formatAmount } = useCurrency()

const selectedTxns = ref<string[]>([])
const deleteMode = ref<'partial' | 'full'>('partial')
const isFetching = ref(false)
const localHolding = ref<any>(null)

const activeHolding = computed(() => localHolding.value || props.holding)

async function enrichHoldingData() {
  if (!props.holding) return
  
  if (props.holding.transactions && props.holding.transactions.length > 0) {
    localHolding.value = null
    return
  }

  isFetching.value = true
  try {
    let res
    if (props.holding.id?.toString().startsWith('group-')) {
      res = await financeApi.getSchemeDetails(props.holding.scheme_code)
    } else {
      res = await financeApi.getHoldingDetails(props.holding.id)
    }
    localHolding.value = res.data
  } catch (e) {
    console.error("Failed to fetch detailed holding data", e)
  } finally {
    isFetching.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    selectedTxns.value = []
    deleteMode.value = 'partial'
    enrichHoldingData()
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const toggleSelectAll = () => {
  if (selectedTxns.value.length === activeHolding.value?.transactions?.length) {
    selectedTxns.value = []
  } else {
    selectedTxns.value = activeHolding.value?.transactions?.map((t: any) => t.id) || []
  }
}

const confirmAction = () => {
  if (deleteMode.value === 'full') {
    emit('delete-holding', activeHolding.value?.id)
  } else {
    emit('delete-transactions', selectedTxns.value)
  }
}

const isActionDisabled = computed(() => {
  if (isFetching.value) return true
  if (deleteMode.value === 'full') return false
  return selectedTxns.value.length === 0
})

const totalSelectedValue = computed(() => {
  if (!activeHolding.value?.transactions) return 0
  return activeHolding.value.transactions
    .filter((t: any) => selectedTxns.value.includes(t.id))
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
})

const selectedImpact = computed(() => {
  if (!activeHolding.value?.transactions) return { units: 0, amount: 0 }
  return activeHolding.value.transactions
    .filter((t: any) => selectedTxns.value.includes(t.id))
    .reduce((acc: any, t: any) => {
      const isBuy = t.type === 'BUY' || t.type === 'SIP'
      acc.units += isBuy ? (t.units || 0) : -(t.units || 0)
      acc.amount += isBuy ? (t.amount || 0) : -(t.amount || 0)
      return acc
    }, { units: 0, amount: 0 })
})

const projectedStats = computed(() => {
  const currentInvested = activeHolding.value?.invested_value || 0
  const currentValue = activeHolding.value?.current_value || 0
  const lastNav = activeHolding.value?.last_nav || activeHolding.value?.nav || 0
  
  const newInvested = Math.max(0, currentInvested - selectedImpact.value.amount)
  const newValue = Math.max(0, currentValue - (selectedImpact.value.units * lastNav))
  const newPL = newValue - newInvested
  const newPLPercent = newInvested ? (newPL / newInvested) * 100 : 0

  return {
    invested: newInvested,
    current: newValue,
    pl: newPL,
    plPercent: newPLPercent
  }
})
</script>

<template>
  <WfModal
    :model-value="modelValue"
    @update:model-value="close"
    :title="activeHolding?.scheme_name ? `Manage Records: ${activeHolding.scheme_name}` : 'Remove Records'"
    description="Select specific transactions to purge or delete this entire folio holding"
    maxWidth="lg"
  >
    <div class="space-y-4">
      <!-- Segmented Switcher -->
      <div class="grid grid-cols-2 p-1 rounded-wf-lg bg-wf-surface-variant border border-wf-border text-xs font-semibold">
        <button
          type="button"
          @click="deleteMode = 'partial'"
          class="py-2 px-3 rounded-wf-md transition-all text-center"
          :class="deleteMode === 'partial' ? 'bg-wf-surface text-wf-text-primary shadow-sm font-bold border border-wf-border' : 'text-wf-text-muted hover:text-wf-text-primary'"
        >
          Select Transactions (Partial)
        </button>
        <button
          type="button"
          @click="deleteMode = 'full'"
          class="py-2 px-3 rounded-wf-md transition-all text-center text-rose-500"
          :class="deleteMode === 'full' ? 'bg-rose-500/10 text-rose-500 shadow-sm font-bold border border-rose-500/20' : 'text-rose-400 hover:text-rose-500'"
        >
          Purge Entire Holding
        </button>
      </div>

      <!-- Partial Mode -->
      <div v-show="deleteMode === 'partial'" class="space-y-3">
        <div v-if="isFetching" class="py-10 flex flex-col items-center justify-center gap-2">
          <div class="w-7 h-7 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
          <span class="text-xs text-wf-text-muted font-medium">Fetching transaction history...</span>
        </div>

        <template v-else>
          <!-- Projected State Post Removal -->
          <div v-if="selectedTxns.length > 0" class="p-3.5 rounded-wf-lg border border-wf-primary/30 bg-wf-primary/5 space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-wf-primary block">Projected State Post-Removal</span>
            <div class="grid grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <div class="text-[10px] text-wf-text-muted uppercase">Invested</div>
                <div class="flex items-center gap-1 font-bold text-xs mt-0.5">
                  <span class="line-through opacity-40">{{ formatAmount(activeHolding?.invested_value) }}</span>
                  <ArrowRight :size="10" class="text-wf-primary flex-shrink-0" />
                  <span class="text-wf-text-primary">{{ formatAmount(projectedStats.invested) }}</span>
                </div>
              </div>
              <div>
                <div class="text-[10px] text-wf-text-muted uppercase">Current</div>
                <div class="flex items-center gap-1 font-bold text-xs mt-0.5">
                  <span class="line-through opacity-40">{{ formatAmount(activeHolding?.current_value) }}</span>
                  <ArrowRight :size="10" class="text-wf-primary flex-shrink-0" />
                  <span class="text-wf-text-primary">{{ formatAmount(projectedStats.current) }}</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-[10px] text-wf-text-muted uppercase">Returns</div>
                <div class="font-bold text-xs mt-0.5" :class="projectedStats.pl >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                  {{ projectedStats.plPercent.toFixed(2) }}%
                </div>
              </div>
            </div>
          </div>

          <!-- Transaction List Header -->
          <div class="flex items-center justify-between text-xs px-1">
            <span class="font-semibold text-wf-text-muted">{{ selectedTxns.length }} transaction(s) selected</span>
            <button
              type="button"
              @click="toggleSelectAll"
              class="text-xs font-bold text-wf-primary hover:underline"
            >
              {{ selectedTxns.length === activeHolding?.transactions?.length ? 'Deselect All' : 'Select All' }}
            </button>
          </div>

          <!-- Transactions List -->
          <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            <div
              v-for="txn in activeHolding?.transactions"
              :key="txn.id"
              @click="selectedTxns.includes(txn.id) ? selectedTxns = selectedTxns.filter(id => id !== txn.id) : selectedTxns.push(txn.id)"
              class="p-2.5 rounded-wf-md border text-xs cursor-pointer transition-all flex items-center justify-between"
              :class="selectedTxns.includes(txn.id) ? 'border-rose-500/40 bg-rose-500/5' : 'border-wf-border bg-wf-surface hover:bg-wf-surface-variant/40'"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  :checked="selectedTxns.includes(txn.id)"
                  @click.stop
                  @change="selectedTxns.includes(txn.id) ? selectedTxns = selectedTxns.filter(id => id !== txn.id) : selectedTxns.push(txn.id)"
                  class="rounded border-wf-border text-rose-500 focus:ring-0 flex-shrink-0"
                />
                <div class="min-w-0">
                  <div class="font-bold text-wf-text-primary text-xs">{{ txn.date }}</div>
                  <div class="text-[11px] text-wf-text-muted">{{ txn.type }} • {{ Number(txn.units || 0).toFixed(4) }} Units</div>
                </div>
              </div>
              <div class="text-right font-mono flex-shrink-0">
                <div class="font-bold text-wf-text-primary text-xs">{{ formatAmount(txn.amount) }}</div>
                <div class="text-[10px] text-wf-text-muted">@ ₹{{ Number(txn.nav || 0).toFixed(2) }}</div>
              </div>
            </div>

            <div v-if="!activeHolding?.transactions?.length" class="p-6 text-center text-xs text-wf-text-muted">
              No historical transactions found.
            </div>
          </div>
        </template>
      </div>

      <!-- Full Delete Mode -->
      <div v-show="deleteMode === 'full'" class="py-6 text-center space-y-3">
        <div class="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertOctagon :size="28" />
        </div>
        <div>
          <h4 class="text-sm font-bold text-wf-text-primary">Delete Entire Holding?</h4>
          <p class="text-xs text-wf-text-muted mt-1 max-w-sm mx-auto">
            This will permanently remove folio <span class="font-bold font-mono text-wf-text-primary">{{ activeHolding?.folio_number || 'All Folios' }}</span> and all associated historical records from your wealth ledger.
          </p>
        </div>
        <div class="p-3 rounded-wf-lg border border-wf-border bg-wf-surface-variant/40 inline-block min-w-[200px]">
          <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">Current Folio Value</span>
          <span class="font-mono text-base font-bold text-rose-500">{{ formatAmount(activeHolding?.current_value) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        @click="close"
        :disabled="loading"
        class="px-4 py-2 text-xs font-semibold rounded-wf-md border border-wf-border text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
      >
        Cancel
      </button>
      <div class="flex items-center gap-3">
        <div v-if="deleteMode === 'partial' && selectedTxns.length > 0" class="text-right text-xs font-mono">
          <span class="text-wf-text-muted">Selected: </span>
          <span class="font-bold text-wf-text-primary">{{ formatAmount(totalSelectedValue) }}</span>
        </div>
        <button
          type="button"
          :disabled="isActionDisabled || loading"
          @click="confirmAction"
          class="px-4 py-2 text-xs font-bold rounded-wf-md bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          <Trash2 :size="13" />
          <span>{{ deleteMode === 'full' ? 'Delete Holding' : `Delete (${selectedTxns.length})` }}</span>
        </button>
      </div>
    </template>
  </WfModal>
</template>
