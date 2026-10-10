<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { 
    FileText, 
    Upload, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    Lock,
    ArrowRight,
    Landmark,
    User,
    Clock,
    Trash2,
    Eye,
    EyeOff,
    X,
    Mail,
    Table,
    Search as SearchIcon,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet
} from 'lucide-vue-next'

import MainLayout from '@/layouts/MainLayout.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfAlert from '@/components/ui/WfAlert.vue'
import apiClient, { financeApi } from '@/api/client'
import { useStatementStore, type Statement } from '@/stores/finance/statements'
import { useNotificationStore } from '@/stores/notification'
import { format } from 'date-fns'

const store = useStatementStore()
const notification = useNotificationStore()

const selectedStatement = ref<Statement | null>(null)
const uploadDialog = ref(false)
const uploadFile = ref<File | null>(null)
const uploadPassword = ref('')
const showPassword = ref(false)
const uploadUser = ref<any>(null)
const uploadAccount = ref<any>(null)
const syncDialog = ref(false)
const syncDate = ref(new Date().toISOString().substring(0, 10))
const syncing = ref(false)
const search = ref('')

const retryDialog = ref(false)
const retryPassword = ref('')
const showRetryPassword = ref(false)
const selectedStatementForRetry = ref<Statement | null>(null)

const pdfUrl = ref('')
const activeTab = ref<'transactions' | 'attachment' | 'email'>('transactions')

const statementPage = ref(1)
const statementPageSize = 8

const txnPage = ref(1)
const txnLimit = ref(10)

const users = ref<any[]>([])
const accounts = ref<any[]>([])
const categories = ref<any[]>([])

const selectedTransactions = ref<string[]>([])
const bulkIngestDialog = ref(false)
const bulkIngestItems = ref<{ transaction_id: string, description: string, amount: number, date: string, category: string | null, create_rule: boolean, exclude_from_reports: boolean }[]>([])

const deleteDialog = ref(false)
const statementToDelete = ref<string | null>(null)

const reassignDialog = ref(false)
const reassignAccountId = ref<string | null>(null)
const reassigning = ref(false)

const attachmentUrl = ref<string | null>(null)

// Category options tree builder for bulk ingest
const categoryOptions = computed(() => {
    const list: any[] = []

    const buildTree = (flatList: any[]) => {
        const lookup = new Map();
        const roots: any[] = [];
        flatList.forEach(c => {
            lookup.set(c.id || c.name, { ...c, subcategories: [] });
        });
        flatList.forEach(c => {
            const parentKey = c.parent_id;
            if (parentKey && lookup.has(parentKey)) {
                lookup.get(parentKey).subcategories.push(lookup.get(c.id || c.name));
            } else if (!parentKey) {
                roots.push(lookup.get(c.id || c.name));
            } else {
                roots.push(lookup.get(c.id || c.name));
            }
        });
        return roots;
    }

    const flatten = (cats: any[], depth = 0) => {
        const sorted = [...cats].sort((a, b) => a.name.localeCompare(b.name))
        sorted.forEach(c => {
            const prefix = depth > 0 ? '　'.repeat(depth) + '└ ' : ''
            list.push({
                title: `${prefix}${c.icon || '🏷️'} ${c.name}`,
                value: c.name
            })
            if (c.subcategories && c.subcategories.length > 0) {
                flatten(c.subcategories, depth + 1)
            }
        })
    }

    const hasTreeStructure = categories.value.some(c => c.subcategories && c.subcategories.length > 0)
    const tree = hasTreeStructure ? categories.value.filter(c => !c.parent_id) : buildTree(categories.value)

    flatten(tree)

    if (!list.find(o => o.value === 'Uncategorized')) {
        list.push({ title: '🏷️ Uncategorized', value: 'Uncategorized' })
    }
    return list
})

function openBulkIngestDialog() {
    bulkIngestItems.value = store.currentTransactions
        .filter(t => selectedTransactions.value.includes(t.id))
        .map(t => ({
            transaction_id: t.id,
            description: t.description,
            amount: t.amount,
            date: t.date,
            category: t.category_suggestion && t.category_suggestion !== 'Uncategorized' ? t.category_suggestion : null,
            create_rule: !(t.category_suggestion && t.category_suggestion !== 'Uncategorized'),
            exclude_from_reports: false
        }))
    bulkIngestDialog.value = true
}

const canConfirmBulkIngest = computed(() => {
    return bulkIngestItems.value.length > 0 && bulkIngestItems.value.every(item => !!item.category)
})

async function confirmBulkIngest() {
    try {
        await store.bulkIngestTransactions(bulkIngestItems.value)
        notification.success('Bulk ingestion successful')
        bulkIngestDialog.value = false
        selectedTransactions.value = []
    } catch (e: any) {
        notification.error(e.message || 'Bulk ingestion failed')
    }
}

onMounted(async () => {
    store.fetchStatements(0, statementPageSize)
    try {
        const [usersRes, accountsRes, categoriesRes] = await Promise.all([
            apiClient.get('/auth/users'),
            apiClient.get('/finance/accounts'),
            financeApi.getCategories()
        ])
        users.value = usersRes.data
        accounts.value = accountsRes.data
        categories.value = categoriesRes.data
    } catch (e) {
        notification.error("Failed to initialize dashboard context (Users/Accounts)")
    }
})

// Server-side pagination for statements
watch([statementPage, search], () => {
    store.fetchStatements((statementPage.value - 1) * statementPageSize, statementPageSize, search.value)
})

// Server-side pagination for transactions
watch([txnPage, txnLimit, selectedStatement], () => {
    if (selectedStatement.value) {
        store.fetchTransactions(
            selectedStatement.value.id, 
            (txnPage.value - 1) * txnLimit.value, 
            txnLimit.value
        )
    }
})

// Password prefill logic
watch(uploadUser, (user) => {
    if (!user) {
        uploadPassword.value = ''
        return
    }

    // Attempt to guess password based on common patterns
    if (user.full_name && user.dob) {
        // Pattern 1: Name4 + DDMM (HDFC/ICICI style)
        const namePart = user.full_name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
        const dobDate = new Date(user.dob)
        const day = String(dobDate.getDate()).padStart(2, '0')
        const month = String(dobDate.getMonth() + 1).padStart(2, '0')
        
        // Default to Name4+DDMM
        uploadPassword.value = `${namePart}${day}${month}`
    } else if (user.pan) {
        uploadPassword.value = user.pan.toUpperCase()
    }
})

async function selectStatement(s: Statement) {
    selectedStatement.value = s
    selectedTransactions.value = []
    
    if (s.vault_id) {
        pdfUrl.value = financeApi.getDocumentViewUrl(s.vault_id)
        loadAttachment(s.vault_id)
    } else {
        pdfUrl.value = ''
        attachmentUrl.value = null
    }
    
    // Reset tab if statement lacks appropriate media
    if (activeTab.value === 'attachment' && !s.vault_id) activeTab.value = 'transactions'
    if (activeTab.value === 'email' && !s.email_body) activeTab.value = 'transactions'
    
    txnPage.value = 1
    await store.fetchTransactions(s.id, 0, txnLimit.value)
}

async function handleUpload() {
    if (!uploadFile.value) return
    try {
        const res = await store.uploadStatement(
            uploadFile.value, 
            uploadPassword.value, 
            uploadAccount.value?.id
        )
        
        if (res?.status === 'pending') {
            notification.warning(res.message || 'Statement uploaded but requires a password for decryption.')
        } else {
            notification.success('Statement uploaded and parsed successfully.')
        }
        
        uploadDialog.value = false
        uploadFile.value = null
        uploadPassword.value = ''
        uploadAccount.value = null
        uploadUser.value = null
    } catch (e: any) {
        notification.error(e.message || 'Upload failed')
    }
}

function handleFileInput(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.files && target.files[0]) {
        uploadFile.value = target.files[0]
    }
}

function openRetryDialog(s: Statement) {
    selectedStatementForRetry.value = s
    retryPassword.value = ''
    retryDialog.value = true
}

async function handleRetry() {
    if (!selectedStatementForRetry.value || !retryPassword.value) return
    try {
        await store.reprocessStatement(selectedStatementForRetry.value.id, retryPassword.value)
        notification.success('Statement decrypted and parsed successfully')
        retryDialog.value = false
        
        // Find the newly parsed statement in the updated list
        const newStatement = store.statements.find(s => 
            s.filename === selectedStatementForRetry.value?.filename && 
            s.status === 'PARSED'
        )
        if (newStatement) {
            selectStatement(newStatement)
        }
    } catch (e) {
        // Error is handled by global interceptor
    }
}

async function triggerSync() {
    syncing.value = true
    try {
        await store.triggerSync(syncDate.value)
        notification.success('Email sync triggered')
        syncDialog.value = false
    } finally {
        syncing.value = false
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'PARSED':
            return {
                label: 'Parsed',
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60',
                dot: 'bg-emerald-500'
            }
        case 'PENDING':
            return {
                label: 'Decryption Pending',
                bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/60',
                dot: 'bg-amber-500'
            }
        case 'FAILED':
            return {
                label: 'Failed',
                bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/60',
                dot: 'bg-rose-500'
            }
        default:
            return {
                label: status,
                bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
                dot: 'bg-slate-400'
            }
    }
}

function formatDate(date: string) {
    if (!date) return 'N/A'
    try {
        return format(new Date(date), 'MMM dd, yyyy HH:mm')
    } catch {
        return date
    }
}

function formatTxnDate(date: string) {
    if (!date) return 'N/A'
    try {
        return format(new Date(date), 'dd MMM yyyy')
    } catch {
        return date
    }
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount)
}

function getAccountInfo(accountId: string) {
    if (!accountId) return null
    const acc = accounts.value.find(a => a.id === accountId)
    if (!acc) return null
    const user = users.value.find(u => u.id === acc.owner_id)
    return { accountName: acc.name, userName: user?.full_name || 'System' }
}

async function confirmReassign() {
    if (!selectedStatement.value || !reassignAccountId.value) return
    reassigning.value = true
    try {
        const updated = await store.updateStatement(selectedStatement.value.id, { account_id: reassignAccountId.value })
        selectedStatement.value = updated
        
        // If it was FAILED and now PARSED, we need to fetch the newly extracted transactions
        if (updated.status === 'PARSED') {
            await store.fetchTransactions(updated.id)
        }
        
        notification.success('Account re-assigned and statement re-processed successfully')
        reassignDialog.value = false
    } catch (e: any) {
        notification.error(e.message || 'Failed to re-assign account')
    } finally {
        reassigning.value = false
    }
}

function promptDeleteStatement(id: string) {
    statementToDelete.value = id
    deleteDialog.value = true
}

async function confirmDeleteStatement() {
    if (!statementToDelete.value) return
    
    try {
        await store.deleteStatement(statementToDelete.value)
        if (selectedStatement.value?.id === statementToDelete.value) {
            selectedStatement.value = null
        }
        notification.success('Statement deleted successfully')
        deleteDialog.value = false
        statementToDelete.value = null
    } catch (e) {
        notification.error('Failed to delete statement')
    }
}

async function reevaluateStatement(id: string) {
    if (!selectedStatement.value) return
    try {
        if (selectedStatement.value.status === 'FAILED') {
            // Smart recovery: check failure type
            const reason = selectedStatement.value.failure_reason || ''
            if (reason.startsWith('ACCOUNT_NOT_FOUND:')) {
                // Account issue — just reprocess (account may have been linked since)
                const updated = await store.reprocessStatement(id)
                selectedStatement.value = updated
                notification.success('Statement re-processed successfully')
            } else {
                // Parse/password issue — prompt for password
                openRetryDialog(selectedStatement.value)
            }
        } else {
            await store.reconcileStatement(id)
            notification.success('Statement reconciled successfully')
        }
    } catch (e: any) {
        notification.error(e.response?.data?.detail || 'Failed to reevaluate statement')
    }
}

async function loadAttachment(vault_id: string) {
    if (attachmentUrl.value) {
        URL.revokeObjectURL(attachmentUrl.value)
        attachmentUrl.value = null
    }
    try {
        const res = await financeApi.getDocumentBlob(vault_id)
        const blob = new Blob([res.data], { type: 'application/pdf' })
        attachmentUrl.value = URL.createObjectURL(blob)
    } catch (e) {
        notification.error('Failed to load attachment for preview')
    }
}

function getAccountName(account_id: string) {
    const acc = getAccountInfo(account_id)
    if (!acc) return `Account: XX${account_id?.slice(-4) || 'Unknown'}`
    return `${acc.userName} - ${acc.accountName}`
}

// Checkbox select all logic for transactions table
const isAllSelected = computed(() => {
    if (store.currentTransactions.length === 0) return false
    return store.currentTransactions.every(t => selectedTransactions.value.includes(t.id))
})

function toggleSelectAll() {
    if (isAllSelected.value) {
        selectedTransactions.value = []
    } else {
        selectedTransactions.value = store.currentTransactions.map(t => t.id)
    }
}

function toggleSelectTransaction(id: string) {
    const index = selectedTransactions.value.indexOf(id)
    if (index > -1) {
        selectedTransactions.value.splice(index, 1)
    } else {
        selectedTransactions.value.push(id)
    }
}

const totalPages = computed(() => {
    return Math.ceil(store.totalStatements / statementPageSize) || 1
})

const totalTxnPages = computed(() => {
    return Math.ceil(store.totalTransactions / txnLimit.value) || 1
})
</script>

<template>
    <MainLayout>
        <div class="flex flex-col lg:h-[calc(100vh-80px)] max-w-[1600px] mx-auto space-y-3 pb-3">
            <!-- HEADER: Title, Intelligence Pill & Action Buttons -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs">
                        <FileSpreadsheet class="w-5 h-5 text-wf-primary" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary">
                                Account Statements
                            </h1>
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                <span class="w-1.5 h-1.5 rounded-wf-pill bg-wf-primary animate-pulse"></span>
                                {{ store.totalStatements }} Ingested
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary">
                            Automated reconciliation, PDF decryption, and ledger matching workspace.
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2.5">
                    <WfButton
                        variant="outline"
                        size="sm"
                        @click="syncDialog = true"
                        :loading="syncing"
                        class="h-8.5 px-3.5 text-xs font-semibold shadow-2xs"
                    >
                        <RefreshCw class="w-3.5 h-3.5 mr-1.5" :class="{ 'animate-spin': syncing }" />
                        <span>Sync Emails</span>
                    </WfButton>

                    <WfButton
                        variant="primary"
                        size="sm"
                        @click="uploadDialog = true"
                        class="h-8.5 px-3.5 text-xs font-semibold shadow-2xs"
                    >
                        <Upload class="w-3.5 h-3.5 mr-1.5" />
                        <span>Upload Statement</span>
                    </WfButton>
                </div>
            </div>

            <!-- MAIN WORKSPACE: 2-Column Split Layout -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 items-stretch">
                
                <!-- LEFT COLUMN: Statements List Directory (4 cols) -->
                <div class="lg:col-span-4 flex flex-col h-full min-h-0">
                    <WfCard variant="flat" padding="none" radius="lg" class="overflow-hidden flex flex-col border border-wf-border h-full">
                        <!-- Search Toolbar -->
                        <div class="p-3 border-b border-wf-border bg-wf-surface-variant/40 flex items-center gap-2 shrink-0">
                            <div class="relative flex-1">
                                <SearchIcon class="w-3.5 h-3.5 text-wf-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    v-model="search"
                                    type="text"
                                    placeholder="Search statements..."
                                    class="w-full h-8.5 pl-8 pr-7 text-xs bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-1 focus:ring-wf-primary focus:border-wf-primary transition-all"
                                />
                                <button
                                    v-if="search"
                                    @click="search = ''"
                                    class="absolute right-2 top-1/2 -translate-y-1/2 text-wf-text-muted hover:text-wf-text-primary p-0.5 rounded-wf-sm"
                                >
                                    <X class="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <!-- Statement Items List -->
                        <div class="divide-y divide-wf-border-subtle overflow-y-auto flex-1 min-h-0 bg-wf-surface">
                            <!-- Loading Skeletons -->
                            <div v-if="store.loading && store.statements.length === 0" class="p-3 space-y-2">
                                <div v-for="i in 5" :key="`skel-${i}`" class="h-16 rounded-wf-md bg-wf-surface-variant animate-pulse p-2.5 flex flex-col justify-between">
                                    <div class="w-3/4 h-3 rounded-wf-xs bg-slate-200 dark:bg-slate-700"></div>
                                    <div class="w-1/2 h-2.5 rounded-wf-xs bg-slate-200 dark:bg-slate-700"></div>
                                </div>
                            </div>

                            <!-- List Items -->
                            <template v-else-if="store.statements.length > 0">
                                <div
                                    v-for="s in store.statements"
                                    :key="s.id"
                                    @click="selectStatement(s)"
                                    class="p-3 cursor-pointer transition-all duration-150 flex items-start gap-3 select-none relative group"
                                    :class="[
                                        selectedStatement?.id === s.id 
                                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-3 border-l-wf-primary' 
                                            : 'hover:bg-wf-surface-variant/60 border-l-3 border-l-transparent'
                                    ]"
                                >
                                    <!-- Status Icon Avatar -->
                                    <div 
                                        class="w-8 h-8 rounded-wf-md shrink-0 flex items-center justify-center text-xs mt-0.5 border"
                                        :class="[
                                            s.status === 'PARSED' 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60'
                                                : s.status === 'PENDING'
                                                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60'
                                                : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/60'
                                        ]"
                                    >
                                        <CheckCircle2 v-if="s.status === 'PARSED'" class="w-4 h-4" />
                                        <Lock v-else-if="s.status === 'PENDING'" class="w-4 h-4" />
                                        <AlertCircle v-else class="w-4 h-4" />
                                    </div>

                                    <!-- Statement Details -->
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center justify-between gap-1 mb-0.5">
                                            <span 
                                                class="text-xs font-semibold truncate text-wf-text-primary"
                                                :title="s.filename"
                                            >
                                                {{ s.filename }}
                                            </span>
                                            <span 
                                                class="inline-flex items-center px-1.5 py-0.5 rounded-wf-sm text-[10px] font-bold shrink-0 border"
                                                :class="getStatusBadge(s.status).bg"
                                            >
                                                {{ getStatusBadge(s.status).label }}
                                            </span>
                                        </div>

                                        <div class="flex items-center gap-2 text-[11px] text-wf-text-muted mt-1 flex-wrap">
                                            <span class="inline-flex items-center gap-1">
                                                <Clock class="w-3 h-3 text-slate-400" />
                                                {{ formatDate(s.created_at) }}
                                            </span>

                                            <span v-if="s.email_sender" class="inline-flex items-center gap-1 text-wf-primary font-medium truncate max-w-[120px]" :title="s.email_sender">
                                                <Landmark class="w-3 h-3 shrink-0" />
                                                {{ s.email_sender.split('@')[0] }}
                                            </span>
                                            <span v-else-if="s.source === 'MANUAL'" class="inline-flex items-center gap-1">
                                                <User class="w-3 h-3 text-slate-400" />
                                                Manual
                                            </span>
                                        </div>
                                    </div>

                                    <ArrowRight class="w-3.5 h-3.5 text-wf-text-muted opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0" />
                                </div>
                            </template>

                            <!-- Empty List State -->
                            <div v-else class="p-8 text-center flex flex-col items-center justify-center text-wf-text-muted">
                                <FileText class="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                                <p class="text-xs font-semibold text-wf-text-secondary">No statements found</p>
                                <p class="text-[11px] text-wf-text-muted mt-0.5">Upload a PDF or sync via email.</p>
                            </div>
                        </div>

                        <!-- Footer Pagination -->
                        <div v-if="store.totalStatements > statementPageSize" class="p-2.5 border-t border-wf-border bg-wf-surface-variant/30 flex items-center justify-between text-xs shrink-0">
                            <span class="text-[11px] text-wf-text-secondary font-medium">
                                Page {{ statementPage }} of {{ totalPages }}
                            </span>
                            <div class="flex items-center gap-1">
                                <button
                                    :disabled="statementPage <= 1"
                                    @click="statementPage--"
                                    class="p-1 rounded-wf-sm text-wf-text-secondary hover:bg-wf-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                    title="Previous Page"
                                >
                                    <ChevronLeft class="w-4 h-4" />
                                </button>
                                <button
                                    :disabled="statementPage >= totalPages"
                                    @click="statementPage++"
                                    class="p-1 rounded-wf-sm text-wf-text-secondary hover:bg-wf-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                    title="Next Page"
                                >
                                    <ChevronRight class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </WfCard>
                </div>

                <!-- RIGHT COLUMN: Selected Statement Inspector & Reconciliation Workspace (8 cols) -->
                <div class="lg:col-span-8 flex flex-col h-full min-h-0">
                    <WfCard v-if="selectedStatement" variant="flat" padding="none" radius="lg" class="overflow-hidden border border-wf-border bg-wf-surface flex flex-col h-full">
                        
                        <!-- Detail Header Ribbon -->
                        <div class="p-4 border-b border-wf-border bg-wf-surface-variant/30 shrink-0">
                            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                <div class="flex items-start gap-3 min-w-0">
                                    <div class="w-10 h-10 rounded-wf-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                        <FileText class="w-5 h-5 text-indigo-300" />
                                    </div>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                                            <span 
                                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-sm text-[10px] font-bold border"
                                                :class="getStatusBadge(selectedStatement.status).bg"
                                            >
                                                <span class="w-1.5 h-1.5 rounded-wf-pill" :class="getStatusBadge(selectedStatement.status).dot"></span>
                                                {{ selectedStatement.status }}
                                            </span>

                                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-sm text-[10px] font-semibold bg-wf-surface border border-wf-border text-wf-text-secondary">
                                                <Mail v-if="selectedStatement.source === 'EMAIL'" class="w-3 h-3 text-wf-primary" />
                                                <Upload v-else class="w-3 h-3 text-wf-primary" />
                                                {{ selectedStatement.source }}
                                            </span>
                                        </div>

                                        <h2 class="text-sm sm:text-base font-bold text-wf-text-primary truncate" :title="selectedStatement.filename">
                                            {{ selectedStatement.filename }}
                                        </h2>

                                        <p class="text-[11px] text-wf-text-muted mt-0.5 flex items-center gap-1">
                                            <Clock class="w-3 h-3" />
                                            Ingested {{ formatDate(selectedStatement.created_at) }}
                                        </p>
                                    </div>
                                </div>

                                <!-- Header Action Buttons -->
                                <div class="flex items-center gap-2 shrink-0">
                                    <WfButton
                                        v-if="selectedTransactions.length > 0"
                                        variant="primary"
                                        size="sm"
                                        @click="openBulkIngestDialog"
                                        class="h-8 px-3 text-xs font-semibold shadow-sm"
                                    >
                                        <CheckCircle2 class="w-3.5 h-3.5 mr-1" />
                                        <span>Ingest ({{ selectedTransactions.length }})</span>
                                    </WfButton>

                                    <button
                                        @click="reevaluateStatement(selectedStatement.id)"
                                        class="p-1.5 rounded-wf-md border border-wf-border text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant hover:border-wf-primary/40 transition-colors"
                                        title="Re-evaluate Statement"
                                    >
                                        <RefreshCw class="w-4 h-4" />
                                    </button>

                                    <button
                                        @click="promptDeleteStatement(selectedStatement.id)"
                                        class="p-1.5 rounded-wf-md border border-wf-border text-wf-text-secondary hover:text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 transition-colors"
                                        title="Delete Statement"
                                    >
                                        <Trash2 class="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <!-- Metadata Row -->
                            <div class="flex items-center gap-4 text-xs font-medium text-wf-text-secondary pt-2 border-t border-wf-border-subtle flex-wrap">
                                <div class="flex items-center gap-1.5">
                                    <Landmark class="w-3.5 h-3.5 text-wf-text-muted" />
                                    <span class="text-wf-text-muted">Account:</span>
                                    <span class="font-semibold text-wf-text-primary">{{ getAccountName(selectedStatement.account_id) }}</span>
                                    <button 
                                        @click="reassignDialog = true" 
                                        class="text-[11px] font-bold text-wf-primary hover:underline ml-1 px-1.5 py-0.5 rounded-wf-sm bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50"
                                    >
                                        Change
                                    </button>
                                </div>

                                <div v-if="selectedStatement.email_sender" class="flex items-center gap-1.5 border-l border-wf-border pl-4">
                                    <User class="w-3.5 h-3.5 text-wf-text-muted" />
                                    <span class="text-wf-text-muted">Sender:</span>
                                    <span class="font-semibold text-wf-text-primary">{{ selectedStatement.email_sender }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Tab Navigation Bar -->
                        <div class="flex items-center gap-1 px-4 pt-2 border-b border-wf-border bg-wf-surface-variant/20 shrink-0">
                            <button
                                @click="activeTab = 'transactions'"
                                class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors"
                                :class="activeTab === 'transactions' ? 'border-wf-primary text-wf-primary font-bold' : 'border-transparent text-wf-text-secondary hover:text-wf-text-primary'"
                            >
                                <Table class="w-3.5 h-3.5" />
                                <span>Transactions</span>
                                <span v-if="selectedStatement.status === 'PARSED'" class="ml-1 px-1.5 py-0.2 rounded-wf-pill text-[10px] bg-wf-surface-variant text-wf-text-muted">
                                    {{ store.totalTransactions }}
                                </span>
                            </button>

                            <button
                                v-if="selectedStatement.vault_id"
                                @click="activeTab = 'attachment'"
                                class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors"
                                :class="activeTab === 'attachment' ? 'border-wf-primary text-wf-primary font-bold' : 'border-transparent text-wf-text-secondary hover:text-wf-text-primary'"
                            >
                                <Eye class="w-3.5 h-3.5" />
                                <span>Attachment / PDF</span>
                            </button>

                            <button
                                v-if="selectedStatement.email_body"
                                @click="activeTab = 'email'"
                                class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors"
                                :class="activeTab === 'email' ? 'border-wf-primary text-wf-primary font-bold' : 'border-transparent text-wf-text-secondary hover:text-wf-text-primary'"
                            >
                                <Mail class="w-3.5 h-3.5" />
                                <span>Email Content</span>
                            </button>
                        </div>

                        <!-- TAB CONTENTS -->
                        <div class="flex-1 min-h-0 flex flex-col bg-wf-surface overflow-hidden">
                            
                            <!-- TAB 1: Transactions / Status Handlers -->
                            <div v-if="activeTab === 'transactions'" class="flex-1 min-h-0 flex flex-col overflow-hidden">
                                
                                <!-- PENDING STATE (Password Decryption Required) -->
                                <div v-if="selectedStatement.status === 'PENDING'" class="p-10 flex flex-col items-center justify-center text-center flex-1 bg-wf-surface-variant/20">
                                    <div class="w-16 h-16 rounded-wf-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
                                        <Lock class="w-8 h-8" />
                                    </div>
                                    <h3 class="text-base font-bold text-wf-text-primary mb-1">Decryption Password Required</h3>
                                    <p class="text-xs text-wf-text-secondary max-w-md mb-6 leading-relaxed">
                                        This statement file is encrypted. Enter the PDF password (such as PAN, date of birth, or account PIN) to decrypt and parse transactions.
                                    </p>
                                    <WfButton
                                        variant="primary"
                                        size="md"
                                        @click="openRetryDialog(selectedStatement)"
                                        class="h-9 px-5 text-xs font-semibold"
                                    >
                                        <Lock class="w-4 h-4 mr-2" />
                                        <span>Enter Password & Decrypt</span>
                                    </WfButton>
                                </div>

                                <!-- FAILED STATE -->
                                <div v-else-if="selectedStatement.status === 'FAILED'" class="p-10 flex flex-col items-center justify-center text-center flex-1 bg-wf-surface-variant/20">
                                    <div class="w-16 h-16 rounded-wf-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
                                        <AlertCircle class="w-8 h-8" />
                                    </div>
                                    <h3 class="text-base font-bold text-wf-text-primary mb-1">Processing Encountered an Issue</h3>
                                    <p class="text-xs font-medium text-rose-600 dark:text-rose-400 max-w-lg mb-4 p-2.5 bg-rose-50/80 dark:bg-rose-950/40 rounded-wf-md border border-rose-200 dark:border-rose-900/60 break-words">
                                        {{ (selectedStatement.failure_reason || 'An unexpected error occurred during ingestion.').replace(/^(PASSWORD_FAILED|PARSE_FAILED|ACCOUNT_NOT_FOUND):\s*/, '') }}
                                    </p>

                                    <!-- Smart recovery: ACCOUNT_NOT_FOUND -->
                                    <template v-if="selectedStatement.failure_reason?.startsWith('ACCOUNT_NOT_FOUND:')">
                                        <p class="text-xs text-wf-text-secondary max-w-md mb-6">
                                            The account mask in the statement did not match any active linked account. Choose the correct account to re-process.
                                        </p>
                                        <WfButton
                                            variant="primary"
                                            size="md"
                                            @click="reassignDialog = true"
                                            class="h-9 px-5 text-xs font-semibold"
                                        >
                                            <Landmark class="w-4 h-4 mr-2" />
                                            <span>Link Account Manually</span>
                                        </WfButton>
                                    </template>

                                    <!-- Smart recovery: PASSWORD_FAILED -->
                                    <template v-else-if="selectedStatement.failure_reason?.startsWith('PASSWORD_FAILED:')">
                                        <p class="text-xs text-wf-text-secondary max-w-md mb-6">
                                            The statement could not be opened with the stored password. Please provide the correct PDF password.
                                        </p>
                                        <WfButton
                                            variant="primary"
                                            size="md"
                                            @click="openRetryDialog(selectedStatement)"
                                            class="h-9 px-5 text-xs font-semibold"
                                        >
                                            <Lock class="w-4 h-4 mr-2" />
                                            <span>Enter Password</span>
                                        </WfButton>
                                    </template>

                                    <!-- Generic recovery -->
                                    <template v-else>
                                        <p class="text-xs text-wf-text-secondary max-w-md mb-6">
                                            The statement parser encountered an error. You can provide a password or assign a different target account.
                                        </p>
                                        <div class="flex items-center gap-3">
                                            <WfButton
                                                variant="outline"
                                                size="sm"
                                                @click="openRetryDialog(selectedStatement)"
                                                class="h-8.5 px-4 text-xs font-semibold"
                                            >
                                                <Lock class="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                                                <span>Try Password</span>
                                            </WfButton>

                                            <WfButton
                                                variant="primary"
                                                size="sm"
                                                @click="reassignDialog = true"
                                                class="h-8.5 px-4 text-xs font-semibold"
                                            >
                                                <Landmark class="w-3.5 h-3.5 mr-1.5" />
                                                <span>Link Account</span>
                                            </WfButton>
                                        </div>
                                    </template>
                                </div>

                                <!-- PARSED STATE: High-Density Reconciliation Ledger Table -->
                                <div v-else-if="selectedStatement.status === 'PARSED'" class="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                                    <div class="overflow-y-auto overflow-x-auto flex-1 min-h-0">
                                        <table class="w-full text-left border-collapse text-xs">
                                            <thead class="sticky top-0 z-10">
                                                <tr class="border-b border-wf-border bg-wf-surface-variant/90 backdrop-blur-xs text-[11px] font-bold text-wf-text-muted uppercase tracking-wider">
                                                    <th class="py-2.5 px-3 w-10 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            :checked="isAllSelected" 
                                                            @change="toggleSelectAll"
                                                            class="rounded-wf-xs border-slate-300 text-wf-primary focus:ring-wf-primary cursor-pointer w-3.5 h-3.5"
                                                        />
                                                    </th>
                                                    <th class="py-2.5 px-3">Date</th>
                                                    <th class="py-2.5 px-3 min-w-[200px]">Description</th>
                                                    <th class="py-2.5 px-3">Category Suggestion</th>
                                                    <th class="py-2.5 px-3 text-right">Amount</th>
                                                    <th class="py-2.5 px-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-wf-border-subtle bg-wf-surface">
                                                <tr 
                                                    v-for="txn in store.currentTransactions" 
                                                    :key="txn.id"
                                                    class="hover:bg-wf-surface-variant/40 transition-colors"
                                                    :class="{ 'bg-indigo-50/40 dark:bg-indigo-950/20': selectedTransactions.includes(txn.id) }"
                                                >
                                                    <td class="py-2 px-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            :checked="selectedTransactions.includes(txn.id)"
                                                            @change="toggleSelectTransaction(txn.id)"
                                                            class="rounded-wf-xs border-slate-300 text-wf-primary focus:ring-wf-primary cursor-pointer w-3.5 h-3.5"
                                                        />
                                                    </td>

                                                    <td class="py-2 px-3 whitespace-nowrap text-wf-text-secondary font-medium tabular-nums">
                                                        {{ formatTxnDate(txn.date) }}
                                                    </td>

                                                    <td class="py-2 px-3">
                                                        <div class="font-semibold text-wf-text-primary line-clamp-1" :title="txn.description">
                                                            {{ txn.description }}
                                                        </div>
                                                    </td>

                                                    <td class="py-2 px-3 whitespace-nowrap">
                                                        <span 
                                                            v-if="txn.category_suggestion && txn.category_suggestion !== 'Uncategorized'"
                                                            class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/50"
                                                        >
                                                            {{ txn.category_suggestion }}
                                                        </span>
                                                        <span v-else class="text-[11px] text-wf-text-muted italic">
                                                            Uncategorized
                                                        </span>
                                                    </td>

                                                    <td class="py-2 px-3 text-right whitespace-nowrap font-bold tabular-nums" :class="txn.type === 'DEBIT' ? 'text-wf-error' : 'text-wf-success'">
                                                        {{ txn.type === 'DEBIT' ? '-' : '+' }}{{ formatCurrency(txn.amount) }}
                                                    </td>

                                                    <td class="py-2 px-3 text-center whitespace-nowrap">
                                                        <span 
                                                            v-if="txn.is_reconciled" 
                                                            class="inline-flex items-center gap-1 text-[11px] font-semibold text-wf-success"
                                                            title="Matched with Ledger"
                                                        >
                                                            <CheckCircle2 class="w-3.5 h-3.5" />
                                                            <span>Matched</span>
                                                        </span>
                                                        <span 
                                                            v-else 
                                                            class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400"
                                                            title="Not in Ledger"
                                                        >
                                                            <AlertCircle class="w-3.5 h-3.5" />
                                                            <span>New</span>
                                                        </span>
                                                    </td>
                                                </tr>

                                                <tr v-if="store.currentTransactions.length === 0">
                                                    <td colspan="6" class="py-8 text-center text-wf-text-muted">
                                                        <div class="flex flex-col items-center justify-center">
                                                            <Table class="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
                                                            <span class="text-xs font-semibold">No transactions extracted</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <!-- Table Footer Pagination -->
                                    <div class="p-3 border-t border-wf-border bg-wf-surface-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0">
                                        <div class="flex items-center gap-3">
                                            <span class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider">
                                                Total {{ store.totalTransactions }} Transactions
                                            </span>
                                            <div class="flex items-center gap-1.5 text-xs text-wf-text-secondary">
                                                <span>Rows:</span>
                                                <select 
                                                    v-model="txnLimit" 
                                                    class="h-7 text-xs bg-wf-surface border border-wf-border rounded-wf-md px-1.5 focus:outline-none focus:ring-1 focus:ring-wf-primary"
                                                >
                                                    <option :value="10">10</option>
                                                    <option :value="25">25</option>
                                                    <option :value="50">50</option>
                                                    <option :value="100">100</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-3">
                                            <span class="text-xs text-wf-text-secondary tabular-nums">
                                                {{ (txnPage - 1) * txnLimit + 1 }}-{{ Math.min(txnPage * txnLimit, store.totalTransactions) }} of {{ store.totalTransactions }}
                                            </span>

                                            <div class="flex items-center gap-1">
                                                <button
                                                    :disabled="txnPage <= 1"
                                                    @click="txnPage--"
                                                    class="p-1 rounded-wf-sm text-wf-text-secondary hover:bg-wf-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                    title="Previous Page"
                                                >
                                                    <ChevronLeft class="w-4 h-4" />
                                                </button>
                                                <span class="text-xs font-bold text-wf-text-primary px-1.5">
                                                    {{ txnPage }} / {{ totalTxnPages }}
                                                </span>
                                                <button
                                                    :disabled="txnPage >= totalTxnPages"
                                                    @click="txnPage++"
                                                    class="p-1 rounded-wf-sm text-wf-text-secondary hover:bg-wf-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                    title="Next Page"
                                                >
                                                    <ChevronRight class="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- TAB 2: Attachment (PDF Viewer) -->
                            <div v-if="activeTab === 'attachment'" class="flex-1 min-h-0 flex flex-col bg-slate-100 dark:bg-slate-900 h-full">
                                <div v-if="!selectedStatement.vault_id" class="p-10 text-center flex flex-col items-center justify-center text-wf-text-muted flex-1">
                                    <AlertCircle class="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                                    <div class="text-sm font-bold text-wf-text-primary">No Attachment Found</div>
                                    <div class="text-xs text-wf-text-muted mt-0.5">This statement record does not have an associated source PDF file in the vault.</div>
                                </div>
                                <iframe 
                                    v-else-if="attachmentUrl || pdfUrl"
                                    :src="attachmentUrl || pdfUrl" 
                                    class="w-full h-full flex-1 border-0 bg-white"
                                ></iframe>
                                <div v-else class="flex-1 flex items-center justify-center p-10">
                                    <RefreshCw class="w-8 h-8 text-wf-primary animate-spin" />
                                </div>
                            </div>

                            <!-- TAB 3: Email Content -->
                            <div v-if="activeTab === 'email'" class="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-wf-surface h-full">
                                <div class="p-4 rounded-wf-lg border border-wf-border bg-wf-surface-variant/30 mb-4 flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-wf-pill bg-wf-primary-light text-wf-primary flex items-center justify-center shrink-0">
                                        <Mail class="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">From Sender</span>
                                        <span class="text-xs font-bold text-wf-text-primary">{{ selectedStatement.email_sender || 'Unknown Sender' }}</span>
                                    </div>
                                </div>

                                <div v-if="selectedStatement.email_body" class="bg-white rounded-wf-lg border border-wf-border overflow-hidden min-h-[450px]">
                                    <iframe 
                                        :srcdoc="selectedStatement.email_body"
                                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                                        class="w-full h-[550px] border-0 bg-white"
                                    ></iframe>
                                </div>
                                <div v-else class="p-10 text-center bg-wf-surface-variant/40 rounded-wf-lg border border-dashed border-wf-border text-wf-text-muted">
                                    <Mail class="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p class="text-xs font-semibold">No raw email body captured for this statement.</p>
                                </div>
                            </div>
                        </div>
                    </WfCard>

                    <!-- Empty Inspector State -->
                    <WfCard v-else variant="flat" padding="lg" radius="lg" class="border border-wf-border h-full flex flex-col items-center justify-center text-center text-wf-text-muted bg-wf-surface">
                        <div class="w-16 h-16 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4 border border-wf-border">
                            <FileText class="w-8 h-8" />
                        </div>
                        <h3 class="text-base font-bold text-wf-text-primary mb-1">No Statement Selected</h3>
                        <p class="text-xs text-wf-text-secondary max-w-sm">
                            Select a statement from the left directory to inspect parsed transactions, decryption logs, or source attachments.
                        </p>
                    </WfCard>
                </div>
            </div>
        </div>

        <!-- MODAL: Sync Statements -->
        <WfModal v-model="syncDialog" title="Sync Account Statements" description="Scan linked email inboxes for newly arrived statements." maxWidth="md">
            <div class="space-y-4">
                <div class="space-y-1.5 text-left">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                        Scan Inboxes Since
                    </label>
                    <input
                        v-model="syncDate"
                        type="date"
                        class="w-full h-10 px-3 bg-wf-surface border border-wf-border rounded-wf-md text-sm text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                    />
                </div>

                <WfAlert variant="info">
                    Manual sync scans for incoming emails without resetting the recurring background automated schedule.
                </WfAlert>
            </div>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="syncDialog = false">
                    Cancel
                </WfButton>
                <WfButton variant="primary" size="sm" @click="triggerSync" :loading="syncing">
                    <CheckCircle2 class="w-4 h-4 mr-1.5" />
                    <span>Start Sync</span>
                </WfButton>
            </template>
        </WfModal>

        <!-- MODAL: Upload Statement -->
        <WfModal v-model="uploadDialog" title="Upload Account Statement" description="Upload a PDF statement directly into your vault for parsing." maxWidth="lg">
            <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <!-- Owner Select -->
                    <div class="space-y-1.5 text-left">
                        <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                            Statement Owner
                        </label>
                        <select
                            v-model="uploadUser"
                            class="w-full h-10 px-3 bg-wf-surface border border-wf-border rounded-wf-md text-sm text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                        >
                            <option :value="null">-- Select Person (Optional) --</option>
                            <option v-for="u in users" :key="u.id" :value="u">
                                {{ u.full_name }} ({{ u.email }})
                            </option>
                        </select>
                    </div>

                    <!-- Target Account Select -->
                    <div class="space-y-1.5 text-left">
                        <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                            Target Account
                        </label>
                        <select
                            v-model="uploadAccount"
                            class="w-full h-10 px-3 bg-wf-surface border border-wf-border rounded-wf-md text-sm text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                        >
                            <option :value="null">-- Auto Detect from Statement --</option>
                            <option v-for="a in accounts" :key="a.id" :value="a">
                                {{ a.name }} (XX{{ a.account_mask || '????' }})
                            </option>
                        </select>
                    </div>
                </div>

                <!-- PDF File Upload -->
                <div class="space-y-1.5 text-left">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                        PDF Statement File <span class="text-wf-error">*</span>
                    </label>
                    <input
                        type="file"
                        accept="application/pdf"
                        @change="handleFileInput"
                        class="w-full text-xs text-wf-text-secondary file:mr-3 file:py-2 file:px-3.5 file:rounded-wf-md file:border-0 file:text-xs file:font-semibold file:bg-wf-primary file:text-white hover:file:bg-wf-primary-hover file:cursor-pointer cursor-pointer border border-wf-border rounded-wf-md p-1.5 bg-wf-surface"
                    />
                </div>

                <!-- PDF Password Field -->
                <div class="space-y-1.5 text-left">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                        PDF Password (If Encrypted)
                    </label>
                    <div class="relative flex items-center">
                        <input
                            v-model="uploadPassword"
                            :type="showPassword ? 'text' : 'password'"
                            placeholder="Leave blank if not protected"
                            class="w-full h-10 px-3 pr-10 bg-wf-surface border border-wf-border rounded-wf-md text-sm text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                        />
                        <button
                            type="button"
                            @click="showPassword = !showPassword"
                            class="absolute right-3 text-wf-text-muted hover:text-wf-text-primary p-1 rounded-wf-sm"
                        >
                            <Eye v-if="!showPassword" class="w-4 h-4" />
                            <EyeOff v-else class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Smart Password Prefill Notification -->
                <WfAlert v-if="uploadUser" variant="info">
                    Password suggested automatically based on <strong>{{ uploadUser.full_name }}</strong>'s profile ({{ uploadUser.dob ? 'DOB' : 'PAN' }} logic).
                </WfAlert>
            </div>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="uploadDialog = false">
                    Cancel
                </WfButton>
                <WfButton variant="primary" size="sm" :disabled="!uploadFile" @click="handleUpload" :loading="store.loading">
                    <Upload class="w-4 h-4 mr-1.5" />
                    <span>Process Statement</span>
                </WfButton>
            </template>
        </WfModal>

        <!-- MODAL: Decrypt & Reprocess Statement -->
        <WfModal v-model="retryDialog" title="Decrypt Statement" description="Enter the password for protected PDF decryption." maxWidth="md">
            <div class="space-y-4">
                <p class="text-xs text-wf-text-secondary">
                    Provide password for <strong>{{ selectedStatementForRetry?.filename }}</strong>:
                </p>

                <div class="space-y-1.5 text-left">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                        PDF Password
                    </label>
                    <div class="relative flex items-center">
                        <input
                            v-model="retryPassword"
                            :type="showRetryPassword ? 'text' : 'password'"
                            placeholder="Enter password..."
                            autofocus
                            @keyup.enter="handleRetry"
                            class="w-full h-10 px-3 pr-10 bg-wf-surface border border-wf-border rounded-wf-md text-sm text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                        />
                        <button
                            type="button"
                            @click="showRetryPassword = !showRetryPassword"
                            class="absolute right-3 text-wf-text-muted hover:text-wf-text-primary p-1 rounded-wf-sm"
                        >
                            <Eye v-if="!showRetryPassword" class="w-4 h-4" />
                            <EyeOff v-else class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="retryDialog = false">
                    Cancel
                </WfButton>
                <WfButton variant="primary" size="sm" :disabled="!retryPassword" @click="handleRetry" :loading="store.loading">
                    <CheckCircle2 class="w-4 h-4 mr-1.5" />
                    <span>Decrypt & Reprocess</span>
                </WfButton>
            </template>
        </WfModal>

        <!-- MODAL: Delete Statement Confirmation -->
        <WfModal v-model="deleteDialog" title="Delete Statement?" maxWidth="sm">
            <div class="space-y-3 text-center">
                <div class="w-12 h-12 rounded-wf-pill bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                    <Trash2 class="w-6 h-6" />
                </div>
                <p class="text-xs text-wf-text-secondary">
                    Are you sure you want to delete this statement? This action cannot be undone and will remove the file from your Vault.
                </p>
            </div>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="deleteDialog = false">
                    Cancel
                </WfButton>
                <WfButton variant="danger" size="sm" @click="confirmDeleteStatement">
                    <span>Yes, Delete Statement</span>
                </WfButton>
            </template>
        </WfModal>

        <!-- MODAL: Re-assign Account -->
        <WfModal v-model="reassignDialog" title="Re-assign Account" description="Correct account detection if the statement was linked to the wrong account." maxWidth="md">
            <div class="space-y-4">
                <p class="text-xs text-wf-text-secondary">
                    Select the correct target account for this statement below:
                </p>

                <div class="space-y-1.5 text-left">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                        Target Account
                    </label>
                    <select
                        v-model="reassignAccountId"
                        class="w-full h-10 px-3 bg-wf-surface border border-wf-border rounded-wf-md text-sm text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                    >
                        <option :value="null">-- Select Account --</option>
                        <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                            {{ acc.name }} (Mask: XX{{ acc.account_mask || '????' }})
                        </option>
                    </select>
                </div>
            </div>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="reassignDialog = false">
                    Cancel
                </WfButton>
                <WfButton variant="primary" size="sm" :disabled="!reassignAccountId" @click="confirmReassign" :loading="reassigning">
                    <span>Update Account</span>
                </WfButton>
            </template>
        </WfModal>

        <!-- MODAL: Bulk Ingest Transactions -->
        <WfModal v-model="bulkIngestDialog" title="Confirm Bulk Ingestion" description="Review categories and ingestion rules for selected transactions." maxWidth="xl">
            <div class="space-y-4 max-h-[60vh] overflow-y-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="border-b border-wf-border bg-wf-surface-variant/40 text-[10px] font-bold text-wf-text-muted uppercase">
                            <th class="py-2 px-3">Description</th>
                            <th class="py-2 px-3 text-right">Amount</th>
                            <th class="py-2 px-3 min-w-[200px]">Category</th>
                            <th class="py-2 px-3 text-center">Save Rule</th>
                            <th class="py-2 px-3 text-center">Hide Analytics</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-wf-border-subtle bg-wf-surface">
                        <tr v-for="item in bulkIngestItems" :key="item.transaction_id" class="hover:bg-wf-surface-variant/30">
                            <td class="py-2 px-3">
                                <div class="font-semibold text-wf-text-primary truncate max-w-[200px]" :title="item.description">
                                    {{ item.description }}
                                </div>
                                <div class="text-[10px] text-wf-text-muted">{{ formatTxnDate(item.date) }}</div>
                            </td>

                            <td class="py-2 px-3 text-right font-bold tabular-nums">
                                {{ formatCurrency(item.amount) }}
                            </td>

                            <td class="py-2 px-3">
                                <select
                                    v-model="item.category"
                                    class="w-full h-8 text-xs bg-wf-surface border border-wf-border rounded-wf-md px-2 focus:outline-none focus:ring-1 focus:ring-wf-primary"
                                >
                                    <option :value="null">-- Select Category --</option>
                                    <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                                        {{ opt.title }}
                                    </option>
                                </select>
                            </td>

                            <td class="py-2 px-3 text-center">
                                <input
                                    type="checkbox"
                                    v-model="item.create_rule"
                                    class="rounded-wf-xs border-slate-300 text-wf-primary focus:ring-wf-primary cursor-pointer w-3.5 h-3.5"
                                />
                            </td>

                            <td class="py-2 px-3 text-center">
                                <input
                                    type="checkbox"
                                    v-model="item.exclude_from_reports"
                                    class="rounded-wf-xs border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="bulkIngestDialog = false">
                    Cancel
                </WfButton>
                <WfButton variant="primary" size="sm" :disabled="!canConfirmBulkIngest" @click="confirmBulkIngest">
                    <CheckCircle2 class="w-4 h-4 mr-1.5" />
                    <span>Confirm Import</span>
                </WfButton>
            </template>
        </WfModal>
    </MainLayout>
</template>
