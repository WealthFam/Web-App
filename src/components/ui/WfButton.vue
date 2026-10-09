<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
  block: false,
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-[var(--wf-color-primary,#6366F1)] hover:bg-[var(--wf-color-primary-hover,#4F46E5)] text-white shadow-sm border border-transparent'
    case 'secondary':
      return 'bg-[var(--wf-color-primary-light,#EEF2FF)] text-[var(--wf-color-primary,#6366F1)] hover:bg-indigo-100 border border-transparent dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60'
    case 'outline':
      return 'bg-transparent border border-[var(--wf-color-border,#E2E8F0)] hover:bg-[var(--wf-color-surface-variant,#F1F5F9)] text-[var(--wf-color-text-primary,#0F172A)]'
    case 'ghost':
      return 'bg-transparent text-[var(--wf-color-text-secondary,#475569)] hover:text-[var(--wf-color-text-primary,#0F172A)] hover:bg-[var(--wf-color-surface-variant,#F1F5F9)]'
    case 'danger':
      return 'bg-[var(--wf-color-error,#EF4444)] hover:bg-red-600 text-white shadow-sm border border-transparent'
    default:
      return 'bg-[var(--wf-color-primary,#6366F1)] text-white'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-8 px-3 text-xs gap-1.5'
    case 'md':
      return 'h-10 px-4 text-sm gap-2'
    case 'lg':
      return 'h-12 px-6 text-base gap-2.5'
    case 'icon':
      return 'h-9 w-9 p-0 justify-center'
    default:
      return 'h-10 px-4 text-sm gap-2'
  }
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-medium rounded-[var(--wf-radius-md,8px)] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-color-primary,#6366F1)] focus-visible:ring-offset-2"
    :class="[
      variantClasses,
      sizeClasses,
      block ? 'w-full' : '',
    ]"
  >
    <Loader2 v-if="loading" class="animate-spin shrink-0" :class="size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'" />
    <slot v-else />
  </button>
</template>
