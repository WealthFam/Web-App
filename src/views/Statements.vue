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
    FileSpreadsheet,
    TrendingUp,
    CreditCard,
    Pencil,
    Ban,
    Plus,
    Store
} from 'lucide-vue-next'

import MainLayout from '@/layouts/MainLayout.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfAlert from '@/components/ui/WfAlert.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfPagination from '@/components/ui/WfPagination.vue'
import apiClient, { financeApi } from '@/api/client'
import { useStatementStore, type Statement, type StatementTransaction } from '@/stores/finance/statements'
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
const statusFilter = ref<'ALL' | 'PARSED' | 'PENDING' | 'FAILED'>('ALL')
const showAttended = ref(false)
const selectedStatementIds = ref<string[]>([])

const retryDialog = ref(false)
const retryPassword = ref('')
const showRetryPassword = ref(false)
const selectedStatementForRetry = ref<Statement | null>(null)

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
const bulkIngestItems = ref<{ transaction_id: string, description: string, amount: number, date: string, category: string | null, create_rule: boolean, exclude_from_reports: boolean, ref_id?: string, extra_data?: any }[]>([])

const deleteDialog = ref(false)
const statementToDelete = ref<string | null>(null)
const deleteVaultFile = ref(true)
const deleteCreateIgnoreRule = ref(false)

const bulkDeleteDialog = ref(false)
const bulkDeleting = ref(false)
const bulkDeleteVaultFile = ref(true)
const bulkCreateIgnoreRules = ref(false)

const reassignDialog = ref(false)
const editFilename = ref('')
const editStatementType = ref('BANK')
const reassignAccountId = ref<string | null>(null)
const reassigning = ref(false)

const attendWarningDialog = ref(false)
const targetStatementToAttend = ref<Statement | null>(null)
const unreconciledTxnCount = computed(() => {
    return store.currentTransactions.filter(t => !t.is_reconciled).length
})

function handleMarkAttended(stmt: Statement, isAttended: boolean) {
    if (isAttended && unreconciledTxnCount.value > 0) {
        targetStatementToAttend.value = stmt
        attendWarningDialog.value = true
        return
    }
    confirmToggleAttended(stmt, isAttended)
}

async function confirmToggleAttended(stmt: Statement, isAttended: boolean) {
    try {
        await store.toggleAttended(stmt.id, isAttended)
        if (selectedStatement.value?.id === stmt.id) {
            selectedStatement.value.is_attended = isAttended
            selectedStatement.value.closed_at = isAttended ? new Date().toISOString() : null
        }
        if (!showAttended.value && isAttended) {
            store.statements = store.statements.filter(s => s.id !== stmt.id)
            if (store.totalStatements > 0) store.totalStatements--
        }
        attendWarningDialog.value = false
        notification.success(isAttended ? 'Statement marked as attended' : 'Statement review reopened')
    } catch (e: any) {
        notification.error(e?.message || 'Failed to update statement')
    }
}

const ignoreDialog = ref(false)
const ignoring = ref(false)
const ignoreTargetStatement = ref<Statement | null>(null)
const ignoreMatchType = ref<'sender' | 'pattern' | 'subject'>('sender')
const ignoreValue = ref('')
const ignoreDeleteMatching = ref(true)
const ignoreDeleteVaultFile = ref(true)

const statementIgnoreRules = ref<any[]>([])
const showIgnoreRulesModal = ref(false)
const loadingIgnoreRules = ref(false)
const newRuleMatchType = ref<'sender' | 'pattern' | 'subject'>('sender')
const newRuleValue = ref('')
const savingNewRule = ref(false)

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

const bulkCategoryOptions = computed(() => [
    { title: '-- Select Category --', value: null },
    ...categoryOptions.value
])

const userOptions = computed(() => [
    { title: '-- Select Person (Optional) --', value: null },
    ...users.value.map(u => ({
        title: `${u.full_name} (${u.email})`,
        value: u
    }))
])

const uploadAccountOptions = computed(() => [
    { title: '-- Auto Detect from Statement --', value: null },
    ...accounts.value.map(a => ({
        title: `${a.name} (XX${a.account_mask || '????'})`,
        value: a
    }))
])

const accountSelectOptions = computed(() => [
    { title: '-- Select Account --', value: null },
    ...accounts.value.map(acc => ({
        title: `${acc.name} (Mask: XX${acc.account_mask || '????'})`,
        value: acc.id
    }))
])

const statementTypeOptions = [
    { title: 'Bank Account Statement', value: 'BANK' },
    { title: 'Credit Card Statement', value: 'CREDIT_CARD' },
    { title: 'Mutual Fund CAS (eCAS)', value: 'MUTUAL_FUND_CAS' }
]

const statementToDeleteObj = computed(() =>
    store.statements.find(s => s.id === statementToDelete.value) ||
    (selectedStatement.value?.id === statementToDelete.value ? selectedStatement.value : null)
)

const isAllStatementsOnPageSelected = computed(() => {
    if (store.statements.length === 0) return false
    return store.statements.every(s => selectedStatementIds.value.includes(s.id))
})

function toggleSelectAllStatements() {
    if (isAllStatementsOnPageSelected.value) {
        selectedStatementIds.value = []
    } else {
        selectedStatementIds.value = store.statements.map(s => s.id)
    }
}

function openBulkIngestDialog() {
    if (!selectedStatement.value?.account_id) {
        notification.error('Please link an account to this statement before ingesting transactions.')
        openEditDialog(selectedStatement.value)
        return
    }

    bulkIngestItems.value = store.currentTransactions
        .filter(t => selectedTransactions.value.includes(t.id))
        .map(t => {
            let cat: string | null = null
            if (t.category_suggestion && t.category_suggestion !== 'Uncategorized') {
                const raw = t.category_suggestion
                const leaf = raw.includes(' › ') ? raw.split(' › ').pop()!.trim() : raw
                const matched = categories.value.find(c => 
                    c.name.toLowerCase() === leaf.toLowerCase() || 
                    c.name.toLowerCase() === raw.toLowerCase()
                )
                cat = matched ? matched.name : leaf
            }

            return {
                transaction_id: t.id,
                description: t.description,
                amount: t.amount,
                date: t.date,
                category: cat,
                create_rule: !cat,
                exclude_from_reports: false,
                ref_id: t.ref_id,
                extra_data: t.extra_data
            }
        })
    bulkIngestDialog.value = true
}

const canConfirmBulkIngest = computed(() => {
    return bulkIngestItems.value.length > 0 && bulkIngestItems.value.every(item => !!item.category)
})

async function confirmBulkIngest() {
    try {
        await store.bulkIngestTransactions(bulkIngestItems.value, selectedStatement.value?.account_id || undefined)
        notification.success('Bulk ingestion successful')
        bulkIngestDialog.value = false
        selectedTransactions.value = []
    } catch (e: any) {
        notification.error(e.message || 'Bulk ingestion failed')
    }
}

onMounted(async () => {
    store.fetchStatements(0, statementPageSize)
    fetchStatementIgnoreRules()
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

// Server-side pagination and search/status filtering for statements
function loadFilteredStatements(page = statementPage.value) {
    const activeStatus = statusFilter.value === 'ALL' ? undefined : statusFilter.value
    const activeAttended = showAttended.value ? undefined : false
    store.fetchStatements((page - 1) * statementPageSize, statementPageSize, search.value, activeStatus, undefined, activeAttended)
}

function setStatusFilter(nextStatus: 'ALL' | 'PARSED' | 'PENDING' | 'FAILED') {
    if (statusFilter.value === nextStatus) return
    statusFilter.value = nextStatus
    selectedStatementIds.value = []
    if (statementPage.value !== 1) {
        statementPage.value = 1
    } else {
        loadFilteredStatements(1)
    }
}

watch(showAttended, () => {
    selectedStatementIds.value = []
    if (statementPage.value !== 1) {
        statementPage.value = 1
    } else {
        loadFilteredStatements(1)
    }
})

watch(search, () => {
    selectedStatementIds.value = []
    if (statementPage.value !== 1) {
        statementPage.value = 1
    } else {
        loadFilteredStatements(1)
    }
})

watch(statementPage, (page) => {
    selectedStatementIds.value = []
    loadFilteredStatements(page)
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
        loadAttachment(s.vault_id)
    } else {
        attachmentUrl.value = null
    }
    
    // Reset tab if statement lacks appropriate media
    if (activeTab.value === 'attachment' && !s.vault_id) activeTab.value = 'transactions'
    if (activeTab.value === 'email' && !s.email_body) activeTab.value = 'transactions'
    
    txnPage.value = 1
    await store.fetchTransactions(s.id, 0, txnLimit.value)

    if (s.statement_type === 'MUTUAL_FUND_CAS') {
        selectedTransactions.value = store.currentTransactions
            .filter(t => !t.is_reconciled && !t.extra_data?.is_duplicate)
            .map(t => t.id)
    }
}

const isImportingMf = ref(false)

async function handleBulkImportMf() {
    if (!selectedStatement.value || selectedTransactions.value.length === 0) return
    isImportingMf.value = true
    try {
        const res = await store.bulkImportMfTransactions(
            selectedStatement.value.id,
            selectedTransactions.value
        )
        const processed = res?.processed ?? 0
        const failed = res?.failed ?? res?.stats?.failed ?? 0
        if (processed > 0 && failed === 0) {
            notification.success(`Successfully imported ${processed} mutual fund transaction(s) into your portfolio!`)
        } else if (processed > 0 && failed > 0) {
            notification.warning(`Imported ${processed} transaction(s); ${failed} failed (check unmapped schemes).`)
        } else {
            notification.error(`Could not import selected transaction(s) (${failed} failed — check unmapped schemes).`)
        }
        selectedTransactions.value = []
        await store.fetchTransactions(selectedStatement.value.id, (txnPage.value - 1) * txnLimit.value, txnLimit.value)
    } catch (e: any) {
        notification.error(e.response?.data?.detail || 'Failed to import mutual fund transactions')
    } finally {
        isImportingMf.value = false
    }
}

function getStatementTypeBadge(type?: string) {
    switch (type) {
        case 'MUTUAL_FUND_CAS':
            return {
                label: 'Mutual Fund',
                icon: TrendingUp,
                bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800/60'
            }
        case 'CREDIT_CARD':
            return {
                label: 'Credit Card',
                icon: CreditCard,
                bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/60'
            }
        default:
            return {
                label: 'Bank',
                icon: Landmark,
                bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800/60'
            }
    }
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
        const res = await store.reprocessStatement(selectedStatementForRetry.value.id, retryPassword.value)
        retryDialog.value = false
        if (res?.status === 'partial_success') {
            notification.warning(res.message || 'PDF unlocked and saved to Vault, but parsing failed.')
        } else {
            notification.success(res?.message || 'Statement decrypted and parsed successfully')
        }

        // Find the refreshed statement in the updated list
        const updatedStatement = store.statements.find(s =>
            (res?.statement_id && s.id === res.statement_id) ||
            (s.filename === selectedStatementForRetry.value?.filename && s.status === 'PARSED')
        )
        if (updatedStatement) {
            selectStatement(updatedStatement)
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

function openEditDialog(s: Statement | null = selectedStatement.value) {
    if (!s) return
    editFilename.value = s.filename || ''
    editStatementType.value = s.statement_type || 'BANK'
    reassignAccountId.value = s.account_id || null
    reassignDialog.value = true
}

async function confirmReassign() {
    if (!selectedStatement.value) return
    const trimmedName = editFilename.value.trim()
    if (!trimmedName) {
        notification.error('Statement filename cannot be empty')
        return
    }
    reassigning.value = true
    try {
        const updated = await store.updateStatement(selectedStatement.value.id, {
            filename: trimmedName,
            statement_type: editStatementType.value,
            account_id: editStatementType.value === 'MUTUAL_FUND_CAS' ? null : (reassignAccountId.value || null),
        })
        selectedStatement.value = updated

        // If it was FAILED and now PARSED, fetch the newly extracted transactions
        if (updated.status === 'PARSED') {
            await store.fetchTransactions(updated.id)
        }

        notification.success('Statement updated successfully')
        reassignDialog.value = false
    } catch (e: any) {
        notification.error(e.response?.data?.detail || e.message || 'Failed to update statement')
    } finally {
        reassigning.value = false
    }
}

function promptDeleteStatement(id: string) {
    statementToDelete.value = id
    deleteVaultFile.value = true
    deleteCreateIgnoreRule.value = false
    deleteDialog.value = true
}

async function confirmDeleteStatement() {
    if (!statementToDelete.value) return
    const targetId = statementToDelete.value

    try {
        await store.deleteStatement(targetId, {
            delete_vault_file: deleteVaultFile.value,
            create_ignore_rule: deleteCreateIgnoreRule.value,
        })
        if (selectedStatement.value?.id === targetId) {
            selectedStatement.value = null
        }
        selectedStatementIds.value = selectedStatementIds.value.filter(id => id !== targetId)
        notification.success(
            deleteCreateIgnoreRule.value
                ? 'Statement deleted and future emails from sender ignored'
                : 'Statement deleted successfully'
        )
        deleteDialog.value = false
        statementToDelete.value = null
        if (deleteCreateIgnoreRule.value) {
            fetchStatementIgnoreRules()
        }
    } catch (e) {
        notification.error('Failed to delete statement')
    }
}

function openBulkDeleteDialog() {
    if (selectedStatementIds.value.length === 0) return
    bulkDeleteVaultFile.value = true
    bulkCreateIgnoreRules.value = false
    bulkDeleteDialog.value = true
}

async function confirmBulkDelete() {
    if (selectedStatementIds.value.length === 0) return
    bulkDeleting.value = true
    try {
        const idsToDelete = [...selectedStatementIds.value]
        const res = await store.bulkDeleteStatements(idsToDelete, {
            delete_vault_file: bulkDeleteVaultFile.value,
            create_ignore_rules: bulkCreateIgnoreRules.value,
        })
        if (selectedStatement.value && idsToDelete.includes(selectedStatement.value.id)) {
            selectedStatement.value = null
        }
        selectedStatementIds.value = []
        bulkDeleteDialog.value = false
        notification.success(`Deleted ${res?.deleted_count ?? idsToDelete.length} statement(s)`)
        if (bulkCreateIgnoreRules.value) {
            fetchStatementIgnoreRules()
        }
    } catch (e: any) {
        notification.error(e.response?.data?.detail || 'Failed to delete selected statements')
    } finally {
        bulkDeleting.value = false
    }
}

function openIgnoreDialog(s: Statement | null = selectedStatement.value) {
    if (!s) return
    ignoreTargetStatement.value = s
    const defaultType = s.email_sender ? 'sender' : 'pattern'
    ignoreMatchType.value = defaultType
    ignoreValue.value = defaultType === 'sender' ? (s.email_sender || '') : (s.filename || '')
    ignoreDeleteMatching.value = true
    ignoreDeleteVaultFile.value = true
    ignoreDialog.value = true
}

function setIgnoreMatchType(mt: 'sender' | 'pattern' | 'subject') {
    ignoreMatchType.value = mt
    const s = ignoreTargetStatement.value
    if (!s) return
    if (mt === 'sender') {
        ignoreValue.value = s.email_sender || ''
    } else if (mt === 'pattern') {
        ignoreValue.value = s.filename || ''
    } else {
        ignoreValue.value = ''
    }
}

async function confirmIgnoreStatement() {
    const s = ignoreTargetStatement.value
    if (!s || !ignoreValue.value.trim()) return
    ignoring.value = true
    try {
        const res = await store.ignoreStatement(s.id, {
            match_type: ignoreMatchType.value,
            value: ignoreValue.value.trim(),
            delete_matching: ignoreDeleteMatching.value,
            delete_vault_file: ignoreDeleteVaultFile.value,
        })
        if (selectedStatement.value && !store.statements.some(st => st.id === selectedStatement.value?.id)) {
            selectedStatement.value = null
        }
        selectedStatementIds.value = []
        ignoreDialog.value = false
        notification.success(
            `Ignored future statements (${res?.deleted_count ?? 1} statement(s) cleaned up)`
        )
        fetchStatementIgnoreRules()
    } catch (e: any) {
        notification.error(e.response?.data?.detail || 'Failed to create statement ignore rule')
    } finally {
        ignoring.value = false
    }
}

async function fetchStatementIgnoreRules() {
    loadingIgnoreRules.value = true
    try {
        const res = await financeApi.getIgnoreRules()
        statementIgnoreRules.value = (res.data || []).filter(
            (r: any) => r.source === 'STATEMENT' || r.source === 'ALL'
        )
    } catch (e) {
        console.error('Failed to load statement ignore rules:', e)
    } finally {
        loadingIgnoreRules.value = false
    }
}

function openIgnoreRulesModal() {
    showIgnoreRulesModal.value = true
    fetchStatementIgnoreRules()
}

async function addStatementIgnoreRule() {
    const val = newRuleValue.value.trim()
    if (!val) return
    savingNewRule.value = true
    try {
        const payload = {
            source: 'STATEMENT',
            sender: newRuleMatchType.value === 'sender' ? val : null,
            subject: newRuleMatchType.value === 'subject' ? val : null,
            pattern: newRuleMatchType.value === 'pattern' ? val : null,
        }
        await financeApi.createIgnoreRule(payload)
        newRuleValue.value = ''
        notification.success('Statement ignore rule added')
        await fetchStatementIgnoreRules()
    } catch (e: any) {
        notification.error(e.response?.data?.detail || 'Failed to add ignore rule')
    } finally {
        savingNewRule.value = false
    }
}

async function removeStatementIgnoreRule(ruleId: string) {
    try {
        await financeApi.deleteIgnoreRule(ruleId)
        notification.success('Rule removed — matching statements allowed again')
        await fetchStatementIgnoreRules()
    } catch (e: any) {
        notification.error(e.response?.data?.detail || 'Failed to remove ignore rule')
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
                const res = await store.reprocessStatement(id)
                const refreshed = store.statements.find(s => s.id === (res?.statement_id || id))
                if (refreshed) {
                    await selectStatement(refreshed)
                }
                if (res?.status === 'partial_success') {
                    notification.warning(res.message || 'Statement unlocked, please link an account to complete parsing.')
                } else {
                    notification.success(res?.message || 'Statement re-processed successfully')
                }
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

function getAccountName(account_id?: string | null) {
    if (!account_id) return 'Unlinked Account'
    const acc = getAccountInfo(account_id)
    if (!acc) return `Account: XX${account_id?.slice(-4) || 'Unknown'}`
    return `${acc.userName} - ${acc.accountName}`
}

// Checkbox select all logic for transactions table
const isAllSelected = computed(() => {
    if (store.currentTransactions.length === 0) return false
    if (selectedStatement.value?.statement_type === 'MUTUAL_FUND_CAS') {
        const selectable = store.currentTransactions.filter(t => !t.is_reconciled)
        if (selectable.length === 0) return false
        return selectable.every(t => selectedTransactions.value.includes(t.id))
    }
    return store.currentTransactions.every(t => selectedTransactions.value.includes(t.id))
})

function toggleSelectAll() {
    if (isAllSelected.value) {
        selectedTransactions.value = []
    } else {
        if (selectedStatement.value?.statement_type === 'MUTUAL_FUND_CAS') {
            selectedTransactions.value = store.currentTransactions
                .filter(t => !t.is_reconciled)
                .map(t => t.id)
        } else {
            selectedTransactions.value = store.currentTransactions.map(t => t.id)
        }
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

function getCasSchemeName(txn: StatementTransaction): string {
    return (
        txn.extra_data?.scheme_name?.toString().trim() ||
        txn.extra_data?.mapped_name?.toString().trim() ||
        txn.description?.toString().trim() ||
        'Mutual Fund Scheme'
    )
}

function getTxnMerchant(txn: StatementTransaction | any): string | null {
    if (txn?.extra_data?.merchant) return txn.extra_data.merchant
    if (selectedStatement.value?.statement_type === 'MUTUAL_FUND_CAS') {
        return getCasSchemeName(txn)
    }
    return null
}

function getCasMappedName(txn: StatementTransaction): string | null {
    const mapped = txn.extra_data?.mapped_name?.toString().trim() || ''
    if (!mapped) return null
    const primary = getCasSchemeName(txn)
    return mapped.toLowerCase() !== primary.toLowerCase() ? mapped : null
}

function getCasFolio(txn: StatementTransaction): string | null {
    const val = txn.extra_data?.folio_number || txn.ref_id
    const str = val != null ? String(val).trim() : ''
    return str || null
}

function getCasOrderType(txn: StatementTransaction): string {
    const raw = txn.extra_data?.order_type
    if (raw != null && String(raw).trim()) return String(raw).trim()
    return txn.extra_data?.is_synthesized ? 'SUMMARY BALANCE' : txn.type
}

function isCasSnapshot(txn: StatementTransaction): boolean {
    return Boolean(txn.extra_data?.is_synthesized) || getCasOrderType(txn).toUpperCase() === 'SUMMARY BALANCE'
}

function isCasWithdrawal(txn: StatementTransaction): boolean {
    const ot = getCasOrderType(txn)
    if (/sell|redemp|switch[\s-]*out|stp[\s-]*out|payout/i.test(ot)) return true
    if (isCasSnapshot(txn)) return false
    return txn.type === 'DEBIT' && !/buy|sip|purchase|switch[\s-]*in|stp[\s-]*in|reinv/i.test(ot)
}

</script>

<template>
    <MainLayout>
        <div class="flex flex-col lg:h-[calc(100vh-92px)] space-y-3 pb-3">
            <!-- HEADER: Title, Intelligence Pill & Action Buttons -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle shrink-0">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
                        <FileSpreadsheet class="w-4.5 h-4.5 text-wf-primary" />
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

                <div class="flex items-center gap-2.5 flex-wrap">
                    <WfButton
                        variant="outline"
                        size="sm"
                        @click="openIgnoreRulesModal"
                    >
                        <Ban class="w-3.5 h-3.5 mr-1" />
                        <span>Ignored Rules ({{ statementIgnoreRules.length }})</span>
                    </WfButton>

                    <WfButton
                        variant="outline"
                        size="sm"
                        @click="syncDialog = true"
                        :loading="syncing"
                    >
                        <RefreshCw class="w-3.5 h-3.5 mr-1" :class="{ 'animate-spin': syncing }" />
                        <span>Sync Emails</span>
                    </WfButton>

                    <WfButton
                        variant="primary"
                        size="sm"
                        @click="uploadDialog = true"
                    >
                        <Upload class="w-3.5 h-3.5 mr-1" />
                        <span>Upload Statement</span>
                    </WfButton>
                </div>
            </div>

            <!-- MAIN WORKSPACE: 2-Column Split Layout -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 items-stretch">
                
                <!-- LEFT COLUMN: Statements List Directory (4 cols) -->
                <div class="lg:col-span-4 flex flex-col h-full min-h-0">
                    <WfCard variant="flat" padding="none" radius="lg" class="overflow-hidden flex flex-col border border-wf-border h-full">
                        <!-- Search & Status Filter Toolbar -->
                        <div class="p-2.5 border-b border-wf-border bg-wf-surface-variant/40 flex flex-col gap-2 shrink-0">
                            <div class="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    :checked="isAllStatementsOnPageSelected"
                                    :disabled="store.statements.length === 0"
                                    @change="toggleSelectAllStatements"
                                    title="Select all statements on this page"
                                    class="rounded-wf-xs border-slate-300 text-wf-primary focus:ring-wf-primary cursor-pointer w-3.5 h-3.5 shrink-0"
                                />
                                <div class="flex-1 flex items-center h-8 px-2.5 bg-wf-surface border border-wf-border rounded-wf-sm text-wf-text-primary focus-within:ring-1 focus-within:ring-wf-primary focus-within:border-wf-primary transition-all shadow-2xs gap-2">
                                    <SearchIcon class="w-3.5 h-3.5 text-wf-text-muted shrink-0 pointer-events-none" />
                                    <input
                                        v-model="search"
                                        type="text"
                                        placeholder="Search statements..."
                                        class="w-full h-full bg-transparent text-xs text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none"
                                    />
                                    <button
                                        v-if="search"
                                        @click="search = ''"
                                        class="text-wf-text-muted hover:text-wf-text-primary p-0.5 rounded-wf-xs transition-colors flex items-center justify-center shrink-0"
                                        title="Clear search"
                                    >
                                        <X class="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <!-- Status Filter Pills & Bulk Delete Bar -->
                            <div class="flex items-center justify-between gap-1.5 flex-wrap">
                                <div class="flex items-center gap-1">
                                    <button
                                        v-for="tab in ([
                                            { value: 'ALL', label: 'All' },
                                            { value: 'PARSED', label: 'Parsed' },
                                            { value: 'PENDING', label: 'Pending' },
                                            { value: 'FAILED', label: 'Failed' }
                                        ] as const)"
                                        :key="tab.value"
                                        type="button"
                                        @click="setStatusFilter(tab.value)"
                                        class="px-2 py-0.5 rounded-wf-pill text-[10px] font-semibold border transition-colors cursor-pointer"
                                        :class="statusFilter === tab.value
                                            ? 'bg-wf-primary text-white border-wf-primary shadow-2xs'
                                            : 'bg-wf-surface text-wf-text-secondary border-wf-border hover:bg-wf-surface-variant'"
                                    >
                                        {{ tab.label }}
                                    </button>

                                    <!-- Show Attended Toggle Pill -->
                                    <button
                                        type="button"
                                        @click="showAttended = !showAttended"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-pill text-[10px] font-semibold border transition-all cursor-pointer ml-1"
                                        :class="showAttended 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs font-bold' 
                                            : 'bg-wf-surface text-wf-text-muted border-wf-border hover:bg-wf-surface-variant hover:text-wf-text-secondary'"
                                        :title="showAttended ? 'Showing all statements including attended ones' : 'Attended statements are hidden by default. Click to show them.'"
                                    >
                                        <CheckCircle2 class="w-2.5 h-2.5" :class="showAttended ? 'text-emerald-600 dark:text-emerald-400' : 'text-wf-text-muted'" />
                                        <span>Show Attended</span>
                                    </button>
                                </div>

                                <div v-if="selectedStatementIds.length > 0" class="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        @click="openBulkDeleteDialog"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-sm text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors"
                                    >
                                        <Trash2 class="w-2.5 h-2.5" />
                                        <span>Delete ({{ selectedStatementIds.length }})</span>
                                    </button>
                                    <button
                                        type="button"
                                        @click="selectedStatementIds = []"
                                        class="px-1.5 py-0.5 text-[10px] font-medium text-wf-text-muted hover:text-wf-text-primary cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                </div>
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
                                    class="p-3 cursor-pointer transition-all duration-150 flex items-start gap-2.5 select-none relative group"
                                    :class="[
                                        selectedStatement?.id === s.id 
                                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-3 border-l-wf-primary' 
                                            : 'hover:bg-wf-surface-variant/60 border-l-3 border-l-transparent'
                                    ]"
                                >
                                    <!-- Multi-select Checkbox -->
                                    <input
                                        type="checkbox"
                                        :value="s.id"
                                        v-model="selectedStatementIds"
                                        @click.stop
                                        class="mt-2 rounded-wf-xs border-slate-300 text-wf-primary focus:ring-wf-primary cursor-pointer w-3.5 h-3.5 shrink-0"
                                    />

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
                                            <div class="flex items-center gap-1 shrink-0">
                                                <span 
                                                    class="inline-flex items-center px-1.5 py-0.5 rounded-wf-sm text-[10px] font-bold border"
                                                    :class="getStatusBadge(s.status).bg"
                                                >
                                                    {{ getStatusBadge(s.status).label }}
                                                </span>
                                                <span 
                                                    v-if="s.status === 'PARSED'"
                                                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-wf-xs text-[9px] font-bold border"
                                                    :class="s.is_attended 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'"
                                                >
                                                    {{ s.is_attended ? '✓ Attended' : '⚡ Review' }}
                                                </span>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-2 text-[11px] text-wf-text-muted mt-1 flex-wrap">
                                            <span 
                                                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-wf-xs text-[9px] font-bold border"
                                                :class="getStatementTypeBadge(s.statement_type).bg"
                                            >
                                                <component :is="getStatementTypeBadge(s.statement_type).icon" class="w-2.5 h-2.5" />
                                                {{ getStatementTypeBadge(s.statement_type).label }}
                                            </span>

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
                        <div v-if="store.totalStatements > statementPageSize" class="p-2 border-t border-wf-border bg-wf-surface-variant/30">
                            <WfPagination
                                :page="statementPage"
                                :page-size="statementPageSize"
                                :total="store.totalStatements"
                                :page-sizes="[statementPageSize]"
                                @update:page="statementPage = $event"
                            />
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
                                                :class="getStatementTypeBadge(selectedStatement.statement_type).bg"
                                            >
                                                <component :is="getStatementTypeBadge(selectedStatement.statement_type).icon" class="w-3 h-3" />
                                                {{ getStatementTypeBadge(selectedStatement.statement_type).label }}
                                            </span>

                                            <span 
                                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-sm text-[10px] font-bold border"
                                                :class="getStatusBadge(selectedStatement.status).bg"
                                            >
                                                <span class="w-1.5 h-1.5 rounded-wf-pill" :class="getStatusBadge(selectedStatement.status).dot"></span>
                                                {{ selectedStatement.status }}
                                            </span>

                                            <span 
                                                v-if="selectedStatement.status === 'PARSED'"
                                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-sm text-[10px] font-bold border"
                                                :class="selectedStatement.is_attended 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'"
                                            >
                                                {{ selectedStatement.is_attended ? '✓ Attended' : '⚡ Needs Review' }}
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

                                        <div class="flex items-center gap-3 text-[11px] text-wf-text-muted mt-0.5 flex-wrap">
                                            <p class="flex items-center gap-1">
                                                <Clock class="w-3 h-3" />
                                                Ingested {{ formatDate(selectedStatement.created_at) }}
                                            </p>
                                            <p v-if="selectedStatement.closed_at" class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                <CheckCircle2 class="w-3 h-3" />
                                                Attended on {{ formatDate(selectedStatement.closed_at) }}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Header Action Buttons -->
                                <div class="flex items-center gap-2 shrink-0">
                                    <template v-if="selectedStatement.status === 'PARSED'">
                                        <WfButton
                                            v-if="!selectedStatement.is_attended"
                                            variant="outline"
                                            size="sm"
                                            @click="handleMarkAttended(selectedStatement, true)"
                                            class="h-8 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800"
                                        >
                                            <CheckCircle2 class="w-3.5 h-3.5 mr-1" />
                                            <span>Mark Attended</span>
                                        </WfButton>
                                        <WfButton
                                            v-else
                                            variant="ghost"
                                            size="sm"
                                            @click="handleMarkAttended(selectedStatement, false)"
                                            class="h-8 px-2.5 text-xs font-semibold text-wf-text-muted hover:text-wf-text-primary"
                                            title="Reopen statement review"
                                        >
                                            <RefreshCw class="w-3.5 h-3.5 mr-1" />
                                            <span>Reopen</span>
                                        </WfButton>
                                    </template>
                                    <template v-if="selectedTransactions.length > 0">
                                        <WfButton
                                            v-if="selectedStatement.statement_type === 'MUTUAL_FUND_CAS'"
                                            variant="primary"
                                            size="sm"
                                            @click="handleBulkImportMf"
                                            :loading="isImportingMf"
                                            class="h-8 px-3 text-xs font-semibold shadow-sm bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            <TrendingUp class="w-3.5 h-3.5 mr-1" />
                                            <span>Import to Portfolio ({{ selectedTransactions.length }})</span>
                                        </WfButton>

                                        <WfButton
                                            v-else
                                            variant="primary"
                                            size="sm"
                                            @click="openBulkIngestDialog"
                                            :disabled="selectedTransactions.length === 0 || !selectedStatement.account_id"
                                            :title="!selectedStatement.account_id ? 'Link an account to this statement before ingesting' : 'Ingest selected transactions'"
                                            class="h-8 px-3 text-xs font-semibold shadow-sm"
                                        >
                                            <CheckCircle2 class="w-3.5 h-3.5 mr-1" />
                                            <span>Ingest ({{ selectedTransactions.length }})</span>
                                        </WfButton>
                                    </template>

                                    <button
                                        @click="openEditDialog(selectedStatement)"
                                        class="p-1.5 rounded-wf-md border border-wf-border text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant hover:border-wf-primary/40 transition-colors cursor-pointer"
                                        title="Edit Statement Details"
                                    >
                                        <Pencil class="w-4 h-4" />
                                    </button>

                                    <button
                                        @click="openIgnoreDialog(selectedStatement)"
                                        class="p-1.5 rounded-wf-md border border-wf-border text-wf-text-secondary hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-200 transition-colors cursor-pointer"
                                        title="Ignore Future Statements Like This"
                                    >
                                        <Ban class="w-4 h-4" />
                                    </button>

                                    <button
                                        @click="reevaluateStatement(selectedStatement.id)"
                                        class="p-1.5 rounded-wf-md border border-wf-border text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant hover:border-wf-primary/40 transition-colors cursor-pointer"
                                        title="Re-evaluate Statement"
                                    >
                                        <RefreshCw class="w-4 h-4" />
                                    </button>

                                    <button
                                        @click="promptDeleteStatement(selectedStatement.id)"
                                        class="p-1.5 rounded-wf-md border border-wf-border text-wf-text-secondary hover:text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 transition-colors cursor-pointer"
                                        title="Delete Statement"
                                    >
                                        <Trash2 class="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <!-- Metadata Row -->
                            <div class="flex items-center gap-4 text-xs font-medium text-wf-text-secondary pt-2 border-t border-wf-border-subtle flex-wrap">
                                <div v-if="selectedStatement.statement_type === 'MUTUAL_FUND_CAS'" class="flex items-center gap-1.5">
                                    <TrendingUp class="w-3.5 h-3.5 text-purple-500" />
                                    <span class="text-wf-text-muted">Domain:</span>
                                    <span class="font-semibold text-wf-text-primary">Consolidated Account Statement (eCAS)</span>
                                </div>
                                <div v-else class="flex items-center gap-1.5">
                                    <Landmark class="w-3.5 h-3.5 text-wf-text-muted" />
                                    <span class="text-wf-text-muted">Account:</span>
                                    <span class="font-semibold text-wf-text-primary">{{ getAccountName(selectedStatement.account_id) }}</span>
                                    <button 
                                        @click="openEditDialog(selectedStatement)" 
                                        class="text-[11px] font-bold text-wf-primary hover:underline ml-1 px-1.5 py-0.5 rounded-wf-sm bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 cursor-pointer"
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

                            <!-- Warning Banner if Attended with Unreconciled Transactions -->
                            <div v-if="selectedStatement.is_attended && unreconciledTxnCount > 0" class="mt-2.5 p-2 px-3 rounded-wf-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                                <AlertCircle class="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span><strong>Notice:</strong> Marked as Attended with {{ unreconciledTxnCount }} unreconciled transaction(s).</span>
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
                                            We couldn't extract transactions from this statement automatically. You can provide a password or assign a different target account.
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
                                        <!-- MUTUAL FUND CAS LEDGER TABLE -->
                                        <table v-if="selectedStatement.statement_type === 'MUTUAL_FUND_CAS'" class="w-full text-left border-collapse text-xs">
                                            <thead class="sticky top-0 z-10">
                                                <tr class="border-b border-wf-border bg-wf-surface-variant/90 backdrop-blur-xs text-[11px] font-bold text-wf-text-muted uppercase tracking-wider">
                                                    <th class="py-2.5 px-3 w-10 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            :checked="isAllSelected" 
                                                            @change="toggleSelectAll"
                                                            class="rounded-wf-xs border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-3.5 h-3.5"
                                                        />
                                                    </th>
                                                    <th class="py-2.5 px-3">Date</th>
                                                    <th class="py-2.5 px-3 min-w-[240px]">Mutual Fund / Folio</th>
                                                    <th class="py-2.5 px-3">Type</th>
                                                    <th class="py-2.5 px-3 text-right">Units</th>
                                                    <th class="py-2.5 px-3 text-right">NAV</th>
                                                    <th class="py-2.5 px-3 text-right">Amount</th>
                                                    <th class="py-2.5 px-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-wf-border-subtle bg-wf-surface">
                                                <tr 
                                                    v-for="txn in store.currentTransactions" 
                                                    :key="txn.id"
                                                    class="hover:bg-wf-surface-variant/40 transition-colors"
                                                    :class="{ 'bg-purple-50/40 dark:bg-purple-950/20': selectedTransactions.includes(txn.id) }"
                                                >
                                                    <td class="py-2 px-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            :checked="selectedTransactions.includes(txn.id)"
                                                            :disabled="txn.is_reconciled"
                                                            @change="toggleSelectTransaction(txn.id)"
                                                            class="rounded-wf-xs border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-3.5 h-3.5 disabled:opacity-40"
                                                        />
                                                    </td>

                                                    <td class="py-2 px-3 whitespace-nowrap text-wf-text-secondary font-medium tabular-nums">
                                                        {{ formatTxnDate(txn.date) }}
                                                    </td>

                                                    <td class="py-2 px-3">
                                                        <div class="font-semibold text-wf-text-primary line-clamp-2" :title="getCasSchemeName(txn)">
                                                            {{ getCasSchemeName(txn) }}
                                                        </div>
                                                        <div
                                                            v-if="getCasMappedName(txn)"
                                                            class="text-[11px] font-semibold text-wf-primary mt-0.5 line-clamp-1"
                                                            :title="getCasMappedName(txn)!"
                                                        >
                                                            ↳ {{ getCasMappedName(txn) }}
                                                        </div>
                                                        <div
                                                            v-if="txn.extra_data?.narration"
                                                            class="text-[10px] text-wf-text-muted truncate mt-0.5"
                                                            :title="txn.extra_data.narration"
                                                        >
                                                            {{ txn.extra_data.narration }}
                                                        </div>
                                                        <div class="text-[10px] flex items-center gap-1.5 flex-wrap mt-1">
                                                            <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-wf-surface-variant border border-wf-border font-mono font-semibold text-wf-text-secondary">
                                                                Folio: {{ getCasFolio(txn) || 'N/A' }}
                                                            </span>
                                                            <span v-if="txn.extra_data?.isin" class="font-mono text-wf-text-muted">
                                                                ISIN: {{ txn.extra_data.isin }}
                                                            </span>
                                                            <span v-if="txn.extra_data?.amfi || txn.extra_data?.scheme_code" class="font-mono text-wf-text-muted">
                                                                AMFI: {{ txn.extra_data.amfi || txn.extra_data.scheme_code }}
                                                            </span>
                                                            <span
                                                                v-if="isCasSnapshot(txn)"
                                                                class="inline-flex items-center px-1.5 py-0.5 rounded-wf-xs text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900/50"
                                                            >
                                                                SNAPSHOT
                                                            </span>
                                                            <span
                                                                v-if="txn.extra_data?.mapping_status === 'UNMAPPED' || (!txn.extra_data?.scheme_code && !txn.is_reconciled)"
                                                                class="inline-flex items-center px-1.5 py-0.5 rounded-wf-xs text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50"
                                                            >
                                                                Unmapped
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td class="py-2 px-3 whitespace-nowrap">
                                                        <span 
                                                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                                                            :class="isCasWithdrawal(txn)
                                                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/50'
                                                                : isCasSnapshot(txn)
                                                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900/50'
                                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50'"
                                                        >
                                                            {{ getCasOrderType(txn) }}
                                                        </span>
                                                    </td>

                                                    <td class="py-2 px-3 text-right whitespace-nowrap font-mono tabular-nums text-wf-text-secondary">
                                                        {{ txn.extra_data?.units != null ? Number(txn.extra_data.units).toFixed(3) : '-' }}
                                                    </td>

                                                    <td class="py-2 px-3 text-right whitespace-nowrap font-mono tabular-nums text-wf-text-secondary">
                                                        {{ txn.extra_data?.nav != null ? '₹' + Number(txn.extra_data.nav).toFixed(2) : '-' }}
                                                    </td>

                                                    <td
                                                        class="py-2 px-3 text-right whitespace-nowrap font-bold tabular-nums"
                                                        :class="isCasWithdrawal(txn) ? 'text-wf-error' : isCasSnapshot(txn) ? 'text-indigo-600 dark:text-indigo-400' : 'text-wf-success'"
                                                    >
                                                        {{ isCasWithdrawal(txn) ? '-' : isCasSnapshot(txn) ? '' : '+' }}{{ formatCurrency(txn.amount) }}
                                                    </td>

                                                    <td class="py-2 px-3 text-center whitespace-nowrap">
                                                        <span 
                                                            v-if="txn.is_reconciled" 
                                                            class="inline-flex items-center gap-1 text-[11px] font-semibold text-wf-success"
                                                            title="Imported into portfolio"
                                                        >
                                                            <CheckCircle2 class="w-3.5 h-3.5" />
                                                            <span>Imported</span>
                                                        </span>
                                                        <span 
                                                            v-else-if="txn.extra_data?.is_duplicate" 
                                                            class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400"
                                                            title="Already exists in portfolio"
                                                        >
                                                            <span>Duplicate</span>
                                                        </span>
                                                        <span 
                                                            v-else 
                                                            class="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400"
                                                            title="Ready to import"
                                                        >
                                                            <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                            <span>Ready</span>
                                                        </span>
                                                    </td>
                                                </tr>

                                                <tr v-if="store.currentTransactions.length === 0">
                                                    <td colspan="8" class="py-8 text-center text-wf-text-muted">
                                                        <div class="flex flex-col items-center justify-center">
                                                            <Table class="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
                                                            <span class="text-xs font-semibold">No mutual fund transactions extracted</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <!-- STANDARD BANK / CREDIT CARD TRANSACTION TABLE -->
                                        <table v-else class="w-full text-left border-collapse text-xs">
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

                                                    <td class="py-2 px-3 max-w-md">
                                                        <div v-if="getTxnMerchant(txn)" class="font-semibold text-wf-text-primary text-xs flex items-center gap-1.5 mb-0.5">
                                                            <Store class="w-3.5 h-3.5 text-wf-primary shrink-0" />
                                                            <span class="truncate">{{ getTxnMerchant(txn) }}</span>
                                                        </div>
                                                        <div 
                                                            :class="[
                                                                getTxnMerchant(txn) ? 'text-[11px] text-wf-text-secondary' : 'font-semibold text-wf-text-primary text-xs',
                                                                'line-clamp-2 break-words'
                                                            ]" 
                                                            :title="txn.description"
                                                        >
                                                            {{ txn.description }}
                                                        </div>
                                                        <div v-if="txn.ref_id" class="text-[10px] font-mono text-wf-text-muted mt-0.5 flex items-center gap-1">
                                                            <span>Ref: {{ txn.ref_id }}</span>
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
                                    <div class="p-2 border-t border-wf-border bg-wf-surface-variant/20">
                                        <WfPagination
                                            :page="txnPage"
                                            :page-size="txnLimit"
                                            :total="store.totalTransactions"
                                            :page-sizes="[10, 25, 50, 100]"
                                            @update:page="txnPage = $event"
                                            @update:page-size="txnLimit = $event; txnPage = 1"
                                        />
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
                                    v-else-if="attachmentUrl"
                                    :src="attachmentUrl" 
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
                                    <Mail class="w-8 h-8 text-wf-text-muted opacity-50 mx-auto mb-2" />
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
                        <WfSelect
                            v-model="uploadUser"
                            :items="userOptions"
                            size="md"
                            teleport
                        />
                    </div>

                    <!-- Target Account Select -->
                    <div class="space-y-1.5 text-left">
                        <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                            Target Account
                        </label>
                        <WfSelect
                            v-model="uploadAccount"
                            :items="uploadAccountOptions"
                            size="md"
                            teleport
                            searchable
                        />
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
            <div class="space-y-3">
                <div class="text-center space-y-2.5">
                    <div class="w-12 h-12 rounded-wf-pill bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                        <Trash2 class="w-6 h-6" />
                    </div>
                    <p class="text-xs text-wf-text-secondary">
                        Are you sure you want to delete <strong>{{ statementToDeleteObj?.filename || 'this statement' }}</strong>?
                    </p>
                </div>

                <div class="space-y-2 pt-2 border-t border-wf-border-subtle text-left text-xs text-wf-text-secondary">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            v-model="deleteVaultFile"
                            class="rounded-wf-xs border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer w-3.5 h-3.5"
                        />
                        <span>Also permanently delete the PDF file from Vault</span>
                    </label>
                    <label v-if="statementToDeleteObj?.email_sender" class="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            v-model="deleteCreateIgnoreRule"
                            class="rounded-wf-xs border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                        />
                        <span class="truncate">Also ignore future statements from <strong>{{ statementToDeleteObj.email_sender }}</strong></span>
                    </label>
                </div>
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

        <!-- MODAL: Bulk Delete Statements -->
        <WfModal v-model="bulkDeleteDialog" title="Delete Selected Statements?" maxWidth="sm">
            <div class="space-y-3">
                <p class="text-xs text-wf-text-secondary">
                    Delete <strong>{{ selectedStatementIds.length }}</strong> selected statement(s) and their extracted statement rows?
                </p>

                <div class="space-y-2 pt-2 border-t border-wf-border-subtle text-left text-xs text-wf-text-secondary">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            v-model="bulkDeleteVaultFile"
                            class="rounded-wf-xs border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer w-3.5 h-3.5"
                        />
                        <span>Also delete linked PDF files from Vault</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            v-model="bulkCreateIgnoreRules"
                            class="rounded-wf-xs border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                        />
                        <span>Also ignore future email statements from these senders</span>
                    </label>
                </div>
            </div>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="bulkDeleteDialog = false">
                    Cancel
                </WfButton>
                <WfButton variant="danger" size="sm" @click="confirmBulkDelete" :loading="bulkDeleting">
                    <span>Delete {{ selectedStatementIds.length }} Statement(s)</span>
                </WfButton>
            </template>
        </WfModal>

        <!-- MODAL: Ignore Future Statements -->
        <WfModal v-model="ignoreDialog" title="Ignore Future Statements" description="Automatically skip matching email PDF attachments before they enter your Statements or Vault." maxWidth="md">
            <div class="space-y-4 text-left">
                <div>
                    <label class="block text-xs font-semibold text-wf-text-secondary uppercase tracking-wider mb-1.5">
                        Match Rule By
                    </label>
                    <div class="grid grid-cols-3 gap-1.5">
                        <button
                            type="button"
                            @click="setIgnoreMatchType('sender')"
                            class="py-1.5 rounded-wf-md border text-xs font-semibold cursor-pointer"
                            :class="ignoreMatchType === 'sender' ? 'border-wf-primary bg-wf-primary/10 text-wf-primary' : 'border-wf-border text-wf-text-secondary'"
                        >
                            Email Sender
                        </button>
                        <button
                            type="button"
                            @click="setIgnoreMatchType('pattern')"
                            class="py-1.5 rounded-wf-md border text-xs font-semibold cursor-pointer"
                            :class="ignoreMatchType === 'pattern' ? 'border-wf-primary bg-wf-primary/10 text-wf-primary' : 'border-wf-border text-wf-text-secondary'"
                        >
                            Filename Keyword
                        </button>
                        <button
                            type="button"
                            @click="setIgnoreMatchType('subject')"
                            class="py-1.5 rounded-wf-md border text-xs font-semibold cursor-pointer"
                            :class="ignoreMatchType === 'subject' ? 'border-wf-primary bg-wf-primary/10 text-wf-primary' : 'border-wf-border text-wf-text-secondary'"
                        >
                            Email Subject
                        </button>
                    </div>
                </div>

                <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                        {{ ignoreMatchType === 'sender' ? 'Sender Email / Pattern' : ignoreMatchType === 'pattern' ? 'Filename Keyword' : 'Subject Contains' }}
                    </label>
                    <input
                        v-model="ignoreValue"
                        type="text"
                        placeholder="e.g. intimations@tdscpc.gov.in or DAILY MARGIN"
                        class="w-full h-10 px-3 bg-wf-surface border border-wf-border rounded-wf-md text-sm text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                    />
                </div>

                <div class="space-y-2 pt-2 border-t border-wf-border-subtle text-xs text-wf-text-secondary">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            v-model="ignoreDeleteMatching"
                            class="rounded-wf-xs border-slate-300 text-wf-primary focus:ring-wf-primary cursor-pointer w-3.5 h-3.5"
                        />
                        <span>Also clear other matching Pending/Failed statements</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            v-model="ignoreDeleteVaultFile"
                            class="rounded-wf-xs border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer w-3.5 h-3.5"
                        />
                        <span>Delete their PDF files from Vault</span>
                    </label>
                </div>
            </div>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="ignoreDialog = false">
                    Cancel
                </WfButton>
                <WfButton variant="primary" size="sm" :disabled="!ignoreValue.trim()" @click="confirmIgnoreStatement" :loading="ignoring">
                    <Ban class="w-4 h-4 mr-1.5" />
                    <span>Ignore & Remove</span>
                </WfButton>
            </template>
        </WfModal>

        <!-- MODAL: Edit Statement Metadata -->
        <WfModal v-model="reassignDialog" title="Edit Statement" description="Update statement filename, classification, or linked account." maxWidth="md">
            <div class="space-y-4">
                <div class="space-y-1.5 text-left">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                        Statement Filename
                    </label>
                    <input
                        v-model="editFilename"
                        type="text"
                        placeholder="Statement filename..."
                        class="w-full h-10 px-3 bg-wf-surface border border-wf-border rounded-wf-md text-sm text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                    />
                </div>

                <div class="space-y-1.5 text-left">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                        Statement Type
                    </label>
                    <WfSelect
                        v-model="editStatementType"
                        :items="statementTypeOptions"
                        size="md"
                        teleport
                    />
                </div>

                <div v-if="editStatementType !== 'MUTUAL_FUND_CAS'" class="space-y-1.5 text-left">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                        Target Account
                    </label>
                    <WfSelect
                        v-model="reassignAccountId"
                        :items="accountSelectOptions"
                        size="md"
                        teleport
                        searchable
                    />
                </div>
            </div>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="reassignDialog = false">
                    Cancel
                </WfButton>
                <WfButton variant="primary" size="sm" :disabled="!editFilename.trim()" @click="confirmReassign" :loading="reassigning">
                    <span>Save Changes</span>
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
                            <td class="py-2 px-3 max-w-sm">
                                <div v-if="getTxnMerchant(item)" class="font-semibold text-wf-text-primary text-xs flex items-center gap-1.5 mb-0.5">
                                    <Store class="w-3.5 h-3.5 text-wf-primary shrink-0" />
                                    <span class="truncate">{{ getTxnMerchant(item) }}</span>
                                </div>
                                <div :class="[getTxnMerchant(item) ? 'text-[11px] text-wf-text-secondary' : 'font-semibold text-wf-text-primary text-xs', 'line-clamp-2 break-words']" :title="item.description">
                                    {{ item.description }}
                                </div>
                                <div class="text-[10px] text-wf-text-muted mt-0.5 flex items-center gap-2">
                                    <span>{{ formatTxnDate(item.date) }}</span>
                                    <span v-if="item.ref_id" class="font-mono">Ref: {{ item.ref_id }}</span>
                                </div>
                            </td>

                            <td class="py-2 px-3 text-right font-bold tabular-nums">
                                {{ formatCurrency(item.amount) }}
                            </td>

                            <td class="py-2 px-3">
                                <WfSelect
                                    v-model="item.category"
                                    :items="bulkCategoryOptions"
                                    placeholder="-- Select Category --"
                                    size="sm"
                                    searchable
                                    :teleport="true"
                                />
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

        <!-- MODAL: Statement Ignore Rules Manager -->
        <WfModal
            v-model="showIgnoreRulesModal"
            title="Statement Ignore Rules"
            description="Email PDF attachments matching these rules are skipped automatically before entering Statements or Vault."
            maxWidth="md"
        >
            <div class="space-y-4 text-left">
                <!-- Quick Add Rule -->
                <div class="p-3 rounded-wf-md border border-wf-border bg-wf-surface-variant/30 space-y-2.5">
                    <div class="text-xs font-semibold text-wf-text-primary">Add Statement Ignore Rule</div>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <select
                            v-model="newRuleMatchType"
                            class="h-9 px-2.5 rounded-wf-sm border border-wf-border bg-wf-surface text-xs text-wf-text-primary"
                        >
                            <option value="sender">Email Sender</option>
                            <option value="pattern">Filename Keyword</option>
                            <option value="subject">Email Subject</option>
                        </select>
                        <input
                            v-model="newRuleValue"
                            type="text"
                            @keyup.enter="addStatementIgnoreRule"
                            :placeholder="newRuleMatchType === 'sender' ? 'e.g. noreply@groww.in' : newRuleMatchType === 'pattern' ? 'e.g. DAILY MARGIN' : 'e.g. Weekly Digest'"
                            class="flex-1 h-9 px-3 rounded-wf-sm border border-wf-border bg-wf-surface text-xs text-wf-text-primary focus:outline-none focus:ring-1 focus:ring-wf-primary"
                        />
                        <WfButton
                            size="sm"
                            :disabled="!newRuleValue.trim()"
                            :loading="savingNewRule"
                            @click="addStatementIgnoreRule"
                        >
                            <Plus class="w-3.5 h-3.5 mr-1" />
                            <span>Add</span>
                        </WfButton>
                    </div>
                </div>

                <!-- Rules List -->
                <div v-if="loadingIgnoreRules" class="py-6 text-center text-xs text-wf-text-muted">
                    Loading rules...
                </div>
                <div
                    v-else-if="statementIgnoreRules.length === 0"
                    class="py-8 text-center text-xs text-wf-text-muted border border-dashed border-wf-border rounded-wf-md"
                >
                    No statement ignore rules configured yet.
                </div>
                <div
                    v-else
                    class="divide-y divide-wf-border-subtle max-h-72 overflow-y-auto border border-wf-border rounded-wf-md bg-wf-surface"
                >
                    <div
                        v-for="rule in statementIgnoreRules"
                        :key="rule.id"
                        class="p-2.5 flex items-center justify-between gap-3"
                    >
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class="px-1.5 py-0.5 rounded-wf-xs bg-wf-surface-variant text-[10px] font-bold uppercase text-wf-text-secondary border border-wf-border-subtle">
                                    {{ rule.source }}
                                </span>
                                <span class="text-xs font-semibold text-wf-text-primary truncate">
                                    {{ rule.sender || rule.subject || rule.pattern }}
                                </span>
                            </div>
                            <p class="text-[11px] text-wf-text-muted mt-0.5">
                                Match on {{ rule.sender ? 'Sender' : rule.subject ? 'Subject' : 'Filename / Keyword' }}
                                <template v-if="rule.count_blocked > 0"> • Blocked {{ rule.count_blocked }}x</template>
                            </p>
                        </div>
                        <WfButton variant="secondary" size="sm" @click="removeStatementIgnoreRule(rule.id)">
                            <Trash2 class="w-3 h-3 mr-1" />
                            <span>Allow</span>
                        </WfButton>
                    </div>
                </div>
            </div>
        </WfModal>

        <!-- Force Attend Confirmation Modal -->
        <WfModal
            v-model="attendWarningDialog"
            title="Mark Statement as Attended?"
            size="sm"
        >
            <div class="space-y-3 p-1">
                <div class="p-3 rounded-wf-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
                    <AlertCircle class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div class="text-xs text-amber-900 dark:text-amber-200">
                        <p class="font-bold mb-1">Unreconciled Transactions Pending</p>
                        <p>This statement still has <strong>{{ unreconciledTxnCount }}</strong> unreconciled transaction(s).</p>
                        <p class="mt-1 text-amber-800 dark:text-amber-300 text-[11px]">Marking it as Attended will dismiss it from Needs Attention lists and top-bar action alerts. Are you sure you want to proceed?</p>
                    </div>
                </div>
            </div>
            <template #footer>
                <WfButton variant="ghost" size="sm" @click="attendWarningDialog = false">
                    Cancel
                </WfButton>
                <WfButton
                    variant="primary"
                    size="sm"
                    class="bg-amber-600 hover:bg-amber-700 text-white"
                    @click="targetStatementToAttend && confirmToggleAttended(targetStatementToAttend, true)"
                >
                    Force Mark Attended
                </WfButton>
            </template>
        </WfModal>
    </MainLayout>
</template>
