<template>
  <div ref="container" class="sparkline-wrapper d-flex align-center justify-center position-relative"
    :style="{ width: '100%', height: (props.height + 25) + 'px' }">
    <div class="spark-tooltip px-2 py-1 text-caption font-weight-black rounded shadow-sm text-center"
      v-if="hoveredIndex !== null" :style="{ left: tooltipX + 'px', top: '0px', color: props.color }">
      <div v-if="props.labels && props.labels[hoveredIndex]" class="text-overline opacity-70 mb-n1"
        style="font-size: 0.6rem;">{{ props.labels[hoveredIndex] }}</div>
      <div>{{ formatValue(props.data[hoveredIndex]) }}</div>
    </div>

    <svg class="sparkline-svg" :width="width" :height="props.height"
      :viewBox="`0 0 ${width} ${props.height}`" preserveAspectRatio="none" @mousemove="onMouseMove"
      @mouseleave="hoveredIndex = null" style="overflow: visible; cursor: crosshair">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Area Fill -->
      <path :d="areaPath" :fill="`url(#${gradientId})`" />

      <!-- Smooth Line -->
      <path :d="linePath" fill="none" :stroke="color" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" class="spark-path" />

      <!-- Hover Cursor Line -->
      <line v-if="hoveredIndex !== null" :x1="getPoint(hoveredIndex).x" y1="0" :x2="getPoint(hoveredIndex).x"
        :y2="height" stroke="rgba(var(--v-theme-on-surface), 0.1)" stroke-width="1" />
      
      <!-- Hover Point -->
      <circle v-if="hoveredIndex !== null" :cx="getPoint(hoveredIndex).x" :cy="getPoint(hoveredIndex).y" r="3"
        :fill="color" stroke="white" stroke-width="2" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  data: { type: Array as () => number[], required: true },
  labels: { type: Array as () => string[], default: () => [] },
  color: { type: String, default: '#3b82f6' },
  height: { type: Number, default: 40 },
})

const container = ref<HTMLElement | null>(null)
const width = ref(120)
const { formatAmount } = useCurrency()

const hoveredIndex = ref<number | null>(null)
const tooltipX = ref(0)
const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (container.value) {
    width.value = container.value.clientWidth
    resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) width.value = entries[0].contentRect.width
    })
    resizeObserver.observe(container.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

const min = computed(() => Math.min(...props.data))
const max = computed(() => Math.max(...props.data))

function formatValue(val: number) {
  return formatAmount(val, 'INR', true)
}

function getPoint(index: number) {
  const range = max.value - min.value
  const step = width.value / Math.max(1, props.data.length - 1)
  const x = index * step
  const y = range === 0 ? props.height / 2 : props.height - ((props.data[index] - min.value) / range) * props.height
  return { x, y }
}

const linePath = computed(() => {
  if (!props.data || props.data.length < 2) return ''
  
  const points = props.data.map((_, i) => getPoint(i))
  let path = `M ${points[0].x},${points[0].y}`
  
  const smoothing = 0.2
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i]
    const next = points[i + 1]
    const prev = points[i - 1] || curr
    const later = points[i + 2] || next
    
    const cp1x = curr.x + (next.x - prev.x) * smoothing
    const cp1y = curr.y + (next.y - prev.y) * smoothing
    const cp2x = next.x - (later.x - curr.x) * smoothing
    const cp2y = next.y - (later.y - curr.y) * smoothing
    
    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`
  }
  return path
})

const areaPath = computed(() => {
  if (!linePath.value || props.data.length < 2) return ''
  return linePath.value + ` L ${width.value},${props.height} L 0,${props.height} Z`
})

function onMouseMove(e: MouseEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const x = e.clientX - rect.left
  const step = rect.width / Math.max(1, props.data.length - 1)
  const index = Math.round(x / step)
  const safeIndex = Math.max(0, Math.min(props.data.length - 1, index))
  hoveredIndex.value = safeIndex
  const containerRect = svg.parentElement!.getBoundingClientRect()
  const pointerXInContainer = e.clientX - containerRect.left
  tooltipX.value = Math.max(0, Math.min(width.value - 40, pointerXInContainer - 20))
}
</script>

<style scoped>
.sparkline-wrapper {
  overflow: visible;
}
.spark-path {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  animation: spark-draw 1.5s ease-out forwards;
}
@keyframes spark-draw {
  to { stroke-dashoffset: 0; }
}
.spark-tooltip {
  position: absolute;
  background: rgba(var(--v-theme-surface), 0.95);
  border: 1px solid rgba(var(--v-border-color), 0.15);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  z-index: 10;
  pointer-events: none;
  min-width: 40px;
  white-space: nowrap;
  animation: fade-pop 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes fade-pop {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
