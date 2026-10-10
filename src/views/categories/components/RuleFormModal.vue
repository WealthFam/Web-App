<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { FileText, Folder, Zap, CreditCard, EyeOff, Save, X } from 'lucide-vue-next'
import { financeApi } from '@/api/client'
import { useCategoriesStore } from '@/stores/finance/categories'
import { useRulesStore, type Rule } from '@/stores/finance/rules'
import { useFinanceStore } from '@/stores/finance'
import { useNotificationStore } from '@/stores/notification'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

const props = defineProps<{
    modelValue: boolean
    editRule?: Rule | null
    isEditing: boolean
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const rulesStore = useRulesStore()
const categoriesStore = useCategoriesStore()
const financeStore = useFinanceStore()
const notify = useNotificationStore()

const showExcludeConfirm = ref(false)
const testingLogic = ref(false)
const testResultCount = ref<number | null>(null)
const newKeywordInput = ref('')

const form = ref({
    name: '',
    category: '',
    keywords: [] as string[],
    priority: 10,
    is_transfer: false,
    to_account_id: '',
    exclude_from_reports: false
})

const categoryOptions = computed(() => {
    return categoriesStore.categories.map(c => ({
        title: `${c.icon || '🏷️'} ${c.name}`,
        value: c.name
    }))
})

// Sync form when editRule changes
watch(() => props.editRule, (rule) => {
    testResultCount.value = null
    if (rule) {
        form.value = {
            name: rule.name,
            category: rule.category,
            keywords: Array.isArray(rule.keywords) ? [...rule.keywords] : (rule.keywords as string).split(',').map(s => s.trim()),
            priority: rule.priority || 10,
            is_transfer: rule.is_transfer || false,
            to_account_id: rule.to_account_id || '',
            exclude_from_reports: rule.exclude_from_reports || false
        }
    } else {
        resetForm()
    }
}, { immediate: true })

watch(() => props.modelValue, (val) => {
    if (val && !props.editRule) {
        resetForm()
    }
})

function resetForm() {
    form.value = {
        name: '',
        category: '',
        keywords: [],
        priority: 10,
        is_transfer: false,
        to_account_id: '',
        exclude_from_reports: false
    }
    newKeywordInput.value = ''
    testResultCount.value = null
}

function close() {
    emit('update:modelValue', false)
}

function addKeyword() {
    const val = newKeywordInput.value.trim()
    if (val && !form.value.keywords.includes(val)) {
        form.value.keywords.push(val)
        newKeywordInput.value = ''
    }
}

function removeKeyword(idx: number) {
    form.value.keywords.splice(idx, 1)
}

function handleKeywordKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addKeyword()
    }
}

async function testCurrentLogic() {
    if (!form.value.keywords.length) return
    testingLogic.value = true
    try {
        const onlyUncategorized = !rulesStore.overrideExisting
        const res = await financeApi.getMatchCount(form.value.keywords, onlyUncategorized)
        testResultCount.value = res.data.count
    } catch (e) {
        console.error("Test failed", e)
    } finally {
        testingLogic.value = false
    }
}

async function saveRule() {
    if (!form.value.name || (!form.value.category && !form.value.is_transfer) || !form.value.keywords.length) return

    // Conflict detection
    const keywordList = Array.isArray(form.value.keywords) ? form.value.keywords : []
    const editId = props.editRule?.id
    const matchingRules = rulesStore.rules.filter(r =>
        r.id !== editId &&
        r.category !== form.value.category &&
        r.keywords.some((kw: string) => keywordList.includes(kw))
    )

    if (matchingRules.length > 0) {
        const confirmMsg = `Keywords overlap with rules in: ${matchingRules.map(r => r.category).join(', ')}. Continue?`
        if (!confirm(confirmMsg)) return
    }

    if (form.value.exclude_from_reports) {
        showExcludeConfirm.value = true
        return
    }

    await confirmSaveRule()
}

async function confirmSaveRule() {
    const keywordList = Array.isArray(form.value.keywords)
        ? form.value.keywords.map(k => k.trim())
        : (form.value.keywords as string).split(',').map(k => k.trim())

    const payload = { ...form.value, keywords: keywordList }

    let success = false
    if (props.isEditing && props.editRule?.id) {
        success = await rulesStore.updateRule(props.editRule.id, payload)
        if (success && form.value.exclude_from_reports) {
            notify.success(`Rule updated! Matching transactions will be hidden from reports.`)
        }
    } else {
        success = await rulesStore.createRule(payload)
        if (success && form.value.exclude_from_reports) {
            notify.success(`Rule saved! Future transactions will be hidden from reports.`)
        }
    }

    if (success) {
        showExcludeConfirm.value = false
        close()
        resetForm()
        emit('saved')
    }
}
</script>

<template>
    <!-- Add/Edit Rule Modal -->
    <WfModal
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="md"
    >
        <template #header>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-wf-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shrink-0 shadow-2xs">
                    <FileText class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                    <span class="text-[10px] font-bold text-wf-primary uppercase tracking-wider block">
                        Intelligence Rule
                    </span>
                    <h3 class="text-base font-bold text-wf-text-primary truncate">
                        {{ form.name || 'New Classification Rule' }}
                    </h3>
                </div>
            </div>
        </template>

        <form @submit.prevent="saveRule" class="space-y-4">
            <!-- Identification -->
            <div class="space-y-1.5">
                <label class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider block">
                    Rule Identification
                </label>
                <input
                    v-model="form.name"
                    type="text"
                    required
                    placeholder="Rule Name (e.g. Amazon Prime, Uber Rides)"
                    class="w-full h-10 px-3 text-sm bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                />
            </div>

            <!-- Classification -->
            <div class="space-y-3">
                <label class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider block">
                    Classification & Triggers
                </label>

                <!-- Category select -->
                <div v-if="!form.is_transfer">
                    <span class="text-xs font-semibold text-wf-text-secondary mb-1 block">Target Category</span>
                    <div class="relative">
                        <Folder class="w-4 h-4 text-wf-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            v-model="form.category"
                            class="w-full h-10 pl-9 pr-3 text-sm bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                        >
                            <option value="" disabled>Select Target Category</option>
                            <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                                {{ opt.title }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Keywords tag input -->
                <div class="space-y-1.5">
                    <span class="text-xs font-semibold text-wf-text-secondary block">Trigger Keywords</span>
                    <div class="p-2 bg-wf-surface border border-wf-border rounded-wf-md flex flex-wrap items-center gap-1.5 min-h-[44px]">
                        <span
                            v-for="(kw, idx) in form.keywords"
                            :key="idx"
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-sm text-xs font-semibold font-mono bg-indigo-50 text-wf-primary dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50"
                        >
                            {{ kw }}
                            <button
                                type="button"
                                @click="removeKeyword(idx)"
                                class="hover:text-rose-600 transition-colors"
                            >
                                <X class="w-3 h-3" />
                            </button>
                        </span>
                        <input
                            v-model="newKeywordInput"
                            @keydown="handleKeywordKeydown"
                            @blur="addKeyword"
                            type="text"
                            placeholder="Add keyword + Enter..."
                            class="flex-1 min-w-[140px] h-7 bg-transparent text-xs text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none px-1"
                        />
                    </div>
                    <p class="text-[11px] text-wf-text-muted">
                        Transactions containing any of these terms will be auto-classified.
                    </p>
                </div>
            </div>

            <!-- Logic & Precision Section -->
            <div class="p-3.5 bg-wf-surface-variant/40 border border-wf-border rounded-wf-md space-y-3">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-xs font-bold text-wf-text-primary block">Precision Testing</span>
                        <span class="text-[11px] text-wf-text-muted">Test rule against historical transactions</span>
                    </div>
                    <WfButton
                        variant="outline"
                        size="sm"
                        @click="testCurrentLogic"
                        :disabled="!form.keywords.length"
                        :loading="testingLogic"
                        class="h-7.5 px-3 text-xs"
                    >
                        <Zap class="w-3.5 h-3.5 mr-1" />
                        <span>Check Matches</span>
                    </WfButton>
                </div>

                <div v-if="testResultCount !== null" class="p-2.5 rounded-wf-sm bg-wf-surface border border-wf-border flex items-center justify-between text-xs">
                    <span class="text-wf-text-secondary font-medium">Historical Matches Found:</span>
                    <span
                        class="px-2 py-0.5 rounded-wf-sm font-bold text-xs"
                        :class="testResultCount > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'"
                    >
                        {{ testResultCount }} transactions
                    </span>
                </div>

                <div class="border-t border-wf-border-subtle pt-2 flex items-center justify-between">
                    <div>
                        <span class="text-xs font-bold text-wf-text-primary block">Identify as Transfer</span>
                        <span class="text-[11px] text-wf-text-muted">Move funds between accounts</span>
                    </div>
                    <input
                        type="checkbox"
                        v-model="form.is_transfer"
                        class="w-4 h-4 rounded text-wf-primary focus:ring-wf-primary/20 cursor-pointer"
                    />
                </div>

                <!-- Destination account when transfer -->
                <div v-if="form.is_transfer" class="pt-1">
                    <span class="text-xs font-semibold text-wf-text-secondary mb-1 block">Destination Account</span>
                    <div class="relative">
                        <CreditCard class="w-4 h-4 text-wf-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            v-model="form.to_account_id"
                            class="w-full h-9 pl-9 pr-3 text-xs bg-wf-surface border border-wf-border rounded-wf-sm text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
                        >
                            <option value="" disabled>Select Destination Account</option>
                            <option v-for="a in financeStore.accounts" :key="a.id" :value="a.id">
                                {{ a.name }}
                            </option>
                        </select>
                    </div>
                </div>

                <!-- Priority Slider -->
                <div class="border-t border-wf-border-subtle pt-2 space-y-1">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-bold text-wf-text-primary">Execution Priority</span>
                        <span class="font-mono font-bold text-wf-primary">{{ form.priority }}</span>
                    </div>
                    <input
                        type="range"
                        v-model.number="form.priority"
                        min="0"
                        max="100"
                        step="1"
                        class="w-full accent-wf-primary cursor-pointer"
                    />
                </div>
            </div>

            <!-- Exclude from reports -->
            <div class="p-3 bg-wf-surface-variant/40 border border-wf-border rounded-wf-md flex items-center justify-between">
                <div>
                    <span class="text-xs font-bold text-wf-text-primary block">Exclude from Reports</span>
                    <span class="text-[11px] text-wf-text-muted">Matching transactions won't affect spending totals</span>
                </div>
                <input
                    type="checkbox"
                    v-model="form.exclude_from_reports"
                    class="w-4 h-4 rounded text-wf-error focus:ring-rose-500/20 cursor-pointer"
                />
            </div>
        </form>

        <template #footer>
            <div class="flex items-center justify-end gap-2 w-full">
                <WfButton
                    variant="ghost"
                    size="sm"
                    @click="close"
                >
                    Cancel
                </WfButton>
                <WfButton
                    variant="primary"
                    size="sm"
                    @click="saveRule"
                    :disabled="!form.name || (!form.category && !form.is_transfer) || !form.keywords.length"
                >
                    <Save class="w-4 h-4 mr-1.5" />
                    <span>Save Logic</span>
                </WfButton>
            </div>
        </template>
    </WfModal>

    <!-- Exclude confirmation modal -->
    <WfModal
        :model-value="showExcludeConfirm"
        @update:model-value="showExcludeConfirm = $event"
        max-width="sm"
    >
        <div class="text-center py-2 space-y-4">
            <div class="w-12 h-12 rounded-wf-pill bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 mx-auto">
                <EyeOff class="w-6 h-6" />
            </div>
            <div>
                <h3 class="text-base font-bold text-wf-text-primary">Invisible in Reports?</h3>
                <p class="text-xs text-wf-text-secondary mt-1 max-w-xs mx-auto">
                    Transactions matching this rule will be <strong class="text-wf-text-primary">hidden</strong> from monthly totals and charts.
                </p>
            </div>
            <div class="flex items-center justify-center gap-3 pt-2">
                <WfButton
                    variant="ghost"
                    size="sm"
                    @click="showExcludeConfirm = false"
                >
                    Back
                </WfButton>
                <WfButton
                    variant="primary"
                    size="sm"
                    @click="confirmSaveRule"
                >
                    Confirm & Save
                </WfButton>
            </div>
        </div>
    </WfModal>
</template>
