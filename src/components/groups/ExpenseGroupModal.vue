<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import {
    X, Pencil, Activity, Wallet, Calendar, Search, CheckCircle2,
    Inbox, Info as InfoIcon, ListFilter, RefreshCw, Check
} from 'lucide-vue-next'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'
import { useFinanceStore } from '@/stores/finance'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

const props = defineProps<{
    modelValue: boolean
    isEditing: boolean
    groupData: any | null
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'saved'): void
}>()

const notify = useNotificationStore()
const financeStore = useFinanceStore()
const { formatAmount } = useCurrency()

const activeTab = ref<'details' | 'transactions'>('details')
const saving = ref(false)
const showEmojiPicker = ref(false)

const form = ref({
    name: '',
    description: '',
    is_active: true,
    budget: 0,
    start_date: '',
    end_date: '',
    icon: '✈️'
})

const dateRange = ref<[Date, Date] | null>(null)
const eligibleTransactions = ref<any[]>([])
const selectedTransactionIds = ref<string[]>([])
const loadingTransactions = ref(false)
const transactionsLoaded = ref(false)
const txnSearch = ref('')
const accountFilter = ref<string | null>(null)
const accounts = ref<any[]>([])
const displayLimit = ref(50)
const initializing = ref(false)

const emojis = [
    '✈️', '🏠', '🍔', '🛒', '💊', '🎓', '🎮', '🎁',
    '💸', '💼', '🚗', '👶', '🏖️', '🍽️', '👗', '🚲',
    '🐶', '⚽', '💻', '🎨', '🏖️', '⛺', '⛽', '🔧'
]

const dateRangeDisplay = computed(() => {
    if (form.value.start_date && form.value.end_date) {
        return `${formatDateShort(form.value.start_date)} - ${formatDateShort(form.value.end_date)}`
    }
    return ''
})

const filteredTxns = computed(() => {
    let result = eligibleTransactions.value

    if (txnSearch.value) {
        const q = txnSearch.value.toLowerCase().trim()
        result = result.filter(t =>
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.recipient && t.recipient.toLowerCase().includes(q)) ||
            (t.category && t.category.toLowerCase().includes(q))
        )
    }

    if (accountFilter.value) {
        result = result.filter(t => t.account_id === accountFilter.value)
    }

    return result
})

// Pinned transactions (selected ones)
const pinnedTxns = computed(() => {
    return filteredTxns.value.filter(t => selectedTransactionIds.value.includes(t.id))
})

// Unpinned transactions (not selected)
const unpinnedTxns = computed(() => {
    const unpinned = filteredTxns.value.filter(t => !selectedTransactionIds.value.includes(t.id))
    return unpinned.slice(0, displayLimit.value)
})

const selectedTransactionsTotal = computed(() => {
    return eligibleTransactions.value
        .filter(t => selectedTransactionIds.value.includes(t.id) && (t.amount || 0) < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
})

const consumedPercentage = computed(() => {
    if (!form.value.budget || form.value.budget <= 0) return 0
    return Math.round((selectedTransactionsTotal.value / form.value.budget) * 100)
})

function handleClose() {
    emit('update:modelValue', false)
}

function resetForm() {
    form.value = {
        name: '',
        description: '',
        is_active: true,
        budget: 0,
        start_date: '',
        end_date: '',
        icon: '✈️'
    }
    dateRange.value = null
    selectedTransactionIds.value = []
    eligibleTransactions.value = []
    transactionsLoaded.value = false
    activeTab.value = 'details'
    showEmojiPicker.value = false
}

function checkDateStatus() {
    if (!form.value.end_date) return
    const endDate = new Date(form.value.end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    form.value.is_active = endDate >= today
}

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        activeTab.value = 'details'
        showEmojiPicker.value = false
        if (props.isEditing && props.groupData) {
            form.value = {
                name: props.groupData.name || '',
                description: props.groupData.description || '',
                is_active: props.groupData.is_active ?? true,
                budget: props.groupData.budget || 0,
                start_date: props.groupData.start_date?.split('T')[0] || '',
                end_date: props.groupData.end_date?.split('T')[0] || '',
                icon: props.groupData.icon || '✈️'
            }
            if (form.value.start_date && form.value.end_date) {
                initializing.value = true
                const [sy, sm, sd] = form.value.start_date.split('-').map(Number)
                const [ey, em, ed] = form.value.end_date.split('-').map(Number)
                dateRange.value = [new Date(sy, sm - 1, sd), new Date(ey, em - 1, ed)]
                initializing.value = false
                fetchExistingLinks()
            }
        } else {
            resetForm()
        }
    }
})

watch([txnSearch, accountFilter], () => {
    displayLimit.value = 50
})

watch(dateRange, (newRange) => {
    if (!newRange || !newRange[0] || !newRange[1]) {
        form.value.start_date = ''
        form.value.end_date = ''
        checkDateStatus()
        return
    }
    const d1 = new Date(newRange[0])
    const d2 = new Date(newRange[1])
    form.value.start_date = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`
    form.value.end_date = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`
    checkDateStatus()
    if (!initializing.value) {
        fetchEligibleTransactions()
    }
})

async function fetchEligibleTransactions() {
    if (!form.value.start_date || !form.value.end_date) return
    loadingTransactions.value = true
    try {
        const res = await financeApi.getTransactions(
            undefined, 1, 2000,
            form.value.start_date,
            form.value.end_date,
            undefined, undefined, 'date', 'desc',
            financeStore.selectedMemberId || undefined,
            false, false, props.groupData?.id
        )
        eligibleTransactions.value = res.data.data || []

        if (props.isEditing && props.groupData?.id) {
            const groupTxns = (res.data.data || []).filter((t: any) => t.expense_group_id === props.groupData.id)
            groupTxns.forEach((t: any) => {
                if (!selectedTransactionIds.value.includes(t.id)) {
                    selectedTransactionIds.value.push(t.id)
                }
            })
        }

        transactionsLoaded.value = true
    } catch (e) {
        notify.error('Failed to fetch transactions for period')
    } finally {
        loadingTransactions.value = false
    }
}

async function fetchExistingLinks() {
    if (!props.groupData?.id) return
    loadingTransactions.value = true
    try {
        const res = await financeApi.getTransactions(
            undefined, 1, 2000,
            form.value.start_date,
            form.value.end_date,
            undefined, undefined, 'date', 'desc',
            financeStore.selectedMemberId || undefined,
            false, false, props.groupData?.id
        )
        eligibleTransactions.value = res.data.data || []
        selectedTransactionIds.value = (res.data.data || [])
            .filter((t: any) => t.expense_group_id === props.groupData.id)
            .map((t: any) => t.id)
        transactionsLoaded.value = true
    } catch (e) {
        console.error('Failed to fetch linked transactions', e)
    } finally {
        loadingTransactions.value = false
    }
}

function toggleTxn(id: string) {
    const idx = selectedTransactionIds.value.indexOf(id)
    if (idx === -1) selectedTransactionIds.value.push(id)
    else selectedTransactionIds.value.splice(idx, 1)
}

async function handleSubmit() {
    if (!form.value.name?.trim() || !form.value.start_date || !form.value.end_date) {
        notify.error('Bucket name and tracking dates are required')
        return
    }

    saving.value = true
    try {
        let groupId = props.isEditing ? props.groupData.id : null

        if (props.isEditing && groupId) {
            await financeApi.updateExpenseGroup(groupId, form.value)
        } else {
            const res = await financeApi.createExpenseGroup(form.value)
            groupId = res.data.id
        }

        if (groupId) {
            await financeApi.linkExpenseGroupTransactions(groupId, selectedTransactionIds.value)
        }

        notify.success(`Expense bucket ${props.isEditing ? 'updated' : 'created'} successfully`)
        emit('saved')
        emit('update:modelValue', false)
    } catch (e) {
        notify.error('Failed to save expense bucket')
    } finally {
        saving.value = false
    }
}

function getAccountName(id: string) {
    const acc = accounts.value.find(a => a.id === id)
    return acc ? acc.name : 'Account'
}

function getCategoryDisplay(name: string) {
    if (!name || name === 'Uncategorized') return { icon: '🏷️', color: '#9ca3af' }
    const cat = financeStore.categories.flatMap(c => [c, ...(c.subcategories || [])]).find(c => c.name === name)
    return {
        icon: cat?.icon || '🏷️',
        color: cat?.color || '#6366f1'
    }
}

function formatDateShort(dateStr: string) {
    if (!dateStr) return '-'
    const parts = dateStr.split('T')[0].split('-').map(Number)
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const generateColor = (name: string) => {
    const colors = ['#eff6ff', '#f0fdf4', '#fef2f2', '#fff7ed', '#f0f9ff', '#faf5ff']
    const textColors = ['#1d4ed8', '#15803d', '#b91c1c', '#c2410c', '#0369a1', '#7e22ce']
    let hash = 0
    const str = name || 'default'
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    const index = Math.abs(hash) % colors.length
    return { bg: colors[index], text: textColors[index] }
}

async function fetchAccounts() {
    try {
        const res = await financeApi.getAccounts()
        accounts.value = res.data || []
    } catch (e) {
        console.error('Failed to fetch accounts', e)
    }
}

onMounted(() => {
    fetchAccounts()
})
</script>

<template>
    <WfModal
        :model-value="modelValue"
        @update:model-value="handleClose"
        maxWidth="xl"
    >
        <!-- MODAL HEADER -->
        <template #header>
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-wf-md bg-wf-primary-light flex items-center justify-center text-wf-primary border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
                        <Wallet class="w-4 h-4 text-wf-primary" />
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-wf-text-primary leading-none">
                            {{ isEditing ? 'Edit Expense Bucket' : 'Create Expense Bucket' }}
                        </h3>
                        <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
                            {{ isEditing ? 'Refine budget targets and linked transactions' : 'Track dedicated spending for trips, renovations, or events' }}
                        </p>
                    </div>
                </div>

                <!-- Navigation Segmented Tabs -->
                <div class="flex items-center p-0.5 bg-wf-surface-variant border border-wf-border rounded-wf-md shadow-2xs mr-2">
                    <button
                        type="button"
                        @click="activeTab = 'details'"
                        class="px-3 py-1 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
                        :class="[
                            activeTab === 'details'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <InfoIcon class="w-3.5 h-3.5" />
                        <span>Details</span>
                    </button>

                    <button
                        type="button"
                        @click="activeTab = 'transactions'"
                        :disabled="!dateRange || !dateRange[0] || !dateRange[1]"
                        class="px-3 py-1 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        :class="[
                            activeTab === 'transactions'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <ListFilter class="w-3.5 h-3.5" />
                        <span>Transactions</span>
                        <span
                            v-if="selectedTransactionIds.length"
                            class="px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-primary text-white"
                        >
                            {{ selectedTransactionIds.length }}
                        </span>
                    </button>
                </div>
            </div>
        </template>

        <!-- MODAL BODY -->
        <div class="min-h-[420px] max-h-[70vh] flex flex-col -mx-6 -my-6">
            <!-- TAB 1: DETAILS -->
            <div v-if="activeTab === 'details'" class="p-6 space-y-4 overflow-y-auto">
                <!-- Section 1: Identity & Name -->
                <div class="p-4 rounded-wf-lg bg-wf-surface-variant/50 border border-wf-border-subtle space-y-3">
                    <div class="flex items-center gap-3">
                        <!-- Emoji Picker Button -->
                        <div class="relative">
                            <button
                                type="button"
                                @click="showEmojiPicker = !showEmojiPicker"
                                class="w-12 h-12 rounded-wf-md flex items-center justify-center text-2xl border border-wf-border hover:border-wf-primary shadow-2xs transition-all relative group bg-wf-surface"
                                :style="{ background: generateColor(form.name).bg }"
                            >
                                <span>{{ form.icon || '✈️' }}</span>
                                <div class="absolute inset-0 bg-black/20 rounded-wf-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Pencil class="w-3.5 h-3.5 text-white" />
                                </div>
                            </button>

                            <!-- Emoji Dropdown Strip -->
                            <div
                                v-if="showEmojiPicker"
                                class="absolute top-14 left-0 z-50 p-3 bg-wf-surface border border-wf-border rounded-wf-lg shadow-wf-modal w-64 animate-in fade-in zoom-in-95 duration-150"
                            >
                                <div class="flex items-center justify-between pb-2 mb-2 border-b border-wf-border-subtle">
                                    <span class="text-[11px] font-bold text-wf-text-secondary uppercase">Choose Emoji</span>
                                    <button type="button" @click="showEmojiPicker = false" class="text-wf-text-muted hover:text-wf-text-primary">
                                        <X class="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div class="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto">
                                    <button
                                        v-for="e in emojis"
                                        :key="e"
                                        type="button"
                                        @click="form.icon = e; showEmojiPicker = false"
                                        class="w-8 h-8 rounded-wf-sm text-base flex items-center justify-center hover:bg-wf-surface-variant border border-transparent hover:border-wf-border transition-colors"
                                        :class="form.icon === e ? 'bg-wf-primary-light border-wf-primary' : ''"
                                    >
                                        {{ e }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Bucket Name Input -->
                        <div class="flex-1 space-y-1">
                            <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Bucket Name</label>
                            <input
                                v-model="form.name"
                                type="text"
                                placeholder="e.g. Thailand Trip, Home Renovation..."
                                class="w-full h-9 px-3 rounded-wf-sm bg-wf-surface border border-wf-border text-sm font-semibold text-wf-text-primary focus:outline-none focus:border-wf-primary transition-colors"
                                autofocus
                            />
                        </div>
                    </div>

                    <!-- Description / Notes -->
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Notes & Objective</label>
                        <textarea
                            v-model="form.description"
                            rows="2"
                            placeholder="What is this expense bucket for?"
                            class="w-full px-3 py-2 rounded-wf-sm bg-wf-surface border border-wf-border text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary transition-colors resize-none"
                        ></textarea>
                    </div>

                    <!-- Active Toggle Switch -->
                    <div class="flex items-center justify-between pt-2 border-t border-wf-border-subtle">
                        <div class="flex items-center gap-2">
                            <Activity class="w-4 h-4 text-wf-primary" />
                            <span class="text-xs font-semibold text-wf-text-primary">Active Bucket Status</span>
                        </div>
                        <button
                            type="button"
                            @click="form.is_active = !form.is_active"
                            class="flex items-center gap-2 px-2.5 py-1 rounded-wf-pill text-xs font-bold transition-colors border"
                            :class="form.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
                        >
                            <span class="w-1.5 h-1.5 rounded-full" :class="form.is_active ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                            <span>{{ form.is_active ? 'ACTIVE' : 'ARCHIVED' }}</span>
                        </button>
                    </div>
                </div>

                <!-- Section 2: Financial Target / Budget -->
                <div class="p-4 rounded-wf-lg bg-wf-surface-variant/50 border border-wf-border-subtle space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <Wallet class="w-4 h-4 text-wf-primary" />
                            <span class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Financial Target</span>
                        </div>
                        <span
                            v-if="form.budget > 0"
                            class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold border"
                            :class="consumedPercentage > 100 ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'"
                        >
                            {{ consumedPercentage }}% Consumed
                        </span>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Target Budget</label>
                        <div class="relative flex items-center">
                            <span class="absolute left-3 text-sm font-bold text-wf-text-muted">₹</span>
                            <input
                                v-model.number="form.budget"
                                type="number"
                                min="0"
                                step="100"
                                placeholder="0.00"
                                class="w-full h-9 pl-7 pr-3 rounded-wf-sm bg-wf-surface border border-wf-border text-sm font-bold text-wf-text-primary focus:outline-none focus:border-wf-primary transition-colors"
                            />
                        </div>
                    </div>

                    <!-- Progress Bar when budget is defined -->
                    <div v-if="form.budget > 0" class="space-y-1.5 pt-1">
                        <div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-wf-pill overflow-hidden">
                            <div
                                class="h-full rounded-wf-pill transition-all duration-300"
                                :class="consumedPercentage >= 100 ? 'bg-rose-500' : consumedPercentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'"
                                :style="{ width: `${Math.min(100, consumedPercentage)}%` }"
                            ></div>
                        </div>
                        <div class="flex items-center justify-between text-[11px] font-medium text-wf-text-secondary">
                            <span>{{ formatAmount(selectedTransactionsTotal) }} linked spent</span>
                            <span>{{ formatAmount(Math.max(0, form.budget - selectedTransactionsTotal)) }} remaining</span>
                        </div>
                    </div>
                </div>

                <!-- Section 3: Tracking Period -->
                <div class="p-4 rounded-wf-lg bg-wf-surface-variant/50 border border-wf-border-subtle space-y-2">
                    <div class="flex items-center gap-2">
                        <Calendar class="w-4 h-4 text-wf-primary" />
                        <span class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Tracking Period</span>
                    </div>
                    <VueDatePicker
                        v-model="dateRange"
                        range
                        auto-apply
                        :enable-time-picker="false"
                        placeholder="Select start and end dates"
                        :teleport="true"
                    >
                        <template #trigger>
                            <div class="flex items-center justify-between h-9 px-3 rounded-wf-sm bg-wf-surface border border-wf-border text-xs font-semibold text-wf-text-primary cursor-pointer hover:border-wf-primary transition-colors">
                                <span>{{ dateRangeDisplay || 'Click to select start and end dates' }}</span>
                                <Calendar class="w-3.5 h-3.5 text-wf-text-muted" />
                            </div>
                        </template>
                    </VueDatePicker>
                </div>
            </div>

            <!-- TAB 2: TRANSACTIONS -->
            <div v-else class="flex flex-col flex-1 overflow-hidden">
                <!-- Transactions Subheader & Filter Bar -->
                <div class="p-4 border-b border-wf-border-subtle bg-wf-surface-variant/30 space-y-3 shrink-0">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="flex items-center gap-2">
                                <Activity class="w-4 h-4 text-wf-primary" />
                                <span class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Link Transactions</span>
                            </div>
                            <p class="text-[11px] text-wf-text-secondary mt-0.5">
                                {{ pinnedTxns.length }} linked ({{ formatAmount(selectedTransactionsTotal) }}) • {{ unpinnedTxns.length }} available in range
                            </p>
                        </div>
                        <WfButton
                            size="sm"
                            variant="secondary"
                            :disabled="loadingTransactions || !dateRange"
                            @click="fetchEligibleTransactions"
                        >
                            <RefreshCw class="w-3 h-3" :class="loadingTransactions ? 'animate-spin' : ''" />
                            <span>Refresh</span>
                        </WfButton>
                    </div>

                    <!-- Search and Account Filter -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div class="flex items-center h-8 px-2.5 rounded-wf-sm bg-wf-surface border border-wf-border focus-within:border-wf-primary">
                            <Search class="w-3.5 h-3.5 text-wf-text-muted shrink-0 mr-2" />
                            <input
                                v-model="txnSearch"
                                type="text"
                                placeholder="Search by merchant, note, category..."
                                class="w-full bg-transparent text-xs text-wf-text-primary focus:outline-none"
                            />
                            <button v-if="txnSearch" @click="txnSearch = ''" class="text-wf-text-muted hover:text-wf-text-primary">
                                <X class="w-3 h-3" />
                            </button>
                        </div>

                        <div class="flex items-center h-8 px-2.5 rounded-wf-sm bg-wf-surface border border-wf-border">
                            <select
                                v-model="accountFilter"
                                class="w-full bg-transparent text-xs text-wf-text-primary focus:outline-none cursor-pointer"
                            >
                                <option :value="null">All Accounts</option>
                                <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                                    {{ acc.name }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Transaction List Content -->
                <div class="flex-1 overflow-y-auto p-4 space-y-4">
                    <div v-if="loadingTransactions" class="flex flex-col items-center justify-center py-16 gap-3 text-wf-text-muted">
                        <RefreshCw class="w-6 h-6 animate-spin text-wf-primary" />
                        <span class="text-xs font-semibold">Scanning transactions in date range...</span>
                    </div>

                    <div v-else-if="!transactionsLoaded" class="flex flex-col items-center justify-center py-16 gap-2 text-center text-wf-text-muted">
                        <Calendar class="w-8 h-8 opacity-40 mb-1" />
                        <span class="text-xs font-bold text-wf-text-primary">Select Date Range First</span>
                        <p class="text-[11px] max-w-xs">Configure the start and end dates in the Details tab to fetch eligible ledger items.</p>
                    </div>

                    <template v-else>
                        <!-- Unified Seamless List Container -->
                        <div class="border border-wf-border rounded-wf-md bg-wf-surface overflow-hidden shadow-2xs divide-y divide-wf-border-subtle">
                            <!-- Pinned / Linked Transactions Section -->
                            <template v-if="pinnedTxns.length > 0">
                                <div class="px-3.5 py-2 bg-indigo-50/70 dark:bg-indigo-950/40 flex items-center justify-between">
                                    <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-wf-primary">
                                        <CheckCircle2 class="w-3.5 h-3.5" />
                                        <span>Linked to this Bucket ({{ pinnedTxns.length }})</span>
                                    </div>
                                    <span class="text-[10px] font-bold text-wf-primary">
                                        {{ formatAmount(selectedTransactionsTotal) }}
                                    </span>
                                </div>

                                <div
                                    v-for="txn in pinnedTxns"
                                    :key="txn.id"
                                    @click="toggleTxn(txn.id)"
                                    class="flex items-center justify-between px-3.5 py-2.5 bg-indigo-50/20 dark:bg-indigo-950/15 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 cursor-pointer transition-colors"
                                >
                                    <div class="flex items-center gap-3 min-w-0">
                                        <div class="w-4 h-4 rounded-wf-xs bg-wf-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
                                            <Check class="w-3 h-3 stroke-[3]" />
                                        </div>
                                        <div class="w-7 h-7 rounded-wf-sm flex items-center justify-center text-xs shrink-0" :style="{ backgroundColor: getCategoryDisplay(txn.category).color + '20' }">
                                            {{ getCategoryDisplay(txn.category).icon }}
                                        </div>
                                        <div class="min-w-0">
                                            <p class="text-xs font-bold text-wf-text-primary truncate">
                                                {{ txn.description || txn.recipient || 'Unnamed Transaction' }}
                                            </p>
                                            <div class="flex items-center gap-2 text-[10px] text-wf-text-muted mt-0.5">
                                                <span>{{ getAccountName(txn.account_id) }}</span>
                                                <span>•</span>
                                                <span>{{ formatDateShort(txn.date) }}</span>
                                                <span v-if="txn.category" class="px-1.5 py-0.2 rounded-wf-xs bg-wf-surface-variant font-medium">
                                                    {{ txn.category }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        class="text-xs font-bold shrink-0 ml-3 tabular-nums"
                                        :class="txn.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                                    >
                                        {{ formatAmount(txn.amount) }}
                                    </span>
                                </div>
                            </template>

                            <!-- Available Transactions Section Header -->
                            <div class="px-3.5 py-2 bg-wf-surface-variant/60 flex items-center justify-between">
                                <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-wf-text-secondary">
                                    <Inbox class="w-3.5 h-3.5 text-wf-text-muted" />
                                    <span>Available Transactions ({{ unpinnedTxns.length }})</span>
                                </div>
                                <span class="text-[10px] text-wf-text-muted">Click to link</span>
                            </div>

                            <div v-if="unpinnedTxns.length === 0" class="py-10 text-center text-wf-text-muted text-xs">
                                No available transactions found matching filters.
                            </div>

                            <!-- Available Transactions Rows -->
                            <div
                                v-for="txn in unpinnedTxns"
                                :key="txn.id"
                                @click="toggleTxn(txn.id)"
                                class="flex items-center justify-between px-3.5 py-2.5 hover:bg-wf-surface-variant/60 cursor-pointer transition-colors"
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="w-4 h-4 rounded-wf-xs border border-wf-border bg-wf-surface shrink-0 flex items-center justify-center"></div>
                                    <div class="w-7 h-7 rounded-wf-sm flex items-center justify-center text-xs shrink-0" :style="{ backgroundColor: getCategoryDisplay(txn.category).color + '20' }">
                                        {{ getCategoryDisplay(txn.category).icon }}
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-xs font-medium text-wf-text-primary truncate">
                                            {{ txn.description || txn.recipient || 'Unnamed Transaction' }}
                                        </p>
                                        <div class="flex items-center gap-2 text-[10px] text-wf-text-muted mt-0.5">
                                            <span>{{ getAccountName(txn.account_id) }}</span>
                                            <span>•</span>
                                            <span>{{ formatDateShort(txn.date) }}</span>
                                            <span v-if="txn.category" class="px-1.5 py-0.2 rounded-wf-xs bg-wf-surface-variant font-medium">
                                                {{ txn.category }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span
                                    class="text-xs font-bold shrink-0 ml-3 tabular-nums"
                                    :class="txn.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                                >
                                    {{ formatAmount(txn.amount) }}
                                </span>
                            </div>

                            <!-- Load More Button -->
                            <div v-if="displayLimit < (filteredTxns.length - pinnedTxns.length)" class="p-3 text-center bg-wf-surface-variant/30">
                                <button
                                    type="button"
                                    @click="displayLimit += 100"
                                    class="px-4 py-1.5 rounded-wf-sm text-xs font-semibold text-wf-primary hover:bg-wf-primary-light transition-colors"
                                >
                                    Load More Available Transactions
                                </button>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <!-- MODAL FOOTER -->
        <template #footer>
            <WfButton variant="ghost" @click="handleClose">
                Discard
            </WfButton>
            <WfButton variant="primary" :disabled="saving" @click="handleSubmit">
                <RefreshCw v-if="saving" class="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>{{ isEditing ? 'Update Bucket' : 'Create Bucket' }}</span>
            </WfButton>
        </template>
    </WfModal>
</template>
