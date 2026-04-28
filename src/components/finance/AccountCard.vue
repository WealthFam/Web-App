<template>
    <v-hover v-slot="{ isHovering, props }">
        <v-card v-bind="props" class="m3-card account-card h-100" :class="{ 'raised': isHovering }" elevation="1" @click="$emit('view', account)">
        <v-card-text class="pa-5 h-100 d-flex flex-column">
            <div class="d-flex justify-space-between align-start mb-4">
                <div class="acc-icon-wrapper" :class="account.type.toLowerCase()">
                    <component :is="getAccountTypeIcon(account.type)" :size="20" />
                </div>
                <div class="d-flex gap-2">
                    <v-btn v-if="account.type === 'CREDIT_CARD'" icon size="x-small" color="primary" variant="tonal" @click.stop="$emit('pay-bill', account)">
                        <DollarSign :size="14" />
                        <v-tooltip activator="parent" location="top">Pay Bill</v-tooltip>
                    </v-btn>
                    
                    <v-menu location="bottom end" transition="slide-y-transition">
                        <template v-slot:activator="{ props: menuProps }">
                            <v-btn icon size="x-small" variant="text" color="medium-emphasis" v-bind="menuProps" @click.stop>
                                <MoreVertical :size="16" />
                                <v-tooltip activator="parent" location="top">More Options</v-tooltip>
                            </v-btn>
                        </template>
                        <v-list class="rounded-lg py-2" elevation="8">
                            <v-list-item @click="$emit('edit', account)" class="px-4 py-2">
                                <template v-slot:prepend>
                                    <Edit2 :size="14" class="mr-3" />
                                </template>
                                <v-list-item-title class="text-caption font-weight-bold">Edit Account</v-list-item-title>
                            </v-list-item>
                            <v-divider class="my-1"></v-divider>
                            <v-list-item @click="$emit('delete', account)" color="error" class="px-4 py-2 text-error">
                                <template v-slot:prepend>
                                    <Trash2 :size="14" class="mr-3" />
                                </template>
                                <v-list-item-title class="text-caption font-weight-bold">Delete Account</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </div>
            </div>

            <div class="mb-4">
                <div class="text-h6 font-weight-bold mb-1 line-clamp-1">{{ account.name }}</div>
                <div class="d-flex align-center gap-2 flex-wrap">
                    <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                        {{ getAccountTypeLabel(account.type) }}
                    </span>
                    <v-chip v-if="account.account_mask" size="x-small" color="grey-lighten-4" variant="flat" class="font-weight-bold">
                        ••{{ account.account_mask }}
                    </v-chip>
                </div>
            </div>

            <!-- Credit Intel Snippet -->
            <div v-if="intelligence" class="bg-indigo-lighten-5 rounded-lg pa-3 mb-4">
                <div class="d-flex justify-space-between align-center mb-1">
                    <span class="text-tiny font-weight-black text-indigo uppercase ls-1">Statement</span>
                    <span class="text-tiny font-weight-bold text-indigo">{{ formatAmount(intelligence.statement_balance) }}</span>
                </div>
                <div class="d-flex justify-space-between align-center">
                    <span class="text-tiny font-weight-bold text-medium-emphasis">Due in {{ intelligence.days_until_due }} days</span>
                    <v-chip v-if="intelligence.is_overdue" size="x-small" color="error" variant="flat">Overdue</v-chip>
                    <v-chip v-else-if="intelligence.days_until_due <= 5" size="x-small" color="warning" variant="flat">Soon</v-chip>
                </div>
            </div>

            <div class="mt-auto pt-4 border-t">
                <div class="d-flex justify-space-between align-end">
                    <div>
                        <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
                            {{ account.type === 'CREDIT_CARD' ? 'Spent this Cycle' : 'Balance' }}
                        </div>
                        <div class="text-h5 font-weight-black" :class="{ 'text-error': account.type === 'CREDIT_CARD' }">
                            {{ account.type === 'CREDIT_CARD' && intelligence?.current_cycle_spend != null
                                ? formatAmount(intelligence.current_cycle_spend)
                                : formatAmount(account.balance) }}
                        </div>
                    </div>
                </div>

                <!-- Utilization for Credit Cards -->
                <div v-if="account.type === 'CREDIT_CARD' && account.credit_limit" class="mt-3">
                    <div class="d-flex justify-space-between text-tiny font-weight-bold mb-1">
                        <span>{{ Math.round((account.balance / account.credit_limit) * 100) }}% Used</span>
                        <span>Limit: {{ formatAmount(account.credit_limit) }}</span>
                    </div>
                    <v-progress-linear
                        :model-value="(account.balance / account.credit_limit) * 100"
                        :color="(account.balance / account.credit_limit) > 0.8 ? 'error' : 'primary'"
                        height="4"
                        rounded
                    ></v-progress-linear>
                </div>
            </div>
        </v-card-text>
        </v-card>
    </v-hover>
</template>

<script setup lang="ts">
import { useCurrency } from '@/composables/useCurrency'
import { 
    Landmark, CreditCard, Banknote, Wallet, TrendingUp, Edit2, DollarSign,
    MoreVertical, Trash2
} from 'lucide-vue-next'

defineProps<{
    account: any
    intelligence?: any
}>()

defineEmits(['view', 'edit', 'pay-bill', 'delete'])

const { formatAmount } = useCurrency()

function getAccountTypeIcon(type: string) {
    const icons: any = { BANK: Landmark, CREDIT_CARD: CreditCard, LOAN: Banknote, WALLET: Wallet, INVESTMENT: TrendingUp }
    return icons[type] || Wallet
}

function getAccountTypeLabel(type: string) {
    const labels: any = { BANK: 'Bank', CREDIT_CARD: 'Credit Card', LOAN: 'Loan', WALLET: 'Wallet', INVESTMENT: 'Investment' }
    return labels[type] || type
}
</script>

<style scoped>
.account-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    border: 1px solid rgba(var(--v-border-color), 0.05) !important;
}
.account-card.raised {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px -10px rgba(var(--v-theme-primary), 0.15) !important;
    border-color: rgba(var(--v-theme-primary), 0.3) !important;
}

.acc-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px -4px rgba(0,0,0,0.1);
}
.acc-icon-wrapper.bank { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); color: #2563eb; }
.acc-icon-wrapper.credit_card { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); color: #dc2626; }
.acc-icon-wrapper.wallet { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); color: #16a34a; }
.acc-icon-wrapper.investment { background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); color: #7c3aed; }
.acc-icon-wrapper.loan { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); color: #d97706; }

.line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
}
.text-tiny { font-size: 0.7rem; }
.ls-1 { letter-spacing: 0.05em; }
</style>
