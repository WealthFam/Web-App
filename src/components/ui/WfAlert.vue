<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-vue-next'

interface Props {
  variant?: 'error' | 'success' | 'warning' | 'info'
  title?: string
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  dismissible: false,
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'error':
      return 'bg-wf-error-light border-red-200 text-wf-error dark:border-red-900/50'
    case 'success':
      return 'bg-wf-success-light border-emerald-200 text-wf-success dark:border-emerald-900/50'
    case 'warning':
      return 'bg-wf-warning-light border-amber-200 text-amber-700 dark:text-amber-400 dark:border-amber-900/50'
    case 'info':
      return 'bg-wf-info-light border-blue-200 text-wf-info dark:border-blue-900/50'
    default:
      return 'bg-wf-info-light border-blue-200 text-wf-info'
  }
})

const iconComponent = computed(() => {
  switch (props.variant) {
    case 'error':
      return AlertCircle
    case 'success':
      return CheckCircle2
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    default:
      return Info
  }
})
</script>

<template>
  <div
    class="w-full flex items-start gap-3 p-3.5 rounded-wf-md border text-sm transition-all"
    :class="variantClasses"
    role="alert"
  >
    <component :is="iconComponent" class="w-4 h-4 shrink-0 mt-0.5" />
    <div class="flex-1 flex flex-col gap-0.5 text-left">
      <span v-if="title" class="font-semibold">{{ title }}</span>
      <div class="text-xs leading-relaxed opacity-95">
        <slot />
      </div>
    </div>
  </div>
</template>
