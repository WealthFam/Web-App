<template>
  <div class="donut-chart-wrapper flex flex-col md:flex-row items-center gap-5 py-2 w-full">
    <!-- Chart Container -->
    <div class="chart-container shrink-0" :style="{ width: size + 'px', height: size + 'px' }">
      <Doughnut
        v-if="chartData.datasets[0].data.length"
        :data="chartData"
        :options="chartOptions"
      />
      
      <!-- Center Info Override -->
      <div class="center-info">
        <span class="center-label">{{ activeLabel }}</span>
        <span class="center-value">{{ activeValue }}%</span>
      </div>
    </div>

    <!-- Proper Space-Efficient Legend -->
    <div v-if="showLegend" class="compact-legend flex-1 min-w-0 w-full">
      <div class="legend-grid">
        <div 
          v-for="(item, index) in data" 
          :key="index" 
          class="legend-row"
          :class="{ 'dimmed': hoveredIndex !== null && hoveredIndex !== index }"
          @mouseenter="setActive(index)"
          @mouseleave="resetActive"
        >
          <div class="item-visual flex items-center gap-2">
            <div class="mini-indicator shrink-0" :style="{ background: colors[index % colors.length] }"></div>
            <div class="item-meta min-w-0 flex-1">
              <span class="item-name truncate block" :title="item.label">{{ item.label }}</span>
              <div class="item-details">
                <span class="item-percent font-mono">{{ Number(item?.value || 0).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
  CategoryScale,
  ChartData,
  ChartOptions
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController, CategoryScale)

const props = withDefaults(defineProps<{
  data: Array<{ label: string, value: number }>
  label?: string
  size?: number
  strokeWidth?: number
  showLegend?: boolean
}>(), {
  showLegend: true
})

const colors = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
]

const size = props.size || 220
const hoveredIndex = ref<number | null>(null)

const activeLabel = computed(() => {
  if (hoveredIndex.value !== null) return props.data[hoveredIndex.value].label
  return props.label || 'Portfolio'
})

const activeValue = computed(() => {
  if (hoveredIndex.value !== null) return Math.round(props.data[hoveredIndex.value].value)
  return Math.round(props.data.reduce((s, i) => s + i.value, 0))
})

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: props.data.map(d => d.label),
  datasets: [{
    data: props.data.map(d => d.value),
    backgroundColor: colors,
    borderWidth: 0,
    hoverOffset: 12,
    borderRadius: 6,
    spacing: 5,
  }]
}))

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '82%',
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#1e293b',
      bodyColor: '#1e293b',
      padding: 12,
      cornerRadius: 12,
      displayColors: true,
      boxPadding: 4,
      callbacks: {
        label: (context) => ` ${context.label}: ${context.raw}%`
      }
    }
  },
  onHover: (_event, elements) => {
    if (elements.length > 0) {
      hoveredIndex.value = elements[0].index
    } else {
      hoveredIndex.value = null
    }
  }
}))

function setActive(index: number) {
  hoveredIndex.value = index
}

function resetActive() {
  hoveredIndex.value = null
}
</script>

<style scoped>
.donut-chart-wrapper {
  width: 100%;
}

.chart-container {
  position: relative;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.center-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  width: 100%;
  padding: 0 20px;
}

.center-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.5;
  text-align: center;
  margin-bottom: 2px;
}

.center-value {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.5px;
}

/* Proper Space-Efficient Legend */
.compact-legend {
  min-width: 0;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 2px;
}

.legend-row {
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.15);
  transition: all 0.2s ease;
  cursor: pointer;
}

.legend-row:hover {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateY(-1px);
}

.legend-row.dimmed {
  opacity: 0.4;
  filter: grayscale(0.5);
}

.mini-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex-grow: 1;
}

.item-name {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.item-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-percent {
  font-size: 11px;
  font-weight: 800;
  opacity: 0.9;
}

@media (max-width: 960px) {
  .donut-chart-wrapper {
    flex-direction: column;
  }
  .legend-grid {
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }
}
</style>
