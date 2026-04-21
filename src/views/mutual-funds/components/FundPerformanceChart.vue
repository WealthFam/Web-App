<template>
  <div ref="container" class="line-chart-container" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none">
      <!-- Grid lines -->
      <g class="grid">
        <line v-for="i in 5" :key="`h-${i}`" :x1="padding.left" :y1="padding.top + (chartHeight / 4) * (i - 1)"
          :x2="width - padding.right" :y2="padding.top + (chartHeight / 4) * (i - 1)" stroke="currentColor"
          stroke-width="1" class="chart-grid-line" />
      </g>

      <!-- Gradient definition for area fill -->
      <defs>
        <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
        </linearGradient>
        
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Area fill (smooth) -->
      <path v-if="paths.area" :d="paths.area" fill="url(#valueGradient)" stroke="none" class="animate-fade-in" />

      <!-- Value line (smooth) -->
      <path v-if="paths.value" :d="paths.value" fill="none" stroke="#3b82f6" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round" class="chart-line-value" filter="url(#glow)" />

      <!-- Invested line (smooth dashed) -->
      <path v-if="paths.invested" :d="paths.invested" fill="none" stroke="#94a3b8" stroke-width="1"
        stroke-dasharray="6,4" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;" />

            <!-- Benchmark lines (dynamic) -->
      <path v-for="(bm, idx) in benchmarkPaths" :key="`bm-${idx}`"
        :d="bm.path" fill="none" :stroke="bm.styling?.color || '#94a3b8'" :stroke-width="1.5"
        :stroke-dasharray="bm.styling?.dashArray" stroke-linecap="round" stroke-linejoin="round"
        style="opacity: 0.6;" />

      <!-- Vertical Tracking Line -->
      <line v-if="hoveredIndex !== null" :x1="padding.left + xScale(hoveredIndex)" :y1="padding.top"
        :x2="padding.left + xScale(hoveredIndex)" :y2="height - padding.bottom" 
        stroke="rgba(var(--v-theme-primary), 0.3)" stroke-width="1" stroke-dasharray="4,4" />

      <!-- Data points (visible circles on hover) -->
      <g v-if="hoveredIndex !== null" class="data-points">
        <circle :cx="padding.left + xScale(hoveredIndex)" :cy="padding.top + yScale(data[hoveredIndex].value)"
          r="6" fill="#3b82f6" stroke="white" stroke-width="2" pointer-events="none" />
      </g>

      <!-- Premium Transaction Markers -->
      <g v-if="markers" class="transaction-markers">
        <g v-for="(marker, index) in markerPoints" :key="`marker-${index}`" 
           class="marker-group" :class="{ 'marker-buy': marker.type !== 'SELL', 'marker-sell': marker.type === 'SELL' }">
          
          <!-- Outer Pulse Effect -->
          <circle :cx="marker.x" :cy="marker.y" :r="12" class="marker-pulse" />
          
          <!-- Main Dot -->
          <circle :cx="marker.x" :cy="marker.y" :r="9" class="marker-base" />
          
          <!-- Arrow Icon (Up for Buy, Down for Sell) -->
          <g transform="translate(-4, -4)" pointer-events="none">
             <path v-if="marker.type !== 'SELL'" 
                   :transform="`translate(${marker.x}, ${marker.y})`"
                   d="M 4,1 L 7,4 L 5.5,4 L 5.5,7 L 2.5,7 L 2.5,4 L 1,4 Z" 
                   fill="white" stroke="white" stroke-width="0.5" />
             <path v-else 
                   :transform="`translate(${marker.x}, ${marker.y})`"
                   d="M 4,7 L 1,4 L 2.5,4 L 2.5,1 L 5.5,1 L 5.5,4 L 7,4 Z" 
                   fill="white" stroke="white" stroke-width="0.5" />
          </g>
        </g>
      </g>

      <!-- Y-axis labels -->
      <g class="y-axis-labels">
        <text v-for="(label, i) in yAxisLabels" :key="`y-${i}`" :x="padding.left - 12"
          :y="padding.top + (chartHeight / 4) * i + 4" text-anchor="end" class="axis-label">
          {{ label }}
        </text>
      </g>

      <!-- X-axis labels -->
      <g class="x-axis-labels">
        <text v-for="(label, i) in xAxisLabels" :key="`x-${i}`"
          :x="xAxisLabels.length > 1 ? padding.left + (chartWidth / (xAxisLabels.length - 1)) * i : padding.left + chartWidth / 2"
          :y="height - padding.bottom + 24" text-anchor="middle" class="axis-label">
          {{ label }}
        </text>
      </g>
    </svg>

    <!-- Legend -->
    <div v-if="!hideLegend" class="chart-legend">
      <div class="legend-item" @click="$emit('toggle-invested')">
        <div class="legend-dot" style="background: #3b82f6;"></div>
        <span>{{ props.valueLabel || 'Portfolio Value' }}</span>
      </div>
      <div class="legend-item" @click="$emit('toggle-invested')">
        <div class="legend-dot dashed" style="background: #94a3b8;"></div>
        <span>{{ props.investedLabel || 'Invested' }}</span>
      </div>
      <div v-if="benchmarkDataList.length > 0" v-for="(bm, idx) in benchmarkDataList" :key="`leg-bm-${idx}`" 
        class="legend-item pointer" @click="$emit('toggle-benchmark', bm.symbol)">
        <div class="legend-dot" :style="{ 
          background: bm.styling?.color || '#f59e0b',
          border: bm.styling?.style === 'dotted' ? `1.5px dotted ${bm.styling.color}` : 'none',
          borderRadius: bm.styling?.style === 'dashed' ? '2px' : '50%',
          opacity: isBenchmarkVisible(bm.symbol) ? 1 : 0.3
        }" :class="{ dashed: bm.styling?.style === 'dashed', dotted: bm.styling?.style === 'dotted' }"></div>
        <span :class="{ 'opacity-30': !isBenchmarkVisible(bm.symbol) }">{{ bm.label }}</span>
      </div>
    </div>

    <!-- Enhanced Tooltip -->
    <div v-if="tooltip.visible" class="chart-tooltip" 
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', transform: tooltip.flipped ? 'translateX(-100%)' : 'none' }">
      <div class="tooltip-header">
        <span class="tooltip-date">{{ tooltip.date }}</span>
        <div v-if="tooltip.transaction" class="transaction-badge" :class="tooltip.transaction.type.toLowerCase()">
          {{ tooltip.transaction.type }} {{ formatAmount(tooltip.transaction.amount) }} ({{ Number(tooltip.transaction.units).toFixed(3) }} units)
        </div>
      </div>
      
      <div class="tooltip-content">
        <div class="tooltip-stat">
          <span class="stat-label">{{ props.valueLabel || 'Value' }}</span>
          <span class="stat-value">{{ formatAmount(tooltip.value) }}</span>
        </div>
        <div class="tooltip-stat">
          <span class="stat-label">Invested</span>
          <span class="stat-value">{{ formatAmount(tooltip.invested) }}</span>
        </div>
                <div class="tooltip-divider"></div>
        <div class="tooltip-stat pnl" :class="tooltip.gain >= 0 ? 'positive' : 'negative'">
          <span class="stat-label">P&L</span>
          <span class="stat-value font-weight-black">
            {{ tooltip.gain >= 0 ? '+' : '' }}{{ formatAmount(tooltip.gain) }}
            <span class="text-[10px]">({{ ((tooltip.gain / (tooltip.invested || 1)) * 100).toFixed(2) }}%)</span>
          </span>
        </div>

        <!-- Benchmark Values in Tooltip -->
        <template v-for="(bm, idx) in tooltip.benchmarks" :key="`tt-bm-${idx}`">
          <div class="tooltip-divider border-dashed opacity-30"></div>
          <div class="tooltip-stat">
            <span class="stat-label text-[10px]">{{ bm.label }}</span>
            <span class="stat-value text-[11px]">{{ formatAmount(bm.value) }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  data: Array<{ date: string; value: number; invested: number }>
  benchmark?: Array<{ date: string; value: number }>
  benchmarks?: Array<{ 
    label: string; 
    symbol: string; 
    data: Array<{ date: string; value: number }>;
    styling?: { color: string; style: string; dashArray: string }
  }>
  markers?: Array<{ date: string; type: 'BUY' | 'SELL' | 'SIP'; amount: number; units: number }>
  height?: number
  hideLegend?: boolean
  yMin?: 'zero' | 'auto'
  valueLabel?: string
  investedLabel?: string
}>()

const emit = defineEmits(['toggle-benchmark', 'toggle-invested'])

const container = ref<HTMLElement | null>(null)
const width = ref(800)
const height = props.height || 300
const padding = { top: 20, right: 30, bottom: 40, left: 65 }

const chartWidth = computed(() => width.value - padding.left - padding.right)
const chartHeight = height - padding.top - padding.bottom

const hoveredIndex = ref<number | null>(null)
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  flipped: false,
  date: '',
  value: 0,
  invested: 0,
  gain: 0,
  benchmarks: [] as Array<{ label: string; value: number }>,
  transaction: null as any
})

// Resize observation
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

// Scales
const maxValue = computed(() => {
  if (!props.data || props.data.length === 0) return 100
  let max = Math.max(...props.data.map(d => Math.max(d.value, d.invested)))
  if (props.benchmark?.length) {
    max = Math.max(max, ...props.benchmark.map(b => b.value))
  }
  return max * 1.05 // 5% padding top
})

const minValue = computed(() => {
  if (props.yMin === 'auto' && props.data?.length) {
    let min = Math.min(...props.data.map(d => Math.min(d.value, d.invested)))
    if (props.benchmark?.length) {
      min = Math.min(min, ...props.benchmark.map(b => b.value))
    }
    return Math.max(0, min * 0.95)
  }
  return 0
})

const yScale = (value: number) => {
  const range = maxValue.value - minValue.value
  return chartHeight - ((value - minValue.value) / (range || 1)) * chartHeight
}

const xScale = (index: number) => {
  if (props.data.length <= 1) return chartWidth.value / 2
  return (index / (props.data.length - 1)) * chartWidth.value
}

// Path Generation with Bezier Smoothing
const getPathData = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return ''
  let path = `M ${points[0].x},${points[0].y}`
  const smoothing = 0.15
  
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
}

const paths = computed(() => {
  if (!props.data.length) return { value: '', invested: '', area: '', benchmark: '' }

  const vPoints = props.data.map((d, i) => ({
    x: padding.left + xScale(i),
    y: padding.top + yScale(d.value)
  }))

  const iPoints = props.data.map((d, i) => ({
    x: padding.left + xScale(i),
    y: padding.top + yScale(d.invested)
  }))

  const vPath = getPathData(vPoints)
  const iPath = getPathData(iPoints)

  let aPath = ''
  if (vPoints.length) {
    aPath = `${vPath} L ${vPoints[vPoints.length - 1].x},${height - padding.bottom} L ${padding.left},${height - padding.bottom} Z`
  }

    return { value: vPath, invested: iPath, area: aPath }
})

const benchmarkDataList = computed(() => {
  const list = []
  if (props.benchmarks?.length) {
    list.push(...props.benchmarks)
  } else if (props.benchmark?.length) {
    list.push({
      label: 'Nifty 50',
      symbol: 'LEGACY',
      data: props.benchmark,
      styling: { color: '#f59e0b', style: 'dotted', dashArray: '2,3' }
    })
  }
  return list
})

const benchmarkPaths = computed(() => {
  return benchmarkDataList.value.map(bm => {
    if (!bm.data.length) return { path: "", styling: bm.styling }
    const bPoints = bm.data.map((b, i) => ({
      x: padding.left + xScale(i),
      y: padding.top + yScale(b.value)
    }))
    return {
      label: bm.label,
      path: getPathData(bPoints),
      styling: bm.styling || { color: '#607D8B', style: 'dashed', dashArray: '5,5' }
    }
  })
})

// Interaction Handlers
const handleMouseMove = (e: MouseEvent) => {
  if (!container.value || !props.data.length) return
  const rect = container.value.getBoundingClientRect()
  const x = e.clientX - rect.left - padding.left
  
  const index = Math.max(0, Math.min(props.data.length - 1, 
    Math.round((x / chartWidth.value) * (props.data.length - 1))
  ))
  
  hoveredIndex.value = index
  updateTooltip(index, e, rect)
}

const handleMouseLeave = () => {
  hoveredIndex.value = null
  tooltip.value.visible = false
}

const updateTooltip = (index: number, e: MouseEvent, rect: DOMRect) => {
  const d = props.data[index]
  const tx = props.markers?.find(m => m.date.substring(0, 10) === d.date.substring(0, 10))
  
  let txX = e.clientX - rect.left + 20
  let flipped = false
  if (txX + 220 > rect.width) {
    txX = e.clientX - rect.left - 20
    flipped = true
  }

  tooltip.value = {
    visible: true,
    x: txX,
    y: e.clientY - rect.top - 80,
    flipped,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    value: d.value,
    invested: d.invested,
    gain: d.value - d.invested,
    benchmarks: benchmarkDataList.value.map(bm => ({ label: bm.label, value: bm.data[index]?.value || 0 })),
    transaction: tx
  }
}

// Axis Helpers
const formatAmount = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`
  return `₹${v.toFixed(0)}`
}

const yAxisLabels = computed(() => {
  const range = maxValue.value - minValue.value
  return Array.from({ length: 5 }, (_, i) => formatAmount(maxValue.value - (range / 4) * i))
})

const xAxisLabels = computed(() => {
  if (props.data.length < 2) return []
  const step = Math.ceil(props.data.length / 5)
  return props.data.map((d, i) => {
    if (i === 0 || i === props.data.length - 1 || i % step === 0) {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }
    return ''
  })
})

const markerPoints = computed(() => {
  if (!props.markers || !props.data.length) return []
  return props.markers.map(m => {
    // Robust date matching (normalize to YYYY-MM-DD)
    const mDate = m.date.substring(0, 10)
    const idx = props.data.findIndex(d => d.date.substring(0, 10) === mDate)
    if (idx === -1) return null
    return {
      x: padding.left + xScale(idx),
      y: padding.top + yScale(props.data[idx].value),
      type: m.type,
      amount: m.amount
    }
  }).filter(Boolean) as any[]
})
const isBenchmarkVisible = (symbol: string) => {
  // If we are getting the filtered list, and current bm is in it, it's visible.
  // This helper is mainly for the legend styling.
  return benchmarkDataList.value.some(b => b.symbol === symbol)
}



</script>

<style scoped>
.line-chart-container {
  position: relative;
  width: 100%;
  height: 100%;
  padding-bottom: 20px;
}

svg {
  display: block;
  overflow: visible;
}

.chart-grid-line {
  color: rgba(var(--v-theme-on-surface), 0.05);
}

.axis-label {
  font-size: 10px;
  fill: currentColor;
  opacity: 0.4;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.chart-line-value {
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  animation: draw 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes draw {
  to { stroke-dashoffset: 0; }
}

.animate-fade-in {
  animation: fadeIn 1.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.dashed { border-radius: 2px; height: 3px; width: 12px; }
.legend-dot.dotted { border-radius: 50%; width: 6px; height: 6px; border: 1.5px dotted currentColor; background: transparent !important; }

.chart-tooltip {
  position: absolute;
  background: rgba(var(--v-theme-surface), 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--v-border-color), 0.15);
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 100;
  min-width: 200px;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.tooltip-date {
  font-size: 0.7rem;
  font-weight: 800;
  opacity: 0.5;
  text-transform: uppercase;
}

.transaction-badge {
  font-size: 9px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}

.transaction-badge.buy { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.transaction-badge.sell { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.tooltip-stat {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.6;
}

.stat-value {
  font-size: 12px;
  font-weight: 800;
}

.tooltip-divider {
  height: 1px;
  background: rgba(var(--v-border-color), 0.1);
  margin: 0.5rem 0;
}

.pnl.positive .stat-value { color: #10b981; }
.pnl.negative .stat-value { color: #ef4444; }

.marker-group {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-box: fill-box;
  transform-origin: center;
}

.marker-base {
  stroke: white;
  stroke-width: 2;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.marker-buy .marker-base { fill: #10b981; }
.marker-sell .marker-base { fill: #ef4444; }

.marker-pulse {
  fill: currentColor;
  opacity: 0;
  pointer-events: none;
  transform-box: fill-box;
  transform-origin: center;
}

.marker-buy .marker-pulse { color: #10b981; }
.marker-sell .marker-pulse { color: #ef4444; }

.marker-group:hover .marker-pulse {
  animation: pulse-ring 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

.marker-group:hover .marker-base {
  transform: scale(1.2);
}

@keyframes pulse-ring {
  0% { transform: scale(0.3); opacity: 0.8; }
  80%, 100% { transform: scale(1.5); opacity: 0; }
}
</style>
