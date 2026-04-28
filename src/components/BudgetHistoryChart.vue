<template>
  <div class="budget-history-render">
    <div class="chart-box-render">
      <BaseChart type="bar" :data="chartData" :options="chartOptions" :height="300" :key="settings.maskingFactor" />
    </div>
    <div class="d-flex justify-center gap-6 mt-4">
      <div class="lp-item limit">
        <div class="lp-box" style="background: rgba(var(--v-theme-surface-variant), 0.3)"></div>
        <span>Budget Limit</span>
      </div>
      <div class="lp-item actual">
        <div class="lp-box" style="background: rgb(var(--v-theme-primary))"></div>
        <span>Actual Spending</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import { useCurrency } from '@/composables/useCurrency'
import { useSettingsStore } from '@/stores/settings'

const { formatAmount } = useCurrency()
const settings = useSettingsStore()

const props = defineProps<{
  history: any[]
}>()

const chartData = computed(() => {
  if (!props.history || props.history.length === 0) return { labels: [], datasets: [] }

  const months = props.history.map(h => h.month)

  const limits = props.history.map(h => {
    const overall = h.data.find((d: any) => d.category === 'OVERALL')
    let val = 0
    if (overall) val = Number(overall.limit)
    else val = h.data.reduce((sum: number, d: any) => sum + Number(d.limit), 0)
    return val / (settings.maskingFactor || 1)
  })

  const spent = props.history.map(h => {
    const overall = h.data.find((d: any) => d.category === 'OVERALL')
    let val = 0
    if (overall) val = Number(overall.spent)
    else val = h.data.reduce((sum: number, d: any) => sum + Number(d.spent), 0)
    return val / (settings.maskingFactor || 1)
  })

  return {
    labels: months,
    datasets: [
      {
        label: 'Budget Limit',
        data: limits,
        backgroundColor: 'rgba(var(--v-theme-surface-variant), 0.2)',
        borderColor: 'rgba(var(--v-theme-surface-variant), 0.4)',
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.9,
        categoryPercentage: 0.8
      },
      {
        label: 'Actual Spending',
        data: spent,
        backgroundColor: (context: any) => {
          const idx = context.dataIndex
          return spent[idx] > limits[idx] ? 'rgba(var(--v-theme-error), 0.8)' : 'rgba(var(--v-theme-primary), 0.8)'
        },
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
        grouped: false, // Overlap
      }
    ]
  }
})

const chartOptions = computed(() => {
  return {
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
            color: 'rgba(var(--v-theme-on-surface), 0.5)', 
            font: { size: 10, weight: 'bold' } 
        }
      },
      y: {
        beginAtZero: true,
        grid: { 
            color: 'rgba(var(--v-theme-on-surface), 0.05)',
            drawBorder: false
        },
        ticks: {
          color: 'rgba(var(--v-theme-on-surface), 0.5)',
          font: { size: 10, weight: 'bold' },
          callback: (value: any) => formatAmount(value, undefined, true, true)
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || ''
            if (label) label += ': '
            if (context.parsed.y !== null) {
              label += formatAmount(context.parsed.y, undefined, false, true)
            }
            return label
          }
        }
      }
    }
  }
})
</script>

<style scoped>
.legend-pills-premium {
  display: flex;
  gap: 1.25rem;
}

.lp-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lp-box {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.lp-item.limit .lp-box {
  background: rgba(100, 116, 139, 0.1);
  border: 1px solid rgba(100, 116, 139, 0.3);
}

.lp-item.actual .lp-box {
  background: #6366f1;
}
</style>
