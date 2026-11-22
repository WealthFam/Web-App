<script setup lang="ts">
import { ref, computed } from 'vue'
import { Calendar, AlertCircle, CheckCircle, TrendingUp, Check, Pause, Play, Edit2, Trash2, X, ShieldCheck, HelpCircle } from 'lucide-vue-next'
import { financeApi } from '@/api/client'

const props = defineProps<{
    data: any
    isLoading: boolean
}>()

const emit = defineEmits<{
    (e: 'refresh'): void
}>()

const isActionLoading = ref(false)
const editingSip = ref<any | null>(null)
const editDayOfMonth = ref<number>(5)
const editAmount = ref<number>(5000)
const editStatus = ref<string>('ACTIVE')
const editLinkedAccount = ref<string>('')
const editConfirm = ref<boolean>(true)

const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0)
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(num)
}

// Separate into Confirmed and Unconfirmed / Inferred
const confirmedSips = computed(() => {
    return (props.data?.upcoming_calendar || []).filter((s: any) => !s.is_auto_detected)
})

const unconfirmedSips = computed(() => {
    return (props.data?.upcoming_calendar || []).filter((s: any) => s.is_auto_detected)
})

const confirmSip = async (sipId: string) => {
    if (isActionLoading.value) return
    isActionLoading.value = true
    try {
        await financeApi.updateMFSip(sipId, { confirm: true })
        emit('refresh')
    } catch (e) {
        console.error('Failed to confirm SIP:', e)
    } finally {
        isActionLoading.value = false
    }
}

const toggleSipStatus = async (sipId: string, currentStatus: string) => {
    if (isActionLoading.value) return
    isActionLoading.value = true
    try {
        const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
        await financeApi.updateMFSip(sipId, { status: nextStatus })
        emit('refresh')
    } catch (e) {
        console.error('Failed to toggle SIP status:', e)
    } finally {
        isActionLoading.value = false
    }
}

const openEditModal = (sip: any) => {
    editingSip.value = sip
    editDayOfMonth.value = sip.day_of_month || 5
    editAmount.value = Number(sip.amount || 5000)
    editStatus.value = sip.status || 'ACTIVE'
    editLinkedAccount.value = sip.linked_account_id || ''
    editConfirm.value = true
}

const closeEditModal = () => {
    editingSip.value = null
}

const saveSipChanges = async () => {
    if (!editingSip.value || isActionLoading.value) return
    isActionLoading.value = true
    try {
        await financeApi.updateMFSip(editingSip.value.sip_id, {
            day_of_month: Number(editDayOfMonth.value),
            installment_amount: Number(editAmount.value),
            status: editStatus.value,
            linked_account_id: editLinkedAccount.value || null,
            confirm: editConfirm.value
        })
        closeEditModal()
        emit('refresh')
    } catch (e) {
        console.error('Failed to update SIP:', e)
    } finally {
        isActionLoading.value = false
    }
}

const deleteSip = async (sipId: string) => {
    if (!confirm('Are you sure you want to remove this SIP mandate?')) return
    if (isActionLoading.value) return
    isActionLoading.value = true
    try {
        await financeApi.deleteMFSip(sipId)
        emit('refresh')
    } catch (e) {
        console.error('Failed to delete SIP:', e)
    } finally {
        isActionLoading.value = false
    }
}
</script>

<template>
    <div class="bg-wf-surface border border-wf-border rounded-wf-lg p-5 sm:p-6 shadow-xs space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-wf-border-subtle">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-wf-lg bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                    <Calendar class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="text-base font-bold text-wf-text-primary">SIP Intelligence & Verified Mandates</h3>
                        <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            {{ data?.active_sips_count || 0 }} Active Mandates
                        </span>
                    </div>
                    <p class="text-xs text-wf-text-secondary">
                        Confirmed bank debits, unconfirmed pattern inferences, and cash flow matching
                    </p>
                </div>
            </div>

            <div class="text-right self-start sm:self-auto">
                <div class="text-[10px] text-wf-text-tertiary">Monthly SIP Commitment</div>
                <div class="text-lg font-bold text-wf-text-primary font-mono">
                    {{ formatCurrency(data?.total_monthly_commitment) }}
                </div>
            </div>
        </div>

        <!-- Liquidity Status Banner -->
        <div v-if="data?.liquidity_alerts?.length > 0" class="space-y-2">
            <div
                v-for="(alert, idx) in data.liquidity_alerts"
                :key="idx"
                class="p-3.5 rounded-wf-md border text-xs flex items-start gap-2.5"
                :class="{
                    'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300': alert.severity === 'CRITICAL',
                    'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300': alert.severity === 'WARNING',
                    'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300': alert.severity === 'HEALTHY'
                }"
            >
                <AlertCircle v-if="alert.severity !== 'HEALTHY'" class="w-4 h-4 shrink-0 mt-0.5" />
                <CheckCircle v-else class="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <div>
                    <div class="font-bold">{{ alert.title }}</div>
                    <div class="text-[11px] opacity-90 mt-0.5">{{ alert.message }}</div>
                </div>
            </div>
        </div>

        <!-- SECTION 1: Confirmed Mandates -->
        <div class="space-y-3">
            <div class="flex items-center justify-between pb-1 border-b border-wf-border-subtle">
                <div class="flex items-center gap-2">
                    <ShieldCheck class="w-4 h-4 text-emerald-600" />
                    <span class="text-xs font-bold text-wf-text-primary">Verified Bank Mandates</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 font-mono">
                        {{ confirmedSips.length }} Confirmed
                    </span>
                </div>
                <span class="text-[10px] text-wf-text-tertiary">Linked to bank auto-debit</span>
            </div>

            <div v-if="confirmedSips.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                    v-for="(ev, idx) in confirmedSips"
                    :key="idx"
                    class="p-3.5 bg-wf-surface border border-emerald-500/25 rounded-wf-lg flex flex-col justify-between text-xs space-y-2 shadow-2xs"
                >
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class="font-bold text-wf-text-primary truncate">{{ ev.scheme_name }}</span>
                                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shrink-0">
                                    Verified
                                </span>
                                <span v-if="ev.status === 'PAUSED'" class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-500/15 text-zinc-500 border border-zinc-500/30 shrink-0">
                                    Paused
                                </span>
                            </div>
                            <div class="text-[10px] text-wf-text-tertiary flex items-center gap-1.5 mt-1 font-mono">
                                <span>Day {{ ev.day_of_month || 5 }} of month</span>
                                <span>•</span>
                                <span :class="ev.days_until <= 7 ? 'text-amber-600 font-bold' : 'text-wf-text-secondary'">
                                    Next: {{ ev.scheduled_date }} (in {{ ev.days_until }}d)
                                </span>
                            </div>
                        </div>

                        <div class="text-right shrink-0">
                            <div class="text-base font-bold text-wf-text-primary font-mono">{{ formatCurrency(ev.amount) }}</div>
                            <span class="text-[10px] text-wf-text-tertiary">{{ ev.frequency }}</span>
                        </div>
                    </div>

                    <!-- Action Bar -->
                    <div class="pt-2 border-t border-wf-border-subtle flex items-center justify-between text-[11px]">
                        <button
                            type="button"
                            @click="toggleSipStatus(ev.sip_id, ev.status)"
                            :disabled="isActionLoading"
                            class="px-2 py-0.5 rounded bg-wf-surface-variant hover:bg-wf-border text-wf-text-secondary font-medium flex items-center gap-1 transition-all"
                        >
                            <Pause v-if="ev.status === 'ACTIVE'" class="w-3 h-3 text-amber-500" />
                            <Play v-else class="w-3 h-3 text-emerald-500" />
                            <span>{{ ev.status === 'ACTIVE' ? 'Pause' : 'Resume' }}</span>
                        </button>

                        <div class="flex items-center gap-1">
                            <button
                                type="button"
                                @click="openEditModal(ev)"
                                :disabled="isActionLoading"
                                class="p-1 rounded text-wf-text-tertiary hover:text-wf-text-primary hover:bg-wf-surface-variant transition-all"
                                title="Edit deduction day and amount"
                            >
                                <Edit2 class="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                @click="deleteSip(ev.sip_id)"
                                :disabled="isActionLoading"
                                class="p-1 rounded text-wf-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-all"
                                title="Remove mandate"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="p-4 text-center text-xs text-wf-text-tertiary bg-wf-surface-variant/20 rounded-wf-md border border-dashed border-wf-border-subtle">
                No confirmed SIP mandates yet. Review and confirm the auto-detected schedules below.
            </div>
        </div>

        <!-- SECTION 2: Inferred / Auto-detected Schedules (Awaiting Confirmation) -->
        <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between pb-1 border-b border-wf-border-subtle">
                <div class="flex items-center gap-2">
                    <HelpCircle class="w-4 h-4 text-amber-500" />
                    <span class="text-xs font-bold text-wf-text-primary">Inferred Schedules (Awaiting Confirmation)</span>
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 font-mono">
                        {{ unconfirmedSips.length }} Detected
                    </span>
                </div>
                <span class="text-[10px] text-amber-600 font-medium">Action needed: Confirm to verify</span>
            </div>

            <div v-if="unconfirmedSips.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                    v-for="(ev, idx) in unconfirmedSips"
                    :key="idx"
                    class="p-3.5 bg-amber-500/5 border border-amber-500/30 rounded-wf-lg flex flex-col justify-between text-xs space-y-2.5 shadow-2xs"
                >
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class="font-bold text-wf-text-primary truncate">{{ ev.scheme_name }}</span>
                                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/35 shrink-0">
                                    Auto-detected
                                </span>
                            </div>
                            <div class="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                                Detected from recurring monthly order intervals (~Day {{ ev.day_of_month || 5 }}).
                            </div>
                            <div class="text-[10px] text-wf-text-tertiary mt-0.5 font-mono">
                                Inferred Next Debit: {{ ev.scheduled_date }} (in {{ ev.days_until }} days)
                            </div>
                        </div>

                        <div class="text-right shrink-0">
                            <div class="text-base font-bold text-wf-text-primary font-mono">{{ formatCurrency(ev.amount) }}</div>
                            <span class="text-[10px] text-wf-text-tertiary">{{ ev.frequency }}</span>
                        </div>
                    </div>

                    <!-- Prominent Action Bar for Unconfirmed -->
                    <div class="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
                        <button
                            type="button"
                            @click="confirmSip(ev.sip_id)"
                            :disabled="isActionLoading"
                            class="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-all"
                        >
                            <Check class="w-3.5 h-3.5" />
                            <span>Confirm Mandate</span>
                        </button>

                        <div class="flex items-center gap-1.5">
                            <button
                                type="button"
                                @click="openEditModal(ev)"
                                :disabled="isActionLoading"
                                class="px-2 py-1 rounded bg-wf-surface border border-wf-border-subtle text-wf-text-secondary hover:text-wf-text-primary flex items-center gap-1"
                            >
                                <Edit2 class="w-3 h-3" />
                                <span>Adjust Day</span>
                            </button>
                            <button
                                type="button"
                                @click="deleteSip(ev.sip_id)"
                                :disabled="isActionLoading"
                                class="p-1 rounded text-wf-text-tertiary hover:text-red-500 hover:bg-red-500/10"
                                title="Dismiss inferred schedule"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="p-3 text-center text-xs text-wf-text-secondary bg-wf-surface-variant/20 rounded-wf-md">
                All detected recurring transactions have been verified!
            </div>
        </div>

        <!-- Annual Step-Up Compounding Simulator -->
        <div class="p-4 bg-wf-surface-variant/30 border border-wf-border rounded-wf-lg space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-wf-text-primary flex items-center gap-1.5">
                    <TrendingUp class="w-4 h-4 text-indigo-500" />
                    <span>Annual Step-Up Compounding Power (12% CAGR Simulation)</span>
                </span>
                <span class="text-[10px] text-wf-text-secondary">Expected 10Y Differential</span>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <thead>
                        <tr class="text-[11px] text-wf-text-tertiary border-b border-wf-border-subtle">
                            <th class="pb-1.5 font-medium">Scenario</th>
                            <th class="pb-1.5 font-medium text-right">5 Years</th>
                            <th class="pb-1.5 font-medium text-right">10 Years</th>
                            <th class="pb-1.5 font-medium text-right">15 Years</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-wf-border-subtle font-mono">
                        <tr
                            v-for="(sc, sidx) in data?.step_up_scenarios"
                            :key="sidx"
                            class="hover:bg-wf-surface-variant/60"
                            :class="{ 'bg-indigo-500/5 font-semibold text-indigo-600 dark:text-indigo-400': sc.step_up_pct === 10 }"
                        >
                            <td class="py-1.5 text-wf-text-primary font-sans text-xs">
                                {{ sc.label }}
                            </td>
                            <td class="py-1.5 text-right">{{ formatCurrency(sc.years_5) }}</td>
                            <td class="py-1.5 text-right font-bold">{{ formatCurrency(sc.years_10) }}</td>
                            <td class="py-1.5 text-right">{{ formatCurrency(sc.years_15) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Edit / Confirm Mandate Overlay Modal -->
        <div
            v-if="editingSip"
            class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <div class="bg-wf-surface border border-wf-border rounded-wf-lg max-w-md w-full p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95">
                <div class="flex items-center justify-between pb-3 border-b border-wf-border-subtle">
                    <div class="flex items-center gap-2">
                        <Calendar class="w-4 h-4 text-amber-500" />
                        <h4 class="text-sm font-bold text-wf-text-primary">Configure SIP Mandate</h4>
                    </div>
                    <button
                        type="button"
                        @click="closeEditModal"
                        class="p-1 rounded text-wf-text-tertiary hover:text-wf-text-primary"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>

                <div class="text-xs text-wf-text-secondary truncate font-medium">
                    {{ editingSip.scheme_name }}
                </div>

                <div class="space-y-3 text-xs">
                    <div>
                        <label class="block text-wf-text-secondary font-medium mb-1">Deduction Day of Month (1 - 31)</label>
                        <input
                            v-model.number="editDayOfMonth"
                            type="number"
                            min="1"
                            max="31"
                            class="w-full px-3 py-2 bg-wf-surface-variant/40 border border-wf-border rounded-wf-md text-wf-text-primary font-mono focus:outline-hidden focus:border-wf-primary"
                        />
                    </div>

                    <div>
                        <label class="block text-wf-text-secondary font-medium mb-1">Installment Amount (₹)</label>
                        <input
                            v-model.number="editAmount"
                            type="number"
                            step="100"
                            class="w-full px-3 py-2 bg-wf-surface-variant/40 border border-wf-border rounded-wf-md text-wf-text-primary font-mono focus:outline-hidden focus:border-wf-primary"
                        />
                    </div>

                    <div>
                        <label class="block text-wf-text-secondary font-medium mb-1">Mandate Status</label>
                        <select
                            v-model="editStatus"
                            class="w-full px-3 py-2 bg-wf-surface-variant/40 border border-wf-border rounded-wf-md text-wf-text-primary focus:outline-hidden focus:border-wf-primary"
                        >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="PAUSED">PAUSED</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-2 pt-1">
                        <input
                            id="confirmMandateCheckModal"
                            v-model="editConfirm"
                            type="checkbox"
                            class="rounded border-wf-border text-wf-primary focus:ring-0"
                        />
                        <label for="confirmMandateCheckModal" class="text-wf-text-primary text-[11px] cursor-pointer">
                            Mark as Verified Mandate (removes "Auto-detected" tag)
                        </label>
                    </div>
                </div>

                <div class="pt-3 border-t border-wf-border-subtle flex items-center justify-end gap-2 text-xs">
                    <button
                        type="button"
                        @click="closeEditModal"
                        class="px-3 py-1.5 rounded-wf-md text-wf-text-secondary hover:bg-wf-surface-variant"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        @click="saveSipChanges"
                        :disabled="isActionLoading"
                        class="px-4 py-1.5 rounded-wf-md bg-wf-primary text-white font-semibold shadow-xs hover:bg-wf-primary/90 flex items-center gap-1.5"
                    >
                        <Check class="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
