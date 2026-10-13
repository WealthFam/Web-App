<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Search, X, Check } from 'lucide-vue-next'

interface Item { title: string; value: string | number | boolean | null }

interface Props {
  modelValue?: string | number | boolean | null
  items: Item[]
  label?: string
  placeholder?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  required?: boolean
  error?: string
  ariaLabel?: string
  searchable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  size: 'md',
  disabled: false,
  required: false,
  searchable: false,
})

const emit = defineEmits<{ (e: 'update:modelValue', value: any): void }>()

// Native select logic
const selectedIndex = computed(() => props.items.findIndex(i => i.value === props.modelValue))

function onChange(e: Event) {
  const idx = Number((e.target as HTMLSelectElement).value)
  emit('update:modelValue', idx >= 0 ? props.items[idx].value : '')
}

// Searchable dropdown logic
const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const selectedItem = computed(() => props.items.find(i => i.value === props.modelValue))

const hasSelected = computed(() => selectedIndex.value >= 0)

const displayTitle = computed(() => {
  if (selectedItem.value) {
    return selectedItem.value.title.replace(/^[\s\u3000└]+/, '')
  }
  return ''
})

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return props.items
  const q = searchQuery.value.toLowerCase().trim()
  return props.items.filter(item =>
    item.title.toLowerCase().includes(q) ||
    String(item.value ?? '').toLowerCase().includes(q)
  )
})

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
}

function selectItem(item: Item) {
  emit('update:modelValue', item.value)
  closeDropdown()
}

function onSearchEnter() {
  if (filteredItems.value.length > 0) {
    selectItem(filteredItems.value[0])
  }
}

function onDocumentClick(e: MouseEvent) {
  if (isOpen.value && containerRef.value && !containerRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

watch(isOpen, (open) => {
  if (open) {
    searchQuery.value = ''
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentClick)
})
</script>

<template>
  <div ref="containerRef" class="flex flex-col gap-1.5 text-left min-w-0">
    <label v-if="label" class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider select-none">
      {{ label }}<span v-if="required" class="text-wf-error ml-0.5">*</span>
    </label>

    <!-- SEARCHABLE DROPDOWN MODE -->
    <div v-if="searchable" class="relative">
      <button
        type="button"
        :disabled="disabled"
        :aria-label="ariaLabel || label || placeholder"
        :aria-expanded="isOpen"
        class="w-full appearance-none bg-wf-surface text-wf-text-primary border rounded-wf-md pl-3 pr-8 truncate transition-colors text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary disabled:opacity-60 disabled:cursor-not-allowed"
        :class="[
          size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm',
          error ? 'border-wf-error' : 'border-wf-border hover:border-wf-text-muted',
          isOpen ? 'border-wf-primary ring-2 ring-wf-primary/20' : '',
        ]"
        @click="toggleDropdown"
      >
        <span class="truncate" :class="{ 'text-wf-text-muted': !hasSelected }">
          {{ hasSelected ? displayTitle : (placeholder || 'Select...') }}
        </span>
        <ChevronDown
          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-wf-text-muted transition-transform duration-150"
          :class="{ 'rotate-180': isOpen }"
          aria-hidden="true"
        />
      </button>

      <!-- FLOATING POPOVER -->
      <div
        v-if="isOpen"
        class="absolute left-0 top-full mt-1 z-50 w-full min-w-[220px] bg-wf-surface border border-wf-border rounded-wf-md shadow-xl overflow-hidden flex flex-col"
      >
        <!-- SEARCH INPUT -->
        <div class="p-2 border-b border-wf-border-subtle bg-wf-surface-variant/30 flex items-center gap-1.5">
          <Search class="w-3.5 h-3.5 text-wf-text-muted shrink-0" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            class="w-full text-xs bg-transparent border-none outline-none text-wf-text-primary placeholder:text-wf-text-muted focus:ring-0 p-0"
            @keydown.stop
            @keydown.esc="closeDropdown"
            @keydown.enter.prevent="onSearchEnter"
          />
          <button
            v-if="searchQuery"
            type="button"
            @click.stop="searchQuery = ''"
            class="text-wf-text-muted hover:text-wf-text-primary p-0.5 rounded text-xs shrink-0"
            aria-label="Clear search"
          >
            <X class="w-3 h-3" />
          </button>
        </div>

        <!-- LIST ITEMS -->
        <div class="max-h-56 overflow-y-auto p-1 space-y-0.5 overscroll-contain">
          <div v-if="filteredItems.length === 0" class="px-3 py-3 text-center text-xs text-wf-text-muted">
            No options found
          </div>
          <button
            v-for="item in filteredItems"
            :key="String(item.value)"
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs truncate transition-colors flex items-center justify-between cursor-pointer rounded-wf-sm"
            :class="[
              item.value === modelValue
                ? 'bg-wf-primary/10 text-wf-primary font-medium'
                : 'text-wf-text-primary hover:bg-wf-surface-variant'
            ]"
            @click="selectItem(item)"
          >
            <span class="truncate whitespace-pre">{{ item.title }}</span>
            <Check v-if="item.value === modelValue" class="w-3.5 h-3.5 shrink-0 ml-1.5 text-wf-primary" />
          </button>
        </div>
      </div>
    </div>

    <!-- NATIVE SELECT MODE (DEFAULT) -->
    <div v-else class="relative">
      <select
        :value="selectedIndex"
        :disabled="disabled"
        :aria-label="ariaLabel || label || placeholder"
        class="w-full appearance-none bg-wf-surface text-wf-text-primary border rounded-wf-md pl-3 pr-8 truncate transition-colors focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary disabled:opacity-60 disabled:cursor-not-allowed"
        :class="[
          size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm',
          error ? 'border-wf-error' : 'border-wf-border hover:border-wf-text-muted',
        ]"
        @change="onChange"
      >
        <option v-if="placeholder && selectedIndex < 0" :value="-1" disabled>{{ placeholder }}</option>
        <option v-for="(item, i) in items" :key="i" :value="i">{{ item.title }}</option>
      </select>
      <ChevronDown class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-wf-text-muted" aria-hidden="true" />
    </div>

    <p v-if="error" class="text-xs text-wf-error font-medium">{{ error }}</p>
  </div>
</template>
