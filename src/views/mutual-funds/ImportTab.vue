<template>
    <div class="import-page-wrapper">
        <!-- Retrieval Instruction Note (Global Requirement) -->
        <v-alert type="info" variant="tonal" class="mb-6 rounded-xl border-dashed border-opacity-30" border="start"
            density="comfortable">
            <template v-slot:prepend>
                <Info :size="20" class="mr-2 text-info" />
            </template>
            <div class="text-body-2 font-weight-bold">
                Need your statement? Download your **Consolidated Account Statement (CAS)** from
                <a href="https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement" target="_blank"
                    class="text-primary text-decoration-none border-b border-primary border-opacity-30 pb-0 hover-opacity-70">
                    CAMS Online
                </a>
                to either upload directly or scan via your Inbox Intelligence.
            </div>
        </v-alert>

        <!-- Main Card: Dashboard Standard Width -->
        <v-card class="premium-glass-card mb-8" rounded="xl" elevation="0" style="overflow: hidden;">
            <!-- Refined Integrated Tab Bar -->
            <div class="card-tabs-header border-b border-white-10 rounded-t-xl"
                :class="importMode === 'pdf' ? 'bg-indigo-lighten-5' : 'bg-purple-lighten-5'">
                <v-tabs v-model="importMode" :color="importMode === 'pdf' ? 'primary' : 'secondary'" align-tabs="start"
                    height="64" :slider-color="importMode === 'pdf' ? 'primary' : 'secondary'">
                    <v-tab value="pdf" class="premium-ribbon-tab">
                        <div class="d-flex align-center py-2">
                            <FileText :size="18" class="mr-3 opacity-70" />
                            <span class="tab-label">PDF Statement</span>
                        </div>
                    </v-tab>
                    <v-tab value="email" class="premium-ribbon-tab">
                        <div class="d-flex align-center py-2">
                            <Mail :size="18" class="mr-3 opacity-70" />
                            <span class="tab-label">Email Inbox</span>
                        </div>
                    </v-tab>
                </v-tabs>
            </div>

            <v-card-text class="pa-10">
                <!-- Instruction Header -->
                <div class="d-flex align-center gap-4 mb-8">
                    <div class="icon-glow-box" :class="importMode === 'pdf' ? 'primary' : 'secondary'">
                        <component :is="activeIcon" :size="24"
                            :class="importMode === 'pdf' ? 'text-primary' : 'text-secondary'" />
                    </div>
                    <div>
                        <h2 class="text-h5 font-weight-black text-content mb-1">
                            {{ importMode === 'pdf' ? 'Consolidate via PDF' : 'Email Inbox Intelligence' }}
                        </h2>
                        <p class="text-body-2 text-medium-emphasis opacity-70 font-weight-medium">
                            {{ importMode === 'pdf' ? `Upload your comprehensive portfolio statement to sync your entire
                            history.`
                                : `Scan your linked inbox to automatically detect and import new transactions.` }}
                        </p>
                    </div>
                </div>

                <v-row>
                    <!-- Column 1: Configuration -->
                    <v-col cols="12" md="5" class="d-flex flex-column">
                        <div
                            class="config-section pa-6 rounded-2xl border border-white-5 bg-white-2 shadow-inner h-100">
                            <label class="text-overline font-weight-black mb-3 d-block letter-spacing-2"
                                :class="importMode === 'pdf' ? 'text-primary' : 'text-secondary'">
                                TARGET USER
                            </label>

                            <!-- Family Member Selection -->
                            <v-autocomplete v-model="selectedMemberId" :items="memberOptions" item-title="title"
                                item-value="value" variant="outlined" density="comfortable" rounded="lg"
                                bg-color="surface" :color="importMode === 'pdf' ? 'primary' : 'secondary'"
                                class="mb-4 font-weight-bold" placeholder="Select Profile" persistent-placeholder>
                                <template v-slot:item="{ props, item }">
                                    <v-list-item v-bind="props" class="rounded-lg ma-1">
                                        <template v-slot:prepend>
                                            <v-avatar size="28" :color="importMode === 'pdf' ? 'primary' : 'secondary'"
                                                variant="tonal" class="mr-2">
                                                <span class="text-caption font-weight-black">{{ item.raw.initials
                                                    }}</span>
                                            </v-avatar>
                                        </template>
                                    </v-list-item>
                                </template>
                            </v-autocomplete>

                            <!-- PAN for Password Protection -->
                            <label class="text-overline font-weight-black mb-1 d-block letter-spacing-2"
                                :class="importMode === 'pdf' ? 'text-primary' : 'text-secondary'">
                                SECURITY ACCESS (PAN)
                            </label>
                            <v-text-field v-model="panNumber" :type="showPan ? 'text' : 'password'"
                                placeholder="ABCDE1234F" variant="outlined" density="comfortable" rounded="lg"
                                bg-color="surface" :color="importMode === 'pdf' ? 'primary' : 'secondary'"
                                class="mb-0 font-weight-black text-uppercase shadow-inner"
                                :hint="importMode === 'pdf' ? 'Statement password for decryption' : 'Password for attachment decryption'"
                                persistent-hint>
                                <template v-slot:append-inner>
                                    <v-icon :icon="showPan ? 'mdi-eye-off' : 'mdi-eye'" @click="showPan = !showPan"
                                        class="cursor-pointer" />
                                    <v-tooltip activator="parent" location="top">Toggle visibility</v-tooltip>
                                </template>
                            </v-text-field>
                        </div>
                    </v-col>

                    <!-- Column 2: Action Area (Synchronized) -->
                    <v-col cols="12" md="7" class="d-flex flex-column">
                        <div v-if="importMode === 'pdf'"
                            class="action-section d-flex flex-column justify-center h-100 pa-10 rounded-2xl border-2 border-primary border-opacity-30 border-dashed bg-primary-lighten-5 drop-zone-wrapper hover-lift"
                            @click="fileInput?.click()">

                            <input type="file" ref="fileInput" class="d-none" accept=".pdf"
                                @change="(e: any) => file = e.target.files[0]">

                            <div class="text-center">
                                <div class="pdf-icon-container mx-auto mb-4">
                                    <FileText :size="48" class="text-primary" />
                                    <div class="pdf-badge">PDF</div>
                                </div>
                                <h3 class="text-h6 font-weight-black text-primary mb-1">
                                    {{ file ? file.name : 'Drop Portfolio Statement Here' }}
                                </h3>
                                <p class="text-caption font-weight-bold opacity-60 mb-0">
                                    {{ file ? `${(file.size / 1024 / 1024).toFixed(2)} MB • Ready for Analysis` :
                                        'or click to browse your digital vault' }}
                                </p>
                            </div>
                        </div>

                        <div v-else-if="importMode === 'email'"
                            class="action-section d-flex flex-column justify-center h-100 pa-10 rounded-2xl border-2 border-secondary border-opacity-30 border-dashed bg-secondary-lighten-5 scan-zone-wrapper">

                            <div class="text-center mb-8">
                                <div class="email-icon-container mx-auto mb-4">
                                    <Mail :size="48" class="text-secondary" />
                                    <div class="email-badge">INBOX</div>
                                </div>
                                <h3 class="text-h6 font-weight-black text-secondary mb-1">
                                    Automated Inbox Intelligence
                                </h3>
                                <p class="text-caption font-weight-bold opacity-60 mb-0">
                                    Scanning inbox for: <span class="text-secondary opacity-100">{{ selectedMemberEmail
                                        }}</span>
                                </p>
                            </div>

                            <v-autocomplete v-model="emailSyncPeriod" :items="periodOptions" item-title="title"
                                item-value="value" variant="outlined" density="comfortable" rounded="lg"
                                bg-color="surface" color="secondary" class="mb-0 font-weight-black shadow-sm"
                                label="Scan Window">
                                <template v-slot:item="{ props }">
                                    <v-list-item v-bind="props" class="rounded-lg ma-1">
                                        <template v-slot:prepend>
                                            <Clock :size="16" class="mr-3 text-secondary opacity-70" />
                                        </template>
                                    </v-list-item>
                                </template>
                            </v-autocomplete>
                        </div>
                    </v-col>
                </v-row>

                <!-- Footer Action Row -->
                <v-row class="mt-6">
                    <v-col cols="12" class="d-flex justify-end">
                        <v-btn v-if="importMode === 'pdf'" color="primary" height="48" rounded="pill"
                            class="font-weight-black px-10 shadow-primary" :loading="isProcessing" :disabled="!file"
                            @click="handlePreview">
                            ANALYZE STATEMENT
                            <ArrowRight :size="18" class="ml-2" />
                        </v-btn>
                        <v-btn v-else color="secondary" height="48" rounded="pill"
                            class="font-weight-black px-10 shadow-secondary hover-lift" :loading="isProcessing"
                            @click="handlePreview">
                            START AI SCAN
                            <Sparkles :size="20" class="ml-2" />
                        </v-btn>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Preview Results Display (Full Width) -->
        <v-expand-transition>
            <v-card v-if="previewResults.length" class="premium-glass-card border-success border-opacity-30 mb-8"
                rounded="xl">
                <v-card-text class="pa-8">
                    <div class="d-flex flex-column flex-md-row justify-space-between align-center mb-6 gap-4">
                        <div class="d-flex align-center gap-3">
                            <div class="icon-glow-box success small">
                                <Search :size="18" class="text-success" />
                            </div>
                            <div>
                                <h3 class="text-h6 font-weight-black">Detected Transactions</h3>
                                <p class="text-body-2 text-medium-emphasis font-weight-bold">
                                    {{previewResults.filter(t => t.selected).length}} of {{ previewResults.length }}
                                    items
                                    selected for command
                                </p>
                            </div>
                        </div>
                        <v-btn :color="importMode === 'pdf' ? 'primary' : 'secondary'" variant="flat" rounded="pill"
                            height="48" class="px-8 font-weight-black hover-lift"
                            :class="importMode === 'pdf' ? 'shadow-primary' : 'shadow-secondary'"
                            @click="handleConfirm">
                            CONFIRM IMPORT
                            <CheckCircle :size="18" class="ml-2" />
                        </v-btn>
                    </div>

                    <!-- Enhanced Table -->
                    <div class="rounded-xl border border-white-10 overflow-hidden bg-white-1">
                        <v-table density="comfortable" class="premium-data-table">
                            <thead>
                                <tr class="bg-surface-light">
                                    <th class="text-center" style="width: 50px;">
                                        <v-checkbox-btn :model-value="allSelected"
                                            :indeterminate="someSelected && !allSelected"
                                            :color="importMode === 'pdf' ? 'primary' : 'secondary'"
                                            @click.stop="toggleSelectAll" density="compact" />
                                    </th>
                                    <th class="text-left text-overline font-weight-black opacity-60">Status</th>
                                    <th class="text-left text-overline font-weight-black opacity-60">Execution Date</th>
                                    <th class="text-left text-overline font-weight-black opacity-60">Asset / Scheme</th>
                                    <th class="text-right text-overline font-weight-black opacity-60">Quantity</th>
                                    <th class="text-right text-overline font-weight-black opacity-60">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(t, idx) in paginatedResults" :key="idx"
                                    :class="{ 'opacity-40': t.is_duplicate && !t.selected, 'hover-row': true, 'secondary-hover': importMode === 'email' }">
                                    <td class="text-center">
                                        <v-checkbox-btn v-model="t.selected"
                                            :color="importMode === 'pdf' ? 'primary' : 'secondary'" density="compact" />
                                    </td>
                                    <td>
                                        <div class="d-flex align-center">
                                            <component
                                                :is="t.mapping_status === 'MAPPED' ? (t.is_duplicate ? AlertTriangle : CheckCircle) : HelpCircle"
                                                :size="18"
                                                :class="t.mapping_status === 'MAPPED' ? (t.is_duplicate ? 'text-warning' : 'text-success') : 'text-error'">
                                            </component>
                                            <v-tooltip activator="parent" location="top">
                                                {{ t.mapping_status === 'MAPPED' ? (t.is_duplicate ? `Redundant (Already
                                                in
                                                Portfolio)` :
                                                    `Verified Match`) : `Unknown Asset (Manual Link Required)` }}
                                            </v-tooltip>
                                        </div>
                                    </td>
                                    <td class="text-body-2 font-weight-bold opacity-80 monospaced">{{ t.date }}</td>
                                    <td class="py-4">
                                        <div class="d-flex flex-column gap-1">
                                            <div
                                                class="text-body-2 font-weight-black text-content d-flex align-center gap-2">
                                                {{ t.scheme_name }}
                                                <v-chip size="x-small"
                                                    :color="t.type === 'SELL' || t.type === 'REDEMPTION' ? 'error' : 'success'"
                                                    variant="tonal" class="text-tiny px-2 font-weight-black">
                                                    {{ t.type || 'BUY' }}
                                                </v-chip>
                                                <v-chip v-if="t.is_duplicate" size="x-small" color="warning"
                                                    variant="flat"
                                                    class="text-tiny px-2 font-weight-black">DUPLICATE</v-chip>
                                                <v-chip v-if="t.is_synthesized" size="x-small" color="info"
                                                    variant="tonal" class="text-tiny px-2 font-weight-black">STATEMENT
                                                    SNAPSHOT</v-chip>
                                            </div>
                                            <div class="text-tiny opacity-60 font-weight-bold monospaced pb-1">
                                                Folio: {{ t.folio_number || '---' }}
                                            </div>
                                            <div v-if="t.mapped_name && t.mapped_name !== t.scheme_name"
                                                class="text-caption font-weight-bold"
                                                :class="importMode === 'pdf' ? 'text-primary' : 'text-secondary'">
                                                <CornerDownRight :size="12" class="mr-1" />
                                                {{ t.mapped_name }}
                                            </div>
                                            <div v-if="t.mapping_status === 'UNMAPPED'"
                                                class="text-caption text-error font-weight-bold">
                                                ⚠️ Requires manual scheme mapping
                                            </div>
                                        </div>
                                    </td>
                                    <td class="text-right text-body-2 font-weight-black monospaced">{{ t.units }}</td>
                                    <td class="text-right text-body-2 font-weight-black monospaced"
                                        :class="importMode === 'pdf' ? 'text-primary' : 'text-secondary'">₹{{ t.amount
                                        }}</td>
                                </tr>
                            </tbody>
                        </v-table>

                        <div class="px-6 py-4 d-flex align-center justify-space-between border-t border-white-10">
                            <div class="d-flex align-center gap-6">
                                <div class="d-flex align-center gap-3">
                                    <span class="text-caption font-weight-bold opacity-60">Rows per page:</span>
                                    <v-select :model-value="itemsPerPage" :items="[5, 10, 25, 50]" variant="plain"
                                        density="compact" hide-details class="rows-select"
                                        @update:model-value="itemsPerPage = $event" />
                                </div>
                                <span class="text-caption font-weight-black opacity-40">{{ (currentPage - 1) *
                                    itemsPerPage + 1
                                    }}-{{ Math.min(currentPage * itemsPerPage, previewResults.length) }} of {{
                                        previewResults.length }}</span>
                            </div>
                            <div class="d-flex align-center gap-2">
                                <v-btn icon variant="text" size="small" :disabled="currentPage === 1"
                                    @click="currentPage--">
                                    <v-icon icon="mdi-chevron-left" />
                                </v-btn>
                                <v-btn icon variant="text" size="small"
                                    :disabled="currentPage * itemsPerPage >= previewResults.length"
                                    @click="currentPage++">
                                    <v-icon icon="mdi-chevron-right" />
                                </v-btn>
                            </div>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-expand-transition>

        <!-- Success Message -->
        <v-dialog v-model="showSuccessDialog" max-width="500">
            <v-card class="premium-glass-card text-center pa-8 overflow-hidden" rounded="xl">
                <div class="icon-glow-box success mx-auto mb-6">
                    <CheckCircle :size="32" class="text-success" />
                </div>
                <h3 class="text-h4 font-weight-black mb-2">Import Successful</h3>
                <p class="text-body-1 text-medium-emphasis mb-8">{{ uploadMessage }}</p>

                <div class="d-flex flex-column gap-3">
                    <v-btn to="/mutual-funds" color="primary" block height="56" rounded="pill"
                        class="font-weight-black shadow-primary" @click="showSuccessDialog = false">
                        VIEW UPDATED PORTFOLIO
                        <ArrowRight :size="18" class="ml-2" />
                    </v-btn>

                    <v-btn variant="text" block height="48" rounded="pill" class="font-weight-bold opacity-60"
                        @click="showSuccessDialog = false">
                        DISMISS
                    </v-btn>
                </div>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
    FileText, Mail, CheckCircle, ArrowRight, AlertTriangle,
    HelpCircle, Sparkles, Search, CornerDownRight, Clock, Info
} from 'lucide-vue-next'

import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import { financeApi } from '@/api/client'

const notify = useNotificationStore()
const authStore = useAuthStore()

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

// Set default member on mount
import { onMounted } from 'vue'
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
            res = await financeApi.previewCAS(formData)
        } else {
            const formData = new FormData()
            formData.append('password', panNumber.value)
            formData.append('period', emailSyncPeriod.value)
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
    } catch (err: any) {
        notify.error('Strategic Import Failed')
    } finally {
        isProcessing.value = false
    }
}
</script>

<style scoped>
.import-page-wrapper {
    animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.premium-data-table {
    background: transparent !important;
}

.premium-data-table :deep(tr:not(.bg-surface-light)) {
    transition: all 0.2s ease;
}

.premium-data-table :deep(.hover-row:hover) {
    background: rgba(var(--v-theme-primary), 0.04) !important;
}

.premium-data-table :deep(.secondary-hover:hover) {
    background: rgba(var(--v-theme-secondary), 0.04) !important;
}

.icon-glow-box {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-glow-box.primary {
    background: rgba(var(--v-theme-primary), 0.1);
    border: 1px solid rgba(var(--v-theme-primary), 0.2);
    box-shadow: 0 0 20px rgba(var(--v-theme-primary), 0.15);
}

.icon-glow-box.secondary {
    background: rgba(var(--v-theme-secondary), 0.1);
    border: 1px solid rgba(var(--v-theme-secondary), 0.2);
    box-shadow: 0 0 20px rgba(var(--v-theme-secondary), 0.15);
}

.icon-glow-box.success {
    background: rgba(var(--v-theme-success), 0.1);
    border: 1px solid rgba(var(--v-theme-success), 0.2);
    box-shadow: 0 0 20px rgba(var(--v-theme-success), 0.15);
}

.icon-glow-box.small {
    width: 36px;
    height: 36px;
    border-radius: 10px;
}

.card-tabs-header {
    background: rgba(var(--v-theme-surface), 0.4);
    padding: 0 16px;
}

.premium-ribbon-tab {
    text-transform: none !important;
    letter-spacing: 0.02em !important;
    font-weight: 800 !important;
    font-size: 0.95rem !important;
    color: rgba(var(--v-theme-on-surface), 0.5) !important;
    min-width: 180px;
    transition: all 0.3s ease;
}

.premium-ribbon-tab.v-tab--selected {
    color: currentColor !important;
    opacity: 1 !important;
}

.premium-ribbon-tab :deep(.v-btn__content) {
    opacity: 1 !important;
}

.tab-label {
    position: relative;
    z-index: 1;
}

.drop-zone-wrapper,
.scan-zone-wrapper {
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

.drop-zone-wrapper:hover {
    border-color: rgb(var(--v-theme-primary)) !important;
    background: rgba(var(--v-theme-primary), 0.08) !important;
    box-shadow: 0 0 30px rgba(var(--v-theme-primary), 0.1) !important;
}

.scan-zone-wrapper:hover {
    border-color: rgb(var(--v-theme-secondary)) !important;
    background: rgba(var(--v-theme-secondary), 0.08) !important;
    box-shadow: 0 0 30px rgba(var(--v-theme-secondary), 0.1) !important;
}

.pdf-icon-container,
.email-icon-container {
    width: 80px;
    height: 80px;
    background: white;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
}

.pdf-badge,
.email-badge {
    position: absolute;
    bottom: -8px;
    right: -8px;
    color: white;
    font-size: 10px;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 6px;
}

.pdf-badge {
    background: #EF4444;
    box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
}

.email-badge {
    background: rgb(var(--v-theme-secondary));
    box-shadow: 0 4px 8px rgba(var(--v-theme-secondary), 0.3);
}

.monospaced {
    font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
    letter-spacing: -0.5px;
}

.text-content {
    letter-spacing: -0.02em;
}

.shadow-inner {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.hover-lift {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
}

.shadow-primary {
    box-shadow: 0 4px 14px rgba(var(--v-theme-primary), 0.25) !important;
}

.shadow-secondary {
    box-shadow: 0 4px 14px rgba(var(--v-theme-secondary), 0.25) !important;
}

.shadow-success {
    box-shadow: 0 4px 14px rgba(var(--v-theme-success), 0.25) !important;
}

.rows-select {
    width: 60px;
}

.rows-select :deep(.v-field__input) {
    padding-top: 0;
    padding-bottom: 0;
    min-height: 0;
    font-weight: 800;
}
</style>
