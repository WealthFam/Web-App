<template>
  <div class="budget-history-render space-y-3">
    <div class="chart-box-render">
      <BaseChart
        type="bar"
        :data="chartData"
        :options="chartOptions"
        :height="260"
        :key="settings.maskingFactor"
      />
    </div>

    <!-- Clean Legend Pills -->
    <div class="flex items-center justify-center gap-6 pt-2 border-t border-wf-border-subtle text-xs">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-wf-xs bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600"></span>
        <span class="text-wf-text-secondary font-medium text-[11px]">Budget Limit</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-wf-xs bg-indigo-600"></span>
        <span class="text-wf-text-secondary font-medium text-[11px]">Under Budget</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-wf-xs bg-rose-500"></span>
        <span class="text-wf-text-secondary font-medium text-[11px]">Over Budget</span>
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
        backgroundColor: 'rgba(148, 163, 184, 0.25)',
        borderColor: 'rgba(148, 163, 184, 0.5)',
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.85,
        categoryPercentage: 0.75
      },
      {
        label: 'Actual Spending',
        data: spent,
        backgroundColor: (context: any) => {
          const idx = context.dataIndex
          const limitVal = limits[idx] || 0
          const spentVal = spent[idx] || 0
          return limitVal > 0 && spentVal > limitVal ? '#EF4444' : '#6366F1'
        },
        borderRadius: 6,
        barPercentage: 0.55,
        categoryPercentage: 0.75,
        grouped: false // Overlap
      }
    ]
  }
})

const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94A3B8',
          font: { size: 10, weight: 'bold' }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#94A3B8',
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
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || ''
            const val = context.parsed.y !== null ? formatAmount(context.parsed.y) : ''
            return ` ${label}: ${val}`
          }
        }
      }
    }
  }
})
</script>
