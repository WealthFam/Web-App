<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FileText, Inbox, Sparkles, ShieldAlert } from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import { useCategoriesStore } from '@/stores/finance/categories'
import { useRulesStore, type Rule, type RuleSuggestion } from '@/stores/finance/rules'

import RuleStatsHeader from './components/RuleStatsHeader.vue'
import RulesPanel from './components/RulesPanel.vue'
import TriageDetectionPanel from './components/TriageDetectionPanel.vue'
import SuggestionsPanel from './components/SuggestionsPanel.vue'
import RuleFormModal from './components/RuleFormModal.vue'
import RuleHygienePanel from './components/RuleHygienePanel.vue'

const rulesStore = useRulesStore()
const categoriesStore = useCategoriesStore()

const activeTab = ref<'rules' | 'triage' | 'suggestions' | 'hygiene'>('rules')
const showRuleModal = ref(false)
const isEditingRule = ref(false)
const editingRule = ref<Rule | null>(null)

const rulesPanelRef = ref<InstanceType<typeof RulesPanel> | null>(null)
const triagePanelRef = ref<InstanceType<typeof TriageDetectionPanel> | null>(null)

onMounted(() => {
    rulesStore.fetchRules(1)
    rulesStore.fetchSuggestions()
    rulesStore.fetchRuleStats()
    rulesStore.scanAllTriage() // Pre-load triage matches for the tab
    rulesStore.fetchRuleAnalysis() // Pre-load hygiene analysis for the badge
    categoriesStore.fetchCategories()
})

// Reset pagination on search
watch(() => rulesStore.searchQuery, () => {
    if (rulesStore.currentPage !== 1) {
        rulesStore.fetchRules(1)
    }
})

function openAddRuleModal() {
    isEditingRule.value = false
    editingRule.value = null
    showRuleModal.value = true
}

function openEditRuleModal(rule: Rule) {
    isEditingRule.value = true
    editingRule.value = rule
    showRuleModal.value = true
}

function openDuplicateRuleModal(rule: Rule) {
    isEditingRule.value = false
    editingRule.value = {
        ...rule,
        id: '', // Clear ID for duplication
        name: `${rule.name} (Copy)`,
        keywords: [...rule.keywords]
    }
    showRuleModal.value = true
}

const pendingSuggestion = ref<RuleSuggestion | null>(null)

function openSuggestionAsRule(suggestion: RuleSuggestion) {
    pendingSuggestion.value = suggestion
    isEditingRule.value = false
    editingRule.value = {
        id: '',
        name: suggestion.name,
        category: suggestion.category,
        keywords: Array.isArray(suggestion.keywords) ? [...suggestion.keywords] : [],
        priority: 10,
        is_transfer: false,
        to_account_id: '',
        exclude_from_reports: false
    }
    showRuleModal.value = true
}

async function handleRuleSaved() {
    if (pendingSuggestion.value) {
        // Optimistic UI: Remove from local list immediately
        rulesStore.suggestions = rulesStore.suggestions.filter(s => s !== pendingSuggestion.value)
        pendingSuggestion.value = null
    }
    await Promise.all([
        rulesStore.fetchRuleStats(),
        rulesStore.fetchSuggestions()
    ])
}

function handleApplyTriageRule(ruleId: string) {
    activeTab.value = 'triage'
    // Wait for tab switch, then trigger scan for that specific rule
    setTimeout(() => {
        triagePanelRef.value?.runScanForRule(ruleId)
    }, 300)
}

// Preserve interface for parent callers
defineExpose({
    openAddRuleModal
})
</script>

<template>
    <div class="space-y-6">
        <!-- 1. Stats Header -->
        <RuleStatsHeader :stats="rulesStore.ruleStats" />

        <!-- 2. Sub-Tabs Nav Pill Toolbar -->
        <WfCard variant="flat" padding="none" radius="lg" class="p-1.5 border border-wf-border bg-wf-surface flex items-center gap-1.5 overflow-x-auto">
            <button
                type="button"
                @click="activeTab = 'rules'"
                class="px-3.5 py-2 rounded-wf-md text-xs font-semibold transition-all flex items-center gap-2 shrink-0 select-none"
                :class="[
                    activeTab === 'rules'
                        ? 'bg-wf-primary text-white shadow-xs'
                        : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'
                ]"
            >
                <FileText class="w-4 h-4" />
                <span>Active Rules</span>
                <span
                    v-if="rulesStore.totalRules > 0"
                    class="ml-1 px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold"
                    :class="activeTab === 'rules' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-wf-primary dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'"
                >
                    {{ rulesStore.totalRules }}
                </span>
            </button>

            <button
                type="button"
                @click="activeTab = 'triage'"
                class="px-3.5 py-2 rounded-wf-md text-xs font-semibold transition-all flex items-center gap-2 shrink-0 select-none"
                :class="[
                    activeTab === 'triage'
                        ? 'bg-wf-primary text-white shadow-xs'
                        : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'
                ]"
            >
                <Inbox class="w-4 h-4" />
                <span>Triage Detection</span>
                <span
                    v-if="rulesStore.ruleStats?.pending_triage"
                    class="ml-1 px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold"
                    :class="activeTab === 'triage' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'"
                >
                    {{ rulesStore.ruleStats.pending_triage }}
                </span>
            </button>

            <button
                type="button"
                @click="activeTab = 'suggestions'"
                class="px-3.5 py-2 rounded-wf-md text-xs font-semibold transition-all flex items-center gap-2 shrink-0 select-none"
                :class="[
                    activeTab === 'suggestions'
                        ? 'bg-wf-primary text-white shadow-xs'
                        : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'
                ]"
            >
                <Sparkles class="w-4 h-4" />
                <span>Smart Suggestions</span>
                <span
                    v-if="rulesStore.suggestions.length > 0"
                    class="ml-1 px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold"
                    :class="activeTab === 'suggestions' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-wf-primary dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'"
                >
                    {{ rulesStore.suggestions.length }}
                </span>
            </button>

            <button
                type="button"
                @click="activeTab = 'hygiene'"
                class="px-3.5 py-2 rounded-wf-md text-xs font-semibold transition-all flex items-center gap-2 shrink-0 select-none"
                :class="[
                    activeTab === 'hygiene'
                        ? 'bg-wf-primary text-white shadow-xs'
                        : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'
                ]"
            >
                <ShieldAlert class="w-4 h-4" />
                <span>Rule Hygiene</span>
                <span
                    v-if="rulesStore.analysisResult?.issues?.length > 0"
                    class="ml-1 px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold"
                    :class="activeTab === 'hygiene' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'"
                >
                    {{ rulesStore.analysisResult.issues.length }}
                </span>
            </button>
        </WfCard>

        <!-- 3. Tab Content Panels -->
        <transition name="fade" mode="out-in">
            <div :key="activeTab">
                <RulesPanel
                    v-if="activeTab === 'rules'"
                    ref="rulesPanelRef"
                    @open-add-rule="openAddRuleModal"
                    @edit-rule="openEditRuleModal"
                    @duplicate-rule="openDuplicateRuleModal"
                    @switch-to-triage="activeTab = 'triage'"
                    @apply-triage-rule="handleApplyTriageRule"
                />

                <TriageDetectionPanel
                    v-else-if="activeTab === 'triage'"
                    ref="triagePanelRef"
                />

                <SuggestionsPanel
                    v-else-if="activeTab === 'suggestions'"
                    @accept-suggestion="openSuggestionAsRule"
                />

                <RuleHygienePanel
                    v-else-if="activeTab === 'hygiene'"
                />
            </div>
        </transition>

        <!-- Rule Form Modal (shared across tabs) -->
        <RuleFormModal
            v-model="showRuleModal"
            :edit-rule="editingRule"
            :is-editing="isEditingRule"
            @saved="handleRuleSaved"
        />
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
