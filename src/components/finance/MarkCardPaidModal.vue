<template>
    <WfModal
        :model-value="show"
        max-width="md"
        :title="`Mark Paid · ${cardName}`"
        @update:model-value="(v: boolean) => { if (!v) $emit('close') }"
    >
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Mode Selector -->
            <div class="grid grid-cols-3 gap-1.5 p-1 rounded-wf-md bg-wf-surface-variant/70 border border-wf-border-subtle">
                <button
                    v-for="m in modes"
                    :key="m.value"
                    type="button"
                    class="px-2 py-1.5 rounded-wf-sm text-[11px] font-semibold transition-all text-center"
                    :class="mode === m.value
                        ? 'bg-wf-surface text-wf-primary shadow-2xs border border-wf-border-subtle'
                        : 'text-wf-text-muted hover:text-wf-text-primary'"
                    @click="mode = m.value"
                >
                    {{ m.label }}
                </button>
            </div>

            <!-- Amount & Date -->
            <div class="grid grid-cols-2 gap-3">
                <WfInput
                    v-model.number="form.amount"
                    type="number"
                    step="any"
                    label="Payment Amount (₹)"
                    placeholder="0.00"
                    required
                />
                <WfInput
                    v-model="form.date"
                    type="date"
                    label="Payment Date"
                    required
                />
            </div>

            <!-- Mode 1: New Bank Transfer -->
            <div v-if="mode === 'NEW_TRANSFER'">
                <WfSelect
                    v-model="form.source_account_id"
                    label="Source Bank / Wallet"
                    :items="bankAccountItems"
                    placeholder="Select paying bank account"
                />
                <p class="text-[11px] text-wf-text-muted mt-1.5">
                    Creates a linked transfer: debits your bank account and reduces card debt.
                </p>
            </div>

            <!-- Mode 2: Link Existing Bank Debit -->
            <div v-else-if="mode === 'LINK_EXISTING'" class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-wf-text-primary">Matching Unlinked Bank Debits</span>
                    <button
                        type="button"
                        class="text-[11px] font-semibold text-wf-primary hover:underline"
                        @click="loadCandidates"
                    >
                        Refresh
                    </button>
                </div>
                <div v-if="loadingCandidates" class="text-xs text-wf-text-muted py-3 text-center">
                    Searching recent bank debits...
                </div>
                <div v-else-if="candidates.length === 0" class="text-xs text-wf-text-muted p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
                    No matching unlinked bank debits found within the last 14 days. You can switch to <b>Pay from Bank</b> or <b>No Source</b>.
                </div>
                <div v-else class="max-h-44 overflow-y-auto space-y-1.5">
                    <label
                        v-for="cand in candidates"
                        :key="cand.transaction_id"
                        class="flex items-center justify-between gap-2 p-2.5 rounded-wf-md border cursor-pointer transition-colors"
                        :class="form.existing_transaction_id === cand.transaction_id
                            ? 'border-wf-primary bg-indigo-50/40 dark:bg-indigo-950/30'
                            : 'border-wf-border-subtle hover:bg-wf-surface-variant/40'"
                    >
                        <div class="flex items-center gap-2 min-w-0">
                            <input
                                type="radio"
                                :value="cand.transaction_id"
                                v-model="form.existing_transaction_id"
                                class="accent-wf-primary"
                            />
                            <div class="min-w-0">
                                <div class="text-xs font-semibold text-wf-text-primary truncate">
                                    {{ cand.description || cand.recipient || 'Bank Debit' }}
                                </div>
                                <div class="text-[10px] text-wf-text-muted">
                                    {{ cand.account_name }} · {{ cand.date.slice(0, 10) }}
                                </div>
                            </div>
                        </div>
                        <span class="text-xs font-bold tabular-nums text-wf-text-primary shrink-0">
                            {{ formatAmount(cand.amount) }}
                        </span>
                    </label>
                </div>
            </div>

            <!-- Mode 3: No Source Account -->
            <div v-else class="p-3 rounded-wf-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200">
                Records a standalone credit on <b>{{ cardName }}</b> without debiting any bank account. If the bank's payment confirmation SMS arrives later, WealthFam will automatically upgrade this entry without double-counting.
            </div>
        </form>

        <template #footer>
            <div class="flex items-center justify-end gap-2 w-full">
                <WfButton variant="outline" size="sm" @click="$emit('close')">Cancel</WfButton>
                <WfButton
                    variant="primary"
                    size="sm"
                    :loading="submitting"
                    :disabled="!canSubmit"
                    @click="handleSubmit"
                >
                    Confirm Payment
                </WfButton>
            </div>
        </template>
    </WfModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfButton from '@/components/ui/WfButton.vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
    show: boolean
    cardId: string
    cardName: string
    defaultAmount?: number
    bankAccounts: Array<{ id?: string; value?: string; name?: string; title?: string }>
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'paid'): void
}>()

const notify = useNotificationStore()
const { formatAmount } = useCurrency()

const modes = [
    { value: 'NEW_TRANSFER' as const, label: 'Pay from Bank' },
    { value: 'LINK_EXISTING' as const, label: 'Link Existing' },
    { value: 'NO_SOURCE_ACCOUNT' as const, label: 'No Source' },
]

const mode = ref<'NEW_TRANSFER' | 'LINK_EXISTING' | 'NO_SOURCE_ACCOUNT'>('NEW_TRANSFER')
const submitting = ref(false)
const loadingCandidates = ref(false)
const candidates = ref<any[]>([])

const form = ref({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    source_account_id: '',
    existing_transaction_id: '',
})

const bankAccountItems = computed(() =>
    props.bankAccounts.map((a) => ({
        title: a.title || a.name || 'Bank Account',
        value: a.value || a.id || '',
    }))
)

const canSubmit = computed(() => {
    if (!form.value.amount || form.value.amount <= 0) return false
    if (mode.value === 'NEW_TRANSFER') return !!form.value.source_account_id
    if (mode.value === 'LINK_EXISTING') return !!form.value.existing_transaction_id
    return true
})

async function loadCandidates() {
    if (!props.cardId) return
    loadingCandidates.value = true
    try {
        const res = await financeApi.getCreditCardPaymentCandidates(props.cardId, {
            amount: form.value.amount > 0 ? form.value.amount : undefined,
            window_days: 14,
        })
        candidates.value = res.data || []
        if (candidates.value.length > 0 && !form.value.existing_transaction_id) {
            form.value.existing_transaction_id = candidates.value[0].transaction_id
        }
    } catch {
        candidates.value = []
    } finally {
        loadingCandidates.value = false
    }
}

watch(
    () => props.show,
    (isOpen) => {
        if (isOpen) {
            mode.value = 'NEW_TRANSFER'
            const firstBankId = bankAccountItems.value[0]?.value || ''
            form.value = {
                amount: Number(props.defaultAmount || 0),
                date: new Date().toISOString().slice(0, 10),
                source_account_id: firstBankId,
                existing_transaction_id: '',
            }
            candidates.value = []
        }
    }
)

watch(mode, (newMode) => {
    if (newMode === 'LINK_EXISTING') {
        loadCandidates()
    }
})

async function handleSubmit() {
    if (!canSubmit.value || !props.cardId) return
    submitting.value = true
    try {
        await financeApi.markCreditCardPaid(props.cardId, {
            mode: mode.value,
            amount: Number(form.value.amount),
            date: new Date(`${form.value.date}T12:00:00Z`).toISOString(),
            source_account_id: mode.value === 'NEW_TRANSFER' ? form.value.source_account_id : null,
            existing_transaction_id: mode.value === 'LINK_EXISTING' ? form.value.existing_transaction_id : null,
            description: `Credit Card Bill Payment - ${props.cardName}`,
        })
        notify.success('Credit card payment recorded')
        emit('paid')
        emit('close')
    } catch (e: any) {
        notify.error(e.response?.data?.detail || 'Failed to mark statement as paid')
    } finally {
        submitting.value = false
    }
}
</script>
