<script setup lang="ts">
import { ref, computed } from 'vue'
import {
    Check, ChevronLeft, ChevronRight, Search, Zap
} from 'lucide-vue-next'
import { useRulesStore, type TriageScanResult } from '@/stores/finance/rules'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'

const rulesStore = useRulesStore()

const selectedRuleIds = ref<string[]>([])
const expandedRuleIds = ref<string[]>([])
const showConfirmDialog = ref(false)
const confirmPage = ref(1)
const confirmPageSize = 10

// Confirmation state
const confirmationData = ref<{ totalTransactions: number; rules: TriageScanResult[] }>({
    totalTransactions: 0,
    rules: []
})

const allConfirmTxns = computed(() => {
    const txns: any[] = []
    for (const rule of confirmationData.value.rules) {
        for (const txn of rule.preview) {
            txns.push({ ...txn, _ruleName: rule.rule_name })
        }
    }
    return txns
})

const paginatedConfirmTxns = computed(() => {
    const start = (confirmPage.value - 1) * confirmPageSize
    return allConfirmTxns.value.slice(start, start + confirmPageSize)
})

const totalConfirmPages = computed(() => {
    return Math.ceil(allConfirmTxns.value.length / confirmPageSize) || 1
})

const selectedMatchCount = computed(() => {
    if (!rulesStore.triageScanResults) return 0
    return rulesStore.triageScanResults.rules_with_matches
        .filter(r => selectedRuleIds.value.includes(r.rule_id))
        .reduce((sum, r) => sum + r.matching_count, 0)
})

const isAllSelected = computed(() => {
    if (!rulesStore.triageScanResults || rulesStore.triageScanResults.rules_with_matches.length === 0) return false
    return rulesStore.triageScanResults.rules_with_matches.every(r => selectedRuleIds.value.includes(r.rule_id))
})

function toggleSelectAll() {
    if (isAllSelected.value) {
        selectedRuleIds.value = []
    } else {
        selectedRuleIds.value = rulesStore.triageScanResults?.rules_with_matches.map(r => r.rule_id) || []
    }
}

function toggleExpandRule(id: string) {
    const idx = expandedRuleIds.value.indexOf(id)
    if (idx > -1) {
        expandedRuleIds.value.splice(idx, 1)
    } else {
        expandedRuleIds.value.push(id)
    }
}

async function runScan() {
    selectedRuleIds.value = []
    await rulesStore.scanAllTriage()
}

function openSingleConfirmation(result: TriageScanResult) {
    confirmationData.value = {
        totalTransactions: result.matching_count,
        rules: [result]
    }
    confirmPage.value = 1
    showConfirmDialog.value = true
}

function openBatchConfirmation() {
    if (!rulesStore.triageScanResults) return
    const selected = rulesStore.triageScanResults.rules_with_matches
        .filter(r => selectedRuleIds.value.includes(r.rule_id))

    confirmationData.value = {
        totalTransactions: selected.reduce((sum, r) => sum + r.matching_count, 0),
        rules: selected
    }
    confirmPage.value = 1
    showConfirmDialog.value = true
}

async function executeTriageApply() {
    for (const rule of confirmationData.value.rules) {
        await rulesStore.applyRuleToTriage(rule.rule_id)
    }

    showConfirmDialog.value = false
    selectedRuleIds.value = []

    // Refresh scan results and stats
    await rulesStore.scanAllTriage()
    await rulesStore.fetchRuleStats()
}

defineExpose({
    runScanForRule: async (ruleId: string) => {
        await rulesStore.scanAllTriage()
        if (rulesStore.triageScanResults) {
            const match = rulesStore.triageScanResults.rules_with_matches.find(r => r.rule_id === ruleId)
            if (match) {
                selectedRuleIds.value = [ruleId]
            }
        }
    }
})
</script>

<template>
    <div class="space-y-4">
        <!-- Toolbar Ribbon -->
        <WfCard variant="flat" padding="sm" radius="lg" class="border border-wf-border bg-wf-surface flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-wf-text-primary">Triage Ingestion Scan</span>
                <span
                    v-if="rulesStore.triageScanResults"
                    class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                >
                    {{ rulesStore.triageScanResults.total_matches }} Matches Found
                </span>
            </div>

            <div class="flex items-center gap-2">
                <WfButton
                    variant="outline"
                    size="sm"
                    @click="runScan"
                    :loading="rulesStore.triageScanLoading"
                    class="h-8 px-3 text-xs font-semibold shadow-2xs"
                >
                    <Search class="w-3.5 h-3.5 mr-1" />
                    <span>Re-Scan Queue</span>
                </WfButton>

                <WfButton
                    v-if="selectedRuleIds.length > 0"
                    variant="primary"
                    size="sm"
                    @click="openBatchConfirmation"
                    class="h-8 px-3.5 text-xs font-semibold shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    <Zap class="w-3.5 h-3.5 mr-1" />
                    <span>Approve Selected ({{ selectedMatchCount }})</span>
                </WfButton>
            </div>
        </WfCard>

        <!-- Ready State -->
        <div v-if="!rulesStore.triageScanResults && !rulesStore.triageScanLoading" class="p-12 text-center flex flex-col items-center justify-center text-wf-text-muted">
            <Search class="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
            <h3 class="text-sm font-bold text-wf-text-primary">Ready to Scan</h3>
            <p class="text-xs text-wf-text-muted mt-1 max-w-sm">
                Click "Re-Scan Queue" to search your pending triage queue for transactions that match active classification rules.
            </p>
            <div class="mt-4">
                <WfButton variant="primary" size="sm" @click="runScan">
                    <Search class="w-3.5 h-3.5 mr-1" />
                    <span>Start Scan</span>
                </WfButton>
            </div>
        </div>

        <!-- Scanning State -->
        <div v-if="rulesStore.triageScanLoading" class="p-16 text-center">
            <div class="w-8 h-8 border-3 border-wf-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <h3 class="text-sm font-bold text-wf-text-primary">Scanning Triage Queue...</h3>
            <p class="text-xs text-wf-text-muted mt-0.5">Matching active rules against pending records</p>
        </div>

        <!-- Scan Results -->
        <div v-if="rulesStore.triageScanResults && !rulesStore.triageScanLoading">
            <!-- No Matches Clean State -->
            <div v-if="rulesStore.triageScanResults.rules_with_matches.length === 0" class="p-12 text-center flex flex-col items-center justify-center text-wf-text-muted">
                <div class="w-12 h-12 rounded-wf-pill bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-wf-success mb-2">
                    <Check class="w-6 h-6" />
                </div>
                <h3 class="text-sm font-bold text-wf-text-primary">Triage Queue is Clean</h3>
                <p class="text-xs text-wf-text-muted mt-0.5">No pending transactions match any of your classification rules.</p>
            </div>

            <!-- Results Table -->
            <WfCard v-else variant="flat" padding="none" radius="lg" class="border border-wf-border bg-wf-surface overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="border-b border-wf-border bg-wf-surface-variant/40 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
                                <th class="py-3 px-4 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        :checked="isAllSelected"
                                        @change="toggleSelectAll"
                                        class="w-3.5 h-3.5 rounded text-wf-primary cursor-pointer"
                                    />
                                </th>
                                <th class="py-3 px-3">Rule Name</th>
                                <th class="py-3 px-3">Category</th>
                                <th class="py-3 px-3 text-center w-24">Matches</th>
                                <th class="py-3 px-4 text-right w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-wf-border-subtle">
                            <template v-for="item in rulesStore.triageScanResults.rules_with_matches" :key="item.rule_id">
                                <tr class="hover:bg-wf-surface-variant/40 transition-colors">
                                    <td class="py-3 px-4 text-center">
                                        <input
                                            type="checkbox"
                                            :value="item.rule_id"
                                            v-model="selectedRuleIds"
                                            class="w-3.5 h-3.5 rounded text-wf-primary cursor-pointer"
                                        />
                                    </td>
                                    <td class="py-3 px-3">
                                        <div class="flex items-center gap-2">
                                            <button
                                                @click="toggleExpandRule(item.rule_id)"
                                                class="p-0.5 rounded text-wf-text-muted hover:text-wf-text-primary transition-transform"
                                                :class="{ 'rotate-90': expandedRuleIds.includes(item.rule_id) }"
                                            >
                                                <ChevronRight class="w-3.5 h-3.5" />
                                            </button>
                                            <span class="font-bold text-xs text-wf-text-primary">{{ item.rule_name }}</span>
                                        </div>
                                    </td>
                                    <td class="py-3 px-3">
                                        <span class="px-2 py-0.5 rounded-wf-sm text-[11px] font-semibold bg-wf-surface border border-wf-border text-wf-text-primary">
                                            {{ item.category }}
                                        </span>
                                    </td>
                                    <td class="py-3 px-3 text-center">
                                        <span
                                            class="px-2 py-0.5 rounded-wf-sm text-[10px] font-bold border"
                                            :class="item.matching_count > 5 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'"
                                        >
                                            {{ item.matching_count }}
                                        </span>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <WfButton
                                            variant="primary"
                                            size="sm"
                                            @click="openSingleConfirmation(item)"
                                            :loading="rulesStore.triageApplyLoading"
                                            class="h-7 px-2.5 text-xs font-semibold"
                                        >
                                            <Zap class="w-3 h-3 mr-1" />
                                            <span>Apply</span>
                                        </WfButton>
                                    </td>
                                </tr>

                                <!-- Expanded Row Preview -->
                                <tr v-if="expandedRuleIds.includes(item.rule_id)" class="bg-wf-surface-variant/30">
                                    <td colspan="5" class="p-3">
                                        <div class="space-y-2 border-l-2 border-l-wf-primary pl-3">
                                            <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">
                                                Matched Transactions (first {{ item.preview.length }})
                                            </span>
                                            <div class="space-y-1">
                                                <div
                                                    v-for="txn in item.preview"
                                                    :key="txn.id"
                                                    class="flex items-center justify-between text-xs py-1 px-2 rounded-wf-xs bg-wf-surface border border-wf-border"
                                                >
                                                    <span class="font-medium text-wf-text-primary truncate max-w-sm">
                                                        {{ txn.description || txn.recipient || '—' }}
                                                    </span>
                                                    <div class="flex items-center gap-3 shrink-0">
                                                        <span class="text-[10px] text-wf-text-muted">
                                                            {{ txn.date ? new Date(txn.date).toLocaleDateString() : '—' }}
                                                        </span>
                                                        <span class="font-bold tabular-nums" :class="(txn.amount || 0) < 0 ? 'text-wf-error' : 'text-wf-success'">
                                                            {{ (txn.amount || 0) < 0 ? '-' : '' }}₹{{ Math.abs(txn.amount || 0).toLocaleString() }}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </WfCard>
        </div>

        <!-- Confirmation Modal with Paginated Table -->
        <WfModal
            :model-value="showConfirmDialog"
            @update:model-value="showConfirmDialog = $event"
            max-width="lg"
        >
            <template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-wf-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                        <Zap class="w-5 h-5" />
                    </div>
                    <div>
                        <span class="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Triage → Ledger</span>
                        <h3 class="text-base font-bold text-wf-text-primary">Confirm Auto-Approval</h3>
                    </div>
                </div>
            </template>

            <div class="space-y-4">
                <!-- Summary Alert -->
                <div class="p-3 rounded-wf-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
                    <strong>{{ confirmationData.totalTransactions }}</strong> transactions across <strong>{{ confirmationData.rules.length }}</strong> rules will be categorized and <strong>moved to the ledger</strong>.
                </div>

                <!-- Affected rules tags -->
                <div class="space-y-1.5">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">Affected Rules</span>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span
                            v-for="r in confirmationData.rules"
                            :key="r.rule_id"
                            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-wf-sm text-xs font-semibold bg-wf-surface border border-wf-border text-wf-text-primary"
                        >
                            <span>{{ r.rule_name }}</span>
                            <span class="px-1 py-0.2 rounded-wf-xs bg-indigo-50 text-wf-primary text-[10px] font-bold">
                                {{ r.matching_count }}
                            </span>
                        </span>
                    </div>
                </div>

                <!-- Preview Table -->
                <div class="border border-wf-border rounded-wf-md bg-wf-surface overflow-hidden">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="border-b border-wf-border bg-wf-surface-variant/40 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
                                <th class="py-2.5 px-3">Description</th>
                                <th class="py-2.5 px-3">Rule</th>
                                <th class="py-2.5 px-3">Date</th>
                                <th class="py-2.5 px-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-wf-border-subtle">
                            <tr v-for="txn in paginatedConfirmTxns" :key="txn.id">
                                <td class="py-2 px-3 font-semibold text-wf-text-primary max-w-[200px] truncate" :title="txn.description || txn.recipient">
                                    {{ txn.description || txn.recipient || '—' }}
                                </td>
                                <td class="py-2 px-3">
                                    <span class="px-1.5 py-0.5 rounded-wf-xs text-[10px] font-bold bg-indigo-50 text-wf-primary border border-indigo-200">
                                        {{ txn._ruleName }}
                                    </span>
                                </td>
                                <td class="py-2 px-3 text-[11px] text-wf-text-muted">
                                    {{ txn.date ? new Date(txn.date).toLocaleDateString() : '—' }}
                                </td>
                                <td class="py-2 px-3 text-right font-bold tabular-nums" :class="(txn.amount || 0) < 0 ? 'text-wf-error' : 'text-wf-success'">
                                    {{ (txn.amount || 0) < 0 ? '-' : '' }}₹{{ Math.abs(txn.amount || 0).toLocaleString() }}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Pagination Footer -->
                    <div class="p-2.5 border-t border-wf-border bg-wf-surface-variant/30 flex items-center justify-between text-xs">
                        <span class="text-[11px] text-wf-text-muted">
                            {{ (confirmPage - 1) * confirmPageSize + 1 }} - {{ Math.min(confirmPage * confirmPageSize, allConfirmTxns.length) }} of {{ allConfirmTxns.length }}
                        </span>
                        <div class="flex items-center gap-1">
                            <button
                                :disabled="confirmPage === 1"
                                @click="confirmPage--"
                                class="p-1 rounded-wf-xs border border-wf-border text-wf-text-secondary disabled:opacity-40"
                            >
                                <ChevronLeft class="w-3.5 h-3.5" />
                            </button>
                            <button
                                :disabled="confirmPage >= totalConfirmPages"
                                @click="confirmPage++"
                                class="p-1 rounded-wf-xs border border-wf-border text-wf-text-secondary disabled:opacity-40"
                            >
                                <ChevronRight class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex items-center justify-end gap-2 w-full">
                    <WfButton
                        variant="ghost"
                        size="sm"
                        @click="showConfirmDialog = false"
                    >
                        Cancel
                    </WfButton>
                    <WfButton
                        variant="primary"
                        size="sm"
                        @click="executeTriageApply"
                        :loading="rulesStore.triageApplyLoading"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <Check class="w-4 h-4 mr-1.5" />
                        <span>Confirm & Approve to Ledger</span>
                    </WfButton>
                </div>
            </template>
        </WfModal>
    </div>
</template>
