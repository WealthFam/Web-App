<script setup lang="ts">
import { TrendingUp, RefreshCw } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

defineProps<{
  insights: any[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'analyze'): void
}>()

const router = useRouter()
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
          <TrendingUp class="w-4 h-4 text-wf-primary" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-wf-text-primary leading-none">Budget Insights</h2>
          <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">Financial analysis & automated recommendations</p>
        </div>
      </div>

      <WfButton
        v-if="insights.length === 0"
        size="sm"
        variant="primary"
        :disabled="loading"
        @click="emit('analyze')"
      >
        <RefreshCw class="w-3.5 h-3.5 mr-1.5" :class="loading ? 'animate-spin' : ''" />
        <span>Analyze Now</span>
      </WfButton>

      <button
        v-else
        type="button"
        @click="emit('analyze')"
        :disabled="loading"
        class="p-1.5 rounded-wf-sm text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
        title="Refresh Insights"
      >
        <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin text-wf-primary' : ''" />
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div v-for="i in 2" :key="`skel-${i}`" class="p-4 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border-subtle animate-pulse h-24"></div>
    </div>

    <!-- Insights Cards Grid -->
    <div v-else-if="insights.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <WfCard
        v-for="insight in insights"
        :key="insight.id || insight.title"
        class="p-4 border-wf-border transition-all duration-200"
        :class="insight.action ? 'cursor-pointer hover:shadow-wf-card-hover' : ''"
        @click="insight.action === 'settings' ? router.push('/settings') : null"
      >
        <div class="flex items-start gap-3.5">
          <div
            class="w-9 h-9 rounded-wf-md flex items-center justify-center text-lg shrink-0 border"
            :class="insight.type === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900/50' : insight.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/30 dark:border-amber-900/50' : 'bg-indigo-50 border-indigo-200 text-wf-primary dark:bg-indigo-950/30 dark:border-indigo-900/50'"
          >
            <span>{{ insight.icon || '📊' }}</span>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-1">
              <h4 class="text-xs font-bold text-wf-text-primary truncate">{{ insight.title }}</h4>
              <span
                class="px-2 py-0.2 rounded-wf-pill text-[10px] font-bold border shrink-0"
                :class="insight.type === 'danger' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50' : 'bg-wf-primary-light text-wf-primary border-indigo-200 dark:border-indigo-900/50'"
              >
                {{ insight.action ? 'Action Required' : 'Insight' }}
              </span>
            </div>
            <p class="text-xs text-wf-text-secondary leading-relaxed line-clamp-3">
              {{ insight.content }}
            </p>
          </div>
        </div>
      </WfCard>
    </div>
  </div>
</template>
