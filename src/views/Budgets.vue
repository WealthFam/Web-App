<script setup lang="ts">
import {
    ChevronLeft,
    ChevronRight,
    Moon,
    Plus,
    Target,
    TrendingDown,
    TrendingUp,
    Sparkles,
    ChevronDown,
    ChevronUp
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'

const showInactive = ref(false)

import { financeApi } from '@/api/client'
import BudgetInsights from '@/components/budgets/BudgetInsights.vue'
import BudgetCategoryCard from '@/components/budgets/BudgetCategoryCard.vue'
import BudgetHero from '@/components/budgets/BudgetHero.vue'
import BudgetSummaryCards from '@/components/budgets/BudgetSummaryCards.vue'
import CategoryDetailsModal from '@/components/budgets/CategoryDetailsModal.vue'
import SetBudgetDialog from '@/components/budgets/SetBudgetDialog.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import WfButton from '@/components/ui/WfButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useFinanceStore } from '@/stores/finance'
import { useBudgetStore } from '@/stores/finance/budgets'
import { useNotificationStore } from '@/stores/notification'

const notify = useNotificationStore()
const authStore = useAuthStore()
const budgetStore = useBudgetStore()
const financeStore = useFinanceStore()

// State - seed from cache
const budgets = computed(() => budgetStore.budgets)
const overallBudget = computed(() => budgetStore.overallBudget)
const categories = computed(() => financeStore.categories)
const loading = ref(budgetStore.budgets.length === 0)
const loadingInsights = ref(false)
const showModal = ref(false)
const insights = computed(() => budgetStore.insights)

// Category Details Modal
const showDetailsModal = ref(false)
const selectedCategoryForDetails = ref<any>(null)
const selectedCategoryBudget = ref<any>(null)

function openCategoryDetails(category: any, budget?: any) {
    selectedCategoryForDetails.value = category
    selectedCategoryBudget.value = budget
    showDetailsModal.value = true
}

// Month Selection
const now = new Date()
const selectedDate = ref(new Date(now.getFullYear(), now.getMonth(), 1))

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const monthYearLabel = computed(() => {
    return `${months[selectedDate.value.getMonth()]} ${selectedDate.value.getFullYear()}`
})

function changeMonth(delta: number) {
    const d = new Date(selectedDate.value)
    d.setMonth(d.getMonth() + delta)
    selectedDate.value = d
    fetchData()
}

function resetToCurrent() {
    selectedDate.value = new Date(now.getFullYear(), now.getMonth(), 1)
    fetchData()
}

const newBudget = ref({
    category: '',
    icon: '',
    amount_limit: null as number | null
})

const activeTab = ref<'expense' | 'income' | 'investment'>('expense')

const groupedBudgets = computed(() => {
    const rawList = budgets.value

    const parents = rawList.filter(b => !b.parent_id)
    const children = rawList.filter(b => b.parent_id)

    const groups = parents.map(p => {
        const myChildren = p.category_id
            ? children.filter(c => c.parent_id === p.category_id)
            : []

        return {
            parent: p,
            children: myChildren.sort((a, b) => b.spent - a.spent)
        }
    })

    return groups.filter(g => {
        if (activeTab.value === 'investment') {
            return g.parent.type === 'investment'
        }

        const isIncomeTab = activeTab.value === 'income'
        const isIncomeGroup = g.parent.type === 'income' || g.parent.income > 0 || g.parent.category === 'Salary'

        if (isIncomeTab && !isIncomeGroup) return false
        if (!isIncomeTab && isIncomeGroup) return false
        
        if (activeTab.value === 'expense' && g.parent.type === 'investment') return false

        return true
    }).sort((a, b) => b.parent.percentage - a.parent.percentage)
})

const activeGroups = computed(() => {
    return groupedBudgets.value.filter(g => {
        const parentActive = g.parent.spent > 0 || g.parent.excluded > 0 || (g.parent.amount_limit && g.parent.amount_limit > 0)
        const childActive = g.children.some(c => c.spent > 0 || c.excluded > 0 || (c.amount_limit && c.amount_limit > 0))
        return parentActive || childActive
    })
})

const inactiveGroups = computed(() => {
    return groupedBudgets.value.filter(g => {
        const parentActive = g.parent.spent > 0 || g.parent.excluded > 0 || (g.parent.amount_limit && g.parent.amount_limit > 0)
        const childActive = g.children.some(c => c.spent > 0 || c.excluded > 0 || (c.amount_limit && c.amount_limit > 0))
        return !parentActive && !childActive
    })
})

const alertGroups = computed(() => {
    return groupedBudgets.value.filter(g => g.parent.percentage > 85)
})

const totalIncome = computed(() => {
    return budgets.value
        .filter(b => !b.parent_id && b.type === 'income')
        .reduce((sum, b) => sum + Number(b.income || 0), 0)
})

const totalSpent = computed(() => {
    return budgets.value
        .filter(b => !b.parent_id && (b.type === 'expense' || b.type === null))
        .reduce((sum, b) => sum + Number(b.spent), 0)
})

const totalInvested = computed(() => {
    return budgets.value
        .filter(b => !b.parent_id && b.type === 'investment')
        .reduce((sum, b) => sum + Number(b.spent), 0)
})

async function fetchData() {
    if (budgetStore.budgets.length === 0) loading.value = true
    budgetStore.insights = []
    try {
        const year = selectedDate.value.getFullYear()
        const month = selectedDate.value.getMonth() + 1
        const userId = authStore.selectedMemberId || undefined

        await Promise.all([
            budgetStore.fetchBudgets(year, month, userId),
            financeStore.fetchCategories()
        ])
    } catch (e) {
        console.error(e)
        notify.error('Failed to load budgets')
    } finally {
        loading.value = false
    }
}

async function fetchInsights() {
    loadingInsights.value = true
    try {
        const year = selectedDate.value.getFullYear()
        const month = selectedDate.value.getMonth() + 1
        const userId = authStore.selectedMemberId || undefined
        await budgetStore.fetchInsights(year, month, userId)
    } catch (e) {
        notify.error('Failed to generate budget insights')
    } finally {
        loadingInsights.value = false
    }
}

watch(() => authStore.selectedMemberId, () => {
    fetchData()
})

function openSetBudgetModal(isOverall = false) {
    if (isOverall) {
        newBudget.value = { category: 'OVERALL', icon: '🏁', amount_limit: null }
    } else {
        newBudget.value = { category: '', icon: '', amount_limit: null }
    }
    showModal.value = true
}

function editBudget(b: any) {
    newBudget.value = {
        category: b.category,
        icon: b.icon || '🏷️',
        amount_limit: b.amount_limit
    }
    showModal.value = true
}

async function saveBudget() {
    if (!newBudget.value.category || !newBudget.value.amount_limit) return
    try {
        await financeApi.setBudget(newBudget.value)
        notify.success('Budget saved')
        showModal.value = false
        fetchData()
    } catch (e) {
        notify.error('Failed to save budget')
    }
}

onMounted(() => {
    fetchData()
})
</script>

<template>
    <MainLayout>
        <div class="max-w-[1600px] mx-auto space-y-8 pb-16">
            <!-- PAGE HEADER: Title & Month Navigator -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs">
                        <Target class="w-5 h-5 text-wf-primary" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary">
                                Budgets & Activity
                            </h1>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                {{ activeGroups.length }} Active Targets
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary">
                            Personal finance intelligence, spending velocity, and monthly limits.
                        </p>
                    </div>
                </div>

                <!-- Month Selector & Set Limit Button -->
                <div class="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                    <!-- Month Selector Pill -->
                    <div class="flex items-center p-1 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md shadow-2xs">
                        <button
                            type="button"
                            @click="changeMonth(-1)"
                            class="p-1.5 rounded-wf-sm text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface transition-colors"
                            title="Previous Month"
                        >
                            <ChevronLeft class="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            @click="resetToCurrent"
                            class="px-3 py-1 text-xs font-bold text-wf-text-primary hover:text-wf-primary transition-colors min-w-[120px] text-center"
                            title="Click to reset to current month"
                        >
                            {{ monthYearLabel }}
                        </button>
                        <button
                            type="button"
                            @click="changeMonth(1)"
                            class="p-1.5 rounded-wf-sm text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface transition-colors"
                            title="Next Month"
                        >
                            <ChevronRight class="w-4 h-4" />
                        </button>
                    </div>

                    <WfButton
                        v-if="!overallBudget"
                        variant="primary"
                        size="sm"
                        @click="openSetBudgetModal(true)"
                        class="shadow-xs"
                    >
                        <Plus class="w-3.5 h-3.5 mr-1" />
                        <span>Set Monthly Limit</span>
                    </WfButton>
                </div>
            </div>

            <!-- LOADING SKELETON -->
            <div v-if="loading" class="space-y-6 animate-pulse">
                <div class="h-64 rounded-wf-xl bg-slate-900/80 border border-slate-800"></div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div v-for="i in 4" :key="`skel-${i}`" class="h-24 rounded-wf-lg bg-wf-surface-variant/50 border border-wf-border-subtle"></div>
                </div>
            </div>

            <!-- MAIN CONTENT -->
            <div v-else class="space-y-8">
                <!-- 1. OVERALL BUDGET HERO CARD (MIDNIGHT VARIANT) -->
                <BudgetHero
                    :overallBudget="overallBudget"
                    @edit="editBudget"
                    @set-limit="openSetBudgetModal(false)"
                />

                <!-- 2. BUDGET INSIGHTS SECTION -->
                <BudgetInsights
                    :insights="insights"
                    :loading="loadingInsights"
                    @analyze="fetchInsights"
                />

                <!-- 3. SUMMARY CARDS & DYNAMIC ALERTS -->
                <BudgetSummaryCards
                    :totalIncome="totalIncome"
                    :totalSpent="totalSpent"
                    :totalInvested="totalInvested"
                    :activeTab="activeTab"
                    :overallBudget="overallBudget"
                    :alertGroups="alertGroups"
                    @edit="editBudget"
                    @open-details="openCategoryDetails"
                />

                <!-- 4. CATEGORY INTELLIGENCE -->
                <div class="space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 class="text-base font-bold text-wf-text-primary leading-none">
                                Category Intelligence
                            </h2>
                            <p class="text-xs text-wf-text-secondary mt-0.5">
                                Granular breakdown of monthly activity and subcategory caps
                            </p>
                        </div>

                        <!-- Segmented Tab Switcher (Expense / Income / Investment) -->
                        <div class="flex items-center p-1 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md shadow-2xs self-start sm:self-auto">
                            <button
                                type="button"
                                @click="activeTab = 'expense'"
                                class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
                                :class="[
                                    activeTab === 'expense'
                                        ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                        : 'text-wf-text-secondary hover:text-wf-text-primary'
                                ]"
                            >
                                <TrendingDown class="w-3.5 h-3.5" />
                                <span>Expense</span>
                            </button>

                            <button
                                type="button"
                                @click="activeTab = 'income'"
                                class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
                                :class="[
                                    activeTab === 'income'
                                        ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                        : 'text-wf-text-secondary hover:text-wf-text-primary'
                                ]"
                            >
                                <TrendingUp class="w-3.5 h-3.5" />
                                <span>Income</span>
                            </button>

                            <button
                                type="button"
                                @click="activeTab = 'investment'"
                                class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
                                :class="[
                                    activeTab === 'investment'
                                        ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                        : 'text-wf-text-secondary hover:text-wf-text-primary'
                                ]"
                            >
                                <Sparkles class="w-3.5 h-3.5" />
                                <span>Investment</span>
                            </button>
                        </div>
                    </div>

                    <!-- Active Categories Grid -->
                    <div v-if="activeGroups.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <BudgetCategoryCard
                            v-for="group in activeGroups"
                            :key="group.parent.budget_id || group.parent.category"
                            :group="group"
                            :activeTab="activeTab"
                            @edit="editBudget"
                            @open-details="openCategoryDetails"
                        />
                    </div>

                    <!-- Inactive Categories Section (Collapsible) -->
                    <div v-if="inactiveGroups.length > 0" class="pt-4 space-y-3">
                        <div class="flex items-center justify-between p-3 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border-subtle">
                            <div class="flex items-center gap-2">
                                <Moon class="w-4 h-4 text-wf-primary opacity-60" />
                                <span class="text-xs font-bold text-wf-text-secondary uppercase tracking-wider">
                                    Inactive Categories ({{ inactiveGroups.length }})
                                </span>
                            </div>

                            <button
                                type="button"
                                @click="showInactive = !showInactive"
                                class="px-3 py-1 rounded-wf-sm text-xs font-semibold text-wf-primary hover:bg-wf-primary-light flex items-center gap-1.5 transition-colors"
                            >
                                <span>{{ showInactive ? 'Hide Inactive' : 'Show Inactive' }}</span>
                                <component :is="showInactive ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div v-if="showInactive" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
                            <BudgetCategoryCard
                                v-for="group in inactiveGroups"
                                :key="group.parent.budget_id || group.parent.category"
                                :group="group"
                                :activeTab="activeTab"
                                isInactive
                                @edit="editBudget"
                                @open-details="openCategoryDetails"
                            />
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div
                        v-if="activeGroups.length === 0 && inactiveGroups.length === 0"
                        class="flex flex-col items-center justify-center py-16 px-6 text-center rounded-wf-xl border border-dashed border-wf-border bg-wf-surface-variant/30 max-w-xl mx-auto space-y-4"
                    >
                        <div class="w-14 h-14 rounded-wf-xl bg-wf-primary-light flex items-center justify-center text-wf-primary border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
                            <Target class="w-7 h-7" />
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-wf-text-primary">No Activity Detected</h3>
                            <p class="text-xs text-wf-text-secondary max-w-sm mx-auto mt-1">
                                Start by setting a category budget or recording transactions for {{ monthYearLabel }} to see intelligent analysis.
                            </p>
                        </div>
                        <WfButton variant="primary" size="sm" @click="openSetBudgetModal(false)">
                            <Target class="w-3.5 h-3.5 mr-1.5" />
                            <span>Set Category Budget</span>
                        </WfButton>
                    </div>
                </div>
            </div>
        </div>

        <!-- SET / EDIT BUDGET MODAL -->
        <SetBudgetDialog
            v-model="showModal"
            :newBudget="newBudget"
            :categories="categories"
            @save="saveBudget"
            @close="showModal = false"
        />

        <!-- CATEGORY DEEP DIVE DETAILS MODAL -->
        <CategoryDetailsModal
            v-if="showDetailsModal"
            :isOpen="showDetailsModal"
            :category="selectedCategoryForDetails"
            :budget="selectedCategoryBudget"
            :month="selectedDate.getMonth() + 1"
            :year="selectedDate.getFullYear()"
            @close="showDetailsModal = false"
        />
    </MainLayout>
</template>