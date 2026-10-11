<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import {
  CheckCircle,
  Zap,
  ShieldCheck,
  RefreshCw,
  ClipboardList,
  Edit2,
  Trash2,
  Search,
  XCircle,
  Plus,
  Play,
  Cpu,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Calendar,
  AlertTriangle
} from 'lucide-vue-next'
import { parserApi, financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useConfirmStore } from '@/stores/confirm'
import { useCurrency } from '@/composables/useCurrency'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'

const { formatAmount } = useCurrency()
const notify = useNotificationStore()
const confirmDialog = useConfirmStore()

// State
const parserStatus = ref({ isOnline: false })
const parserStats = ref<any>(null)
const parserLogs = ref<any[]>([])
const parserLogPagination = ref({ limit: 10, skip: 0, total: 0 })

// Patterns State
const patterns = ref<any[]>([])
const patternsLoading = ref(false)
const showPatternModal = ref(false)
const isEditingPattern = ref(false)
const patternSaving = ref(false)
const patternError = ref<string | null>(null)
const patternForm = reactive({
  id: null as string | null,
  bank_name: '',
  regex_pattern: '',
  field_mapping_str: '{}',
  date_format: '',
  confidence: 1.0,
  is_ai_generated: false
})

// Sandbox State
const showSandbox = ref(false)
const sandboxForm = ref({
  content: '',
  source: 'SMS',
  sender: '',
  subject: ''
})
const sandboxResult = ref<any>(null)
const sandboxLoading = ref(false)
const sandboxError = ref<string | null>(null)

// Aliases State
const aliases = ref<any[]>([])
const aliasesLoading = ref(false)
const showAliasModal = ref(false)
const aliasSaving = ref(false)
const aliasImpact = ref<number | null>(null)
const isEditingAlias = ref(false)
const showAliasDeleteConfirm = ref(false)
const aliasToDelete = ref<any>(null)
const aliasForm = reactive({
  id: null as string | null,
  pattern: '',
  alias: '',
  update_past: false
})

const calculateSuccessRate = computed(() => {
  if (!parserStats.value?.summary?.total_processed) return 0
  const success = parserStats.value.summary.status_breakdown?.success || 0
  return Math.round((success / parserStats.value.summary.total_processed) * 100)
})

const fetchParserData = async (sourceFilter?: string, resetSkip = false) => {
  if (resetSkip) parserLogPagination.value.skip = 0

  try {
    const [health, stats, logs] = await Promise.all([
      parserApi.getHealth(),
      parserApi.getStats(),
      parserApi.getLogs({
        limit: parserLogPagination.value.limit,
        offset: parserLogPagination.value.skip,
        source: sourceFilter
      })
    ])
    parserStatus.value.isOnline = health.data?.status === 'ok'
    parserStats.value = stats.data || null
    parserLogs.value = logs.data?.logs || []
    parserLogPagination.value.total = logs.data?.total || 0
  } catch (e) {
    parserStatus.value.isOnline = false
    console.error('Failed to fetch parser data', e)
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return { day: 'N/A', meta: '' }
  const d = new Date(dateStr)
  return {
    day: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    meta: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleString()
  }
}

interface LogDetails {
  count: number
  main: any
  error: string | null
}

function getLogDetails(log: any): LogDetails | null {
  const payload = log.output_payload
  if (!payload) return null

  if (payload.results && Array.isArray(payload.results) && payload.results.length > 0) {
    return {
      count: payload.results.length,
      main: payload.results[0].transaction,
      error: null
    }
  }

  if (payload.transaction) {
    return {
      count: 1,
      main: payload.transaction,
      error: null
    }
  }

  if (payload.error) {
    return {
      count: 0,
      main: null,
      error: payload.error
    }
  }

  return null
}

// Patterns
async function loadPatterns() {
  patternsLoading.value = true
  try {
    const res = await parserApi.getPatterns({ limit: 100 })
    patterns.value = res.data.patterns || []
  } catch (err) {
    console.error('Failed to load patterns:', err)
    notify.error('Failed to load patterns')
  } finally {
    patternsLoading.value = false
  }
}

function openAddModal() {
  isEditingPattern.value = false
  patternForm.id = null
  patternForm.bank_name = ''
  patternForm.regex_pattern = ''
  patternForm.date_format = ''
  patternForm.field_mapping_str = '{\n  "amount": 1,\n  "merchant": 2,\n  "date": 3\n}'
  patternForm.confidence = 1.0
  patternForm.is_ai_generated = false
  patternError.value = null
  showPatternModal.value = true
}

function openEditModal(pattern: any) {
  try {
    isEditingPattern.value = true
    patternForm.id = pattern.id
    patternForm.bank_name = pattern.bank_name
    patternForm.regex_pattern = pattern.regex_pattern
    patternForm.date_format = pattern.date_format || ''

    const mapping = pattern.field_mapping || {}
    patternForm.field_mapping_str = JSON.stringify(mapping, null, 2)

    patternForm.confidence = pattern.confidence !== undefined ? pattern.confidence : 1.0
    patternForm.is_ai_generated = !!pattern.is_ai_generated
    patternError.value = null
    showPatternModal.value = true
  } catch (e) {
    console.error('Error opening edit modal:', e)
    notify.error('Failed to open edit modal')
  }
}

async function savePattern() {
  patternSaving.value = true
  patternError.value = null

  try {
    let mapping = {}
    try {
      mapping = JSON.parse(patternForm.field_mapping_str)
    } catch (e) {
      patternError.value = 'Invalid JSON in Field Mapping'
      patternSaving.value = false
      return
    }

    const payload = {
      bank_name: patternForm.bank_name,
      regex_pattern: patternForm.regex_pattern,
      field_mapping: mapping,
      date_format: patternForm.date_format || null,
      confidence: patternForm.confidence
    }

    if (isEditingPattern.value && patternForm.id) {
      await parserApi.updatePattern(patternForm.id, payload)
      notify.success('Pattern updated')
    } else {
      await parserApi.createPattern(payload)
      notify.success('Pattern created')
    }

    showPatternModal.value = false
    loadPatterns()
  } catch (err: any) {
    console.error('Save failed', err)
    patternError.value = err.response?.data?.detail || 'Failed to save pattern'
  } finally {
    patternSaving.value = false
  }
}

async function confirmDelete(pattern: any) {
  const isConfirmed = await confirmDialog.prompt(`Are you sure you want to delete the pattern for ${pattern.bank_name}?`, 'Delete Pattern', 'Delete', 'Cancel')
  if (!isConfirmed) return

  try {
    await parserApi.deletePattern(pattern.id)
    notify.success('Pattern deleted')
    loadPatterns()
  } catch (err) {
    notify.error('Failed to delete pattern')
  }
}

async function testParser() {
  if (!sandboxForm.value.content) return
  sandboxLoading.value = true
  sandboxError.value = null
  sandboxResult.value = null
  try {
    const res = await financeApi.testParser(sandboxForm.value)
    sandboxResult.value = res.data
    if (res.data.status === 'failed') {
      sandboxError.value = res.data.logs?.join('; ') || 'Extraction failed'
    }
  } catch (e: any) {
    sandboxError.value = e.response?.data?.detail || 'Test failed'
  } finally {
    sandboxLoading.value = false
  }
}

// Aliases
async function loadAliases() {
  aliasesLoading.value = true
  try {
    const res = await financeApi.getAliases()
    aliases.value = res.data || []
  } catch (err) {
    console.error('Failed to load aliases:', err)
    aliases.value = []
  } finally {
    aliasesLoading.value = false
  }
}

let impactDebounce: any = null
function checkAliasImpact() {
  if (!aliasForm.pattern) {
    aliasImpact.value = null
    return
  }
  if (impactDebounce) clearTimeout(impactDebounce)
  impactDebounce = setTimeout(async () => {
    try {
      const res = await financeApi.previewAliasImpact(aliasForm.pattern)
      aliasImpact.value = res.data.match_count
    } catch (e) {
      console.error(e)
    }
  }, 500)
}

function openAliasModal(alias?: any) {
  if (alias) {
    isEditingAlias.value = true
    aliasForm.id = alias.id
    aliasForm.pattern = alias.pattern
    aliasForm.alias = alias.alias
    aliasForm.update_past = false
  } else {
    isEditingAlias.value = false
    aliasForm.id = null
    aliasForm.pattern = ''
    aliasForm.alias = ''
    aliasForm.update_past = false
  }
  aliasImpact.value = null
  checkAliasImpact()
  showAliasModal.value = true
}

async function saveAlias() {
  aliasSaving.value = true
  try {
    if (isEditingAlias.value && aliasForm.id) {
      await financeApi.updateAlias(aliasForm.id, {
        pattern: aliasForm.pattern,
        alias: aliasForm.alias,
        update_past_transactions: aliasForm.update_past
      })
      notify.success('Alias updated successfully')
    } else {
      await financeApi.createAlias({
        pattern: aliasForm.pattern,
        alias: aliasForm.alias,
        update_past_transactions: aliasForm.update_past
      })
      notify.success('Alias created successfully')
    }

    if (aliasForm.update_past) {
      notify.info('Background update of transactions started')
    }
    showAliasModal.value = false
    loadAliases()
  } catch (err) {
    notify.error(isEditingAlias.value ? 'Failed to update alias' : 'Failed to create alias')
  } finally {
    aliasSaving.value = false
  }
}

function confirmDeleteAlias(alias: any) {
  aliasToDelete.value = alias
  showAliasDeleteConfirm.value = true
}

async function executeDeleteAlias() {
  if (!aliasToDelete.value) return
  try {
    await financeApi.deleteAlias(aliasToDelete.value.id)
    notify.success('Alias deleted')
    loadAliases()
  } catch (err) {
    notify.error('Failed to delete alias rule')
  } finally {
    showAliasDeleteConfirm.value = false
    aliasToDelete.value = null
  }
}

onMounted(() => {
  fetchParserData()
  loadPatterns()
  loadAliases()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 1. ENGINE STATUS & METRICS -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- Card 1: Parser Status -->
      <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-wf-md flex items-center justify-center border shrink-0"
            :class="parserStatus.isOnline ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'"
          >
            <CheckCircle v-if="parserStatus.isOnline" class="w-4 h-4" />
            <XCircle v-else class="w-4 h-4" />
          </div>
          <div>
            <p class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">Engine Status</p>
            <p
              class="text-sm font-bold mt-0.5"
              :class="parserStatus.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'"
            >
              {{ parserStatus.isOnline ? 'Active & Online' : 'Service Offline' }}
            </p>
          </div>
        </div>
      </WfCard>

      <!-- Card 2: 24h Throughput -->
      <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-wf-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Zap class="w-4 h-4" />
          </div>
          <div>
            <p class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">24h Throughput</p>
            <p class="text-sm font-bold text-wf-text-primary mt-0.5">
              {{ parserStats?.summary?.total_processed || 0 }} <span class="text-[11px] text-wf-text-muted font-normal">Requests</span>
            </p>
          </div>
        </div>
      </WfCard>

      <!-- Card 3: Success Rate -->
      <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-wf-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck class="w-4 h-4" />
          </div>
          <div>
            <p class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">Extraction Rate</p>
            <p class="text-sm font-bold text-wf-text-primary mt-0.5">
              {{ calculateSuccessRate }}% <span class="text-[11px] text-wf-text-muted font-normal">accuracy</span>
            </p>
          </div>
        </div>
      </WfCard>
    </div>

    <!-- 2. PARSER SANDBOX / TESTER -->
    <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden">
      <div class="p-3 px-4 border-b border-wf-border-subtle flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-wf-md bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center">
            <Cpu class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-wf-text-primary">Parser Sandbox</h3>
            <p class="text-[10px] text-wf-text-muted">Test extraction regex rules against raw SMS or email text</p>
          </div>
        </div>

        <WfButton
          variant="secondary"
          size="sm"
          @click="showSandbox = !showSandbox"
        >
          <component :is="showSandbox ? ChevronUp : ChevronDown" class="w-3.5 h-3.5 mr-1" />
          <span>{{ showSandbox ? 'Hide Tester' : 'Open Tester' }}</span>
        </WfButton>
      </div>

      <!-- Expandable Sandbox Console -->
      <div v-if="showSandbox" class="p-4 border-t border-wf-border-subtle bg-wf-surface-variant/20 space-y-3">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <!-- Input Form Column -->
          <div class="lg:col-span-7 space-y-2.5">
            <div>
              <label class="block text-[11px] font-bold text-wf-text-secondary mb-1">Raw SMS / Email Content</label>
              <textarea
                v-model="sandboxForm.content"
                rows="4"
                placeholder="Paste raw SMS or bank notification text here..."
                class="w-full p-2.5 rounded-wf-md bg-wf-surface border border-wf-border-subtle text-xs text-wf-text-primary font-mono focus:outline-none focus:border-wf-primary"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[9px] font-bold text-wf-text-muted uppercase mb-1">Source Type</label>
                <select
                  v-model="sandboxForm.source"
                  class="w-full h-8 px-2.5 rounded-wf-md bg-wf-surface border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
                >
                  <option value="SMS">SMS Notification</option>
                  <option value="EMAIL">Email Body</option>
                </select>
              </div>

              <div>
                <label class="block text-[9px] font-bold text-wf-text-muted uppercase mb-1">Sender / Header</label>
                <input
                  v-model="sandboxForm.sender"
                  type="text"
                  placeholder="e.g. HDFCBK or alert@bank.com"
                  class="w-full h-8 px-2.5 rounded-wf-md bg-wf-surface border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
                />
              </div>
            </div>

            <WfButton
              variant="primary"
              size="sm"
              class="w-full"
              :loading="sandboxLoading"
              @click="testParser"
            >
              <Play class="w-3.5 h-3.5 mr-1" />
              <span>Run Extraction Test</span>
            </WfButton>
          </div>

          <!-- Extraction Output Column -->
          <div class="lg:col-span-5 flex flex-col">
            <label class="block text-[11px] font-bold text-wf-text-secondary mb-1">Extraction Result</label>
            <div class="p-3 bg-wf-surface rounded-wf-md border border-wf-border-subtle flex-1 min-h-[180px] max-h-[320px] overflow-y-auto">
              <!-- Success State -->
              <div v-if="sandboxResult?.status === 'success'" class="space-y-2">
                <div class="flex items-center justify-between pb-1.5 border-b border-wf-border-subtle">
                  <span class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    MATCH SUCCESS
                  </span>
                  <span class="text-[9px] font-mono text-wf-text-muted">
                    {{ sandboxResult.results?.length || 1 }} record(s)
                  </span>
                </div>

                <div v-for="(item, idx) in sandboxResult.results" :key="idx" class="p-2.5 bg-wf-surface-variant/30 rounded-wf-md border border-wf-border-subtle text-xs space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="px-1 py-0.2 rounded-wf-xs bg-wf-primary-light text-wf-primary text-[9px] font-bold">
                      {{ item.metadata.parser_used }}
                    </span>
                    <span class="text-[9px] font-bold text-emerald-500">
                      Conf: {{ ((item.metadata.confidence || 1) * 100).toFixed(0) }}%
                    </span>
                  </div>

                  <div class="flex items-start justify-between gap-2">
                    <p class="font-bold text-wf-text-primary text-xs truncate">
                      {{ item.transaction.recipient || item.transaction.merchant?.cleaned || item.transaction.description }}
                    </p>
                    <span
                      class="text-xs font-black font-mono"
                      :class="item.transaction.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'"
                    >
                      {{ item.transaction.type === 'CREDIT' ? '+' : '-' }}{{ formatAmount(item.transaction.amount) }}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-1 text-[10px] text-wf-text-secondary pt-1 border-t border-wf-border-subtle/50">
                    <div class="flex items-center gap-1">
                      <Calendar class="w-2.5 h-2.5 text-wf-text-muted" />
                      <span>{{ new Date(item.transaction.date).toLocaleDateString('en-IN') }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <CreditCard class="w-2.5 h-2.5 text-wf-text-muted" />
                      <span>A/c: {{ item.transaction.account?.mask || '••••' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Non-Financial State -->
              <div v-else-if="sandboxResult?.status === 'ignored' || sandboxResult?.status === 'non_financial'" class="text-center py-6 space-y-1.5">
                <AlertTriangle class="w-6 h-6 text-amber-500 mx-auto" />
                <h5 class="text-xs font-bold text-amber-600 dark:text-amber-400">Non-Financial Content</h5>
                <p class="text-[10px] text-wf-text-muted max-w-xs mx-auto">
                  Filtered by classifier. Does not contain trackable transaction indicators.
                </p>
              </div>

              <!-- Failed State -->
              <div v-else-if="sandboxResult?.status === 'failed' || sandboxError" class="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-wf-md space-y-1">
                <div class="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                  <XCircle class="w-3.5 h-3.5" />
                  <span>Extraction Failed</span>
                </div>
                <p class="text-[10px] text-rose-600 dark:text-rose-400">
                  {{ sandboxError || 'No matching pattern rule found.' }}
                </p>
              </div>

              <!-- Default Placeholder -->
              <div v-else class="flex flex-col items-center justify-center h-full text-center text-wf-text-muted py-6">
                <Search class="w-6 h-6 opacity-30 mb-1.5" />
                <span class="text-xs">Extraction output will appear here</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WfCard>

    <!-- 3. PATTERNS MANAGEMENT -->
    <div class="space-y-2.5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-xs font-bold text-wf-text-primary">Parser Patterns</h3>
          <p class="text-[10px] text-wf-text-muted">Regular expression rules for extracting SMS & Email alerts</p>
        </div>
        <WfButton variant="primary" size="sm" @click="openAddModal">
          <Plus class="w-3.5 h-3.5 mr-1" />
          <span>Add Pattern</span>
        </WfButton>
      </div>

      <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/30 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
                <th class="py-2 px-3">Bank / Institution</th>
                <th class="py-2 px-3">Regex Pattern</th>
                <th class="py-2 px-3">Rule ID</th>
                <th class="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-wf-border-subtle">
              <tr v-for="pattern in patterns" :key="pattern.id" class="hover:bg-wf-surface-variant/40 transition-colors">
                <td class="py-1.5 px-3 whitespace-nowrap">
                  <span class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {{ pattern.bank_name }}
                  </span>
                </td>
                <td class="py-1.5 px-3 max-w-md">
                  <code class="block p-1 rounded-wf-xs bg-wf-surface-variant font-mono text-[9px] text-wf-text-primary break-all border border-wf-border-subtle" :title="pattern.regex_pattern">
                    {{ pattern.regex_pattern }}
                  </code>
                </td>
                <td class="py-1.5 px-3 whitespace-nowrap font-mono text-wf-text-muted text-[10px]">
                  {{ pattern.id.substring(0, 8) }}
                </td>
                <td class="py-1.5 px-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      @click="openEditModal(pattern)"
                      title="Edit Pattern"
                      class="p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      @click="confirmDelete(pattern)"
                      title="Delete Pattern"
                      class="p-1 rounded-wf-xs text-wf-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="patterns.length === 0">
                <td colspan="4" class="text-center py-6 text-wf-text-muted">No custom patterns configured.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </WfCard>
    </div>

    <!-- 4. MERCHANT ALIASES -->
    <div class="space-y-2.5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-xs font-bold text-wf-text-primary">Merchant Aliases</h3>
          <p class="text-[10px] text-wf-text-muted">Normalize raw descriptions into clean merchant names (e.g. "AMZN Mktp" &rarr; "Amazon")</p>
        </div>
        <WfButton variant="secondary" size="sm" @click="openAliasModal()">
          <Plus class="w-3.5 h-3.5 mr-1" />
          <span>Add Alias</span>
        </WfButton>
      </div>

      <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/30 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
                <th class="py-2 px-3">Raw Text Pattern</th>
                <th class="py-2 px-3">Clean Merchant Name</th>
                <th class="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-wf-border-subtle">
              <tr v-for="alias in aliases" :key="alias.id" class="hover:bg-wf-surface-variant/40 transition-colors">
                <td class="py-1.5 px-3 font-mono text-wf-text-secondary text-[10px]">
                  {{ alias.pattern }}
                </td>
                <td class="py-1.5 px-3 font-bold text-wf-primary text-xs">
                  {{ alias.alias }}
                </td>
                <td class="py-1.5 px-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      @click="openAliasModal(alias)"
                      title="Edit Alias"
                      class="p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      @click="confirmDeleteAlias(alias)"
                      title="Delete Alias"
                      class="p-1 rounded-wf-xs text-wf-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="aliases.length === 0">
                <td colspan="3" class="text-center py-6 text-wf-text-muted">No merchant aliases defined.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </WfCard>
    </div>

    <!-- 5. PARSER REQUEST HISTORY -->
    <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden">
      <div class="p-3 px-4 border-b border-wf-border-subtle flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-wf-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center">
            <ClipboardList class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-wf-text-primary">Parser Request History</h3>
            <p class="text-[10px] text-wf-text-muted">Live parse events and output records</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-wf-xs bg-wf-surface-variant text-[10px] font-mono text-wf-text-secondary border border-wf-border-subtle">
            Total: {{ parserLogPagination.total }}
          </span>
          <button
            type="button"
            @click="fetchParserData(undefined, true)"
            title="Refresh Logs"
            class="p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
          >
            <RefreshCw class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/30 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
              <th class="py-2 px-3 w-36">Time</th>
              <th class="py-2 px-3 w-20">Source</th>
              <th class="py-2 px-3 w-24">Status</th>
              <th class="py-2 px-3">Input Preview</th>
              <th class="py-2 px-3">Extracted Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-wf-border-subtle">
            <tr v-for="log in parserLogs" :key="log.id" class="hover:bg-wf-surface-variant/40 transition-colors">
              <td class="py-1.5 px-3 whitespace-nowrap text-wf-text-secondary font-mono text-[10px]">
                {{ formatDate(log.created_at).full }}
              </td>
              <td class="py-1.5 px-3 whitespace-nowrap">
                <span class="px-1.5 py-0.2 rounded-wf-xs bg-wf-surface-variant text-[9px] font-mono font-bold text-wf-text-secondary border border-wf-border-subtle uppercase">
                  {{ log.source }}
                </span>
              </td>
              <td class="py-1.5 px-3 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold uppercase tracking-wider border"
                  :class="log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'"
                >
                  {{ log.status }}
                </span>
              </td>
              <td class="py-1.5 px-3 text-wf-text-secondary max-w-xs truncate text-[11px]" :title="JSON.stringify(log.input_payload)">
                {{ log.input_payload?.message || log.input_payload?.body || log.input_payload?.content || 'Raw Input' }}
              </td>
              <td class="py-1.5 px-3 text-xs">
                <div v-for="details in [getLogDetails(log)]" :key="log.id">
                  <div v-if="details?.main" class="flex items-center gap-2">
                    <span class="font-bold text-wf-text-primary text-[11px]">{{ details.main.merchant?.cleaned || details.main.description }}</span>
                    <span class="text-wf-text-muted font-mono font-bold text-[11px]">{{ formatAmount(details.main.amount) }}</span>
                  </div>
                  <span v-else-if="details?.error" class="text-rose-500 italic text-[10px]">{{ details.error }}</span>
                  <span v-else class="text-wf-text-muted italic text-[10px]">No extraction</span>
                </div>
              </td>
            </tr>
            <tr v-if="parserLogs.length === 0">
              <td colspan="5" class="text-center py-8 text-wf-text-muted">No parser logs found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="parserLogPagination.total > parserLogPagination.limit"
        class="p-3 border-t border-wf-border-subtle flex items-center justify-between text-xs text-wf-text-secondary"
      >
        <span>
          Showing {{ parserLogPagination.skip + 1 }} - {{ Math.min(parserLogPagination.skip + parserLogPagination.limit, parserLogPagination.total) }} of {{ parserLogPagination.total }}
        </span>
        <div class="flex items-center gap-2">
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="parserLogPagination.skip === 0"
            @click="parserLogPagination.skip -= parserLogPagination.limit; fetchParserData()"
          >
            Previous
          </WfButton>
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="parserLogPagination.skip + parserLogPagination.limit >= parserLogPagination.total"
            @click="parserLogPagination.skip += parserLogPagination.limit; fetchParserData()"
          >
            Next
          </WfButton>
        </div>
      </div>
    </WfCard>

    <!-- MODAL 1: ADD / EDIT PATTERN -->
    <WfModal
      v-model="showPatternModal"
      :title="isEditingPattern ? 'Edit Parser Pattern' : 'New Parser Pattern'"
      max-width="lg"
    >
      <form @submit.prevent="savePattern" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-wf-text-secondary mb-1">Bank / Application Name *</label>
          <input
            v-model="patternForm.bank_name"
            type="text"
            required
            placeholder="e.g. HDFC Bank"
            class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-wf-text-secondary mb-1">Regex Pattern *</label>
          <textarea
            v-model="patternForm.regex_pattern"
            required
            rows="3"
            placeholder="Regex to capture transactions..."
            class="w-full p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary font-mono focus:outline-none focus:border-wf-primary"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-wf-text-secondary mb-1">Date Format (Optional)</label>
          <input
            v-model="patternForm.date_format"
            type="text"
            placeholder="e.g. %d-%b-%y for 14-Feb-26"
            class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary font-mono focus:outline-none focus:border-wf-primary"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-wf-text-secondary mb-1">Field Mapping (JSON Group Indices)</label>
          <textarea
            v-model="patternForm.field_mapping_str"
            rows="3"
            placeholder='{"amount": 1, "merchant": 2}'
            class="w-full p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary font-mono focus:outline-none focus:border-wf-primary"
          />
        </div>

        <div v-if="patternError" class="p-3 rounded-wf-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
          {{ patternError }}
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-wf-border-subtle">
          <WfButton variant="secondary" size="md" type="button" @click="showPatternModal = false">
            Cancel
          </WfButton>
          <WfButton variant="primary" size="md" type="submit" :loading="patternSaving">
            {{ isEditingPattern ? 'Update Pattern' : 'Create Pattern' }}
          </WfButton>
        </div>
      </form>
    </WfModal>

    <!-- MODAL 2: ADD / EDIT ALIAS -->
    <WfModal
      v-model="showAliasModal"
      :title="isEditingAlias ? 'Edit Merchant Alias' : 'New Merchant Alias'"
      max-width="md"
    >
      <form @submit.prevent="saveAlias" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-wf-text-secondary mb-1">Raw Text Pattern *</label>
          <input
            v-model="aliasForm.pattern"
            type="text"
            required
            placeholder="e.g. AMZN MKTP"
            @input="checkAliasImpact"
            class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary uppercase focus:outline-none focus:border-wf-primary"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-wf-text-secondary mb-1">Clean Merchant Name *</label>
          <input
            v-model="aliasForm.alias"
            type="text"
            required
            placeholder="e.g. Amazon"
            class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
          />
        </div>

        <div class="p-3 bg-wf-surface-variant/30 rounded-wf-md border border-wf-border-subtle space-y-1">
          <div class="flex items-center gap-2">
            <input
              v-model="aliasForm.update_past"
              type="checkbox"
              id="update_past"
              class="w-4 h-4 rounded text-wf-primary focus:ring-wf-primary"
            />
            <label for="update_past" class="text-xs font-bold text-wf-text-primary cursor-pointer">
              Update historical transactions?
            </label>
          </div>
          <p v-if="aliasImpact !== null" class="text-[11px] text-wf-text-secondary pl-6">
            Will re-categorize approximately <strong class="text-wf-primary">{{ aliasImpact }}</strong> transactions.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-wf-border-subtle">
          <WfButton variant="secondary" size="md" type="button" @click="showAliasModal = false">
            Cancel
          </WfButton>
          <WfButton variant="primary" size="md" type="submit" :loading="aliasSaving">
            {{ isEditingAlias ? 'Update Alias' : 'Create Rule' }}
          </WfButton>
        </div>
      </form>
    </WfModal>

    <!-- MODAL 3: DELETE ALIAS CONFIRM -->
    <WfModal
      v-model="showAliasDeleteConfirm"
      title="Delete Merchant Alias"
      max-width="sm"
    >
      <div class="space-y-4">
        <p class="text-xs text-wf-text-secondary">
          Are you sure you want to delete the alias for <strong class="text-wf-primary font-bold">{{ aliasToDelete?.alias }}</strong>?
        </p>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-wf-border-subtle">
          <WfButton variant="secondary" size="md" @click="showAliasDeleteConfirm = false">
            Cancel
          </WfButton>
          <WfButton variant="primary" size="md" class="bg-rose-500 hover:bg-rose-600" @click="executeDeleteAlias">
            Delete
          </WfButton>
        </div>
      </div>
    </WfModal>
  </div>
</template>
