<script setup lang="ts">
import { Sparkles, Zap, XCircle, Check } from 'lucide-vue-next'
import { useRulesStore, type RuleSuggestion } from '@/stores/finance/rules'
import { useCategoriesStore } from '@/stores/finance/categories'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'

const rulesStore = useRulesStore()
const categoriesStore = useCategoriesStore()

const emit = defineEmits<{
    (e: 'accept-suggestion', suggestion: RuleSuggestion): void
}>()

function acceptSuggestion(s: RuleSuggestion) {
    emit('accept-suggestion', s)
}
</script>

<template>
    <div class="space-y-4">
        <!-- Suggestions Table -->
        <WfCard
            v-if="rulesStore.suggestions.length > 0"
            variant="flat"
            padding="none"
            radius="lg"
            class="border border-wf-border bg-wf-surface overflow-hidden"
        >
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="border-b border-wf-border bg-wf-surface-variant/40 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
                            <th class="py-3 px-4 w-[240px]">Suggested Pattern</th>
                            <th class="py-3 px-3">Keywords</th>
                            <th class="py-3 px-3 w-[160px]">Target Category</th>
                            <th class="py-3 px-3 text-center w-[100px]">Impact</th>
                            <th class="py-3 px-3 text-center w-[110px]">Confidence</th>
                            <th class="py-3 px-4 text-right w-[180px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-wf-border-subtle">
                        <tr
                            v-for="item in rulesStore.suggestions"
                            :key="item.name"
                            class="hover:bg-wf-surface-variant/40 transition-colors"
                        >
                            <!-- Pattern Name -->
                            <td class="py-3 px-4">
                                <div class="flex items-center gap-2.5">
                                    <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shrink-0">
                                        <Sparkles class="w-4 h-4" />
                                    </div>
                                    <div class="min-w-0">
                                        <span class="font-bold text-xs text-wf-text-primary block truncate max-w-[180px]">
                                            {{ item.name }}
                                        </span>
                                        <span class="text-[10px] text-wf-text-muted block truncate max-w-[180px]" :title="item.reason">
                                            {{ item.reason }}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            <!-- Keywords -->
                            <td class="py-3 px-3">
                                <div class="flex flex-wrap items-center gap-1">
                                    <span
                                        v-for="(k, idx) in item.keywords.slice(0, 3)"
                                        :key="idx"
                                        class="px-1.5 py-0.5 rounded-wf-xs text-[10px] font-mono font-bold bg-wf-surface border border-wf-border text-wf-text-primary"
                                    >
                                        {{ k }}
                                    </span>
                                    <span
                                        v-if="item.keywords.length > 3"
                                        class="text-[10px] font-bold text-wf-primary px-1"
                                    >
                                        +{{ item.keywords.length - 3 }}
                                    </span>
                                </div>
                            </td>

                            <!-- Target Category -->
                            <td class="py-3 px-3">
                                <span class="px-2 py-0.5 rounded-wf-sm text-[11px] font-semibold bg-wf-surface border border-wf-border text-wf-text-primary">
                                    {{ categoriesStore.getCategoryDisplay(item.category) }}
                                </span>
                            </td>

                            <!-- Impact Count -->
                            <td class="py-3 px-3 text-center">
                                <span class="px-2 py-0.5 rounded-wf-sm text-[10px] font-bold bg-indigo-50 text-wf-primary dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                                    {{ item.count }} matches
                                </span>
                            </td>

                            <!-- Confidence -->
                            <td class="py-3 px-3 text-center">
                                <div class="inline-flex items-center gap-1 text-xs font-semibold">
                                    <Zap class="w-3.5 h-3.5" :class="['High', 'Very High'].includes(item.confidence_level || '') ? 'text-wf-success' : 'text-amber-500'" />
                                    <span>{{ item.confidence_level }}</span>
                                </div>
                            </td>

                            <!-- Actions -->
                            <td class="py-3 px-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <WfButton
                                        variant="ghost"
                                        size="sm"
                                        @click="rulesStore.ignoreSuggestion(item)"
                                        class="h-7 px-2.5 text-xs text-wf-text-muted hover:text-wf-text-primary"
                                    >
                                        <XCircle class="w-3.5 h-3.5 mr-1" />
                                        <span>Ignore</span>
                                    </WfButton>

                                    <WfButton
                                        variant="primary"
                                        size="sm"
                                        @click="acceptSuggestion(item)"
                                        class="h-7 px-3 text-xs font-semibold"
                                    >
                                        <Check class="w-3.5 h-3.5 mr-1" />
                                        <span>Approve</span>
                                    </WfButton>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </WfCard>

        <!-- No data state -->
        <div v-else class="p-16 text-center flex flex-col items-center justify-center text-wf-text-muted">
            <Sparkles class="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
            <h3 class="text-sm font-bold text-wf-text-primary">Intelligence Idle</h3>
            <p class="text-xs text-wf-text-muted mt-1 max-w-sm">
                As you categorize more transactions, WealthFam's pattern recognition engine will automatically generate smart classification suggestions here.
            </p>
        </div>
    </div>
</template>
