<script setup lang="ts">
import { ref } from 'vue'
import { UploadCloud, FileText, X, Check } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfSelect from '@/components/ui/WfSelect.vue'

defineProps<{
  modelValue: boolean
  currentPathName: string
  uploadForm: {
    file_type: string
    is_shared: boolean
  }
  submitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'upload', file: File): void
  (e: 'close'): void
}>()

const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const docTypes = [
  { title: 'Other Document', value: 'OTHER' },
  { title: 'Utility Bill / Receipt', value: 'BILL' },
  { title: 'Invoice', value: 'INVOICE' },
  { title: 'Insurance Policy', value: 'POLICY' },
  { title: 'Tax Document', value: 'TAX' },
  { title: 'Identity Proof', value: 'IDENTITY' }
]

function handleFileSelect(e: any) {
  const file = e.target.files?.[0]
  if (file) selectedFile.value = file
}

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) selectedFile.value = file
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function handleClose() {
  selectedFile.value = null
  emit('update:modelValue', false)
  emit('close')
}

function submit() {
  if (!selectedFile.value) return
  emit('upload', selectedFile.value)
}
</script>

<template>
  <WfModal
    :model-value="modelValue"
    @update:model-value="handleClose"
    maxWidth="md"
  >
    <!-- Header -->
    <template #header>
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
          <UploadCloud class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary leading-none">
            Upload Document
          </h3>
          <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
            Add files into {{ currentPathName }}
          </p>
        </div>
      </div>
    </template>

    <!-- Body Form -->
    <div class="space-y-4">
      <!-- Drag & Drop Zone / Selected File Preview -->
      <div
        v-if="!selectedFile"
        @click="fileInput?.click()"
        @dragover.prevent
        @drop.prevent="handleDrop"
        class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-wf-border hover:border-wf-primary/60 bg-wf-surface hover:bg-wf-primary-light/5 rounded-wf-lg cursor-pointer transition-all duration-150 text-center space-y-2 group"
      >
        <div class="w-12 h-12 rounded-full bg-wf-primary-light text-wf-primary flex items-center justify-center group-hover:scale-110 transition-transform">
          <UploadCloud class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-bold text-wf-text-primary group-hover:text-wf-primary transition-colors block">
            Click to browse or drag & drop
          </span>
          <span class="text-[10px] text-wf-text-muted mt-0.5 block">
            PDF, JPG, PNG, XLSX, DOCX up to 50MB
          </span>
        </div>
        <input
          type="file"
          ref="fileInput"
          class="hidden"
          @change="handleFileSelect"
        />
      </div>

      <!-- Selected File Card -->
      <div
        v-else
        class="p-3.5 rounded-wf-md bg-wf-surface border border-wf-border-subtle flex items-center justify-between gap-3 shadow-2xs"
      >
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-10 h-10 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center shrink-0">
            <FileText class="w-5 h-5" />
          </div>
          <div class="truncate">
            <p class="text-xs font-bold text-wf-text-primary truncate" :title="selectedFile.name">
              {{ selectedFile.name }}
            </p>
            <span class="text-[10px] font-mono text-wf-text-muted">
              {{ formatSize(selectedFile.size) }}
            </span>
          </div>
        </div>

        <button
          type="button"
          @click="selectedFile = null"
          class="p-1 rounded-wf-xs text-wf-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Category Select -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Document Classification
        </label>
        <WfSelect
          v-model="uploadForm.file_type"
          :items="docTypes"
          size="md"
        />
      </div>

      <!-- Shared with Family Toggle -->
      <div class="flex items-center justify-between p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
        <div>
          <span class="text-xs font-bold text-wf-text-primary block">
            Shared with Family
          </span>
          <span class="text-[11px] text-wf-text-muted">
            Allow other family members to view this document
          </span>
        </div>
        <input
          type="checkbox"
          v-model="uploadForm.is_shared"
          class="w-4 h-4 rounded border-wf-border text-wf-primary focus:ring-wf-primary cursor-pointer"
        />
      </div>
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <WfButton variant="ghost" @click="handleClose">
        Cancel
      </WfButton>
      <WfButton
        variant="primary"
        :disabled="!selectedFile"
        :loading="submitting"
        @click="submit"
      >
        <Check class="w-3.5 h-3.5 mr-1" />
        <span>Upload to {{ currentPathName }}</span>
      </WfButton>
    </template>
  </WfModal>
</template>
