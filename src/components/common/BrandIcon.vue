<template>
  <!-- 1. Matched Brand Logo -->
  <div
    v-if="matchedBrand && !imageFailed"
    :class="[sizeClass, 'shrink-0 rounded-wf-md flex items-center justify-center p-1 overflow-hidden transition-all duration-150']"
    :style="{ backgroundColor: (matchedBrand.accent_color || '#6366f1') + '15' }"
    :title="matchedBrand.brand_name"
  >
    <img
      :src="resolveBrandLogoUrl(matchedBrand.logo_url)"
      :alt="matchedBrand.brand_name"
      class="w-full h-full object-contain"
      loading="lazy"
      @error="imageFailed = true"
    />
  </div>

  <!-- 2. Fallback Category Icon -->
  <div
    v-else
    :class="[sizeClass, 'shrink-0 rounded-wf-md flex items-center justify-center text-sm select-none transition-all duration-150']"
    :style="{ backgroundColor: (displayColor || '#9ca3af') + '20' }"
    :title="category || 'Category'"
  >
    <span>{{ displayIcon }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBrandsStore } from '@/stores/brands'
import { resolveBrandLogoUrl } from '@/api/client'

const props = withDefaults(
  defineProps<{
    text?: string | null
    category?: string | null
    fallbackIcon?: string
    fallbackColor?: string
    sizeClass?: string
  }>(),
  {
    text: '',
    category: '',
    fallbackIcon: '',
    fallbackColor: '',
    sizeClass: 'w-8 h-8'
  }
)

const brandsStore = useBrandsStore()
const imageFailed = ref(false)

const matchedBrand = computed(() => {
  return brandsStore.matchBrand(props.text)
})

watch(
  () => props.text,
  () => {
    imageFailed.value = false
  }
)

const displayIcon = computed(() => {
  if (props.fallbackIcon) return props.fallbackIcon
  const cat = (props.category || '').toLowerCase()
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dining')) return '🍔'
  if (cat.includes('grocer') || cat.includes('supermarket')) return '🛒'
  if (cat.includes('travel') || cat.includes('flight') || cat.includes('fuel')) return '✈️'
  if (cat.includes('shopping') || cat.includes('clothing')) return '🛍️'
  if (cat.includes('util') || cat.includes('bill') || cat.includes('electric')) return '⚡'
  if (cat.includes('entertain') || cat.includes('movie') || cat.includes('stream')) return '🎬'
  if (cat.includes('health') || cat.includes('medical') || cat.includes('pharm')) return '💊'
  if (cat.includes('invest') || cat.includes('stock') || cat.includes('mutual')) return '📈'
  if (cat.includes('bank') || cat.includes('transfer') || cat.includes('finance')) return '🏦'
  return '🏷️'
})

const displayColor = computed(() => {
  if (props.fallbackColor) return props.fallbackColor
  return '#6366f1'
})
</script>
