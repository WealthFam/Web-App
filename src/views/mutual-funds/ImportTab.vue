<template>
    <div class="space-y-3.5">
        <!-- Retrieval Instruction Note -->
        <div class="p-2.5 rounded-wf-md border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs text-wf-text-secondary flex items-center gap-2.5">
            <Info :size="16" class="text-wf-primary shrink-0" />
            <div class="leading-relaxed">
                Need your statement? Download your <strong class="text-wf-text-primary">Consolidated Account Statement (CAS)</strong> from
                <a href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement" target="_blank"
                    class="text-wf-primary font-semibold hover:underline">
                    CAMS Online
                </a>
                to either upload directly or scan via your Inbox Intelligence.
            </div>
        </div>

        <!-- Main Card -->
        <div class="rounded-wf-md border border-wf-border bg-wf-surface shadow-2xs overflow-hidden">
            <!-- Segmented Mode Switcher -->
            <div class="px-3.5 py-2 border-b border-wf-border bg-wf-surface flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-wf-sm bg-wf-surface-variant flex items-center justify-center"
                        :class="importMode === 'pdf' ? 'text-wf-primary' : 'text-purple-600 dark:text-purple-400'">
                        <component :is="activeIcon" :size="15" />
                    </div>
                    <div>
                        <h2 class="text-xs sm:text-sm font-bold text-wf-text-primary">
                            {{ importMode === 'pdf' ? 'Consolidate via PDF' : 'Email Inbox Intelligence' }}
                        </h2>
                        <p class="text-[11px] text-wf-text-secondary">
                            {{ importMode === 'pdf' ? 'Upload comprehensive portfolio statement to sync historical transactions.'
                                : 'Scan linked email inbox to automatically detect and import investments.' }}
                        </p>
                    </div>
                </div>

                <div class="flex items-center p-0.5 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md shadow-2xs">
                    <button
                        type="button"
                        @click="importMode = 'pdf'"
                        class="px-2.5 py-1 rounded-wf-sm text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        :class="importMode === 'pdf' ? 'bg-wf-surface text-wf-primary shadow-2xs border border-wf-border/60' : 'text-wf-text-secondary hover:text-wf-text-primary'"
                    >
                        <FileText :size="13" />
                        <span>PDF Statement</span>
                    </button>
                    <button
                        type="button"
                        @click="importMode = 'email'"
                        class="px-2.5 py-1 rounded-wf-sm text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        :class="importMode === 'email' ? 'bg-wf-surface text-purple-600 dark:text-purple-400 shadow-2xs border border-wf-border/60' : 'text-wf-text-secondary hover:text-wf-text-primary'"
                    >
                        <Mail :size="13" />
                        <span>Email Inbox</span>
                    </button>
                </div>
            </div>

            <div class="p-3.5">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                    <!-- Column 1: Configuration -->
                    <div class="md:col-span-5 flex flex-col justify-between p-3 rounded-wf-md border border-wf-border bg-wf-surface-variant/30 space-y-3">
                        <div class="space-y-3">
                            <div>
                                <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-secondary mb-1.5 block">
                                    TARGET USER
                                </label>
                                <!-- Family Member Selection -->
                                <select
                                    v-model="selectedMemberId"
                                    class="w-full h-8 px-2.5 text-xs font-semibold rounded-wf-md border border-wf-border bg-wf-surface text-wf-text-primary focus:outline-hidden focus:border-wf-primary transition-colors cursor-pointer"
                                >
                                    <option v-for="opt in memberOptions" :key="opt.value" :value="opt.value">
                                        {{ opt.title }} ({{ opt.initials }})
                                    </option>
                                </select>
                            </div>

                            <!-- PAN for Password Protection -->
                            <div>
                                <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-secondary mb-1.5 block">
                                    SECURITY ACCESS (PAN)
                                </label>
                                <div class="relative">
                                    <input
                                        v-model="panNumber"
                                        :type="showPan ? 'text' : 'password'"
                                        placeholder="ABCDE1234F"
                                        class="w-full h-8 px-2.5 pr-8 text-xs font-mono font-bold uppercase rounded-wf-md border border-wf-border bg-wf-surface text-wf-text-primary placeholder:text-wf-text-muted focus:outline-hidden focus:border-wf-primary transition-colors"
                                    />
                                    <button
                                        type="button"
                                        @click="showPan = !showPan"
                                        class="absolute right-2 top-1/2 -translate-y-1/2 text-wf-text-muted hover:text-wf-text-primary cursor-pointer"
                                        tabindex="-1"
                                    >
                                        <component :is="showPan ? EyeOff : Eye" :size="14" />
                                    </button>
                                </div>
                                <span class="text-[10px] text-wf-text-muted mt-1 block">
                                    {{ importMode === 'pdf' ? 'Statement password for decryption' : 'Password for attachment decryption' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Column 2: Action Area -->
                    <div class="md:col-span-7 flex flex-col justify-center">
                        <div v-if="importMode === 'pdf'"
                            class="p-6 rounded-wf-md border-2 border-dashed border-wf-primary/40 bg-indigo-50/20 dark:bg-indigo-950/10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-wf-primary transition-all h-full"
                            @click="fileInput?.click()">

                            <input type="file" ref="fileInput" class="hidden" accept=".pdf"
                                @change="(e: any) => file = e.target.files[0]">

                            <div class="w-10 h-10 rounded-full bg-wf-primary-light flex items-center justify-center text-wf-primary mb-2">
                                <FileText :size="20" />
                            </div>
                            <h3 class="text-xs sm:text-sm font-bold text-wf-text-primary mb-0.5">
                                {{ file ? file.name : 'Drop Portfolio Statement Here' }}
                            </h3>
                            <p class="text-[11px] text-wf-text-secondary">
                                {{ file ? `${(file.size / 1024 / 1024).toFixed(2)} MB • Ready for Analysis` :
                                    'or click to browse from your device' }}
                            </p>
                        </div>

                        <div v-else-if="importMode === 'email'"
                            class="p-6 rounded-wf-md border-2 border-dashed border-purple-500/40 bg-purple-50/20 dark:bg-purple-950/10 flex flex-col items-center justify-center text-center h-full">

                            <div class="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2">
                                <Mail :size="20" />
                            </div>
                            <h3 class="text-xs sm:text-sm font-bold text-wf-text-primary mb-0.5">
                                Automated Inbox Intelligence
                            </h3>
                            <p class="text-[11px] text-wf-text-secondary mb-3">
                                Scanning inbox for: <span class="font-semibold text-wf-text-primary">{{ selectedMemberEmail }}</span>
                            </p>

                            <select
                                v-model="emailSyncPeriod"
                                class="w-48 h-8 px-2.5 text-xs font-semibold rounded-wf-md border border-purple-200 dark:border-purple-900 bg-wf-surface text-wf-text-primary focus:outline-hidden focus:border-purple-500 transition-colors cursor-pointer"
                            >
                                <option v-for="opt in periodOptions" :key="opt.value" :value="opt.value">
                                    {{ opt.title }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Footer Action Row -->
                <div class="flex justify-end mt-3 pt-3 border-t border-wf-border-subtle">
                    <button v-if="importMode === 'pdf'"
                        type="button"
                        :disabled="!file || isProcessing"
                        @click="handlePreview"
                        class="h-8 px-4 text-xs font-bold rounded-wf-sm bg-wf-primary text-white hover:bg-wf-primary-dark transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                        <span>{{ isProcessing ? 'ANALYZING...' : 'ANALYZE STATEMENT' }}</span>
                        <ArrowRight :size="14" />
                    </button>
                    <button v-else
                        type="button"
                        :disabled="isProcessing"
                        @click="handlePreview"
                        class="h-8 px-4 text-xs font-bold rounded-wf-sm bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                        <span>{{ isProcessing ? 'SCANNING...' : 'START SCAN' }}</span>
                        <Search :size="14" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Preview Results Display (Full Width) -->
        <WfCard v-if="previewResults.length" variant="flat" padding="md" radius="xl" class="border border-emerald-300 dark:border-emerald-800/60 mb-8 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-wf-border-subtle">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-wf-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                        <Search :size="16" />
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-wf-text-primary">Detected Transactions</h3>
                        <p class="text-xs text-wf-text-muted">
                            {{ previewResults.filter(t => t.selected).length }} of {{ previewResults.length }} items selected for import
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    :disabled="isProcessing"
                    @click="handleConfirm"
                    class="h-9 px-5 text-xs font-bold rounded-wf-md text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    :class="importMode === 'pdf' ? 'bg-wf-primary hover:bg-wf-primary-dark' : 'bg-purple-600 hover:bg-purple-700'"
                >
                    <span>CONFIRM IMPORT</span>
                    <CheckCircle :size="16" />
                </button>
            </div>

            <!-- Enhanced Table -->
            <div class="rounded-wf-lg border border-wf-border bg-wf-surface overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-wf-surface-variant/50 border-b border-wf-border text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">
                            <tr>
                                <th class="text-center w-12 py-2.5 px-3">
                                    <input
                                        type="checkbox"
                                        :checked="allSelected"
                                        :indeterminate="someSelected && !allSelected"
                                        @change="toggleSelectAll"
                                        class="rounded border-wf-border text-wf-primary focus:ring-0 cursor-pointer"
                                    />
                                </th>
                                <th class="py-2.5 px-3">Status</th>
                                <th class="py-2.5 px-3">Execution Date</th>
                                <th class="py-2.5 px-3">Asset / Scheme</th>
                                <th class="py-2.5 px-3 text-right">Quantity</th>
                                <th class="py-2.5 px-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-wf-border-subtle">
                            <tr
                                v-for="(t, idx) in paginatedResults"
                                :key="idx"
                                class="hover:bg-wf-surface-variant/30 transition-colors"
                                :class="{ 'opacity-40': t.is_duplicate && !t.selected }"
                            >
                                <td class="text-center py-2.5 px-3">
                                    <input
                                        type="checkbox"
                                        v-model="t.selected"
                                        class="rounded border-wf-border text-wf-primary focus:ring-0 cursor-pointer"
                                    />
                                </td>
                                <td class="py-2.5 px-3">
                                    <div class="flex items-center gap-1.5" :title="t.mapping_status === 'MAPPED' ? (t.is_duplicate ? 'Redundant (Already in Portfolio)' : 'Verified Match') : 'Unknown Asset (Manual Link Required)'">
                                        <component
                                            :is="t.mapping_status === 'MAPPED' ? (t.is_duplicate ? AlertTriangle : CheckCircle) : HelpCircle"
                                            :size="16"
                                            :class="t.mapping_status === 'MAPPED' ? (t.is_duplicate ? 'text-amber-500' : 'text-emerald-500') : 'text-rose-500'"
                                        />
                                        <span class="text-[10px] font-bold">
                                            {{ t.mapping_status === 'MAPPED' ? (t.is_duplicate ? 'Duplicate' : 'Verified') : 'Unmapped' }}
                                        </span>
                                    </div>
                                </td>
                                <td class="py-2.5 px-3 font-mono font-bold text-wf-text-secondary whitespace-nowrap">
                                    {{ t.date }}
                                </td>
                                <td class="py-2.5 px-3">
                                    <div class="space-y-1">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-bold text-wf-text-primary">{{ t.scheme_name }}</span>
                                            <span
                                                class="px-1.5 py-0.2 rounded-wf-xs text-[10px] font-bold font-mono"
                                                :class="t.type === 'SELL' || t.type === 'REDEMPTION'
                                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900/40'
                                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-900/40'"
                                            >
                                                {{ t.type || 'BUY' }}
                                            </span>
                                            <span v-if="t.is_duplicate" class="px-1.5 py-0.2 rounded-wf-xs text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/40">
                                                DUPLICATE
                                            </span>
                                            <span v-if="t.is_synthesized" class="px-1.5 py-0.2 rounded-wf-xs text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-900/40">
                                                SNAPSHOT
                                            </span>
                                        </div>
                                        <div class="text-[10px] font-mono text-wf-text-muted">
                                            Folio: {{ t.folio_number || '---' }}
                                        </div>
                                        <div v-if="t.mapped_name && t.mapped_name !== t.scheme_name"
                                            class="text-[11px] font-semibold flex items-center gap-1"
                                            :class="importMode === 'pdf' ? 'text-wf-primary' : 'text-purple-600 dark:text-purple-400'">
                                            <CornerDownRight :size="12" />
                                            <span>{{ t.mapped_name }}</span>
                                        </div>
                                        <div v-if="t.mapping_status === 'UNMAPPED'" class="text-[11px] text-rose-500 font-semibold">
                                            ⚠️ Requires manual scheme mapping
                                        </div>
                                    </div>
                                </td>
                                <td class="py-2.5 px-3 text-right font-mono font-bold text-wf-text-primary tabular-nums">
                                    {{ t.units }}
                                </td>
                                <td class="py-2.5 px-3 text-right font-mono font-bold tabular-nums"
                                    :class="importMode === 'pdf' ? 'text-wf-primary' : 'text-purple-600 dark:text-purple-400'">
                                    ₹{{ t.amount }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Table Footer Pagination -->
                <div class="px-4 py-2.5 border-t border-wf-border-subtle bg-wf-surface-variant/30 flex items-center justify-between text-xs text-wf-text-secondary">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] font-medium text-wf-text-muted">Rows per page:</span>
                            <select
                                :value="itemsPerPage"
                                @change="(e: any) => itemsPerPage = Number(e.target.value)"
                                class="h-6 px-1.5 rounded-wf-sm border border-wf-border bg-wf-surface text-xs font-bold cursor-pointer"
                            >
                                <option :value="5">5</option>
                                <option :value="10">10</option>
                                <option :value="25">25</option>
                                <option :value="50">50</option>
                            </select>
                        </div>
                        <span class="text-[11px] font-medium text-wf-text-muted">
                            {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, previewResults.length) }} of {{ previewResults.length }}
                        </span>
                    </div>

                    <div class="flex items-center gap-1">
                        <button
                            type="button"
                            :disabled="currentPage === 1"
                            @click="currentPage--"
                            class="h-6 w-6 rounded-wf-sm border border-wf-border bg-wf-surface hover:bg-wf-surface-variant flex items-center justify-center text-wf-text-secondary disabled:opacity-40 cursor-pointer"
                        >
                            <ChevronLeft :size="14" />
                        </button>
                        <button
                            type="button"
                            :disabled="currentPage * itemsPerPage >= previewResults.length"
                            @click="currentPage++"
                            class="h-6 w-6 rounded-wf-sm border border-wf-border bg-wf-surface hover:bg-wf-surface-variant flex items-center justify-center text-wf-text-secondary disabled:opacity-40 cursor-pointer"
                        >
                            <ChevronRight :size="14" />
                        </button>
                    </div>
                </div>
            </div>
        </WfCard>

        <!-- Success Message Modal -->
        <WfModal
            v-model="showSuccessDialog"
            title="Import Successful"
            description="Statement processed and verified"
            maxWidth="sm"
        >
            <div class="py-4 text-center space-y-4">
                <div class="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle :size="28" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-wf-text-primary">Portfolio Synchronized</h3>
                    <p class="text-xs text-wf-text-muted mt-1">{{ uploadMessage }}</p>
                </div>
            </div>

            <template #footer>
                <button
                    type="button"
                    @click="showSuccessDialog = false"
                    class="px-4 py-2 text-xs font-semibold rounded-wf-md border border-wf-border text-wf-text-muted hover:text-wf-text-primary transition-colors cursor-pointer"
                >
                    Dismiss
                </button>
                <button
                    type="button"
                    @click="finishImport"
                    class="px-5 py-2 text-xs font-bold rounded-wf-md bg-wf-primary text-white hover:bg-wf-primary-dark transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                    <span>View Updated Portfolio</span>
                    <ArrowRight :size="14" />
                </button>
            </template>
        </WfModal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
    FileText, Mail, CheckCircle, ArrowRight, AlertTriangle,
    HelpCircle, Search, CornerDownRight, Info,
    Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-vue-next'

import WfCard from '@/components/ui/WfCard.vue'
import WfModal from '@/components/ui/WfModal.vue'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useMutualFundStore } from '@/stores/finance/mutualFunds'
import { financeApi } from '@/api/client'

const emit = defineEmits(['success'])
const notify = useNotificationStore()
const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const mfStore = useMutualFundStore()

const importMode = ref<'pdf' | 'email'>('pdf')
const selectedMemberId = ref<string | null>(authStore.selectedMemberId)

const selectedMemberEmail = computed(() => {
    const member = memberOptions.value.find(m => String(m.value) === String(selectedMemberId.value))
    return member?.email || authStore.user?.email || 'No email linked'
})

const panNumber = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const emailSyncPeriod = ref('1m')
const isProcessing = ref(false)
const previewResults = ref<any[]>([])
const uploadMessage = ref('')
const showSuccessDialog = ref(false)
const showPan = ref(false)

const activeIcon = computed(() => importMode.value === 'pdf' ? FileText : Mail)

const periodOptions = [
    { title: 'Last 1 Month', value: '1m' },
    { title: 'Last 3 Months', value: '3m' },
    { title: 'Last 6 Months', value: '6m' },
    { title: 'Last 1 Year', value: '1y' },
    { title: 'All Time', value: 'all' }
]

const itemsPerPage = ref(10)
const currentPage = ref(1)

const paginatedResults = computed(() => {
    if (!Array.isArray(previewResults.value)) return []
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return previewResults.value.slice(start, end)
})

const memberOptions = computed(() => {
    return (authStore.familyMembers || []).map(m => ({
        title: (m.full_name || m.email?.split('@')[0] || 'Unknown User'),
        value: m.id,
        email: m.email,
        initials: (m.full_name || m.email || 'UU').substring(0, 2).toUpperCase(),
        pan: m.pan_number
    }))
})

// Auto-populate PAN when member changes
watch(selectedMemberId, (newId) => {
    if (!newId) return
    const member = authStore.familyMembers.find(m => m.id === newId)
    if (member && member.pan_number) {
        panNumber.value = member.pan_number
    } else if (authStore.user?.id === newId && authStore.user?.pan_number) {
        panNumber.value = authStore.user.pan_number
    }
}, { immediate: true })

onMounted(() => {
    if (!selectedMemberId.value && authStore.user?.id) {
        selectedMemberId.value = authStore.user.id
    }
})

async function handlePreview() {
    isProcessing.value = true
    previewResults.value = []

    try {
        let res
        if (importMode.value === 'pdf') {
            if (!file.value) return
            const formData = new FormData()
            formData.append('file', file.value)
            formData.append('password', panNumber.value)
            if (selectedMemberId.value) {
                formData.append('user_id', selectedMemberId.value)
            }
            res = await financeApi.previewCAS(formData)
        } else {
            const formData = new FormData()
            formData.append('password', panNumber.value)
            formData.append('period', emailSyncPeriod.value)
            if (selectedMemberId.value) {
                formData.append('user_id', selectedMemberId.value)
            }
            res = await financeApi.previewCASEmail(formData)
        }

        previewResults.value = (res.data.transactions || []).map((t: any) => ({
            ...t,
            selected: !t.is_duplicate // Pre-unselect duplicates
        }))

        if (previewResults.value.length === 0) {
            notify.info("No new transactions found in this statement.")
        }
    } catch (err: any) {
        const errorMsg = err.response?.data?.detail || 'Process failed. Please verify statement password.'
        notify.error(errorMsg)
    } finally {
        isProcessing.value = false
    }
}

const allSelected = computed(() => {
    return previewResults.value.length > 0 && previewResults.value.every(t => t.selected)
})

const someSelected = computed(() => {
    return previewResults.value.some(t => t.selected)
})

function toggleSelectAll() {
    const target = !allSelected.value
    previewResults.value.forEach(t => t.selected = target)
}

async function handleConfirm() {
    const toImport = previewResults.value.filter(t => t.selected)
    if (toImport.length === 0) {
        notify.error('Please select at least one transaction to import.')
        return
    }

    isProcessing.value = true
    try {
        await financeApi.confirmImport(toImport, selectedMemberId.value || undefined)
        uploadMessage.value = `Strategic command executed for ${toImport.length} transactions.`
        showSuccessDialog.value = true
        previewResults.value = []
        notify.success('Portfolio synchronization complete')
    } finally {
        isProcessing.value = false
    }
}

function finishImport() {
    showSuccessDialog.value = false
    
    // Clear local MF cache to force absolute fresh fetch on next navigation
    mfStore.clearPortfolioCache()
    
    // Refresh global dashboard in the background
    dashboardStore.fetchDashboardData()
    // Signal parent to switch to portfolio tab
    emit('success')
}
</script>
