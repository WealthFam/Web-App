<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ShieldAlert, ShieldCheck, Zap, Trash2, AlertTriangle, Tag, Copy, Layers, HelpCircle } from 'lucide-vue-next'
import { useRulesStore } from '@/stores/finance/rules'
import { useNotificationStore } from '@/stores/notification'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfAlert from '@/components/ui/WfAlert.vue'

const rulesStore = useRulesStore()
const notify = useNotificationStore()

const showDeleteConfirm = ref(false)
const ruleToDelete = ref<string | null>(null)
const migrationCategory = ref<string | null>(null)
const shouldMigrate = ref(false)

onMounted(() => {
    refreshAnalysis()
})

const refreshAnalysis = () => {
    rulesStore.fetchRuleAnalysis()
}

const confirmDelete = (ruleId: string, targetCategory?: string) => {
    ruleToDelete.value = ruleId
    migrationCategory.value = targetCategory || null
    shouldMigrate.value = !!targetCategory
    showDeleteConfirm.value = true
}

const executeDelete = async () => {
    if (!ruleToDelete.value) return
    
    const migrateTo = shouldMigrate.value ? (migrationCategory.value || undefined) : undefined
    const success = await rulesStore.deleteRule(ruleToDelete.value, migrateTo)
    
    if (success) {
        notify.success('Rule deleted successfully')
        showDeleteConfirm.value = false
        ruleToDelete.value = null
        migrationCategory.value = null
        shouldMigrate.value = false
        refreshAnalysis()
    }
}

const getConflictBadge = (type: string) => {
    switch(type) {
        case 'EXACT_DUPLICATE':
            return { color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60', icon: Copy }
        case 'CONFLICT':
            return { color: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/60', icon: AlertTriangle }
        case 'REDUNDANT':
            return { color: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-900/60', icon: Layers }
        default:
            return { color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', icon: HelpCircle }
    }
}

const formatConflictType = (type: string) => {
    return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
}
</script>

<template>
    <div class="space-y-4">
        <!-- Toolbar Ribbon -->
        <WfCard variant="flat" padding="sm" radius="lg" class="border border-wf-border bg-wf-surface flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shrink-0">
                    <ShieldAlert class="w-4 h-4" />
                </div>
                <div>
                    <h2 class="text-xs font-bold text-wf-text-primary">Rule Hygiene & Collision Scanner</h2>
                    <p class="text-[11px] text-wf-text-muted">Detect duplicate, overlapping, or conflicting categorization logic.</p>
                </div>
            </div>

            <WfButton
                variant="primary"
                size="sm"
                @click="refreshAnalysis"
                :loading="rulesStore.analysisLoading"
                class="h-8 px-3 text-xs font-semibold shadow-2xs"
            >
                <Zap class="w-3.5 h-3.5 mr-1" />
                <span>Rescan Rules</span>
            </WfButton>
        </WfCard>

        <!-- Loading Analysis State -->
        <div v-if="!rulesStore.analysisResult && rulesStore.analysisLoading" class="p-16 text-center">
            <div class="w-8 h-8 border-3 border-wf-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <h3 class="text-sm font-bold text-wf-text-primary uppercase tracking-wider">Running Deep Analysis...</h3>
            <p class="text-xs text-wf-text-muted mt-0.5">Cross-referencing {{ rulesStore.totalRules }} active rules for overlaps and conflicts</p>
        </div>

        <!-- Clean Rules State -->
        <div
            v-else-if="!rulesStore.analysisResult?.issues?.length"
            class="p-12 text-center flex flex-col items-center justify-center text-wf-text-muted bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-wf-lg"
        >
            <div class="w-12 h-12 rounded-wf-pill bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-wf-success mb-2">
                <ShieldCheck class="w-6 h-6" />
            </div>
            <h3 class="text-sm font-bold text-wf-text-primary">Your rules are in top shape!</h3>
            <p class="text-xs text-wf-text-muted mt-0.5">No duplicates, collisions, or redundant expressions detected.</p>
        </div>

        <!-- Issues Found Grid -->
        <div v-else class="space-y-4">
            <WfAlert variant="warning">
                Found {{ rulesStore.analysisResult.issues.length }} potential hygiene issues that may cause categorization conflicts.
            </WfAlert>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <WfCard
                    v-for="(issue, index) in rulesStore.analysisResult.issues"
                    :key="index"
                    variant="elevated"
                    padding="md"
                    radius="lg"
                    class="flex flex-col justify-between border"
                >
                    <div>
                        <!-- Header badge -->
                        <div class="flex items-center justify-between mb-3">
                            <span
                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-sm text-[10px] font-bold border"
                                :class="getConflictBadge(issue.conflict_type).color"
                            >
                                <component :is="getConflictBadge(issue.conflict_type).icon" class="w-3 h-3" />
                                <span>{{ formatConflictType(issue.conflict_type) }}</span>
                            </span>
                        </div>

                        <!-- VS Comparison Boxes -->
                        <div class="flex items-center gap-2 mb-3">
                            <div class="flex-1 p-2 rounded-wf-md bg-wf-surface-variant/60 border border-wf-border text-center overflow-hidden">
                                <span class="text-[9px] font-bold text-wf-text-muted uppercase block mb-0.5">Rule A</span>
                                <span class="font-bold text-xs text-wf-text-primary block truncate" :title="issue.rule_a_name">
                                    {{ issue.rule_a_name }}
                                </span>
                                <span class="text-[10px] font-semibold text-wf-primary block truncate mt-0.5">
                                    {{ issue.rule_a_category }}
                                </span>
                            </div>

                            <span class="px-1.5 py-0.5 rounded-wf-pill text-[9px] font-bold bg-indigo-50 text-wf-primary border border-indigo-200 shrink-0">
                                VS
                            </span>

                            <div class="flex-1 p-2 rounded-wf-md bg-wf-surface-variant/60 border border-wf-border text-center overflow-hidden">
                                <span class="text-[9px] font-bold text-wf-text-muted uppercase block mb-0.5">Rule B</span>
                                <span class="font-bold text-xs text-wf-text-primary block truncate" :title="issue.rule_b_name">
                                    {{ issue.rule_b_name }}
                                </span>
                                <span class="text-[10px] font-semibold text-wf-primary block truncate mt-0.5">
                                    {{ issue.rule_b_category }}
                                </span>
                            </div>
                        </div>

                        <!-- Overlapping keywords -->
                        <div class="p-2.5 rounded-wf-md bg-wf-surface border border-wf-border mb-3 space-y-1.5">
                            <span class="text-[10px] font-bold text-wf-primary uppercase flex items-center gap-1">
                                <Tag class="w-3 h-3" />
                                <span>Colliding Keywords</span>
                            </span>
                            <div class="flex flex-wrap gap-1">
                                <span
                                    v-for="kw in issue.overlapping_keywords"
                                    :key="kw"
                                    class="px-1.5 py-0.5 rounded-wf-xs text-[10px] font-mono font-bold bg-wf-surface-variant border border-wf-border text-wf-text-primary"
                                >
                                    {{ kw }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2 pt-2 border-t border-wf-border-subtle">
                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="confirmDelete(issue.rule_a_id, issue.rule_b_category)"
                            class="flex-1 h-7 text-xs font-semibold text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                            <Trash2 class="w-3 h-3 mr-1" />
                            <span>Delete A</span>
                        </WfButton>
                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="confirmDelete(issue.rule_b_id, issue.rule_a_category)"
                            class="flex-1 h-7 text-xs font-semibold text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                            <Trash2 class="w-3 h-3 mr-1" />
                            <span>Delete B</span>
                        </WfButton>
                    </div>
                </WfCard>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <WfModal
            :model-value="showDeleteConfirm"
            @update:model-value="showDeleteConfirm = $event"
            max-width="sm"
        >
            <div class="text-center py-2 space-y-4">
                <div class="w-12 h-12 rounded-wf-pill bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-wf-error mx-auto">
                    <Trash2 class="w-6 h-6" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-wf-text-primary">Delete Classification Rule?</h3>
                    <p class="text-xs text-wf-text-secondary mt-1 max-w-xs mx-auto">
                        Future transactions matched by this rule will become <strong class="text-wf-text-primary">uncategorized</strong>.
                    </p>
                </div>

                <!-- Migration Option Checkbox -->
                <div v-if="migrationCategory" class="p-3 bg-wf-surface-variant/40 border border-wf-border rounded-wf-md text-left space-y-1">
                    <label class="flex items-start gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            v-model="shouldMigrate"
                            class="w-4 h-4 rounded text-wf-primary focus:ring-wf-primary/20 mt-0.5"
                        />
                        <div class="text-xs font-semibold text-wf-text-primary">
                            Migrate existing transactions to <span class="text-wf-primary font-bold">{{ migrationCategory }}</span>
                        </div>
                    </label>
                    <p class="text-[11px] text-wf-text-muted pl-6">
                        Historical transactions matched by this rule will be updated to the kept rule's category.
                    </p>
                </div>

                <div class="flex items-center justify-center gap-3 pt-2">
                    <WfButton
                        variant="ghost"
                        size="sm"
                        @click="showDeleteConfirm = false"
                    >
                        Cancel
                    </WfButton>
                    <WfButton
                        variant="danger"
                        size="sm"
                        @click="executeDelete"
                    >
                        Yes, Delete
                    </WfButton>
                </div>
            </div>
        </WfModal>
    </div>
</template>
