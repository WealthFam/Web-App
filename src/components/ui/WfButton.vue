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
      return 'bg-wf-primary hover:bg-wf-primary-hover text-white shadow-xs border border-transparent'
    case 'secondary':
      return 'bg-wf-primary-light text-wf-primary hover:bg-indigo-100 border border-transparent dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60'
    case 'outline':
      return 'bg-transparent border border-wf-border hover:bg-wf-surface-variant text-wf-text-primary'
    case 'ghost':
      return 'bg-transparent text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'
    case 'danger':
      return 'bg-wf-error hover:bg-red-600 text-white shadow-xs border border-transparent'
    default:
      return 'bg-wf-primary text-white'
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
    class="inline-flex items-center justify-center font-medium rounded-wf-md transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wf-primary focus-visible:ring-offset-2"
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
