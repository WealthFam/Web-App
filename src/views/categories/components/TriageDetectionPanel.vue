<template>
    <div class="animate-in">


        <!-- No Results State -->
        <div v-if="!rulesStore.triageScanResults && !rulesStore.triageScanLoading" class="text-center py-16">
            <v-avatar size="96" color="surface-variant" variant="tonal" class="mb-6 elevation-2 border">
                <Search :size="48" class="opacity-20" />
            </v-avatar>
            <h3 class="text-h5 font-weight-black mb-2">Ready to Scan</h3>
            <p class="text-subtitle-1 opacity-60 mb-4 font-weight-medium mx-auto" style="max-width: 400px">
                Click "Scan Triage Queue" to find pending transactions that match your classification rules.
            </p>
        </div>

        <!-- Scanning State -->
        <div v-if="rulesStore.triageScanLoading" class="text-center py-16">
            <v-progress-circular indeterminate color="primary" size="64" width="4" class="mb-6" />
            <h3 class="text-h5 font-weight-black mb-2">Scanning...</h3>
            <p class="text-caption font-weight-bold opacity-60">Running all rules against pending transactions</p>
        </div>

        <!-- Scan Results -->
        <div v-if="rulesStore.triageScanResults && !rulesStore.triageScanLoading">


            <!-- No Matches -->
            <div v-if="rulesStore.triageScanResults.rules_with_matches.length === 0" class="text-center py-12">
                <v-avatar size="80" color="success" variant="tonal" class="mb-4 elevation-2 border">
                    <Check :size="40" />
                </v-avatar>
                <h3 class="text-h6 font-weight-black mb-2">Triage Queue is Clean</h3>
                <p class="text-caption font-weight-bold opacity-60">No pending transactions match any of your rules.
                </p>
            </div>

            <!-- Results Table -->
            <v-card v-else class="premium-glass-card overflow-hidden border-thin elevation-2" rounded="xl">
                <v-data-table :headers="triageHeaders" :items="rulesStore.triageScanResults.rules_with_matches"
                    density="comfortable" class="premium-table" show-select v-model="selectedRuleIds"
                    item-value="rule_id" show-expand hide-default-footer>

                    <!-- Rule Name -->
                    <template v-slot:item.rule_name="{ item }">
                        <div class="d-flex align-center ga-2 py-2">
                            <v-avatar color="warning" variant="tonal" rounded="lg" size="32" class="elevation-1">
                                <FileText :size="16" />
                            </v-avatar>
                            <span class="font-weight-black">{{ item.rule_name }}</span>
                        </div>
                    </template>

                    <!-- Category -->
                    <template v-slot:item.category="{ item }">
                        <v-chip size="small" variant="flat" color="surface"
                            class="font-weight-black border elevation-1" label>
                            {{ item.category }}
                        </v-chip>
                    </template>

                    <!-- Match Count -->
                    <template v-slot:item.matching_count="{ item }">
                        <v-chip :color="item.matching_count > 5 ? 'warning' : 'success'" variant="flat" size="small"
                            class="font-weight-black elevation-1">
                            {{ item.matching_count }}
                        </v-chip>
                    </template>

                    <!-- Actions -->
                    <template v-slot:item.actions="{ item }">
                        <v-btn variant="tonal" color="primary" size="small" rounded="pill"
                            class="text-none font-weight-black" @click="openSingleConfirmation(item)"
                            :loading="rulesStore.triageApplyLoading">
                            <template v-slot:prepend>
                                <Zap :size="14" />
                            </template>
                            Apply
                        </v-btn>
                    </template>

                    <!-- Expanded Preview -->
                    <template v-slot:expanded-row="{ item }">
                        <tr>
                            <td :colspan="triageHeaders.length + 2" class="pa-0">
                                <div class="bg-surface-lighten-1 pa-4 border-t border-b border-opacity-10">
                                    <div class="text-tiny font-weight-black opacity-50 text-uppercase mb-3">
                                        Matched Transactions Preview (first {{ item.preview.length }})
                                    </div>
                                    <v-table density="compact" class="bg-transparent">
                                        <thead>
                                            <tr>
                                                <th class="text-tiny font-weight-black opacity-50 text-uppercase">
                                                    Description</th>
                                                <th class="text-tiny font-weight-black opacity-50 text-uppercase">Date
                                                </th>
                                                <th class="text-tiny font-weight-black opacity-50 text-uppercase text-right">
                                                    Amount</th>
                                                <th class="text-tiny font-weight-black opacity-50 text-uppercase">
                                                    Source</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="txn in item.preview" :key="txn.id">
                                                <td class="text-caption font-weight-bold">
                                                    {{ txn.description || txn.recipient || '—' }}
                                                </td>
                                                <td class="text-caption opacity-70">
                                                    {{ txn.date ? new Date(txn.date).toLocaleDateString() : '—' }}
                                                </td>
                                                <td class="text-caption font-weight-black text-right"
                                                    :class="(txn.amount || 0) < 0 ? 'text-error' : 'text-success'">
                                                    {{ (txn.amount || 0) < 0 ? '-' : '' }}₹{{ Math.abs(txn.amount ||
                                                        0).toLocaleString() }}
                                                </td>
                                                <td>
                                                    <v-chip size="x-small" variant="tonal" color="secondary"
                                                        class="font-weight-black">
                                                        {{ txn.source || 'SMS' }}
                                                    </v-chip>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </div>
                            </td>
                        </tr>
                    </template>
                </v-data-table>
            </v-card>
        </div>

        <!-- Floating Bottom Toolbar -->
        <div class="floating-bottom-bar">
            <v-card class="premium-glass-card border-thin elevation-24 px-6 py-3 d-flex align-center ga-4" rounded="pill">
                <div v-if="rulesStore.triageScanResults" class="d-flex align-center ga-4 mr-2">
                    <div class="d-flex flex-column">
                        <div class="text-tiny font-weight-black opacity-50 line-height-1 mb-1">SCAN STATUS</div>
                        <div class="text-subtitle-2 font-weight-black line-height-1">
                            {{ rulesStore.triageScanResults.total_matches }} Potential Approvals
                        </div>
                    </div>
                    <v-divider vertical class="mx-2 my-1" style="height: 24px;" />
                </div>

                <v-btn color="primary" variant="tonal" rounded="pill" class="text-none font-weight-black px-6"
                    :loading="rulesStore.triageScanLoading" @click="runScan" height="40">
                    <template v-slot:prepend>
                        <Search :size="14" />
                    </template>
                    Re-Scan Queue
                </v-btn>

                <v-btn v-if="selectedRuleIds.length > 0" color="success" rounded="pill"
                    class="text-none font-weight-black px-8 elevation-12 shadow-success" @click="openBatchConfirmation"
                    height="40">
                    <template v-slot:prepend>
                        <Zap :size="14" />
                    </template>
                    Approve Selected ({{ selectedMatchCount }})
                </v-btn>
            </v-card>
        </div>

        <!-- Confirmation Dialog with Paginated Transaction Table -->
        <v-dialog v-model="showConfirmDialog" max-width="700px" persistent>
            <v-card class="premium-glass-card no-hover overflow-hidden" rounded="xl" elevation="24">
                <v-card-title class="pa-5 border-b d-flex align-center bg-surface">
                    <div class="d-flex align-center ga-3 flex-grow-1">
                        <v-avatar color="warning" variant="tonal" rounded="lg" size="48" class="elevation-2 border">
                            <Zap :size="24" />
                        </v-avatar>
                        <div>
                            <div class="text-overline font-weight-black opacity-50 line-height-1 mb-1">
                                TRIAGE → LEDGER
                            </div>
                            <div class="text-h6 font-weight-black line-height-1">
                                Confirm Auto-Approval
                            </div>
                        </div>
                    </div>
                    <v-btn icon variant="text" size="small" @click="showConfirmDialog = false" color="medium-emphasis">
                        <X :size="20" />
                    </v-btn>
                </v-card-title>

                <v-card-text class="pa-5 overflow-y-auto custom-scrollbar" style="max-height: 60vh;">
                    <!-- Summary -->
                    <v-alert type="warning" variant="tonal" density="compact" class="mb-4 font-weight-bold"
                        rounded="lg">
                        <strong>{{ confirmationData.totalTransactions }}</strong> transactions across
                        <strong>{{ confirmationData.rules.length }}</strong> rules will be categorized and
                        <strong>moved to ledger</strong>.
                    </v-alert>

                    <!-- Rules Summary -->
                    <div class="mb-4">
                        <div class="text-tiny font-weight-black opacity-50 text-uppercase letter-spacing-1 mb-2">
                            Affected Rules
                        </div>
                        <div class="d-flex flex-wrap ga-2">
                            <v-chip v-for="rule in confirmationData.rules" :key="rule.rule_id" variant="flat"
                                color="surface" class="font-weight-black border elevation-1" label>
                                {{ rule.rule_name }}
                                <v-chip size="x-small" color="primary" variant="flat" class="ml-2 font-weight-black">
                                    {{ rule.matching_count }}
                                </v-chip>
                            </v-chip>
                        </div>
                    </div>

                    <!-- Paginated Transaction Preview Table -->
                    <div class="text-tiny font-weight-black opacity-50 text-uppercase letter-spacing-1 mb-2">
                        Transactions to Approve
                    </div>
                    <v-card variant="flat" rounded="lg" class="border-thin overflow-hidden">
                        <v-table density="compact">
                            <thead>
                                <tr class="bg-surface-lighten-1">
                                    <th class="text-tiny font-weight-black opacity-60 text-uppercase">Description</th>
                                    <th class="text-tiny font-weight-black opacity-60 text-uppercase">Rule</th>
                                    <th class="text-tiny font-weight-black opacity-60 text-uppercase">Date</th>
                                    <th class="text-tiny font-weight-black opacity-60 text-uppercase text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="txn in paginatedConfirmTxns" :key="txn.id">
                                    <td class="text-caption font-weight-bold" style="max-width: 200px;">
                                        <div class="truncate">{{ txn.description || txn.recipient || '—' }}</div>
                                    </td>
                                    <td>
                                        <v-chip size="x-small" variant="tonal" color="primary"
                                            class="font-weight-black">
                                            {{ txn._ruleName }}
                                        </v-chip>
                                    </td>
                                    <td class="text-caption opacity-70">
                                        {{ txn.date ? new Date(txn.date).toLocaleDateString() : '—' }}
                                    </td>
                                    <td class="text-caption font-weight-black text-right"
                                        :class="(txn.amount || 0) < 0 ? 'text-error' : 'text-success'">
                                        {{ (txn.amount || 0) < 0 ? '-' : '' }}₹{{ Math.abs(txn.amount ||
                                            0).toLocaleString() }}
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>

                        <!-- Confirmation Table Pagination -->
                        <v-divider class="border-opacity-10" />
                        <div class="d-flex align-center justify-end py-2 px-4">
                            <span class="text-caption text-medium-emphasis mr-4">
                                {{ (confirmPage - 1) * confirmPageSize + 1 }}-{{
                                    Math.min(confirmPage * confirmPageSize, allConfirmTxns.length) }}
                                of {{ allConfirmTxns.length }}
                            </span>
                            <v-btn icon variant="text" size="x-small" :disabled="confirmPage === 1"
                                @click="confirmPage--">
                                <ChevronLeft :size="16" />
                            </v-btn>
                            <v-btn icon variant="text" size="x-small"
                                :disabled="confirmPage * confirmPageSize >= allConfirmTxns.length"
                                @click="confirmPage++">
                                <ChevronRight :size="16" />
                            </v-btn>
                        </div>
                    </v-card>
                </v-card-text>

                <v-card-actions class="pa-5 bg-surface border-t">
                    <v-spacer />
                    <v-btn variant="text" @click="showConfirmDialog = false"
                        class="text-none px-6 font-weight-bold" rounded="pill">Cancel</v-btn>
                    <v-btn color="success" rounded="pill" class="text-none px-8 font-weight-black elevation-8"
                        @click="executeTriageApply" :loading="rulesStore.triageApplyLoading" height="44">
                        <template v-slot:prepend>
                            <Check :size="16" />
                        </template>
                        Confirm & Approve to Ledger
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
    Check, ChevronLeft, ChevronRight, FileText, Search, X, Zap
} from 'lucide-vue-next'
import { useRulesStore, type TriageScanResult } from '@/stores/finance/rules'

const rulesStore = useRulesStore()

onMounted(() => {
    // Note: Parent component now handles initial scan on mount
})

const selectedRuleIds = ref<string[]>([])
const showConfirmDialog = ref(false)
const confirmPage = ref(1)
const confirmPageSize = 10

const triageHeaders = [
    { title: 'Rule', key: 'rule_name', sortable: true },
    { title: 'Category', key: 'category', sortable: true },
    { title: 'Matches', key: 'matching_count', sortable: true, align: 'center' as const },
    { title: '', key: 'actions', sortable: false, align: 'center' as const, width: '120px' },
]

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

const selectedMatchCount = computed(() => {
    if (!rulesStore.triageScanResults) return 0
    return rulesStore.triageScanResults.rules_with_matches
        .filter(r => selectedRuleIds.value.includes(r.rule_id))
        .reduce((sum, r) => sum + r.matching_count, 0)
})

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
    let totalAffected = 0
    for (const rule of confirmationData.value.rules) {
        const result = await rulesStore.applyRuleToTriage(rule.rule_id)
        if (result) {
            totalAffected += result.affected || 0
        }
    }

    showConfirmDialog.value = false
    selectedRuleIds.value = []

    // Refresh scan results and stats
    await rulesStore.scanAllTriage()
    await rulesStore.fetchRuleStats()
}

// Accept pre-selected rule from parent
defineExpose({
    runScanForRule: async (ruleId: string) => {
        await rulesStore.scanAllTriage()
        // Auto-select the specific rule
        if (rulesStore.triageScanResults) {
            const match = rulesStore.triageScanResults.rules_with_matches.find(r => r.rule_id === ruleId)
            if (match) {
                selectedRuleIds.value = [ruleId]
            }
        }
    }
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

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.text-tiny {
    font-size: 0.65rem !important;
    letter-spacing: 0.5px;
}

.floating-bottom-bar {
    position: fixed;
    bottom: 32px;
    left: calc(50% + 128px); /* Offset for the sidebar if applicable, or just centered */
    transform: translateX(-50%);
    z-index: 100;
    pointer-events: none;
}

.floating-bottom-bar > * {
    pointer-events: auto;
}

.shadow-success {
    box-shadow: 0 4px 20px rgba(var(--v-theme-success), 0.4) !important;
}
</style>
