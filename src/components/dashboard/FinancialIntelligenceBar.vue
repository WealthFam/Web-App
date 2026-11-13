<template>
  <WfCard variant="elevated" padding="sm" radius="lg" class="w-full bg-gradient-to-r from-wf-surface to-wf-surface-variant/30 border-wf-border-subtle">
    <div class="space-y-2.5">
      <!-- HEADER ROW -->
      <div class="flex items-center justify-between px-1 pb-1.5 border-b border-wf-border-subtle">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shadow-2xs">
            <Sparkles class="w-3.5 h-3.5" />
          </div>
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Financial Intelligence</h3>
            <span v-if="isCached" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
              Cached
            </span>
            <span v-else class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
              Live AI
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="p-1 rounded-wf-sm text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
            @click="$emit('refresh')"
            :disabled="refreshing"
            title="Refresh AI Insights"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': refreshing }" />
          </button>
        </div>
      </div>

      <!-- HORIZONTAL INSIGHTS GRID -->
      <div v-if="insights && insights.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div
          v-for="(insight, idx) in insights"
          :key="idx"
          class="p-2.5 rounded-wf-md bg-wf-surface border border-wf-border-subtle hover:border-wf-primary/40 transition-all flex items-start gap-2.5 shadow-2xs group"
        >
          <div
            class="w-7 h-7 rounded-wf-md flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs transition-transform group-hover:scale-105"
            :class="getInsightBadgeClass(insight.type || idx)"
          >
            <component :is="getInsightIcon(insight.type || idx)" class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <h4 class="text-xs font-bold text-wf-text-primary leading-tight truncate">{{ insight.title }}</h4>
              <span class="text-[9px] font-semibold px-1 py-0.2 rounded bg-wf-surface-variant text-wf-text-muted shrink-0 uppercase">
                {{ getInsightTag(insight.type || idx) }}
              </span>
            </div>
            <p class="text-[11px] text-wf-text-secondary leading-snug line-clamp-2">{{ insight.content }}</p>
          </div>
        </div>
      </div>

      <!-- SKELETON / LOADING -->
      <div v-else-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div v-for="i in 3" :key="`skel-${i}`" class="h-16 rounded-wf-md bg-wf-surface border border-wf-border-subtle animate-pulse p-2.5 flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-wf-md bg-slate-200 dark:bg-slate-700 shrink-0"></div>
          <div class="flex-1 space-y-1.5">
            <div class="w-24 h-3 rounded bg-slate-200 dark:bg-slate-700"></div>
            <div class="w-full h-2.5 rounded bg-slate-200 dark:bg-slate-700"></div>
          </div>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div v-else class="py-3 text-center text-xs text-wf-text-muted flex items-center justify-center gap-2">
        <Sparkles class="w-4 h-4 text-wf-primary/60" />
        <span>Financial intelligence engine active — all metrics within safe operating thresholds.</span>
      </div>
    </div>
  </WfCard>
</template>

<script setup lang="ts">
import { Sparkles, RefreshCw, AlertTriangle, Lightbulb, ShieldCheck } from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'

defineProps<{
  insights: Array<{ type?: any; title: string; content: string }>
  isCached?: boolean
  refreshing?: boolean
  loading?: boolean
}>()

defineEmits(['refresh'])

function getInsightIcon(type: any) {
  if (typeof type === 'string') {
    const t = type.toLowerCase()
    if (t.includes('alert') || t.includes('breach')) return AlertTriangle
    if (t.includes('tip') || t.includes('opportunity')) return Lightbulb
    if (t.includes('health') || t.includes('security')) return ShieldCheck
  }
  switch (type % 3) {
    case 0: return AlertTriangle
    case 1: return Lightbulb
    default: return ShieldCheck
  }
}

function getInsightBadgeClass(type: any) {
  if (typeof type === 'string') {
    const t = type.toLowerCase()
    if (t.includes('alert') || t.includes('breach')) return 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
    if (t.includes('tip') || t.includes('opportunity')) return 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
    if (t.includes('health') || t.includes('security')) return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40'
  }
  switch (type % 3) {
    case 0: return 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
    case 1: return 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
    default: return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40'
  }
}

function getInsightTag(type: any) {
  if (typeof type === 'string') {
    const t = type.toLowerCase()
    if (t.includes('alert') || t.includes('breach')) return 'Action Required'
    if (t.includes('tip') || t.includes('opportunity')) return 'Optimization'
    if (t.includes('health') || t.includes('security')) return 'Health Factor'
  }
  switch (type % 3) {
    case 0: return 'Alert'
    case 1: return 'Tip'
    default: return 'Factor'
  }
}
</script>
