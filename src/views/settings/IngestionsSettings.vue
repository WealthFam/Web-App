<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import {
  Activity,
  Search,
  RefreshCw,
  ShieldBan,
  ShieldCheck,
  MessageSquare,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  AlertTriangle,
  Plus,
  Trash2,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  FilterX,
  Copy,
  Check
} from 'lucide-vue-next'

const route = useRoute()
const notify = useNotificationStore()

// State
const loading = ref(false)
const items = ref<any[]>([])
const total = ref(0)
const summary = ref({
  total: 0,
  added_to_ledger: 0,
  needs_review: 0,
  action_needed: 0,
  ignored_or_duplicates: 0,
  statement_queued: 0
})
const facets = ref<{
  users: any[]
  devices: any[]
  mailboxes: any[]
  accounts: any[]
}>({
  users: [],
  devices: [],
  mailboxes: [],
  accounts: []
})

const expandedIds = ref<Record<string, boolean>>({})
const ignoreRules = ref<any[]>([])
const loadingRules = ref(false)

// Filters (Default: Last 7 Days; capped to 14-day retention window)
const RETENTION_DAYS = 14
const datePreset = ref<'today' | 'yesterday' | '7d' | '14d' | 'custom'>('7d')
const minRetentionDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - (RETENTION_DAYS - 1))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})
const filters = reactive({
  source: 'ALL', // ALL | SMS | EMAIL
  outcome: 'ALL',
  user_id: '',
  sourceTarget: '', // device:<device_id> or email:<config_id>
  account_id: '',
  search: '',
  customStart: '',
  customEnd: '',
  skip: 0,
  limit: 25
})

// Ignore Rule Modal State
const showIgnoreRulesModal = ref(false)
const showCreateIgnoreModal = ref(false)
const creatingIgnore = ref(false)
const ignoreSearchQuery = ref('')
const ignoreSourceFilter = ref<'ALL' | 'SMS' | 'EMAIL' | 'STATEMENT'>('ALL')
const ignoreKindFilter = ref<'ALL' | 'ignored_pattern' | 'spam_filter'>('ALL')
const expandedRuleIds = ref<Record<string, boolean>>({})
const selectedRuleIds = ref<string[]>([])
const isBulkDeletingRules = ref(false)
const copiedRuleId = ref<string | null>(null)

const ignoreForm = reactive({
  source: 'SMS',
  matchType: 'sender' as 'sender' | 'subject' | 'pattern',
  sender: '',
  subject: '',
  pattern: ''
})

const filteredIgnoreRules = computed(() => {
  return ignoreRules.value.filter(r => {
    // Channel / Source filter
    if (ignoreSourceFilter.value !== 'ALL') {
      const src = (r.source || '').toUpperCase()
      if (src !== ignoreSourceFilter.value && src !== 'ALL') return false
    }
    // Rule kind filter
    if (ignoreKindFilter.value !== 'ALL' && r.rule_kind !== ignoreKindFilter.value) {
      return false
    }
    // Search
    if (ignoreSearchQuery.value.trim()) {
      const q = ignoreSearchQuery.value.trim().toLowerCase()
      const text = `${r.pattern || ''} ${r.sender || ''} ${r.subject || ''} ${r.source || ''}`.toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  })
})

const triageRulesCount = computed(() => {
  return ignoreRules.value.filter(r => r.rule_kind === 'ignored_pattern').length
})

const customRulesCount = computed(() => {
  return ignoreRules.value.filter(r => r.rule_kind === 'spam_filter').length
})

const smsRulesCount = computed(() => {
  return ignoreRules.value.filter(r => (r.source || '').toUpperCase() === 'SMS').length
})

const emailRulesCount = computed(() => {
  return ignoreRules.value.filter(r => (r.source || '').toUpperCase() === 'EMAIL').length
})

const allFilteredSelected = computed(() => {
  if (filteredIgnoreRules.value.length === 0) return false
  return filteredIgnoreRules.value.every(r => selectedRuleIds.value.includes(r.id))
})

// Unrecognized Sample Consent Modal
const showReportModal = ref(false)
const reportingLoading = ref(false)
const previewLoading = ref(false)
const reportTargetItem = ref<any>(null)
const reportState = reactive({
  sourceType: 'SMS',
  senderOrHeader: '',
  rawContent: '',
  anonymizedContent: '',
  isFallbackMask: false,
  userConsented: false
})

const outcomeOptions = [
  { value: 'ALL', label: 'All Outcomes' },
  { value: 'added_to_ledger', label: 'Added to Ledger' },
  { value: 'moved_to_triage', label: 'Needs Review (Triage)' },
  { value: 'statement_queued', label: 'Statement Processed' },
  { value: 'blocked_unlinked_account', label: 'Account Not Linked' },
  { value: 'duplicate_skipped', label: 'Duplicate Skipped' },
  { value: 'ignored_by_rule', label: 'Ignored by Your Rule' },
  { value: 'ignored_non_financial', label: 'Ignored Non-Financial / OTP' },
  { value: 'unrecognized_alert', label: 'Unrecognized Alert' }
]

const datePresetOptions = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '14d', label: 'Last 14 Days' },
  { id: 'custom', label: 'Custom Range (14d max)' }
] as const

function computeDateBounds(): { start_date?: string; end_date?: string } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  if (datePreset.value === 'today') {
    return { start_date: startOfDay(now).toISOString(), end_date: endOfDay(now).toISOString() }
  }
  if (datePreset.value === 'yesterday') {
    const y = new Date(now)
    y.setDate(now.getDate() - 1)
    return { start_date: startOfDay(y).toISOString(), end_date: endOfDay(y).toISOString() }
  }
  if (datePreset.value === '7d') {
    const s = new Date(now)
    s.setDate(now.getDate() - 6)
    return { start_date: startOfDay(s).toISOString(), end_date: endOfDay(now).toISOString() }
  }
  if (datePreset.value === '14d') {
    const s = new Date(now)
    s.setDate(now.getDate() - 13)
    return { start_date: startOfDay(s).toISOString(), end_date: endOfDay(now).toISOString() }
  }
  if (datePreset.value === 'custom') {
    const res: { start_date?: string; end_date?: string } = {}
    if (filters.customStart) {
      const [y, m, d] = filters.customStart.split('-').map(Number)
      if (y && m && d) res.start_date = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString()
    }
    if (filters.customEnd) {
      const [y, m, d] = filters.customEnd.split('-').map(Number)
      if (y && m && d) res.end_date = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
    }
    return res
  }
  return {}
}

const sourceTargetOptions = computed(() => {
  const opts: { value: string; label: string }[] = []
  if (filters.source !== 'EMAIL') {
    for (const d of facets.value.devices) {
      opts.push({ value: `device:${d.id}`, label: `Device: ${d.name}` })
    }
  }
  if (filters.source !== 'SMS') {
    for (const m of facets.value.mailboxes) {
      opts.push({ value: `email:${m.id}`, label: `Mailbox: ${m.email}` })
    }
  }
  return opts
})

const hasActiveCustomFilters = computed(() => {
  return (
    datePreset.value !== '7d' ||
    filters.source !== 'ALL' ||
    filters.outcome !== 'ALL' ||
    !!filters.user_id ||
    !!filters.sourceTarget ||
    !!filters.account_id ||
    !!filters.search.trim()
  )
})

async function fetchActivity(resetPage = false) {
  if (resetPage) filters.skip = 0
  loading.value = true
  try {
    const bounds = computeDateBounds()
    const params: Record<string, any> = {
      source: filters.source,
      skip: filters.skip,
      limit: filters.limit,
      ...bounds
    }
    if (filters.outcome && filters.outcome !== 'ALL') params.outcome = filters.outcome
    if (filters.user_id) params.user_id = filters.user_id
    if (filters.account_id) params.account_id = filters.account_id
    if (filters.search.trim()) params.search = filters.search.trim()
    if (filters.sourceTarget.startsWith('device:')) {
      params.device_id = filters.sourceTarget.slice('device:'.length)
    } else if (filters.sourceTarget.startsWith('email:')) {
      params.config_id = filters.sourceTarget.slice('email:'.length)
    }

    const res = await financeApi.getIngestionActivity(params)
    items.value = res.data.items || []
    total.value = res.data.total || 0
    if (res.data.summary) summary.value = res.data.summary
    if (res.data.facets) facets.value = res.data.facets
  } catch (e) {
    console.error('Failed to load ingestion activity', e)
    notify.error('Could not load ingestion activity')
  } finally {
    loading.value = false
  }
}

async function fetchIgnoreRules() {
  loadingRules.value = true
  try {
    const res = await financeApi.getIgnoreRules()
    ignoreRules.value = res.data || []
  } catch (e) {
    console.error('Failed to load ignore rules', e)
  } finally {
    loadingRules.value = false
  }
}

function resetFilters() {
  datePreset.value = '7d'
  filters.source = 'ALL'
  filters.outcome = 'ALL'
  filters.user_id = ''
  filters.sourceTarget = ''
  filters.account_id = ''
  filters.search = ''
  filters.customStart = ''
  filters.customEnd = ''
  fetchActivity(true)
}

function toggleExpand(id: string) {
  expandedIds.value[id] = !expandedIds.value[id]
}

function formatDate(dateStr?: string) {
  if (!dateStr) return { full: '—', date: '—' }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return { full: dateStr, date: dateStr }
  return {
    full: d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }),
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
}

function outcomeMeta(outcome: string) {
  switch (outcome) {
    case 'added_to_ledger':
      return { label: 'Added to Ledger', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' }
    case 'moved_to_triage':
      return { label: 'Needs Review', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25' }
    case 'statement_queued':
      return { label: 'Statement Processed', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25' }
    case 'blocked_unlinked_account':
      return { label: 'Account Not Linked', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25' }
    case 'duplicate_skipped':
      return { label: 'Duplicate Skipped', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25' }
    case 'ignored_by_rule':
      return { label: 'Ignored by Rule', cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25' }
    case 'ignored_non_financial':
      return { label: 'Non-Financial / OTP', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
    case 'unrecognized_alert':
      return { label: 'Unrecognized Alert', cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25' }
    default:
      return { label: outcome.replace(/_/g, ' '), cls: 'bg-wf-surface-variant text-wf-text-muted border-wf-border-subtle' }
  }
}

function openCreateIgnoreModal(item?: any) {
  if (item) {
    ignoreForm.source = item.source === 'EMAIL' ? 'EMAIL' : 'SMS'
    ignoreForm.sender = item.sender || ''
    ignoreForm.subject = item.subject || ''
    ignoreForm.pattern = ''
    ignoreForm.matchType = item.sender ? 'sender' : item.subject ? 'subject' : 'pattern'
  } else {
    ignoreForm.source = filters.source === 'EMAIL' ? 'EMAIL' : 'SMS'
    ignoreForm.matchType = 'sender'
    ignoreForm.sender = ''
    ignoreForm.subject = ''
    ignoreForm.pattern = ''
  }
  showCreateIgnoreModal.value = true
}

async function submitIgnoreRule() {
  const payload: any = { source: ignoreForm.source }
  if (ignoreForm.matchType === 'sender') {
    if (!ignoreForm.sender.trim()) return notify.error('Enter a sender address or ID to ignore')
    payload.sender = ignoreForm.sender.trim()
  } else if (ignoreForm.matchType === 'subject') {
    if (!ignoreForm.subject.trim()) return notify.error('Enter a subject phrase to ignore')
    payload.subject = ignoreForm.subject.trim()
  } else {
    if (!ignoreForm.pattern.trim()) return notify.error('Enter a keyword or phrase to ignore')
    payload.pattern = ignoreForm.pattern.trim()
  }

  creatingIgnore.value = true
  try {
    await financeApi.createIgnoreRule(payload)
    notify.success('Ignore rule saved — matching future messages will be discarded automatically')
    showCreateIgnoreModal.value = false
    await Promise.all([fetchIgnoreRules(), fetchActivity()])
  } catch (e: any) {
    notify.error(e?.response?.data?.detail || 'Failed to save ignore rule')
  } finally {
    creatingIgnore.value = false
  }
}

async function allowFutureRule(ruleId: string) {
  try {
    await financeApi.deleteIgnoreRule(ruleId)
    notify.success('Rule removed — matching messages will be allowed again')
    selectedRuleIds.value = selectedRuleIds.value.filter(id => id !== ruleId)
    await Promise.all([fetchIgnoreRules(), fetchActivity()])
  } catch (e) {
    notify.error('Could not remove ignore rule')
  }
}

function toggleExpandRule(id: string) {
  expandedRuleIds.value[id] = !expandedRuleIds.value[id]
}

function copyRuleContent(rule: any) {
  const content = rule.pattern || rule.sender || rule.subject || ''
  if (!content) return
  navigator.clipboard.writeText(content)
  copiedRuleId.value = rule.id
  notify.success('Copied pattern to clipboard')
  setTimeout(() => {
    if (copiedRuleId.value === rule.id) copiedRuleId.value = null
  }, 2000)
}

function toggleSelectAllRules() {
  if (allFilteredSelected.value) {
    const currentIds = new Set(filteredIgnoreRules.value.map(r => r.id))
    selectedRuleIds.value = selectedRuleIds.value.filter(id => !currentIds.has(id))
  } else {
    const newSet = new Set(selectedRuleIds.value)
    filteredIgnoreRules.value.forEach(r => newSet.add(r.id))
    selectedRuleIds.value = Array.from(newSet)
  }
}

function toggleSelectRule(id: string) {
  const idx = selectedRuleIds.value.indexOf(id)
  if (idx >= 0) {
    selectedRuleIds.value.splice(idx, 1)
  } else {
    selectedRuleIds.value.push(id)
  }
}

async function bulkAllowSelectedRules() {
  if (selectedRuleIds.value.length === 0) return
  if (!confirm(`Are you sure you want to allow ${selectedRuleIds.value.length} selected rule(s)? Matching future messages will be processed.`)) return

  isBulkDeletingRules.value = true
  try {
    const res = await financeApi.bulkDeleteIgnoreRules({ rule_ids: selectedRuleIds.value })
    notify.success(`Allowed ${res.data?.count ?? selectedRuleIds.value.length} rule(s)`)
    selectedRuleIds.value = []
    await Promise.all([fetchIgnoreRules(), fetchActivity()])
  } catch (e) {
    notify.error('Failed to remove selected rules')
  } finally {
    isBulkDeletingRules.value = false
  }
}

async function clearAllTriagePatterns() {
  if (triageRulesCount.value === 0) return
  if (!confirm(`Are you sure you want to clear all ${triageRulesCount.value} auto-generated triage ignore rules? This will NOT affect your custom sender or spam rules.`)) return

  isBulkDeletingRules.value = true
  try {
    const res = await financeApi.bulkDeleteIgnoreRules({ rule_kind: 'ignored_pattern', clear_all: true })
    notify.success(`Cleared ${res.data?.count ?? triageRulesCount.value} triage patterns — messages will no longer be blocked by these snippets`)
    selectedRuleIds.value = []
    await Promise.all([fetchIgnoreRules(), fetchActivity()])
  } catch (e) {
    notify.error('Failed to clear triage patterns')
  } finally {
    isBulkDeletingRules.value = false
  }
}

async function openReportModal(item: any) {
  reportTargetItem.value = item
  reportState.sourceType = item.source === 'EMAIL' ? 'EMAIL' : 'SMS'
  reportState.senderOrHeader = item.sender || ''
  reportState.rawContent = item.raw_content || ''
  reportState.anonymizedContent = item.raw_content || ''
  reportState.isFallbackMask = false
  reportState.userConsented = false
  showReportModal.value = true

  previewLoading.value = true
  try {
    const res = await financeApi.previewAnonymizedAlert({
      raw_content: item.raw_content || item.subject || '',
      sender_or_header: item.sender || '',
      source_type: reportState.sourceType
    })
    reportState.anonymizedContent = res.data.anonymized_content || item.raw_content || ''
    reportState.isFallbackMask = !!res.data?.meta?.fallback
  } catch (e) {
    console.error('Failed to preview anonymized alert', e)
  } finally {
    previewLoading.value = false
  }
}

async function submitAnonymizedSample() {
  if (!reportState.userConsented) {
    return notify.error('Please confirm consent before submitting the anonymized sample')
  }
  reportingLoading.value = true
  try {
    await financeApi.reportUnrecognizedAlert({
      source_type: reportState.sourceType,
      sender_or_header: reportState.senderOrHeader,
      raw_or_anonymized_content: reportState.anonymizedContent,
      user_consented: true
    })
    notify.success('Anonymized alert sample submitted. Thank you for helping improve detection!')
    showReportModal.value = false
  } catch (e: any) {
    notify.error(e?.response?.data?.detail || 'Unable to submit anonymized sample right now')
  } finally {
    reportingLoading.value = false
  }
}

let searchTimer: any = null
watch(
  () => filters.search,
  () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => fetchActivity(true), 300)
  }
)

watch(
  () => [datePreset.value, filters.source, filters.outcome, filters.user_id, filters.sourceTarget, filters.account_id, filters.customStart, filters.customEnd],
  () => {
    fetchActivity(true)
  }
)

onMounted(() => {
  const qSrc = typeof route.query.source === 'string' ? route.query.source.toUpperCase() : ''
  if (qSrc === 'SMS' || qSrc === 'EMAIL') {
    filters.source = qSrc
  }
  fetchActivity(true)
  fetchIgnoreRules()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 1. SUMMARY KPI STRIP -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      <div class="p-3 rounded-wf-lg border border-wf-border-subtle bg-wf-surface">
        <p class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">Messages Received</p>
        <p class="text-xl font-black text-wf-text-primary mt-0.5 tabular-nums">{{ summary.total }}</p>
      </div>

      <div class="p-3 rounded-wf-lg border border-wf-border-subtle bg-wf-surface">
        <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Added to Ledger</p>
        <p class="text-xl font-black text-wf-text-primary mt-0.5 tabular-nums">{{ summary.added_to_ledger }}</p>
      </div>

      <div class="p-3 rounded-wf-lg border border-wf-border-subtle bg-wf-surface">
        <p class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Needs Review</p>
        <p class="text-xl font-black text-wf-text-primary mt-0.5 tabular-nums">{{ summary.needs_review }}</p>
      </div>

      <div class="p-3 rounded-wf-lg border border-wf-border-subtle bg-wf-surface">
        <p class="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Action Needed</p>
        <p class="text-xl font-black text-wf-text-primary mt-0.5 tabular-nums">{{ summary.action_needed }}</p>
      </div>

      <div class="p-3 rounded-wf-lg border border-wf-border-subtle bg-wf-surface col-span-2 sm:col-span-1">
        <p class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">Ignored & Duplicates</p>
        <p class="text-xl font-black text-wf-text-primary mt-0.5 tabular-nums">{{ summary.ignored_or_duplicates }}</p>
      </div>
    </div>

    <!-- 14-DAY RETENTION NOTICE -->
    <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-wf-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300">
      <Clock class="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>
        <strong>14-Day Log Retention:</strong> Diagnostic SMS &amp; email ingestion logs are permanently auto-purged after 14 days for privacy and storage hygiene. Your ledger transactions remain permanently.
      </span>
    </div>

    <!-- 2. FILTER BAR -->
    <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <!-- Source Pills -->
        <div class="flex items-center gap-2 flex-wrap">
          <div class="inline-flex items-center p-0.5 bg-wf-surface-variant border border-wf-border-subtle rounded-wf-md">
            <button
              v-for="src in ['ALL', 'SMS', 'EMAIL']"
              :key="src"
              type="button"
              @click="filters.source = src; filters.sourceTarget = ''"
              class="px-3 py-1 rounded-wf-sm text-xs font-semibold transition-all flex items-center gap-1.5"
              :class="filters.source === src ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60 font-bold' : 'text-wf-text-secondary hover:text-wf-text-primary'"
            >
              <Activity v-if="src === 'ALL'" class="w-3.5 h-3.5" />
              <MessageSquare v-else-if="src === 'SMS'" class="w-3.5 h-3.5" />
              <Mail v-else class="w-3.5 h-3.5" />
              <span>{{ src === 'ALL' ? 'All Sources' : src }}</span>
            </button>
          </div>

          <!-- Date Range Presets -->
          <div class="flex items-center gap-1.5">
            <select
              v-model="datePreset"
              class="h-8 px-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs font-medium text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
            >
              <option v-for="p in datePresetOptions" :key="p.id" :value="p.id">{{ p.label }}</option>
            </select>

            <template v-if="datePreset === 'custom'">
              <input
                v-model="filters.customStart"
                type="date"
                :min="minRetentionDate"
                class="h-8 px-2 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs text-wf-text-primary"
              />
              <span class="text-xs text-wf-text-muted">to</span>
              <input
                v-model="filters.customEnd"
                type="date"
                :min="minRetentionDate"
                class="h-8 px-2 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs text-wf-text-primary"
              />
            </template>
          </div>
        </div>

        <!-- Right Controls -->
        <div class="flex items-center gap-2">
          <WfButton variant="secondary" size="sm" @click="showIgnoreRulesModal = true">
            <ShieldBan class="w-3.5 h-3.5 mr-1.5" />
            <span>Ignored Rules ({{ ignoreRules.length }})</span>
          </WfButton>
          <WfButton variant="ghost" size="sm" @click="fetchActivity(false)" title="Refresh feed">
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          </WfButton>
        </div>
      </div>

      <!-- Facet Selects + Search -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <select
          v-model="filters.user_id"
          class="h-8 px-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
        >
          <option value="">All People</option>
          <option v-for="u in facets.users" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>

        <select
          v-model="filters.sourceTarget"
          class="h-8 px-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
        >
          <option value="">All Devices & Mailboxes</option>
          <option v-for="t in sourceTargetOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>

        <select
          v-model="filters.account_id"
          class="h-8 px-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
        >
          <option value="">All Accounts</option>
          <option v-for="a in facets.accounts" :key="a.id" :value="a.id">
            {{ a.name }}{{ a.mask ? ` (••${a.mask})` : '' }}
          </option>
        </select>

        <select
          v-model="filters.outcome"
          class="h-8 px-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
        >
          <option v-for="o in outcomeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>

        <div class="flex items-center gap-1.5">
          <div class="relative flex-1">
            <Search class="w-3.5 h-3.5 text-wf-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search message, sender, merchant..."
              class="w-full h-8 pl-8 pr-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
            />
          </div>
          <button
            v-if="hasActiveCustomFilters"
            type="button"
            @click="resetFilters"
            title="Reset all filters"
            class="h-8 px-2 rounded-wf-md border border-wf-border-subtle text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
          >
            <FilterX class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </WfCard>

    <!-- 3. ITEMIZED ACTIVITY LIST -->
    <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden">
      <div v-if="loading && items.length === 0" class="py-12 text-center text-xs text-wf-text-muted">
        Loading ingestion activity...
      </div>

      <div v-else-if="items.length === 0" class="py-12 px-4 text-center space-y-2">
        <Clock class="w-7 h-7 text-wf-text-muted mx-auto opacity-60" />
        <p class="text-sm font-semibold text-wf-text-primary">No messages matched these filters</p>
        <p class="text-xs text-wf-text-muted">
          Showing activity for <strong class="text-wf-text-secondary">{{ datePresetOptions.find(d => d.id === datePreset)?.label }}</strong>. Try switching to Last 7 Days or Last 14 Days.
        </p>
        <WfButton v-if="datePreset === 'today'" variant="secondary" size="sm" @click="datePreset = '7d'">
          Show Last 7 Days
        </WfButton>
      </div>

      <div v-else class="divide-y divide-wf-border-subtle">
        <div
          v-for="item in items"
          :key="item.id"
          class="p-3.5 sm:px-4 hover:bg-wf-surface-variant/25 transition-colors space-y-2"
        >
          <!-- Top Meta Row -->
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-2.5">
            <div class="space-y-1 min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <!-- Source Badge -->
                <span
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-wf-xs text-[10px] font-bold uppercase tracking-wider border"
                  :class="item.source === 'SMS' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'"
                >
                  <MessageSquare v-if="item.source === 'SMS'" class="w-2.5 h-2.5" />
                  <Mail v-else class="w-2.5 h-2.5" />
                  <span>{{ item.source }}</span>
                </span>

                <!-- Outcome Badge -->
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold border"
                  :class="outcomeMeta(item.outcome).cls"
                >
                  {{ outcomeMeta(item.outcome).label }}
                </span>

                <span class="text-[11px] font-medium text-wf-text-muted">
                  {{ formatDate(item.timestamp).full }}
                </span>

                <span
                  v-if="item.user_name"
                  class="px-1.5 py-0.5 rounded bg-wf-surface-variant text-[10px] font-medium text-wf-text-secondary"
                >
                  {{ item.user_name }}
                </span>
                <span
                  v-if="item.device_or_mailbox"
                  class="px-1.5 py-0.5 rounded bg-wf-surface-variant text-[10px] text-wf-text-muted truncate max-w-[200px]"
                  :title="item.device_or_mailbox"
                >
                  {{ item.device_or_mailbox }}
                </span>
              </div>

              <!-- Sender & Subject -->
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span class="text-xs font-bold text-wf-text-primary">{{ item.sender }}</span>
                <span v-if="item.subject" class="text-xs font-semibold text-wf-text-secondary truncate max-w-xl" :title="item.subject">
                  — {{ item.subject }}
                </span>
              </div>

              <!-- Plain Explanation + Extracted Summary -->
              <p class="text-xs text-wf-text-secondary">
                {{ item.user_reason || outcomeMeta(item.outcome).label }}
                <template v-if="item.extracted_summary">
                  <span class="mx-1 text-wf-text-muted">•</span>
                  <span v-if="item.extracted_summary.amount !== null && item.extracted_summary.amount !== undefined" class="font-semibold text-wf-text-primary">
                    ₹{{ Math.abs(item.extracted_summary.amount).toLocaleString('en-IN') }}
                  </span>
                  <span v-if="item.extracted_summary.merchant" class="text-wf-text-secondary">
                    at <strong>{{ item.extracted_summary.merchant }}</strong>
                  </span>
                  <span v-if="item.account_name" class="text-wf-text-muted">
                    ({{ item.account_name }}{{ item.account_mask ? ` ••${item.account_mask}` : '' }})
                  </span>
                </template>
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-1.5 shrink-0">
              <router-link
                v-if="item.outcome === 'added_to_ledger' && item.transaction_id"
                :to="{ path: '/transactions', query: { id: item.transaction_id } }"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-[11px] font-semibold text-wf-primary hover:bg-wf-surface-variant transition-colors"
              >
                <span>View Transaction</span>
                <ExternalLink class="w-3 h-3" />
              </router-link>

              <router-link
                v-else-if="item.outcome === 'moved_to_triage'"
                :to="{ path: '/categories', query: { tab: 'rules' } }"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-wf-md border border-amber-500/30 bg-amber-500/10 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:opacity-85"
              >
                <span>Review Triage</span>
                <ExternalLink class="w-3 h-3" />
              </router-link>

              <router-link
                v-else-if="item.outcome === 'blocked_unlinked_account'"
                :to="{ path: '/accounts', query: item.account_mask ? { mask: item.account_mask } : undefined }"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-wf-md border border-rose-500/30 bg-rose-500/10 text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:opacity-85"
              >
                <LinkIcon class="w-3 h-3" />
                <span>Link Account</span>
              </router-link>

              <router-link
                v-else-if="item.outcome === 'statement_queued'"
                :to="{ path: '/statements' }"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-wf-md border border-sky-500/30 bg-sky-500/10 text-[11px] font-semibold text-sky-700 dark:text-sky-400 hover:opacity-85"
              >
                <span>Statements</span>
                <ExternalLink class="w-3 h-3" />
              </router-link>

              <button
                v-if="item.outcome === 'ignored_by_rule' && item.rule_active && item.rule_id"
                type="button"
                @click="allowFutureRule(item.rule_id)"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-wf-md border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:opacity-85"
              >
                <ShieldCheck class="w-3 h-3" />
                <span>Allow</span>
              </button>

              <button
                v-else-if="item.outcome !== 'ignored_by_rule'"
                type="button"
                @click="openCreateIgnoreModal(item)"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-[11px] font-medium text-wf-text-secondary hover:text-rose-600 hover:border-rose-300 transition-colors"
              >
                <ShieldBan class="w-3 h-3" />
                <span>Ignore</span>
              </button>

              <button
                v-if="item.outcome === 'unrecognized_alert' && item.raw_content"
                type="button"
                @click="openReportModal(item)"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-wf-md border border-indigo-500/30 bg-indigo-500/10 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:opacity-85"
              >
                <Send class="w-3 h-3" />
                <span>Report Anonymized</span>
              </button>

              <button
                v-if="item.raw_content"
                type="button"
                @click="toggleExpand(item.id)"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-wf-md border border-wf-border-subtle bg-wf-surface-variant/60 text-[11px] font-medium text-wf-text-secondary hover:text-wf-text-primary transition-colors"
              >
                <ChevronUp v-if="expandedIds[item.id]" class="w-3 h-3" />
                <ChevronDown v-else class="w-3 h-3" />
                <span>{{ expandedIds[item.id] ? 'Hide Content' : 'View Content' }}</span>
              </button>
            </div>
          </div>

          <!-- Inline Message Preview & Full Expandable Content -->
          <div v-if="item.raw_content" class="pt-0.5">
            <div
              v-if="expandedIds[item.id]"
              class="p-2.5 rounded-wf-md bg-wf-surface-variant/60 border border-wf-border-subtle text-xs text-wf-text-primary font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto"
            >{{ item.raw_content }}</div>
            <p
              v-else
              @click="toggleExpand(item.id)"
              class="text-[11px] text-wf-text-muted bg-wf-surface-variant/40 border border-wf-border-subtle/70 rounded px-2.5 py-1.5 line-clamp-2 cursor-pointer hover:bg-wf-surface-variant/70 transition-colors"
              title="Click to inspect full message content"
            >
              {{ item.raw_content }}
            </p>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="total > filters.limit"
        class="p-3 border-t border-wf-border-subtle flex items-center justify-between text-xs text-wf-text-secondary"
      >
        <span>
          Showing {{ filters.skip + 1 }} – {{ Math.min(filters.skip + filters.limit, total) }} of {{ total }}
        </span>
        <div class="flex items-center gap-2">
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="filters.skip === 0"
            @click="filters.skip = Math.max(0, filters.skip - filters.limit); fetchActivity(false)"
          >
            Previous
          </WfButton>
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="filters.skip + filters.limit >= total"
            @click="filters.skip += filters.limit; fetchActivity(false)"
          >
            Next
          </WfButton>
        </div>
      </div>
    </WfCard>

    <!-- MODAL 1: IGNORED RULES LIST -->
    <WfModal v-model="showIgnoreRulesModal" :title="`Ignored Senders & Keywords (${ignoreRules.length})`" maxWidth="4xl">
      <div class="space-y-3.5">
        <!-- Top Description & Add Rule Button -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-wf-border-subtle">
          <p class="text-xs text-wf-text-secondary leading-relaxed">
            Messages matching these rules are discarded before ingestion. Click any row to expand its full content, or use <strong>Allow</strong> to unblock.
          </p>
          <div class="flex items-center gap-2 shrink-0">
            <WfButton
              v-if="triageRulesCount > 0"
              variant="outline"
              size="sm"
              class="text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              :disabled="isBulkDeletingRules"
              @click="clearAllTriagePatterns()"
              title="Purge all auto-generated patterns created during bulk triage rejection"
            >
              <Trash2 class="w-3.5 h-3.5 mr-1" />
              Clear Triage Rules ({{ triageRulesCount }})
            </WfButton>
            <WfButton size="sm" @click="openCreateIgnoreModal()">
              <Plus class="w-3.5 h-3.5 mr-1" />
              Add Rule
            </WfButton>
          </div>
        </div>

        <!-- Filter & Search Controls Bar -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <!-- Search input -->
          <div class="relative flex-1">
            <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-wf-text-muted pointer-events-none" />
            <input
              v-model="ignoreSearchQuery"
              type="text"
              placeholder="Search keyword patterns, senders, or subjects..."
              class="w-full h-8 pl-8 pr-3 text-xs rounded-wf-md border border-wf-border-subtle bg-wf-surface text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-1 focus:ring-wf-primary"
            />
          </div>

          <!-- Channel Filter -->
          <div class="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0 text-xs">
            <button
              type="button"
              @click="ignoreSourceFilter = 'ALL'"
              :class="[
                'px-2.5 py-1 rounded-wf-md font-medium transition-colors',
                ignoreSourceFilter === 'ALL'
                  ? 'bg-wf-primary text-white'
                  : 'bg-wf-surface-variant text-wf-text-secondary hover:text-wf-text-primary'
              ]"
            >
              All Channels ({{ ignoreRules.length }})
            </button>
            <button
              type="button"
              @click="ignoreSourceFilter = 'SMS'"
              :class="[
                'px-2.5 py-1 rounded-wf-md font-medium transition-colors',
                ignoreSourceFilter === 'SMS'
                  ? 'bg-wf-primary text-white'
                  : 'bg-wf-surface-variant text-wf-text-secondary hover:text-wf-text-primary'
              ]"
            >
              SMS ({{ smsRulesCount }})
            </button>
            <button
              type="button"
              @click="ignoreSourceFilter = 'EMAIL'"
              :class="[
                'px-2.5 py-1 rounded-wf-md font-medium transition-colors',
                ignoreSourceFilter === 'EMAIL'
                  ? 'bg-wf-primary text-white'
                  : 'bg-wf-surface-variant text-wf-text-secondary hover:text-wf-text-primary'
              ]"
            >
              Email ({{ emailRulesCount }})
            </button>
          </div>

          <!-- Rule Kind Filter -->
          <select
            v-model="ignoreKindFilter"
            class="h-8 px-2 text-xs rounded-wf-md border border-wf-border-subtle bg-wf-surface text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary shrink-0"
          >
            <option value="ALL">All Rule Types</option>
            <option value="ignored_pattern">Triage Patterns ({{ triageRulesCount }})</option>
            <option value="spam_filter">Sender/Spam Rules ({{ customRulesCount }})</option>
          </select>
        </div>

        <!-- Bulk Selection Action Bar -->
        <div class="flex items-center justify-between px-1 text-xs text-wf-text-secondary">
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                :checked="allFilteredSelected"
                @change="toggleSelectAllRules()"
                class="rounded border-wf-border text-wf-primary focus:ring-wf-primary"
              />
              <span class="font-medium text-[11px]">Select All Filtered ({{ filteredIgnoreRules.length }})</span>
            </label>
            <span v-if="selectedRuleIds.length > 0" class="text-wf-text-muted text-[11px]">
              • {{ selectedRuleIds.length }} selected
            </span>
          </div>

          <div v-if="selectedRuleIds.length > 0" class="flex items-center gap-2">
            <WfButton
              variant="danger"
              size="sm"
              :disabled="isBulkDeletingRules"
              @click="bulkAllowSelectedRules()"
            >
              <Trash2 class="w-3 h-3 mr-1" />
              Allow Selected ({{ selectedRuleIds.length }})
            </WfButton>
          </div>
        </div>

        <!-- Loading / Empty / Rules List -->
        <div v-if="loadingRules" class="py-12 text-center text-xs text-wf-text-muted">Loading rules...</div>
        <div v-else-if="filteredIgnoreRules.length === 0" class="py-12 text-center text-xs text-wf-text-muted border border-dashed border-wf-border-subtle rounded-wf-md">
          <p class="font-medium">No matching ignore rules found.</p>
          <p v-if="ignoreSearchQuery" class="text-[11px] text-wf-text-muted mt-1">Try clearing your search query or filters.</p>
        </div>
        <div v-else class="divide-y divide-wf-border-subtle max-h-[58vh] overflow-y-auto border border-wf-border-subtle rounded-wf-md bg-wf-surface">
          <div
            v-for="rule in filteredIgnoreRules"
            :key="rule.id"
            class="p-3 transition-colors hover:bg-wf-surface-variant/40"
            :class="{ 'bg-wf-surface-variant/20': expandedRuleIds[rule.id] }"
          >
            <!-- Primary Row -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-2.5 min-w-0 flex-1">
                <!-- Checkbox -->
                <input
                  type="checkbox"
                  :checked="selectedRuleIds.includes(rule.id)"
                  @change="toggleSelectRule(rule.id)"
                  class="mt-1 rounded border-wf-border text-wf-primary focus:ring-wf-primary shrink-0"
                />

                <div class="min-w-0 flex-1">
                  <!-- Badges and Title -->
                  <div class="flex flex-wrap items-center gap-1.5 mb-1">
                    <!-- Source channel -->
                    <span class="px-1.5 py-0.5 rounded bg-wf-surface-variant text-[10px] font-bold uppercase text-wf-text-secondary border border-wf-border-subtle">
                      {{ rule.source }}
                    </span>

                    <!-- Match target badge -->
                    <span
                      class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      :class="[
                        rule.rule_kind === 'ignored_pattern'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          : rule.sender
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                            : rule.subject
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      ]"
                    >
                      {{ rule.rule_kind === 'ignored_pattern' ? 'Triage Discard Pattern' : rule.sender ? 'Sender Rule' : rule.subject ? 'Subject Rule' : 'Keyword Rule' }}
                    </span>

                    <!-- Block counter -->
                    <span v-if="rule.count_blocked > 0" class="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-semibold border border-rose-500/20">
                      Blocked {{ rule.count_blocked }}x
                    </span>

                    <!-- Date -->
                    <span v-if="rule.created_at" class="text-[10px] text-wf-text-muted ml-auto sm:ml-0">
                      {{ formatDate(rule.created_at).date }}
                    </span>
                  </div>

                  <!-- Pattern Snippet (clickable to expand) -->
                  <div
                    @click="toggleExpandRule(rule.id)"
                    class="cursor-pointer group flex items-center justify-between gap-2 py-0.5"
                  >
                    <span class="text-xs font-semibold text-wf-text-primary group-hover:text-wf-primary transition-colors truncate">
                      {{ rule.sender || rule.subject || rule.pattern }}
                    </span>
                    <button
                      type="button"
                      class="p-0.5 text-wf-text-muted group-hover:text-wf-text-primary transition-colors shrink-0"
                    >
                      <ChevronUp v-if="expandedRuleIds[rule.id]" class="w-3.5 h-3.5" />
                      <ChevronDown v-else class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-1.5 shrink-0 self-start mt-0.5">
                <WfButton
                  variant="secondary"
                  size="sm"
                  @click="allowFutureRule(rule.id)"
                  title="Remove rule to allow matching messages"
                >
                  <Trash2 class="w-3 h-3 mr-1" />
                  <span>Allow</span>
                </WfButton>
              </div>
            </div>

            <!-- Expanded Content Details -->
            <div
              v-if="expandedRuleIds[rule.id]"
              class="mt-3 pt-2.5 border-t border-wf-border-subtle/80 space-y-2 text-xs"
            >
              <div class="flex items-center justify-between gap-2 text-wf-text-secondary text-[11px]">
                <span class="font-semibold text-wf-text-primary">Full Keyword / Pattern Match String:</span>
                <button
                  type="button"
                  @click="copyRuleContent(rule)"
                  class="inline-flex items-center gap-1 text-[11px] text-wf-text-muted hover:text-wf-text-primary transition-colors"
                >
                  <Check v-if="copiedRuleId === rule.id" class="w-3 h-3 text-emerald-500" />
                  <Copy v-else class="w-3 h-3" />
                  <span>{{ copiedRuleId === rule.id ? 'Copied' : 'Copy Pattern' }}</span>
                </button>
              </div>

              <!-- Full Raw Preformatted Text -->
              <div class="p-2.5 rounded bg-wf-surface-variant font-mono text-xs text-wf-text-primary whitespace-pre-wrap break-words max-h-40 overflow-y-auto border border-wf-border-subtle select-all">
                {{ rule.pattern || rule.sender || rule.subject }}
              </div>

              <!-- Meta info footer -->
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-wf-text-muted pt-1">
                <span>
                  <strong>Origin:</strong> {{ rule.rule_kind === 'ignored_pattern' ? 'Auto-created via Triage Discard ("Ignore in future")' : 'Manual Ingestion Rule' }}
                </span>
                <span>
                  <strong>Scope:</strong> {{ rule.source === 'ALL' ? 'All Channels' : rule.source }}
                </span>
                <span v-if="rule.created_at">
                  <strong>Created:</strong> {{ formatDate(rule.created_at).full }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WfModal>

    <!-- MODAL 2: CREATE IGNORE RULE -->
    <WfModal v-model="showCreateIgnoreModal" title="Ignore Future Messages">
      <div class="space-y-3">
        <p class="text-xs text-wf-text-secondary">
          Discard promotional alerts, newsletters, or unwanted senders automatically before they clutter your ledger.
        </p>

        <div>
          <label class="block text-xs font-semibold text-wf-text-primary mb-1">Apply to Channel</label>
          <select
            v-model="ignoreForm.source"
            class="w-full h-9 px-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs text-wf-text-primary"
          >
            <option value="SMS">SMS Messages</option>
            <option value="EMAIL">Emails</option>
            <option value="STATEMENT">Email Statements (PDFs)</option>
            <option value="ALL">All Channels (SMS, Email & Statements)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-wf-text-primary mb-1">Match Criteria</label>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              @click="ignoreForm.matchType = 'sender'"
              class="py-1.5 rounded-wf-md border text-xs font-semibold"
              :class="ignoreForm.matchType === 'sender' ? 'border-wf-primary bg-wf-primary/10 text-wf-primary' : 'border-wf-border-subtle text-wf-text-secondary'"
            >
              Sender
            </button>
            <button
              type="button"
              @click="ignoreForm.matchType = 'subject'"
              class="py-1.5 rounded-wf-md border text-xs font-semibold"
              :class="ignoreForm.matchType === 'subject' ? 'border-wf-primary bg-wf-primary/10 text-wf-primary' : 'border-wf-border-subtle text-wf-text-secondary'"
            >
              Subject
            </button>
            <button
              type="button"
              @click="ignoreForm.matchType = 'pattern'"
              class="py-1.5 rounded-wf-md border text-xs font-semibold"
              :class="ignoreForm.matchType === 'pattern' ? 'border-wf-primary bg-wf-primary/10 text-wf-primary' : 'border-wf-border-subtle text-wf-text-secondary'"
            >
              Keyword
            </button>
          </div>
        </div>

        <WfInput
          v-if="ignoreForm.matchType === 'sender'"
          v-model="ignoreForm.sender"
          label="Sender ID or Email"
          placeholder="e.g. newsletter@promo.com or VM-PROMO"
        />
        <WfInput
          v-else-if="ignoreForm.matchType === 'subject'"
          v-model="ignoreForm.subject"
          label="Email Subject Contains"
          placeholder="e.g. Weekly Digest"
        />
        <WfInput
          v-else
          v-model="ignoreForm.pattern"
          label="Keyword or Phrase"
          placeholder="e.g. Pre-approved loan"
        />
      </div>
      <template #footer>
        <WfButton variant="ghost" size="sm" @click="showCreateIgnoreModal = false">Cancel</WfButton>
        <WfButton size="sm" :loading="creatingIgnore" @click="submitIgnoreRule">Ignore Matching Messages</WfButton>
      </template>
    </WfModal>

    <!-- MODAL 3: ANONYMIZED SAMPLE SUBMISSION WITH EXPLICIT CONSENT -->
    <WfModal v-model="showReportModal" title="Help Improve Transaction Detection">
      <div class="space-y-3">
        <div class="p-2.5 rounded-wf-md bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Review and edit the masked preview below to confirm no personal account numbers, amounts, phone numbers, or sensitive details remain before submitting.
          </p>
        </div>

        <div class="text-[11px] text-wf-text-muted">
          Original sender: <strong class="text-wf-text-primary">{{ reportState.senderOrHeader || 'Unknown' }}</strong>
        </div>

        <div>
          <label class="block text-xs font-semibold text-wf-text-primary mb-1">
            Anonymized Content Preview {{ previewLoading ? '(Masking...)' : '' }}
          </label>
          <textarea
            v-model="reportState.anonymizedContent"
            rows="5"
            class="w-full p-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface text-xs font-mono text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
          />
        </div>

        <label class="flex items-start gap-2 cursor-pointer text-xs text-wf-text-primary">
          <input v-model="reportState.userConsented" type="checkbox" class="mt-0.5 accent-[var(--wf-color-primary)]" />
          <span>
            I have verified that sensitive personal values are masked and consent to share this structural format to improve transaction extraction.
          </span>
        </label>
      </div>
      <template #footer>
        <WfButton variant="ghost" size="sm" @click="showReportModal = false">Cancel</WfButton>
        <WfButton
          size="sm"
          :loading="reportingLoading"
          :disabled="!reportState.userConsented || previewLoading"
          @click="submitAnonymizedSample"
        >
          <CheckCircle2 class="w-3.5 h-3.5 mr-1.5" />
          Submit Anonymized Sample
        </WfButton>
      </template>
    </WfModal>
  </div>
</template>
