<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import WfButton from '@/components/ui/WfButton.vue'
import {
  X,
  Download,
  Clock,
  Upload,
  FileText,
  Link2,
  Unlink2,
  FileImage,
  FileVideo,
  Music,
  FileCode,
  FileArchive,
  Fingerprint,
  ShieldCheck,
  Folder,
  Receipt,
  Scale,
  FileSpreadsheet,
  Presentation,
  Shield,
  Loader2,
  ExternalLink,
  Info,
  History,
  FileQuestion,
  Search,
  Check
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  item: any
  initialEditMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'refresh'): void
}>()

const notification = useNotificationStore()
const router = useRouter()

const loading = ref(false)
const versionsLoading = ref(false)
const submitting = ref(false)
const versions = ref<any[]>([])
const selectedVersion = ref<number | null>(null)
const previewUrl = ref<string | null>(null)
const activeBlob = ref<string | null>(null)
const sidebarTab = ref<'details' | 'history'>('details')

function viewTransaction() {
  if (!linkedTransaction.value) return
  router.push({ name: 'Transactions', query: { search: linkedTransaction.value.description } })
  emit('update:modelValue', false)
}

// Edit State
const editMode = ref(false)
const editedItem = ref({
  filename: '',
  file_type: 'OTHER',
  is_shared: true
})
const updateFileInput = ref<HTMLInputElement | null>(null)
const selectedNewFile = ref<File | null>(null)

// Transaction linking
const txSearch = ref('')
const txSearchResults = ref<any[]>([])
const txSearchLoading = ref(false)
const linkedTransaction = ref<any>(null)
let txSearchTimeout: ReturnType<typeof setTimeout> | null = null

async function searchTransactions(q: string) {
  if (!q.trim()) {
    txSearchResults.value = []
    return
  }
  txSearchLoading.value = true
  try {
    const res = await financeApi.searchTransactions(q, 8)
    txSearchResults.value = res.data?.data || res.data?.items || res.data || []
  } catch {
    txSearchResults.value = []
  } finally {
    txSearchLoading.value = false
  }
}

function onTxSearchInput() {
  if (txSearchTimeout) clearTimeout(txSearchTimeout)
  txSearchTimeout = setTimeout(() => searchTransactions(txSearch.value), 350)
}

async function linkToTransaction(tx: any) {
  if (!props.item) return
  try {
    await financeApi.linkDocToTransaction(props.item.id, tx.id)
    linkedTransaction.value = tx
    txSearch.value = ''
    txSearchResults.value = []
    notification.success(`Linked to "${tx.description}"`)
    emit('refresh')
  } catch {
    notification.error('Failed to link transaction')
  }
}

async function unlinkTransaction() {
  if (!props.item) return
  try {
    await financeApi.linkDocToTransaction(props.item.id, null)
    linkedTransaction.value = null
    notification.success('Transaction unlinked')
    emit('refresh')
  } catch {
    notification.error('Failed to unlink')
  }
}

async function fetchLinkedTransaction() {
  if (props.item?.transaction) {
    linkedTransaction.value = props.item.transaction
    return
  }
  if (!props.item?.transaction_id) {
    linkedTransaction.value = null
    return
  }
  try {
    linkedTransaction.value = {
      id: props.item.transaction_id,
      description: props.item.transaction_description || 'Linked Transaction',
      amount: props.item.transaction_amount,
      date: props.item.transaction_date
    }
  } catch {
    linkedTransaction.value = null
  }
}

const docTypes = [
  { title: 'Other Document', value: 'OTHER' },
  { title: 'Invoice / Receipt', value: 'INVOICE' },
  { title: 'Insurance Policy', value: 'POLICY' },
  { title: 'Tax Document', value: 'TAX' },
  { title: 'Identity Proof', value: 'IDENTITY' }
]

const isRenderable = computed(() => {
  if (!props.item || !props.item.mime_type) return false
  const mt = props.item.mime_type
  return (
    mt.startsWith('image/') ||
    mt === 'application/pdf' ||
    mt.startsWith('text/') ||
    mt === 'application/json' ||
    mt === 'text/html'
  )
})

const isImage = computed(() => props.item?.mime_type?.startsWith('image/'))
const isPdf = computed(() => props.item?.mime_type === 'application/pdf')

async function fetchVersions() {
  if (!props.item) return
  versionsLoading.value = true
  try {
    const res = await financeApi.listVersions(props.item.id)
    versions.value = res.data.data
  } catch (e) {
    console.error('Failed to fetch versions', e)
  } finally {
    versionsLoading.value = false
  }
}

async function loadPreview(version?: number) {
  if (!props.item || !isRenderable.value) return
  loading.value = true
  selectedVersion.value = version || null

  if (activeBlob.value) {
    URL.revokeObjectURL(activeBlob.value)
    activeBlob.value = null
  }

  try {
    const res = await financeApi.getDocumentBlob(props.item.id, version)
    const blob = new Blob([res.data], { type: props.item.mime_type })
    activeBlob.value = URL.createObjectURL(blob)
    previewUrl.value = activeBlob.value
  } catch (e: any) {
    console.error('Preview load failed', e)
    notification.error('Failed to load preview')
  } finally {
    loading.value = false
  }
}

function initEdit() {
  if (!props.item) return
  editedItem.value = {
    filename: props.item.filename,
    file_type: props.item.file_type,
    is_shared: props.item.is_shared
  }
  selectedNewFile.value = null
  editMode.value = true
}

function handleNewFileSelect(e: any) {
  const file = e.target.files[0]
  if (file) {
    selectedNewFile.value = file
    editedItem.value.filename = file.name
  }
}

async function saveChanges() {
  if (!props.item) return
  submitting.value = true
  try {
    if (selectedNewFile.value) {
      const formData = new FormData()
      formData.append('file', selectedNewFile.value)
      await financeApi.uploadVersion(props.item.id, formData)
    }

    const metaData = new FormData()
    metaData.append('filename', editedItem.value.filename)
    metaData.append('file_type', editedItem.value.file_type)
    metaData.append('is_shared', String(editedItem.value.is_shared))
    await financeApi.updateDocument(props.item.id, metaData)

    notification.success('Document updated successfully')
    editMode.value = false
    emit('refresh')
    loadPreview()
    fetchVersions()
  } catch (e) {
    notification.error('Update failed')
  } finally {
    submitting.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val && props.item) {
    editMode.value = props.initialEditMode || false
    loadPreview()
    fetchVersions()
    fetchLinkedTransaction()
    editedItem.value = {
      filename: props.item.filename,
      file_type: props.item.file_type,
      is_shared: props.item.is_shared ?? true
    }
    txSearch.value = ''
    txSearchResults.value = []
  } else {
    editMode.value = false
    txSearch.value = ''
    txSearchResults.value = []
    if (activeBlob.value) {
      URL.revokeObjectURL(activeBlob.value)
      activeBlob.value = null
      previewUrl.value = null
    }
  }
})

watch(() => props.item, (newVal) => {
  if (props.modelValue && newVal) {
    fetchLinkedTransaction()
  }
}, { deep: true })

onUnmounted(() => {
  if (activeBlob.value) URL.revokeObjectURL(activeBlob.value)
})

async function handleDownload() {
  if (!props.item) return
  try {
    const res = await financeApi.getDocumentBlob(props.item.id, selectedVersion.value || undefined)
    const blob = new Blob([res.data], { type: props.item.mime_type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.item.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    notification.error('Download failed')
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getIcon(item: any) {
  if (!item) return FileText
  if (item.is_folder) return Folder
  const filename = (item.filename || '').toLowerCase()
  const mt = (item.mime_type || '').toLowerCase()

  if (item.file_type === 'BILL' || item.file_type === 'INVOICE') return Receipt
  if (item.file_type === 'POLICY') return ShieldCheck
  if (item.file_type === 'TAX') return Scale
  if (item.file_type === 'IDENTITY') return Fingerprint

  if (filename.endsWith('.pdf') || mt === 'application/pdf') return FileText
  if (filename.endsWith('.xls') || filename.endsWith('.xlsx') || filename.endsWith('.csv') || mt.includes('sheet')) return FileSpreadsheet
  if (filename.endsWith('.ppt') || filename.endsWith('.pptx') || mt.includes('presentation')) return Presentation
  if (filename.endsWith('.doc') || filename.endsWith('.docx') || mt.includes('word')) return FileText

  if (mt.startsWith('image/')) return FileImage
  if (mt.startsWith('video/')) return FileVideo
  if (mt.startsWith('audio/')) return Music
  if (mt.includes('javascript') || mt.includes('json') || mt.includes('html') || mt.includes('css')) return FileCode
  if (mt.includes('zip') || mt.includes('rar') || mt.includes('tar') || mt.includes('archive')) return FileArchive
  return FileText
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <!-- Top Navigation Header -->
      <div class="h-16 px-6 bg-wf-surface border-b border-wf-border flex items-center justify-between shrink-0 shadow-sm">
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-9 h-9 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shrink-0">
            <component :is="getIcon(item)" class="w-4 h-4" />
          </div>
          <div class="truncate">
            <h3 class="text-sm font-bold text-wf-text-primary truncate" :title="item?.filename">
              {{ item?.filename }}
            </h3>
            <span class="text-[11px] text-wf-text-muted">
              {{ selectedVersion ? `Version ${selectedVersion}` : 'Current Version' }} • {{ item?.mime_type }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <WfButton
            v-if="!editMode"
            variant="secondary"
            size="sm"
            @click="initEdit"
          >
            <span>Edit Details</span>
          </WfButton>

          <WfButton
            variant="outline"
            size="sm"
            @click="handleDownload"
          >
            <Download class="w-3.5 h-3.5 mr-1" />
            <span>Download</span>
          </WfButton>

          <div class="h-6 w-px bg-wf-border mx-1"></div>

          <button
            type="button"
            @click="close"
            class="p-1.5 rounded-wf-sm text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Main Workspace Area Split -->
      <div class="flex-grow flex overflow-hidden">
        <!-- Left: Preview Canvas -->
        <div class="flex-grow bg-slate-950/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div v-if="loading" class="flex flex-col items-center gap-3">
            <Loader2 class="w-10 h-10 text-wf-primary animate-spin" />
            <span class="text-xs font-bold text-wf-text-muted">Loading preview...</span>
          </div>

          <div v-else-if="!isRenderable" class="text-center p-8 max-w-sm space-y-4">
            <div class="w-16 h-16 rounded-full bg-wf-surface-variant flex items-center justify-center mx-auto text-wf-text-muted">
              <FileQuestion class="w-8 h-8" />
            </div>
            <div>
              <h4 class="text-base font-bold text-wf-text-primary">Preview Not Available</h4>
              <p class="text-xs text-wf-text-muted mt-1">
                This file format cannot be rendered directly in the browser.
              </p>
            </div>
            <WfButton variant="primary" size="md" @click="handleDownload">
              <Download class="w-4 h-4 mr-1.5" />
              <span>Download {{ formatSize(item?.file_size) }}</span>
            </WfButton>
          </div>

          <div v-else-if="previewUrl" class="w-full h-full flex items-center justify-center">
            <img
              v-if="isImage"
              :src="previewUrl"
              class="max-h-full max-w-full object-contain rounded-wf-md shadow-2xl"
              alt="preview"
            />
            <iframe
              v-else-if="isPdf"
              :src="previewUrl"
              class="w-full h-full border-0 rounded-wf-md shadow-2xl bg-white"
            ></iframe>
            <iframe
              v-else
              :src="previewUrl"
              class="w-full h-full border-0 rounded-wf-md shadow-2xl bg-white"
            ></iframe>
          </div>
        </div>

        <!-- Right: Content & Metadata Sidebar -->
        <div class="w-96 bg-wf-surface border-l border-wf-border flex flex-col shrink-0">
          <!-- EDIT MODE -->
          <template v-if="editMode">
            <div class="p-4 bg-wf-surface-variant/40 border-b border-wf-border flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Shield class="w-4 h-4 text-wf-primary" />
                <span class="text-xs font-bold text-wf-text-primary">Update Document</span>
              </div>
              <button
                type="button"
                @click="editMode = false"
                class="p-1 text-wf-text-muted hover:text-wf-text-primary rounded-wf-xs"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="flex-grow overflow-y-auto p-5 space-y-4">
              <!-- Filename -->
              <div class="space-y-1">
                <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
                  Filename
                </label>
                <input
                  v-model="editedItem.filename"
                  type="text"
                  class="w-full h-9 px-3 bg-wf-surface text-xs font-semibold text-wf-text-primary border border-wf-border rounded-wf-md focus:border-wf-primary focus:outline-none"
                  required
                />
              </div>

              <!-- Category -->
              <div class="space-y-1">
                <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
                  Classification
                </label>
                <div class="flex items-center h-9 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary">
                  <select
                    v-model="editedItem.file_type"
                    class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none cursor-pointer"
                  >
                    <option
                      v-for="dt in docTypes"
                      :key="dt.value"
                      :value="dt.value"
                    >
                      {{ dt.title }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Shared with Family Toggle -->
              <div class="flex items-center justify-between p-3 rounded-wf-md bg-wf-surface-variant/30 border border-wf-border-subtle">
                <span class="text-xs font-bold text-wf-text-primary">Shared with Family</span>
                <input
                  type="checkbox"
                  v-model="editedItem.is_shared"
                  class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <!-- Transaction Link Section -->
              <div class="space-y-2 pt-2 border-t border-wf-border-subtle">
                <div class="flex items-center gap-1.5 text-wf-primary font-bold text-[11px] uppercase tracking-wider">
                  <Link2 class="w-3.5 h-3.5" />
                  <span>Linked Transaction</span>
                </div>

                <!-- Currently Linked Tx -->
                <div
                  v-if="linkedTransaction"
                  class="p-3 rounded-wf-md bg-wf-primary-light/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between gap-2"
                >
                  <div class="truncate">
                    <p class="text-xs font-bold text-wf-text-primary truncate">{{ linkedTransaction.description }}</p>
                    <span class="text-[10px] text-wf-text-muted">{{ linkedTransaction.date }}</span>
                  </div>
                  <button
                    type="button"
                    @click="unlinkTransaction"
                    class="p-1 rounded-wf-xs text-rose-500 hover:bg-rose-500/10 shrink-0"
                    title="Remove link"
                  >
                    <Unlink2 class="w-3.5 h-3.5" />
                  </button>
                </div>

                <div v-else class="p-2.5 rounded-wf-md border border-dashed border-wf-border text-center text-[11px] text-wf-text-muted">
                  No transaction linked
                </div>

                <!-- Search box for transactions -->
                <div class="space-y-1">
                  <div class="relative flex items-center h-9 px-2.5 rounded-wf-sm bg-wf-surface border border-wf-border focus-within:border-wf-primary">
                    <Search class="w-3.5 h-3.5 text-wf-text-muted mr-2" />
                    <input
                      v-model="txSearch"
                      @input="onTxSearchInput"
                      type="text"
                      placeholder="Search transactions to link..."
                      class="w-full bg-transparent text-xs text-wf-text-primary focus:outline-none"
                    />
                  </div>

                  <!-- Results dropdown -->
                  <div
                    v-if="txSearchResults.length"
                    class="max-h-40 overflow-y-auto rounded-wf-md bg-wf-surface border border-wf-border divide-y divide-wf-border-subtle shadow-lg"
                  >
                    <div
                      v-for="tx in txSearchResults"
                      :key="tx.id"
                      @click="linkToTransaction(tx)"
                      class="p-2 hover:bg-wf-surface-variant cursor-pointer transition-colors flex items-center justify-between gap-2"
                    >
                      <div class="truncate">
                        <p class="text-xs font-semibold text-wf-text-primary truncate">{{ tx.description }}</p>
                        <span class="text-[10px] text-wf-text-muted">{{ tx.date }} • {{ tx.category }}</span>
                      </div>
                      <span
                        class="text-xs font-bold font-mono shrink-0"
                        :class="tx.amount < 0 ? 'text-rose-500' : 'text-emerald-500'"
                      >
                        {{ tx.amount < 0 ? '-' : '+' }}₹{{ Math.abs(tx.amount).toFixed(2) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Replace with New Version File -->
              <div
                @click="updateFileInput?.click()"
                class="p-4 rounded-wf-md border-2 border-dashed border-wf-border hover:border-wf-primary bg-wf-surface hover:bg-wf-primary-light/5 text-center cursor-pointer transition-colors space-y-1"
                :class="selectedNewFile ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500' : ''"
              >
                <Upload class="w-5 h-5 text-wf-primary mx-auto" />
                <span class="text-xs font-bold text-wf-text-primary block">
                  {{ selectedNewFile ? selectedNewFile.name : 'Replace with New Version' }}
                </span>
                <span class="text-[10px] text-wf-text-muted block">
                  Uploads a new version while preserving history
                </span>
                <input
                  type="file"
                  ref="updateFileInput"
                  class="hidden"
                  @change="handleNewFileSelect"
                />
              </div>

              <div class="pt-2 space-y-2">
                <WfButton
                  variant="primary"
                  size="md"
                  block
                  :loading="submitting"
                  @click="saveChanges"
                >
                  <Check class="w-4 h-4 mr-1" />
                  <span>Save All Changes</span>
                </WfButton>

                <WfButton
                  variant="ghost"
                  size="md"
                  block
                  @click="editMode = false"
                >
                  <span>Cancel</span>
                </WfButton>
              </div>
            </div>
          </template>

          <!-- VIEW MODE (TABS) -->
          <template v-else>
            <!-- Tab Switcher -->
            <div class="p-2 border-b border-wf-border grid grid-cols-2 gap-1 bg-wf-surface-variant/40">
              <button
                type="button"
                @click="sidebarTab = 'details'"
                class="flex items-center justify-center gap-1.5 py-1.5 rounded-wf-sm text-xs font-bold transition-all"
                :class="sidebarTab === 'details' ? 'bg-wf-surface text-wf-primary shadow-2xs' : 'text-wf-text-muted hover:text-wf-text-primary'"
              >
                <Info class="w-3.5 h-3.5" />
                <span>Details</span>
              </button>

              <button
                type="button"
                @click="sidebarTab = 'history'"
                class="flex items-center justify-center gap-1.5 py-1.5 rounded-wf-sm text-xs font-bold transition-all"
                :class="sidebarTab === 'history' ? 'bg-wf-surface text-wf-primary shadow-2xs' : 'text-wf-text-muted hover:text-wf-text-primary'"
              >
                <History class="w-3.5 h-3.5" />
                <span>History</span>
              </button>
            </div>

            <div class="flex-grow overflow-y-auto p-5">
              <!-- DETAILS TAB -->
              <div v-if="sidebarTab === 'details'" class="space-y-6">
                <!-- Document Information -->
                <div class="space-y-3">
                  <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">
                    Document Information
                  </span>

                  <div class="space-y-2 text-xs">
                    <div class="flex items-center justify-between">
                      <span class="text-wf-text-muted">Category</span>
                      <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                        {{ item?.file_type }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-wf-text-muted">File Size</span>
                      <span class="font-mono font-semibold text-wf-text-primary">
                        {{ formatSize(item?.file_size) }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-wf-text-muted">Last Updated</span>
                      <span class="font-medium text-wf-text-primary">
                        {{ formatDate(item?.updated_at || item?.created_at) }}
                      </span>
                    </div>

                    <div v-if="item?.description" class="pt-2">
                      <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block mb-1">
                        Description
                      </span>
                      <p class="p-2.5 rounded-wf-sm bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-secondary leading-relaxed">
                        {{ item.description }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Linked Transaction -->
                <div class="space-y-2 pt-4 border-t border-wf-border-subtle">
                  <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">
                    Linked Transaction
                  </span>

                  <div
                    v-if="linkedTransaction"
                    class="p-3.5 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle relative group space-y-2"
                  >
                    <button
                      type="button"
                      @click="viewTransaction"
                      class="absolute top-3 right-3 p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-primary transition-colors"
                      title="Jump to transaction"
                    >
                      <ExternalLink class="w-3.5 h-3.5" />
                    </button>

                    <p class="text-xs font-bold text-wf-text-primary pr-6">
                      {{ linkedTransaction.description }}
                    </p>

                    <div class="flex items-center justify-between text-xs">
                      <span class="text-[10px] text-wf-text-muted font-medium">
                        {{ linkedTransaction.date }}
                      </span>
                      <span
                        class="font-black font-mono"
                        :class="linkedTransaction.amount < 0 ? 'text-rose-500' : 'text-emerald-500'"
                      >
                        {{ linkedTransaction.amount < 0 ? '-' : '+' }}₹{{ Math.abs(linkedTransaction.amount).toLocaleString() }}
                      </span>
                    </div>
                  </div>

                  <div v-else class="p-4 rounded-wf-md border border-dashed border-wf-border text-center space-y-2">
                    <p class="text-[11px] text-wf-text-muted">No transaction linked to this document.</p>
                    <WfButton variant="outline" size="sm" @click="initEdit">
                      <span>Link Now</span>
                    </WfButton>
                  </div>
                </div>
              </div>

              <!-- HISTORY TAB -->
              <div v-else class="space-y-3">
                <div v-if="versionsLoading" class="py-8 text-center">
                  <Loader2 class="w-6 h-6 text-wf-primary animate-spin mx-auto" />
                </div>

                <template v-else>
                  <div
                    v-for="v in versions"
                    :key="v.id"
                    @click="loadPreview(v.version_number)"
                    class="p-3.5 rounded-wf-md border cursor-pointer transition-all space-y-1.5"
                    :class="(selectedVersion === v.version_number || (!selectedVersion && v.version_number === item?.current_version)) ? 'bg-wf-primary-light/60 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs' : 'bg-wf-surface border-wf-border hover:border-wf-border'"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-black text-wf-primary uppercase tracking-wider font-mono">
                        Version {{ v.version_number }}
                      </span>
                      <span
                        v-if="v.version_number === item?.current_version"
                        class="px-1.5 py-0.2 rounded-wf-xs bg-wf-primary text-white font-bold text-[9px] uppercase tracking-wider"
                      >
                        Latest
                      </span>
                    </div>

                    <p class="text-xs font-semibold text-wf-text-primary truncate" :title="v.filename">
                      {{ v.filename }}
                    </p>

                    <div class="flex items-center justify-between text-[10px] text-wf-text-muted">
                      <span class="flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        {{ formatDate(v.created_at) }}
                      </span>
                      <span class="font-mono">{{ formatSize(v.file_size) }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
