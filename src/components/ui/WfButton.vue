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
      return 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-xs border border-indigo-500/20 font-semibold'
    case 'secondary':
      return 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-400 dark:border-indigo-900/50'
    case 'outline':
      return 'bg-transparent border border-wf-border hover:bg-wf-surface-variant text-wf-text-primary'
    case 'ghost':
      return 'bg-transparent text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'
    case 'danger':
      return 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-xs border border-rose-500/20 font-semibold'
    default:
      return 'bg-indigo-600 text-white'
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
