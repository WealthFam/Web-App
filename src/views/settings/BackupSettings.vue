<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { financeApi } from '@/api/client'
import {
  backupApi,
  extractBackupError,
  type BackupInspectResult,
  type BackupImportResult
} from '@/api/backup'
import { useNotificationStore } from '@/stores/notification'
import {
  Download,
  Upload,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Users,
  Info
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'

const notify = useNotificationStore()

// Current user & role guard
const currentUser = ref<any>(null)
const loadingUser = ref(true)
const canAccessBackup = computed(() => {
  const role = String(currentUser.value?.role || '').toUpperCase()
  return role === 'OWNER' || role === 'ADULT'
})

// Export State
const exportEncrypt = ref(true)
const exportIncludeVault = ref(true)
const exportPassphrase = ref('')
const exportPassphraseConfirm = ref('')
const showExportPass = ref(false)
const exporting = ref(false)
const exportError = ref('')

const exportPassphraseMismatch = computed(() => {
  if (!exportEncrypt.value) return false
  return Boolean(exportPassphraseConfirm.value && exportPassphrase.value !== exportPassphraseConfirm.value)
})

const canSubmitExport = computed(() => {
  if (exporting.value) return false
  if (!exportEncrypt.value) return true
  return exportPassphrase.value.length >= 8 && exportPassphrase.value === exportPassphraseConfirm.value
})

// Import State
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const importPassphrase = ref('')
const showImportPass = ref(false)
const inspecting = ref(false)
const importing = ref(false)
const inspectResult = ref<BackupInspectResult | null>(null)
const importResult = ref<BackupImportResult | null>(null)
const importError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const summaryMetrics = computed(() => {
  const counts = inspectResult.value?.counts || {}
  return [
    { label: 'Accounts', value: counts.accounts || 0 },
    { label: 'Transactions', value: counts.transactions || 0 },
    { label: 'Categories', value: counts.categories || 0 },
    { label: 'Budgets & Rules', value: (counts.budgets || 0) + (counts.category_rules || 0) },
    { label: 'Mutual Funds', value: (counts.mutual_fund_holdings || 0) + (counts.mutual_fund_orders || 0) },
    { label: 'Loans & Goals', value: (counts.loans || 0) + (counts.investment_goals || 0) },
    { label: 'Statements', value: counts.statements || 0 },
    { label: 'Vault Files', value: inspectResult.value?.vault_files_count || 0 }
  ]
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

async function handleExport() {
  exportError.value = ''
  if (exportEncrypt.value) {
    if (exportPassphrase.value.length < 8) {
      exportError.value = 'Passphrase must be at least 8 characters long.'
      return
    }
    if (exportPassphrase.value !== exportPassphraseConfirm.value) {
      exportError.value = 'Passphrases do not match.'
      return
    }
  }

  exporting.value = true
  try {
    const response = await backupApi.exportBackup({
      passphrase: exportEncrypt.value ? exportPassphrase.value : undefined,
      encrypt: exportEncrypt.value,
      include_vault_files: exportIncludeVault.value
    })

    const headerName = response.headers?.['x-backup-filename']
    const cd = response.headers?.['content-disposition'] || ''
    const match = cd.match(/filename="?([^"]+)"?/)
    const filename = headerName || (match && match[1]) || `wealthfam_backup_${new Date().toISOString().slice(0, 10)}.wfam`

    const blob = new Blob([response.data], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    notify.success(`Backup exported: ${filename}`)
    exportPassphrase.value = ''
    exportPassphraseConfirm.value = ''
  } catch (err: any) {
    const msg = await extractBackupError(err, 'Failed to export system backup.')
    exportError.value = msg
    notify.error(msg)
  } finally {
    exporting.value = false
  }
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  setSelectedFile(file)
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0] || null
  setSelectedFile(file)
}

function setSelectedFile(file: File | null) {
  importError.value = ''
  inspectResult.value = null
  importResult.value = null
  if (!file) {
    selectedFile.value = null
    return
  }
  if (!file.name.toLowerCase().endsWith('.wfam')) {
    importError.value = 'Please select a valid .wfam backup file.'
    selectedFile.value = null
    return
  }
  selectedFile.value = file
}

async function handleInspect() {
  if (!selectedFile.value) return
  importError.value = ''
  inspectResult.value = null
  importResult.value = null
  inspecting.value = true
  try {
    const { data } = await backupApi.inspectBackup(
      selectedFile.value,
      importPassphrase.value || undefined
    )
    inspectResult.value = data
    if (!data.email_authorized) {
      importError.value = data.authorization_message
    }
  } catch (err: any) {
    const msg = await extractBackupError(err, 'Could not verify backup file.')
    importError.value = msg
  } finally {
    inspecting.value = false
  }
}

async function handleImport() {
  if (!selectedFile.value || !inspectResult.value?.email_authorized) return
  importError.value = ''
  importing.value = true
  try {
    const { data } = await backupApi.importBackup(
      selectedFile.value,
      importPassphrase.value || undefined,
      'merge'
    )
    importResult.value = data

    // Invalidate cached financial stores so UI immediately reflects restored records
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('wf_cache_')) localStorage.removeItem(k)
    })

    notify.success(data.message || 'Backup merged successfully!')
    importPassphrase.value = ''
  } catch (err: any) {
    const msg = await extractBackupError(err, 'Failed to restore backup.')
    importError.value = msg
    notify.error(msg)
  } finally {
    importing.value = false
  }
}

function resetImport() {
  selectedFile.value = null
  importPassphrase.value = ''
  inspectResult.value = null
  importResult.value = null
  importError.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

onMounted(async () => {
  loadingUser.value = true
  try {
    const res = await financeApi.getMe()
    currentUser.value = res.data
  } catch {
    currentUser.value = null
  } finally {
    loadingUser.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <WfCard v-if="loadingUser" variant="flat" padding="md" radius="lg">
      <div class="flex items-center gap-2 text-xs text-wf-text-secondary py-4">
        <RefreshCw class="w-4 h-4 animate-spin text-wf-primary" />
        <span>Loading backup permissions...</span>
      </div>
    </WfCard>

    <!-- Restricted Banner for CHILD / GUEST -->
    <WfCard v-else-if="!canAccessBackup" variant="flat" padding="lg" radius="lg" class="border-amber-500/30 bg-amber-500/5">
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-wf-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <ShieldAlert class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary">Backup &amp; Restore Restricted</h3>
          <p class="text-xs text-wf-text-secondary mt-1">
            Child and guest accounts cannot export or restore full system backups. Please contact an Owner or Adult member of your family circle.
          </p>
        </div>
      </div>
    </WfCard>

    <!-- Main Export & Restore Workspace -->
    <template v-else>
      <!-- Info Banner -->
      <WfCard variant="flat" padding="md" radius="lg" class="bg-wf-surface-variant/40 border-wf-border-subtle">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-wf-md bg-wf-primary/10 text-wf-primary flex items-center justify-center shrink-0">
            <HardDrive class="w-4 h-4" />
          </div>
          <div class="text-xs text-wf-text-secondary space-y-1">
            <h2 class="text-sm font-bold text-wf-text-primary">Portable System Backups (.wfam)</h2>
            <p>
              Export your entire family workspace—accounts, transactions, categories, rules, budgets, loans, credit cards, FDs, PFs, mutual funds, goals, statements, Vault documents, email configs, and settings—into a single portable <code class="px-1 py-0.5 rounded bg-wf-surface text-wf-text-primary font-mono text-[11px]">.wfam</code> file.
            </p>
            <p class="text-[11px] text-wf-text-muted">
              Server encryption keys and internal IDs are stripped so backups remain restorable months later or across different servers. Restoring always merges safely and keeps existing data on this server at highest priority.
            </p>
          </div>
        </div>
      </WfCard>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- 1. EXPORT CARD -->
        <WfCard variant="flat" padding="md" radius="lg" class="flex flex-col justify-between space-y-4">
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-2 pb-3 border-b border-wf-border-subtle">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-wf-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Download class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-wf-text-primary">Export System Backup</h3>
                  <p class="text-[11px] text-wf-text-muted">Create a portable .wfam snapshot of all family data</p>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                .WFAM
              </span>
            </div>

            <!-- Options -->
            <div class="space-y-2.5">
              <label class="flex items-start gap-2.5 p-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface-variant/30 cursor-pointer">
                <input
                  v-model="exportEncrypt"
                  type="checkbox"
                  class="mt-0.5 rounded border-wf-border text-wf-primary focus:ring-wf-primary"
                />
                <div class="text-xs">
                  <div class="font-semibold text-wf-text-primary flex items-center gap-1.5">
                    <Lock v-if="exportEncrypt" class="w-3.5 h-3.5 text-wf-primary" />
                    <Unlock v-else class="w-3.5 h-3.5 text-amber-500" />
                    <span>Encrypt backup with a custom passphrase (Recommended)</span>
                  </div>
                  <p class="text-[11px] text-wf-text-muted mt-0.5">
                    Protects your .wfam file with AES-256-GCM + PBKDF2-SHA256. You will need this passphrase when restoring.
                  </p>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-2.5 rounded-wf-md border border-wf-border-subtle bg-wf-surface-variant/30 cursor-pointer">
                <input
                  v-model="exportIncludeVault"
                  type="checkbox"
                  class="mt-0.5 rounded border-wf-border text-wf-primary focus:ring-wf-primary"
                />
                <div class="text-xs">
                  <div class="font-semibold text-wf-text-primary">Include Document Vault files &amp; statements</div>
                  <p class="text-[11px] text-wf-text-muted mt-0.5">
                    Bundles decrypted PDFs, receipts, and versions inside the archive and re-encrypts them on restore.
                  </p>
                </div>
              </label>
            </div>

            <!-- Passphrase Inputs -->
            <div v-if="exportEncrypt" class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-wf-text-primary mb-1">
                  Backup Passphrase <span class="text-wf-text-muted font-normal">(min 8 characters)</span>
                </label>
                <div class="relative">
                  <input
                    v-model="exportPassphrase"
                    :type="showExportPass ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Enter a strong custom passphrase"
                    class="w-full px-3 py-2 pr-9 text-xs rounded-wf-md border border-wf-border bg-wf-surface text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/30 focus:border-wf-primary"
                  />
                  <button
                    type="button"
                    @click="showExportPass = !showExportPass"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-wf-text-muted hover:text-wf-text-primary"
                  >
                    <EyeOff v-if="showExportPass" class="w-3.5 h-3.5" />
                    <Eye v-else class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-wf-text-primary mb-1">
                  Confirm Passphrase
                </label>
                <input
                  v-model="exportPassphraseConfirm"
                  :type="showExportPass ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Re-enter your passphrase"
                  class="w-full px-3 py-2 text-xs rounded-wf-md border bg-wf-surface text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/30"
                  :class="exportPassphraseMismatch ? 'border-rose-500' : 'border-wf-border focus:border-wf-primary'"
                />
                <p v-if="exportPassphraseMismatch" class="text-[11px] text-rose-500 mt-1">
                  Passphrases do not match.
                </p>
              </div>
            </div>

            <!-- Unencrypted Warning -->
            <div
              v-else
              class="p-2.5 rounded-wf-md border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2"
            >
              <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Unencrypted .wfam files contain plaintext financial records and credentials. Store the file in an encrypted drive or enable passphrase encryption above.
              </span>
            </div>

            <!-- Export Error -->
            <div
              v-if="exportError"
              class="p-2.5 rounded-wf-md border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400"
            >
              {{ exportError }}
            </div>
          </div>

          <div class="pt-2 border-t border-wf-border-subtle">
            <WfButton
              variant="primary"
              class="w-full justify-center"
              :disabled="!canSubmitExport"
              @click="handleExport"
            >
              <RefreshCw v-if="exporting" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
              <Download v-else class="w-3.5 h-3.5 mr-1.5" />
              <span>{{ exporting ? 'Packaging .wfam Backup...' : 'Download .wfam Backup' }}</span>
            </WfButton>
          </div>
        </WfCard>

        <!-- 2. RESTORE / IMPORT CARD -->
        <WfCard variant="flat" padding="md" radius="lg" class="flex flex-col justify-between space-y-4">
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-2 pb-3 border-b border-wf-border-subtle">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-wf-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Upload class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-wf-text-primary">Restore from Backup</h3>
                  <p class="text-[11px] text-wf-text-muted">Merge a .wfam backup into your current workspace</p>
                </div>
              </div>
              <button
                v-if="selectedFile || importResult"
                type="button"
                @click="resetImport"
                class="text-[11px] font-semibold text-wf-text-muted hover:text-wf-primary"
              >
                Reset
              </button>
            </div>

            <!-- File Dropzone -->
            <div
              class="border-2 border-dashed rounded-wf-md p-4 text-center transition-colors cursor-pointer"
              :class="[
                isDragging
                  ? 'border-wf-primary bg-wf-primary/5'
                  : 'border-wf-border hover:border-wf-primary/60 bg-wf-surface-variant/20'
              ]"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onDrop"
              @click="fileInputRef?.click()"
            >
              <input
                ref="fileInputRef"
                type="file"
                accept=".wfam"
                class="hidden"
                @change="onFileSelected"
              />
              <FileArchive class="w-7 h-7 mx-auto text-wf-primary mb-1.5" />
              <template v-if="selectedFile">
                <p class="text-xs font-bold text-wf-text-primary truncate">{{ selectedFile.name }}</p>
                <p class="text-[11px] text-wf-text-muted mt-0.5">{{ formatFileSize(selectedFile.size) }}</p>
              </template>
              <template v-else>
                <p class="text-xs font-semibold text-wf-text-primary">Drop your .wfam backup file here or click to browse</p>
                <p class="text-[11px] text-wf-text-muted mt-0.5">Supports encrypted &amp; unencrypted WealthFam (.wfam) archives</p>
              </template>
            </div>

            <!-- Passphrase for Restore -->
            <div v-if="selectedFile">
              <label class="block text-xs font-semibold text-wf-text-primary mb-1">
                Backup Passphrase <span class="text-wf-text-muted font-normal">(leave blank if unencrypted)</span>
              </label>
              <div class="relative">
                <input
                  v-model="importPassphrase"
                  :type="showImportPass ? 'text' : 'password'"
                  autocomplete="off"
                  placeholder="Enter the passphrase used during export"
                  class="w-full px-3 py-2 pr-9 text-xs rounded-wf-md border border-wf-border bg-wf-surface text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/30 focus:border-wf-primary"
                  @keyup.enter="handleInspect"
                />
                <button
                  type="button"
                  @click="showImportPass = !showImportPass"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-wf-text-muted hover:text-wf-text-primary"
                >
                  <EyeOff v-if="showImportPass" class="w-3.5 h-3.5" />
                  <Eye v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Import / Verification Error -->
            <div
              v-if="importError"
              class="p-3 rounded-wf-md border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2"
            >
              <ShieldAlert class="w-4 h-4 shrink-0 mt-0.5" />
              <span>{{ importError }}</span>
            </div>

            <!-- Inspect Preview Panel -->
            <div
              v-if="inspectResult"
              class="p-3 rounded-wf-md border border-wf-border-subtle bg-wf-surface-variant/30 space-y-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="text-xs font-bold text-wf-text-primary">
                    {{ inspectResult.tenant_name || 'Family Workspace' }}
                  </div>
                  <div class="text-[11px] text-wf-text-muted">
                    Exported {{ formatDate(inspectResult.exported_at) }} • Format v{{ inspectResult.format_version }}
                  </div>
                </div>
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-pill text-[10px] font-bold border"
                  :class="inspectResult.email_authorized
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'"
                >
                  <ShieldCheck v-if="inspectResult.email_authorized" class="w-3 h-3" />
                  <ShieldAlert v-else class="w-3 h-3" />
                  <span>{{ inspectResult.email_authorized ? 'Email Verified' : 'Email Mismatch' }}</span>
                </span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div
                  v-for="m in summaryMetrics"
                  :key="m.label"
                  class="p-2 rounded-wf-sm bg-wf-surface border border-wf-border-subtle text-center"
                >
                  <div class="text-sm font-bold text-wf-text-primary font-mono">{{ m.value }}</div>
                  <div class="text-[10px] text-wf-text-muted truncate">{{ m.label }}</div>
                </div>
              </div>

              <div class="flex items-start gap-1.5 text-[11px] text-wf-text-secondary bg-wf-surface p-2 rounded-wf-sm border border-wf-border-subtle">
                <Info class="w-3.5 h-3.5 text-wf-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Merge Priority:</strong> Existing records on this server are never deleted or overwritten. New items from the backup are merged with fresh IDs.
                </span>
              </div>

              <div v-if="inspectResult.warnings?.length" class="space-y-1">
                <div
                  v-for="(w, idx) in inspectResult.warnings"
                  :key="idx"
                  class="p-2 rounded-wf-sm bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300"
                >
                  {{ w }}
                </div>
              </div>
            </div>

            <!-- Restore Completed Panel -->
            <div
              v-if="importResult"
              class="p-3 rounded-wf-md border border-emerald-500/30 bg-emerald-500/10 space-y-2 text-xs"
            >
              <div class="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 class="w-4 h-4 shrink-0" />
                <span>Restore Complete</span>
              </div>
              <p class="text-[11px] text-wf-text-primary">{{ importResult.message }}</p>
              <div v-if="importResult.recreated_members.length" class="text-[11px] text-wf-text-secondary flex items-start gap-1.5">
                <Users class="w-3.5 h-3.5 shrink-0 mt-0.5 text-wf-primary" />
                <span>
                  Recreated family members: <strong>{{ importResult.recreated_members.join(', ') }}</strong>.
                  Update their passwords in the <em>Family Circle</em> tab.
                </span>
              </div>
              <div v-if="importResult.warnings.length" class="space-y-1 pt-1">
                <p
                  v-for="(w, idx) in importResult.warnings"
                  :key="idx"
                  class="text-[11px] text-amber-700 dark:text-amber-300"
                >
                  • {{ w }}
                </p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pt-2 border-t border-wf-border-subtle flex flex-col sm:flex-row gap-2">
            <WfButton
              variant="secondary"
              class="flex-1 justify-center"
              :disabled="!selectedFile || inspecting || importing"
              @click="handleInspect"
            >
              <RefreshCw v-if="inspecting" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
              <ShieldCheck v-else class="w-3.5 h-3.5 mr-1.5" />
              <span>{{ inspecting ? 'Verifying...' : 'Verify & Preview' }}</span>
            </WfButton>

            <WfButton
              variant="primary"
              class="flex-1 justify-center"
              :disabled="!inspectResult?.email_authorized || importing"
              @click="handleImport"
            >
              <RefreshCw v-if="importing" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
              <Upload v-else class="w-3.5 h-3.5 mr-1.5" />
              <span>{{ importing ? 'Merging Data...' : 'Merge & Restore Backup' }}</span>
            </WfButton>
          </div>
        </WfCard>
      </div>
    </template>
  </div>
</template>
