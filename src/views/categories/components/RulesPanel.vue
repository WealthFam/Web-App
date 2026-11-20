<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
    AlertCircle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy,
    Download, EyeOff, FileText, Inbox, MoreVertical, Pencil, Plus, Search, Shuffle,
    Trash2, Upload, Zap, X
} from 'lucide-vue-next'
import { useRulesStore, type Rule } from '@/stores/finance/rules'
import { useCategoriesStore } from '@/stores/finance/categories'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfPagination from '@/components/ui/WfPagination.vue'

const rulesStore = useRulesStore()
const categoriesStore = useCategoriesStore()

const emit = defineEmits<{
    (e: 'open-add-rule'): void
    (e: 'edit-rule', rule: Rule): void
    (e: 'duplicate-rule', rule: Rule): void
    (e: 'switch-to-triage'): void
    (e: 'apply-triage-rule', ruleId: string): void
}>()

// Local State
const showDeleteConfirm = ref(false)
const showApplyConfirm = ref(false)
const ruleToDelete = ref<string | null>(null)
const ruleToApply = ref<string | null>(null)
const ruleFileInput = ref<HTMLInputElement | null>(null)
const activeMenuRule = ref<Rule | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuTriggerEl = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})
const filterOnlyWithTriage = ref(false)

const triageMatchesMap = computed(() => {
    const map: Record<string, number> = {}
    if (rulesStore.triageScanResults?.rules_with_matches) {
        for (const item of rulesStore.triageScanResults.rules_with_matches) {
            map[item.rule_id] = item.matching_count
        }
    }
    return map
})

const rulesWithMatchesCount = computed(() => {
    return Object.keys(triageMatchesMap.value).length
})

const sortedRules = computed(() => {
    let list = [...rulesStore.filteredRules]
    if (filterOnlyWithTriage.value) {
        list = list.filter(r => (triageMatchesMap.value[r.id] || 0) > 0)
    }
    return list.sort((a, b) => {
        const aMatches = triageMatchesMap.value[a.id] || 0
        const bMatches = triageMatchesMap.value[b.id] || 0
        if (aMatches !== bMatches) {
            return bMatches - aMatches // Rules with review matches first
        }
        return (b.priority || 0) - (a.priority || 0)
    })
})

// Watch for filter changes and refresh data
watch(() => [rulesStore.searchQuery, rulesStore.categoryFilter], () => {
    rulesStore.fetchRules(1)
})

const categoryFilterOptions = computed(() => [
    { title: 'All Categories', value: 'all' },
    ...categoriesStore.categories.map(c => ({
        title: `${c.icon || '🏷️'} ${c.name}`,
        value: c.name
    }))
])

// Priority
async function updatePriority(rule: Rule, delta: number) {
    const newPriority = (rule.priority || 0) + delta
    await rulesStore.updateRule(rule.id, { ...rule, priority: newPriority })
}

// Delete
function confirmDelete(id: string) {
    ruleToDelete.value = id
    closeActionMenu()
    showDeleteConfirm.value = true
}

async function executeDelete() {
    if (!ruleToDelete.value) return
    const success = await rulesStore.deleteRule(ruleToDelete.value)
    if (success) {
        showDeleteConfirm.value = false
        ruleToDelete.value = null
    }
}

// Duplicate
function duplicateRule(rule: Rule) {
    closeActionMenu()
    emit('duplicate-rule', rule)
}

// Apply Retro to Ledger
async function handleApplyToLedger(rule: Rule) {
    closeActionMenu()
    ruleToApply.value = rule.id
    showApplyConfirm.value = true
    await rulesStore.fetchMatchPreview(rule.keywords)
}

async function executeApplyRule() {
    if (!ruleToApply.value) return
    const count = await rulesStore.applyRuleRetrospectively(ruleToApply.value)
    if (count !== false) {
        showApplyConfirm.value = false
        ruleToApply.value = null
    }
}

async function refetchPreview() {
    if (!ruleToApply.value) return
    const rule = rulesStore.rules.find(r => r.id === ruleToApply.value)
    if (rule) {
        await rulesStore.fetchMatchPreview(rule.keywords, 1)
    }
}

async function handlePageChange(page: number) {
    if (!ruleToApply.value) return
    const rule = rulesStore.rules.find(r => r.id === ruleToApply.value)
    if (rule) {
        await rulesStore.fetchMatchPreview(rule.keywords, page)
    }
}

// Import
function handleRuleImport(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files[0]) {
        rulesStore.importRules(input.files[0])
        input.value = ''
    }
}

function closeActionMenu() {
    activeMenuRule.value = null
    menuTriggerEl.value = null
}

function toggleActionMenu(rule: Rule, event: MouseEvent) {
    if (activeMenuRule.value?.id === rule.id) {
        closeActionMenu()
        return
    }
    const trigger = event.currentTarget as HTMLElement | null
    if (!trigger) return
    menuTriggerEl.value = trigger
    const rect = trigger.getBoundingClientRect()
    const menuWidth = 168
    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth))
    const openUpward = window.innerHeight - rect.bottom < 210 && rect.top > 210

    menuStyle.value = {
        position: 'fixed',
        left: `${left}px`,
        width: `${menuWidth}px`,
        ...(openUpward
            ? { bottom: `${window.innerHeight - rect.top + 4}px`, top: 'auto' }
            : { top: `${rect.bottom + 4}px`, bottom: 'auto' }),
        zIndex: '9999'
    }
    activeMenuRule.value = rule
}

function onDocumentPointerDown(e: PointerEvent) {
    if (!activeMenuRule.value) return
    const target = e.target as Node
    if (menuRef.value?.contains(target)) return
    if (menuTriggerEl.value?.contains(target)) return
    closeActionMenu()
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && activeMenuRule.value) {
        closeActionMenu()
    }
}

onMounted(() => {
    document.addEventListener('pointerdown', onDocumentPointerDown)
    document.addEventListener('keydown', onKeydown)
    window.addEventListener('scroll', closeActionMenu, true)
    window.addEventListener('resize', closeActionMenu)
})

onUnmounted(() => {
    document.removeEventListener('pointerdown', onDocumentPointerDown)
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('scroll', closeActionMenu, true)
    window.removeEventListener('resize', closeActionMenu)
})
</script>

<template>
    <div class="space-y-4">
        <!-- 1. TOOLBAR -->
        <WfCard variant="flat" padding="none" radius="lg" class="border border-wf-border bg-wf-surface flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 p-2 shadow-2xs">
            <div class="flex items-center gap-2 flex-1 min-w-0 lg:max-w-lg">
                <!-- Category Filter Dropdown -->
                <div class="w-44 shrink-0">
                    <WfSelect
                        v-model="rulesStore.categoryFilter"
                        :items="categoryFilterOptions"
                        size="sm"
                    />
                </div>

                <!-- Search Input -->
                <div class="flex-1 min-w-0 flex items-center h-8 px-2.5 bg-wf-surface-variant/40 border border-wf-border rounded-wf-md text-wf-text-primary focus-within:ring-1 focus-within:ring-wf-primary focus-within:border-wf-primary transition-all shadow-2xs gap-2">
                    <Search class="w-3.5 h-3.5 text-wf-text-muted shrink-0 pointer-events-none" />
                    <input
                        v-model="rulesStore.searchQuery"
                        type="text"
                        placeholder="Search rules..."
                        class="w-full h-full bg-transparent text-xs text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none"
                    />
                    <button
                        v-if="rulesStore.searchQuery"
                        @click="rulesStore.searchQuery = ''"
                        class="text-wf-text-muted hover:text-wf-text-primary p-0.5 rounded-wf-xs transition-colors flex items-center justify-center shrink-0"
                        title="Clear search"
                    >
                        <X class="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-2 shrink-0">
                <button
                    v-if="rulesWithMatchesCount > 0"
                    type="button"
                    @click="filterOnlyWithTriage = !filterOnlyWithTriage"
                    class="h-8 px-2.5 rounded-wf-md text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer shrink-0"
                    :class="filterOnlyWithTriage
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50'"
                    title="Filter rules with review matches"
                >
                    <Inbox class="w-3.5 h-3.5" />
                    <span>{{ rulesWithMatchesCount }} in Review</span>
                </button>

                <WfButton
                    variant="outline"
                    size="sm"
                    @click="ruleFileInput?.click()"
                    class="h-8 px-3 text-xs font-semibold shadow-2xs"
                >
                    <Upload class="w-3.5 h-3.5" />
                    <span>Import</span>
                </WfButton>

                <WfButton
                    variant="outline"
                    size="sm"
                    @click="rulesStore.exportRules"
                    class="h-8 px-3 text-xs font-semibold shadow-2xs"
                >
                    <Download class="w-3.5 h-3.5" />
                    <span>Export</span>
                </WfButton>

                <WfButton
                    variant="primary"
                    size="sm"
                    @click="emit('open-add-rule')"
                    class="h-8 px-3.5 text-xs font-semibold shadow-2xs"
                >
                    <Plus class="w-3.5 h-3.5" />
                    <span>Add Rule</span>
                </WfButton>
            </div>
        </WfCard>

        <!-- Invisible file input for rules import -->
        <input type="file" ref="ruleFileInput" class="hidden" accept=".json" @change="handleRuleImport" />

        <!-- 2. RULES TABLE -->
        <WfCard variant="flat" padding="none" radius="lg" class="border border-wf-border bg-wf-surface overflow-hidden flex flex-col shadow-2xs">
            <!-- Loading Skeleton -->
            <div v-if="rulesStore.loading" class="p-6 space-y-3">
                <div v-for="i in 5" :key="`rule-skel-${i}`" class="h-10 rounded-wf-md bg-wf-surface-variant animate-pulse" />
            </div>

            <!-- Table Layout -->
            <div v-else-if="sortedRules.length > 0" class="overflow-x-auto flex-1 min-h-0">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="border-b border-wf-border bg-wf-surface-variant/40 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
                            <th class="py-2 px-3 w-[220px]">Rule Name</th>
                            <th class="py-2 px-3">Keywords</th>
                            <th class="py-2 px-3 w-[150px]">Category</th>
                            <th class="py-2 px-3 text-center w-[100px]">Priority</th>
                            <th class="py-2 px-3 text-center w-[80px]">Hits</th>
                            <th class="py-2 px-3 text-center w-[90px]">Status</th>
                            <th class="py-2 px-3 text-right w-[50px]"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-wf-border-subtle">
                        <tr
                            v-for="item in sortedRules"
                            :key="item.id"
                            class="hover:bg-wf-surface-variant/40 transition-colors group"
                            :class="{
                                'bg-amber-50/20 dark:bg-amber-950/15': (triageMatchesMap[item.id] || 0) > 0
                            }"
                        >
                            <!-- Name Column -->
                            <td
                                class="py-1.5 px-3"
                                :class="{ 'border-l-[3px] border-l-amber-500': (triageMatchesMap[item.id] || 0) > 0 }"
                            >
                                <div class="flex items-center gap-2">
                                    <div class="w-7 h-7 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shrink-0">
                                        <FileText class="w-3.5 h-3.5" />
                                    </div>
                                    <div class="min-w-0">
                                        <span class="font-bold text-xs text-wf-text-primary block truncate max-w-[170px]" :title="item.name">
                                            {{ item.name }}
                                        </span>
                                        <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
                                            <button
                                                v-if="(triageMatchesMap[item.id] || 0) > 0"
                                                @click="emit('apply-triage-rule', item.id)"
                                                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-wf-pill text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/80 transition-colors cursor-pointer"
                                                title="Click to view and approve matching transactions in triage"
                                            >
                                                <Inbox class="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                                <span>{{ triageMatchesMap[item.id] }} in Review</span>
                                            </button>
                                            <span v-if="item.exclude_from_reports" class="inline-flex items-center gap-1 text-[9px] font-bold text-wf-error">
                                                <EyeOff class="w-2.5 h-2.5" />
                                                <span>Hidden</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <!-- Keywords Column -->
                            <td class="py-1.5 px-3">
                                <div class="flex flex-wrap items-center gap-1">
                                    <span
                                        v-for="(k, idx) in item.keywords.slice(0, 3)"
                                        :key="idx"
                                        class="px-1.5 py-0.5 rounded-wf-xs text-[9px] font-mono font-bold bg-wf-surface border border-wf-border text-wf-text-primary"
                                    >
                                        {{ k }}
                                    </span>
                                    <span
                                        v-if="item.keywords.length > 3"
                                        class="text-[9px] font-bold text-wf-primary px-1"
                                    >
                                        +{{ item.keywords.length - 3 }}
                                    </span>
                                </div>
                            </td>

                            <!-- Category Column -->
                            <td class="py-1.5 px-3">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-wf-sm text-[10px] font-semibold bg-wf-surface border border-wf-border text-wf-text-primary">
                                        {{ categoriesStore.getCategoryDisplay(item.category) }}
                                    </span>
                                    <span
                                        v-if="item.is_transfer"
                                        class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-wf-xs text-[9px] font-bold bg-indigo-50 text-wf-primary dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50"
                                    >
                                        <Shuffle class="w-2.5 h-2.5" />
                                        Transfer
                                    </span>
                                </div>
                            </td>

                            <!-- Priority Stepper -->
                            <td class="py-1.5 px-3 text-center">
                                <div class="inline-flex items-center gap-0.5">
                                    <button
                                        @click="updatePriority(item, 1)"
                                        class="p-0.5 rounded-wf-xs hover:bg-wf-surface-variant text-wf-text-muted hover:text-wf-text-primary transition-colors"
                                        title="Increase priority"
                                    >
                                        <ArrowUp class="w-3 h-3" />
                                    </button>
                                    <span class="w-7 py-0.5 rounded-wf-xs text-[10px] font-mono font-bold bg-wf-surface border border-wf-border text-center text-wf-text-primary">
                                        {{ item.priority }}
                                    </span>
                                    <button
                                        @click="updatePriority(item, -1)"
                                        class="p-0.5 rounded-wf-xs hover:bg-wf-surface-variant text-wf-text-muted hover:text-wf-text-primary transition-colors"
                                        title="Decrease priority"
                                    >
                                        <ArrowDown class="w-3 h-3" />
                                    </button>
                                </div>
                            </td>

                            <!-- Hit Count -->
                            <td class="py-1.5 px-3 text-center">
                                <div class="inline-flex items-center gap-1 text-[11px] font-semibold">
                                    <Zap class="w-3 h-3" :class="(item.hit_count || 0) > 0 ? 'text-wf-success' : 'text-slate-300 dark:text-slate-600'" />
                                    <span class="tabular-nums">{{ item.hit_count || 0 }}</span>
                                </div>
                            </td>

                            <!-- Status Column -->
                            <td class="py-1.5 px-3 text-center">
                                <span
                                    v-if="item.is_valid === false"
                                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-wf-pill text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/60"
                                    :title="item.validation_error || 'Rule is malformed.'"
                                >
                                    <AlertCircle class="w-2.5 h-2.5" />
                                    Invalid
                                </span>
                                <span
                                    v-else
                                    class="inline-flex items-center px-1.5 py-0.5 rounded-wf-pill text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60"
                                >
                                    Active
                                </span>
                            </td>

                            <!-- Action Menu -->
                            <td class="py-1.5 px-3 text-right">
                                <button
                                    type="button"
                                    @click="toggleActionMenu(item, $event)"
                                    class="p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
                                    title="Rule options"
                                >
                                    <MoreVertical class="w-3.5 h-3.5" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Empty State -->
            <div v-else class="p-10 text-center flex flex-col items-center justify-center text-wf-text-muted">
                <FileText class="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1.5 stroke-[1.5]" />
                <h3 class="text-xs font-bold text-wf-text-primary">No Rules Found</h3>
                <p class="text-[10px] text-wf-text-muted mt-0.5 max-w-sm">{{ rulesStore.emptyRulesMsg }}</p>
                <div v-if="!rulesStore.searchQuery" class="mt-3">
                    <WfButton
                        variant="primary"
                        size="sm"
                        @click="emit('open-add-rule')"
                    >
                        <Plus class="w-3 h-3" />
                        <span>Create First Rule</span>
                    </WfButton>
                </div>
            </div>

            <!-- Pagination Footer -->
            <WfPagination
                v-if="rulesStore.totalRules > 0"
                :page="rulesStore.currentPage"
                :page-size="rulesStore.pageSize"
                :total="rulesStore.totalRules"
                :page-sizes="[10, 20, 50, 100]"
                @update:page="rulesStore.fetchRules($event)"
                @update:page-size="rulesStore.pageSize = $event; rulesStore.fetchRules(1)"
            />
        </WfCard>

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

        <!-- Apply Retro Modal -->
        <WfModal
            :model-value="showApplyConfirm"
            @update:model-value="showApplyConfirm = $event"
            max-width="md"
        >
            <template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-wf-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shrink-0 shadow-2xs">
                        <Zap class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-wf-text-primary">Retroactive Application</h3>
                        <p class="text-xs text-wf-text-muted">Scan transaction history and apply classification logic.</p>
                    </div>
                </div>
            </template>

            <div class="space-y-4">
                <!-- Override toggle -->
                <div class="p-3 bg-wf-surface-variant/40 border border-wf-border rounded-wf-md flex items-center justify-between">
                    <div>
                        <span class="text-xs font-bold text-wf-text-primary block">Override Existing Categories</span>
                        <span class="text-[11px] text-wf-text-muted">Replace categories already assigned to matching items</span>
                    </div>
                    <input
                        type="checkbox"
                        v-model="rulesStore.overrideExisting"
                        @change="refetchPreview"
                        class="w-4 h-4 rounded text-wf-primary focus:ring-wf-primary/20 cursor-pointer"
                    />
                </div>

                <!-- Preview Matches -->
                <div v-if="rulesStore.previewLoading" class="p-8 text-center">
                    <div class="w-6 h-6 border-2 border-wf-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span class="text-xs font-semibold text-wf-text-muted">Scanning history...</span>
                </div>

                <div v-else-if="rulesStore.matchingCount > 0" class="border border-wf-border rounded-wf-md bg-wf-surface p-3 space-y-2">
                    <div class="flex items-center justify-between text-xs pb-2 border-b border-wf-border-subtle">
                        <span class="font-bold text-wf-text-secondary uppercase text-[10px]">
                            Preview (Latest {{ Math.min(5, rulesStore.matchingCount) }} of {{ rulesStore.matchingCount }})
                        </span>
                        <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-indigo-50 text-wf-primary dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                            {{ rulesStore.matchingCount }} matches
                        </span>
                    </div>

                    <div class="divide-y divide-wf-border-subtle">
                        <div
                            v-for="txn in rulesStore.matchingPreview"
                            :key="txn.id"
                            class="py-2 flex items-center justify-between text-xs"
                        >
                            <div class="min-w-0 pr-2">
                                <span class="font-semibold text-wf-text-primary block truncate" :title="txn.description || txn.recipient">
                                    {{ txn.description || txn.recipient }}
                                </span>
                                <span class="text-[10px] text-wf-text-muted">
                                    {{ new Date(txn.date).toLocaleDateString() }}
                                    <span v-if="txn.category && txn.category !== 'Uncategorized'" class="text-wf-primary font-medium ml-1">
                                        · {{ txn.category }}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Preview Pagination -->
                    <div v-if="rulesStore.matchingCount > rulesStore.previewLimit" class="pt-2 border-t border-wf-border-subtle flex items-center justify-between text-xs">
                        <span class="text-[10px] text-wf-text-muted">
                            Page {{ rulesStore.previewPage }} of {{ Math.ceil(rulesStore.matchingCount / rulesStore.previewLimit) }}
                        </span>
                        <div class="flex items-center gap-1">
                            <button
                                :disabled="rulesStore.previewPage <= 1"
                                @click="handlePageChange(rulesStore.previewPage - 1)"
                                class="p-1 rounded-wf-xs border border-wf-border text-wf-text-secondary disabled:opacity-40"
                            >
                                <ChevronLeft class="w-3.5 h-3.5" />
                            </button>
                            <button
                                :disabled="rulesStore.previewPage >= Math.ceil(rulesStore.matchingCount / rulesStore.previewLimit)"
                                @click="handlePageChange(rulesStore.previewPage + 1)"
                                class="p-1 rounded-wf-xs border border-wf-border text-wf-text-secondary disabled:opacity-40"
                            >
                                <ChevronRight class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div v-else class="p-6 text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-wf-md border border-amber-200 dark:border-amber-900/50">
                    <AlertCircle class="w-4 h-4 inline-block mr-1" />
                    <span>No matching transactions found in your history.</span>
                </div>
            </div>

            <template #footer>
                <div class="flex items-center justify-end gap-2 w-full">
                    <WfButton
                        variant="ghost"
                        size="sm"
                        @click="showApplyConfirm = false"
                    >
                        Cancel
                    </WfButton>
                    <WfButton
                        variant="primary"
                        size="sm"
                        @click="executeApplyRule"
                        :disabled="rulesStore.matchingCount === 0 || rulesStore.previewLoading"
                    >
                        Run Logic Now
                    </WfButton>
                </div>
            </template>
        </WfModal>

        <!-- Teleported Row Action Dropdown Menu -->
        <Teleport to="body">
            <div
                v-if="activeMenuRule"
                ref="menuRef"
                role="menu"
                :style="menuStyle"
                class="bg-wf-surface border border-wf-border rounded-wf-md shadow-wf-modal py-1 text-left text-xs"
            >
                <button
                    type="button"
                    @click="handleApplyToLedger(activeMenuRule)"
                    class="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-wf-surface-variant text-wf-text-primary text-[11px]"
                >
                    <Zap class="w-3 h-3 text-wf-primary" />
                    <span>Apply to Ledger</span>
                </button>
                <button
                    type="button"
                    @click="emit('apply-triage-rule', activeMenuRule.id); closeActionMenu()"
                    class="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-wf-surface-variant text-wf-text-primary text-[11px]"
                >
                    <Inbox class="w-3 h-3 text-amber-500" />
                    <span>Apply to Triage</span>
                </button>
                <div class="h-px bg-wf-border my-0.5"></div>
                <button
                    type="button"
                    @click="emit('edit-rule', activeMenuRule); closeActionMenu()"
                    class="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-wf-surface-variant text-wf-text-primary text-[11px]"
                >
                    <Pencil class="w-3 h-3 text-wf-text-secondary" />
                    <span>Edit Rule</span>
                </button>
                <button
                    type="button"
                    @click="duplicateRule(activeMenuRule)"
                    class="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-wf-surface-variant text-wf-text-primary text-[11px]"
                >
                    <Copy class="w-3 h-3 text-wf-text-secondary" />
                    <span>Duplicate</span>
                </button>
                <div class="h-px bg-wf-border my-0.5"></div>
                <button
                    type="button"
                    @click="confirmDelete(activeMenuRule.id)"
                    class="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-wf-error text-[11px]"
                >
                    <Trash2 class="w-3 h-3" />
                    <span>Delete</span>
                </button>
            </div>
        </Teleport>
    </div>
</template>
