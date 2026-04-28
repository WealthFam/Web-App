<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="540"
        transition="dialog-bottom-transition" persistent>
        <v-card rounded="xl" elevation="24" color="white">
            <!-- Header -->
            <div class="modal-header pa-6 d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-4">
                    <div class="account-icon-box" :class="(form.type || 'bank').toLowerCase()">
                        <component :is="getAccountTypeIcon(form.type)" :size="22" />
                    </div>
                    <div>
                        <div class="text-overline font-weight-black text-primary"
                            style="line-height: 1; margin-bottom: 4px;">
                            {{ account?.id ? 'Update Account' : 'New Source' }}
                        </div>
                        <div class="text-h6 font-weight-black" style="line-height: 1.1;">
                            {{ form.name || 'Untitled Account' }}
                        </div>
                    </div>
                </div>
                <v-btn icon variant="text" size="small" @click="$emit('update:modelValue', false)"
                    class="text-medium-emphasis">
                    <X :size="20" />
                </v-btn>
            </div>

            <v-divider />

            <v-card-text class="pa-6 overflow-y-auto" style="max-height: 60vh;">
                <v-form @submit.prevent="handleSubmit">
                    <!-- Identity -->
                    <div class="section-label">Identity</div>
                    <v-text-field v-model="form.name" variant="outlined" rounded="xl" placeholder="Account Name"
                        hide-details required autofocus class="mb-5" />

                    <!-- Classification -->
                    <div class="section-label">Classification</div>
                    <v-autocomplete v-model="form.type" label="Account Type" variant="outlined" rounded="xl"
                        hide-details :items="typeItems" class="mb-3" />

                    <v-row dense class="mb-3">
                        <v-col cols="6">
                            <v-autocomplete v-model="form.currency" label="Currency" variant="outlined" rounded="xl"
                                hide-details :items="['INR', 'USD']" />
                        </v-col>
                        <v-col cols="6">
                            <v-text-field v-model="form.account_mask" variant="outlined" rounded="xl" hide-details
                                label="Last 4 Digits" maxlength="4" />
                        </v-col>
                    </v-row>

                    <v-autocomplete v-model="form.owner_id" label="Owner" variant="outlined" rounded="xl" hide-details
                        :items="familyMembers.map(m => ({ title: m.full_name || m.email, value: m.id }))"
                        class="mb-5" />

                    <!-- Credit Card Fields -->
                    <template v-if="form.type === 'CREDIT_CARD'">
                        <div class="section-label">Billing Cycle</div>
                        <v-row dense class="mb-5">
                            <v-col cols="6">
                                <v-text-field v-model.number="form.billing_day" label="Statement Day" type="number"
                                    min="1" max="31" variant="outlined" rounded="xl" hide-details />
                            </v-col>
                            <v-col cols="6">
                                <v-text-field v-model.number="form.due_day" label="Due Day" type="number" min="1"
                                    max="31" variant="outlined" rounded="xl" hide-details />
                            </v-col>
                        </v-row>
                    </template>

                    <!-- Verified Toggle -->
                    <div class="toggle-card mb-5">
                        <div class="d-flex align-center ga-3">
                            <ShieldCheck :size="18" class="text-success" />
                            <div class="flex-grow-1">
                                <div class="text-subtitle-2 font-weight-bold">Verified Source</div>
                                <div class="text-caption text-medium-emphasis">Trust this source automatically</div>
                            </div>
                            <v-switch v-model="form.is_verified" color="success" hide-details
                                density="compact"></v-switch>
                        </div>
                    </div>

                    <!-- Balance Section (Edit mode) -->
                    <div v-if="account?.id" class="mb-2">
                        <div class="section-label">
                            <Anchor :size="12" class="mr-1" /> Balance Anchoring
                        </div>
                        <div class="anchor-card">
                            <p class="text-caption text-medium-emphasis mb-3">Set the current real-world balance for
                                this account.</p>
                            <v-row dense class="mb-3">
                                <v-col :cols="form.type === 'CREDIT_CARD' ? 6 : 12">
                                    <v-text-field v-model.number="balanceOverride.balance" label="Balance" type="number"
                                        step="0.01" variant="solo" flat rounded="lg" hide-details
                                        prefix="₹"></v-text-field>
                                </v-col>
                                <v-col v-if="form.type === 'CREDIT_CARD'" cols="6">
                                    <v-text-field v-model.number="balanceOverride.limit" label="Credit Limit"
                                        type="number" step="0.01" variant="solo" flat rounded="lg" hide-details
                                        prefix="₹"></v-text-field>
                                </v-col>
                            </v-row>
                            <v-btn color="primary" block size="small" variant="flat" class="font-weight-bold rounded-lg"
                                height="36" :loading="overriding" @click="handleOverride">
                                <Anchor :size="14" class="mr-1" /> Update Anchor
                            </v-btn>
                        </div>
                    </div>

                    <!-- Balance Section (Create mode) -->
                    <div v-else class="mb-2">
                        <div class="section-label">Opening Balance</div>
                        <v-text-field v-model.number="form.balance" type="number" step="0.01" variant="outlined"
                            rounded="xl" hide-details placeholder="0.00" prefix="₹" label="Balance" class="mb-3" />
                        <v-text-field v-if="form.type === 'CREDIT_CARD'" v-model.number="form.credit_limit"
                            type="number" step="0.01" variant="outlined" rounded="xl" hide-details placeholder="0.00"
                            prefix="₹" label="Credit Limit" />
                    </div>
                </v-form>
            </v-card-text>

            <v-divider />

            <!-- Actions -->
            <v-card-actions class="pa-5 px-6">
                <v-btn v-if="account?.id" variant="text" color="error" class="text-none font-weight-bold" rounded="pill"
                    @click="$emit('delete', account)">
                    <Trash2 :size="16" class="mr-1" /> Delete
                </v-btn>
                <v-spacer />
                <v-btn variant="text" @click="$emit('update:modelValue', false)" class="text-none font-weight-bold px-6"
                    rounded="pill">
                    Cancel
                </v-btn>
                <v-btn color="primary" rounded="pill" class="text-none px-8 font-weight-black elevation-4"
                    @click="handleSubmit" height="44" :loading="saving" :disabled="!form.name">
                    <Save :size="16" class="mr-1" />
                    {{ account?.id ? 'Save' : 'Create' }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import {
    Anchor, Trash2, X, Save, ShieldCheck,
    Wallet, CreditCard, Landmark, Banknote, TrendingUp
} from 'lucide-vue-next'

const props = defineProps<{
    modelValue: boolean
    account: any
    familyMembers: any[]
}>()

const emit = defineEmits(['update:modelValue', 'saved', 'delete'])
const notify = useNotificationStore()

const form = ref({
    name: '',
    type: 'BANK',
    currency: 'INR',
    account_mask: '',
    balance: 0,
    credit_limit: 0,
    billing_day: null as number | null,
    due_day: null as number | null,
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

function getAccountTypeIcon(type: string) {
    const icons: any = { BANK: Landmark, CREDIT_CARD: CreditCard, LOAN: Banknote, WALLET: Wallet, INVESTMENT: TrendingUp }
    return icons[type] || Wallet
}

watch(() => props.account, (acc) => {
    if (acc) {
        form.value = { ...acc }
        balanceOverride.value = {
            balance: Number(acc.balance || 0),
            limit: Number(acc.credit_limit || 0)
        }
    } else {
        form.value = {
            name: '', type: 'BANK', currency: 'INR', account_mask: '',
            balance: 0, credit_limit: 0, billing_day: null, due_day: null,
            is_verified: true, owner_id: ''
        }
    }
}, { immediate: true })

async function handleSubmit() {
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
        notify.success("Balance anchored")
        emit('saved')
    } catch (e) {
        notify.error("Override failed")
    } finally {
        overriding.value = false
    }
}
</script>

<style scoped>
.modal-header {
    background: rgba(var(--v-theme-primary), 0.03);
}

.account-icon-box {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.1);
}

.account-icon-box.bank {
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    color: #2563eb;
}

.account-icon-box.credit_card {
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    color: #dc2626;
}

.account-icon-box.wallet {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    color: #16a34a;
}

.account-icon-box.investment {
    background: linear-gradient(135deg, #f5f3ff, #ede9fe);
    color: #7c3aed;
}

.account-icon-box.loan {
    background: linear-gradient(135deg, #fffbeb, #fef3c7);
    color: #d97706;
}

.section-label {
    font-size: 0.7rem;
    font-weight: 900;
    opacity: 0.45;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
    margin-left: 4px;
}

.toggle-card {
    background: rgba(var(--v-theme-on-surface), 0.03);
    border-radius: 16px;
    padding: 14px 20px;
    border: 1px solid rgba(var(--v-border-color), 0.08);
}

.anchor-card {
    background: rgba(var(--v-theme-primary), 0.04);
    border-radius: 16px;
    padding: 16px;
    border: 1px solid rgba(var(--v-theme-primary), 0.1);
}
</style>
