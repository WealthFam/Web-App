<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  ShieldCheck,
  FolderPlus,
  Upload,
  Home,
  ChevronRight,
  Search,
  X,
  FolderOpen,
  LayoutGrid,
  List,
  FileText,
  Folder,
  Receipt,
  Scale,
  Fingerprint,
  Clock,
  Users,
  Link2,
  Download,
  Trash2,
  ArrowLeft,
  Eye,
  FileSpreadsheet,
  FileImage,
  FileCode,
  FileArchive,
  Presentation,
  Music,
  FileVideo
} from 'lucide-vue-next'
import { financeApi } from '@/api/client'
import MainLayout from '@/layouts/MainLayout.vue'
import { useConfirmStore } from '@/stores/confirm'
import { useNotificationStore } from '@/stores/notification'
import WfButton from '@/components/ui/WfButton.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfPagination from '@/components/ui/WfPagination.vue'
import VaultItemCard from '@/components/vault/VaultItemCard.vue'
import UploadDocModal from '@/components/vault/UploadDocModal.vue'
import CreateFolderModal from '@/components/vault/CreateFolderModal.vue'
import FilePreviewModal from './vault/FilePreviewModal.vue'

const notification = useNotificationStore()
const confirmDialog = useConfirmStore()

// Navigation & State
const currentFolderId = ref<string | null>(null)
const currentPathName = ref('Vault')
const breadcrumbs = ref<{ id: string; name: string }[]>([])
const items = ref<any[]>([])
const loading = ref(false)
const search = ref('')
const filterType = ref('ALL')
const sortBy = ref<'newest' | 'oldest' | 'name_asc' | 'name_desc'>('newest')
const viewMode = ref<'grid' | 'list'>('grid')

// Pagination
const currentPage = ref(1)
const pageSize = ref(24)
const pageSizeOptions = [12, 24, 48, 96]

// Modals
const showUploadModal = ref(false)
const showFolderModal = ref(false)
const submitting = ref(false)
const folderName = ref('')
const uploadForm = ref({ file_type: 'OTHER', is_shared: true })

const showPreviewModal = ref(false)
const selectedDoc = ref<any>(null)
const isPreviewEdit = ref(false)

const filterCategories = [
  { label: 'All Items', value: 'ALL' },
  { label: 'Bills', value: 'BILL' },
  { label: 'Invoices', value: 'INVOICE' },
  { label: 'Policies', value: 'POLICY' },
  { label: 'Tax Docs', value: 'TAX' },
  { label: 'Identity', value: 'IDENTITY' }
]

const filterCategoriesItems = filterCategories.map(c => ({ title: c.label, value: c.value }))
const sortOptions = [
  { title: 'Sort: Newest', value: 'newest' },
  { title: 'Sort: Oldest', value: 'oldest' },
  { title: 'Sort: A-Z', value: 'name_asc' },
  { title: 'Sort: Z-A', value: 'name_desc' }
]

// Stats Computation
const totalDocsCount = computed(() => items.value.filter(i => !i.is_folder).length)
const totalFoldersCount = computed(() => items.value.filter(i => i.is_folder).length)
const linkedDocsCount = computed(() => items.value.filter(i => !i.is_folder && (i.transaction_id || i.transaction)).length)
const sharedDocsCount = computed(() => items.value.filter(i => !i.is_folder && i.is_shared).length)

// Fetching
async function fetchItems() {
  loading.value = true
  const params: any = {
    parent_id: currentFolderId.value || 'ROOT',
    limit: 500
  }
  if (search.value) params.search = search.value
  if (filterType.value !== 'ALL') params.file_type = filterType.value

  try {
    const res = await financeApi.getDocuments(params)
    items.value = res.data.data || []

    if (showPreviewModal.value && selectedDoc.value) {
      const fresh = items.value.find(i => i.id === selectedDoc.value.id)
      if (fresh) selectedDoc.value = fresh
    }
  } catch (error) {
    notification.error('Failed to load vault items')
  } finally {
    loading.value = false
  }
}

// Sorting and Filtering
const sortedItems = computed(() => {
  const list = [...items.value]
  // Always group folders first
  list.sort((a, b) => {
    if (a.is_folder && !b.is_folder) return -1
    if (!a.is_folder && b.is_folder) return 1

    if (sortBy.value === 'newest') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }
    if (sortBy.value === 'oldest') {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    }
    if (sortBy.value === 'name_asc') {
      return (a.filename || '').localeCompare(b.filename || '')
    }
    if (sortBy.value === 'name_desc') {
      return (b.filename || '').localeCompare(a.filename || '')
    }
    return 0
  })
  return list
})

// Pagination

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedItems.value.slice(start, start + pageSize.value)
})

function navigateTo(id: string | null, name?: string) {
  currentPage.value = 1
  if (id === 'ROOT' || !id) {
    currentFolderId.value = null
    currentPathName.value = 'Vault'
    breadcrumbs.value = []
  } else {
    const exists = breadcrumbs.value.find(b => b.id === id)
    if (!exists && name) {
      breadcrumbs.value.push({ id, name })
    } else if (exists) {
      const crumbIdx = breadcrumbs.value.findIndex(b => b.id === id)
      breadcrumbs.value = breadcrumbs.value.slice(0, crumbIdx + 1)
    }
    currentFolderId.value = id
    currentPathName.value = name || 'Folder'
  }
}

function navigateUp() {
  if (breadcrumbs.value.length <= 1) {
    navigateTo('ROOT')
  } else {
    const parent = breadcrumbs.value[breadcrumbs.value.length - 2]
    navigateTo(parent.id, parent.name)
  }
}

function openPreview(item: any, isEdit = false) {
  selectedDoc.value = item
  isPreviewEdit.value = isEdit
  showPreviewModal.value = true
}

function handleCardClick(item: any) {
  if (item.is_folder) {
    navigateTo(item.id, item.filename)
  } else {
    openPreview(item)
  }
}

// Upload & Folder creation
async function handleUpload(file: File) {
  submitting.value = true
  const formData = new FormData()
  formData.append('file', file)
  formData.append('file_type', uploadForm.value.file_type)
  formData.append('is_shared', String(uploadForm.value.is_shared))
  if (currentFolderId.value) formData.append('parent_id', currentFolderId.value)

  try {
    await financeApi.uploadDocument(formData)
    notification.success('File uploaded successfully')
    showUploadModal.value = false
    fetchItems()
  } catch (e) {
    notification.error('Upload failed')
  } finally {
    submitting.value = false
  }
}

async function handleCreateFolder() {
  if (!folderName.value.trim()) return
  submitting.value = true
  const formData = new FormData()
  formData.append('name', folderName.value.trim())
  if (currentFolderId.value) formData.append('parent_id', currentFolderId.value)

  try {
    await financeApi.createFolder(formData)
    notification.success('Folder created')
    showFolderModal.value = false
    folderName.value = ''
    fetchItems()
  } catch (e) {
    notification.error('Failed to create folder')
  } finally {
    submitting.value = false
  }
}

// Actions
async function downloadItem(item: any) {
  try {
    const res = await financeApi.getDocumentBlob(item.id)
    const blob = new Blob([res.data], { type: item.mime_type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    notification.error('Download failed')
  }
}

async function deleteItem(item: any) {
  const isConfirmed = await confirmDialog.prompt(
    `Delete ${item.is_folder ? 'folder and all its contents' : 'file'}?`,
    'Confirm Delete',
    'Delete',
    'Cancel'
  )
  if (!isConfirmed) return
  try {
    await financeApi.deleteDocument(item.id)
    notification.success('Deleted successfully')
    fetchItems()
  } catch (e) {
    notification.error('Delete failed')
  }
}

function getItemIcon(item: any) {
  if (!item) return FileText
  if (item.is_folder) return Folder
  const filename = (item.filename || '').toLowerCase()
  const mt = (item.mime_type || '').toLowerCase()

  if (item.file_type === 'BILL' || item.file_type === 'INVOICE') return Receipt
  if (item.file_type === 'POLICY') return ShieldCheck
  if (item.file_type === 'TAX') return Scale
  if (item.file_type === 'IDENTITY') return Fingerprint

  if (filename.endsWith('.pdf') || mt === 'application/pdf') return FileText
  if (filename.endsWith('.xls') || filename.endsWith('.xlsx') || filename.endsWith('.csv') || mt.includes('sheet') || mt.includes('excel')) return FileSpreadsheet
  if (filename.endsWith('.ppt') || filename.endsWith('.pptx') || mt.includes('presentation')) return Presentation
  if (filename.endsWith('.doc') || filename.endsWith('.docx') || mt.includes('word')) return FileText

  if (mt.startsWith('image/')) return FileImage
  if (mt.startsWith('video/')) return FileVideo
  if (mt.startsWith('audio/')) return Music
  if (mt.includes('javascript') || mt.includes('json') || mt.includes('html') || mt.includes('css')) return FileCode
  if (mt.includes('zip') || mt.includes('rar') || mt.includes('tar') || mt.includes('archive')) return FileArchive

  return FileText
}

function getItemIconColorClass(item: any) {
  if (item.is_folder) return 'text-wf-primary bg-wf-primary-light border-indigo-200 dark:border-indigo-900/50'
  switch (item.file_type) {
    case 'BILL':
    case 'INVOICE':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    case 'POLICY':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    case 'TAX':
      return 'text-rose-500 bg-rose-500/10 border-rose-500/20'
    case 'IDENTITY':
      return 'text-purple-500 bg-purple-500/10 border-purple-500/20'
    default:
      return 'text-wf-text-secondary bg-wf-surface-variant border-wf-border-subtle'
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatCategory(type: string) {
  switch (type) {
    case 'BILL': return 'Bill'
    case 'INVOICE': return 'Invoice'
    case 'POLICY': return 'Policy'
    case 'TAX': return 'Tax Doc'
    case 'IDENTITY': return 'Identity'
    default: return 'General'
  }
}

let searchDebounce: any = null
watch(search, () => {
  currentPage.value = 1
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    fetchItems()
  }, 350)
})

watch([filterType, currentFolderId, pageSize], () => {
  currentPage.value = 1
  fetchItems()
})

onMounted(() => {
  fetchItems()
})
</script>

<template>
  <MainLayout>
    <div class="space-y-5 pb-8">
      <!-- 1. PAGE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
            <ShieldCheck class="w-4.5 h-4.5 text-wf-primary" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary">
                Document Vault
              </h1>
              <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                {{ sortedItems.length }} {{ sortedItems.length === 1 ? 'Item' : 'Items' }}
              </span>
            </div>
            <p class="text-xs text-wf-text-secondary">
              Secure family repository with version history, OCR categorization, and transaction attachments.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <WfButton
            variant="secondary"
            size="sm"
            @click="showFolderModal = true"
          >
            <FolderPlus class="w-4 h-4 mr-1.5" />
            <span>New Folder</span>
          </WfButton>

          <WfButton
            variant="primary"
            size="sm"
            @click="showUploadModal = true"
          >
            <Upload class="w-4 h-4 mr-1.5" />
            <span>Upload Document</span>
          </WfButton>
        </div>
      </div>

      <!-- 2. SUMMARY KPI STATS BANNER -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Metric 1: Total Documents -->
        <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider">Vault Storage</p>
              <p class="text-xl font-bold text-wf-text-primary mt-1">{{ totalDocsCount }} Files</p>
              <p class="text-[11px] text-wf-text-secondary mt-0.5">{{ totalFoldersCount }} Folders organized</p>
            </div>
            <div class="w-10 h-10 rounded-wf-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Folder class="w-5 h-5" />
            </div>
          </div>
        </WfCard>

        <!-- Metric 2: Categorized Scope -->
        <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider">Active Category</p>
              <p class="text-xl font-bold text-wf-text-primary mt-1">
                {{ filterCategories.find(c => c.value === filterType)?.label || 'All' }}
              </p>
              <p class="text-[11px] text-wf-text-secondary mt-0.5">{{ sortedItems.length }} items in current view</p>
            </div>
            <div class="w-10 h-10 rounded-wf-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Receipt class="w-5 h-5" />
            </div>
          </div>
        </WfCard>

        <!-- Metric 3: Linked to Transactions -->
        <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider">Transaction Links</p>
              <p class="text-xl font-bold text-wf-text-primary mt-1">{{ linkedDocsCount }} Linked</p>
              <p class="text-[11px] text-wf-text-secondary mt-0.5">Attached to financial entries</p>
            </div>
            <div class="w-10 h-10 rounded-wf-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Link2 class="w-5 h-5" />
            </div>
          </div>
        </WfCard>

        <!-- Metric 4: Shared with Family -->
        <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider">Family Access</p>
              <p class="text-xl font-bold text-wf-text-primary mt-1">{{ sharedDocsCount }} Shared</p>
              <p class="text-[11px] text-wf-text-secondary mt-0.5">Visible to family members</p>
            </div>
            <div class="w-10 h-10 rounded-wf-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Users class="w-5 h-5" />
            </div>
          </div>
        </WfCard>
      </div>

      <!-- 3. SINGLE UNIFIED TOOLBAR -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-wf-surface rounded-wf-lg border border-wf-border shadow-2xs">
        <!-- Left Section: Breadcrumb Trail (when in folder) OR Category Pills (when in root) -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <!-- When in a Folder: Show Breadcrumbs + Back Button -->
          <div v-if="currentFolderId" class="flex items-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              @click="navigateUp"
              title="Up one folder"
              class="p-1.5 rounded-wf-xs text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors border border-wf-border-subtle"
            >
              <ArrowLeft class="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              @click="navigateTo('ROOT')"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-wf-xs text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant font-bold transition-colors"
            >
              <Home class="w-3.5 h-3.5" />
              <span>Vault</span>
            </button>

            <template v-for="(crumb, idx) in breadcrumbs" :key="crumb.id">
              <ChevronRight class="w-3.5 h-3.5 text-wf-text-muted shrink-0" />
              <button
                type="button"
                @click="navigateTo(crumb.id)"
                class="px-2.5 py-1 rounded-wf-xs font-bold transition-colors truncate max-w-[160px]"
                :class="idx === breadcrumbs.length - 1 ? 'bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50' : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'"
              >
                {{ crumb.name }}
              </button>
            </template>
          </div>

          <!-- When in Root: Show Category Filter Pills in Segmented Container -->
          <div v-else class="flex items-center p-1 bg-wf-surface-variant/80 border border-wf-border-subtle rounded-wf-md shadow-2xs overflow-x-auto">
            <button
              v-for="cat in filterCategories"
              :key="cat.value"
              type="button"
              @click="filterType = cat.value"
              class="px-3 py-1.5 rounded-wf-sm text-xs font-semibold transition-all shrink-0"
              :class="filterType === cat.value
                ? 'bg-wf-surface text-wf-primary font-bold shadow-xs border border-wf-border/60'
                : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface/50'"
            >
              {{ cat.label }}
            </button>
          </div>
        </div>

        <!-- Right Section: Search, Category (if in folder), Sort & View Mode Switcher -->
        <div class="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <!-- Search Input Box -->
          <div class="relative flex items-center h-9 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle focus-within:border-wf-primary w-full sm:w-64 shrink-0">
            <Search class="w-3.5 h-3.5 text-wf-text-muted mr-2 shrink-0" />
            <input
              v-model="search"
              type="text"
              placeholder="Search documents..."
              class="w-full bg-transparent text-xs text-wf-text-primary focus:outline-none"
            />
            <button
              v-if="search"
              @click="search = ''"
              type="button"
              class="text-wf-text-muted hover:text-wf-text-primary ml-1"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Category Selector (when inside folder) -->
          <WfSelect
            v-if="currentFolderId"
            size="sm"
            v-model="filterType"
            :items="filterCategoriesItems"
            class="w-36 shrink-0"
          />

          <!-- Sort Dropdown -->
          <WfSelect
            size="sm"
            v-model="sortBy"
            :items="sortOptions"
            class="w-36 shrink-0"
          />

          <!-- View Mode Toggle -->
          <div class="flex items-center p-0.5 bg-wf-surface-variant/70 border border-wf-border-subtle rounded-wf-md shrink-0">
            <button
              type="button"
              @click="viewMode = 'grid'"
              title="Grid View"
              class="p-1.5 rounded-wf-xs transition-colors"
              :class="viewMode === 'grid' ? 'bg-wf-surface text-wf-primary shadow-2xs' : 'text-wf-text-muted hover:text-wf-text-primary'"
            >
              <LayoutGrid class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              @click="viewMode = 'list'"
              title="List / Table View"
              class="p-1.5 rounded-wf-xs transition-colors"
              :class="viewMode === 'list' ? 'bg-wf-surface text-wf-primary shadow-2xs' : 'text-wf-text-muted hover:text-wf-text-primary'"
            >
              <List class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- 4. CONTENT VIEW: GRID OR LIST/TABLE -->
      <!-- Loading Skeleton State -->
      <div v-if="loading && items.length === 0" class="py-20 text-center space-y-3">
        <div class="w-10 h-10 border-2 border-wf-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p class="text-xs font-medium text-wf-text-secondary">Loading vault contents...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="sortedItems.length === 0"
        class="p-12 text-center bg-wf-surface rounded-wf-lg border border-wf-border shadow-2xs space-y-3"
      >
        <div class="w-14 h-14 rounded-full bg-wf-surface-variant flex items-center justify-center text-wf-text-muted mx-auto border border-wf-border-subtle">
          <FolderOpen class="w-7 h-7" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary">No documents found</h3>
          <p class="text-xs text-wf-text-muted mt-1 max-w-sm mx-auto">
            {{ search ? `No results matching "${search}". Try clearing search filter.` : 'This folder is currently empty. Upload files or create folders to organize your records.' }}
          </p>
        </div>
        <div class="flex items-center justify-center gap-2 pt-2">
          <WfButton
            v-if="search || filterType !== 'ALL'"
            variant="secondary"
            size="sm"
            @click="search = ''; filterType = 'ALL'"
          >
            Reset Filters
          </WfButton>
          <WfButton
            variant="primary"
            size="sm"
            @click="showUploadModal = true"
          >
            <Upload class="w-3.5 h-3.5 mr-1" />
            <span>Upload File</span>
          </WfButton>
        </div>
      </div>

      <!-- A. CARD / GRID VIEW -->
      <div
        v-else-if="viewMode === 'grid'"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        <VaultItemCard
          v-for="item in paginatedItems"
          :key="item.id"
          :item="item"
          @click="handleCardClick"
          @preview="openPreview"
          @download="downloadItem"
          @delete="deleteItem"
        />
      </div>

      <!-- B. LIST / TABLE VIEW -->
      <div v-else class="overflow-x-auto bg-wf-surface rounded-wf-lg border border-wf-border shadow-2xs">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/30 text-[11px] font-bold text-wf-text-muted uppercase tracking-wider">
              <th class="py-3 px-4">Name</th>
              <th class="py-3 px-3">Category</th>
              <th class="py-3 px-3">Version</th>
              <th class="py-3 px-3">Linked Transaction</th>
              <th class="py-3 px-3">Access</th>
              <th class="py-3 px-3">Modified</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-wf-border-subtle font-normal">
            <tr
              v-for="item in paginatedItems"
              :key="item.id"
              @click="handleCardClick(item)"
              class="hover:bg-wf-surface-variant/40 transition-colors cursor-pointer group"
            >
              <!-- Name & Type -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-wf-md flex items-center justify-center border shrink-0"
                    :class="getItemIconColorClass(item)"
                  >
                    <component :is="getItemIcon(item)" class="w-4 h-4" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-wf-text-primary truncate max-w-xs md:max-w-md" :title="item.filename">
                      {{ item.filename }}
                    </p>
                    <p class="text-[10px] text-wf-text-muted truncate">
                      {{ item.is_folder ? 'Folder' : (item.mime_type || 'Document') }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Category -->
              <td class="py-3 px-3 whitespace-nowrap">
                <span
                  v-if="!item.is_folder"
                  class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold border"
                  :class="getItemIconColorClass(item)"
                >
                  {{ formatCategory(item.file_type) }}
                </span>
                <span v-else class="text-wf-text-muted font-medium text-[11px]">—</span>
              </td>

              <!-- Version -->
              <td class="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                <span v-if="!item.is_folder" class="px-1.5 py-0.5 rounded-wf-xs bg-wf-surface-variant font-bold text-wf-text-secondary border border-wf-border-subtle">
                  v{{ item.current_version || 1 }}
                </span>
                <span v-else class="text-wf-text-muted">—</span>
              </td>

              <!-- Linked Transaction -->
              <td class="py-3 px-3">
                <div v-if="item.transaction" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-wf-xs bg-wf-primary-light/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 max-w-[200px] truncate">
                  <Link2 class="w-3 h-3 text-wf-primary shrink-0" />
                  <span class="truncate font-semibold text-[11px] text-wf-text-secondary">
                    {{ item.transaction.description }}
                  </span>
                </div>
                <div v-else-if="item.transaction_id" class="text-wf-primary font-semibold text-[11px]">
                  Linked
                </div>
                <span v-else class="text-wf-text-muted text-[11px]">—</span>
              </td>

              <!-- Shared Status -->
              <td class="py-3 px-3 whitespace-nowrap">
                <span
                  v-if="item.is_shared"
                  class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500"
                >
                  <Users class="w-3 h-3" />
                  <span>Shared</span>
                </span>
                <span v-else class="text-[11px] text-wf-text-muted">Private</span>
              </td>

              <!-- Date -->
              <td class="py-3 px-3 whitespace-nowrap text-wf-text-secondary text-[11px]">
                <div class="flex items-center gap-1">
                  <Clock class="w-3 h-3 text-wf-text-muted" />
                  <span>{{ formatDate(item.updated_at || item.created_at) }}</span>
                </div>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1" @click.stop>
                  <button
                    v-if="!item.is_folder"
                    type="button"
                    @click="openPreview(item)"
                    title="Preview Document"
                    class="p-1.5 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                  >
                    <Eye class="w-4 h-4" />
                  </button>

                  <button
                    v-if="!item.is_folder"
                    type="button"
                    @click="downloadItem(item)"
                    title="Download File"
                    class="p-1.5 rounded-wf-xs text-wf-text-muted hover:text-emerald-500 hover:bg-wf-surface-variant transition-colors"
                  >
                    <Download class="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    @click="deleteItem(item)"
                    title="Delete"
                    class="p-1.5 rounded-wf-xs text-wf-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 5. PAGINATION TOOLBAR -->
      <div v-if="sortedItems.length > 0" class="pt-2">
        <WfPagination
          :page="currentPage"
          :page-size="pageSize"
          :total="sortedItems.length"
          :page-sizes="pageSizeOptions"
          @update:page="currentPage = $event"
          @update:page-size="pageSize = $event"
          class="rounded-wf-md border border-wf-border-subtle"
        />
      </div>
    </div>

    <!-- MODALS -->
    <UploadDocModal
      v-model="showUploadModal"
      :current-path-name="currentPathName"
      :submitting="submitting"
      :upload-form="uploadForm"
      @close="showUploadModal = false"
      @upload="handleUpload"
    />

    <CreateFolderModal
      v-model="showFolderModal"
      :submitting="submitting"
      :folder-name="folderName"
      @close="showFolderModal = false"
      @update:folder-name="folderName = $event"
      @create="handleCreateFolder"
    />

    <FilePreviewModal
      v-if="showPreviewModal && selectedDoc"
      v-model="showPreviewModal"
      :item="selectedDoc"
      :initial-edit-mode="isPreviewEdit"
      @close="showPreviewModal = false; selectedDoc = null"
      @refresh="fetchItems"
    />
  </MainLayout>
</template>
