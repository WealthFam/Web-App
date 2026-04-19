<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { financeApi } from '@/api/client'

const props = defineProps<{
  modelValue: boolean
  holding: any
  loading?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'delete-transactions', 'delete-holding'])

const isOpen = ref(props.modelValue)
const selectedTxns = ref<string[]>([])
const deleteMode = ref<'partial' | 'full'>('partial')

const isFetching = ref(false)
const localHolding = ref<any>(null)

const activeHolding = computed(() => localHolding.value || props.holding)

async function enrichHoldingData() {
  if (!props.holding) return
  
  // If we already have transactions, just use the props data
  if (props.holding.transactions && props.holding.transactions.length > 0) {
    localHolding.value = null
    return
  }

  isFetching.value = true
  try {
    let res;
    if (props.holding.id?.toString().startsWith('group-')) {
      // It's an aggregate fund
      res = await financeApi.getSchemeDetails(props.holding.scheme_code)
    } else {
      // It's a single folio
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
  isOpen.value = val
  if (val) {
    selectedTxns.value = []
    deleteMode.value = 'partial'
    enrichHoldingData()
  }
})

watch(isOpen, (val) => {
  emit('update:modelValue', val)
})

const close = () => {
  isOpen.value = false
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
    emit('delete-holding', activeHolding.value.id)
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
      // Deleting a BUY reduces balance; Deleting a SELL increases it
      acc.units += isBuy ? (t.units || 0) : -(t.units || 0)
      acc.amount += isBuy ? (t.amount || 0) : -(t.amount || 0)
      return acc
    }, { units: 0, amount: 0 })
})

const projectedStats = computed(() => {
  const currentInvested = activeHolding.value?.invested_value || 0
  const currentValue = activeHolding.value?.current_value || 0
  const lastNav = activeHolding.value?.last_nav || activeHolding.value?.nav || 0
  
  const newInvested = currentInvested - selectedImpact.value.amount
  const newValue = currentValue - (selectedImpact.value.units * lastNav)
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
  <v-dialog v-model="isOpen" max-width="700" persistent scrollable>
    <v-card class="rounded-xl overflow-hidden glass-card border">
      <v-card-title class="pa-6 pb-2 d-flex align-center">
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" class="mr-2"></v-btn>
        <div>
          <div class="text-h6 font-weight-bold">Remove Records</div>
          <div class="text-caption text-medium-emphasis">{{ activeHolding?.scheme_name }}</div>
        </div>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-0" style="height: 550px;">
        <div class="pa-6 pb-0">
          <v-tabs v-model="deleteMode" color="error" class="mb-4">
            <v-tab value="partial" class="text-none font-weight-bold">Select Transactions</v-tab>
            <v-tab value="full" class="text-none font-weight-bold">Remove Full Holding</v-tab>
          </v-tabs>

          <div v-show="deleteMode === 'partial'">
            <v-alert
              type="info"
              variant="tonal"
              color="primary"
              class="mb-4 rounded-lg text-caption"
              density="compact"
            >
              Select transactions to remove. We'll show you the projected impact on your portfolio below.
            </v-alert>

            <div v-if="isFetching" class="d-flex flex-column align-center justify-center py-10 opacity-60">
              <v-progress-circular indeterminate color="primary" class="mb-4"></v-progress-circular>
              <div class="text-caption font-weight-bold">Fetching transaction history...</div>
            </div>

            <template v-else>
              <!-- Projection Summary Card -->
              <v-expand-transition>
                <div v-if="selectedTxns.length > 0" class="mb-6">
                  <v-card variant="outlined" class="rounded-xl border-dashed border-primary border-opacity-30 bg-primary-lighten-5 pa-4">
                    <div class="text-caption font-weight-bold text-primary mb-3 text-uppercase ls-1">Projected State Post-Removal</div>
                    <v-row dense>
                      <v-col cols="4">
                        <div class="text-[10px] text-medium-emphasis font-weight-bold text-uppercase">Invested</div>
                        <div class="text-body-2 font-weight-black d-flex align-center gap-1">
                          <span class="text-decoration-line-through opacity-40">₹{{ activeHolding.invested_value.toLocaleString(undefined, {maximumFractionDigits: 0}) }}</span>
                          <v-icon size="10" color="primary">mdi-arrow-right</v-icon>
                          <span>₹{{ projectedStats.invested.toLocaleString(undefined, {maximumFractionDigits: 0}) }}</span>
                        </div>
                      </v-col>
                      <v-col cols="4">
                        <div class="text-[10px] text-medium-emphasis font-weight-bold text-uppercase">Current</div>
                        <div class="text-body-2 font-weight-black d-flex align-center gap-1">
                          <span class="text-decoration-line-through opacity-40">₹{{ activeHolding.current_value.toLocaleString(undefined, {maximumFractionDigits: 0}) }}</span>
                          <v-icon size="10" color="primary">mdi-arrow-right</v-icon>
                          <span>₹{{ projectedStats.current.toLocaleString(undefined, {maximumFractionDigits: 0}) }}</span>
                        </div>
                      </v-col>
                      <v-col cols="4" class="text-right">
                        <div class="text-[10px] text-medium-emphasis font-weight-bold text-uppercase">Projected Returns</div>
                        <div class="text-body-2 font-weight-black" :class="projectedStats.pl >= 0 ? 'text-success' : 'text-error'">
                          {{ projectedStats.plPercent.toFixed(2) }}%
                        </div>
                      </v-col>
                    </v-row>
                  </v-card>
                </div>
              </v-expand-transition>

              <div class="d-flex align-center justify-space-between mb-2 px-2">
                <span class="text-caption font-weight-bold">{{ selectedTxns.length }} selected</span>
                <v-btn variant="text" size="x-small" @click="toggleSelectAll" color="primary" class="text-none">
                  {{ selectedTxns.length === activeHolding?.transactions?.length ? 'Deselect All' : 'Select All' }}
                </v-btn>
              </div>

              <v-list class="bg-transparent pa-0">
                <v-list-item
                  v-for="txn in activeHolding?.transactions"
                  :key="txn.id"
                  class="rounded-lg mb-2 border txn-item"
                  :class="{ 'bg-error-lighten-5 border-error': selectedTxns.includes(txn.id) }"
                  @click="selectedTxns.includes(txn.id) ? selectedTxns = selectedTxns.filter(id => id !== txn.id) : selectedTxns.push(txn.id)"
                >
                  <template v-slot:prepend>
                    <v-checkbox-btn
                      v-model="selectedTxns"
                      :value="txn.id"
                      color="error"
                      @click.stop
                    ></v-checkbox-btn>
                  </template>

                  <div class="d-flex align-center justify-space-between w-100">
                    <div>
                      <div class="text-body-2 font-weight-bold">{{ txn.date }}</div>
                      <div class="text-caption text-medium-emphasis">{{ txn.type }} • {{ txn.units.toFixed(4) }} Units</div>
                    </div>
                    <div class="text-right">
                      <div class="text-body-2 font-weight-bold">₹{{ txn.amount.toLocaleString() }}</div>
                      <div class="text-caption text-medium-emphasis">@ ₹{{ txn.nav.toFixed(4) }}</div>
                    </div>
                  </div>
                </v-list-item>
              </v-list>
            </template>
          </div>

          <div v-show="deleteMode === 'full'" class="text-center py-10">
            <v-avatar color="error" size="80" class="mb-6 elevation-4">
              <v-icon size="40" color="white">mdi-alert-octagon</v-icon>
            </v-avatar>
            <h3 class="text-h5 font-weight-bold mb-4">Remove Entire Folio?</h3>
            <p class="text-body-1 text-medium-emphasis mb-6 px-10">
              This will remove the folio <span class="font-weight-bold">({{ activeHolding?.folio_number || 'All Folios' }})</span> and all associated transactions from your portfolio.
            </p>
            
            <div class="bg-surface-light pa-4 rounded-xl d-inline-block border">
              <div class="text-caption text-medium-emphasis mb-1">Total Impact</div>
              <div class="text-h5 font-weight-bold text-error">₹{{ (activeHolding?.current_value || 0).toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-6">
        <v-btn
          variant="text"
          class="text-none font-weight-bold px-4"
          @click="close"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-spacer></v-spacer>
        <div v-if="deleteMode === 'partial' && selectedTxns.length > 0" class="mr-4 text-right">
          <div class="text-caption text-medium-emphasis">Total to Remove</div>
          <div class="text-body-2 font-weight-bold">₹{{ totalSelectedValue.toLocaleString() }}</div>
        </div>
        <v-btn
          :color="deleteMode === 'full' ? 'error' : 'error'"
          variant="flat"
          class="text-none font-weight-bold px-8 rounded-lg elevation-2"
          :loading="loading"
          :disabled="isActionDisabled"
          @click="confirmAction"
        >
          {{ deleteMode === 'full' ? 'Remove All' : 'Remove Selected' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.glass-card {
  background: rgba(var(--v-theme-surface), 0.95) !important;
  backdrop-filter: blur(20px);
}

.txn-item {
  transition: all 0.2s ease;
  cursor: pointer;
}

.txn-item:hover {
  background: rgba(var(--v-theme-error), 0.05);
}

.bg-error-lighten-5 {
  background-color: rgba(var(--v-theme-error), 0.05) !important;
}

.border-error {
  border-color: rgb(var(--v-theme-error)) !important;
}
</style>
