<script setup lang="ts">
import { computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import { 
    Landmark, CreditCard, Banknote, Wallet, TrendingUp, Edit2, 
    MoreVertical, Trash2
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import WfMenu from '@/components/ui/WfMenu.vue'

interface Props {
    account: any
    intelligence?: any
}

const props = defineProps<Props>()
defineEmits<{
    (e: 'view', account: any): void
    (e: 'edit', account: any): void
    (e: 'pay-bill', account: any): void
    (e: 'delete', account: any): void
}>()

const { formatAmount } = useCurrency()

function getAccountTypeIcon(type: string) {
    const icons: any = { BANK: Landmark, CREDIT_CARD: CreditCard, LOAN: Banknote, WALLET: Wallet, INVESTMENT: TrendingUp }
    return icons[type] || Wallet
}

function getAccountTypeLabel(type: string) {
    const labels: any = { BANK: 'Bank', CREDIT_CARD: 'Credit Card', LOAN: 'Loan', WALLET: 'Wallet', INVESTMENT: 'Investment' }
    return labels[type] || type
}

const iconBadgeStyle = computed(() => {
    switch (props.account?.type) {
        case 'BANK':
            return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        case 'CREDIT_CARD':
            return 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        case 'LOAN':
            return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
        case 'WALLET':
            return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        case 'INVESTMENT':
            return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
        default:
            return 'bg-wf-surface-variant text-wf-text-secondary'
    }
})

const utilizationPct = computed(() => {
    if (!props.account?.credit_limit || props.account.type !== 'CREDIT_CARD') return 0
    return Math.min(100, Math.max(0, Math.round((Number(props.account.balance || 0) / Number(props.account.credit_limit)) * 100)))
})
</script>

<template>
    <WfCard
        variant="flat"
        padding="sm"
        radius="lg"
        class="group h-full flex flex-col justify-between transition-all duration-150 hover:shadow-wf-card-hover border border-wf-border hover:border-wf-primary/40 cursor-pointer"
        @click="$emit('view', account)"
    >
        <div>
            <!-- Header: Icon + Title + Actions in single row -->
            <div class="flex items-start justify-between gap-2 mb-1.5">
                <div class="flex items-start gap-2.5 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-wf-md flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105" :class="iconBadgeStyle">
                        <component :is="getAccountTypeIcon(account.type)" :size="16" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs sm:text-sm font-bold text-wf-text-primary truncate" :title="account.name">
                            {{ account.name }}
                        </div>
                        <div class="flex items-center gap-1.5 text-xs text-wf-text-muted mt-0.5">
                            <span class="text-[10px] font-semibold uppercase tracking-wider">
                                {{ getAccountTypeLabel(account.type) }}
                            </span>
                            <span v-if="account.account_mask" class="font-mono text-[9px] bg-wf-surface-variant text-wf-text-secondary px-1 py-0.2 rounded-wf-xs">
                                ••{{ account.account_mask }}
                            </span>
                            <span v-if="account.institution_name" class="truncate text-[10px] text-wf-text-muted hidden sm:inline">
                                • {{ account.institution_name }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Actions: Pay Bill + Menu -->
                <div class="flex items-center gap-1 shrink-0" @click.stop>
                    <button
                        v-if="account.type === 'CREDIT_CARD'"
                        type="button"
                        class="px-2 py-0.5 text-[10px] font-semibold rounded-wf-sm bg-wf-primary/10 text-wf-primary hover:bg-wf-primary/20 transition-colors"
                        @click.stop="$emit('pay-bill', account)"
                    >
                        Pay
                    </button>

                    <WfMenu align="right">
                        <template #trigger>
                            <MoreVertical :size="14" />
                        </template>
                        <div class="py-1">
                            <button
                                type="button"
                                class="w-full text-left px-3 py-1.5 text-xs text-wf-text-primary hover:bg-wf-surface-variant flex items-center gap-2"
                                @click="$emit('edit', account)"
                            >
                                <Edit2 :size="12" class="text-wf-text-muted" />
                                <span>Edit Details</span>
                            </button>
                            <button
                                type="button"
                                class="w-full text-left px-3 py-1.5 text-xs text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                                @click="$emit('delete', account)"
                            >
                                <Trash2 :size="12" class="text-wf-error" />
                                <span>Delete Account</span>
                            </button>
                        </div>
                    </WfMenu>
                </div>
            </div>

            <!-- Compact Credit Statement Intelligence Snippet -->
            <div v-if="intelligence" class="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-wf-sm px-2.5 py-1.5 my-1.5 text-xs">
                <div class="flex items-center justify-between text-[11px]">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Stmt</span>
                        <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">{{ formatAmount(intelligence.statement_balance) }}</span>
                    </div>
                    <div class="flex items-center gap-1 text-[10px] text-wf-text-muted font-medium">
                        <span>Due {{ intelligence.days_until_due }}d</span>
                        <span v-if="intelligence.is_overdue" class="px-1 py-0.2 text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded">
                            Overdue
                        </span>
                        <span v-else-if="intelligence.days_until_due <= 5" class="px-1 py-0.2 text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded">
                            Soon
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer: Balance & Utilization -->
        <div class="pt-2 border-t border-wf-border-subtle mt-2">
            <div class="flex items-baseline justify-between">
                <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider">
                    {{ account.type === 'CREDIT_CARD' ? 'Cycle Spend' : 'Available Balance' }}
                </div>
                <div
                    class="text-sm sm:text-base font-bold font-mono tracking-tight"
                    :class="account.type === 'CREDIT_CARD' ? 'text-rose-600 dark:text-rose-400' : 'text-wf-text-primary'"
                >
                    {{ account.type === 'CREDIT_CARD' && intelligence?.current_cycle_spend != null
                        ? formatAmount(intelligence.current_cycle_spend)
                        : formatAmount(account.balance) }}
                </div>
            </div>

            <!-- Credit Card Utilization Progress Bar -->
            <div v-if="account.type === 'CREDIT_CARD' && account.credit_limit" class="mt-1 space-y-0.5">
                <div class="flex items-center justify-between text-[9px] font-medium text-wf-text-muted">
                    <span class="font-mono">{{ utilizationPct }}% Used</span>
                    <span class="font-mono">Limit: {{ formatAmount(account.credit_limit) }}</span>
                </div>
                <div class="w-full h-1 bg-wf-surface-variant rounded-full overflow-hidden">
                    <div
                        class="h-full rounded-full transition-all duration-300"
                        :class="utilizationPct > 80 ? 'bg-rose-500' : 'bg-wf-primary'"
                        :style="{ width: `${utilizationPct}%` }"
                    ></div>
                </div>
            </div>
        </div>
    </WfCard>
</template>
