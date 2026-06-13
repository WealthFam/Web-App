<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useCurrency } from '@/composables/useCurrency'
import {
    FileDown, UploadCloud, Lightbulb, FileText,
    Coins, CheckCircle2, Trash2, CheckCircle, Loader2
} from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

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

const accountOptionsFlat = computed(() => accounts.value.map(a => ({
    label: `${a.icon || '🏦'} ${a.name} (${a.currency})`,
    value: a.id
})))

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
                // Restore mode if saved
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
            reference: mapping.value.reference === 'none' ? '' : mapping.value.reference,
            balance: mapping.value.balance === 'none' ? '' : mapping.value.balance,
            credit_limit: mapping.value.credit_limit === 'none' ? '' : mapping.value.credit_limit
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
    <Dialog :open="isOpen" @update:open="close">
        <DialogContent class="sm:max-w-[1100px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl flex flex-col max-h-[90vh]">
            <!-- Header -->
            <div class="bg-gradient-to-br from-primary to-indigo-600 p-4 text-white flex items-center justify-between shadow-md">
                <div class="flex items-center gap-3">
                    <FileDown class="h-6 w-6 text-white animate-pulse" />
                    <h2 class="text-lg font-black text-white m-0">Import Transactions</h2>
                </div>
            </div>

            <!-- Stepper Progress Indicator -->
            <div v-if="step < 5" class="flex items-center justify-center gap-2 md:gap-4 p-4 border-b bg-card overflow-x-auto">
                <div v-for="s in 4" :key="s" class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0"
                         :class="step >= s ? 'bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10' : 'bg-muted text-muted-foreground'">
                        {{ s }}
                    </div>
                    <span class="text-xs font-black transition-all whitespace-nowrap"
                          :class="step >= s ? 'text-primary' : 'text-muted-foreground/60'">
                        {{ stepLabels[s - 1] }}
                    </span>
                    <div v-if="s < 4" class="h-0.5 w-6 md:w-8 rounded-full transition-all shrink-0"
                         :class="step > s ? 'bg-primary' : 'bg-muted'">
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-6 bg-muted/10 min-h-[300px]">
                <div v-if="loading" class="flex flex-col items-center justify-center py-12">
                    <Loader2 class="h-12 w-12 text-primary animate-spin" />
                    <p class="mt-4 text-base font-bold text-muted-foreground animate-pulse">Processing transactions...</p>
                </div>

                <div v-else class="space-y-6">
                    <!-- Step 1: Account & File Selection -->
                    <div v-if="step === 1" class="space-y-6 animate-in fade-in">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-2">
                                <label class="text-sm font-bold block">Select Target Account</label>
                                <Select v-model="selectedAccount">
                                    <SelectTrigger class="w-full h-10 rounded-xl">
                                        <SelectValue placeholder="Which bank account is this for?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="opt in accountOptionsFlat" :key="opt.value" :value="opt.value">
                                            {{ opt.label }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div class="space-y-2">
                                <label class="text-sm font-bold block">Upload CSV or Excel</label>
                                <div class="border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-card transition-all hover:bg-primary/5 relative">
                                    <input type="file" @change="handleFileUpload" accept=".csv, .xlsx, .xls" class="absolute inset-0 opacity-0 cursor-pointer" />
                                    <UploadCloud class="h-8 w-8 text-primary mb-2 animate-bounce" />
                                    <span class="text-xs font-bold text-center text-foreground max-w-xs truncate">
                                        {{ file ? file.name : "Drag and drop or click to browse" }}
                                    </span>
                                    <span class="text-[10px] text-muted-foreground mt-1">Accepts .csv, .xlsx, .xls</span>
                                </div>
                            </div>
                        </div>

                        <Alert class="mt-10 rounded-xl p-6 border shadow-sm flex gap-4 bg-primary/5 border-primary/10 text-foreground">
                            <Lightbulb class="h-8 w-8 text-primary shrink-0 mt-0.5" />
                            <div>
                                <AlertTitle class="font-black text-base mb-1">Pro Tip</AlertTitle>
                                <AlertDescription class="text-sm text-muted-foreground">
                                    Once you map your statement columns for an account, we'll remember them for your next import! Saving you time and clicks.
                                </AlertDescription>
                            </div>
                        </Alert>
                    </div>

                    <!-- Step 2: File Analysis Preview -->
                    <div v-else-if="step === 2" class="space-y-6 animate-in fade-in">
                        <div v-if="analyzing" class="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 class="h-10 w-10 text-primary animate-spin" />
                            <p class="mt-4 font-bold opacity-70">Analyzing file structure...</p>
                        </div>

                        <div v-else class="space-y-6">
                            <div class="bg-card border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                                <div class="text-3xl">👀</div>
                                <div>
                                    <h3 class="text-base font-black">Review File Structure</h3>
                                    <p class="text-sm text-muted-foreground mt-0.5">
                                        We found <strong class="text-foreground font-extrabold">{{ csvHeaders.length }} columns</strong> starting at row
                                        <Badge class="font-extrabold mx-1">{{ detectedHeaderRow + 1 }}</Badge>.
                                    </p>
                                </div>
                            </div>

                            <div v-if="previewRows.length > 0" class="relative overflow-x-auto border rounded-xl bg-card max-h-[300px]">
                                <table class="w-full text-sm text-left">
                                    <thead class="text-[10px] font-black text-muted-foreground uppercase bg-muted/50 border-b sticky top-0 z-10">
                                        <tr>
                                            <th v-for="h in csvHeaders" :key="h" class="p-3">
                                                {{ h }}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-border/40">
                                        <tr v-for="(row, idx) in previewRows.slice(0, 3)" :key="idx" class="hover:bg-muted/10">
                                            <td v-for="h in csvHeaders" :key="h" class="p-3 text-xs text-muted-foreground/90 font-mono">
                                                {{ row[h] }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Step 3: Column Mapping -->
                    <div v-else-if="step === 3" class="space-y-6 animate-in fade-in">
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <!-- Transaction Details Mapping -->
                            <div class="col-span-12 md:col-span-7 rounded-xl border bg-card p-4 shadow-sm flex flex-col">
                                <h4 class="text-base font-black mb-6 flex items-center gap-2">
                                    <FileText class="h-5 w-5 text-primary" />
                                    Transaction Details
                                </h4>

                                <div class="space-y-4 flex-grow">
                                    <div v-for="field in detailFields" :key="field.key"
                                        class="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0 gap-4">
                                        <div class="flex items-center gap-3 min-w-0 flex-1">
                                            <div class="w-9 h-9 flex items-center justify-center bg-muted rounded-lg text-lg shrink-0">
                                                {{ field.icon }}
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="text-xs font-bold">{{ field.label }}</div>
                                                <div class="text-[10px] text-muted-foreground truncate" :title="field.desc">{{ field.desc }}</div>
                                            </div>
                                        </div>
                                        
                                        <div class="flex items-center gap-2 shrink-0">
                                            <span class="text-muted-foreground/30 text-xs">→</span>
                                            <Select v-model="(mapping as any)[field.key]">
                                                <SelectTrigger class="w-[180px] h-9 text-xs">
                                                    <SelectValue placeholder="Choose column..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem v-if="field.optional" value="none">-- No Column --</SelectItem>
                                                    <SelectItem v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Financials Mapping -->
                            <div class="col-span-12 md:col-span-5 rounded-xl border bg-card p-4 shadow-sm flex flex-col">
                                <h4 class="text-base font-black mb-4 flex items-center gap-2">
                                    <Coins class="h-5 w-5 text-emerald-500" />
                                    Financials
                                </h4>

                                <div class="flex bg-muted p-1 rounded-lg w-full mb-6 shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        class="flex-grow text-xs font-bold rounded-md transition-all h-8"
                                        :class="mapping.mode === 'single' ? 'bg-background shadow-sm' : 'text-muted-foreground'"
                                        @click="mapping.mode = 'single'"
                                    >
                                        Single Column
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        class="flex-grow text-xs font-bold rounded-md transition-all h-8"
                                        :class="mapping.mode === 'split' ? 'bg-background shadow-sm' : 'text-muted-foreground'"
                                        @click="mapping.mode = 'split'"
                                    >
                                        Debit/Credit Split
                                    </Button>
                                </div>

                                <div v-if="mapping.mode === 'single'" class="flex-grow flex flex-col justify-center">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 flex items-center justify-center bg-muted rounded-lg text-lg shrink-0">💵</div>
                                        <div class="flex-1 min-w-0">
                                            <div class="text-xs font-bold">Amount</div>
                                            <Select v-model="mapping.amount">
                                                <SelectTrigger class="w-full h-9 text-xs mt-2">
                                                    <SelectValue placeholder="Amount column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div v-else class="flex-grow flex flex-col justify-center space-y-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 flex items-center justify-center bg-muted rounded-lg text-lg shrink-0">➖</div>
                                        <div class="flex-1 min-w-0">
                                            <div class="text-xs font-bold">Debit (Out)</div>
                                            <Select v-model="splitMapping.debit">
                                                <SelectTrigger class="w-full h-9 text-xs mt-2">
                                                    <SelectValue placeholder="Debit column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 flex items-center justify-center bg-muted rounded-lg text-lg shrink-0">➕</div>
                                        <div class="flex-1 min-w-0">
                                            <div class="text-xs font-bold">Credit (In)</div>
                                            <Select v-model="splitMapping.credit">
                                                <SelectTrigger class="w-full h-9 text-xs mt-2">
                                                    <SelectValue placeholder="Credit column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Step 4: Final Verification -->
                    <div v-else-if="step === 4" class="space-y-6 animate-in fade-in">
                        <div class="flex items-center justify-between bg-primary/5 border border-primary/10 p-3 rounded-lg text-sm text-foreground font-bold">
                            <span class="flex items-center">
                                <CheckCircle2 class="mr-2 h-5 w-5 text-primary" />
                                {{ selectedTxns.size }} of {{ parsedTxns.length }} transactions selected
                            </span>
                            <Button variant="outline" size="sm" class="font-bold rounded-full h-8 px-4" @click="toggleAllVerify">
                                {{ selectedTxns.size < parsedTxns.length ? 'Select All' : 'Deselect All' }}
                            </Button>
                        </div>

                        <div class="relative overflow-auto border rounded-xl bg-card max-h-[350px]">
                            <table class="w-full text-sm text-left">
                                <thead class="text-[10px] font-black text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b">
                                    <tr>
                                        <th class="p-4 text-center w-[50px]">
                                            <Checkbox :checked="selectedTxns.size === parsedTxns.length" @update:checked="toggleAllVerify" />
                                        </th>
                                        <th class="p-3">DATE</th>
                                        <th class="p-3">REF #</th>
                                        <th class="p-3">RECIPIENT / SOURCE</th>
                                        <th class="p-3 text-right">AMOUNT</th>
                                        <th class="p-3 text-center w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-border/40">
                                    <tr v-for="(txn, idx) in parsedTxns" :key="idx"
                                        class="transition-colors hover:bg-muted/10"
                                        :class="{ 'opacity-40 bg-muted/5': !selectedTxns.has(idx) }">
                                        <td class="p-4 text-center">
                                            <Checkbox :checked="selectedTxns.has(idx)" @update:checked="toggleSelection(idx)" />
                                        </td>
                                        <td class="p-3 text-xs">{{ txn.date }}</td>
                                        <td class="p-3 text-xs text-muted-foreground/80 font-mono">{{ txn.external_id || txn.ref_id || '-' }}</td>
                                        <td class="p-3">
                                            <div class="font-bold text-xs truncate max-w-[200px]" :title="txn.recipient">{{ txn.recipient || '-' }}</div>
                                            <div class="text-[10px] text-muted-foreground truncate max-w-[200px]" :title="txn.description">{{ txn.description }}</div>
                                        </td>
                                        <td class="p-3 text-right font-black text-xs"
                                            :class="txn.type === 'DEBIT' ? 'text-red-500' : 'text-emerald-500'">
                                            {{ formatAmount(txn.amount) }}
                                        </td>
                                        <td class="p-3 text-center">
                                            <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive hover:bg-destructive/10" @click="removeTxn(idx)">
                                                <Trash2 class="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Step 5: Success Results -->
                    <div v-else-if="step === 5" class="space-y-6 animate-in fade-in">
                        <div class="flex flex-col items-center justify-center py-10 text-center space-y-6">
                            <div class="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                                <CheckCircle class="h-12 w-12 animate-bounce" />
                            </div>
                            <div>
                                <h2 class="text-2xl font-black mb-1">Import Successful!</h2>
                                <p class="text-base text-muted-foreground">
                                    Successfully imported <strong class="text-foreground font-extrabold">{{ importResult?.imported }}</strong> transactions to your account.
                                </p>
                            </div>

                            <Alert v-if="importResult?.errors?.length > 0" variant="destructive" class="w-full max-w-[600px] text-left rounded-xl">
                                <AlertTitle class="font-black text-sm mb-2">Errors Encountered ({{ importResult.errors.length }})</AlertTitle>
                                <AlertDescription>
                                    <ul class="list-disc pl-4 text-xs space-y-1">
                                        <li v-for="err in importResult.errors" :key="err">{{ err }}</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>

                            <Button class="px-12 rounded-full h-11 font-bold shadow-md shadow-primary/20" @click="close">
                                Done & Close
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div v-if="step < 5" class="flex items-center gap-3 p-4 bg-muted/20 border-t sticky bottom-0 z-20">
                <Button v-if="step > 1" variant="outline" class="rounded-xl h-10 px-6 font-bold" @click="step--">
                    Back
                </Button>
                <Button v-else variant="ghost" class="rounded-xl h-10 px-6 font-bold" @click="close">
                    Close
                </Button>
                <div class="flex-grow"></div>

                <Button v-if="step === 1" class="rounded-xl h-10 px-8 font-bold" :disabled="!selectedAccount || !file" @click="step = 2">
                    Next: Preview File
                </Button>

                <Button v-if="step === 2" class="rounded-xl h-10 px-8 font-bold" @click="step = 3">
                    Yes, Looks Good
                </Button>

                <Button v-if="step === 3" class="rounded-xl h-10 px-8 font-bold" @click="parseFile">
                    Next: Verify List
                </Button>

                <Button v-if="step === 4" class="rounded-xl h-10 px-8 font-bold animate-pulse" @click="importSelected" :disabled="selectedTxns.size === 0">
                    Import {{ selectedTxns.size }} Transactions
                </Button>
            </div>
        </DialogContent>
    </Dialog>
</template>
