<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'flat' | 'elevated' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  border?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'flat',
  padding: 'md',
  radius: 'lg',
  border: true,
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'flat':
      return 'bg-wf-surface'
    case 'elevated':
      return 'bg-wf-surface shadow-wf-card hover:shadow-wf-card-hover transition-shadow duration-200'
    case 'glass':
      return 'wf-glass-panel shadow-wf-glass'
    default:
      return 'bg-wf-surface'
  }
})

const paddingClasses = computed(() => {
  switch (props.padding) {
    case 'none':
      return 'p-0'
    case 'sm':
      return 'p-2.5 sm:p-3'
    case 'md':
      return 'p-3.5 sm:p-4'
    case 'lg':
      return 'p-5 sm:p-6'
    default:
      return 'p-3.5 sm:p-4'
  }
})

const radiusClasses = computed(() => {
  switch (props.radius) {
    case 'sm':
      return 'rounded-[var(--wf-radius-sm,4px)]'
    case 'md':
      return 'rounded-[var(--wf-radius-md,8px)]'
    case 'lg':
      return 'rounded-[var(--wf-radius-lg,12px)]'
    case 'xl':
      return 'rounded-[var(--wf-radius-xl,16px)]'
    case '2xl':
      return 'rounded-[var(--wf-radius-2xl,20px)]'
    default:
      return 'rounded-[var(--wf-radius-lg,12px)]'
  }
})
</script>

<template>
  <div
    class="w-full text-wf-text-primary"
    :class="[
      variantClasses,
      paddingClasses,
      radiusClasses,
      border && variant !== 'glass' ? 'border border-wf-border' : '',
    ]"
  >
    <slot />
  </div>
</template>
