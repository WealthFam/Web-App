<template>
  <MainLayout>
    <div class="space-y-6">
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 shadow-2xs shrink-0">
            <ArrowLeftRight class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg sm:text-xl font-bold text-wf-text-primary tracking-tight leading-tight">
                Cross-Account Transfers
              </h1>
              <span v-if="candidates.paired_candidates?.length" class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                {{ candidates.paired_candidates.length }} Pending
              </span>
            </div>
            <p class="text-xs text-wf-text-secondary mt-0.5">
              Auto-detect money moved between bank accounts, credit card bill payments, loan EMIs, and investments.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <WfButton
            variant="secondary"
            size="md"
            :loading="isScanning"
            @click="triggerScan"
            class="h-9 px-3.5 text-xs font-semibold"
          >
            <RefreshCw class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': isScanning }" />
            <span>Scan Ledger</span>
          </WfButton>

          <WfButton
            v-if="highConfidencePairs.length > 0"
            variant="primary"
            size="md"
            :loading="isBatchPairing"
            @click="approveAllHighConfidence"
            class="h-9 px-4 text-xs font-semibold"
          >
            <CheckCheck class="w-4 h-4 mr-1.5" />
            <span>Approve {{ highConfidencePairs.length }} High-Confidence Pairs</span>
          </WfButton>
        </div>
      </div>

      <!-- KPI Summary Row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Detected Pairs -->
        <div class="p-4 rounded-wf-lg bg-wf-surface border border-wf-border shadow-2xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-wf-text-muted">Detected Pairs</span>
            <div class="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles class="w-3.5 h-3.5" />
            </div>
          </div>
          <div class="text-2xl font-black text-wf-primary tabular-nums tracking-tight">
            {{ candidates.paired_candidates?.length || 0 }}
          </div>
          <div class="text-[11px] text-wf-text-muted font-medium mt-1">
            {{ highConfidencePairs.length }} high confidence matches
          </div>
        </div>

        <!-- Unpaired Outflows -->
        <div class="p-4 rounded-wf-lg bg-wf-surface border border-wf-border shadow-2xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-wf-text-muted">Unpaired Outflows</span>
            <div class="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle class="w-3.5 h-3.5" />
            </div>
          </div>
          <div class="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
            {{ candidates.unpaired_candidates?.length || 0 }}
          </div>
          <div class="text-[11px] text-wf-text-muted font-medium mt-1">
            Missing counterpart credits
          </div>
        </div>

        <!-- Active Paired Transfers -->
        <div class="p-4 rounded-wf-lg bg-wf-surface border border-wf-border shadow-2xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-wf-text-muted">Active Paired Transfers</span>
            <div class="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 class="w-3.5 h-3.5" />
            </div>
          </div>
          <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
            {{ transferHistory.total || 0 }}
          </div>
          <div class="text-[11px] text-wf-text-muted font-medium mt-1">
            Excluded from duplicate expenses
          </div>
        </div>

        <!-- Scan Coverage -->
        <div class="p-4 rounded-wf-lg bg-wf-surface border border-wf-border shadow-2xs">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-wf-text-muted">Scan Coverage</span>
            <div class="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock class="w-3.5 h-3.5" />
            </div>
          </div>
          <div class="text-xl font-black text-wf-text-primary tracking-tight">
            Last 90 Days
          </div>
          <div class="text-[11px] text-wf-text-muted font-medium mt-1">
            Scanned: {{ formatTimestamp(candidates.scan_timestamp) }}
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex items-center gap-1 p-1 bg-wf-surface-variant/60 rounded-wf-lg border border-wf-border-subtle w-fit">
        <button
          type="button"
          @click="activeTab = 'suggestions'"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-wf-md transition-all',
            activeTab === 'suggestions'
              ? 'bg-wf-surface text-wf-text-primary shadow-2xs border border-wf-border'
              : 'text-wf-text-secondary hover:text-wf-text-primary'
          ]"
        >
          <Sparkles class="w-3.5 h-3.5 text-indigo-500" />
          <span>Detected Pairs</span>
          <span
            v-if="candidates.paired_candidates?.length"
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          >
            {{ candidates.paired_candidates.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'unpaired'"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-wf-md transition-all',
            activeTab === 'unpaired'
              ? 'bg-wf-surface text-wf-text-primary shadow-2xs border border-wf-border'
              : 'text-wf-text-secondary hover:text-wf-text-primary'
          ]"
        >
          <HelpCircle class="w-3.5 h-3.5 text-amber-500" />
          <span>Unpaired Outflows</span>
          <span
            v-if="candidates.unpaired_candidates?.length"
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          >
            {{ candidates.unpaired_candidates.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'history'"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-wf-md transition-all',
            activeTab === 'history'
              ? 'bg-wf-surface text-wf-text-primary shadow-2xs border border-wf-border'
              : 'text-wf-text-secondary hover:text-wf-text-primary'
          ]"
        >
          <History class="w-3.5 h-3.5 text-wf-text-muted" />
          <span>Transfer History</span>
          <span
            v-if="transferHistory.total"
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-wf-surface-variant text-wf-text-secondary"
          >
            {{ transferHistory.total }}
          </span>
        </button>
      </div>

      <!-- Tab Content 1: Detected Pairs -->
      <div v-if="activeTab === 'suggestions'">
        <!-- Empty State -->
        <div
          v-if="!isScanning && (!candidates.paired_candidates || candidates.paired_candidates.length === 0)"
          class="p-12 text-center rounded-wf-xl bg-wf-surface border border-wf-border shadow-2xs max-w-xl mx-auto"
        >
          <div class="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 class="w-7 h-7" />
          </div>
          <h3 class="text-base font-bold text-wf-text-primary mb-1">All Caught Up!</h3>
          <p class="text-xs text-wf-text-secondary max-w-sm mx-auto mb-5 leading-relaxed">
            No unlinked cross-account transfers found in the last 90 days. All detected movements between accounts are paired.
          </p>
          <WfButton variant="secondary" size="sm" @click="triggerScan" :loading="isScanning" class="text-xs font-semibold">
            <RefreshCw class="w-3.5 h-3.5 mr-1.5" />
            <span>Re-scan Transactions</span>
          </WfButton>
        </div>

        <!-- Pairs List -->
        <div v-else class="space-y-4">
          <div
            v-for="pair in candidates.paired_candidates"
            :key="pair.id"
            class="p-4 sm:p-5 rounded-wf-xl bg-wf-surface border border-wf-border shadow-2xs hover:shadow-sm transition-all"
          >
            <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <!-- Source Leg (Debit) -->
              <div class="flex-1 p-3.5 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border-subtle">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span :class="['px-2 py-0.5 rounded-wf-pill text-[10px] font-bold uppercase tracking-wider', getTypeBadgeClass(pair.source_transaction.account_type)]">
                      {{ pair.source_transaction.account_type }}
                    </span>
                    <span class="text-xs font-bold text-wf-text-primary">{{ pair.source_transaction.account_name }}</span>
                    <span v-if="pair.source_transaction.account_mask" class="text-[11px] font-mono text-wf-text-muted">
                      *{{ pair.source_transaction.account_mask.slice(-4) }}
                    </span>
                  </div>
                  <span class="text-[11px] font-medium text-wf-text-muted">{{ formatDate(pair.source_transaction.date) }}</span>
                </div>
                <div class="text-base font-black text-rose-600 dark:text-rose-400 mb-1 tabular-nums">
                  - {{ formatAmount(pair.source_transaction.amount) }}
                </div>
                <div class="text-xs text-wf-text-secondary line-clamp-1">
                  {{ pair.source_transaction.description || pair.source_transaction.recipient || 'Outflow' }}
                </div>
              </div>

              <!-- Match Reason & Arrow -->
              <div class="flex flex-col items-center justify-center px-2 py-1 text-center shrink-0 min-w-[200px]">
                <div class="flex items-center gap-1.5 mb-2">
                  <span :class="['px-2 py-0.5 rounded-wf-pill text-[10px] font-bold', getConfidenceBadgeClass(pair.confidence)]">
                    {{ pair.confidence }}% Match
                  </span>
                  <span v-if="pair.amount_difference > 0" class="px-1.5 py-0.5 rounded-wf-pill text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    ₹{{ pair.amount_difference.toFixed(2) }} Diff
                  </span>
                </div>
                <div class="flex items-center gap-2 text-wf-primary mb-1 w-full justify-center">
                  <div class="h-px bg-wf-border-subtle flex-1"></div>
                  <ArrowLeftRight class="w-4 h-4 text-wf-primary" />
                  <div class="h-px bg-wf-border-subtle flex-1"></div>
                </div>
                <div class="text-[11px] font-medium text-wf-text-muted max-w-[220px] line-clamp-2">
                  {{ pair.reason }}
                </div>
              </div>

              <!-- Destination Leg (Credit) -->
              <div class="flex-1 p-3.5 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border-subtle">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span :class="['px-2 py-0.5 rounded-wf-pill text-[10px] font-bold uppercase tracking-wider', getTypeBadgeClass(pair.destination_transaction.account_type)]">
                      {{ pair.destination_transaction.account_type }}
                    </span>
                    <span class="text-xs font-bold text-wf-text-primary">{{ pair.destination_transaction.account_name }}</span>
                    <span v-if="pair.destination_transaction.account_mask" class="text-[11px] font-mono text-wf-text-muted">
                      *{{ pair.destination_transaction.account_mask.slice(-4) }}
                    </span>
                  </div>
                  <span class="text-[11px] font-medium text-wf-text-muted">{{ formatDate(pair.destination_transaction.date) }}</span>
                </div>
                <div class="text-base font-black text-emerald-600 dark:text-emerald-400 mb-1 tabular-nums">
                  + {{ formatAmount(pair.destination_transaction.amount) }}
                </div>
                <div class="text-xs text-wf-text-secondary line-clamp-1">
                  {{ pair.destination_transaction.description || pair.destination_transaction.recipient || 'Inflow' }}
                </div>
              </div>

              <!-- Actions -->
              <div class="flex sm:flex-col items-center justify-center gap-2 shrink-0 pt-2 lg:pt-0">
                <WfButton
                  variant="primary"
                  size="sm"
                  :loading="pairingId === pair.id"
                  @click="pairSingle(pair)"
                  class="h-8 px-3 text-xs font-semibold w-full sm:w-auto"
                >
                  <Check class="w-3.5 h-3.5 mr-1" />
                  <span>Link Pair</span>
                </WfButton>
                <button
                  type="button"
                  :disabled="pairingId === pair.id"
                  @click="dismissPair(pair)"
                  class="text-xs font-semibold text-wf-text-muted hover:text-wf-text-primary px-2 py-1 transition-colors disabled:opacity-50"
                >
                  Not a Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content 2: Unpaired Outflows -->
      <div v-else-if="activeTab === 'unpaired'">
        <div
          v-if="!candidates.unpaired_candidates || candidates.unpaired_candidates.length === 0"
          class="p-12 text-center rounded-wf-xl bg-wf-surface border border-wf-border shadow-2xs max-w-xl mx-auto"
        >
          <div class="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 class="w-7 h-7" />
          </div>
          <h3 class="text-base font-bold text-wf-text-primary mb-1">No Unpaired Outflows</h3>
          <p class="text-xs text-wf-text-secondary max-w-sm mx-auto leading-relaxed">
            All debit transactions that appear to target internal credit cards, loan accounts, or investments have either been linked or confirmed.
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="item in candidates.unpaired_candidates"
            :key="item.transaction.id"
            class="p-4 sm:p-5 rounded-wf-xl bg-wf-surface border border-wf-border shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div class="space-y-1.5 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {{ item.transaction.account_name }}
                </span>
                <span class="text-[11px] font-medium text-wf-text-muted">{{ formatDate(item.transaction.date) }}</span>
                <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  {{ item.reason }}
                </span>
              </div>
              <div class="text-base font-black text-rose-600 dark:text-rose-400 tabular-nums">
                - {{ formatAmount(item.transaction.amount) }}
              </div>
              <div class="text-xs font-medium text-wf-text-primary">
                {{ item.transaction.description }}
              </div>
            </div>

            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <div class="text-xs text-wf-text-muted">
                Suggested Destination: <strong class="text-wf-text-primary">{{ item.suggested_destination?.name || 'Unknown' }}</strong>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="creatingCounterpartId === item.transaction.id"
                  @click="dismissUnpaired(item)"
                  class="h-8 px-3 text-xs font-semibold text-wf-text-muted hover:text-wf-text-primary border border-wf-border rounded-wf-md transition-colors disabled:opacity-50"
                >
                  Not a Transfer
                </button>
                <WfButton
                  variant="primary"
                  size="sm"
                  :loading="creatingCounterpartId === item.transaction.id"
                  @click="openCreateCounterpartModal(item)"
                  class="h-8 px-3 text-xs font-semibold"
                >
                  <PlusCircle class="w-3.5 h-3.5 mr-1.5" />
                  <span>Create Counterpart & Link</span>
                </WfButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content 3: History -->
      <div v-else-if="activeTab === 'history'">
        <div
          v-if="transferHistory.items.length === 0"
          class="p-12 text-center rounded-wf-xl bg-wf-surface border border-wf-border shadow-2xs max-w-xl mx-auto"
        >
          <p class="text-xs font-medium text-wf-text-muted">No active paired transfers recorded yet.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="item in transferHistory.items"
            :key="item.source_id"
            class="p-4 rounded-wf-xl bg-wf-surface border border-wf-border shadow-2xs flex items-center justify-between gap-4"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ArrowLeftRight class="w-4 h-4" />
              </div>
              <div>
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-xs font-bold text-wf-text-primary">{{ item.source_account_name }}</span>
                  <ArrowRight class="w-3 h-3 text-wf-text-muted" />
                  <span class="text-xs font-bold text-wf-text-primary">{{ item.partner_account_name }}</span>
                </div>
                <div class="text-[11px] text-wf-text-muted font-medium">
                  {{ formatDate(item.date) }} · {{ item.description }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="text-sm font-black text-wf-primary tabular-nums">
                {{ formatAmount(item.amount) }}
              </div>
              <WfButton
                variant="danger"
                size="sm"
                :loading="unpairingId === item.source_id"
                @click="unpair(item.source_id)"
                class="h-7 px-2.5 text-[11px] font-semibold"
              >
                Unlink
              </WfButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Counterpart Modal -->
      <WfModal
        v-model="counterpartModal"
        title="Create Counterpart Leg"
        maxWidth="md"
      >
        <div class="space-y-4">
          <p class="text-xs text-wf-text-secondary leading-relaxed">
            Create an incoming credit on the destination account so both legs match and the ledger is balanced.
          </p>

          <div v-if="selectedUnpaired" class="p-3.5 rounded-wf-lg bg-wf-surface-variant/70 border border-wf-border-subtle space-y-1">
            <div class="text-[11px] font-semibold text-wf-text-muted">
              Outflow from {{ selectedUnpaired.transaction.account_name }}
            </div>
            <div class="text-base font-black text-rose-600 dark:text-rose-400 tabular-nums">
              - {{ formatAmount(selectedUnpaired.transaction.amount) }}
            </div>
            <div class="text-xs text-wf-text-secondary line-clamp-1">
              {{ selectedUnpaired.transaction.description }}
            </div>
          </div>

          <form @submit.prevent="submitCreateCounterpart" class="space-y-4">
            <WfInput
              v-model="counterpartForm.credited_amount"
              label="Credited Amount (₹)"
              type="number"
              step="any"
              placeholder="0.00"
              hint="Adjust if payment discount or offer applied (e.g. ₹9,900 paid from bank, ₹10,000 credited on card)"
              required
            />

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-wf-border-subtle">
              <WfButton
                type="button"
                variant="secondary"
                size="md"
                @click="counterpartModal = false"
                class="text-xs font-semibold"
              >
                Cancel
              </WfButton>
              <WfButton
                type="submit"
                variant="primary"
                size="md"
                :loading="isCreatingCounterpart"
                class="text-xs font-semibold"
              >
                Create & Link
              </WfButton>
            </div>
          </form>
        </div>
      </WfModal>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ArrowLeftRight,
  ArrowRight,
  Sparkles,
  CheckCheck,
  CheckCircle2,
  Check,
  AlertCircle,
  Clock,
  RefreshCw,
  HelpCircle,
  History,
  PlusCircle
} from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useCurrency } from '@/composables/useCurrency'

const notification = useNotificationStore()
const { formatAmount } = useCurrency()

const activeTab = ref('suggestions')
const isScanning = ref(false)
const isBatchPairing = ref(false)
const pairingId = ref<string | null>(null)
const unpairingId = ref<string | null>(null)
const creatingCounterpartId = ref<string | null>(null)

const candidates = ref<{
  paired_candidates?: any[]
  paired_count?: number
  unpaired_candidates?: any[]
  unpaired_count?: number
  scan_timestamp?: string
}>({})

const transferHistory = ref<{
  items: any[]
  total: number
}>({ items: [], total: 0 })

const highConfidencePairs = computed(() => {
  return (candidates.value.paired_candidates || []).filter(p => p.confidence >= 85)
})

const counterpartModal = ref(false)
const selectedUnpaired = ref<any>(null)
const isCreatingCounterpart = ref(false)
const counterpartForm = ref({
  credited_amount: 0
})

function formatDate(iso?: string) {
  if (!iso) return 'N/A'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatTimestamp(iso?: string) {
  if (!iso) return 'Never'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function getTypeBadgeClass(type?: string) {
  switch ((type || '').toUpperCase()) {
    case 'BANK':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
    case 'CREDIT_CARD':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
    case 'LOAN':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
    case 'INVESTMENT':
    case 'PROVIDENT_FUND':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}

function getConfidenceBadgeClass(conf: number) {
  if (conf >= 85) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
  }
  if (conf >= 70) {
    return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
  }
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
}

async function triggerScan() {
  isScanning.value = true
  try {
    const res = await financeApi.scanTransfers(90)
    candidates.value = res.data || {}
    notification.success(`Scan complete: found ${candidates.value.paired_candidates?.length || 0} suggested pairs`)
  } catch (e) {
    console.error('Scan failed', e)
    notification.error('Failed to scan for transfers')
  } finally {
    isScanning.value = false
  }
}

async function fetchCandidates() {
  isScanning.value = true
  try {
    const res = await financeApi.getTransferCandidates(90)
    candidates.value = res.data || {}
  } catch (e) {
    console.error('Failed to load transfer candidates', e)
  } finally {
    isScanning.value = false
  }
}

async function fetchHistory() {
  try {
    const res = await financeApi.getTransferHistory({ limit: 50, offset: 0 })
    transferHistory.value = res.data || { items: [], total: 0 }
  } catch (e) {
    console.error('Failed to load transfer history', e)
  }
}

async function pairSingle(pair: any) {
  pairingId.value = pair.id
  try {
    await financeApi.pairTransfer({
      source_txn_id: pair.source_transaction.id,
      target_txn_id: pair.destination_transaction.id
    })
    notification.success('Transfers successfully paired!')
    candidates.value.paired_candidates = (candidates.value.paired_candidates || []).filter(p => p.id !== pair.id)
    fetchHistory()
  } catch (e: any) {
    console.error('Pairing failed', e)
    notification.error(e.response?.data?.detail || 'Failed to link pair')
  } finally {
    pairingId.value = null
  }
}

async function approveAllHighConfidence() {
  isBatchPairing.value = true
  const pairsToLink = highConfidencePairs.value.map(p => ({
    source_txn_id: p.source_transaction.id,
    target_txn_id: p.destination_transaction.id
  }))

  try {
    const res = await financeApi.batchPairTransfers(pairsToLink)
    const pairedCount = Number(res.data?.paired_count || 0)
    const failedCount = Number(res.data?.failed_count || 0)
    const errors = Array.isArray(res.data?.errors) ? res.data.errors : []

    if (pairedCount === 0 && failedCount > 0) {
      const firstErr = errors[0]?.error || 'Unknown error'
      notification.error(`Could not link ${failedCount} pair(s): ${firstErr}`)
    } else if (failedCount > 0) {
      notification.error(`Linked ${pairedCount} pair(s), but ${failedCount} failed.`)
    } else {
      notification.success(`Paired ${pairedCount} transfers successfully!`)
    }
    await fetchCandidates()
    await fetchHistory()
  } catch (e: any) {
    console.error('Batch pairing failed', e)
    notification.error(e.response?.data?.detail || 'Failed to batch pair transfers')
  } finally {
    isBatchPairing.value = false
  }
}

async function dismissPair(pair: any) {
  pairingId.value = pair.id
  try {
    await financeApi.ignoreTransferCandidate({
      source_txn_id: pair.source_transaction.id,
      target_txn_id: pair.destination_transaction.id,
      reason: 'User dismissed candidate pair'
    })
    candidates.value.paired_candidates = (candidates.value.paired_candidates || []).filter(p => p.id !== pair.id)
    notification.info('Dismissed from transfer candidates')
  } catch (e: any) {
    console.error('Failed to dismiss pair', e)
    notification.error(e.response?.data?.detail || 'Failed to dismiss suggestion')
  } finally {
    pairingId.value = null
  }
}

async function dismissUnpaired(item: any) {
  const txnId = item.transaction.id
  creatingCounterpartId.value = txnId
  try {
    await financeApi.ignoreTransferCandidate({
      source_txn_id: txnId,
      reason: 'User dismissed candidate outflow'
    })
    candidates.value.unpaired_candidates = (candidates.value.unpaired_candidates || []).filter(
      u => u.transaction.id !== txnId
    )
    notification.info('Dismissed from transfer candidates')
  } catch (e: any) {
    console.error('Failed to dismiss unpaired outflow', e)
    notification.error(e.response?.data?.detail || 'Failed to dismiss suggestion')
  } finally {
    creatingCounterpartId.value = null
  }
}

function openCreateCounterpartModal(unpaired: any) {
  selectedUnpaired.value = unpaired
  counterpartForm.value.credited_amount = Number(unpaired.transaction.amount || 0)
  counterpartModal.value = true
}

async function submitCreateCounterpart() {
  if (!selectedUnpaired.value) return
  isCreatingCounterpart.value = true
  try {
    await financeApi.createTransferCounterpart({
      source_txn_id: selectedUnpaired.value.transaction.id,
      to_account_id: selectedUnpaired.value.suggested_destination.id,
      credited_amount: Number(counterpartForm.value.credited_amount)
    })
    notification.success('Counterpart created and linked!')
    counterpartModal.value = false
    candidates.value.unpaired_candidates = (candidates.value.unpaired_candidates || []).filter(
      u => u.transaction.id !== selectedUnpaired.value.transaction.id
    )
    fetchHistory()
  } catch (e: any) {
    console.error('Failed to create counterpart', e)
    notification.error(e.response?.data?.detail || 'Failed to create counterpart')
  } finally {
    isCreatingCounterpart.value = false
  }
}

async function unpair(txnId: string) {
  unpairingId.value = txnId
  try {
    await financeApi.unpairTransfer(txnId)
    notification.success('Transfer unlinked')
    await fetchHistory()
    await fetchCandidates()
  } catch (e) {
    console.error('Failed to unlink transfer', e)
    notification.error('Failed to unlink transfer')
  } finally {
    unpairingId.value = null
  }
}

onMounted(() => {
  fetchCandidates()
  fetchHistory()
})
</script>
