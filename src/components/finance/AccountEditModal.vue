<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { Anchor, Trash2, ShieldCheck } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfButton from '@/components/ui/WfButton.vue'

interface Props {
    modelValue: boolean
    account: any
    familyMembers: any[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'saved'): void
    (e: 'delete', account: any): void
}>()

const notify = useNotificationStore()

const form = ref({
    name: '',
    type: 'BANK',
    currency: 'INR',
    account_mask: '',
    balance: 0,
    credit_limit: 0,
    billing_day: undefined as number | undefined,
    due_day: undefined as number | undefined,
    is_verified: true,
    owner_id: ''
})

const balanceOverride = ref({
    balance: 0,
    limit: 0
})

const saving = ref(false)
const overriding = ref(false)

const typeItems = [
    { title: '🏦 Bank Account', value: 'BANK' },
    { title: '💳 Credit Card', value: 'CREDIT_CARD' },
    { title: '💸 Loan / EMI', value: 'LOAN' },
    { title: '👛 Wallet / Cash', value: 'WALLET' },
    { title: '📈 Investment', value: 'INVESTMENT' }
]

const currencyItems = [
    { title: '₹ INR (Indian Rupee)', value: 'INR' },
    { title: '$ USD (US Dollar)', value: 'USD' }
]

const ownerItems = computed(() => [
    { title: 'Shared / Family', value: '' },
    ...props.familyMembers.map(m => ({ title: m.full_name || m.email, value: m.id }))
])

watch(() => props.account, (acc) => {
    if (acc) {
        form.value = {
            ...acc,
            billing_day: acc.billing_day ?? undefined,
            due_day: acc.due_day ?? undefined
        }
        balanceOverride.value = {
            balance: Number(acc.balance || 0),
            limit: Number(acc.credit_limit || 0)
        }
    } else {
        form.value = {
            name: '', type: 'BANK', currency: 'INR', account_mask: '',
            balance: 0, credit_limit: 0, billing_day: undefined, due_day: undefined,
            is_verified: true, owner_id: ''
        }
        balanceOverride.value = { balance: 0, limit: 0 }
    }
}, { immediate: true })

async function handleSubmit() {
    if (!form.value.name.trim()) {
        notify.error("Account name is required")
        return
    }
    saving.value = true
    try {
        if (props.account?.id) {
            await financeApi.updateAccount(props.account.id, form.value)
            notify.success("Account updated")
        } else {
            await financeApi.createAccount(form.value)
            notify.success("Account created")
        }
        emit('saved')
        emit('update:modelValue', false)
    } catch (e) {
        notify.error("Failed to save account")
    } finally {
        saving.value = false
    }
}

async function handleOverride() {
    if (!props.account?.id) return
    overriding.value = true
    try {
        await financeApi.overrideAccountBalance(props.account.id, {
            balance: balanceOverride.value.balance,
            credit_limit: form.value.type === 'CREDIT_CARD' ? balanceOverride.value.limit : null,
            timestamp: new Date().toISOString()
        })
        notify.success("Balance anchored successfully")
        emit('saved')
    } catch (e) {
        notify.error("Override failed")
    } finally {
        overriding.value = false
    }
}
</script>

<template>
    <WfModal
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="md"
        :title="account?.id ? 'Edit Account' : 'New Financial Source'"
        :description="account?.id ? `Manage configuration and balances for ${account.name}` : 'Link a new bank account, credit card, loan or digital wallet'"
    >
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Identity -->
            <div>
                <WfInput
                    v-model="form.name"
                    label="Account Name"
                    placeholder="e.g. HDFC Salary Account"
                    required
                />
            </div>

            <!-- Classification Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <WfSelect
                    v-model="form.type"
                    label="Account Type"
                    :items="typeItems"
                />
                <WfSelect
                    v-model="form.currency"
                    label="Currency"
                    :items="currencyItems"
                />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <WfInput
                    v-model="form.account_mask"
                    label="Last 4 Digits"
                    placeholder="e.g. 4392"
                    type="text"
                />
                <WfSelect
                    v-model="form.owner_id"
                    label="Owner"
                    :items="ownerItems"
                />
            </div>

            <!-- Credit Card Specific: Billing Day & Due Day -->
            <div v-if="form.type === 'CREDIT_CARD'" class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle space-y-2">
                <div class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider">
                    Billing Cycle
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <WfInput
                        :model-value="form.billing_day ?? ''"
                        @update:model-value="form.billing_day = $event ? Number($event) : undefined"
                        type="number"
                        label="Statement Day (1-31)"
                        placeholder="e.g. 15"
                    />
                    <WfInput
                        :model-value="form.due_day ?? ''"
                        @update:model-value="form.due_day = $event ? Number($event) : undefined"
                        type="number"
                        label="Due Day (1-31)"
                        placeholder="e.g. 5"
                    />
                </div>
            </div>

            <!-- Verified Toggle -->
            <div class="flex items-center justify-between p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
                <div class="flex items-center gap-2.5">
                    <ShieldCheck class="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                        <div class="text-xs font-semibold text-wf-text-primary">Verified Source</div>
                        <div class="text-[11px] text-wf-text-muted">Trust this source for automatic transaction ingestion</div>
                    </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="form.is_verified" class="sr-only peer" />
                    <div class="w-9 h-5 bg-wf-surface-muted peer-focus:outline-none rounded-wf-pill peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-wf-pill after:h-4 after:w-4 after:transition-all peer-checked:bg-wf-success"></div>
                </label>
            </div>

            <!-- Balance Section (Edit Mode: Anchor Balance) -->
            <div v-if="account?.id" class="p-3.5 rounded-wf-md bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2.5">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        <Anchor class="w-3.5 h-3.5" />
                        <span>Balance Anchoring</span>
                    </div>
                    <span class="text-[10px] text-wf-text-muted font-medium">Reconcile Real Balance</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <WfInput
                        v-model.number="balanceOverride.balance"
                        label="Current Balance (₹)"
                        type="number"
                    />
                    <WfInput
                        v-if="form.type === 'CREDIT_CARD'"
                        v-model.number="balanceOverride.limit"
                        label="Credit Limit (₹)"
                        type="number"
                    />
                </div>
                <WfButton
                    variant="outline"
                    size="sm"
                    class="w-full text-xs"
                    :loading="overriding"
                    @click="handleOverride"
                >
                    <Anchor class="w-3.5 h-3.5 mr-1" />
                    <span>Apply Balance Anchor</span>
                </WfButton>
            </div>

            <!-- Balance Section (Create Mode: Opening Balance) -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <WfInput
                    v-model.number="form.balance"
                    type="number"
                    label="Opening Balance (₹)"
                    placeholder="0.00"
                />
                <WfInput
                    v-if="form.type === 'CREDIT_CARD'"
                    v-model.number="form.credit_limit"
                    type="number"
                    label="Credit Limit (₹)"
                    placeholder="0.00"
                />
            </div>
        </form>

        <!-- Modal Footer Actions -->
        <template #footer>
            <div class="flex items-center justify-between w-full">
                <div>
                    <WfButton
                        v-if="account?.id"
                        variant="ghost"
                        size="sm"
                        class="text-wf-error hover:text-red-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        @click="$emit('delete', account)"
                    >
                        <Trash2 class="w-3.5 h-3.5 mr-1" />
                        <span>Delete</span>
                    </WfButton>
                </div>
                <div class="flex items-center gap-2">
                    <WfButton
                        variant="outline"
                        size="sm"
                        @click="$emit('update:modelValue', false)"
                    >
                        Cancel
                    </WfButton>
                    <WfButton
                        variant="primary"
                        size="sm"
                        :loading="saving"
                        :disabled="!form.name.trim()"
                        @click="handleSubmit"
                    >
                        {{ account?.id ? 'Save Changes' : 'Create Account' }}
                    </WfButton>
                </div>
            </div>
        </template>
    </WfModal>
</template>
