<template>
  <WfCard variant="elevated" padding="md" radius="lg" class="h-full flex flex-col justify-between">
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between mb-3 pb-2 border-b border-wf-border-subtle shrink-0">
        <div class="flex items-center gap-2">
          <Activity class="w-4 h-4 text-wf-primary" />
          <h3 class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Family Pulse</h3>
        </div>
        <span
          class="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5"
          :class="isConnected
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"></span>
          <span>{{ isConnected ? 'Live' : 'Offline' }}</span>
        </span>
      </div>

      <div v-if="displayItems.length === 0" class="flex-1 flex flex-col items-center justify-center py-8 text-center text-xs text-wf-text-muted">
        <Radio class="w-7 h-7 text-wf-text-muted/50 mb-2 stroke-[1.5]" />
        <p>Listening for family milestones & activity...</p>
      </div>

      <div v-else class="divide-y divide-wf-border-subtle flex-1 flex flex-col justify-around">
        <div
          v-for="item in displayItems"
          :key="item.id"
          class="py-2.5 flex items-start gap-2.5 hover:bg-wf-surface-variant/30 rounded-wf-md px-1 transition-colors"
        >
          <div
            class="w-7 h-7 rounded-wf-md flex items-center justify-center text-xs shrink-0 border mt-0.5"
            :class="getCategoryBadgeClass(item.category)"
          >
            <component :is="getCategoryIcon(item.category)" class="w-3.5 h-3.5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <span class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted">{{ item.category }}</span>
              <span class="text-[10px] text-wf-text-muted font-medium tabular-nums">{{ formatTimeAgo(item.created_at) }}</span>
            </div>
            <h4 class="text-xs font-bold text-wf-text-primary leading-tight truncate">{{ cleanTitle(item.title) }}</h4>
            <p class="text-[11px] text-wf-text-secondary leading-snug line-clamp-1 mt-0.5">{{ cleanBody(item.body) }}</p>
          </div>
        </div>
      </div>
    </div>
  </WfCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Activity, Radio, ArrowUpRight, Target, AlertTriangle, Landmark, Bell } from 'lucide-vue-next'
import { useWebSockets } from '@/composables/useWebSockets'
import { useTransactionHelpers } from '@/composables/useTransactionHelpers'
import WfCard from '@/components/ui/WfCard.vue'

const { notifications, isConnected } = useWebSockets()
const { formatTimeAgo } = useTransactionHelpers({ value: [] } as any, { value: [] } as any, { value: [] } as any)

const displayItems = computed(() => {
  return notifications.value.slice(0, 4)
})

function getCategoryIcon(category: string) {
  switch (category?.toUpperCase()) {
    case 'EXPENSE': return ArrowUpRight
    case 'MILESTONE': return Target
    case 'BUDGET_ALERT': return AlertTriangle
    case 'ACCOUNT': return Landmark
    default: return Bell
  }
}

function getCategoryBadgeClass(category: string) {
  switch (category?.toUpperCase()) {
    case 'EXPENSE':
      return 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
    case 'MILESTONE':
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
    case 'BUDGET_ALERT':
      return 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
    case 'ACCOUNT':
      return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40'
    default:
      return 'bg-wf-surface-variant text-wf-text-secondary border-wf-border-subtle'
  }
}

function cleanTitle(title: string) {
  if (!title) return ''
  return title.replace(/^[^\w\s₹$€£]+/, '').trim()
}

function cleanBody(body: string) {
  if (!body) return ''
  // Clean up duplicated names like "Test User Test User..."
  let cleaned = body.replace(/(Test User\s*)+/gi, 'Test User ')
  // Clean up long hashes like Integrity Acc 3e05404a -> Integrity Acc
  cleaned = cleaned.replace(/([A-Za-z]+_[0-9]+)/g, (m) => m.split('_')[0])
  return cleaned
}
</script>
