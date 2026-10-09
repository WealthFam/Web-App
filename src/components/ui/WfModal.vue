<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  title?: string
  description?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  maxWidth: 'md',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        @click.self="close"
      >
        <div
          class="w-full bg-wf-surface border border-wf-border rounded-wf-xl shadow-wf-modal overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          :class="[
            maxWidth === 'sm' ? 'max-w-sm' : '',
            maxWidth === 'md' ? 'max-w-md' : '',
            maxWidth === 'lg' ? 'max-w-lg' : '',
            maxWidth === 'xl' ? 'max-w-xl' : '',
          ]"
        >
          <div v-if="title || $slots.header" class="flex items-center justify-between px-6 py-4 border-b border-wf-divider">
            <slot name="header">
              <div>
                <h3 class="text-base font-semibold text-wf-text-primary">{{ title }}</h3>
                <p v-if="description" class="text-xs text-wf-text-muted mt-0.5">{{ description }}</p>
              </div>
            </slot>
            <button
              type="button"
              class="p-1 rounded-wf-sm text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
              @click="close"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="p-6">
            <slot />
          </div>

          <div v-if="$slots.footer" class="flex items-center justify-end gap-3 px-6 py-4 bg-wf-surface-variant/50 border-t border-wf-divider">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
