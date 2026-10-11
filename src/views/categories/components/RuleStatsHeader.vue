<script setup lang="ts">
import { FileText, Zap, TrendingUp, Inbox } from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import type { RuleStats } from '@/stores/finance/rules'

defineProps<{ stats: RuleStats | null }>()
</script>

<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        <!-- Total Rules -->
        <WfCard variant="flat" padding="none" radius="lg" class="p-2.5 flex items-center gap-3 border border-wf-border shadow-2xs">
            <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shrink-0">
                <FileText class="w-4 h-4" />
            </div>
            <div class="min-w-0">
                <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Total Rules</span>
                <div class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary tabular-nums leading-none">
                    {{ stats?.total_rules ?? '—' }}
                </div>
            </div>
        </WfCard>

        <!-- Total Hits -->
        <WfCard variant="flat" padding="none" radius="lg" class="p-2.5 flex items-center gap-3 border border-wf-border shadow-2xs">
            <div class="w-8 h-8 rounded-wf-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-wf-success shrink-0">
                <Zap class="w-4 h-4" />
            </div>
            <div class="min-w-0">
                <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Total Hits</span>
                <div class="text-lg sm:text-xl font-bold tracking-tight text-wf-success tabular-nums leading-none">
                    {{ stats?.total_hits ?? '—' }}
                </div>
            </div>
        </WfCard>

        <!-- Hit Rate -->
        <WfCard variant="flat" padding="none" radius="lg" class="p-2.5 flex items-center gap-3 border border-wf-border shadow-2xs">
            <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shrink-0">
                <TrendingUp class="w-4 h-4" />
            </div>
            <div class="min-w-0">
                <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Hit Rate</span>
                <div class="text-lg sm:text-xl font-bold tracking-tight text-wf-primary tabular-nums leading-none">
                    {{ stats ? `${Math.min(100, Math.round(stats.avg_hit_rate))}%` : '—' }}
                </div>
            </div>
        </WfCard>

        <!-- Pending Triage -->
        <WfCard variant="flat" padding="none" radius="lg" class="p-2.5 flex items-center gap-3 border border-wf-border shadow-2xs">
            <div class="w-8 h-8 rounded-wf-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Inbox class="w-4 h-4" />
            </div>
            <div class="min-w-0">
                <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block">Pending Triage</span>
                <div class="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums leading-none">
                    {{ stats?.pending_triage ?? '—' }}
                </div>
            </div>
        </WfCard>
    </div>
</template>
