<script setup lang="ts">
import { FolderPlus, Check } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

defineProps<{
  modelValue: boolean
  folderName: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'update:folderName', val: string): void
  (e: 'create'): void
  (e: 'close'): void
}>()

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <WfModal
    :model-value="modelValue"
    @update:model-value="handleClose"
    maxWidth="sm"
  >
    <!-- Header -->
    <template #header>
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
          <FolderPlus class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary leading-none">
            New Folder
          </h3>
          <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
            Create an organized subfolder in Vault
          </p>
        </div>
      </div>
    </template>

    <!-- Body Form -->
    <form @submit.prevent="emit('create')" class="space-y-4">
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Folder Name
        </label>
        <input
          :value="folderName"
          @input="emit('update:folderName', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="e.g. Invoices 2026, Tax Receipts"
          class="w-full h-10 px-3 bg-wf-surface text-xs font-semibold text-wf-text-primary border border-wf-border rounded-wf-md focus:border-wf-primary focus:outline-none shadow-2xs placeholder:text-wf-text-muted/60"
          autofocus
          required
        />
      </div>
    </form>

    <!-- Footer Actions -->
    <template #footer>
      <WfButton variant="ghost" @click="handleClose">
        Cancel
      </WfButton>
      <WfButton
        variant="primary"
        :disabled="!folderName.trim()"
        :loading="submitting"
        @click="emit('create')"
      >
        <Check class="w-3.5 h-3.5 mr-1" />
        <span>Create Folder</span>
      </WfButton>
    </template>
  </WfModal>
</template>
