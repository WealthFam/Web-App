<template>
    <v-container fluid class="pa-0 animate-in relative-pos z-10">
        <!-- Stats Header -->
        <RuleStatsHeader :stats="rulesStore.ruleStats" />

        <!-- Sub-Tabs -->
        <v-card class="premium-glass-card pa-2 mb-8 no-hover border-thin elevation-2" rounded="xl">
            <v-tabs v-model="activeTab" class="rules-tabs" height="48" density="comfortable" color="primary" hide-slider>
                <v-tab value="rules" class="text-none font-weight-black tab-item rounded-pill">
                    <template v-slot:prepend>
                        <FileText :size="16" class="mr-1" />
                    </template>
                    Active Rules
                    <v-chip v-if="rulesStore.totalRules > 0" size="x-small" color="primary" variant="flat"
                        class="ml-2 font-weight-black elevation-1">
                        {{ rulesStore.totalRules }}
                    </v-chip>
                </v-tab>
                <v-tab value="triage" class="text-none font-weight-black tab-item rounded-pill">
                    <template v-slot:prepend>
                        <Inbox :size="16" class="mr-1" />
                    </template>
                    Triage Detection
                    <v-chip v-if="rulesStore.ruleStats?.pending_triage" size="x-small" color="warning" variant="flat"
                        class="ml-2 font-weight-black elevation-1">
                        {{ rulesStore.ruleStats.pending_triage }}
                    </v-chip>
                </v-tab>
                <v-tab value="suggestions" class="text-none font-weight-black tab-item rounded-pill">
                    <template v-slot:prepend>
                        <Sparkles :size="16" class="mr-1" />
                    </template>
                    Smart Suggestions
                    <v-chip v-if="rulesStore.suggestions.length > 0" size="x-small" color="secondary" variant="flat"
                        class="ml-2 font-weight-black elevation-1">
                        {{ rulesStore.suggestions.length }}
                    </v-chip>
                </v-tab>
            </v-tabs>
        </v-card>

        <!-- Tab Content -->
        <v-window v-model="activeTab">
            <v-window-item value="rules">
                <RulesPanel ref="rulesPanelRef" @open-add-rule="openAddRuleModal"
                    @edit-rule="openEditRuleModal" @duplicate-rule="openDuplicateRuleModal"
                    @switch-to-triage="activeTab = 'triage'"
                    @apply-triage-rule="handleApplyTriageRule" />
            </v-window-item>

            <v-window-item value="triage">
                <TriageDetectionPanel ref="triagePanelRef" />
            </v-window-item>

            <v-window-item value="suggestions">
                <SuggestionsPanel @accept-suggestion="openSuggestionAsRule" />
            </v-window-item>
        </v-window>

        <!-- Rule Form Modal (shared across tabs) -->
        <RuleFormModal v-model="showRuleModal" :edit-rule="editingRule" :is-editing="isEditingRule"
            @saved="handleRuleSaved" />
    </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FileText, Inbox, Sparkles } from 'lucide-vue-next'

import { useCategoriesStore } from '@/stores/finance/categories'
import { useRulesStore, type Rule, type RuleSuggestion } from '@/stores/finance/rules'

import RuleStatsHeader from './components/RuleStatsHeader.vue'
import RulesPanel from './components/RulesPanel.vue'
import TriageDetectionPanel from './components/TriageDetectionPanel.vue'
import SuggestionsPanel from './components/SuggestionsPanel.vue'
import RuleFormModal from './components/RuleFormModal.vue'

const rulesStore = useRulesStore()
const categoriesStore = useCategoriesStore()

const activeTab = ref('rules')
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
    if (categoriesStore.categories.length === 0) {
        categoriesStore.fetchCategories()
    }
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

<style scoped>
.animate-in {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.line-height-1 {
    line-height: 1;
}

.rules-tabs :deep(.v-btn) {
    border-radius: 24px !important;
    transition: all 0.3s ease;
}

.rules-tabs :deep(.v-tab--selected) {
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary)) !important;
}

.tab-item {
    font-size: 0.9rem !important;
    letter-spacing: 0.5px;
    height: 48px !important;
}
</style>
