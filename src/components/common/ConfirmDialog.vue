<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import { useConfirmStore } from '@/stores/confirm'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

const confirm = useConfirmStore()
</script>

<template>
  <WfModal
    :model-value="confirm.isOpen"
    max-width="sm"
    @update:model-value="(v: boolean) => { if (!v) confirm.cancel() }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-5 h-5 text-wf-warning" aria-hidden="true" />
        <h3 class="text-base font-semibold text-wf-text-primary">{{ confirm.title }}</h3>
      </div>
    </template>

    <p class="text-sm text-wf-text-secondary">{{ confirm.message }}</p>

    <template #footer>
      <WfButton variant="ghost" size="sm" @click="confirm.cancel()">{{ confirm.cancelText }}</WfButton>
      <WfButton variant="danger" size="sm" @click="confirm.agree()">{{ confirm.confirmText }}</WfButton>
    </template>
  </WfModal>
</template>
