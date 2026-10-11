<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
  page: number
  pageSize: number
  total: number
  pageSizes?: number[]
}
const props = withDefaults(defineProps<Props>(), { pageSizes: () => [10, 25, 50, 100] })

const emit = defineEmits<{
  (e: 'update:page', v: number): void
  (e: 'update:pageSize', v: number): void
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.page * props.pageSize, props.total))

function onSize(e: Event) {
  emit('update:pageSize', Number((e.target as HTMLSelectElement).value))
}
</script>

<template>
  <div class="flex items-center justify-between gap-3 h-9 px-3 border-t border-wf-border bg-wf-surface-variant/40 text-xs text-wf-text-muted">
    <div class="flex items-center gap-2">
      <label for="wf-page-size">Rows</label>
      <select
        id="wf-page-size"
        :value="pageSize"
        class="h-7 bg-wf-surface border border-wf-border rounded-wf-sm px-1.5 text-xs text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20"
        @change="onSize"
      >
        <option v-for="s in pageSizes" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
    <span class="font-mono">Showing {{ from }}–{{ to }} of {{ total }}</span>
    <div class="flex items-center gap-1">
      <button
        type="button" aria-label="Previous page" :disabled="page <= 1"
        class="h-7 w-7 inline-flex items-center justify-center rounded-wf-sm hover:bg-wf-surface disabled:opacity-40 disabled:pointer-events-none"
        @click="emit('update:page', page - 1)"
      ><ChevronLeft class="w-4 h-4" /></button>
      <span class="font-mono px-1">{{ page }} / {{ totalPages }}</span>
      <button
        type="button" aria-label="Next page" :disabled="page >= totalPages"
        class="h-7 w-7 inline-flex items-center justify-center rounded-wf-sm hover:bg-wf-surface disabled:opacity-40 disabled:pointer-events-none"
        @click="emit('update:page', page + 1)"
      ><ChevronRight class="w-4 h-4" /></button>
    </div>
  </div>
</template>
