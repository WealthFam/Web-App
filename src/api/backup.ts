import apiClient from './client'

export interface BackupExportOptions {
    passphrase?: string
    encrypt: boolean
    include_vault_files: boolean
}

export interface BackupInspectResult {
    format_version: string
    encrypted: boolean
    exported_at: string | null
    tenant_name: string | null
    member_emails: string[]
    owner_emails: string[]
    email_authorized: boolean
    authorization_message: string
    counts: Record<string, number>
    vault_files_count: number
    warnings: string[]
}

export interface BackupImportResult {
    status: string
    mode: string
    tenant_name: string | null
    imported_counts: Record<string, number>
    skipped_counts: Record<string, number>
    vault_files_restored: number
    vault_files_missing: number
    recreated_members: string[]
    warnings: string[]
    message: string
}

const BACKUP_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes for large Vault archives

/**
 * Extract a clean human-readable error message from Axios errors,
 * including JSON error payloads wrapped inside a Blob response.
 */
export async function extractBackupError(err: any, fallback = 'Backup operation failed'): Promise<string> {
    const data = err?.response?.data
    if (data instanceof Blob) {
        try {
            const text = await data.text()
            const parsed = JSON.parse(text)
            if (typeof parsed?.detail === 'string') return parsed.detail
            if (typeof parsed?.message === 'string') return parsed.message
        } catch {
            // Fall through to default message
        }
    }
    if (typeof data?.detail === 'string') return data.detail
    if (typeof data?.message === 'string') return data.message
    return err?.message || fallback
}

export const backupApi = {
    exportBackup: (payload: BackupExportOptions) =>
        apiClient.post('/backup/export', payload, {
            responseType: 'blob',
            timeout: BACKUP_TIMEOUT_MS,
            skipNotification: true,
        }),

    inspectBackup: (file: File, passphrase?: string) => {
        const formData = new FormData()
        formData.append('file', file)
        if (passphrase) {
            formData.append('passphrase', passphrase)
        }
        return apiClient.post<BackupInspectResult>('/backup/inspect', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: BACKUP_TIMEOUT_MS,
            skipNotification: true,
        })
    },

    importBackup: (file: File, passphrase?: string, mode: 'merge' | 'replace' = 'merge') => {
        const formData = new FormData()
        formData.append('file', file)
        if (passphrase) {
            formData.append('passphrase', passphrase)
        }
        formData.append('mode', mode)
        return apiClient.post<BackupImportResult>('/backup/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: BACKUP_TIMEOUT_MS,
            skipNotification: true,
        })
    },
}
