<template>
    <div class="space-y-8 pb-12">
        <!-- Subscriptions Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 class="text-lg font-bold text-wf-text-primary">Subscriptions & Recurring</h2>
                <p class="text-xs text-wf-text-secondary mt-0.5">Track and manage your recurring bills, subscriptions, and regular cash outflows</p>
            </div>
            <WfButton variant="primary" size="sm" @click="showAddModal = true">
                <Plus :size="15" class="mr-1.5" />
                <span>Add Subscription</span>
            </WfButton>
        </div>

        <!-- Smart Discoveries Section -->
        <div v-if="suggestions.length > 0 || loadingSuggestions" class="space-y-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                        <Sparkles :size="16" />
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-wf-text-primary leading-none">Smart Discoveries</h3>
                        <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">High-confidence patterns detected in transaction history</p>
                    </div>
                </div>

                <WfButton
                    variant="ghost"
                    size="sm"
                    :disabled="loadingSuggestions"
                    @click="fetchSuggestions"
                >
                    <RefreshCw :size="13" class="mr-1.5" :class="loadingSuggestions ? 'animate-spin text-wf-primary' : ''" />
                    <span>Scan</span>
                </WfButton>
            </div>

            <!-- Suggestions Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <!-- Loading State -->
                <template v-if="loadingSuggestions">
                    <div v-for="i in 4" :key="`skel-sug-${i}`" class="h-44 rounded-wf-xl bg-wf-surface-variant/40 border border-wf-border-subtle animate-pulse"></div>
                </template>

                <WfCard
                    v-else
                    v-for="(suggestion, idx) in suggestions"
                    :key="idx"
                    variant="flat"
                    padding="md"
                    radius="xl"
                    class="border border-wf-border flex flex-col justify-between hover:shadow-wf-card-hover transition-all duration-200"
                >
                    <div class="space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shrink-0">
                                <component :is="getCategoryLucideIcon(suggestion.category)" :size="18" />
                            </div>

                            <div class="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    @click="openHistory(suggestion)"
                                    class="p-1 rounded-wf-sm text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                                    title="Payment History"
                                >
                                    <History :size="14" />
                                </button>
                                <button
                                    type="button"
                                    @click="approveSuggestion(suggestion)"
                                    class="p-1 rounded-wf-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                    title="Confirm Subscription"
                                >
                                    <Check :size="14" />
                                </button>
                                <button
                                    type="button"
                                    @click="ignoreSuggestion(suggestion)"
                                    class="p-1 rounded-wf-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                    title="Ignore Suggestion"
                                >
                                    <X :size="14" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-xs font-bold text-wf-text-primary truncate" :title="suggestion.name">{{ suggestion.name }}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-sm font-bold font-mono text-wf-primary">{{ formatAmount(suggestion.amount) }}</span>
                                <span class="px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold uppercase tracking-wider bg-wf-surface-variant text-wf-text-secondary">
                                    {{ suggestion.frequency }}
                                </span>
                            </div>
                        </div>

                        <!-- Confidence Bar -->
                        <div class="space-y-1">
                            <div class="flex items-center justify-between text-[10px] font-semibold text-wf-text-muted">
                                <span>Confidence</span>
                                <span>{{ (suggestion.confidence * 100).toFixed(0) }}%</span>
                            </div>
                            <div class="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-wf-pill overflow-hidden">
                                <div
                                    class="h-full rounded-wf-pill bg-wf-primary transition-all duration-300"
                                    :style="{ width: `${suggestion.confidence * 100}%` }"
                                ></div>
                            </div>
                        </div>

                        <div class="text-[10px] text-wf-text-muted truncate flex items-center gap-1 pt-1 border-t border-wf-border-subtle" :title="suggestion.reason">
                            <Info :size="11" class="shrink-0" />
                            <span class="truncate">{{ suggestion.reason }}</span>
                        </div>
                    </div>
                </WfCard>
            </div>
        </div>

        <!-- Active Subscriptions List -->
        <div v-if="store.recurringTransactions.length > 0" class="space-y-4">
            <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-wf-text-primary leading-none">Active Tracking</h3>
                <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                    {{ store.recurringTransactions.length }}
                </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <WfCard
                    v-for="rec in store.recurringTransactions"
                    :key="rec.id"
                    variant="flat"
                    padding="md"
                    radius="xl"
                    class="border border-wf-border hover:shadow-wf-card-hover transition-all duration-200 flex flex-col justify-between"
                >
                    <div class="space-y-3.5">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-10 h-10 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                                    <component :is="getCategoryLucideIcon(rec.category)" :size="20" />
                                </div>
                                <div class="min-w-0">
                                    <h4 class="text-xs font-bold text-wf-text-primary truncate" :title="rec.name">{{ rec.name }}</h4>
                                    <div class="flex items-center gap-1.5 mt-0.5">
                                        <span class="px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold uppercase tracking-wider bg-wf-surface-variant text-wf-text-secondary">
                                            {{ rec.frequency }}
                                        </span>
                                        <span class="text-[10px] text-wf-text-muted">
                                            Next: {{ new Date(rec.next_run_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="text-right shrink-0">
                                <div class="text-sm font-bold font-mono text-wf-text-primary">
                                    {{ formatAmount(rec.amount) }}
                                </div>
                                <span v-if="rec.exclude_from_reports" class="px-1.5 py-0.2 rounded text-[8px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/30 uppercase tracking-wider">
                                    Hidden
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center justify-between pt-2.5 border-t border-wf-border-subtle text-xs">
                            <div class="text-[10px] text-wf-text-muted flex items-center gap-1">
                                <Calendar :size="12" />
                                <span>Started {{ new Date(rec.start_date).toLocaleDateString() }}</span>
                            </div>

                            <div class="flex items-center gap-1">
                                <button
                                    type="button"
                                    @click="openHistory(rec)"
                                    class="p-1 rounded-wf-sm text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                                    title="Payment History"
                                >
                                    <History :size="13" />
                                </button>
                                <button
                                    type="button"
                                    @click="editRecurrence(rec)"
                                    class="p-1 rounded-wf-sm text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                                    title="Edit Subscription"
                                >
                                    <Edit2 :size="13" />
                                </button>
                                <button
                                    type="button"
                                    @click="deleteRecurrence(rec.id)"
                                    class="p-1 rounded-wf-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                    title="Stop Tracking"
                                >
                                    <Trash2 :size="13" />
                                </button>
                            </div>
                        </div>
                    </div>
                </WfCard>
            </div>
        </div>

        <!-- Empty State -->
        <div
            v-else-if="!loadingSuggestions"
            class="flex flex-col items-center justify-center py-16 px-6 text-center rounded-wf-xl border border-dashed border-wf-border bg-wf-surface-variant/30 max-w-xl mx-auto space-y-4"
        >
            <div class="w-14 h-14 rounded-wf-xl bg-wf-primary-light flex items-center justify-center text-wf-primary border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
                <CalendarClock :size="28" />
            </div>
            <div>
                <h3 class="text-base font-bold text-wf-text-primary">Clear Your Financial Horizon</h3>
                <p class="text-xs text-wf-text-secondary max-w-sm mx-auto mt-1">
                    No active recurring tracking detected. Add fixed commitments like rent, utilities, insurance, or streaming subscriptions for reliable cashflow projections.
                </p>
            </div>
            <WfButton variant="primary" size="sm" @click="showAddModal = true">
                <Plus :size="14" class="mr-1.5" />
                <span>Add First Subscription</span>
            </WfButton>
        </div>

        <!-- History Timeline Modal -->
        <WfModal
            :model-value="showHistoryModal"
            @update:model-value="showHistoryModal = $event"
            maxWidth="sm"
        >
            <template #header>
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                        <History :size="16" />
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-wf-text-primary leading-none">{{ historyTarget?.name }}</h3>
                        <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
                            {{ historyTarget?.isSuggestion ? 'Recent Detection Timeline' : 'Payment History' }}
                        </p>
                    </div>
                </div>
            </template>

            <div class="py-2 space-y-3">
                <div v-if="loadingHistory" class="flex flex-col items-center justify-center py-8 gap-2">
                    <div class="w-6 h-6 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
                    <span class="text-xs text-wf-text-muted">Fetching history...</span>
                </div>

                <div v-else-if="historyTarget?.recent_history?.length" class="space-y-2 max-h-72 overflow-y-auto pr-1">
                    <div
                        v-for="(point, i) in historyTarget.recent_history"
                        :key="i"
                        class="flex items-center justify-between p-2 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs"
                    >
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-wf-xs flex items-center justify-center text-xs shrink-0" :style="{ backgroundColor: getCategoryDisplay(historyTarget.category).color + '20' }">
                                <span>{{ getCategoryDisplay(historyTarget.category).icon }}</span>
                            </div>
                            <div>
                                <div class="font-semibold text-wf-text-primary truncate max-w-[160px]">{{ historyTarget.name }}</div>
                                <div class="text-[10px] text-wf-text-muted">
                                    {{ new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }}
                                </div>
                            </div>
                        </div>

                        <span class="font-bold font-mono text-rose-500">
                            {{ formatAmount(point.amount) }}
                        </span>
                    </div>
                </div>

                <div v-else class="text-center py-8 text-xs text-wf-text-muted">
                    No recorded transaction points found for this provider.
                </div>
            </div>

            <template #footer>
                <WfButton variant="secondary" size="sm" @click="showHistoryModal = false">
                    Close
                </WfButton>
            </template>
        </WfModal>

        <!-- Add / Edit Subscription Modal -->
        <WfModal
            :model-value="showAddModal"
            @update:model-value="showAddModal = $event"
            maxWidth="md"
        >
            <template #header>
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
                        <component :is="newRecurrence.id ? Pencil : Plus" :size="16" />
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-wf-text-primary leading-none">
                            {{ newRecurrence.id ? 'Edit Subscription' : 'New Subscription' }}
                        </h3>
                        <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
                            {{ newRecurrence.id ? 'Update subscription cadence and rules' : 'Record a recurring bill or automated debit' }}
                        </p>
                    </div>
                </div>
            </template>

            <form @submit.prevent="saveRecurrence" class="space-y-4 py-1">
                <!-- Provider Name -->
                <div class="space-y-1">
                    <label class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">
                        Provider / Service Name
                    </label>
                    <WfInput
                        v-model="newRecurrence.name"
                        placeholder="e.g. Netflix, Rent, AWS, Gym..."
                        required
                    />
                </div>

                <!-- Amount & Billing Cycle -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">
                            Amount (₹)
                        </label>
                        <WfInput
                            v-model.number="newRecurrence.amount"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div class="space-y-1">
                        <label class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">
                            Billing Frequency
                        </label>
                        <WfSelect
                            v-model="newRecurrence.frequency"
                            :items="frequencyOptions.map(f => ({ title: f, value: f }))"
                        />
                    </div>
                </div>

                <!-- First/Next Date & Source Account -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">
                            First / Next Payment Date
                        </label>
                        <WfInput
                            v-model="newRecurrence.start_date"
                            type="date"
                            required
                        />
                    </div>

                    <div class="space-y-1">
                        <label class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">
                            Source Account
                        </label>
                        <WfSelect
                            v-model="newRecurrence.account_id"
                            :items="store.accounts.map(a => ({ title: a.name, value: a.id }))"
                            placeholder="Select source account"
                        />
                    </div>
                </div>

                <!-- Category -->
                <div class="space-y-1">
                    <label class="text-[11px] font-bold uppercase tracking-wider text-wf-text-secondary">
                        Category
                    </label>
                    <WfSelect
                        v-model="newRecurrence.category"
                        :items="store.categories.map(c => ({ title: `${c.icon || '🏷️'} ${c.name}`, value: c.name }))"
                        placeholder="Select category"
                    />
                </div>

                <!-- Private Expense Toggle -->
                <div class="flex items-center justify-between p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
                    <div class="flex items-center gap-2.5">
                        <ShieldCheck :size="18" class="text-wf-primary" />
                        <div>
                            <span class="text-xs font-bold text-wf-text-primary block">Private Expense</span>
                            <span class="text-[11px] text-wf-text-muted">Hide from consolidated family summaries</span>
                        </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            v-model="newRecurrence.exclude_from_reports"
                            class="sr-only peer"
                        />
                        <div class="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-wf-primary"></div>
                    </label>
                </div>
            </form>

            <template #footer>
                <WfButton variant="ghost" size="sm" @click="showAddModal = false">
                    Cancel
                </WfButton>
                <WfButton variant="primary" size="sm" @click="saveRecurrence">
                    <Check :size="14" class="mr-1" />
                    <span>{{ newRecurrence.id ? 'Save Changes' : 'Confirm Subscription' }}</span>
                </WfButton>
            </template>
        </WfModal>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
    Plus, X, CalendarClock, Trash2,
    Sparkles, RefreshCw, Calendar, Edit2, ShieldCheck,
    Check, History, Info, Pencil
} from 'lucide-vue-next'
import { useFinanceStore } from '@/stores/finance'
import { useAuthStore } from '@/stores/auth'
import { useCurrency } from '@/composables/useCurrency'
import { financeApi } from '@/api/client'
import { useConfirmStore } from '@/stores/confirm'
import { useNotificationStore } from '@/stores/notification'
import { todayLocalString } from '@/utils/time'
import { getCategoryLucideIcon } from '@/utils/iconMapping'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfSelect from '@/components/ui/WfSelect.vue'

const store = useFinanceStore()
const authStore = useAuthStore()
const confirmDialog = useConfirmStore()
const notification = useNotificationStore()
const { formatAmount } = useCurrency()

const showAddModal = ref(false)
const suggestions = ref<any[]>([])
const loadingSuggestions = ref(false)
const showHistoryModal = ref(false)
const historyTarget = ref<any>(null)
const loadingHistory = ref(false)

async function openHistory(item: any) {
    if (item.recent_history) {
        historyTarget.value = { ...item, isSuggestion: true }
        showHistoryModal.value = true
    } else {
        historyTarget.value = { ...item, isSuggestion: false, recent_history: [] }
        showHistoryModal.value = true
        loadingHistory.value = true
        try {
            const res = await financeApi.getTransactions(undefined, 1, 10, undefined, undefined, item.name)
            const txns = res.data?.data || []
            historyTarget.value.recent_history = txns.map((t: any) => ({
                date: t.date,
                amount: t.amount
            }))
        } catch (e) {
            console.error("Failed to fetch history", e)
        } finally {
            loadingHistory.value = false
        }
    }
}

onMounted(() => {
    fetchSuggestions()
})

async function fetchSuggestions() {
    loadingSuggestions.value = true
    try {
        const res = await financeApi.getRecurringSuggestions()
        suggestions.value = res.data
    } catch (e) {
        console.error("Failed to fetch recurring suggestions", e)
    } finally {
        loadingSuggestions.value = false
    }
}

async function ignoreSuggestion(suggestion: any) {
    const isConfirmed = await confirmDialog.prompt(
        `Are you sure you want to ignore ${suggestion.name}?`,
        "Ignore Suggestion",
        "Ignore",
        "Keep"
    )
    if (!isConfirmed) return

    try {
        await financeApi.ignoreRecurringSuggestion(suggestion.pattern)
        notification.success(`Ignored pattern: ${suggestion.name}`)
        await fetchSuggestions()
    } catch (e) {
        console.error("Failed to ignore suggestion", e)
    }
}

async function approveSuggestion(suggestion: any) {
    const isConfirmed = await confirmDialog.prompt(
        `Confirm ${suggestion.name} as a recurring subscription?`,
        "Confirm Discovery",
        "Confirm",
        "Cancel"
    )
    if (!isConfirmed) return

    newRecurrence.value = {
        id: null,
        name: suggestion.name,
        amount: suggestion.amount,
        category: suggestion.category || '',
        account_id: suggestion.account_id,
        frequency: suggestion.frequency,
        start_date: suggestion.last_date ? suggestion.last_date.split('T')[0] : todayLocalString(),
        type: 'DEBIT',
        exclude_from_reports: false
    }
    showAddModal.value = true
}

const newRecurrence = ref({
    id: null as string | null,
    name: '',
    amount: 0,
    category: '',
    account_id: '',
    frequency: 'MONTHLY',
    start_date: todayLocalString(),
    type: 'DEBIT',
    exclude_from_reports: false
})

async function editRecurrence(rec: any) {
    newRecurrence.value = {
        id: rec.id,
        name: rec.name,
        amount: Math.abs(rec.amount),
        category: rec.category,
        account_id: rec.account_id,
        frequency: rec.frequency,
        start_date: rec.start_date ? rec.start_date.split('T')[0] : todayLocalString(),
        type: rec.amount < 0 ? 'DEBIT' : 'CREDIT',
        exclude_from_reports: rec.exclude_from_reports
    }
    showAddModal.value = true
}

async function saveRecurrence() {
    try {
        const payload = {
            ...newRecurrence.value,
            next_run_date: newRecurrence.value.start_date
        }
        
        if (newRecurrence.value.id) {
            await financeApi.updateRecurring(newRecurrence.value.id, payload)
            notification.success(`Subscription updated: ${newRecurrence.value.name}`)
        } else {
            await financeApi.createRecurringTransaction(payload)
            notification.success(`Subscription created: ${newRecurrence.value.name}`)
        }
        
        showAddModal.value = false
        await store.fetchRecurring(authStore.selectedMemberId || undefined)
        resetForm()
    } catch (e) {
        console.error(e)
    }
}

function resetForm() {
    newRecurrence.value = {
        id: null,
        name: '',
        amount: 0,
        category: '',
        account_id: '',
        frequency: 'MONTHLY',
        start_date: todayLocalString(),
        type: 'DEBIT',
        exclude_from_reports: false
    }
}

async function deleteRecurrence(id: string) {
    const isConfirmed = await confirmDialog.prompt("Stop tracking this subscription?", "Stop Subscription", "Stop", "Keep")
    if (!isConfirmed) return
    try {
        await financeApi.deleteRecurring(id)
        notification.success('Subscription tracking stopped')
        await store.fetchRecurring(authStore.selectedMemberId || undefined)
    } catch (e) {
        console.error("Failed to delete recurring transaction", e)
    }
}

const frequencyOptions = ['DAILY', 'WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']

function getCategoryDisplay(name: string) {
    if (!name || name === 'Uncategorized') return { icon: '🏷️', text: 'Uncategorized', color: '#9ca3af' }
    const cat = store.categories.find(c => c.name === name)
    if (cat) {
        return { icon: cat.icon || '🏷️', text: cat.name, color: cat.color || '#3B82F6' }
    }
    return { icon: '🏷️', text: name, color: '#9ca3af' }
}

defineExpose({
    openAddModal: () => {
        resetForm()
        showAddModal.value = true
    }
})
</script>
