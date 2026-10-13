<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useConfirmStore } from '@/stores/confirm'
import { localISOString } from '@/utils/time'
import {
  Settings,
  RefreshCw,
  Clock,
  Plus,
  Mail,
  Server,
  UserCheck,
  Search,
  X,
  CheckCircle2,
  XCircle,
  MailOpen,
  Loader2,
  ExternalLink
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfSelect from '@/components/ui/WfSelect.vue'

const emailConfigs = ref<any[]>([])
const familyMembers = ref<any[]>([])
const searchQuery = ref('')
const loading = ref(false)

const memberOptions = computed(() => [
  { title: '👤 Unassigned (Self)', value: null },
  ...familyMembers.value.map(m => ({
    title: `${m.avatar || '👤'} ${m.full_name || m.email}`,
    value: m.id
  }))
])

const notify = useNotificationStore()
const confirmDialog = useConfirmStore()

const showEmailModal = ref(false)
const editingEmailConfig = ref<string | null>(null)
const showHistoryModal = ref(false)
const syncLogs = ref<any[]>([])
const isSyncing = ref(false)
const syncStatus = ref<any>(null)

// Itemized Details State
const showItemDetailsModal = ref(false)
const selectedLogItems = ref<any[]>([])
const isLoadingItems = ref(false)

const emailForm = ref({
  email: '',
  password: '',
  host: 'imap.gmail.com',
  folder: 'INBOX',
  auto_sync: false,
  user_id: null as string | null,
  last_sync_at: '' as string
})

// Email Logs State
const emailLogs = ref<any[]>([])
const emailLogPagination = ref({ total: 0, limit: 10, skip: 0 })
const pollInterval = ref<any>(null)

const emailModalTitle = computed(() => editingEmailConfig.value ? 'Edit Email Configuration' : 'Connect Email Account')

const filteredConfigs = computed(() => {
  if (!searchQuery.value) return emailConfigs.value
  const q = searchQuery.value.toLowerCase()
  return emailConfigs.value.filter(c =>
    (c.email || '').toLowerCase().includes(q) ||
    (c.imap_server || '').toLowerCase().includes(q)
  )
})

const fetchEmailLogs = async (configId?: string, resetSkip = false) => {
  try {
    if (resetSkip) emailLogPagination.value.skip = 0
    const res = await financeApi.getEmailLogs({
      limit: emailLogPagination.value.limit,
      skip: emailLogPagination.value.skip,
      config_id: configId
    })
    emailLogs.value = res.data.items || []
    emailLogPagination.value.total = res.data.total || 0
  } catch (e) {
    console.error('Failed to fetch email logs', e)
  }
}

async function handleSync(configId: string) {
  if (pollInterval.value) clearInterval(pollInterval.value)

  isSyncing.value = true
  syncStatus.value = { status: 'running', configId }
  try {
    const res = await financeApi.syncEmailConfig(configId)
    syncStatus.value = { ...res.data, configId }

    if (res.data.status === 'started' || res.data.status === 'running') {
      notify.info('Sync is running in background')
      setTimeout(() => fetchEmailLogs(undefined, true), 500)

      if (res.data.log_id) {
        pollSyncStatus(res.data.log_id, configId)
      }
    } else if (res.data.status === 'completed') {
      notify.success('Sync completed')
      fetchEmailLogs(undefined, true)
      fetchData()
    }
  } catch (e: any) {
    if (e.code === 'ECONNABORTED' || e.response?.status === 202 || e.response?.status === 200) {
      const message = e.response?.data?.message || 'Sync is running in background'
      const logId = e.response?.data?.log_id
      syncStatus.value = { status: 'started', message, configId, log_id: logId }
      notify.info(message)

      if (logId) {
        pollSyncStatus(logId, configId)
      }
    } else {
      syncStatus.value = { status: 'error', message: e.response?.data?.detail || 'Sync failed', configId }
    }
    setTimeout(() => fetchEmailLogs(undefined, true), 1000)
  } finally {
    isSyncing.value = false
  }
}

async function pollSyncStatus(logId: string, configId: string) {
  if (pollInterval.value) clearInterval(pollInterval.value)

  let attempts = 0
  pollInterval.value = setInterval(async () => {
    attempts++
    try {
      await fetchEmailLogs(undefined, false)

      const currentLog = emailLogs.value.find(l => l.id === logId)
      if (currentLog) {
        if (currentLog.status === 'completed' || currentLog.status === 'failed' || currentLog.status === 'error') {
          clearInterval(pollInterval.value)
          pollInterval.value = null

          if (currentLog.status === 'completed') {
            syncStatus.value = { status: 'completed', message: currentLog.message, configId }
            fetchData()
            setTimeout(() => { if (syncStatus.value?.status === 'completed') syncStatus.value = null }, 5000)
          } else {
            syncStatus.value = { status: 'error', message: currentLog.message || 'Sync failed', configId }
          }
        }
      }

      if (attempts > 60) {
        clearInterval(pollInterval.value)
        pollInterval.value = null
      }
    } catch (e) {
      console.error('Polling error', e)
    }
  }, 5000)
}

async function saveEmailConfig() {
  try {
    const payload: any = {
      email: emailForm.value.email,
      password: emailForm.value.password,
      imap_server: emailForm.value.host,
      folder: emailForm.value.folder,
      auto_sync_enabled: emailForm.value.auto_sync,
      user_id: emailForm.value.user_id
    }

    if (emailForm.value.last_sync_at) {
      payload.last_sync_at = new Date(emailForm.value.last_sync_at).toISOString()
    }

    if (editingEmailConfig.value) {
      await financeApi.updateEmailConfig(editingEmailConfig.value, payload)
      notify.success('Email configuration updated')
    } else {
      await financeApi.createEmailConfig(payload)
      notify.success('Email configuration added')
    }

    showEmailModal.value = false
    emailForm.value = { email: '', password: '', host: 'imap.gmail.com', folder: 'INBOX', auto_sync: false, user_id: null, last_sync_at: '' }
    fetchData()
  } catch (e) {
    notify.error('Failed to save email config')
  }
}

function openAddEmailModal() {
  editingEmailConfig.value = null
  emailForm.value = {
    email: '',
    password: '',
    host: 'imap.gmail.com',
    folder: 'INBOX',
    auto_sync: false,
    user_id: null,
    last_sync_at: ''
  }
  showEmailModal.value = true
}

function openEditEmailModal(config: any) {
  emailForm.value = {
    email: config.email,
    password: config.password,
    host: config.imap_server,
    folder: config.folder,
    auto_sync: config.auto_sync_enabled || false,
    user_id: config.user_id || null,
    last_sync_at: config.last_sync_at ? localISOString(new Date(config.last_sync_at)) : ''
  }
  editingEmailConfig.value = config.id
  showEmailModal.value = true
}

async function rewindSync(hours: number) {
  if (!editingEmailConfig.value) return
  const configId = editingEmailConfig.value

  const now = new Date()
  now.setHours(now.getHours() - hours)

  try {
    await financeApi.updateEmailConfig(configId, { last_sync_at: now.toISOString() })
    notify.info('Rewound config. Triggering sync...')
    showEmailModal.value = false
    await handleSync(configId)
    fetchData()
  } catch (e) {
    notify.error('Failed to rewind sync')
  }
}

async function resetSyncHistory() {
  if (!editingEmailConfig.value) return
  const configId = editingEmailConfig.value
  const isConfirmed = await confirmDialog.prompt('This will force a DEEP SCAN of ALL emails. This takes time. Continue?', 'Deep Scan', 'Scan Now', 'Cancel')
  if (!isConfirmed) return
  try {
    await financeApi.updateEmailConfig(configId, { reset_sync_history: true })
    notify.info('Deep scan requested. Starting...')
    showEmailModal.value = false
    await handleSync(configId)
    fetchData()
  } catch (e) {
    notify.error('Failed to reset sync history')
  }
}

async function deleteEmailConfig(id: string) {
  const isConfirmed = await confirmDialog.prompt('Are you sure you want to remove this email account? This will stop future syncs.', 'Remove Account', 'Remove', 'Cancel')
  if (!isConfirmed) return
  try {
    await financeApi.deleteEmailConfig(id)
    notify.success('Email account removed')
    showEmailModal.value = false
    fetchData()
  } catch (e) {
    notify.error('Failed to remove email config')
  }
}

async function openHistoryModal(config: any) {
  showHistoryModal.value = true
  syncLogs.value = []
  try {
    const res = await financeApi.getEmailSyncLogs(config.id)
    syncLogs.value = res.data || []
  } catch (e) {
    notify.error('Failed to fetch logs')
  }
}

async function openItemDetailsModal(logId: string) {
  showItemDetailsModal.value = true
  selectedLogItems.value = []
  isLoadingItems.value = true
  try {
    const res = await financeApi.getEmailSyncItemLogs(logId)
    selectedLogItems.value = res.data || []
  } catch (e) {
    notify.error('Failed to fetch item details')
  } finally {
    isLoadingItems.value = false
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return { day: 'Never', meta: '' }
  const d = new Date(dateStr)
  return {
    day: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    meta: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleString()
  }
}

function formatDateFull(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

const fetchData = async () => {
  loading.value = true
  try {
    const [emailRes, usersRes] = await Promise.all([
      financeApi.getEmailConfigs(),
      financeApi.getUsers()
    ])
    emailConfigs.value = emailRes.data || []
    familyMembers.value = usersRes.data || []
  } catch (e) {
    console.error('Failed to fetch email settings', e)
    notify.error('Failed to load email settings')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEmailLogs()
  fetchData()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 1. TOOLBAR -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-wf-surface rounded-wf-lg border border-wf-border shadow-2xs">
      <div class="relative flex items-center h-8.5 px-2.5 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle focus-within:border-wf-primary w-full sm:w-72 shrink-0">
        <Search class="w-3.5 h-3.5 text-wf-text-muted mr-2 shrink-0" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search email accounts..."
          class="w-full bg-transparent text-xs text-wf-text-primary focus:outline-none"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" type="button" class="text-wf-text-muted hover:text-wf-text-primary ml-1">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="flex items-center gap-2.5 self-end sm:self-auto">
        <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[11px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
          {{ emailConfigs.length }} {{ emailConfigs.length === 1 ? 'Account' : 'Accounts' }}
        </span>

        <WfButton variant="primary" size="sm" @click="openAddEmailModal">
          <Plus class="w-3.5 h-3.5 mr-1" />
          <span>Add Account</span>
        </WfButton>
      </div>
    </div>

    <!-- 2. SYNC STATUS BANNER -->
    <div
      v-if="syncStatus"
      class="p-3 rounded-wf-lg border shadow-2xs flex items-start justify-between gap-3 transition-all"
      :class="[
        syncStatus.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
        ['running', 'started'].includes(syncStatus.status) ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400' :
        'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
      ]"
    >
      <div class="flex items-start gap-2.5">
        <div class="pt-0.5">
          <CheckCircle2 v-if="syncStatus.status === 'completed'" class="w-4 h-4 text-emerald-500" />
          <RefreshCw v-else-if="['running', 'started'].includes(syncStatus.status)" class="w-4 h-4 text-indigo-500 animate-spin" />
          <XCircle v-else class="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider">
            {{ syncStatus.status === 'completed' ? 'Sync Completed' : ['running', 'started'].includes(syncStatus.status) ? 'Sync In Progress' : 'Sync Failed' }}
          </h4>
          <p class="text-[11px] mt-0.5 opacity-90">
            {{ syncStatus.message || (syncStatus.stats?.processed !== undefined ? `${syncStatus.stats.processed} transactions processed.` : 'Synchronization task running in background.') }}
          </p>
        </div>
      </div>

      <button type="button" @click="syncStatus = null" class="text-wf-text-muted hover:text-wf-text-primary p-1">
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- 3. EMAIL ACCOUNTS GRID -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      <WfCard
        v-for="config in filteredConfigs"
        :key="config.id"
        variant="flat"
        padding="md"
        radius="lg"
        class="flex flex-col justify-between shadow-2xs hover:border-wf-border transition-all relative overflow-hidden"
      >
        <!-- Active Status Indicator Stripe -->
        <div
          class="absolute top-0 left-0 right-0 h-0.5"
          :class="config.auto_sync_enabled ? 'bg-emerald-500' : config.is_active ? 'bg-indigo-500' : 'bg-wf-border'"
        />

        <div>
          <!-- Header: User Avatar, Email, Server, Actions -->
          <div class="flex items-start justify-between gap-2.5 mb-2.5">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant border border-wf-border-subtle flex items-center justify-center text-lg shrink-0 shadow-2xs">
                <span>{{ familyMembers.find(u => u.id === config.user_id)?.avatar || '👤' }}</span>
              </div>
              <div class="min-w-0">
                <h4 class="text-xs font-bold text-wf-text-primary truncate" :title="config.email">
                  {{ config.email }}
                </h4>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="px-1 py-0.2 rounded-wf-xs bg-wf-surface-variant font-mono text-[9px] text-wf-text-secondary border border-wf-border-subtle">
                    {{ config.imap_server }}
                  </span>
                  <span
                    v-if="config.auto_sync_enabled"
                    class="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-500"
                  >
                    <RefreshCw class="w-2.5 h-2.5" />
                    Auto
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick Action Icons -->
            <div class="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                @click="openHistoryModal(config)"
                title="Sync History"
                class="p-1.5 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
              >
                <Clock class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                @click="openEditEmailModal(config)"
                title="Account Settings"
                class="p-1.5 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
              >
                <Settings class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Metadata info -->
          <div class="p-2 bg-wf-surface-variant/40 rounded-wf-md border border-wf-border-subtle text-xs mb-2.5">
            <div class="flex items-center justify-between text-wf-text-secondary">
              <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">Assigned Owner</span>
              <span class="font-semibold text-wf-text-primary text-[11px]">
                {{ familyMembers.find(u => u.id === config.user_id)?.full_name || 'Unassigned' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer: Last Sync & Sync Button -->
        <div class="pt-2 border-t border-wf-border-subtle flex items-center justify-between text-xs">
          <div>
            <p class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">Last Synced</p>
            <p class="font-medium text-wf-text-primary text-[11px] mt-0.5">
              {{ config.last_sync_at ? `${formatDate(config.last_sync_at).day} (${formatDate(config.last_sync_at).meta})` : 'Never' }}
            </p>
          </div>

          <WfButton
            variant="secondary"
            size="sm"
            :loading="syncStatus && syncStatus.status === 'running' && syncStatus.configId === config.id"
            @click="handleSync(config.id)"
          >
            <RefreshCw class="w-3 h-3 mr-1" />
            <span>{{ syncStatus && syncStatus.status === 'running' && syncStatus.configId === config.id ? 'Scanning...' : 'Sync' }}</span>
          </WfButton>
        </div>
      </WfCard>

      <!-- Add New Account Card Surface -->
      <WfCard
        v-if="!searchQuery"
        variant="flat"
        padding="md"
        radius="lg"
        class="border-dashed border-2 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-wf-primary hover:bg-wf-primary-light/20 transition-all group min-h-[140px]"
        @click="openAddEmailModal"
      >
        <div class="w-9 h-9 rounded-full bg-wf-primary-light border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary group-hover:scale-110 transition-transform mb-1.5 shadow-2xs">
          <Plus class="w-4 h-4" />
        </div>
        <h4 class="text-xs font-bold text-wf-text-primary">Connect Email Account</h4>
        <p class="text-[11px] text-wf-text-muted mt-0.5 max-w-[200px]">
          Automatically import and categorize bank transaction emails.
        </p>
      </WfCard>
    </div>

    <!-- 4. RECENT SCAN ACTIVITY LOGS -->
    <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden mt-4">
      <div class="p-3 px-4 border-b border-wf-border-subtle flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-wf-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <Mail class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-wf-text-primary">Recent Scan Activity</h3>
            <p class="text-[10px] text-wf-text-muted">Background IMAP fetch & extraction history</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-wf-xs bg-wf-surface-variant text-[10px] font-mono text-wf-text-secondary border border-wf-border-subtle">
            Total: {{ emailLogPagination.total }}
          </span>
          <button
            type="button"
            @click="fetchEmailLogs(undefined, true)"
            title="Refresh Logs"
            class="p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
          >
            <RefreshCw class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/30 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
              <th class="py-2 px-3">Timestamp</th>
              <th class="py-2 px-3">Account</th>
              <th class="py-2 px-3">Status</th>
              <th class="py-2 px-3">Items</th>
              <th class="py-2 px-3">Message</th>
              <th class="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-wf-border-subtle">
            <tr v-for="log in emailLogs" :key="log.id" class="hover:bg-wf-surface-variant/40 transition-colors">
              <td class="py-1.5 px-3 whitespace-nowrap text-wf-text-secondary font-medium text-[11px]">
                {{ formatDate(log.started_at).full }}
              </td>
              <td class="py-1.5 px-3 whitespace-nowrap font-mono text-wf-text-primary text-[11px]">
                {{ (emailConfigs.find(c => c.id === log.config_id)?.email || 'Unknown').split('@')[0] }}
              </td>
              <td class="py-1.5 px-3 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold uppercase tracking-wider border"
                  :class="log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : log.status === 'running' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'"
                >
                  {{ log.status }}
                </span>
              </td>
              <td class="py-1.5 px-3 font-mono font-semibold text-wf-text-primary text-[11px]">
                {{ log.items_processed || 0 }}
              </td>
              <td class="py-1.5 px-3 text-wf-text-secondary truncate max-w-md text-[11px]" :title="log.message">
                {{ log.message }}
              </td>
              <td class="py-1.5 px-3 text-right whitespace-nowrap">
                <WfButton variant="secondary" size="sm" class="h-6.5 text-[11px] px-2 py-0" @click="openItemDetailsModal(log.id)">
                  Details
                </WfButton>
              </td>
            </tr>
            <tr v-if="emailLogs.length === 0">
              <td colspan="6" class="text-center py-8 text-wf-text-muted">
                <div class="flex flex-col items-center gap-1">
                  <MailOpen class="w-8 h-8 text-wf-text-muted opacity-50 mb-1" />
                  <span>No scan history found.</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Logs Pagination -->
      <div
        v-if="emailLogPagination.total > emailLogPagination.limit"
        class="p-3 border-t border-wf-border-subtle flex items-center justify-between text-xs text-wf-text-secondary"
      >
        <span>
          Showing {{ emailLogPagination.skip + 1 }} - {{ Math.min(emailLogPagination.skip + emailLogPagination.limit, emailLogPagination.total) }} of {{ emailLogPagination.total }}
        </span>
        <div class="flex items-center gap-2">
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="emailLogPagination.skip === 0"
            @click="emailLogPagination.skip -= emailLogPagination.limit; fetchEmailLogs()"
          >
            Previous
          </WfButton>
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="emailLogPagination.skip + emailLogPagination.limit >= emailLogPagination.total"
            @click="emailLogPagination.skip += emailLogPagination.limit; fetchEmailLogs()"
          >
            Next
          </WfButton>
        </div>
      </div>
    </WfCard>

    <!-- MODAL 1: ADD / EDIT EMAIL CONFIG -->
    <WfModal
      v-model="showEmailModal"
      :title="emailModalTitle"
      max-width="lg"
    >
      <form @submit.prevent="saveEmailConfig" class="space-y-5">
        <!-- Connection Details -->
        <div>
          <div class="flex items-center gap-1.5 text-xs font-bold text-wf-primary uppercase tracking-wider mb-3">
            <Server class="w-3.5 h-3.5" />
            <span>Connection Details</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-wf-text-secondary mb-1">Email Address *</label>
              <input
                v-model="emailForm.email"
                type="email"
                required
                placeholder="name@gmail.com"
                class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-wf-text-secondary mb-1">App Password *</label>
              <input
                v-model="emailForm.password"
                type="password"
                required
                placeholder="•••• •••• •••• ••••"
                class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-wf-text-secondary mb-1">IMAP Server *</label>
              <input
                v-model="emailForm.host"
                type="text"
                required
                placeholder="imap.gmail.com"
                class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-wf-text-secondary mb-1">Folder</label>
              <input
                v-model="emailForm.folder"
                type="text"
                placeholder="INBOX"
                class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
              />
            </div>
          </div>
          <p class="text-[11px] text-wf-text-muted mt-2">
            Tip: Generate an <strong>App Password</strong> in your email provider security settings instead of your login password.
          </p>
        </div>

        <!-- Ownership & Automation -->
        <div class="pt-4 border-t border-wf-border-subtle space-y-4">
          <div class="flex items-center gap-1.5 text-xs font-bold text-wf-primary uppercase tracking-wider mb-2">
            <UserCheck class="w-3.5 h-3.5" />
            <span>Ownership & Automation</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-wf-text-secondary mb-1">Assign to Family Member</label>
              <WfSelect
                v-model="emailForm.user_id"
                :items="memberOptions"
                size="md"
              />
            </div>

            <div class="flex items-center justify-between p-2.5 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle self-end">
              <div>
                <p class="text-xs font-bold text-wf-text-primary">Auto Sync</p>
                <p class="text-[10px] text-wf-text-muted">Runs every 15 minutes</p>
              </div>
              <input
                v-model="emailForm.auto_sync"
                type="checkbox"
                class="w-4 h-4 rounded text-wf-primary focus:ring-wf-primary"
              />
            </div>
          </div>
        </div>

        <!-- Advanced Controls (when editing) -->
        <div v-if="editingEmailConfig" class="p-3 bg-wf-surface-variant/40 rounded-wf-md border border-wf-border-subtle space-y-3">
          <p class="text-xs font-bold text-wf-text-secondary uppercase tracking-wider">Advanced Sync Controls</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label class="block text-[10px] font-bold text-wf-text-muted uppercase mb-1">Custom Sync Point</label>
              <input
                v-model="emailForm.last_sync_at"
                type="datetime-local"
                class="w-full h-9 px-2 rounded-wf-xs bg-wf-surface border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
              />
            </div>
            <div class="flex items-center gap-2">
              <WfButton variant="secondary" size="sm" type="button" class="flex-1" @click="rewindSync(3)">
                Rewind 3h
              </WfButton>
              <WfButton variant="secondary" size="sm" type="button" class="flex-1" @click="resetSyncHistory">
                Deep Scan
              </WfButton>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-4 border-t border-wf-border-subtle">
          <button
            v-if="editingEmailConfig"
            type="button"
            @click="deleteEmailConfig(editingEmailConfig)"
            class="text-xs font-bold text-rose-500 hover:underline"
          >
            Remove Account
          </button>
          <div v-else />

          <div class="flex items-center gap-2">
            <WfButton variant="secondary" size="md" type="button" @click="showEmailModal = false">
              Cancel
            </WfButton>
            <WfButton variant="primary" size="md" type="submit">
              <span>{{ editingEmailConfig ? 'Update Configuration' : 'Connect Account' }}</span>
            </WfButton>
          </div>
        </div>
      </form>
    </WfModal>

    <!-- MODAL 2: SYNC HISTORY -->
    <WfModal
      v-model="showHistoryModal"
      title="Sync History"
      max-width="lg"
    >
      <div class="overflow-x-auto max-h-[60vh]">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/30 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3">Timestamp</th>
              <th class="py-2.5 px-3">Items</th>
              <th class="py-2.5 px-3">Message</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-wf-border-subtle">
            <tr v-for="log in syncLogs" :key="log.id">
              <td class="py-2.5 px-3 whitespace-nowrap">
                <CheckCircle2 v-if="log.status === 'completed'" class="w-4 h-4 text-emerald-500" />
                <XCircle v-else-if="log.status === 'error'" class="w-4 h-4 text-rose-500" />
                <Loader2 v-else class="w-4 h-4 text-indigo-500 animate-spin" />
              </td>
              <td class="py-2.5 px-3 text-wf-text-secondary whitespace-nowrap">{{ formatDateFull(log.started_at) }}</td>
              <td class="py-2.5 px-3 font-mono font-semibold text-wf-text-primary">{{ log.items_processed || 0 }}</td>
              <td class="py-2.5 px-3 text-wf-text-secondary truncate max-w-xs" :title="log.message">{{ log.message }}</td>
            </tr>
            <tr v-if="syncLogs.length === 0">
              <td colspan="4" class="text-center py-6 text-wf-text-muted">No logs recorded yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </WfModal>

    <!-- MODAL 3: ITEM DETAILS -->
    <WfModal
      v-model="showItemDetailsModal"
      title="Scan Session Itemized Details"
      max-width="xl"
    >
      <div v-if="isLoadingItems" class="py-12 text-center space-y-2">
        <Loader2 class="w-6 h-6 text-wf-primary animate-spin mx-auto" />
        <p class="text-xs text-wf-text-muted">Fetching itemized details...</p>
      </div>
      <div v-else class="overflow-x-auto max-h-[60vh]">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/30 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3">Sender & Subject</th>
              <th class="py-2.5 px-3">Parser</th>
              <th class="py-2.5 px-3">Result / Reason</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-wf-border-subtle">
            <tr v-for="item in selectedLogItems" :key="item.id">
              <td class="py-2.5 px-3 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold uppercase tracking-wider border"
                  :class="item.status === 'processed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : item.status === 'duplicate' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-wf-surface-variant text-wf-text-muted border-wf-border-subtle'"
                >
                  {{ item.status }}
                </span>
              </td>
              <td class="py-2.5 px-3">
                <p class="font-bold text-wf-text-primary truncate max-w-xs" :title="item.subject">{{ item.subject }}</p>
                <p class="text-[10px] text-wf-text-muted truncate max-w-xs">{{ item.sender }}</p>
              </td>
              <td class="py-2.5 px-3 whitespace-nowrap font-mono text-[10px] text-wf-primary">
                {{ item.parser_used || '—' }}
              </td>
              <td class="py-2.5 px-3">
                <div class="flex items-center gap-1.5">
                  <span class="truncate max-w-xs text-wf-text-secondary" :title="item.reason">
                    {{ item.reason || (item.status === 'processed' ? 'Transaction Created' : '—') }}
                  </span>
                  <router-link
                    v-if="item.transaction_id"
                    :to="{ name: 'transactions', query: { id: item.transaction_id } }"
                    class="text-wf-primary hover:underline shrink-0"
                    title="View Transaction"
                  >
                    <ExternalLink class="w-3.5 h-3.5" />
                  </router-link>
                </div>
              </td>
            </tr>
            <tr v-if="selectedLogItems.length === 0">
              <td colspan="4" class="text-center py-6 text-wf-text-muted">No itemized logs found for this session.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </WfModal>
  </div>
</template>
