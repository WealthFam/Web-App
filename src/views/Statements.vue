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
    Search as SearchIcon
} from 'lucide-vue-next'

import MainLayout from '@/layouts/MainLayout.vue'
import apiClient, { financeApi } from '@/api/client'
import { useStatementStore } from '@/stores/finance/statements'
import { useNotificationStore } from '@/stores/notification'
import { format } from 'date-fns'

const store = useStatementStore()
const notification = useNotificationStore()

const selectedStatement = ref<any>(null)
const uploadDialog = ref(false)
const uploadFile = ref<File | null>(null)
const uploadPassword = ref('')
const showPassword = ref(false)
const uploadUser = ref<any>(null)
const uploadAccount = ref<any>(null)
const syncDialog = ref(false)
const syncDate = ref(new Date().toISOString().substr(0, 10))
const syncing = ref(false)
const search = ref('')

const retryDialog = ref(false)
const retryPassword = ref('')
const showRetryPassword = ref(false)
const selectedStatementForRetry = ref<any>(null)


const pdfUrl = ref('')
const activeTab = ref('transactions')

// Vault Preview State

const statementPage = ref(1)
const statementPageSize = 8

const txnPage = ref(1)
const txnLimit = ref(10)
const headers: any[] = [
    { title: 'Date', key: 'date', sortable: true, align: 'start' },
    { title: 'Description', key: 'description', sortable: true, align: 'start' },
    { title: 'Category', key: 'category_suggestion', sortable: true, align: 'start' },
    { title: 'Amount', key: 'amount', align: 'end', sortable: true },
    { title: 'Status', key: 'status', align: 'center', sortable: false },
]

const users = ref<any[]>([])
const accounts = ref<any[]>([])
const categories = ref<any[]>([])

const selectedTransactions = ref<string[]>([])
const bulkIngestDialog = ref(false)
const bulkIngestItems = ref<{ transaction_id: string, description: string, amount: number, date: string, category: string | null, create_rule: boolean, exclude_from_reports: boolean }[]>([])



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

async function selectStatement(s: any) {
    selectedStatement.value = s
    selectedTransactions.value = []
    
    if (s.vault_id) {
        pdfUrl.value = financeApi.getDocumentViewUrl(s.vault_id)
        loadAttachment(s.vault_id)
    } else {
        pdfUrl.value = ''
        attachmentUrl.value = null
    }
    
    // Ensure activeTab is reset if the new statement doesn't have the current tab's data
    if (activeTab.value === 'attachment' && !s.vault_id) activeTab.value = 'transactions'
    if (activeTab.value === 'email' && !s.email_body) activeTab.value = 'transactions'
    
    await store.fetchTransactions(s.id)
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

function openRetryDialog(s: any) {
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
            s.filename === selectedStatementForRetry.value.filename && 
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



function getStatusColor(status: string) {
    switch (status) {
        case 'PARSED': return 'success'
        case 'PENDING': return 'warning'
        case 'FAILED': return 'error'
        default: return 'slate-400'
    }
}

function formatDate(date: string) {
    if (!date) return 'N/A'
    return format(new Date(date), 'MMM dd, yyyy HH:mm')
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



const deleteDialog = ref(false)
const statementToDelete = ref<string | null>(null)

const reassignDialog = ref(false)
const reassignAccountId = ref<string | null>(null)
const reassigning = ref(false)

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


const attachmentUrl = ref<string | null>(null)

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
</script>

<template>
    <MainLayout>
        <v-container fluid class="page-container dashboard-page statements-page py-6">
            <!-- Animated Mesh Background -->
            <div class="mesh-blob blob-1"></div>
            <div class="mesh-blob blob-2"></div>

            <div class="relative-pos z-10">
                <!-- Header -->
                <div class="d-flex align-center justify-space-between mb-4">
                    <div>
                        <h1 class="text-h5 font-weight-black mb-1 gradient-text">Account Statements</h1>
                        <p class="text-slate-500 font-weight-medium">Automated reconciliation and transaction discovery</p>
                    </div>
                    <div class="d-flex gap-3">
                        <v-btn variant="tonal" color="primary" rounded="pill" height="44" @click="syncDialog = true" :loading="syncing">
                            <template v-slot:prepend>
                                <RefreshCw :size="20" :class="{ 'spin': syncing }" />
                            </template>
                            Sync Emails
                        </v-btn>
                        <v-btn color="primary" rounded="pill" elevation="0" height="44" @click="uploadDialog = true">
                            <template v-slot:prepend>
                                <Upload :size="20" />
                            </template>
                            Upload Statement
                        </v-btn>
                    </div>
                </div>

                <v-row>
                    <!-- Left Sidebar: Statements List -->
                    <v-col cols="12" md="4">
                        <v-card rounded="xl" border flat class="glass-card h-full flex flex-col overflow-hidden">
                            <!-- Premium Toolbar -->
                            <div class="premium-toolbar px-4 d-flex align-center bg-white border-b" style="height: 64px;">
                                <FileText :size="20" class="mr-2 text-primary flex-shrink-0" />
                                
                                <v-text-field
                                    v-model="search"
                                    placeholder="Search statements..."
                                    variant="solo-filled"
                                    flat
                                    hide-details
                                    density="compact"
                                    rounded="pill"
                                    class="mx-2 transition-all duration-300 shadow-sm flex-grow-1"
                                >
                                    <template v-slot:prepend-inner>
                                        <SearchIcon :size="18" class="text-slate-400" />
                                    </template>
                                </v-text-field>

                                <v-spacer></v-spacer>
                            </div>

                            <v-list class="pa-2 bg-transparent overflow-y-auto flex-grow-1" style="max-height: calc(100vh - 350px)">
                                <v-list-item
                                    v-for="s in store.statements"
                                    :key="s.id"
                                    @click="selectStatement(s)"
                                    :active="selectedStatement?.id === s.id"
                                    rounded="lg"
                                    class="mb-2 statement-item"
                                    :color="selectedStatement?.id === s.id ? 'primary' : ''"
                                    height="72"
                                >
                                    <template v-slot:prepend>
                                        <div class="icon-box mr-4" :class="`bg-${getStatusColor(s.status)}-lighten-5`">
                                            <CheckCircle2 v-if="s.status === 'PARSED'" :size="20" class="text-success" />
                                            <Lock v-else-if="s.status === 'PENDING'" :size="20" class="text-warning" />
                                            <AlertCircle v-else-if="s.status === 'FAILED'" :size="20" class="text-error" />
                                            <FileText v-else :size="20" :class="`text-${getStatusColor(s.status)}`" />
                                        </div>
                                    </template>

                                    <v-list-item-title class="font-weight-black text-caption text-truncate">{{ s.filename }}</v-list-item-title>
                                    <v-list-item-subtitle class="text-tiny mt-1 d-flex flex-wrap align-center opacity-70 gap-x-2">
                                        <span class="d-flex align-center"><Clock :size="12" class="mr-1" /> {{ formatDate(s.created_at) }}</span>
                                        <span v-if="s.email_sender" class="d-flex align-center text-primary font-weight-black">
                                            <Landmark :size="12" class="mr-1" /> {{ s.email_sender.split('@')[0] }}
                                        </span>
                                        <span v-else-if="s.source === 'MANUAL'" class="d-flex align-center">
                                            <User :size="12" class="mr-1" /> Manual
                                        </span>
                                        <v-chip size="x-small" :color="getStatusColor(s.status)" class="font-weight-black text-tiny" variant="tonal">
                                            {{ s.status }}
                                        </v-chip>
                                    </v-list-item-subtitle>

                                    <template v-slot:append>
                                        <ArrowRight :size="16" class="opacity-30" />
                                    </template>
                                </v-list-item>

                                <div v-if="store.statements.length === 0" class="pa-10 text-center opacity-40 mx-auto">
                                    <FileText :size="48" class="mb-4 mx-auto" />
                                    <p class="font-weight-bold">No statements found</p>
                                </div>
                            </v-list>
                            
                            <div v-if="store.totalStatements > statementPageSize" class="pa-4 border-t d-flex justify-center bg-slate-50">
                                <v-pagination
                                    v-model="statementPage"
                                    :length="Math.ceil(store.totalStatements / statementPageSize)"
                                    density="comfortable"
                                    rounded="pill"
                                    size="small"
                                    active-color="primary"
                                    total-visible="3"
                                ></v-pagination>
                            </div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" md="8">
                        <!-- Statement Detail Hero -->
                        <v-card v-if="selectedStatement" rounded="xl" border flat class="glass-card h-full d-flex flex-column overflow-hidden">
                            <!-- Premium Detail Header -->
                            <div class="pa-6 border-b bg-white/80 backdrop-blur-xl sticky-top z-10">
                                <div class="d-flex align-start justify-space-between mb-4">
                                    <div class="d-flex align-center overflow-hidden">
                                        <div class="icon-box-medium mr-4 bg-slate-900 rounded-xl shadow-lg flex-shrink-0">
                                            <FileText :size="24" class="text-white" />
                                        </div>
                                        <div class="overflow-hidden">
                                            <div class="d-flex align-center gap-2 mb-1">
                                                <v-chip size="x-small" :color="getStatusColor(selectedStatement.status)" variant="flat" class="font-weight-black text-tiny px-2 rounded-lg">
                                                    {{ selectedStatement.status }}
                                                </v-chip>
                                                <v-chip size="x-small" color="slate-400" variant="outlined" class="font-weight-bold text-tiny px-2 rounded-lg border-slate-200">
                                                    <template v-slot:prepend>
                                                        <Mail v-if="selectedStatement.source === 'EMAIL'" :size="10" class="mr-1" />
                                                        <Upload v-else :size="10" class="mr-1" />
                                                    </template>
                                                    {{ selectedStatement.source }}
                                                </v-chip>
                                            </div>
                                            <div class="text-h5 font-weight-black text-slate-800 line-height-tight text-truncate max-w-[500px]">
                                                {{ selectedStatement.filename }}
                                            </div>
                                            <div class="text-caption font-weight-bold text-slate-400 mt-1 d-flex align-center">
                                                <Clock :size="12" class="mr-1 opacity-50" />
                                                Ingested {{ formatDate(selectedStatement.created_at) }}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="d-flex align-center">
                                        <v-btn 
                                            v-if="selectedTransactions.length > 0"
                                            color="primary" 
                                            rounded="pill" 
                                            elevation="0"
                                            @click="openBulkIngestDialog"
                                            height="36"
                                            class="px-6 font-weight-bold mr-2"
                                        >
                                            <template v-slot:prepend><CheckCircle2 :size="16" /></template>
                                            Ingest ({{ selectedTransactions.length }})
                                        </v-btn>

                                        <v-btn icon variant="text" color="primary" @click="reevaluateStatement(selectedStatement.id)" class="ml-1 border rounded-lg">
                                            <v-tooltip activator="parent" location="top">Re-evaluate Statement</v-tooltip>
                                            <RefreshCw :size="18" />
                                        </v-btn>
                                        
                                        <v-btn icon variant="text" color="error" @click="promptDeleteStatement(selectedStatement.id)" class="ml-1 border rounded-lg">
                                            <v-tooltip activator="parent" location="top">Delete Statement</v-tooltip>
                                            <Trash2 :size="18" />
                                        </v-btn>
                                    </div>
                                </div>

                                <!-- Metadata Row -->
                                <div class="d-flex align-center gap-6 text-caption font-weight-bold text-slate-500 overflow-x-auto no-scrollbar">
                                    <div class="d-flex align-center flex-shrink-0">
                                        <Landmark :size="14" class="mr-2 text-slate-300" />
                                        <span class="mr-1">Account:</span>
                                        <span class="text-slate-800">{{ getAccountName(selectedStatement.account_id) }}</span>
                                        <v-btn variant="text" size="x-small" color="primary" class="ml-1 px-1 font-weight-black text-none" @click="reassignDialog = true">Change</v-btn>
                                    </div>
                                    <div v-if="selectedStatement.email_sender" class="d-flex align-center flex-shrink-0 border-l pl-6">
                                        <User :size="14" class="mr-2 text-slate-300" />
                                        <span class="mr-1">Sender:</span>
                                        <span class="text-slate-800">{{ selectedStatement.email_sender }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Tabbed Content Area -->
                            <div class="flex-grow-1 overflow-hidden d-flex flex-column">
                                <v-tabs v-model="activeTab" color="primary" align-tabs="start" density="comfortable" class="border-b bg-slate-50/50">
                                    <v-tab value="transactions" class="text-none font-weight-black">
                                        <Table :size="16" class="mr-2" />
                                        Transactions
                                    </v-tab>
                                    <v-tab value="attachment" class="text-none font-weight-black">
                                        <Eye :size="16" class="mr-2" />
                                        Attachment
                                    </v-tab>
                                    <v-tab value="email" class="text-none font-weight-black">
                                        <Mail :size="16" class="mr-2" />
                                        Email Content
                                    </v-tab>
                                </v-tabs>

                                <div class="flex-grow-1 overflow-hidden relative bg-white">
                                    <!-- Tab 1: Transactions / Reconciliation -->
                                    <div v-if="activeTab === 'transactions'" class="h-full d-flex flex-column">
                                        <!-- Status specific Action Bar (Only for Parse fail/pending) -->
                                        <div v-if="selectedStatement.status === 'PENDING'" class="pa-10 d-flex flex-column align-center justify-center bg-slate-50/50 flex-grow-1">
                                            <div class="icon-box-huge mb-6 bg-warning-lighten-5">
                                                <Lock :size="64" class="text-warning" />
                                            </div>
                                            <h2 class="text-h5 font-weight-black mb-2 text-slate-800">Decryption Required</h2>
                                            <p class="text-slate-500 font-weight-medium mb-8 max-w-[400px] text-center">
                                                This statement is password protected. Please provide the password to extract transactions.
                                            </p>
                                            <v-btn color="warning" rounded="pill" elevation="0" height="44" class="px-8 font-weight-black" @click="openRetryDialog(selectedStatement)">
                                                <template v-slot:prepend><Lock :size="20"/></template>
                                                Enter Password
                                            </v-btn>
                                        </div>

                                        <div v-else-if="selectedStatement.status === 'FAILED'" class="pa-10 d-flex flex-column align-center justify-center bg-slate-50/50 flex-grow-1">
                                            <div class="icon-box-huge mb-6 bg-error-lighten-5">
                                                <AlertCircle :size="64" class="text-error" />
                                            </div>
                                            <h2 class="text-h5 font-weight-black mb-2 text-slate-800">Processing Failed</h2>
                                            <p class="text-error font-weight-bold mb-2 text-center" style="max-width: 500px; word-break: break-word;">
                                                {{ (selectedStatement.failure_reason || 'An unexpected error occurred during ingestion.').replace(/^(PASSWORD_FAILED|PARSE_FAILED|ACCOUNT_NOT_FOUND):\s*/, '') }}
                                            </p>
                                            
                                            <!-- Smart recovery: ACCOUNT_NOT_FOUND -->
                                            <template v-if="selectedStatement.failure_reason?.startsWith('ACCOUNT_NOT_FOUND:')">
                                                <p class="text-slate-500 font-weight-medium mb-8 max-w-[400px] text-center">
                                                    The account mask in the PDF doesn't match any linked account. Link the correct account to continue.
                                                </p>
                                                <v-btn color="primary" rounded="pill" elevation="0" height="44" class="px-8 font-weight-black" @click="reassignDialog = true">
                                                    <template v-slot:prepend><Landmark :size="20"/></template>
                                                    Link Account Manually
                                                </v-btn>
                                            </template>
                                            
                                            <!-- Smart recovery: PASSWORD_FAILED -->
                                            <template v-else-if="selectedStatement.failure_reason?.startsWith('PASSWORD_FAILED:')">
                                                <p class="text-slate-500 font-weight-medium mb-8 max-w-[400px] text-center">
                                                    The statement could not be decrypted. Please provide the correct password.
                                                </p>
                                                <v-btn color="warning" rounded="pill" elevation="0" height="44" class="px-8 font-weight-black" @click="openRetryDialog(selectedStatement)">
                                                    <template v-slot:prepend><Lock :size="20"/></template>
                                                    Enter Password
                                                </v-btn>
                                            </template>
                                            
                                            <!-- Smart recovery: PARSE_FAILED or generic -->
                                            <template v-else>
                                                <p class="text-slate-500 font-weight-medium mb-8 max-w-[400px] text-center">
                                                    The statement parser encountered an error. You can try providing a password or linking a different account.
                                                </p>
                                                <div class="d-flex gap-3">
                                                    <v-btn color="warning" rounded="pill" elevation="0" height="44" class="px-6 font-weight-black" @click="openRetryDialog(selectedStatement)">
                                                        <template v-slot:prepend><Lock :size="20"/></template>
                                                        Try Password
                                                    </v-btn>
                                                    <v-btn color="primary" variant="tonal" rounded="pill" elevation="0" height="44" class="px-6 font-weight-black" @click="reassignDialog = true">
                                                        <template v-slot:prepend><Landmark :size="20"/></template>
                                                        Link Account
                                                    </v-btn>
                                                </div>
                                            </template>
                                        </div>

                                        <!-- Reconciliation Table -->
                                        <div v-else-if="selectedStatement.status === 'PARSED'" class="flex-grow-1 overflow-hidden d-flex flex-column">
                                            <v-data-table-server
                                                v-model="selectedTransactions"
                                                :headers="headers"
                                                :items="store.currentTransactions"
                                                :items-length="store.totalTransactions"
                                                :items-per-page="10"
                                                :loading="store.loading"
                                                show-select
                                                hover
                                                class="premium-table flex-grow-1 bg-transparent"
                                                item-value="id"
                                                @update:options="({page}) => {
                                                    txnPage = page;
                                                }"
                                            >
                                                <!-- Date Column -->
                                                <template v-slot:item.date="{ item }">
                                                    <span class="font-weight-bold text-caption tabular-nums text-slate-500">
                                                        {{ formatDate(item.date) }}
                                                    </span>
                                                </template>

                                                <!-- Description Column -->
                                                <template v-slot:item.description="{ item }">
                                                    <div class="font-weight-black text-caption text-truncate max-w-[250px]">
                                                        {{ item.description }}
                                                    </div>
                                                </template>

                                                <!-- Category Column -->
                                                <template v-slot:item.category_suggestion="{ item }">
                                                    <v-chip 
                                                        v-if="item.category_suggestion && item.category_suggestion !== 'Uncategorized'" 
                                                        size="x-small" 
                                                        color="primary" 
                                                        variant="tonal" 
                                                        class="font-weight-bold text-tiny"
                                                    >
                                                        {{ item.category_suggestion }}
                                                    </v-chip>
                                                    <span v-else class="text-tiny opacity-40 font-weight-bold">Uncategorized</span>
                                                </template>

                                                <!-- Amount Column -->
                                                <template v-slot:item.amount="{ item }">
                                                    <div class="text-right font-weight-black tabular-nums" :class="item.type === 'DEBIT' ? 'text-red' : 'text-success'">
                                                        {{ item.type === 'DEBIT' ? '-' : '+' }}{{ formatCurrency(item.amount) }}
                                                    </div>
                                                </template>

                                                <!-- Status Column -->
                                                <template v-slot:item.status="{ item }">
                                                    <div class="text-center">
                                                        <v-tooltip location="top">
                                                            <template v-slot:activator="{ props }">
                                                                <div v-bind="props" class="d-inline-flex align-center">
                                                                    <CheckCircle2 v-if="item.is_reconciled" :size="18" class="text-success" />
                                                                    <AlertCircle v-else :size="18" class="text-warning" />
                                                                </div>
                                                            </template>
                                                            <span>{{ item.is_reconciled ? 'Matched with Ledger' : 'Not in Ledger' }}</span>
                                                        </v-tooltip>
                                                    </div>
                                                </template>

                                                <!-- Premium Pagination Footer -->
                                                <template v-slot:bottom>
                                                    <div class="pa-4 border-t d-flex align-center justify-space-between bg-slate-50 overflow-x-auto">
                                                        <div class="d-flex align-center gap-4">
                                                            <div class="text-tiny font-weight-black text-slate-400 uppercase letter-spacing-1 mr-4">
                                                                Total {{ store.totalTransactions }} Items
                                                            </div>
                                                            <div class="d-flex align-center text-tiny font-weight-bold text-slate-500">
                                                                <span class="mr-2">Rows:</span>
                                                                <v-select
                                                                    :items="[10, 25, 50]"
                                                                    v-model="txnLimit"
                                                                    variant="plain"
                                                                    density="compact"
                                                                    hide-details
                                                                    class="limit-select"
                                                                    style="width: 60px;"
                                                                ></v-select>
                                                            </div>
                                                        </div>
                                                        <div class="d-flex align-center">
                                                            <span class="text-tiny font-weight-bold text-slate-500 mr-4 tabular-nums">
                                                                {{ (txnPage - 1) * txnLimit + 1 }}-{{ Math.min(txnPage * txnLimit, store.totalTransactions) }} of {{ store.totalTransactions }}
                                                            </span>
                                                            <v-pagination
                                                                v-model="txnPage"
                                                                :length="Math.ceil(store.totalTransactions / txnLimit)"
                                                                density="comfortable"
                                                                rounded="pill"
                                                                size="small"
                                                                active-color="primary"
                                                                total-visible="3"
                                                            ></v-pagination>
                                                        </div>
                                                    </div>
                                                </template>
                                            </v-data-table-server>
                                        </div>
                                    </div>

                                    <!-- Tab 2: Attachment (PDF Viewer) -->
                                    <div v-if="activeTab === 'attachment'" class="h-full relative overflow-hidden">
                                        <div class="h-full relative">
                                            <div v-if="!selectedStatement.vault_id" class="d-flex flex-column align-center justify-center h-full text-slate-400 pa-10">
                                                <AlertCircle :size="48" class="mb-4 opacity-20" />
                                                <div class="text-h6 font-weight-bold">No Attachment Found</div>
                                                <div class="text-caption">This statement record does not have an associated source file.</div>
                                            </div>
                                            <!-- Fallback to direct View URL if Blob is not ready -->
                                            <iframe 
                                                v-else-if="attachmentUrl || pdfUrl"
                                                :src="attachmentUrl || pdfUrl" 
                                                class="w-full h-full border-0"
                                                style="min-height: 800px; width: 100%; background: white; display: block;"
                                            ></iframe>
                                            <div v-else class="d-flex align-center justify-center h-full">
                                                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tab 3: Email Content -->
                                    <div v-if="activeTab === 'email'" class="h-full overflow-y-auto pa-8 bg-white">
                                        <div class="premium-card pa-6 rounded-xl border bg-white shadow-sm mb-6">
                                            <div class="d-flex align-center mb-6">
                                                <v-avatar color="primary-lighten-5" class="mr-4">
                                                    <Mail :size="24" class="text-primary" />
                                                </v-avatar>
                                                <div>
                                                    <div class="text-caption font-weight-bold text-slate-400 uppercase">From</div>
                                                    <div class="text-h6 font-weight-black text-slate-800">{{ selectedStatement.email_sender || 'Unknown Sender' }}</div>
                                                </div>
                                            </div>
                                            
                                            <v-divider class="mb-6"></v-divider>
                                            
                                            <div class="text-caption font-weight-bold text-slate-400 uppercase mb-3">Message Content</div>
                                            
                                            <!-- HTML Content (Rendered in Sandboxed Iframe) -->
                                            <div v-if="selectedStatement.email_body" class="bg-white rounded-lg border overflow-hidden" style="min-height: 500px;">
                                                <iframe 
                                                    :srcdoc="selectedStatement.email_body"
                                                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                                                    class="w-full h-full border-0"
                                                    style="min-height: 500px; width: 100%; display: block;"
                                                ></iframe>
                                            </div>
                                            
                                            <div v-else class="pa-10 text-center bg-slate-50 rounded-lg border border-dashed">
                                                <Mail :size="32" class="mx-auto mb-2 text-slate-300" />
                                                <div class="text-caption font-weight-bold text-slate-400">No plain-text content captured for this email.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </v-card>

                        <!-- Empty State -->
                        <v-card v-else rounded="xl" border flat class="glass-card h-full d-flex flex-column align-center justify-center pa-10 opacity-60 min-h-[600px]">
                            <div class="icon-box-huge mb-6">
                                <FileText :size="64" class="text-slate-200" />
                            </div>
                            <h2 class="text-h5 font-weight-black mb-2 text-slate-400">No Statement Selected</h2>
                            <p class="text-slate-400 font-weight-medium">Select a statement from the left to view reconciliation</p>
                        </v-card>
                    </v-col>
                </v-row>
            </div>

            <!-- Sync Confirmation Dialog -->
            <v-dialog v-model="syncDialog" max-width="400">
                <v-card rounded="xl" class="pa-4 premium-popup">
                    <v-card-title class="text-h6 font-weight-black d-flex align-center">
                        <RefreshCw :size="24" class="mr-3 text-primary" />
                        Sync Statements
                    </v-card-title>
                    <v-card-text class="pt-4">
                        <p class="text-slate-500 mb-4 font-weight-medium">Select how far back you want to scan your email inboxes.</p>
                        
                        <v-text-field
                            v-model="syncDate"
                            type="date"
                            label="Scan Since"
                            variant="outlined"
                            rounded="lg"
                            hide-details
                        ></v-text-field>
                        
                        <div class="mt-4 pa-3 bg-slate-50 rounded-lg border text-caption text-slate-500 italic">
                            Note: Manual scans do not update the automatic sync schedule.
                        </div>
                    </v-card-text>
                    <v-card-actions class="pt-2 px-4 pb-4">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" color="slate-500" rounded="pill" height="44" @click="syncDialog = false">
                            Cancel
                        </v-btn>
                        <v-btn color="primary" rounded="pill" elevation="0" height="44" @click="triggerSync" :loading="syncing">
                            <template v-slot:prepend>
                                <CheckCircle2 :size="18" />
                            </template>
                            Start Sync
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Upload Dialog -->
            <v-dialog v-model="uploadDialog" max-width="550" persistent>
                <v-card rounded="xl" class="pa-4 premium-popup overflow-visible">
                    <v-card-title class="text-h6 font-weight-black d-flex justify-space-between align-center">
                        Upload Account Statement
                        <v-btn icon variant="text" size="small" @click="uploadDialog = false">
                            <X :size="20" />
                        </v-btn>
                    </v-card-title>
                    
                    <v-card-text class="mt-4">
                        <v-row>
                            <v-col cols="12" sm="6">
                                <v-autocomplete
                                    v-model="uploadUser"
                                    :items="users"
                                    item-title="full_name"
                                    return-object
                                    label="Statement Owner"
                                    placeholder="Search person..."
                                    variant="outlined"
                                    rounded="lg"
                                    hide-details
                                >
                                    <template v-slot:prepend-inner>
                                        <User :size="18" class="mr-2 text-slate-400" />
                                    </template>
                                </v-autocomplete>
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-autocomplete
                                    v-model="uploadAccount"
                                    :items="accounts"
                                    item-title="name"
                                    return-object
                                    label="Target Account"
                                    placeholder="Search account..."
                                    variant="outlined"
                                    rounded="lg"
                                    hide-details
                                >
                                    <template v-slot:prepend-inner>
                                        <Landmark :size="18" class="mr-2 text-slate-400" />
                                    </template>
                                </v-autocomplete>
                            </v-col>
                        </v-row>

                        <v-file-input
                            v-model="uploadFile"
                            label="Select PDF Statement"
                            accept="application/pdf"
                            prepend-icon=""
                            variant="outlined"
                            rounded="lg"
                            class="mt-4"
                        >
                            <template v-slot:prepend-inner>
                                <FileText :size="20" class="mr-2 text-primary" />
                            </template>
                        </v-file-input>

                        <v-text-field
                            v-model="uploadPassword"
                            label="PDF Password"
                            placeholder="Leave blank if not protected"
                            :type="showPassword ? 'text' : 'password'"
                            variant="outlined"
                            rounded="lg"
                            class="mt-4"
                        >
                            <template v-slot:prepend-inner>
                                <Lock :size="20" class="mr-2 text-slate-400" />
                            </template>
                            <template v-slot:append-inner>
                                <v-btn icon variant="text" size="small" @click="showPassword = !showPassword" class="mt-n1">
                                    <Eye v-if="!showPassword" :size="18" />
                                    <EyeOff v-else :size="18" />
                                </v-btn>
                            </template>
                        </v-text-field>

                        <div v-if="uploadUser" class="bg-blue-lighten-5 pa-4 rounded-lg mt-4 d-flex align-start animate-in">
                            <AlertCircle :size="18" class="text-blue mr-3 mt-1" />
                            <div class="text-caption text-blue font-weight-medium">
                                Password prefilled based on <strong>{{ uploadUser.full_name }}</strong>'s profile ({{ uploadUser.dob ? 'DOB' : 'PAN' }} logic).
                            </div>
                        </div>
                    </v-card-text>

                    <v-card-actions class="pa-4">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" rounded="pill" class="text-none font-weight-black" @click="uploadDialog = false">
                            <template v-slot:prepend><X :size="18" /></template>
                            Cancel
                        </v-btn>
                        <v-btn color="primary" rounded="pill" elevation="0" class="text-none px-8 font-weight-black" :disabled="!uploadFile" @click="handleUpload" :loading="store.loading">
                            <template v-slot:prepend><Upload :size="20" /></template>
                            Process Statement
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Retry Password Dialog -->
            <v-dialog v-model="retryDialog" max-width="450">
                <v-card rounded="xl" class="pa-4 premium-popup">
                    <v-card-title class="text-h6 font-weight-black d-flex align-center">
                        <Lock :size="24" class="mr-3 text-warning" />
                        Decrypt Statement
                    </v-card-title>
                    <v-card-text class="pt-4">
                        <p class="text-slate-500 mb-4 font-weight-medium">
                            Enter the password for <strong>{{ selectedStatementForRetry?.filename }}</strong>.
                        </p>
                        
                        <v-text-field
                            v-model="retryPassword"
                            label="PDF Password"
                            :type="showRetryPassword ? 'text' : 'password'"
                            variant="outlined"
                            rounded="lg"
                            autofocus
                            @keyup.enter="handleRetry"
                        >
                            <template v-slot:append-inner>
                                <v-btn icon variant="text" size="small" @click="showRetryPassword = !showRetryPassword">
                                    <Eye v-if="!showRetryPassword" :size="18" />
                                    <EyeOff v-else :size="18" />
                                </v-btn>
                            </template>
                        </v-text-field>
                    </v-card-text>
                    <v-card-actions class="pt-2 px-4 pb-4">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" color="slate-500" rounded="pill" height="44" @click="retryDialog = false">
                            <template v-slot:prepend><X :size="18" /></template>
                            Cancel
                        </v-btn>
                        <v-btn color="warning" rounded="pill" elevation="0" height="44" @click="handleRetry" :loading="store.loading" :disabled="!retryPassword">
                            <template v-slot:prepend>
                                <CheckCircle2 :size="18" />
                            </template>
                            Decrypt & Parse
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            <!-- Delete Confirmation Dialog -->
            <v-dialog v-model="deleteDialog" max-width="400">
                <v-card rounded="xl" class="pa-4 text-center">
                    <div class="icon-box-large bg-error-lighten-5 mx-auto mb-4 mt-2">
                        <Trash2 :size="28" class="text-error" />
                    </div>
                    <v-card-title class="text-h6 font-weight-black pt-0">Delete Statement?</v-card-title>
                    <v-card-text class="text-slate-500 font-weight-medium pb-6">
                        Are you sure you want to delete this statement? This action cannot be undone and the file will be removed from your Vault.
                    </v-card-text>
                    <v-card-actions class="d-flex justify-center gap-3 pb-4">
                        <v-btn variant="tonal" rounded="pill" color="slate-600" class="px-6 font-weight-bold" @click="deleteDialog = false">Cancel</v-btn>
                        <v-btn color="error" rounded="pill" elevation="0" class="px-6 font-weight-bold" @click="confirmDeleteStatement">Yes, Delete</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Bulk Ingest Dialog -->
            <v-dialog v-model="bulkIngestDialog" max-width="900" scrollable>
                <v-card rounded="xl">
                    <div class="pa-6 border-b d-flex align-center gap-4 bg-slate-50">
                        <div class="icon-box-large bg-primary-lighten-5">
                            <CheckCircle2 :size="24" class="text-primary" />
                        </div>
                        <div>
                            <v-card-title class="text-h6 font-weight-black pa-0">Confirm Bulk Ingest</v-card-title>
                            <p class="text-caption text-slate-500 font-weight-bold">Assign categories and rules for {{ bulkIngestItems.length }} transactions</p>
                        </div>
                    </div>
                    
                    <v-card-text class="pa-0" style="max-height: 60vh;">
                        <v-table class="premium-table">
                            <thead>
                                <tr>
                                    <th class="text-left font-weight-black text-tiny uppercase opacity-60">Description</th>
                                    <th class="text-right font-weight-black text-tiny uppercase opacity-60">Amount</th>
                                    <th class="text-left font-weight-black text-tiny uppercase opacity-60" style="width: 250px;">Category</th>
                                    <th class="text-center font-weight-black text-tiny uppercase opacity-60">Save Rule</th>
                                    <th class="text-center font-weight-black text-tiny uppercase opacity-60">Hide Analytics</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in bulkIngestItems" :key="item.transaction_id">
                                    <td>
                                        <div class="font-weight-black text-caption text-truncate max-w-[200px]">{{ item.description }}</div>
                                        <div class="text-tiny opacity-60">{{ formatDate(item.date) }}</div>
                                    </td>
                                    <td class="text-right font-weight-black">
                                        {{ formatCurrency(item.amount) }}
                                    </td>
                                    <td class="pa-2">
                                        <v-autocomplete
                                            v-model="item.category"
                                            :items="categoryOptions"
                                            item-title="title"
                                            item-value="value"
                                            density="compact"
                                            variant="outlined"
                                            hide-details
                                            placeholder="Select Category"
                                            class="compact-input"
                                        ></v-autocomplete>
                                    </td>
                                    <td class="text-center">
                                        <v-switch v-model="item.create_rule" color="primary" hide-details class="d-inline-flex"></v-switch>
                                    </td>
                                    <td class="text-center">
                                        <v-switch v-model="item.exclude_from_reports" color="warning" hide-details class="d-inline-flex"></v-switch>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-card-text>
                    
                    <div class="pa-4 border-t bg-slate-50 d-flex justify-end gap-3">
                        <v-btn variant="tonal" rounded="pill" color="slate-600" class="px-6 font-weight-bold" @click="bulkIngestDialog = false">Cancel</v-btn>
                        <v-btn 
                            color="primary" 
                            rounded="pill" 
                            elevation="0" 
                            class="px-6 font-weight-bold" 
                            :disabled="!canConfirmBulkIngest"
                            @click="confirmBulkIngest"
                        >
                            Confirm Import
                        </v-btn>
                    </div>
                </v-card>
            </v-dialog>
            <!-- Reassign Account Dialog -->
            <v-dialog v-model="reassignDialog" max-width="450">
                <v-card rounded="xl" class="pa-4 premium-popup">
                    <v-card-title class="text-h6 font-weight-black d-flex align-center">
                        <Landmark :size="24" class="mr-3 text-primary" />
                        Re-assign Account
                    </v-card-title>
                    <v-card-text class="pt-4">
                        <p class="text-slate-500 mb-6 font-weight-medium">
                            If the automatic detection was incorrect, select the correct account for this statement below.
                        </p>
                        
                        <v-autocomplete
                            v-model="reassignAccountId"
                            :items="accounts"
                            item-title="name"
                            item-value="id"
                            label="Select Correct Account"
                            placeholder="Search accounts..."
                            variant="outlined"
                            rounded="lg"
                            density="comfortable"
                            color="primary"
                            :prepend-inner-icon="Landmark"
                            clearable
                        >
                            <template v-slot:item="{ props, item }">
                                <v-list-item v-bind="props" :subtitle="`Mask: XX${item.raw.account_mask}`">
                                    <template v-slot:prepend>
                                        <div class="icon-box-small mr-3" :class="item.raw.is_verified ? 'bg-primary-lighten-5' : 'bg-slate-100'">
                                            <Landmark :size="16" :class="item.raw.is_verified ? 'text-primary' : 'text-slate-400'" />
                                        </div>
                                    </template>
                                </v-list-item>
                            </template>
                        </v-autocomplete>
                    </v-card-text>
                    <v-card-actions class="px-4 pb-4">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" color="slate-500" rounded="pill" height="44" @click="reassignDialog = false">
                            Cancel
                        </v-btn>
                        <v-btn 
                            color="primary" 
                            rounded="pill" 
                            elevation="0" 
                            height="44" 
                            class="px-6"
                            @click="confirmReassign" 
                            :loading="reassigning"
                            :disabled="!reassignAccountId"
                        >
                            Update Account
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-container>


    </MainLayout>
</template>

<style scoped>
.statements-page {
    position: relative;
    min-height: calc(100vh - 64px);
    overflow: hidden;
}

.gradient-text {
    background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #6366f1 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.glass-card {
    background: rgba(var(--v-theme-surface), 0.6) !important;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.relative-pos {
    position: relative;
}

.z-10 {
    z-index: 10;
}

.mesh-blob {
    position: absolute;
    filter: blur(80px);
    opacity: 0.15;
    z-index: 1;
    border-radius: 50%;
    animation: blob-float 20s infinite alternate;
}

.blob-1 {
    background: rgb(var(--v-theme-primary));
    width: 600px;
    height: 600px;
    top: -200px;
    right: -100px;
}

.blob-2 {
    background: rgb(var(--v-theme-secondary));
    width: 400px;
    height: 400px;
    bottom: -100px;
    left: -100px;
    animation-delay: -5s;
}

@keyframes blob-float {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(20px, -20px) scale(1.1); }
}

.icon-box {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-box-small {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-box-large {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-box-huge {
    width: 120px;
    height: 120px;
    border-radius: 32px;
    background: rgba(var(--v-theme-on-surface), 0.03);
    display: flex;
    align-items: center;
    justify-content: center;
}

.statement-item {
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.statement-item:hover {
    background: rgba(var(--v-theme-primary), 0.05) !important;
    transform: translateX(4px);
}

.statement-item.v-list-item--active {
    background: rgba(var(--v-theme-primary), 0.1) !important;
    border: 1px solid rgba(var(--v-theme-primary), 0.2) !important;
}

.premium-table :deep(th) {
    height: 48px !important;
}

.premium-table :deep(td) {
    height: 64px !important;
}

.spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.glass-card {
    background: rgba(var(--v-theme-surface), 0.7) !important;
    backdrop-filter: blur(24px) saturate(185%) !important;
    border: 1px solid rgba(var(--v-border-color), 0.12) !important;
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08) !important;
}

.premium-toolbar {
    background: rgba(255, 255, 255, 0.8) !important;
    backdrop-filter: blur(12px);
    z-index: 10;
}

.limit-select :deep(.v-field__input) {
    font-size: 11px !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    min-height: 24px !important;
}

.tabular-nums {
    font-variant-numeric: tabular-nums;
    font-family: 'Inter', monospace;
}
</style>
