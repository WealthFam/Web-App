<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  ShieldCheck,
  FolderPlus,
  Upload,
  Home,
  ChevronRight,
  Search,
  FolderOpen
} from 'lucide-vue-next'
import { financeApi } from '@/api/client'
import MainLayout from '@/layouts/MainLayout.vue'
import { useConfirmStore } from '@/stores/confirm'
import { useNotificationStore } from '@/stores/notification'
import WfButton from '@/components/ui/WfButton.vue'
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

// Fetching
async function fetchItems() {
  loading.value = true
  const params: any = {
    parent_id: currentFolderId.value || 'ROOT',
    limit: 100
  }
  if (search.value) params.search = search.value
  if (filterType.value !== 'ALL') params.file_type = filterType.value

  try {
    const res = await financeApi.getDocuments(params)
    items.value = res.data.data

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

function navigateTo(id: string | null, name?: string) {
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

const filteredItems = computed(() => items.value)

let searchDebounce: any = null
watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    fetchItems()
  }, 350)
})

watch([filterType, currentFolderId], () => {
  fetchItems()
})

onMounted(() => {
  fetchItems()
})
</script>

<template>
  <MainLayout>
    <div class="max-w-[1600px] mx-auto space-y-6 pb-16">
      <!-- PAGE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs">
            <ShieldCheck class="w-5 h-5 text-wf-primary" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary">
                Document Vault
              </h1>
              <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                {{ items.length }} Items
              </span>
            </div>
            <p class="text-xs text-wf-text-secondary">
              Secure family storage with versioning, attachments, and transaction links.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <WfButton
            variant="secondary"
            size="md"
            @click="showFolderModal = true"
          >
            <FolderPlus class="w-4 h-4 mr-1.5" />
            <span>New Folder</span>
          </WfButton>

          <WfButton
            variant="primary"
            size="md"
            @click="showUploadModal = true"
          >
            <Upload class="w-4 h-4 mr-1.5" />
            <span>Upload Document</span>
          </WfButton>
        </div>
      </div>

      <!-- BREADCRUMBS BAR -->
      <div class="flex items-center gap-1.5 p-2 bg-wf-surface rounded-wf-md border border-wf-border-subtle text-xs overflow-x-auto shadow-2xs">
        <button
          type="button"
          @click="navigateTo('ROOT')"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-wf-sm font-bold transition-colors"
          :class="!currentFolderId ? 'bg-wf-primary-light text-wf-primary' : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'"
        >
          <Home class="w-3.5 h-3.5" />
          <span>Vault</span>
        </button>

        <template v-for="(crumb, idx) in breadcrumbs" :key="crumb.id">
          <ChevronRight class="w-3.5 h-3.5 text-wf-text-muted shrink-0" />
          <button
            type="button"
            @click="navigateTo(crumb.id)"
            class="px-2.5 py-1 rounded-wf-sm font-bold transition-colors truncate max-w-[150px]"
            :class="idx === breadcrumbs.length - 1 ? 'bg-wf-primary-light text-wf-primary' : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'"
          >
            {{ crumb.name }}
          </button>
        </template>
      </div>

      <!-- FILTER & SEARCH TOOLBAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-wf-surface rounded-wf-lg border border-wf-border shadow-2xs">
        <!-- Category Filter Pills -->
        <div class="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            v-for="cat in filterCategories"
            :key="cat.value"
            type="button"
            @click="filterType = cat.value"
            class="px-3 py-1.5 rounded-wf-sm text-xs font-bold transition-all shrink-0"
            :class="filterType === cat.value ? 'bg-wf-primary text-white shadow-2xs' : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- Search Input Box -->
        <div class="relative flex items-center h-9 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle focus-within:border-wf-primary w-full sm:w-64 shrink-0">
          <Search class="w-3.5 h-3.5 text-wf-text-muted mr-2 shrink-0" />
          <input
            v-model="search"
            type="text"
            placeholder="Search documents..."
            class="w-full bg-transparent text-xs text-wf-text-primary focus:outline-none"
          />
        </div>
      </div>

      <!-- LOADING SKELETONS -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="i in 8"
          :key="`skel-vault-${i}`"
          class="h-44 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border-subtle animate-pulse"
        ></div>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-else-if="items.length === 0"
        class="flex flex-col items-center justify-center p-12 text-center rounded-wf-xl bg-wf-surface border border-wf-border shadow-2xs max-w-md mx-auto mt-8 space-y-4"
      >
        <div class="w-16 h-16 rounded-full bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-sm">
          <FolderOpen class="w-8 h-8" />
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-wf-text-primary">This Folder is Empty</h3>
          <p class="text-xs text-wf-text-secondary max-w-xs">
            Start organizing your documents, receipts, invoices, and family policies here.
          </p>
        </div>
        <div class="flex items-center gap-2 pt-2">
          <WfButton variant="outline" size="sm" @click="showFolderModal = true">
            <FolderPlus class="w-3.5 h-3.5 mr-1" />
            <span>New Folder</span>
          </WfButton>
          <WfButton variant="primary" size="sm" @click="showUploadModal = true">
            <Upload class="w-3.5 h-3.5 mr-1" />
            <span>Upload File</span>
          </WfButton>
        </div>
      </div>

      <!-- ITEMS GRID -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
        <VaultItemCard
          v-for="item in filteredItems"
          :key="item.id"
          :item="item"
          @click="handleCardClick"
          @preview="openPreview"
          @download="downloadItem"
          @delete="deleteItem"
        />
      </div>

      <!-- UPLOAD MODAL -->
      <UploadDocModal
        v-model="showUploadModal"
        :current-path-name="currentPathName"
        :upload-form="uploadForm"
        :submitting="submitting"
        @upload="handleUpload"
      />

      <!-- CREATE FOLDER MODAL -->
      <CreateFolderModal
        v-model="showFolderModal"
        v-model:folder-name="folderName"
        :submitting="submitting"
        @create="handleCreateFolder"
      />

      <!-- FILE PREVIEW & EDIT MODAL -->
      <FilePreviewModal
        v-model="showPreviewModal"
        :item="selectedDoc"
        :initial-edit-mode="isPreviewEdit"
        @refresh="fetchItems"
      />
    </div>
  </MainLayout>
</template>
