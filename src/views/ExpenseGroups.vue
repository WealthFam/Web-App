<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
    Plus, Wallet, Pencil, Search, Activity, Archive, Trash2,
    Calendar, Layers, TrendingDown, Target, X,
    RefreshCw
} from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import ExpenseGroupModal from '@/components/groups/ExpenseGroupModal.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'

const notify = useNotificationStore()
const { formatAmount } = useCurrency()

const loading = ref(true)
const expenseGroups = ref<any[]>([])
const searchQuery = ref('')
const showArchived = ref(false)
const selectedYear = ref<string>('All')

const showDeleteConfirm = ref(false)
const groupToDelete = ref<any>(null)
const selectedGroup = ref<any>(null)
const showModal = ref(false)
const isEditing = ref(false)
const isDeleting = ref(false)

const yearOptions = computed(() => {
    const currentYear = new Date().getFullYear()
    const years = [{ label: 'All Years', value: 'All' }]
    for (let y = currentYear + 1; y >= 2018; y--) {
        years.push({ label: y.toString(), value: y.toString() })
    }
    return years
})

const filteredGroups = computed(() => {
    let result = expenseGroups.value.filter(g => g.is_active === !showArchived.value)

    if (selectedYear.value && selectedYear.value !== 'All') {
        result = result.filter(g => {
            const dateToUse = g.start_date || g.created_at
            if (!dateToUse) return false
            return new Date(dateToUse).getFullYear().toString() === selectedYear.value
        })
    }

    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase().trim()
        result = result.filter(g =>
            g.name.toLowerCase().includes(q) ||
            (g.description && g.description.toLowerCase().includes(q))
        )
    }

    return result
})

// Metrics for the summary ribbon
const metrics = computed(() => {
    const activeList = expenseGroups.value.filter(g => g.is_active)
    const totalSpend = filteredGroups.value.reduce((sum, g) => sum + (g.total_spend || 0), 0)
    const totalBudget = activeList.reduce((sum, g) => sum + (Number(g.budget) || 0), 0)
    const budgetedSpend = activeList
        .filter(g => Number(g.budget) > 0)
        .reduce((sum, g) => sum + (g.total_spend || 0), 0)
    const utilization = totalBudget > 0 ? Math.round((budgetedSpend / totalBudget) * 100) : 0

    return {
        totalSpend,
        totalBudget,
        activeCount: activeList.length,
        archivedCount: expenseGroups.value.filter(g => !g.is_active).length,
        utilization
    }
})

const fetchGroups = async () => {
    loading.value = true
    try {
        const res = await financeApi.getExpenseGroups()
        expenseGroups.value = res.data || []
    } catch (e) {
        console.error('Failed to fetch expense groups', e)
        notify.error('Failed to load expense groups')
    } finally {
        loading.value = false
    }
}

const openAddModal = () => {
    isEditing.value = false
    selectedGroup.value = null
    showModal.value = true
}

const openEditModal = (group: any) => {
    isEditing.value = true
    selectedGroup.value = group
    showModal.value = true
}

const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '-'
    const parts = dateStr.split('T')[0].split('-').map(Number)
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    })
}

const getBudgetPercentage = (group: any) => {
    if (!group.budget || group.budget === 0) return 0
    return Math.min(100, ((group.total_spend || 0) / group.budget) * 100)
}

const getConsumedReal = (group: any) => {
    if (!group.budget || group.budget === 0) return 0
    return Math.round(((group.total_spend || 0) / group.budget) * 100)
}

const confirmDelete = (group: any) => {
    groupToDelete.value = group
    showDeleteConfirm.value = true
}

const doDelete = async () => {
    if (!groupToDelete.value) return
    isDeleting.value = true
    try {
        await financeApi.deleteExpenseGroup(groupToDelete.value.id)
        notify.success('Expense group deleted')
        fetchGroups()
    } catch (e) {
        notify.error('Failed to delete group')
    } finally {
        isDeleting.value = false
        showDeleteConfirm.value = false
        groupToDelete.value = null
    }
}

const generateColor = (name: string) => {
    const colors = ['#eff6ff', '#f0fdf4', '#fef2f2', '#fff7ed', '#f0f9ff', '#faf5ff']
    const textColors = ['#1d4ed8', '#15803d', '#b91c1c', '#c2410c', '#0369a1', '#7e22ce']
    let hash = 0
    const str = name || 'default'
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return { bg: colors[index], text: textColors[index] }
}

onMounted(() => {
    fetchGroups()
})
</script>

<template>
    <MainLayout>
        <div class="max-w-[1600px] mx-auto space-y-6 pb-12">
            <!-- HEADER: Title, Subtitle, & Segmented Tab Controls -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs">
                        <Layers class="w-5 h-5 text-wf-primary" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary">
                                Expense Groups
                            </h1>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                {{ metrics.activeCount }} Active
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary">
                            Organize and track your family's spending buckets, trips, and dedicated budgets.
                        </p>
                    </div>
                </div>

                <!-- Segmented Control: Active vs Archived -->
                <div class="flex items-center p-1 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md shadow-2xs self-start sm:self-auto">
                    <button
                        type="button"
                        @click="showArchived = false"
                        class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
                        :class="[
                            !showArchived
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <Activity class="w-3.5 h-3.5" />
                        <span>Active</span>
                        <span class="px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-surface-variant text-wf-text-secondary">
                            {{ metrics.activeCount }}
                        </span>
                    </button>

                    <button
                        type="button"
                        @click="showArchived = true"
                        class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
                        :class="[
                            showArchived
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <Archive class="w-3.5 h-3.5" />
                        <span>Archived</span>
                        <span class="px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-surface-variant text-wf-text-secondary">
                            {{ metrics.archivedCount }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- METRIC OVERVIEW RIBBON -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <WfCard class="p-3.5 flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Total Group Spending</span>
                        <div class="w-7 h-7 rounded-wf-sm bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                            <TrendingDown class="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div class="mt-2">
                        <span class="text-lg font-bold text-wf-text-primary tracking-tight">
                            {{ formatAmount(metrics.totalSpend) }}
                        </span>
                        <p class="text-[10px] text-wf-text-muted mt-0.5">Across current view buckets</p>
                    </div>
                </WfCard>

                <WfCard class="p-3.5 flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Total Target Budget</span>
                        <div class="w-7 h-7 rounded-wf-sm bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center">
                            <Target class="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div class="mt-2">
                        <span class="text-lg font-bold text-wf-text-primary tracking-tight">
                            {{ formatAmount(metrics.totalBudget) }}
                        </span>
                        <p class="text-[10px] text-wf-text-muted mt-0.5">Allocated active limits</p>
                    </div>
                </WfCard>

                <WfCard class="p-3.5 flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Active Buckets</span>
                        <div class="w-7 h-7 rounded-wf-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <Layers class="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div class="mt-2">
                        <span class="text-lg font-bold text-wf-text-primary tracking-tight">
                            {{ metrics.activeCount }}
                        </span>
                        <p class="text-[10px] text-wf-text-muted mt-0.5">Currently tracking</p>
                    </div>
                </WfCard>

                <WfCard class="p-3.5 flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Budget Utilization</span>
                        <div class="w-7 h-7 rounded-wf-sm bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                            <Wallet class="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div class="mt-2">
                        <div class="flex items-baseline gap-1.5">
                            <span class="text-lg font-bold tracking-tight" :class="metrics.utilization >= 100 ? 'text-rose-600' : metrics.utilization >= 80 ? 'text-amber-600' : 'text-emerald-600'">
                                {{ metrics.utilization }}%
                            </span>
                            <span class="text-[10px] text-wf-text-muted">consumed</span>
                        </div>
                        <p class="text-[10px] text-wf-text-muted mt-0.5">Of active budgeted targets</p>
                    </div>
                </WfCard>
            </div>

            <!-- TOOLBAR: Search, Year Filter, and Action Buttons -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <!-- Search Input -->
                    <div class="relative flex items-center h-8 px-2.5 rounded-wf-sm bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs w-full sm:w-64">
                        <Search class="w-3.5 h-3.5 text-wf-text-muted shrink-0 mr-2" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Search expense buckets..."
                            class="w-full bg-transparent text-xs text-wf-text-primary focus:outline-none placeholder:text-wf-text-muted"
                        />
                        <button
                            v-if="searchQuery"
                            @click="searchQuery = ''"
                            class="text-wf-text-muted hover:text-wf-text-primary ml-1"
                        >
                            <X class="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <!-- Year Dropdown Filter -->
                    <div class="flex items-center h-8 px-2.5 rounded-wf-sm bg-wf-surface border border-wf-border shadow-2xs">
                        <Calendar class="w-3.5 h-3.5 text-wf-text-muted shrink-0 mr-2" />
                        <select
                            v-model="selectedYear"
                            class="bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none cursor-pointer"
                        >
                            <option v-for="y in yearOptions" :key="y.value" :value="y.value">
                                {{ y.label }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <WfButton
                        variant="primary"
                        size="sm"
                        @click="openAddModal"
                        class="shadow-xs"
                    >
                        <Plus class="w-3.5 h-3.5 mr-1" />
                        <span>Add Bucket</span>
                    </WfButton>
                </div>
            </div>

            <!-- LOADING STATE -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw class="w-7 h-7 text-wf-primary animate-spin" />
                <span class="text-xs font-semibold text-wf-text-secondary">Loading expense groups...</span>
            </div>

            <!-- EMPTY STATE -->
            <div
                v-else-if="filteredGroups.length === 0"
                class="flex flex-col items-center justify-center py-16 px-6 text-center rounded-wf-xl border border-dashed border-wf-border bg-wf-surface-variant/30 max-w-xl mx-auto space-y-4"
            >
                <div class="w-14 h-14 rounded-wf-xl bg-wf-primary-light flex items-center justify-center text-wf-primary border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
                    <Wallet class="w-7 h-7" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-wf-text-primary">No Expense Groups Found</h3>
                    <p class="text-xs text-wf-text-secondary max-w-sm mx-auto mt-1">
                        {{ searchQuery ? 'No expense groups matched your search query.' : 'Organize your finances by creating dedicated spending buckets for vacations, projects, or special events.' }}
                    </p>
                </div>
                <WfButton variant="primary" size="sm" @click="openAddModal">
                    <Plus class="w-3.5 h-3.5 mr-1.5" />
                    <span>Create Your First Bucket</span>
                </WfButton>
            </div>

            <!-- GROUPS GRID -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Add New Group Dotted Card (Active view only) -->
                <div
                    v-if="!showArchived"
                    @click="openAddModal"
                    class="h-[230px] rounded-wf-lg border-2 border-dashed border-wf-border hover:border-wf-primary bg-wf-surface-variant/20 hover:bg-wf-primary-light/30 transition-all duration-200 flex flex-col items-center justify-center p-6 cursor-pointer group text-center"
                >
                    <div class="w-11 h-11 rounded-wf-full bg-wf-primary text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform mb-3">
                        <Plus class="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span class="text-sm font-bold text-wf-text-primary group-hover:text-wf-primary transition-colors">Create New Bucket</span>
                    <span class="text-[11px] text-wf-text-muted mt-0.5">Track dedicated spend & budgets</span>
                </div>

                <!-- Existing Group Cards -->
                <WfCard
                    v-for="group in filteredGroups"
                    :key="group.id"
                    class="p-4 flex flex-col justify-between hover:shadow-wf-card-hover transition-all duration-200 group/card border-wf-border cursor-pointer relative"
                    @click="openEditModal(group)"
                >
                    <div class="space-y-3">
                        <!-- Top Row: Icon Avatar & Quick Actions -->
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                                <div
                                    class="w-10 h-10 rounded-wf-md flex items-center justify-center text-xl shrink-0 shadow-2xs border border-wf-border"
                                    :style="{ background: generateColor(group.name).bg }"
                                >
                                    <span>{{ group.icon || group.name.charAt(0).toUpperCase() }}</span>
                                </div>
                                <div class="min-w-0">
                                    <h3 class="text-sm font-bold text-wf-text-primary truncate">
                                        {{ group.name }}
                                    </h3>
                                    <div class="flex items-center gap-1.5 text-[10px] text-wf-text-muted mt-0.5">
                                        <Calendar class="w-3 h-3 text-wf-text-muted shrink-0" />
                                        <span>
                                            {{ group.start_date ? formatDateShort(group.start_date) : '?' }} – {{ group.end_date ? formatDateShort(group.end_date) : '?' }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Edit and Delete Actions -->
                            <div class="flex items-center gap-1 shrink-0 opacity-80 group-hover/card:opacity-100 transition-opacity" @click.stop>
                                <button
                                    type="button"
                                    @click="openEditModal(group)"
                                    class="p-1 rounded-wf-sm text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                                    title="Edit Bucket"
                                >
                                    <Pencil class="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    @click="confirmDelete(group)"
                                    class="p-1 rounded-wf-sm text-wf-text-secondary hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                    title="Delete Bucket"
                                >
                                    <Trash2 class="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <!-- Description (Clamped) -->
                        <p class="text-xs text-wf-text-secondary line-clamp-2 min-h-[2.4em]">
                            {{ group.description || 'No specific objective notes provided.' }}
                        </p>
                    </div>

                    <!-- Financial Section -->
                    <div class="pt-3 border-t border-wf-border-subtle mt-3">
                        <template v-if="Number(group.budget) > 0">
                            <div class="flex items-center justify-between mb-1.5">
                                <div>
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">Total Spent</span>
                                    <span class="text-sm font-bold text-wf-text-primary">
                                        {{ formatAmount(group.total_spend || 0) }}
                                    </span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">Consumed</span>
                                    <span
                                        class="text-xs font-bold"
                                        :class="getConsumedReal(group) >= 100 ? 'text-rose-600' : getConsumedReal(group) >= 80 ? 'text-amber-600' : 'text-emerald-600'"
                                    >
                                        {{ getConsumedReal(group) }}%
                                    </span>
                                </div>
                            </div>

                            <!-- Progress Bar -->
                            <div class="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-wf-pill overflow-hidden mb-2">
                                <div
                                    class="h-full rounded-wf-pill transition-all duration-300"
                                    :class="getConsumedReal(group) >= 100 ? 'bg-rose-500' : getConsumedReal(group) >= 80 ? 'bg-amber-500' : 'bg-emerald-500'"
                                    :style="{ width: `${getBudgetPercentage(group)}%` }"
                                ></div>
                            </div>

                            <!-- Target & Left Footers -->
                            <div class="flex items-center justify-between text-[10px] font-semibold text-wf-text-muted">
                                <span>
                                    Balance: 
                                    <strong :class="parseFloat(group.budget) - (group.total_spend || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'">
                                        {{ formatAmount(Math.max(0, parseFloat(group.budget) - (group.total_spend || 0))) }}
                                    </strong>
                                </span>
                                <span>
                                    Target: <strong class="text-wf-text-primary">{{ formatAmount(group.budget) }}</strong>
                                </span>
                            </div>
                        </template>

                        <template v-else>
                            <div class="flex items-center justify-between">
                                <div>
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">Total Spent</span>
                                    <span class="text-sm font-bold text-wf-text-primary">
                                        {{ formatAmount(group.total_spend || 0) }}
                                    </span>
                                </div>
                                <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-semibold bg-wf-surface-variant text-wf-text-secondary border border-wf-border-subtle">
                                    No Target Limit
                                </span>
                            </div>
                        </template>
                    </div>
                </WfCard>
            </div>
        </div>

        <!-- EXPENSE GROUP CREATE / EDIT MODAL -->
        <ExpenseGroupModal
            v-model="showModal"
            :is-editing="isEditing"
            :group-data="selectedGroup"
            @saved="fetchGroups"
        />

        <!-- DELETE CONFIRMATION MODAL -->
        <WfModal
            v-model="showDeleteConfirm"
            maxWidth="sm"
        >
            <div class="text-center space-y-4">
                <div class="w-12 h-12 rounded-wf-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/50 shadow-2xs">
                    <Trash2 class="w-6 h-6" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-wf-text-primary">Delete Expense Bucket?</h3>
                    <p class="text-xs text-wf-text-secondary mt-1 px-4">
                        Are you sure you want to delete <strong class="text-wf-text-primary">{{ groupToDelete?.name }}</strong>? This action cannot be undone.
                    </p>
                </div>
            </div>

            <template #footer>
                <WfButton variant="ghost" @click="showDeleteConfirm = false">
                    Cancel
                </WfButton>
                <WfButton variant="danger" :disabled="isDeleting" @click="doDelete">
                    <RefreshCw v-if="isDeleting" class="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Delete Bucket</span>
                </WfButton>
            </template>
        </WfModal>
    </MainLayout>
</template>