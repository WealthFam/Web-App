<script setup lang="ts">
import { computed } from 'vue'
import { Loader2, Sparkles } from 'lucide-vue-next'
import { marked } from 'marked'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

const props = defineProps<{
  modelValue: boolean
  portfolioInsights: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'close'): void
}>()

const renderedInsights = computed(() => {
  return props.portfolioInsights ? marked(props.portfolioInsights) : ''
})

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <WfModal
    :model-value="modelValue"
    @update:model-value="handleClose"
    maxWidth="lg"
  >
    <!-- Header -->
    <template #header>
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
          <Sparkles class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary leading-none">
            Strategic Debt Repayment Intelligence
          </h3>
          <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
            AI-driven debt snowball, avalanche, and prepayment optimization
          </p>
        </div>
      </div>
    </template>

    <!-- Body -->
    <div class="max-h-[60vh] overflow-y-auto pr-1">
      <div v-if="loading" class="py-12 text-center space-y-3">
        <Loader2 class="w-8 h-8 text-wf-primary animate-spin mx-auto" />
        <p class="text-xs font-semibold text-wf-text-secondary">
          Analyzing debt portfolio and computing prepayment optimizations...
        </p>
      </div>

      <div
        v-else-if="renderedInsights"
        class="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-wf-text-secondary space-y-3"
        v-html="renderedInsights"
      ></div>

      <div v-else class="py-12 text-center text-xs text-wf-text-muted">
        No insights generated yet. Click generate to analyze.
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <WfButton variant="primary" @click="handleClose">
        Done
      </WfButton>
    </template>
  </WfModal>
</template>
