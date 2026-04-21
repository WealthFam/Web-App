<template>
  <div class="donut-chart-wrapper d-flex flex-column flex-md-row align-center gap-8 py-4">
    <!-- Chart Container -->
    <div class="chart-container" :style="{ width: size + 'px', height: size + 'px' }">
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
    <div v-if="showLegend" class="compact-legend flex-grow-1">
      <div class="legend-grid">
        <div 
          v-for="(item, index) in data" 
          :key="index" 
          class="legend-row"
          :class="{ 'dimmed': hoveredIndex !== null && hoveredIndex !== index }"
          @mouseenter="setActive(index)"
          @mouseleave="resetActive"
        >
          <div class="item-visual d-flex align-center gap-3">
            <div class="mini-indicator" :style="{ background: colors[index % colors.length] }"></div>
            <div class="item-meta">
              <span class="item-name text-truncate">{{ item.label }}</span>
              <div class="item-details">
                <span class="item-percent">{{ item.value }}%</span>
                <div class="mini-track">
                  <div class="mini-fill" :style="{ width: item.value + '%', background: colors[index % colors.length] }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

const props = defineProps<{
  data: Array<{ label: string, value: number }>
  label?: string
  size?: number
  strokeWidth?: number
  showLegend?: boolean
}>()

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
  onHover: (event, elements) => {
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
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.legend-row {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-border-color), 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.legend-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-color: rgba(var(--v-theme-primary), 0.2);
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
  font-size: 12px;
  font-weight: 900;
  min-width: 32px;
}

.mini-track {
  height: 3px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 2px;
  flex-grow: 1;
  overflow: hidden;
}

.mini-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 1s ease-in-out;
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
