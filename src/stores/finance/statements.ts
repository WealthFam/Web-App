import { defineStore } from 'pinia'
import { ref } from 'vue'
import { financeApi } from '@/api/client'

export interface StatementTransaction {
    id: string
    statement_id: string
    date: string
    amount: number
    type: 'CREDIT' | 'DEBIT'
    description: string
    ref_id?: string
    category_suggestion?: string
    is_reconciled: boolean
    matched_transaction_id?: string
}

export interface Statement {
    id: string
    account_id: string
    vault_id?: string
    filename: string
    status: 'PENDING' | 'PARSED' | 'FAILED'
    source: 'EMAIL' | 'MANUAL'
    created_at: string
}

export const useStatementStore = defineStore('statements', () => {
    const statements = ref<Statement[]>([])
    const currentTransactions = ref<StatementTransaction[]>([])
    const loading = ref(false)
    const syncing = ref(false)

    async function fetchStatements() {
        loading.value = true
        try {
            const res = await financeApi.getStatements()
            statements.value = res.data
        } catch (error) {
            console.error('[StatementStore] Failed to fetch statements', error)
        } finally {
            loading.value = false
        }
    }

    async function fetchTransactions(statementId: string) {
        loading.value = true
        try {
            const res = await financeApi.getStatementTransactions(statementId)
            currentTransactions.value = res.data
        } catch (error) {
            console.error('[StatementStore] Failed to fetch transactions', error)
        } finally {
            loading.value = false
        }
    }

    async function uploadStatement(file: File, password?: string, accountId?: string) {
        loading.value = true
        const formData = new FormData()
        formData.append('file', file)
        if (password) formData.append('password', password)
        if (accountId) formData.append('account_id', accountId)
        
        try {
            const res = await financeApi.uploadStatement(formData)
            await fetchStatements()
            return res.data
        } catch (error) {
            console.error('[StatementStore] Upload failed', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    async function deleteStatement(id: string) {
        try {
            await financeApi.deleteStatement(id)
            await fetchStatements()
            currentTransactions.value = []
        } catch (error) {
            console.error('[StatementStore] Delete failed', error)
            throw error
        }
    }

    async function triggerSync(sinceDate?: string) {
        syncing.value = true
        try {
            await financeApi.syncStatements(sinceDate)
            await fetchStatements()
        } catch (error) {
            console.error('[StatementStore] Sync failed', error)
        } finally {
            syncing.value = false
        }
    }

    async function ingestTransaction(id: string, category?: string) {
        try {
            await financeApi.ingestStatementTransaction(id, category)
            // Update local state to show reconciled
            const txn = currentTransactions.value.find(t => t.id === id)
            if (txn) {
                txn.is_reconciled = true
            }
        } catch (error) {
            console.error('[StatementStore] Ingestion failed', error)
        }
    }

    async function reconcileStatement(id: string) {
        try {
            await financeApi.reconcileStatement(id)
            // Re-fetch transactions to get updated status
            await fetchTransactions(id)
        } catch (error) {
            console.error('[StatementStore] Reconcile failed', error)
            throw error
        }
    }

    async function bulkIngestTransactions(items: { transaction_id: string, category: string | null, create_rule: boolean, exclude_from_reports: boolean }[]) {
        try {
            await financeApi.bulkIngestStatementTransactions({ items })
            // Update local state to show reconciled
            const ingestedIds = items.map(i => i.transaction_id)
            for (const txn of currentTransactions.value) {
                if (ingestedIds.includes(txn.id)) {
                    txn.is_reconciled = true
                }
            }
        } catch (error) {
            console.error('[StatementStore] Bulk ingestion failed', error)
            throw error
        }
    }

    async function retryParsing(id: string, password: string) {
        loading.value = true
        try {
            await financeApi.retryParsingStatement(id, password)
            await fetchStatements()
        } catch (error) {
            console.error('[StatementStore] Retry parsing failed', error)
            throw error
        } finally {
            loading.value = false
        }
    }

    return {
        statements,
        currentTransactions,
        loading,
        syncing,
        fetchStatements,
        fetchTransactions,
        uploadStatement,
        deleteStatement,
        triggerSync,
        ingestTransaction,
        bulkIngestTransactions,
        reconcileStatement,
        retryParsing
    }
})
