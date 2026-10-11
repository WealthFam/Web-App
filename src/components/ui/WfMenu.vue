<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props { align?: 'left' | 'right'; label?: string }
withDefaults(defineProps<Props>(), { align: 'right', label: 'Actions' })

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => { document.addEventListener('click', onDocClick); document.addEventListener('keydown', onKey) })
onUnmounted(() => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) })
</script>

<template>
  <div ref="root" class="relative inline-block" @click.stop>
    <button
      type="button"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      class="h-8 w-8 inline-flex items-center justify-center rounded-wf-md text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wf-primary"
      @click="open = !open"
    >
      <slot name="trigger" />
    </button>
    <Transition enter-active-class="transition duration-100" enter-from-class="opacity-0 scale-95" leave-active-class="transition duration-75" leave-to-class="opacity-0">
      <div
        v-if="open"
        role="menu"
        class="absolute z-40 mt-1 min-w-[170px] py-1 bg-wf-surface border border-wf-border rounded-wf-lg shadow-wf-card-hover"
        :class="align === 'right' ? 'right-0' : 'left-0'"
        @click="open = false"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>
