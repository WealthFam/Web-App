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
  native?: boolean
  teleport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  size: 'md',
  disabled: false,
  required: false,
  searchable: false,
  native: false,
  teleport: false,
})

const emit = defineEmits<{ (e: 'update:modelValue', value: any): void }>()

// Dropdown state
const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const isUpward = ref(false)
const floatingStyles = ref<Record<string, string>>({})

const selectedIndex = computed(() => props.items.findIndex(i => i.value === props.modelValue))
const selectedItem = computed(() => props.items.find(i => i.value === props.modelValue))
const hasSelected = computed(() => selectedIndex.value >= 0)

const displayTitle = computed(() => {
  if (selectedItem.value) {
    return selectedItem.value.title.replace(/^[\s\u3000└]+/, '')
  }
  return ''
})

const filteredItems = computed(() => {
  if (!props.searchable || !searchQuery.value.trim()) return props.items
  const q = searchQuery.value.toLowerCase().trim()
  return props.items.filter(item =>
    item.title.toLowerCase().includes(q) ||
    String(item.value ?? '').toLowerCase().includes(q)
  )
})

function updatePosition() {
  if (!isOpen.value) return
  const triggerEl = triggerRef.value || containerRef.value
  if (!triggerEl) return

  const rect = triggerEl.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top

  // Flip upward if less than 240px below and more room above
  isUpward.value = spaceBelow < 240 && spaceAbove > spaceBelow

  if (props.teleport) {
    const popoverWidth = Math.max(rect.width, 220)
    let left = rect.left
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12)
    }

    if (isUpward.value) {
      floatingStyles.value = {
        position: 'fixed',
        left: `${left}px`,
        width: `${rect.width}px`,
        minWidth: '220px',
        maxWidth: 'calc(100vw - 24px)',
        bottom: `${Math.max(12, window.innerHeight - rect.top + 6)}px`,
        top: 'auto',
        zIndex: '9999',
      }
    } else {
      floatingStyles.value = {
        position: 'fixed',
        left: `${left}px`,
        width: `${rect.width}px`,
        minWidth: '220px',
        maxWidth: 'calc(100vw - 24px)',
        top: `${rect.bottom + 6}px`,
        bottom: 'auto',
        zIndex: '9999',
      }
    }
  }
}

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      updatePosition()
    })
  }
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

function onNativeChange(e: Event) {
  const idx = Number((e.target as HTMLSelectElement).value)
  emit('update:modelValue', idx >= 0 ? props.items[idx].value : '')
}

function onDocumentClick(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  if (containerRef.value?.contains(target)) return
  if (popoverRef.value?.contains(target)) return
  closeDropdown()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    closeDropdown()
  }
}

watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      updatePosition()
      if (props.searchable) {
        searchQuery.value = ''
        searchInputRef.value?.focus()
      }
    })
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
  } else {
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
})
</script>

<template>
  <div ref="containerRef" class="flex flex-col gap-1.5 text-left min-w-0">
    <label v-if="label" class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider select-none">
      {{ label }}<span v-if="required" class="text-wf-error ml-0.5">*</span>
    </label>

    <!-- NATIVE SELECT FALLBACK (when explicitly requested) -->
    <div v-if="native" class="relative flex items-center">
      <select
        :value="selectedIndex"
        :disabled="disabled"
        :aria-label="ariaLabel || label || placeholder"
        class="w-full appearance-none -webkit-appearance-none bg-wf-surface text-wf-text-primary border rounded-wf-md pl-3 pr-8 truncate transition-colors focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        :class="[
          size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm',
          error ? 'border-wf-error' : 'border-wf-border hover:border-slate-300 dark:hover:border-slate-600',
        ]"
        @change="onNativeChange"
      >
        <option v-if="placeholder && selectedIndex < 0" :value="-1" disabled>{{ placeholder }}</option>
        <option v-for="(item, i) in items" :key="i" :value="i">{{ item.title }}</option>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
        <ChevronDown class="w-3.5 h-3.5 text-wf-text-muted" aria-hidden="true" />
      </div>
    </div>

    <!-- CUSTOM STYLED DROPDOWN (DEFAULT) -->
    <div v-else class="relative">
      <button
        ref="triggerRef"
        type="button"
        :disabled="disabled"
        :aria-label="ariaLabel || label || placeholder"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        class="w-full bg-wf-surface hover:bg-wf-surface-variant/40 text-wf-text-primary border rounded-wf-md transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wf-primary/20 focus-visible:border-wf-primary"
        :class="[
          size === 'sm' ? 'h-8 text-xs px-2.5' : 'h-10 text-sm px-3',
          error ? 'border-wf-error' : 'border-wf-border hover:border-slate-300 dark:hover:border-slate-600',
          isOpen ? 'border-wf-primary ring-2 ring-wf-primary/20 bg-wf-surface' : '',
        ]"
        @click="toggleDropdown"
      >
        <span class="truncate min-w-0 flex-1" :class="{ 'text-wf-text-muted': !hasSelected }">
          {{ hasSelected ? displayTitle : (placeholder || 'Select...') }}
        </span>
        <ChevronDown
          class="shrink-0 w-3.5 h-3.5 text-wf-text-muted transition-transform duration-200"
          :class="{ 'rotate-180 text-wf-primary': isOpen }"
          aria-hidden="true"
        />
      </button>

      <!-- FLOATING POPOVER -->
      <Teleport to="body" :disabled="!teleport">
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1 scale-[0.98]"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-1 scale-[0.98]"
        >
          <div
            v-if="isOpen"
            ref="popoverRef"
            :style="teleport ? floatingStyles : undefined"
            class="z-50 bg-wf-surface border border-wf-border rounded-wf-lg shadow-wf-modal overflow-hidden flex flex-col"
            :class="[
              teleport ? '' : 'absolute left-0 min-w-full w-full max-w-md',
              teleport ? '' : (isUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'),
            ]"
          >
            <!-- SEARCH INPUT (if searchable) -->
            <div v-if="searchable" class="p-2 border-b border-wf-border-subtle bg-wf-surface-variant/30 flex items-center gap-1.5">
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
            <div role="listbox" class="max-h-60 overflow-y-auto p-1 space-y-0.5 overscroll-contain">
              <div v-if="filteredItems.length === 0" class="px-3 py-3 text-center text-xs text-wf-text-muted">
                No options found
              </div>
              <button
                v-for="item in filteredItems"
                :key="String(item.value)"
                type="button"
                role="option"
                :aria-selected="item.value === modelValue"
                :title="item.title"
                class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer rounded-wf-sm"
                :class="[
                  item.value === modelValue
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-wf-primary font-semibold'
                    : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'
                ]"
                @click="selectItem(item)"
              >
                <span class="truncate min-w-0 flex-1">{{ item.title }}</span>
                <Check v-if="item.value === modelValue" class="w-3.5 h-3.5 shrink-0 ml-1.5 text-wf-primary" />
              </button>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>

    <p v-if="error" class="text-xs text-wf-error font-medium">{{ error }}</p>
  </div>
</template>
