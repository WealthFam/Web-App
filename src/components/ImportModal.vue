<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useCurrency } from '@/composables/useCurrency'
import {
    FileDown, UploadCloud, FileText,
    Coins, CheckCircle2, Trash2, CheckCircle, Loader2
} from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfAlert from '@/components/ui/WfAlert.vue'

const { formatAmount } = useCurrency()

const props = defineProps<{
    isOpen: boolean
}>()

const emit = defineEmits(['close', 'import-success'])

const notify = useNotificationStore()

// State
const step = ref(1)
const loading = ref(false)
const accounts = ref<any[]>([])
const selectedAccount = ref('')
const file = ref<File | null>(null)

// Step Labels
const stepLabels = ['Account & File', 'Analysis', 'Mapping', 'Verification']

// Detail Fields
const detailFields = [
    { key: 'date', label: 'Date', icon: '📅', desc: 'Transaction date', optional: false },
    { key: 'description', label: 'Description', icon: '📝', desc: 'Payee or narration', optional: false },
    { key: 'reference', label: 'Reference', icon: '🆔', desc: 'Reference / UTR / Txn #', optional: true },
    { key: 'balance', label: 'Balance', icon: '💰', desc: 'Available balance after txn', optional: true },
    { key: 'credit_limit', label: 'Credit Limit', icon: '💳', desc: 'New credit limit if updated', optional: true },
] as const

// Step 2: Mapping
const mapping = ref({
    date: 'Date',
    description: 'Description',
    reference: '', // Optional
    balance: '', // Optional
    credit_limit: '', // Optional
    amount: 'Amount',
    mode: 'single' as 'single' | 'split'
})
const splitMapping = ref({
    debit: 'Debit',
    credit: 'Credit'
})
const csvHeaders = ref<string[]>([])
const detectedHeaderRow = ref(0)
const previewRows = ref<any[]>([])
const analyzing = ref(false)

// Step 3: Verification
const parsedTxns = ref<any[]>([])
const selectedTxns = ref<Set<number>>(new Set())

// Step 4: Results
const importResult = ref<any>(null)

async function fetchAccounts() {
    try {
        const res = await financeApi.getAccounts()
        accounts.value = res.data
    } catch (e) {
        notify.error("Failed to load accounts")
    }
}

const accountOptions = computed(() => accounts.value.map(a => ({
    title: `${a.icon || '🏦'} ${a.name} (${a.currency})`,
    value: a.id
})))

const headerOptions = computed(() => [
    { title: '-- Choose Column --', value: '' },
    ...csvHeaders.value.map(h => ({ title: h, value: h }))
])

// Watch open to load accounts
watch(() => props.isOpen, (val) => {
    if (val) {
        reset()
        fetchAccounts()
    }
})

// Watch account selection to load mapping
watch(selectedAccount, (newVal) => {
    if (newVal) {
        const acc = accounts.value.find(a => a.id === newVal)
        if (acc && acc.import_config) {
            try {
                const config = JSON.parse(acc.import_config)
                mapping.value = { ...mapping.value, ...config.mapping }
                splitMapping.value = { ...splitMapping.value, ...config.splitMapping }
                if (config.mode) mapping.value.mode = config.mode
                notify.info("Loaded saved mapping")
            } catch (e) {
                console.error("Failed to parse import config", e)
            }
        }
    }
})

async function handleFileUpload(event: any) {
    const target = event.target || event
    const uploadFile = target.files ? target.files[0] : (target[0] || target)

    if (uploadFile) {
        file.value = uploadFile
        analyzing.value = true

        try {
            const formData = new FormData()
            formData.append('file', file.value as File)

            const res = await financeApi.analyzeCsv(formData)
            const analysis = res.data

            csvHeaders.value = analysis.headers
            detectedHeaderRow.value = analysis.header_row_index
            previewRows.value = analysis.preview

            notify.success(`Detected headers on row ${analysis.header_row_index + 1}`)
            step.value = 2 // Auto-advance to preview

        } catch (e) {
            notify.error("Failed to analyze file. Please check format.")
            console.error(e)
        } finally {
            analyzing.value = false
        }
    }
}

async function parseFile() {
    if (!file.value) return notify.error("Please select a file")

    loading.value = true
    try {
        const formData = new FormData()
        formData.append('file', file.value)

        const mapPayload: any = {
            date: mapping.value.date,
            description: mapping.value.description,
            reference: mapping.value.reference,
            balance: mapping.value.balance,
            credit_limit: mapping.value.credit_limit
        }

        if (mapping.value.mode === 'single') {
            mapPayload.amount = mapping.value.amount
        } else {
            mapPayload.debit = splitMapping.value.debit
            mapPayload.credit = splitMapping.value.credit
        }

        formData.append('mapping', JSON.stringify(mapPayload))
        formData.append('header_row_index', String(detectedHeaderRow.value))

        const res = await financeApi.parseCsv(formData)
        parsedTxns.value = res.data
        selectedTxns.value = new Set(parsedTxns.value.map((_, i) => i))

        step.value = 4
    } catch (e: any) {
        notify.error(e.response?.data?.detail || "Failed to parse file")
    } finally {
        loading.value = false
    }
}

function removeTxn(index: number) {
    selectedTxns.value.delete(index)
}

function toggleSelection(index: number) {
    if (selectedTxns.value.has(index)) {
        selectedTxns.value.delete(index)
    } else {
        selectedTxns.value.add(index)
    }
}

function toggleAllVerify() {
    if (selectedTxns.value.size < parsedTxns.value.length) {
        selectedTxns.value = new Set(parsedTxns.value.map((_, i) => i))
    } else {
        selectedTxns.value.clear()
    }
}

async function importSelected() {
    loading.value = true
    try {
        const finalTxns = parsedTxns.value.filter((_, i) => selectedTxns.value.has(i))
        const source = file.value?.name.endsWith('.csv') ? 'CSV' : 'EXCEL'

        const res = await financeApi.importCsv({
            account_id: selectedAccount.value,
            transactions: finalTxns,
            source: source
        })

        // Save Mapping to Account
        const currentMapping = {
            mapping: {
                date: mapping.value.date,
                description: mapping.value.description,
                reference: mapping.value.reference,
                balance: mapping.value.balance,
                credit_limit: mapping.value.credit_limit,
                amount: mapping.value.amount,
                mode: mapping.value.mode
            },
            splitMapping: {
                debit: splitMapping.value.debit,
                credit: splitMapping.value.credit
            },
            mode: mapping.value.mode
        }

        try {
            await financeApi.updateAccount(selectedAccount.value, {
                import_config: JSON.stringify(currentMapping)
            })
        } catch (e) {
            console.error("Failed to save mapping preference", e)
        }

        importResult.value = res.data
        step.value = 5
        notify.success(`Imported ${res.data.imported} transactions`)
        emit('import-success')
    } catch (e: any) {
        notify.error("Import failed")
    } finally {
        loading.value = false
    }
}

function reset() {
    step.value = 1
    file.value = null
    parsedTxns.value = []
    importResult.value = null
    selectedAccount.value = ''
}

function close() {
    emit('close')
}
</script>

<template>
    <WfModal :model-value="isOpen" @update:model-value="close" max-width="xl">
        <template #header>
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-wf-lg bg-wf-primary/10 text-wf-primary border border-wf-primary/20 flex items-center justify-center shrink-0">
                    <FileDown :size="20" aria-hidden="true" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-wf-text-primary">Import Transactions</h3>
                    <p class="text-xs text-wf-text-muted">Upload and parse CSV / Excel bank statements</p>
                </div>
            </div>
        </template>

        <!-- Stepper Indicator -->
        <div class="flex items-center justify-between pb-4 mb-4 border-b border-wf-border overflow-x-auto">
            <div v-for="s in 4" :key="s" class="flex items-center gap-2 shrink-0">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                    :class="step >= s ? 'bg-wf-primary text-white' : 'bg-wf-surface-variant text-wf-text-muted border border-wf-border'">
                    {{ s }}
                </div>
                <span class="text-xs font-semibold whitespace-nowrap"
                    :class="step >= s ? 'text-wf-primary font-bold' : 'text-wf-text-muted'">
                    {{ stepLabels[s - 1] }}
                </span>
                <div v-if="s < 4" class="w-8 sm:w-12 h-0.5 mx-1"
                    :class="step > s ? 'bg-wf-primary' : 'bg-wf-border'"></div>
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-12" role="status">
            <Loader2 class="w-10 h-10 animate-spin text-wf-primary mb-3" aria-hidden="true" />
            <p class="text-sm font-semibold text-wf-text-primary">Processing transactions...</p>
        </div>

        <div v-else class="space-y-4 max-h-[64vh] overflow-y-auto pr-1">
            <!-- Step 1: Account & File Selection -->
            <div v-if="step === 1" class="space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <WfSelect v-model="selectedAccount" label="Select Target Account" required
                            placeholder="Which bank account is this for?" :items="accountOptions" />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-wf-text-secondary uppercase tracking-wider mb-1.5">
                            Upload CSV or Excel<span class="text-wf-error ml-0.5">*</span>
                        </label>
                        <label class="flex flex-col items-center justify-center p-4 border-2 border-dashed border-wf-border hover:border-wf-primary rounded-wf-lg bg-wf-surface cursor-pointer transition-colors group">
                            <UploadCloud :size="24" class="text-wf-primary group-hover:scale-110 transition-transform mb-1.5" />
                            <span class="text-xs font-semibold text-wf-text-primary">
                                {{ file ? file.name : 'Click to browse or drag file' }}
                            </span>
                            <span class="text-[10px] text-wf-text-muted mt-0.5">Supports .csv, .xlsx, .xls</span>
                            <input type="file" accept=".csv, .xlsx, .xls" class="hidden" @change="handleFileUpload" />
                        </label>
                    </div>
                </div>

                <WfAlert variant="info" title="Pro Tip">
                    Once you map statement columns for an account, WealthFam remembers them automatically for your next import!
                </WfAlert>
            </div>

            <!-- Step 2: File Analysis Preview -->
            <div v-else-if="step === 2" class="space-y-4">
                <div v-if="analyzing" class="flex flex-col items-center justify-center py-10" role="status">
                    <Loader2 class="w-8 h-8 animate-spin text-wf-primary mb-3" aria-hidden="true" />
                    <p class="text-xs font-semibold text-wf-text-muted">Analyzing file structure...</p>
                </div>
                <div v-else class="space-y-4">
                    <div class="p-3.5 rounded-wf-lg bg-wf-surface-variant border border-wf-border flex items-center gap-3">
                        <div class="text-xl">📊</div>
                        <div>
                            <h4 class="text-sm font-bold text-wf-text-primary">Review File Structure</h4>
                            <p class="text-xs text-wf-text-muted">
                                Detected <strong class="text-wf-text-primary">{{ csvHeaders.length }} columns</strong> starting at row
                                <span class="px-1.5 py-0.5 rounded font-mono font-bold bg-wf-primary/10 text-wf-primary">{{ detectedHeaderRow + 1 }}</span>.
                            </p>
                        </div>
                    </div>

                    <div v-if="previewRows.length > 0" class="border border-wf-border rounded-wf-lg overflow-x-auto">
                        <table class="w-full text-xs border-collapse">
                            <thead>
                                <tr class="bg-wf-surface-variant text-[10px] font-bold uppercase text-wf-text-muted tracking-wider">
                                    <th v-for="h in csvHeaders" :key="h" class="px-3 py-2 text-left whitespace-nowrap">{{ h }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(row, idx) in previewRows.slice(0, 3)" :key="idx" class="border-t border-wf-divider hover:bg-wf-surface-variant/40">
                                    <td v-for="h in csvHeaders" :key="h" class="px-3 py-2 text-wf-text-secondary whitespace-nowrap">{{ row[h] }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Step 3: Column Mapping -->
            <div v-else-if="step === 3" class="grid grid-cols-1 md:grid-cols-12 gap-4">
                <!-- Transaction Details Mapping -->
                <div class="md:col-span-7 p-4 rounded-wf-lg border border-wf-border bg-wf-surface space-y-3">
                    <div class="flex items-center gap-2 mb-2">
                        <FileText :size="16" class="text-wf-primary" />
                        <h4 class="text-xs font-bold uppercase tracking-wider text-wf-text-primary">Transaction Details</h4>
                    </div>

                    <div v-for="field in detailFields" :key="field.key" class="flex items-center justify-between gap-3 py-1.5 border-b border-wf-divider last:border-0">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-base">{{ field.icon }}</span>
                            <div class="min-w-0">
                                <div class="text-xs font-semibold text-wf-text-primary">{{ field.label }}</div>
                                <div class="text-[10px] text-wf-text-muted truncate">{{ field.desc }}</div>
                            </div>
                        </div>
                        <div class="w-48 shrink-0">
                            <WfSelect v-model="mapping[field.key]" size="sm" :items="headerOptions" />
                        </div>
                    </div>
                </div>

                <!-- Financials Mapping -->
                <div class="md:col-span-5 p-4 rounded-wf-lg border border-wf-border bg-wf-surface space-y-4">
                    <div class="flex items-center gap-2 mb-2">
                        <Coins :size="16" class="text-wf-success" />
                        <h4 class="text-xs font-bold uppercase tracking-wider text-wf-text-primary">Financials</h4>
                    </div>

                    <div class="grid grid-cols-2 gap-1 p-1 rounded-wf-md bg-wf-surface-variant border border-wf-border">
                        <button type="button" class="py-1 text-xs font-semibold rounded-wf-sm transition-colors"
                            :class="mapping.mode === 'single' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted'"
                            @click="mapping.mode = 'single'">Single Column</button>
                        <button type="button" class="py-1 text-xs font-semibold rounded-wf-sm transition-colors"
                            :class="mapping.mode === 'split' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted'"
                            @click="mapping.mode = 'split'">Debit/Credit Split</button>
                    </div>

                    <div v-if="mapping.mode === 'single'" class="space-y-1.5">
                        <label class="block text-xs font-semibold text-wf-text-secondary">Amount Column</label>
                        <WfSelect v-model="mapping.amount" size="sm" :items="headerOptions" />
                    </div>

                    <div v-else class="space-y-3">
                        <div class="space-y-1.5">
                            <label class="block text-xs font-semibold text-wf-text-secondary">Debit (Out) Column</label>
                            <WfSelect v-model="splitMapping.debit" size="sm" :items="headerOptions" />
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-xs font-semibold text-wf-text-secondary">Credit (In) Column</label>
                            <WfSelect v-model="splitMapping.credit" size="sm" :items="headerOptions" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 4: Final Verification -->
            <div v-else-if="step === 4" class="space-y-3">
                <div class="p-2.5 rounded-wf-lg bg-wf-primary/10 border border-wf-primary/20 flex items-center justify-between">
                    <span class="text-xs font-bold text-wf-primary flex items-center gap-1.5">
                        <CheckCircle2 :size="16" />
                        {{ selectedTxns.size }} of {{ parsedTxns.length }} transactions selected
                    </span>
                    <WfButton variant="ghost" size="sm" @click="toggleAllVerify">
                        {{ selectedTxns.size < parsedTxns.length ? 'Select All' : 'Deselect All' }}
                    </WfButton>
                </div>

                <div class="border border-wf-border rounded-wf-lg overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table class="w-full text-xs border-collapse">
                        <thead class="sticky top-0 bg-wf-surface-variant z-10">
                            <tr class="text-[10px] font-bold uppercase text-wf-text-muted tracking-wider border-b border-wf-border">
                                <th class="w-10 px-3 py-2 text-center">
                                    <input type="checkbox" :checked="selectedTxns.size === parsedTxns.length"
                                        class="accent-[var(--wf-color-primary)]" @change="toggleAllVerify" />
                                </th>
                                <th class="px-3 py-2 text-left">Date</th>
                                <th class="px-3 py-2 text-left">Ref #</th>
                                <th class="px-3 py-2 text-left">Recipient / Description</th>
                                <th class="px-3 py-2 text-right">Amount</th>
                                <th class="w-10 px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(txn, idx) in parsedTxns" :key="idx"
                                class="border-t border-wf-divider hover:bg-wf-surface-variant/40 transition-colors"
                                :class="{ 'opacity-40': !selectedTxns.has(idx) }">
                                <td class="px-3 py-2 text-center" @click.stop>
                                    <input type="checkbox" :checked="selectedTxns.has(idx)"
                                        class="accent-[var(--wf-color-primary)]" @change="toggleSelection(idx)" />
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap font-medium">{{ txn.date }}</td>
                                <td class="px-3 py-2 whitespace-nowrap font-mono text-wf-text-muted">{{ txn.external_id || txn.ref_id || '-' }}</td>
                                <td class="px-3 py-2 min-w-[200px]">
                                    <div class="font-bold text-wf-text-primary">{{ txn.recipient || '-' }}</div>
                                    <div class="text-[11px] text-wf-text-muted truncate max-w-xs">{{ txn.description }}</div>
                                </td>
                                <td class="px-3 py-2 text-right font-mono font-bold whitespace-nowrap"
                                    :class="txn.type === 'DEBIT' ? 'text-wf-error' : 'text-wf-success'">
                                    {{ formatAmount(txn.amount) }}
                                </td>
                                <td class="px-3 py-2 text-center">
                                    <button type="button" aria-label="Remove transaction"
                                        class="p-1 rounded text-wf-text-muted hover:text-wf-error" @click="removeTxn(idx)">
                                        <Trash2 :size="13" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Step 5: Success Results -->
            <div v-else-if="step === 5" class="py-8 text-center space-y-4">
                <div class="w-16 h-16 mx-auto rounded-full bg-wf-success/10 text-wf-success flex items-center justify-center">
                    <CheckCircle :size="36" />
                </div>
                <h3 class="text-lg font-bold text-wf-text-primary">Import Successful!</h3>
                <p class="text-sm text-wf-text-muted">
                    Successfully imported <strong class="text-wf-text-primary font-mono">{{ importResult?.imported }}</strong> transactions to your account.
                </p>

                <div v-if="importResult?.errors?.length > 0" class="max-w-md mx-auto text-left">
                    <WfAlert variant="warning" :title="`Errors Encountered (${importResult.errors.length})`">
                        <ul class="list-disc pl-4 text-xs space-y-1">
                            <li v-for="err in importResult.errors" :key="err">{{ err }}</li>
                        </ul>
                    </WfAlert>
                </div>
            </div>
        </div>

        <template #footer>
            <div v-if="step < 5" class="flex items-center justify-between w-full">
                <WfButton v-if="step > 1" variant="ghost" size="sm" @click="step--">
                    Back
                </WfButton>
                <WfButton v-else variant="ghost" size="sm" @click="close">
                    Cancel
                </WfButton>

                <div class="flex items-center gap-2">
                    <WfButton v-if="step === 1" size="sm" :disabled="!selectedAccount || !file" @click="step = 2">
                        Next: Preview File
                    </WfButton>

                    <WfButton v-if="step === 2" size="sm" @click="step = 3">
                        Yes, Looks Good
                    </WfButton>

                    <WfButton v-if="step === 3" size="sm" @click="parseFile">
                        Next: Verify List
                    </WfButton>

                    <WfButton v-if="step === 4" size="sm" :disabled="selectedTxns.size === 0" @click="importSelected">
                        Import {{ selectedTxns.size }} Transactions
                    </WfButton>
                </div>
            </div>
            <div v-else class="flex justify-end w-full">
                <WfButton size="sm" @click="close">Done &amp; Close</WfButton>
            </div>
        </template>
    </WfModal>
</template>
