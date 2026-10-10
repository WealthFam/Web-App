<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  FileText,
  Folder,
  Receipt,
  ShieldCheck,
  Scale,
  Fingerprint,
  FileSpreadsheet,
  Presentation,
  FileImage,
  FileVideo,
  Music,
  FileCode,
  FileArchive,
  Clock,
  MoreVertical,
  Download,
  Link2,
  Trash2
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import { financeApi } from '@/api/client'

const props = defineProps<{
  item: any
}>()

const emit = defineEmits<{
  (e: 'click', item: any): void
  (e: 'preview', item: any, isEdit?: boolean): void
  (e: 'download', item: any): void
  (e: 'delete', item: any): void
}>()

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenuOnClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenuOnClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnClickOutside)
})

function getIcon(item: any) {
  if (!item) return FileText
  if (item.is_folder) return Folder
  const filename = (item.filename || '').toLowerCase()
  const mt = (item.mime_type || '').toLowerCase()

  // 1. By Category
  if (item.file_type === 'BILL' || item.file_type === 'INVOICE') return Receipt
  if (item.file_type === 'POLICY') return ShieldCheck
  if (item.file_type === 'TAX') return Scale
  if (item.file_type === 'IDENTITY') return Fingerprint

  // 2. By Extension / Type
  if (filename.endsWith('.pdf') || mt === 'application/pdf') return FileText
  if (filename.endsWith('.xls') || filename.endsWith('.xlsx') || filename.endsWith('.csv') || mt.includes('sheet') || mt.includes('excel')) return FileSpreadsheet
  if (filename.endsWith('.ppt') || filename.endsWith('.pptx') || mt.includes('presentation')) return Presentation
  if (filename.endsWith('.doc') || filename.endsWith('.docx') || mt.includes('word')) return FileText

  // 3. By Mime
  if (mt.startsWith('image/')) return FileImage
  if (mt.startsWith('video/')) return FileVideo
  if (mt.startsWith('audio/')) return Music
  if (mt.includes('javascript') || mt.includes('json') || mt.includes('html') || mt.includes('css')) return FileCode
  if (mt.includes('zip') || mt.includes('rar') || mt.includes('tar') || mt.includes('archive')) return FileArchive

  return FileText
}

const iconComponent = computed(() => getIcon(props.item))

const iconColorClasses = computed(() => {
  if (props.item.is_folder) return 'text-wf-primary bg-wf-primary-light border-indigo-200 dark:border-indigo-900/50'
  switch (props.item.file_type) {
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
})

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  })
}
</script>

<template>
  <WfCard
    variant="flat"
    padding="none"
    radius="lg"
    class="relative flex flex-col justify-between overflow-hidden group hover:border-wf-border cursor-pointer transition-all duration-200 shadow-2xs"
    @click="emit('click', item)"
  >
    <!-- Preview / Thumbnail Banner Area -->
    <div class="h-28 bg-wf-surface-variant/40 border-b border-wf-border-subtle relative flex items-center justify-center overflow-hidden">
      <!-- Thumbnail image if available -->
      <img
        v-if="item.thumbnail_path"
        :src="financeApi.getDocumentThumbnailUrl(item.id)"
        alt="thumbnail"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <!-- Otherwise Icon Box -->
      <div
        v-else
        class="w-12 h-12 rounded-wf-lg flex items-center justify-center border shadow-2xs group-hover:scale-110 transition-transform duration-200"
        :class="iconColorClasses"
      >
        <component :is="iconComponent" class="w-6 h-6" />
      </div>
    </div>

    <!-- Content Details Area -->
    <div class="p-4 space-y-2 flex-grow flex flex-col justify-between">
      <!-- Top Row: Title + Menu -->
      <div class="flex items-start justify-between gap-2">
        <h4
          class="text-xs font-bold text-wf-text-primary truncate flex-grow"
          :title="item.filename"
        >
          {{ item.filename }}
        </h4>

        <!-- Action Menu Dropdown -->
        <div class="relative shrink-0" ref="menuRef">
          <button
            type="button"
            @click.stop="toggleMenu"
            class="p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
          >
            <MoreVertical class="w-3.5 h-3.5" />
          </button>

          <!-- Menu Popup -->
          <div
            v-if="menuOpen"
            class="absolute right-0 top-full mt-1 w-36 bg-wf-surface border border-wf-border rounded-wf-md shadow-wf-modal py-1 z-30 animate-in fade-in zoom-in-95 duration-100 font-sans"
          >
            <button
              v-if="!item.is_folder"
              type="button"
              @click.stop="emit('download', item); menuOpen = false"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-wf-text-primary hover:bg-wf-surface-variant text-left transition-colors"
            >
              <Download class="w-3.5 h-3.5 text-wf-text-muted" />
              <span>Download</span>
            </button>
            <button
              v-if="!item.is_folder"
              type="button"
              @click.stop="emit('preview', item, true); menuOpen = false"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-wf-text-primary hover:bg-wf-surface-variant text-left transition-colors"
            >
              <Link2 class="w-3.5 h-3.5 text-wf-text-muted" />
              <span>Link Tx</span>
            </button>
            <button
              type="button"
              @click.stop="emit('delete', item); menuOpen = false"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 text-left transition-colors"
            >
              <Trash2 class="w-3.5 h-3.5 text-rose-500" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Metadata: Date & Version Tag -->
      <div class="flex items-center justify-between text-[10px] text-wf-text-muted pt-1">
        <span class="flex items-center gap-1 font-medium">
          <Clock class="w-3 h-3" />
          {{ formatDate(item.updated_at || item.created_at) }}
        </span>

        <span
          v-if="!item.is_folder"
          class="px-1.5 py-0.2 rounded-wf-xs bg-wf-surface-variant font-bold text-wf-text-secondary text-[9px] border border-wf-border-subtle font-mono"
        >
          v{{ item.current_version || 1 }}
        </span>
        <span
          v-else
          class="px-1.5 py-0.2 rounded-wf-xs bg-wf-primary-light text-wf-primary font-bold text-[9px] border border-indigo-200 dark:border-indigo-900/50 uppercase"
        >
          Folder
        </span>
      </div>

      <!-- Linked Transaction Mini Pill -->
      <div
        v-if="item.transaction"
        @click.stop="emit('preview', item, false)"
        class="mt-2 p-1.5 rounded-wf-xs bg-wf-primary-light/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between gap-1 text-[10px] hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
      >
        <span class="truncate font-semibold text-wf-text-secondary" :title="item.transaction.description">
          {{ item.transaction.description }}
        </span>
        <span
          class="font-black font-mono shrink-0"
          :class="item.transaction.amount < 0 ? 'text-rose-500' : 'text-emerald-500'"
        >
          {{ item.transaction.amount < 0 ? '-' : '+' }}₹{{ Math.abs(item.transaction.amount).toLocaleString() }}
        </span>
      </div>
      <div
        v-else-if="item.transaction_id"
        class="mt-1 text-[10px] font-bold text-wf-primary"
      >
        Linked to transaction
      </div>
    </div>
  </WfCard>
</template>
