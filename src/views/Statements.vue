<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { 
    FileText, 
    Upload, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    Search, 
    Mail,
    Lock,
    ArrowRight,
    Landmark,
    User,
    Clock,
    Trash2,
    Eye
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

const users = ref<any[]>([])
const accounts = ref<any[]>([])
const categories = ref<any[]>([])

const selectedTransactions = ref<string[]>([])
const bulkIngestDialog = ref(false)
const bulkIngestItems = ref<{ transaction_id: string, description: string, amount: number, date: string, category: string | null, create_rule: boolean, exclude_from_reports: boolean }[]>([])

const selectAll = computed({
    get: () => {
        const unreconciled = store.currentTransactions.filter(t => !t.is_reconciled)
        return unreconciled.length > 0 && selectedTransactions.value.length === unreconciled.length
    },
    set: (val) => {
        if (val) {
            selectedTransactions.value = store.currentTransactions.filter(t => !t.is_reconciled).map(t => t.id)
        } else {
            selectedTransactions.value = []
        }
    }
})

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
    store.fetchStatements()
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
        console.error("Failed to fetch data", e)
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

const filteredStatements = computed(() => {
    if (!search.value) return store.statements
    return store.statements.filter(s => 
        s.filename.toLowerCase().includes(search.value.toLowerCase())
    )
})

async function selectStatement(s: any) {
    selectedStatement.value = s
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
        await store.retryParsing(selectedStatementForRetry.value.id, retryPassword.value)
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
        console.error("Retry failed", e)
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
    return format(new Date(date), 'MMM dd, yyyy')
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

function getUnreconciledCount(s: any) {
    if (!s.transactions) return 0
    return s.transactions.filter((t: any) => !t.is_reconciled).length
}

const deleteDialog = ref(false)
const statementToDelete = ref<string | null>(null)

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
    try {
        await store.reconcileStatement(id)
        notification.success('Statement reevaluated successfully')
    } catch (e) {
        notification.error('Failed to reevaluate statement')
    }
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
                <div class="d-flex align-center justify-space-between mb-8">
                    <div>
                        <h1 class="text-h4 font-weight-black mb-1 gradient-text">Account Statements</h1>
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
                        <v-card rounded="xl" border flat class="glass-card h-full overflow-hidden">
                            <div class="pa-4 border-b">
                                <v-text-field
                                    v-model="search"
                                    placeholder="Search statements..."
                                    variant="solo-filled"
                                    density="compact"
                                    hide-details
                                    rounded="lg"
                                    flat
                                >
                                    <template v-slot:prepend-inner>
                                        <Search :size="18" class="text-slate-400" />
                                    </template>
                                </v-text-field>
                            </div>

                            <v-list class="pa-2 bg-transparent overflow-y-auto" style="max-height: calc(100vh - 300px)">
                                <v-list-item
                                    v-for="s in filteredStatements"
                                    :key="s.id"
                                    @click="selectStatement(s)"
                                    :active="selectedStatement?.id === s.id"
                                    rounded="lg"
                                    class="mb-2 statement-item"
                                    :color="selectedStatement?.id === s.id ? 'primary' : ''"
                                >
                                    <template v-slot:prepend>
                                        <div class="icon-box mr-4" :class="`bg-${getStatusColor(s.status)}-lighten-5`">
                                            <CheckCircle2 v-if="s.status === 'PARSED'" :size="20" class="text-success" />
                                            <Lock v-else-if="s.status === 'PENDING'" :size="20" class="text-warning" />
                                            <AlertCircle v-else-if="s.status === 'FAILED'" :size="20" class="text-error" />
                                            <FileText v-else :size="20" :class="`text-${getStatusColor(s.status)}`" />
                                        </div>
                                    </template>

                                    <v-list-item-title class="font-weight-bold">{{ s.filename }}</v-list-item-title>
                                    <v-list-item-subtitle class="text-caption mt-1 d-flex align-center">
                                        <Clock :size="12" class="mr-1" /> {{ formatDate(s.created_at) }}
                                        <div class="mx-2 opacity-30">•</div>
                                        <Mail v-if="s.source === 'EMAIL'" :size="12" class="mr-1 text-slate-500" />
                                        <Upload v-else :size="12" class="mr-1 text-slate-500" />
                                        <span class="text-tiny font-weight-bold text-slate-500">{{ s.source === 'EMAIL' ? 'Email Sync' : 'Manual Upload' }}</span>
                                        <v-chip size="x-small" :color="getStatusColor(s.status)" class="ml-2 font-weight-black text-tiny">
                                            {{ s.status }}
                                        </v-chip>
                                    </v-list-item-subtitle>

                                    <template v-slot:append>
                                        <div class="d-flex align-center">
                                            <v-badge
                                                v-if="getUnreconciledCount(s) > 0"
                                                :content="getUnreconciledCount(s)"
                                                color="warning"
                                                class="mr-4"
                                            ></v-badge>
                                            <ArrowRight :size="16" class="opacity-30" />
                                        </div>
                                    </template>
                                </v-list-item>

                                <div v-if="filteredStatements.length === 0" class="pa-10 text-center opacity-40">
                                    <FileText :size="48" class="mb-4" />
                                    <p class="font-weight-bold">No statements found</p>
                                </div>
                            </v-list>
                        </v-card>
                    </v-col>

                    <!-- Right Content: Reconciliation Dashboard -->
                    <v-col cols="12" md="8">
                        <v-card v-if="selectedStatement" rounded="xl" border flat class="glass-card h-full min-h-[600px] flex flex-col">
                            <!-- Detail Header -->
                            <div class="pa-6 border-b d-flex justify-space-between align-center">
                                <div class="d-flex align-center">
                                    <div class="icon-box-large mr-4 bg-primary-lighten-5">
                                        <Landmark :size="24" class="text-primary" />
                                    </div>
                                    <div>
                                        <h2 class="text-h6 font-weight-black">{{ selectedStatement.filename }}</h2>
                                        <p class="text-caption text-slate-500 font-weight-bold uppercase letter-spacing-1 mt-1">
                                            <span v-if="getAccountInfo(selectedStatement.account_id)">
                                                <User :size="12" class="mr-1 d-inline-block align-text-bottom" />{{ getAccountInfo(selectedStatement.account_id)?.userName }} • 
                                                {{ getAccountInfo(selectedStatement.account_id)?.accountName }} • 
                                            </span>
                                            <span v-else>Account: XX{{ selectedStatement.account_id?.slice(-4) }} • </span>
                                            {{ store.currentTransactions.length }} Transactions Found
                                        </p>
                                    </div>
                                </div>
                                <div class="d-flex gap-2">
                                    <v-btn icon variant="text" color="primary" @click="reevaluateStatement(selectedStatement.id)" title="Reevaluate Transactions">
                                        <RefreshCw :size="20" />
                                    </v-btn>
                                    <v-btn icon variant="text" color="error" @click="promptDeleteStatement(selectedStatement.id)" title="Delete Statement">
                                        <Trash2 :size="20" />
                                    </v-btn>
                                    <v-btn icon variant="text" color="slate-400" title="Download">
                                        <Download :size="20" />
                                    </v-btn>
                                </div>
                            </div>
                            <!-- Action Bar -->
                            <div v-if="selectedStatement.status === 'PARSED'" class="pa-4 border-b d-flex justify-space-between align-center bg-slate-50">
                                <div class="text-caption font-weight-bold text-slate-500">
                                    {{ selectedTransactions.length }} transactions selected
                                </div>
                                <v-btn 
                                    color="primary" 
                                    rounded="pill" 
                                    elevation="0" 
                                    height="44"
                                    :disabled="selectedTransactions.length === 0"
                                    @click="openBulkIngestDialog"
                                >
                                    <template v-slot:prepend><Plus :size="18"/></template>
                                    Bulk Ingest Selected
                                </v-btn>
                            </div>

                            <div v-if="selectedStatement.status === 'PENDING'" class="flex-grow-1 d-flex flex-col align-center justify-center pa-10 text-center bg-slate-50/50">
                                <div class="icon-box-huge mb-6 bg-warning-lighten-5">
                                    <Lock :size="64" class="text-warning" />
                                </div>
                                <h2 class="text-h5 font-weight-black mb-2 text-slate-800">Decryption Required</h2>
                                <p class="text-slate-500 font-weight-medium mb-8 max-w-[400px]">
                                    This statement is password protected. Please provide the password to extract and reconcile transactions.
                                </p>
                                <v-btn 
                                    color="warning" 
                                    rounded="pill" 
                                    elevation="0" 
                                    height="44"
                                    class="px-8 font-weight-black"
                                    @click="openRetryDialog(selectedStatement)"
                                >
                                    <template v-slot:prepend><Lock :size="20"/></template>
                                    Enter Password
                                </v-btn>
                            </div>

                            <!-- Reconciliation Table -->
                            <div v-if="selectedStatement.status === 'PARSED'" class="flex-grow-1 overflow-y-auto pa-4">
                                <v-table hover class="premium-table">
                                    <thead>
                                        <tr>
                                            <th class="text-center" style="width: 40px;">
                                                <v-checkbox-btn v-model="selectAll" color="primary" hide-details></v-checkbox-btn>
                                            </th>
                                            <th class="text-left font-weight-black text-tiny uppercase opacity-60">Date</th>
                                            <th class="text-left font-weight-black text-tiny uppercase opacity-60">Description</th>
                                            <th class="text-left font-weight-black text-tiny uppercase opacity-60">Category</th>
                                            <th class="text-right font-weight-black text-tiny uppercase opacity-60">Amount</th>
                                            <th class="text-center font-weight-black text-tiny uppercase opacity-60">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="txn in store.currentTransactions" :key="txn.id">
                                            <td class="text-center">
                                                <v-checkbox-btn 
                                                    v-if="!txn.is_reconciled"
                                                    v-model="selectedTransactions" 
                                                    :value="txn.id" 
                                                    color="primary"
                                                    hide-details
                                                ></v-checkbox-btn>
                                            </td>
                                            <td class="font-weight-bold text-caption">{{ formatDate(txn.date) }}</td>
                                            <td>
                                                <div class="font-weight-black text-caption text-truncate max-w-[200px]">{{ txn.description }}</div>
                                            </td>
                                            <td>
                                                <v-chip v-if="txn.category_suggestion && txn.category_suggestion !== 'Uncategorized'" size="x-small" color="primary" variant="tonal" class="font-weight-bold text-tiny">
                                                    {{ txn.category_suggestion }}
                                                </v-chip>
                                                <span v-else class="text-tiny opacity-40 font-weight-bold">Uncategorized</span>
                                            </td>
                                            <td class="text-right font-weight-black" :class="txn.type === 'DEBIT' ? 'text-red' : 'text-success'">
                                                {{ txn.type === 'DEBIT' ? '-' : '+' }}{{ formatCurrency(txn.amount) }}
                                            </td>
                                            <td class="text-center">
                                                <v-tooltip location="top">
                                                    <template v-slot:activator="{ props }">
                                                        <div v-bind="props" class="d-inline-flex align-center">
                                                            <CheckCircle2 v-if="txn.is_reconciled" :size="18" class="text-success" />
                                                            <AlertCircle v-else :size="18" class="text-warning" />
                                                        </div>
                                                    </template>
                                                    <span>{{ txn.is_reconciled ? 'Matched with Ledger' : 'Not in Ledger' }}</span>
                                                </v-tooltip>
                                            </td>
                                        </tr>
                                    </tbody>
                                </v-table>
                            </div>
                        </v-card>

                        <!-- Empty State -->
                        <v-card v-else rounded="xl" border flat class="glass-card h-full flex flex-col align-center justify-center pa-10 opacity-60 min-h-[600px]">
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
                            <v-icon>mdi-close</v-icon>
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
                        <v-btn variant="text" rounded="pill" class="text-none font-weight-black" @click="uploadDialog = false">Cancel</v-btn>
                        <v-btn color="primary" rounded="pill" elevation="0" class="text-none px-8 font-weight-black" :disabled="!uploadFile" @click="handleUpload" :loading="store.loading">
                            Process
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

.gap-3 {
    gap: 12px;
}
</style>
