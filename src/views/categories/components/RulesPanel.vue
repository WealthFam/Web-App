<template>
    <div class="animate-in">
        <!-- Toolbar -->
        <v-card class="premium-glass-card premium-toolbar mb-6 no-hover border-thin elevation-2" rounded="xl">
            <v-row align="center" dense class="w-100">
                <v-col cols="12" sm="4">
                    <v-text-field v-model="rulesStore.searchQuery" placeholder="Search rules..." hide-details
                        density="comfortable" variant="solo-filled" flat rounded="pill" class="font-weight-bold"
                        bg-color="surface">
                        <template v-slot:prepend-inner>
                            <Search :size="18" class="text-primary mr-2 opacity-70" />
                        </template>
                    </v-text-field>
                </v-col>

                <v-spacer />

                <v-col cols="12" sm="auto" class="d-flex align-center ga-3">
                    <div class="glass-card border rounded-pill d-flex align-center pa-1 shadow-sm"
                        style="background: rgba(var(--v-theme-surface), 0.5)">
                        <v-btn variant="text" size="small" rounded="pill" color="primary"
                            class="text-none font-weight-black px-4" @click="emit('open-add-rule')">
                            <template v-slot:prepend>
                                <Plus :size="14" />
                            </template>
                            Add Rule
                        </v-btn>
                        <v-divider vertical class="mx-1 my-2 opacity-30" style="height: 16px; align-self: center;" />
                        <v-btn variant="text" size="small" rounded="pill" color="primary"
                            class="text-none font-weight-black px-4" @click="rulesStore.exportRules">
                            <template v-slot:prepend>
                                <Download :size="14" />
                            </template>
                            Export
                        </v-btn>
                        <v-divider vertical class="mx-1 my-2 opacity-30" style="height: 16px; align-self: center;" />
                        <v-btn variant="text" size="small" rounded="pill" color="primary"
                            class="text-none font-weight-black px-4" @click="ruleFileInput?.click()">
                            <template v-slot:prepend>
                                <Upload :size="14" />
                            </template>
                            Import
                            <input type="file" ref="ruleFileInput" class="d-none" accept=".json"
                                @change="handleRuleImport" />
                        </v-btn>
                    </div>
                </v-col>
            </v-row>
        </v-card>

        <!-- Rules Table -->
        <v-card class="premium-glass-card overflow-hidden border-thin elevation-2" rounded="xl">
            <v-data-table :headers="headers" :items="rulesStore.filteredRules" :loading="rulesStore.loading" hover
                density="comfortable" class="premium-table" :items-per-page="rulesStore.pageSize"
                hide-default-footer>
                <!-- Name Column -->
                <template v-slot:item.name="{ item }">
                    <div class="d-flex align-center ga-3 py-2">
                        <v-avatar color="primary" variant="tonal" rounded="lg" size="36" class="elevation-1 border">
                            <FileText :size="18" />
                        </v-avatar>
                        <div class="min-w-0">
                            <div class="font-weight-black truncate" style="max-width: 180px;" :title="item.name">{{
                                item.name }}</div>
                            <div v-if="item.exclude_from_reports" class="d-flex align-center ga-1">
                                <EyeOff :size="10" class="text-error" />
                                <span class="text-tiny font-weight-black text-error text-uppercase">Hidden</span>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Keywords Column -->
                <template v-slot:item.keywords="{ item }">
                    <div class="d-flex flex-wrap ga-1 py-1">
                        <v-chip v-for="(k, idx) in item.keywords.slice(0, 3)" :key="idx" size="x-small" variant="flat"
                            class="font-mono font-weight-black bg-surface elevation-1 border">
                            {{ k }}
                        </v-chip>
                        <v-chip v-if="item.keywords.length > 3" size="x-small" variant="text"
                            class="text-primary font-weight-black">
                            +{{ item.keywords.length - 3 }}
                        </v-chip>
                    </div>
                </template>

                <!-- Category Column -->
                <template v-slot:item.category="{ item }">
                    <v-chip size="small" variant="flat" color="surface" class="font-weight-black border elevation-1"
                        label>
                        {{ categoriesStore.getCategoryDisplay(item.category) }}
                    </v-chip>
                    <v-chip v-if="item.is_transfer" density="compact" size="x-small" variant="flat" color="secondary"
                        class="font-weight-black border elevation-1 ml-1" label>
                        <Shuffle :size="10" class="mr-1" /> Transfer
                    </v-chip>
                </template>

                <!-- Priority Column -->
                <template v-slot:item.priority="{ item }">
                    <div class="d-flex align-center ga-1">
                        <v-btn icon variant="text" size="x-small" color="medium-emphasis"
                            @click="updatePriority(item, 1)">
                            <ArrowUp :size="14" />
                        </v-btn>
                        <span
                            class="text-caption font-weight-black bg-surface px-2 py-1 rounded border-thin text-center"
                            style="min-width: 32px;">{{ item.priority }}</span>
                        <v-btn icon variant="text" size="x-small" color="medium-emphasis"
                            @click="updatePriority(item, -1)">
                            <ArrowDown :size="14" />
                        </v-btn>
                    </div>
                </template>

                <!-- Hits Column -->
                <template v-slot:item.hit_count="{ item }">
                    <div class="d-flex align-center ga-1">
                        <Zap :size="12" :class="(item.hit_count || 0) > 0 ? 'text-success' : 'text-medium-emphasis opacity-30'" />
                        <span class="text-caption font-weight-black">{{ item.hit_count || 0 }}</span>
                    </div>
                </template>

                <!-- Status Column -->
                <template v-slot:item.is_valid="{ item }">
                    <v-chip v-if="item.is_valid === false" density="compact" size="small" variant="flat" color="error"
                        class="font-weight-black border elevation-1" label>
                        <AlertCircle :size="10" class="mr-1" /> Invalid
                        <v-tooltip activator="parent" location="top">
                            {{ item.validation_error || 'Rule is malformed.' }}
                        </v-tooltip>
                    </v-chip>
                    <v-chip v-else density="compact" size="small" variant="flat" color="success"
                        class="font-weight-black border elevation-1" label>
                        Active
                    </v-chip>
                </template>

                <!-- Actions Column -->
                <template v-slot:item.actions="{ item }">
                    <v-menu>
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" icon variant="text" size="small" color="medium-emphasis">
                                <MoreVertical :size="16" />
                            </v-btn>
                        </template>
                        <v-list density="compact" class="rounded-lg border" elevation="2" min-width="200">
                            <v-list-item @click="handleApplyToLedger(item)">
                                <template v-slot:prepend>
                                    <Zap :size="16" class="mr-2 text-primary" />
                                </template>
                                <v-list-item-title class="text-caption font-weight-bold">Apply to Ledger
                                </v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="emit('apply-triage-rule', item.id)">
                                <template v-slot:prepend>
                                    <Inbox :size="16" class="mr-2 text-warning" />
                                </template>
                                <v-list-item-title class="text-caption font-weight-bold">Apply to Triage
                                </v-list-item-title>
                            </v-list-item>
                            <v-divider class="my-1" />
                            <v-list-item @click="emit('edit-rule', item)">
                                <template v-slot:prepend>
                                    <Pencil :size="16" class="mr-2" />
                                </template>
                                <v-list-item-title class="text-caption font-weight-bold">Edit</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="duplicateRule(item)">
                                <template v-slot:prepend>
                                    <Copy :size="16" class="mr-2" />
                                </template>
                                <v-list-item-title class="text-caption font-weight-bold">Duplicate</v-list-item-title>
                            </v-list-item>
                            <v-divider class="my-1" />
                            <v-list-item @click="confirmDelete(item.id)" class="text-error">
                                <template v-slot:prepend>
                                    <Trash2 :size="16" class="mr-2" />
                                </template>
                                <v-list-item-title class="text-caption font-weight-bold">Delete</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </template>

                <!-- Empty State -->
                <template v-slot:no-data>
                    <div class="text-center py-16">
                        <v-avatar size="96" color="surface-variant" variant="tonal" class="mb-6 elevation-2 border">
                            <FileText :size="48" class="opacity-20" />
                        </v-avatar>
                        <h3 class="text-h5 font-weight-black mb-2">No Rules Found</h3>
                        <p class="text-subtitle-1 opacity-60 mb-8 font-weight-medium mx-auto"
                            style="max-width: 400px">
                            {{ rulesStore.emptyRulesMsg }}
                        </p>
                        <v-btn v-if="!rulesStore.searchQuery" color="primary" rounded="pill" size="large"
                            class="text-none px-10 elevation-8 font-weight-black" @click="emit('open-add-rule')">
                            Create First Rule
                        </v-btn>
                    </div>
                </template>
            </v-data-table>

            <!-- Pagination Footer -->
            <v-divider class="border-opacity-10"></v-divider>
            <div v-if="rulesStore.totalRules > 0" class="d-flex align-center justify-end py-3 px-4 triage-footer">
                <div class="d-flex align-center mr-8">
                    <span class="text-caption text-medium-emphasis mr-2">Rows per page:</span>
                    <v-menu>
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" variant="text" size="small" density="compact"
                                class="text-caption font-weight-black px-1 no-hover-effect">
                                {{ rulesStore.pageSize }}
                                <ChevronDown :size="14" class="ml-1 opacity-60" />
                            </v-btn>
                        </template>
                        <v-list density="compact" class="rounded-lg border" elevation="2">
                            <v-list-item v-for="size in [10, 20, 50, 100]" :key="size"
                                @click="handlePageSizeChange(size)" :active="rulesStore.pageSize === size"
                                color="primary">
                                <v-list-item-title class="text-caption font-weight-bold">{{ size
                                    }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </div>

                <div class="text-caption font-weight-bold text-medium-emphasis mr-6">
                    {{ (rulesStore.currentPage - 1) * rulesStore.pageSize + 1 }}-{{ Math.min(rulesStore.currentPage *
                        rulesStore.pageSize, rulesStore.totalRules) }} of {{ rulesStore.totalRules }}
                </div>

                <div class="d-flex align-center gap-1">
                    <v-btn icon variant="text" size="small" :disabled="rulesStore.currentPage === 1" @click="prevPage">
                        <ChevronLeft :size="18" />
                    </v-btn>
                    <v-btn icon variant="text" size="small"
                        :disabled="rulesStore.currentPage * rulesStore.pageSize >= rulesStore.totalRules"
                        @click="nextPage">
                        <ChevronRight :size="18" />
                    </v-btn>
                </div>
            </div>
        </v-card>

        <!-- Delete Confirmation -->
        <v-dialog v-model="showDeleteConfirm" max-width="450px" persistent>
            <v-card class="premium-glass-card no-hover text-center pa-8" rounded="xl" elevation="24">
                <v-avatar color="error" variant="tonal" size="72" class="mb-6 mx-auto elevation-2">
                    <Trash2 :size="40" />
                </v-avatar>
                <h3 class="text-h5 font-weight-black mb-2">Delete Classification Rule?</h3>
                <p class="text-subtitle-2 font-weight-medium opacity-60 mb-8 px-4">
                    Future transactions matched by this rule will become <strong>uncategorized</strong>.
                </p>
                <div class="d-flex ga-3 justify-center">
                    <v-btn variant="text" rounded="pill" class="text-none font-weight-bold px-6" height="44"
                        @click="showDeleteConfirm = false">Cancel</v-btn>
                    <v-btn color="error" rounded="pill" class="text-none font-weight-black px-8 elevation-4"
                        height="44" @click="executeDelete">Yes, Delete</v-btn>
                </div>
            </v-card>
        </v-dialog>

        <!-- Apply Retro Confirmation -->
        <v-dialog v-model="showApplyConfirm" max-width="500px" persistent>
            <v-card class="premium-glass-card no-hover text-center pa-8" rounded="xl" elevation="24">
                <v-avatar color="primary" variant="tonal" size="72" class="mb-6 mx-auto elevation-2">
                    <Zap :size="40" />
                </v-avatar>
                <h3 class="text-h5 font-weight-black mb-2">Retroactive Application</h3>
                <p class="text-subtitle-2 font-weight-medium opacity-60 mb-6">
                    Scan your history and apply this logic to matching records?
                </p>

                <!-- Override Switch -->
                <v-card variant="flat" color="primary" rounded="pill"
                    class="pa-1 pr-4 border-thin bg-surface mb-6 mx-auto d-inline-flex">
                    <v-switch v-model="rulesStore.overrideExisting" color="primary" inset hide-details density="compact"
                        @update:model-value="refetchPreview">
                        <template v-slot:label>
                            <span class="text-tiny font-weight-black ml-2 text-uppercase">Override existing
                                categories</span>
                        </template>
                    </v-switch>
                </v-card>

                <v-expand-transition>
                    <div v-if="rulesStore.previewLoading" class="py-8">
                        <v-progress-circular indeterminate color="primary" size="32" />
                        <div class="mt-2 text-tiny font-weight-black opacity-60 text-uppercase">Scanning history...
                        </div>
                    </div>
                    <div v-else-if="rulesStore.matchingCount > 0" class="mb-8">
                        <div class="bg-surface-lighten-1 rounded-lg pa-4 border-thin text-left border-dashed">
                            <div class="d-flex align-center justify-space-between mb-3">
                                <span class="text-tiny font-weight-black opacity-50 text-uppercase">Preview (Latest 5
                                    of {{ rulesStore.matchingCount }})</span>
                                <v-chip size="x-small" color="primary" variant="flat"
                                    class="font-weight-black elevation-1">
                                    {{ rulesStore.matchingCount }} matches
                                </v-chip>
                            </div>
                            <div class="d-flex flex-column ga-2">
                                <div v-for="txn in rulesStore.matchingPreview" :key="txn.id"
                                    class="d-flex justify-space-between align-center border-b pb-2 last-no-border opacity-90 border-opacity-10">
                                    <div class="min-w-0 pr-2">
                                        <div class="text-caption font-weight-black truncate">{{ txn.description ||
                                            txn.recipient }}</div>
                                        <div
                                            class="text-tiny font-weight-bold opacity-50 d-flex align-center ga-1">
                                            {{ new Date(txn.date).toLocaleDateString() }}
                                            <v-chip v-if="txn.category && txn.category !== 'Uncategorized'"
                                                size="x-small" variant="text" color="primary"
                                                class="px-1 font-weight-black">
                                                · {{ txn.category }}
                                            </v-chip>
                                        </div>
                                    </div>
                                    <div class="text-caption font-weight-black shrink-0"
                                        :class="txn.amount < 0 ? 'text-error' : 'text-success'">
                                        {{ txn.amount < 0 ? '-' : '' }}₹{{ Math.abs(txn.amount).toLocaleString() }}
                                    </div>
                                </div>
                            </div>

                            <!-- Pagination -->
                            <div v-if="rulesStore.matchingCount > rulesStore.previewLimit"
                                class="mt-4 d-flex justify-center">
                                <v-pagination v-model="rulesStore.previewPage"
                                    :length="Math.ceil(rulesStore.matchingCount / rulesStore.previewLimit)"
                                    :total-visible="3" density="compact" variant="flat" color="primary"
                                    active-color="primary" size="small" @update:model-value="handlePageChange" />
                            </div>
                        </div>
                    </div>
                    <div v-else-if="!rulesStore.previewLoading"
                        class="mb-8 text-center text-caption font-weight-black text-amber">
                        <AlertCircle :size="16" class="mr-1 inline-block vertical-align-middle" />
                        No matching transactions found.
                    </div>
                </v-expand-transition>

                <div class="d-flex ga-3 justify-center">
                    <v-btn variant="text" rounded="pill" class="text-none font-weight-bold px-6" height="44"
                        @click="showApplyConfirm = false">Cancel</v-btn>
                    <v-btn color="primary" rounded="pill" class="text-none font-weight-black px-8 elevation-8"
                        height="44" @click="executeApplyRule"
                        :disabled="rulesStore.matchingCount === 0 || rulesStore.previewLoading">
                        Run Logic Now
                    </v-btn>
                </div>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
    AlertCircle, ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Copy,
    Download, EyeOff, FileText, Inbox, MoreVertical, Pencil, Plus, Search, Shuffle,
    Trash2, Upload, Zap
} from 'lucide-vue-next'
import { useRulesStore, type Rule } from '@/stores/finance/rules'
import { useCategoriesStore } from '@/stores/finance/categories'

const rulesStore = useRulesStore()
const categoriesStore = useCategoriesStore()

const emit = defineEmits<{
    (e: 'open-add-rule'): void
    (e: 'edit-rule', rule: Rule): void
    (e: 'duplicate-rule', rule: Rule): void
    (e: 'switch-to-triage'): void
    (e: 'apply-triage-rule', ruleId: string): void
}>()

const headers = [
    { title: 'Name', key: 'name', sortable: true, width: '200px' },
    { title: 'Keywords', key: 'keywords', sortable: false, width: '250px' },
    { title: 'Category', key: 'category', sortable: true, width: '150px' },
    { title: 'Priority', key: 'priority', sortable: true, width: '120px', align: 'center' as const },
    { title: 'Hits', key: 'hit_count', sortable: true, width: '80px', align: 'center' as const },
    { title: 'Status', key: 'is_valid', sortable: false, width: '100px', align: 'center' as const },
    { title: '', key: 'actions', sortable: false, width: '60px', align: 'center' as const },
]

// Local State
const showDeleteConfirm = ref(false)
const showApplyConfirm = ref(false)
const ruleToDelete = ref<string | null>(null)
const ruleToApply = ref<string | null>(null)
const ruleFileInput = ref<HTMLInputElement | null>(null)

// Pagination
function handlePageSizeChange(size: number) {
    rulesStore.pageSize = size
    rulesStore.fetchRules(1)
}

function nextPage() {
    if (rulesStore.currentPage * rulesStore.pageSize < rulesStore.totalRules) {
        rulesStore.fetchRules(rulesStore.currentPage + 1)
    }
}

function prevPage() {
    if (rulesStore.currentPage > 1) {
        rulesStore.fetchRules(rulesStore.currentPage - 1)
    }
}

// Priority
async function updatePriority(rule: Rule, delta: number) {
    const newPriority = (rule.priority || 0) + delta
    await rulesStore.updateRule(rule.id, { ...rule, priority: newPriority })
}

// Delete
function confirmDelete(id: string) {
    ruleToDelete.value = id
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
    emit('duplicate-rule', rule)
}

// Apply Retro to Ledger
async function handleApplyToLedger(rule: Rule) {
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

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.text-tiny {
    font-size: 0.65rem !important;
    letter-spacing: 0.5px;
}

.last-no-border:last-child {
    border-bottom: none !important;
}

.triage-footer {
    background: rgba(var(--v-theme-on-surface), 0.01);
}

.no-hover-effect:hover {
    background: rgba(var(--v-theme-on-surface), 0.05) !important;
}

.gap-1 {
    gap: 4px;
}
</style>
