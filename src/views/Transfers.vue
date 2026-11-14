<template>
    <div class="transfers-view">
        <v-container fluid class="pa-6 pa-md-8 max-width-1400">
            <!-- Header Section -->
            <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center mb-6 gap-4">
                <div>
                    <div class="d-flex align-center gap-3">
                        <v-avatar color="primary" variant="tonal" size="48" rounded="lg">
                            <ArrowLeftRight :size="24" class="text-primary" />
                        </v-avatar>
                        <div>
                            <h1 class="text-h4 font-weight-black text-content letter-spacing-tight mb-1">
                                Cross-Account Transfers
                            </h1>
                            <p class="text-subtitle-2 text-medium-emphasis mb-0 font-weight-bold">
                                Auto-detect money moved between bank accounts, credit card payments, loans, and family members.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="d-flex align-center gap-3">
                    <v-btn variant="outlined" rounded="pill" height="42" class="px-4 font-weight-bold"
                        :loading="isScanning" @click="triggerScan">
                        <RefreshCw :size="16" class="mr-2" :class="{ 'spin-animation': isScanning }" />
                        Scan Ledger
                    </v-btn>
                    <v-btn v-if="highConfidencePairs.length > 0" color="primary" variant="flat" rounded="pill" height="42"
                        class="px-5 font-weight-black shadow-primary" :loading="isBatchPairing" @click="approveAllHighConfidence">
                        <CheckCheck :size="18" class="mr-2" />
                        Approve {{ highConfidencePairs.length }} High-Confidence Pairs
                    </v-btn>
                </div>
            </div>

            <!-- KPI Row -->
            <v-row class="mb-6">
                <v-col cols="12" sm="6" lg="3">
                    <v-card class="premium-glass-card pa-5 h-100" elevation="0">
                        <div class="d-flex justify-space-between align-center mb-2">
                            <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Detected Pairs</span>
                            <Sparkles :size="18" class="text-primary opacity-70" />
                        </div>
                        <div class="text-h4 font-weight-black text-primary">{{ candidates.paired_candidates?.length || 0 }}</div>
                        <div class="text-caption font-weight-bold text-medium-emphasis mt-1">
                            {{ highConfidencePairs.length }} high confidence matches
                        </div>
                    </v-card>
                </v-col>

                <v-col cols="12" sm="6" lg="3">
                    <v-card class="premium-glass-card pa-5 h-100" elevation="0">
                        <div class="d-flex justify-space-between align-center mb-2">
                            <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Unpaired Outflows</span>
                            <AlertCircle :size="18" class="text-warning opacity-70" />
                        </div>
                        <div class="text-h4 font-weight-black text-warning">{{ candidates.unpaired_candidates?.length || 0 }}</div>
                        <div class="text-caption font-weight-bold text-medium-emphasis mt-1">
                            Missing counterpart credits
                        </div>
                    </v-card>
                </v-col>

                <v-col cols="12" sm="6" lg="3">
                    <v-card class="premium-glass-card pa-5 h-100" elevation="0">
                        <div class="d-flex justify-space-between align-center mb-2">
                            <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Active Paired Transfers</span>
                            <CheckCircle2 :size="18" class="text-success opacity-70" />
                        </div>
                        <div class="text-h4 font-weight-black text-success">{{ transferHistory.total || 0 }}</div>
                        <div class="text-caption font-weight-bold text-medium-emphasis mt-1">
                            Excluded from duplicate expenses
                        </div>
                    </v-card>
                </v-col>

                <v-col cols="12" sm="6" lg="3">
                    <v-card class="premium-glass-card pa-5 h-100" elevation="0">
                        <div class="d-flex justify-space-between align-center mb-2">
                            <span class="text-caption font-weight-bold text-medium-emphasis text-uppercase">Scan Coverage</span>
                            <Clock :size="18" class="text-info opacity-70" />
                        </div>
                        <div class="text-h4 font-weight-black text-content">Last 90 Days</div>
                        <div class="text-caption font-weight-bold text-medium-emphasis mt-1">
                            {{ formatTimestamp(candidates.scan_timestamp) }}
                        </div>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Navigation Tabs -->
            <v-tabs v-model="activeTab" color="primary" class="mb-6 font-weight-black" density="comfortable">
                <v-tab value="suggestions" class="text-capitalize">
                    <Sparkles :size="16" class="mr-2" />
                    Detected Pairs
                    <v-chip v-if="candidates.paired_candidates?.length" size="x-small" color="primary" class="ml-2 font-weight-black">
                        {{ candidates.paired_candidates.length }}
                    </v-chip>
                </v-tab>
                <v-tab value="unpaired" class="text-capitalize">
                    <HelpCircle :size="16" class="mr-2" />
                    Unpaired Outflows
                    <v-chip v-if="candidates.unpaired_candidates?.length" size="x-small" color="warning" class="ml-2 font-weight-black">
                        {{ candidates.unpaired_candidates.length }}
                    </v-chip>
                </v-tab>
                <v-tab value="history" class="text-capitalize">
                    <History :size="16" class="mr-2" />
                    Transfers History
                </v-tab>
            </v-tabs>

            <!-- Tab 1: Detected Pairs -->
            <div v-if="activeTab === 'suggestions'">
                <!-- Empty State -->
                <div v-if="!isScanning && (!candidates.paired_candidates || candidates.paired_candidates.length === 0)"
                    class="premium-glass-card text-center py-16 px-8 mx-auto" style="max-width: 600px;">
                    <v-avatar color="success" variant="tonal" size="72" class="mb-4">
                        <CheckCircle2 :size="36" class="text-success" />
                    </v-avatar>
                    <h3 class="text-h5 font-weight-black mb-1">All Caught Up!</h3>
                    <p class="text-subtitle-2 text-medium-emphasis mb-6">
                        No unlinked cross-account transfers found in the last 90 days. All detected movements are paired.
                    </p>
                    <v-btn variant="outlined" rounded="pill" @click="triggerScan" :loading="isScanning">
                        <RefreshCw :size="14" class="mr-2" />
                        Re-scan Transactions
                    </v-btn>
                </div>

                <!-- Pairs List -->
                <div v-else class="d-flex flex-column gap-4">
                    <v-card v-for="pair in candidates.paired_candidates" :key="pair.id"
                        class="premium-glass-card pair-card pa-5" elevation="0">
                        <div class="d-flex flex-column flex-md-row justify-space-between align-stretch align-md-center gap-4">
                            <!-- Source Leg (Debit) -->
                            <div class="leg-box flex-grow-1 pa-4 rounded-xl">
                                <div class="d-flex justify-space-between align-center mb-2">
                                    <div class="d-flex align-center gap-2">
                                        <v-chip size="x-small" :color="getTypeColor(pair.source_transaction.account_type)" variant="flat" class="font-weight-black">
                                            {{ pair.source_transaction.account_type }}
                                        </v-chip>
                                        <span class="text-subtitle-2 font-weight-black text-content">{{ pair.source_transaction.account_name }}</span>
                                        <span v-if="pair.source_transaction.account_mask" class="text-caption font-mono opacity-60">
                                            *{{ pair.source_transaction.account_mask.slice(-4) }}
                                        </span>
                                    </div>
                                    <span class="text-caption text-medium-emphasis font-weight-bold">{{ formatDate(pair.source_transaction.date) }}</span>
                                </div>
                                <div class="text-h5 font-weight-black text-error mb-1">
                                    - {{ formatAmount(pair.source_transaction.amount) }}
                                </div>
                                <div class="text-caption text-medium-emphasis line-clamp-1">
                                    {{ pair.source_transaction.description || pair.source_transaction.recipient || 'Outflow' }}
                                </div>
                            </div>

                            <!-- Middle Indicator / Match Reasons -->
                            <div class="d-flex flex-column align-center justify-center text-center px-4" style="min-width: 220px;">
                                <div class="d-flex align-center gap-2 mb-2">
                                    <v-chip size="small" :color="getConfidenceColor(pair.confidence)" variant="flat" class="font-weight-black">
                                        {{ pair.confidence }}% Match
                                    </v-chip>
                                    <v-chip v-if="pair.amount_difference > 0" size="x-small" color="info" variant="tonal" class="font-weight-bold">
                                        ₹{{ pair.amount_difference.toFixed(2) }} Diff
                                    </v-chip>
                                </div>
                                <div class="d-flex align-center gap-2 text-primary mb-2">
                                    <v-divider class="flex-grow-1" />
                                    <ArrowLeftRight :size="20" />
                                    <v-divider class="flex-grow-1" />
                                </div>
                                <div class="text-tiny font-weight-bold text-medium-emphasis">
                                    {{ pair.reason }}
                                </div>
                            </div>

                            <!-- Destination Leg (Credit) -->
                            <div class="leg-box flex-grow-1 pa-4 rounded-xl">
                                <div class="d-flex justify-space-between align-center mb-2">
                                    <div class="d-flex align-center gap-2">
                                        <v-chip size="x-small" :color="getTypeColor(pair.destination_transaction.account_type)" variant="flat" class="font-weight-black">
                                            {{ pair.destination_transaction.account_type }}
                                        </v-chip>
                                        <span class="text-subtitle-2 font-weight-black text-content">{{ pair.destination_transaction.account_name }}</span>
                                        <span v-if="pair.destination_transaction.account_mask" class="text-caption font-mono opacity-60">
                                            *{{ pair.destination_transaction.account_mask.slice(-4) }}
                                        </span>
                                    </div>
                                    <span class="text-caption text-medium-emphasis font-weight-bold">{{ formatDate(pair.destination_transaction.date) }}</span>
                                </div>
                                <div class="text-h5 font-weight-black text-success mb-1">
                                    + {{ formatAmount(pair.destination_transaction.amount) }}
                                </div>
                                <div class="text-caption text-medium-emphasis line-clamp-1">
                                    {{ pair.destination_transaction.description || pair.destination_transaction.recipient || 'Inflow' }}
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="d-flex flex-md-column justify-center gap-2">
                                <v-btn color="primary" variant="flat" rounded="pill" height="40" class="px-5 font-weight-black"
                                    :loading="pairingId === pair.id" @click="pairSingle(pair)">
                                    <Check :size="16" class="mr-1" />
                                    Link Pair
                                </v-btn>
                                <v-btn variant="text" size="small" rounded="pill" color="medium-emphasis" class="font-weight-bold"
                                    @click="dismissPair(pair.id)">
                                    Dismiss
                                </v-btn>
                            </div>
                        </div>
                    </v-card>
                </div>
            </div>

            <!-- Tab 2: Unpaired Outflows -->
            <div v-else-if="activeTab === 'unpaired'">
                <div v-if="!candidates.unpaired_candidates || candidates.unpaired_candidates.length === 0"
                    class="premium-glass-card text-center py-16 px-8 mx-auto" style="max-width: 600px;">
                    <v-avatar color="success" variant="tonal" size="72" class="mb-4">
                        <CheckCircle2 :size="36" class="text-success" />
                    </v-avatar>
                    <h3 class="text-h5 font-weight-black mb-1">No Unpaired Outflows</h3>
                    <p class="text-subtitle-2 text-medium-emphasis mb-0">
                        All transactions mentioning internal accounts have either been linked or confirmed.
                    </p>
                </div>

                <div v-else class="d-flex flex-column gap-4">
                    <v-card v-for="item in candidates.unpaired_candidates" :key="item.transaction.id"
                        class="premium-glass-card pa-5" elevation="0">
                        <div class="d-flex flex-column flex-md-row justify-space-between align-stretch align-md-center gap-4">
                            <div>
                                <div class="d-flex align-center gap-2 mb-2">
                                    <v-chip size="x-small" color="primary" variant="flat" class="font-weight-black">
                                        {{ item.transaction.account_name }}
                                    </v-chip>
                                    <span class="text-caption font-weight-bold text-medium-emphasis">{{ formatDate(item.transaction.date) }}</span>
                                    <v-chip size="x-small" color="warning" variant="tonal" class="font-weight-bold">
                                        {{ item.reason }}
                                    </v-chip>
                                </div>
                                <div class="text-h5 font-weight-black text-error mb-1">
                                    - {{ formatAmount(item.transaction.amount) }}
                                </div>
                                <div class="text-body-2 font-weight-bold text-content">
                                    {{ item.transaction.description }}
                                </div>
                            </div>

                            <div class="d-flex flex-column flex-md-row align-start align-md-center gap-3">
                                <div class="text-caption font-weight-bold text-medium-emphasis">
                                    Suggested Destination: <strong>{{ item.suggested_destination.name }}</strong>
                                </div>
                                <v-btn color="primary" variant="flat" rounded="pill" height="40" class="px-5 font-weight-black"
                                    :loading="creatingCounterpartId === item.transaction.id"
                                    @click="openCreateCounterpartModal(item)">
                                    <PlusCircle :size="16" class="mr-1" />
                                    Create Counterpart & Link
                                </v-btn>
                            </div>
                        </div>
                    </v-card>
                </div>
            </div>

            <!-- Tab 3: History -->
            <div v-else-if="activeTab === 'history'">
                <div v-if="transferHistory.items.length === 0"
                    class="premium-glass-card text-center py-16 px-8 mx-auto" style="max-width: 600px;">
                    <p class="text-subtitle-1 font-weight-bold text-medium-emphasis mb-0">No active transfers recorded yet.</p>
                </div>

                <div v-else class="d-flex flex-column gap-3">
                    <v-card v-for="item in transferHistory.items" :key="item.source_id"
                        class="premium-glass-card pa-4" elevation="0">
                        <div class="d-flex justify-space-between align-center">
                            <div class="d-flex align-center gap-4">
                                <v-avatar color="primary" variant="tonal" size="40">
                                    <ArrowLeftRight :size="18" class="text-primary" />
                                </v-avatar>
                                <div>
                                    <div class="d-flex align-center gap-2 mb-1">
                                        <span class="text-subtitle-2 font-weight-black text-content">{{ item.source_account_name }}</span>
                                        <ArrowRight :size="14" class="text-medium-emphasis" />
                                        <span class="text-subtitle-2 font-weight-black text-content">{{ item.partner_account_name }}</span>
                                    </div>
                                    <div class="text-caption text-medium-emphasis font-weight-bold">
                                        {{ formatDate(item.date) }} · {{ item.description }}
                                    </div>
                                </div>
                            </div>

                            <div class="d-flex align-center gap-4">
                                <div class="text-h6 font-weight-black text-primary">
                                    {{ formatAmount(item.amount) }}
                                </div>
                                <v-btn variant="text" size="small" color="error" rounded="pill" class="font-weight-bold"
                                    :loading="unpairingId === item.source_id" @click="unpair(item.source_id)">
                                    Unlink
                                </v-btn>
                            </div>
                        </div>
                    </v-card>
                </div>
            </div>

            <!-- Create Counterpart Modal -->
            <v-dialog v-model="counterpartModal" max-width="480">
                <v-card class="premium-glass-card pa-6" elevation="24">
                    <div class="d-flex align-center gap-3 mb-4">
                        <v-avatar color="primary" variant="tonal" size="44">
                            <PlusCircle :size="22" class="text-primary" />
                        </v-avatar>
                        <div>
                            <h3 class="text-h6 font-weight-black mb-0">Create Counterpart Leg</h3>
                            <p class="text-caption text-medium-emphasis mb-0">Credit destination account to balance ledger</p>
                        </div>
                    </div>

                    <div v-if="selectedUnpaired" class="mb-4 pa-4 rounded-lg bg-surface-variant">
                        <div class="text-caption font-weight-bold text-medium-emphasis mb-1">Outflow from {{ selectedUnpaired.transaction.account_name }}</div>
                        <div class="text-h5 font-weight-black text-error mb-1">- {{ formatAmount(selectedUnpaired.transaction.amount) }}</div>
                        <div class="text-caption">{{ selectedUnpaired.transaction.description }}</div>
                    </div>

                    <v-form @submit.prevent="submitCreateCounterpart">
                        <v-text-field v-model="counterpartForm.credited_amount" label="Credited Amount (₹)" type="number" step="any"
                            variant="outlined" rounded="lg" class="mb-3 font-weight-bold"
                            hint="Adjust if offer or discount applied (e.g. ₹9,900 paid from bank, ₹10,000 credited on card)" persistent-hint />

                        <div class="d-flex justify-end gap-2 mt-4">
                            <v-btn variant="text" rounded="pill" @click="counterpartModal = false">Cancel</v-btn>
                            <v-btn color="primary" variant="flat" rounded="pill" type="submit" :loading="isCreatingCounterpart" class="font-weight-black">
                                Create & Link
                            </v-btn>
                        </div>
                    </v-form>
                </v-card>
            </v-dialog>
        </v-container>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
    ArrowLeftRight,
    ArrowRight,
    Sparkles,
    CheckCheck,
    CheckCircle2,
    Check,
    AlertCircle,
    Clock,
    RefreshCw,
    HelpCircle,
    History,
    PlusCircle
} from 'lucide-vue-next'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useCurrency } from '@/composables/useCurrency'

const notification = useNotificationStore()
const { formatAmount } = useCurrency()

const activeTab = ref('suggestions')
const isScanning = ref(false)
const isBatchPairing = ref(false)
const pairingId = ref<string | null>(null)
const unpairingId = ref<string | null>(null)
const creatingCounterpartId = ref<string | null>(null)

const candidates = ref<{
    paired_candidates?: any[]
    paired_count?: number
    unpaired_candidates?: any[]
    unpaired_count?: number
    scan_timestamp?: string
}>({})

const transferHistory = ref<{
    items: any[]
    total: number
}>({ items: [], total: 0 })

const highConfidencePairs = computed(() => {
    return (candidates.value.paired_candidates || []).filter(p => p.confidence >= 85)
})

const counterpartModal = ref(false)
const selectedUnpaired = ref<any>(null)
const isCreatingCounterpart = ref(false)
const counterpartForm = ref({
    credited_amount: 0
})

function formatDate(iso?: string) {
    if (!iso) return 'N/A'
    try {
        const d = new Date(iso)
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
        return iso
    }
}

function formatTimestamp(iso?: string) {
    if (!iso) return 'Never'
    try {
        const d = new Date(iso)
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return iso
    }
}

function getTypeColor(type?: string) {
    switch ((type || '').toUpperCase()) {
        case 'BANK': return 'primary'
        case 'CREDIT_CARD': return 'error'
        case 'LOAN': return 'warning'
        case 'WALLET': return 'info'
        default: return 'secondary'
    }
}

function getConfidenceColor(conf: number) {
    if (conf >= 85) return 'success'
    if (conf >= 75) return 'primary'
    return 'warning'
}

async function triggerScan() {
    isScanning.value = true
    try {
        const res = await financeApi.scanTransfers(90)
        candidates.value = res.data || {}
        notification.success(`Scan complete: found ${candidates.value.paired_candidates?.length || 0} suggested pairs`)
    } catch (e) {
        console.error('Scan failed', e)
        notification.error('Failed to scan for transfers')
    } finally {
        isScanning.value = false
    }
}

async function fetchCandidates() {
    isScanning.value = true
    try {
        const res = await financeApi.getTransferCandidates(90)
        candidates.value = res.data || {}
    } catch (e) {
        console.error('Failed to load transfer candidates', e)
    } finally {
        isScanning.value = false
    }
}

async function fetchHistory() {
    try {
        const res = await financeApi.getTransferHistory({ limit: 50, offset: 0 })
        transferHistory.value = res.data || { items: [], total: 0 }
    } catch (e) {
        console.error('Failed to load transfer history', e)
    }
}

async function pairSingle(pair: any) {
    pairingId.value = pair.id
    try {
        await financeApi.pairTransfer({
            source_txn_id: pair.source_transaction.id,
            target_txn_id: pair.destination_transaction.id,
            notes: pair.reason
        })
        notification.success('Transfers successfully paired!')
        // Remove from list
        candidates.value.paired_candidates = (candidates.value.paired_candidates || []).filter(p => p.id !== pair.id)
        fetchHistory()
    } catch (e: any) {
        console.error('Pairing failed', e)
        notification.error(e.response?.data?.detail || 'Failed to link pair')
    } finally {
        pairingId.value = null
    }
}

async function approveAllHighConfidence() {
    isBatchPairing.value = true
    const pairsToLink = highConfidencePairs.value.map(p => ({
        source_txn_id: p.source_transaction.id,
        target_txn_id: p.destination_transaction.id
    }))

    try {
        const res = await financeApi.batchPairTransfers(pairsToLink)
        notification.success(`Paired ${res.data.paired_count} transfers successfully!`)
        await fetchCandidates()
        await fetchHistory()
    } catch (e) {
        console.error('Batch pairing failed', e)
        notification.error('Failed to batch pair transfers')
    } finally {
        isBatchPairing.value = false
    }
}

function dismissPair(pairId: string) {
    candidates.value.paired_candidates = (candidates.value.paired_candidates || []).filter(p => p.id !== pairId)
    notification.info('Suggestion dismissed')
}

function openCreateCounterpartModal(unpaired: any) {
    selectedUnpaired.value = unpaired
    counterpartForm.value.credited_amount = Number(unpaired.transaction.amount || 0)
    counterpartModal.value = true
}

async function submitCreateCounterpart() {
    if (!selectedUnpaired.value) return
    isCreatingCounterpart.value = true
    try {
        await financeApi.createTransferCounterpart({
            source_txn_id: selectedUnpaired.value.transaction.id,
            to_account_id: selectedUnpaired.value.suggested_destination.id,
            credited_amount: Number(counterpartForm.value.credited_amount)
        })
        notification.success('Counterpart created and linked!')
        counterpartModal.value = false
        candidates.value.unpaired_candidates = (candidates.value.unpaired_candidates || []).filter(
            u => u.transaction.id !== selectedUnpaired.value.transaction.id
        )
        fetchHistory()
    } catch (e: any) {
        console.error('Failed to create counterpart', e)
        notification.error(e.response?.data?.detail || 'Failed to create counterpart')
    } finally {
        isCreatingCounterpart.value = false
    }
}

async function unpair(txnId: string) {
    unpairingId.value = txnId
    try {
        await financeApi.unpairTransfer(txnId)
        notification.success('Transfer unlinked')
        await fetchHistory()
        await fetchCandidates()
    } catch (e) {
        console.error('Failed to unlink transfer', e)
        notification.error('Failed to unlink transfer')
    } finally {
        unpairingId.value = null
    }
}

onMounted(() => {
    fetchCandidates()
    fetchHistory()
})
</script>

<style scoped>
.leg-box {
    background: rgba(var(--v-theme-surface-variant), 0.25);
    border: 1px solid rgba(var(--v-theme-outline), 0.15);
}

.pair-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pair-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.spin-animation {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    100% {
        transform: rotate(360deg);
    }
}
</style>
