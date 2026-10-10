<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string | number
  label?: string
  placeholder?: string
  type?: string
  error?: string
  hint?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const inputId = computed(() => props.id || `wf-input-${Math.random().toString(36).substring(2, 9)}`)

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="w-full flex flex-col gap-1.5 text-left">
    <div v-if="label || $slots.labelRight" class="flex items-center justify-between">
      <label
        v-if="label"
        :for="inputId"
        class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider select-none"
      >
        {{ label }}
        <span v-if="required" class="text-wf-error ml-0.5">*</span>
      </label>
      <slot name="labelRight" />
    </div>

    <div
      class="relative flex items-center rounded-[var(--wf-radius-md,8px)] border transition-all duration-150 bg-wf-surface focus-within:ring-2 focus-within:ring-wf-primary/20 focus-within:border-wf-primary"
      :class="[
        error ? 'border-wf-error focus-within:border-wf-error focus-within:ring-wf-error/20' : 'border-wf-border hover:border-slate-300 dark:hover:border-slate-600',
        disabled ? 'opacity-60 bg-wf-surface-variant cursor-not-allowed' : '',
      ]"
    >
      <div v-if="$slots.prepend" class="pl-3 flex items-center text-wf-text-muted pointer-events-none shrink-0">
        <slot name="prepend" />
      </div>

      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        @input="handleInput"
        class="w-full h-10 bg-transparent px-3 py-2 text-sm text-wf-text-primary placeholder:text-wf-text-muted placeholder:text-sm focus:outline-none disabled:cursor-not-allowed"
        :class="[
          $slots.prepend ? 'pl-2' : 'pl-3',
          $slots.append ? 'pr-2' : 'pr-3',
        ]"
      />

      <div v-if="$slots.append" class="pr-3 flex items-center text-wf-text-muted shrink-0">
        <slot name="append" />
      </div>
    </div>

    <p v-if="error" class="text-xs text-wf-error font-medium animate-fadeIn">
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-xs text-wf-text-muted">
      {{ hint }}
    </p>
  </div>
</template>
