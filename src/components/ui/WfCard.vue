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
      return 'p-3 sm:p-4'
    case 'md':
      return 'p-4 sm:p-6'
    case 'lg':
      return 'p-6 sm:p-8'
    default:
      return 'p-4 sm:p-6'
  }
})

const radiusClasses = computed(() => {
  switch (props.radius) {
    case 'sm':
      return 'rounded-wf-sm'
    case 'md':
      return 'rounded-wf-md'
    case 'lg':
      return 'rounded-wf-lg'
    case 'xl':
      return 'rounded-wf-xl'
    case '2xl':
      return 'rounded-wf-2xl'
    default:
      return 'rounded-wf-lg'
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
