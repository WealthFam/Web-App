<template>
    <!-- Add/Edit Rule Modal -->
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="520px"
        transition="dialog-bottom-transition" persistent>
        <v-card class="premium-glass-card no-hover overflow-hidden" rounded="xl" elevation="24">
            <!-- Header with Dynamic Icon -->
            <div class="pa-6 border-b bg-surface d-flex align-center justify-space-between relative-pos overflow-hidden">
                <div class="d-flex align-center ga-4 relative-pos z-2">
                    <div class="rule-icon-container">
                        <FileText :size="28" class="text-primary relative-pos z-2" />
                        <div class="icon-gradient-bg" style="opacity: 0.1"></div>
                    </div>
                    <div>
                        <div class="text-overline font-weight-black text-primary line-height-1 mb-1">
                            Intelligence Rule
                        </div>
                        <div class="text-h5 font-weight-black line-height-1 truncate" style="max-width: 300px;">
                            {{ form.name || 'New Classification' }}
                        </div>
                    </div>
                </div>
                <v-btn icon variant="text" size="small" @click="close" class="text-medium-emphasis">
                    <X :size="20" />
                    <v-tooltip activator="parent" location="top">Close</v-tooltip>
                </v-btn>
            </div>

            <v-card-text class="pa-6 overflow-y-auto custom-scrollbar" style="max-height: 70vh;">
                <v-form @submit.prevent="saveRule">
                    <div class="d-flex flex-column ga-6">
                        <!-- Identity Section -->
                        <div class="d-flex flex-column ga-3">
                            <div class="text-tiny font-weight-black opacity-50 text-uppercase letter-spacing-1 ml-2">
                                Identification</div>
                            <v-text-field v-model="form.name" variant="solo-filled" flat rounded="xl" required
                                placeholder="Rule Name (e.g. Amazon Shopping)" hide-details
                                class="font-weight-black text-h6" bg-color="surface" density="comfortable" autofocus
                                style="height: 56px;" />
                        </div>

                        <!-- Classification Section -->
                        <div class="d-flex flex-column ga-3">
                            <div class="text-tiny font-weight-black opacity-50 text-uppercase letter-spacing-1 ml-2">
                                Classification</div>
                            <div class="d-flex flex-column ga-3">
                                <v-autocomplete v-model="form.category" label="Target Category" variant="solo-filled"
                                    flat rounded="pill" hide-details density="comfortable" :items="categoryOptions"
                                    placeholder="Select Category" :required="!form.is_transfer" class="font-weight-bold"
                                    bg-color="surface">
                                    <template v-slot:prepend-inner>
                                        <Folder :size="18" class="text-primary mr-2 opacity-70" />
                                    </template>
                                </v-autocomplete>

                                <v-combobox v-model="form.keywords" label="Trigger Keywords" multiple chips
                                    closable-chips variant="solo-filled" flat rounded="xl" hide-details
                                    density="comfortable" placeholder="Enter keywords (e.g. AMZN, AMAZON)"
                                    class="font-weight-bold" bg-color="surface">
                                    <template v-slot:prepend-inner>
                                        <Zap :size="18" class="text-primary mr-2 opacity-70" />
                                    </template>
                                    <template v-slot:selection="{ item }">
                                        <v-chip size="small" color="primary" variant="flat"
                                            class="font-mono font-weight-black elevation-1">
                                            {{ (item as any).raw || item }}
                                        </v-chip>
                                    </template>
                                </v-combobox>
                                <div class="text-tiny font-weight-bold opacity-40 px-2 mt-n1">
                                    Transactions containing any of these terms will be auto-classified.
                                </div>
                            </div>
                        </div>

                        <!-- Advanced Logic Section -->
                        <div class="d-flex flex-column ga-3">
                            <div class="text-tiny font-weight-black opacity-50 text-uppercase letter-spacing-1 ml-2">
                                Logic & Precision</div>
                            <v-card variant="flat" rounded="xl" class="bg-surface border-thin pa-4">
                                <div class="d-flex flex-column ga-4">
                                    <div class="d-flex align-center justify-space-between">
                                        <div class="text-subtitle-2 font-weight-black d-flex align-center ga-2">
                                            Precision Testing
                                        </div>
                                        <v-btn variant="tonal" size="small" rounded="pill" color="primary"
                                            class="text-none font-weight-black px-4" @click="testCurrentLogic"
                                            :disabled="!form.keywords.length" :loading="testingLogic">
                                            <template v-slot:prepend>
                                                <Zap :size="14" />
                                            </template>
                                            Check Matches
                                        </v-btn>
                                    </div>

                                    <v-expand-transition>
                                        <div v-if="testResultCount !== null"
                                            class="bg-background pa-3 rounded-lg border-thin">
                                            <div class="d-flex align-center justify-space-between">
                                                <span class="text-tiny font-weight-black opacity-50 uppercase">Rule
                                                    Impact</span>
                                                <v-chip size="x-small"
                                                    :color="testResultCount > 0 ? 'success' : 'warning'" variant="flat"
                                                    class="font-weight-black">
                                                    {{ testResultCount }} matches
                                                </v-chip>
                                            </div>
                                            <div class="text-tiny font-weight-medium opacity-70 mt-1">
                                                {{ testResultCount > 0 ? `This rule will affect ${testResultCount} existing transactions.` : 'No matches found in your ledger yet.' }}
                                            </div>
                                        </div>
                                    </v-expand-transition>

                                    <v-divider class="opacity-10" />

                                    <div class="d-flex align-center justify-space-between">
                                        <div class="d-flex flex-column">
                                            <div class="text-subtitle-2 font-weight-black">Identify as Transfer</div>
                                            <div class="text-tiny font-weight-bold opacity-50">Move between accounts
                                            </div>
                                        </div>
                                        <v-switch v-model="form.is_transfer" color="primary" inset hide-details
                                            density="compact" />
                                    </div>

                                    <v-expand-transition>
                                        <div v-if="form.is_transfer">
                                            <v-autocomplete v-model="form.to_account_id" label="Destination Account"
                                                variant="solo-filled" flat rounded="pill" hide-details
                                                density="comfortable"
                                                :items="financeStore.accounts.map(a => ({ title: a.name, value: a.id }))"
                                                placeholder="Select Destination" required class="font-weight-bold"
                                                bg-color="background">
                                                <template v-slot:prepend-inner>
                                                    <CreditCard :size="18" class="text-secondary mr-2 opacity-70" />
                                                </template>
                                            </v-autocomplete>
                                        </div>
                                    </v-expand-transition>

                                    <div class="d-flex align-center ga-4">
                                        <div class="text-subtitle-2 font-weight-black shrink-0">Priority</div>
                                        <v-slider v-model="form.priority" :min="0" :max="100" :step="1" hide-details
                                            color="primary" class="flex-grow-1">
                                            <template v-slot:append>
                                                <div class="text-caption font-weight-black bg-background px-3 py-1 rounded-pill border-thin"
                                                    style="min-width: 45px; text-align: center;">
                                                    {{ form.priority }}
                                                </div>
                                            </template>
                                        </v-slider>
                                    </div>
                                </div>
                            </v-card>
                        </div>

                        <!-- Visibility Options -->
                        <div class="d-flex flex-column ga-3">
                            <div class="text-tiny font-weight-black opacity-50 text-uppercase letter-spacing-1 ml-2">
                                Analytics Configuration</div>
                            <v-card variant="flat" rounded="xl" class="bg-surface border-thin pa-1">
                                <v-switch v-model="form.exclude_from_reports" color="error" inset hide-details
                                    class="px-4">
                                    <template v-slot:label>
                                        <div class="ml-2 py-2">
                                            <div class="text-subtitle-2 font-weight-black line-height-1 mb-1">Exclude
                                                from Reports</div>
                                            <div class="text-tiny font-weight-bold opacity-60">Matching items won't
                                                affect your spending totals.</div>
                                        </div>
                                    </template>
                                </v-switch>
                            </v-card>
                        </div>
                    </div>
                </v-form>
            </v-card-text>

            <!-- Actions -->
            <v-card-actions class="pa-6 bg-surface border-t">
                <v-spacer />
                <v-btn variant="text" @click="close" class="text-none px-6 font-weight-bold" rounded="pill">
                    <template v-slot:prepend>
                        <X :size="16" />
                    </template>
                    Cancel
                </v-btn>
                <v-btn color="primary" rounded="pill"
                    class="text-none px-10 font-weight-black elevation-8 shadow-primary" @click="saveRule" height="48"
                    :disabled="!form.name || (!form.category && !form.is_transfer) || !form.keywords.length">
                    <template v-slot:prepend>
                        <Save :size="18" />
                    </template>
                    Save Logic
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Exclude confirmation -->
    <v-dialog v-model="showExcludeConfirm" max-width="450px" persistent>
        <v-card class="premium-glass-card no-hover text-center pa-8" rounded="xl" elevation="24">
            <v-avatar color="warning" variant="tonal" size="72" class="mb-6 mx-auto elevation-2">
                <EyeOff :size="40" />
            </v-avatar>
            <h3 class="text-h5 font-weight-black mb-2">Invisible in Reports?</h3>
            <p class="text-subtitle-2 font-weight-medium opacity-60 mb-8 px-4">
                Transactions matching this rule will be <strong>hidden</strong> from monthly totals and charts.
            </p>
            <div class="d-flex ga-3 justify-center">
                <v-btn variant="text" rounded="pill" class="text-none font-weight-bold px-6" height="44"
                    @click="showExcludeConfirm = false">Back</v-btn>
                <v-btn color="primary" rounded="pill" class="text-none font-weight-black px-8 elevation-4" height="44"
                    @click="confirmSaveRule">Confirm & Save</v-btn>
            </div>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { FileText, X, Folder, Zap, CreditCard, EyeOff, Save } from 'lucide-vue-next'
import { financeApi } from '@/api/client'
import { useCategoriesStore } from '@/stores/finance/categories'
import { useRulesStore, type Rule } from '@/stores/finance/rules'
import { useFinanceStore } from '@/stores/finance'
import { useNotificationStore } from '@/stores/notification'

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
            keywords: Array.isArray(rule.keywords) ? [...rule.keywords] : (rule.keywords as string).split(','),
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
    testResultCount.value = null
}

function close() {
    emit('update:modelValue', false)
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

<style scoped>
.rule-icon-container {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: rgba(var(--v-theme-surface), 0.8);
    border: 1px solid rgba(var(--v-border-color), 0.1);
    box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.05);
    position: relative;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.icon-gradient-bg {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, var(--v-theme-primary), transparent 70%);
    filter: blur(8px);
    z-index: 0;
}

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
