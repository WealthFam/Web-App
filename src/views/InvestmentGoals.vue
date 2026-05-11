<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'
import { useConfirmStore } from '@/stores/confirm'
import { useAuthStore } from '@/stores/auth'
import { useGoalStore } from '@/stores/finance/goals'
import PremiumSkeleton from '@/components/common/PremiumSkeleton.vue'
import {
    Plus,
    Calendar,
    Trash2,
    Pencil,
    TrendingUp,
    TrendingDown,
    Building2,
    X,
    Target,
    Activity,
    ChevronDown,
    ArrowUpRight,
    Timer,
    PieChart
} from 'lucide-vue-next'

const notify = useNotificationStore()
const confirmDialog = useConfirmStore()
const authStore = useAuthStore()
const goalStore = useGoalStore()
const { formatAmount } = useCurrency()

const goals = computed(() => goalStore.goals)
const accounts = computed(() => goalStore.accounts)
const portfolio = computed(() => goalStore.portfolio)
const loading = ref(goalStore.goals.length === 0)
const showModal = ref(false)
const showDeleteModal = ref(false)
const goalToDelete = ref<string | null>(null)
const showAssetModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const selectedGoalId = ref<string | null>(null)

const goalForm = ref({
    name: '',
    target_amount: 0,
    target_date: '',
    icon: '🎯',
    color: '#3b82f6',
    owner_id: null as string | null
})

const assetForm = ref({
    type: 'MANUAL', // MANUAL, BANK_ACCOUNT, MUTUAL_FUND
    name: '',
    manual_amount: 0,
    interest_rate: 0,
    linked_account_id: null as string | null,
    holding_id: null as string | null
})

const fetchGoals = async () => {
    if (goalStore.goals.length === 0) loading.value = true
    try {
        await goalStore.fetchGoals(authStore.selectedMemberId || undefined)
    } catch (e) {
        notify.error("Failed to load goals")
    } finally {
        loading.value = false
    }
}

const fetchAccounts = async () => {
    try {
        await goalStore.fetchAccounts(authStore.selectedMemberId || undefined)
    } catch (e) {
        console.error("Failed to fetch accounts")
    }
}

const fetchPortfolio = async () => {
    try {
        await goalStore.fetchPortfolio()
    } catch (e) {
        console.error("Failed to fetch portfolio")
    }
}

const openAddModal = () => {
    isEditing.value = false
    editingId.value = null
    goalForm.value = {
        name: '',
        target_amount: 0,
        target_date: '',
        icon: '🎯',
        color: '#3b82f6',
        owner_id: authStore.selectedMemberId
    }
    showModal.value = true
}

const openEditModal = (goal: any) => {
    isEditing.value = true
    editingId.value = goal.id
    goalForm.value = {
        name: goal.name,
        target_amount: Number(goal.target_amount),
        target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
        icon: goal.icon || '🎯',
        color: goal.color || '#3b82f6',
        owner_id: goal.owner_id
    }
    showModal.value = true
}

const handleGoalSubmit = async () => {
    try {
        if (isEditing.value && editingId.value) {
            await financeApi.updateInvestmentGoal(editingId.value, goalForm.value)
            notify.success("Goal updated")
        } else {
            await financeApi.createInvestmentGoal(goalForm.value)
            notify.success("Goal created")
        }
        showModal.value = false
        fetchGoals()
    } catch (e) {
        notify.error("Failed to save goal")
    }
}

const confirmDelete = (id: string) => {
    goalToDelete.value = id
    showDeleteModal.value = true
}

const deleteGoal = async () => {
    if (!goalToDelete.value) return
    try {
        await financeApi.deleteInvestmentGoal(goalToDelete.value)
        notify.success("Goal deleted")
        showDeleteModal.value = false
        goalToDelete.value = null
        fetchGoals()
    } catch (e) {
        notify.error("Failed to delete goal")
    }
}

const openAssetModal = (goalId: string) => {
    selectedGoalId.value = goalId
    assetForm.value = {
        type: 'MANUAL',
        name: '',
        manual_amount: 0,
        interest_rate: 0,
        linked_account_id: null,
        holding_id: null
    }
    showAssetModal.value = true
    fetchPortfolio() // Refresh when opening
}

const handleAssetSubmit = async () => {
    if (!selectedGoalId.value) return
    try {
        const payload = { ...assetForm.value }
        // Clean up empty strings to avoid DB constraint issues
        if (!payload.linked_account_id) payload.linked_account_id = null
        if (!payload.holding_id) payload.holding_id = null

        if (payload.type === 'MUTUAL_FUND') {
            if (!payload.holding_id) throw new Error("Please select a fund")
            await financeApi.linkHoldingToGoal(selectedGoalId.value, payload.holding_id)
            notify.success("Mutual Fund linked to goal")
        } else {
            await (financeApi as any).addGoalAsset(selectedGoalId.value, payload)
            notify.success("Asset added to goal")
        }
        showAssetModal.value = false
        fetchGoals()
    } catch (e: any) {
        notify.error(e.message || "Failed to add asset")
    }
}

const removeAsset = async (assetId: string) => {
    try {
        await (financeApi as any).removeGoalAsset(assetId)
        notify.success("Asset removed")
        fetchGoals()
    } catch (e) {
        notify.error("Failed to remove asset")
    }
}

const unlinkHolding = async (goalId: string, holdingId: string) => {
    const isConfirmed = await confirmDialog.prompt('Are you sure you want to remove this mutual fund from the goal?', 'Remove Fund', 'Remove', 'Cancel')
    if (!isConfirmed) return
    try {
        await financeApi.unlinkHoldingFromGoal(goalId, holdingId)
        notify.success("Mutual fund unlinked")
        fetchGoals()
    } catch (e) {
        notify.error("Failed to unlink mutual fund")
    }
}

const accountOptions = computed(() => {
    return accounts.value.map(acc => ({
        label: `${acc.name} (${formatAmount(acc.balance)})`,
        value: acc.id,
        type: acc.type // Ensure type is passed for icon logic
    }))
})

const portfolioOptions = computed(() => {
    if (!portfolio.value || !Array.isArray(portfolio.value)) return []
    return portfolio.value.map(fund => ({
        label: `${fund.folio_number || 'No Folio'} • ${formatAmount(fund.current_value || 0)} • ${fund.scheme_name || 'Unnamed Fund'}`,
        value: fund.id
    }))
})


const memberOptions = computed(() => {
    const members = authStore.familyMembers.map(m => ({
        title: m.full_name || m.email,
        value: m.id,
        initials: (m.full_name || m.email).substring(0, 2).toUpperCase()
    }))
    return [{ title: 'Shared (Everyone)', value: null, initials: 'ALL' }, ...members]
})

// Overall Portfolio Analytics for Goals
const overallStats = computed(() => {
    if (!goals.value.length) return { current: 0, target: 0, progress: 0, dayChange: 0, dayChangePct: 0, remaining: 0 }
    
    const current = goals.value.reduce((s, g) => s + (Number(g.current_amount) || 0), 0)
    const target = goals.value.reduce((s, g) => s + (Number(g.target_amount) || 0), 0)
    const dayChange = goals.value.reduce((s, g) => s + (Number(g.day_change) || 0), 0)
    const remaining = goals.value.reduce((s, g) => s + (Number(g.remaining_amount) || 0), 0)
    const progress = target > 0 ? (current / target) * 100 : 0
    const dayChangePct = current > 0 ? (dayChange / current) * 100 : 0
    
    return { current, target, progress, dayChange, dayChangePct, remaining }
})

const assetDistribution = computed(() => {
    let manual = 0, bank = 0, mutualFunds = 0
    
    goals.value.forEach(goal => {
        (goal.assets || []).forEach((a: any) => {
            if (a.type === 'MANUAL') manual += Number(a.current_value || 0)
            else bank += Number(a.current_value || 0)
        });
        (goal.holdings || []).forEach((h: any) => {
            mutualFunds += Number(h.current_value || 0)
        })
    })
    
    const total = manual + bank + mutualFunds
    if (total === 0) return []
    
    return [
        { label: 'Funds', value: mutualFunds, color: 'primary', icon: TrendingUp },
        { label: 'Bank', value: bank, color: 'success', icon: Building2 },
        { label: 'Manual', value: manual, color: 'warning', icon: Activity }
    ]
})

const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return null
    const targetDate = new Date(dateStr)
    const today = new Date()
    const diff = targetDate.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const formatDaysRemaining = (dateStr: string) => {
    const days = getDaysRemaining(dateStr)
    if (days === null) return 'No target'
    if (days < 0) return 'Overdue'
    if (days < 30) return `${days} days left`
    if (days < 365) return `${Math.floor(days / 30)} months left`
    return `${(days / 365).toFixed(1)} years left`
}

// Lifecycle and Watchers
onMounted(() => {
    fetchGoals()
    fetchAccounts()
})

watch(() => authStore.selectedMemberId, () => {
    fetchGoals()
    fetchAccounts()
})
</script>

<template>
    <MainLayout>
        <v-container fluid class="page-container dashboard-page">
            <div class="relative-pos z-10">
                <!-- Premium Header & Hero Summary -->
                <v-row class="mb-10 align-center">
                    <v-col cols="12" md="6">
                        <div class="d-flex align-center gap-3 mb-2">
                            <v-avatar color="primary" variant="tonal" size="48" rounded="lg">
                                <Target :size="24" class="text-primary" />
                            </v-avatar>
                            <div>
                                <h1 class="text-h4 font-weight-black text-content line-height-tight">Investment Goals</h1>
                                <p class="text-subtitle-2 text-medium-emphasis font-weight-bold opacity-70">
                                    {{ goals.length }} active strategies for your future
                                </p>
                            </div>
                        </div>
                    </v-col>
                    <v-col cols="12" md="6" class="d-flex justify-md-end align-center gap-3">
                        <v-btn color="primary" variant="flat" rounded="pill" height="48"
                            class="px-8 font-weight-black elevation-8 group" @click="openAddModal">
                            <Plus :size="20" class="mr-2 group-hover-rotate" />
                            Create New Goal
                        </v-btn>
                    </v-col>
                </v-row>

                <!-- Hero Stats Section -->
                <v-row class="mb-12" v-if="goals.length > 0">
                    <v-col cols="12" md="4">
                        <v-card class="premium-glass-card h-100 pa-8 card-glow-transition border-primary-glow" rounded="24">
                            <div class="d-flex align-center justify-space-between mb-4">
                                <span class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Current Progress</span>
                                <v-chip size="x-small" color="primary" variant="flat" class="font-weight-black">
                                    {{ Math.round(overallStats.progress) }}% TOTAL
                                </v-chip>
                            </div>
                            <div class="mb-6">
                                <div class="text-h4 font-weight-black text-content mb-1 tabular-nums">
                                    {{ formatAmount(overallStats.current) }}
                                </div>
                                <div class="d-flex align-center gap-2">
                                    <div v-if="overallStats.dayChange !== 0" :class="overallStats.dayChange >= 0 ? 'text-success' : 'text-error'" class="text-caption font-weight-black d-flex align-center">
                                        <TrendingUp v-if="overallStats.dayChange >= 0" :size="14" class="mr-1" />
                                        <TrendingDown v-else :size="14" class="mr-1" />
                                        {{ overallStats.dayChange >= 0 ? '+' : '' }}{{ formatAmount(overallStats.dayChange) }}
                                        ({{ overallStats.dayChangePct.toFixed(2) }}%)
                                    </div>
                                    <span class="text-[10px] opacity-40 font-weight-bold uppercase">OVERALL MOVEMENT</span>
                                </div>
                            </div>
                            <v-progress-linear 
                                :model-value="overallStats.progress" 
                                color="primary" 
                                height="10" 
                                rounded="pill" 
                                class="elevation-1"
                            />
                        </v-card>
                    </v-col>

                    <v-col cols="12" md="4">
                        <v-card class="premium-glass-card h-100 pa-8" rounded="24">
                            <div class="d-flex align-center justify-space-between mb-4">
                                <span class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Wealth Gap</span>
                                <v-avatar color="warning-lighten" size="32">
                                    <ArrowUpRight :size="16" class="text-warning" />
                                </v-avatar>
                            </div>
                            <div class="mb-6">
                                <div class="text-h4 font-weight-black text-content mb-1 tabular-nums">
                                    {{ formatAmount(overallStats.remaining) }}
                                </div>
                                <div class="text-caption text-medium-emphasis font-weight-bold opacity-70">
                                    Remaining across all targets
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <div v-for="i in 5" :key="i" class="flex-grow-1 bg-surface-variant bg-opacity-10 rounded-pill" style="height: 6px;">
                                    <div v-if="i <= Math.ceil(overallStats.progress / 20)" class="h-100 bg-warning rounded-pill"></div>
                                </div>
                            </div>
                        </v-card>
                    </v-col>

                    <v-col cols="12" md="4">
                        <v-card class="premium-glass-card h-100 pa-8" rounded="24">
                            <div class="d-flex align-center justify-space-between mb-4">
                                <span class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Asset Mix</span>
                                <PieChart :size="18" class="text-primary opacity-50" />
                            </div>
                            <div class="d-flex flex-column gap-3 mt-2">
                                <div v-for="asset in assetDistribution" :key="asset.label" class="d-flex align-center justify-space-between">
                                    <div class="d-flex align-center gap-2">
                                        <component :is="asset.icon" :size="14" :class="`text-${asset.color}`" />
                                        <span class="text-caption font-weight-bold opacity-70">{{ asset.label }}</span>
                                    </div>
                                    <span class="text-caption font-weight-black tabular-nums">{{ formatAmount(asset.value) }}</span>
                                </div>
                            </div>
                        </v-card>
                    </v-col>
                </v-row>

                <!-- Loading State -->
                <v-row v-if="loading" class="pb-16 pt-8">
                    <v-col v-for="i in 3" :key="`skel-goal-${i}`" cols="12" sm="6" md="4" lg="4">
                        <PremiumSkeleton type="category-card" glass />
                    </v-col>
                </v-row>

                <!-- Empty State -->
                <div v-else-if="goals.length === 0"
                    class="premium-glass-card d-flex flex-column align-center justify-center py-16 px-10 text-center mx-auto"
                    style="max-width: 600px; margin-top: 50px;">
                    <v-avatar color="primary" variant="tonal" size="100" class="mb-8">
                        <Target :size="50" class="text-primary" />
                    </v-avatar>
                    <h3 class="text-h4 font-weight-black mb-1">No Goals Set Yet</h3>
                    <p class="text-subtitle-1 text-on-surface opacity-70 font-weight-bold mb-8">
                        Define your financial aspirations and link your assets to track your progress in real-time.
                    </p>
                    <v-btn color="primary" variant="flat" rounded="pill" height="52"
                        class="px-10 font-weight-black elevation-2" @click="openAddModal">
                        Set Your First Goal
                    </v-btn>
                </div>

                <!-- Goals Grid -->
                <v-row v-else class="pb-16">
                    <v-col v-for="goal in goals" :key="goal.id" cols="12" md="6" lg="4">
                        <v-card rounded="24" class="premium-glass-card group h-100 d-flex flex-column overflow-hidden border-0" elevation="0">
                            <!-- Card Background Accent -->
                            <div class="absolute-pos inset-0 opacity-5 pointer-events-none" :style="{ background: `radial-gradient(circle at top right, ${goal.color}, transparent)` }"></div>
                            
                            <!-- Header Area -->
                            <div class="pa-6 relative-pos">
                                <div class="d-flex justify-space-between align-start mb-4">
                                    <v-avatar :style="{ background: goal.color + '15' }" rounded="xl" size="56"
                                        class="elevation-0 border" :class="`border-${goal.color}`">
                                        <span class="text-h5" :style="{ color: goal.color }">{{ goal.icon }}</span>
                                    </v-avatar>

                                    <v-menu location="bottom end" transition="slide-y-transition">
                                        <template v-slot:activator="{ props }">
                                            <v-btn icon variant="tonal" size="small" v-bind="props" class="opacity-40 hover-opacity-100">
                                                <ChevronDown :size="18" />
                                            </v-btn>
                                        </template>
                                        <v-list density="compact" rounded="xl" class="pa-2" width="160">
                                            <v-list-item @click="openEditModal(goal)" rounded="lg" class="mb-1">
                                                <template v-slot:prepend><Pencil :size="14" class="mr-3" /></template>
                                                <v-list-item-title class="text-caption font-weight-bold">Edit Goal</v-list-item-title>
                                            </v-list-item>
                                            <v-list-item @click="confirmDelete(goal.id)" rounded="lg" class="text-error">
                                                <template v-slot:prepend><Trash2 :size="14" class="mr-3" /></template>
                                                <v-list-item-title class="text-caption font-weight-bold">Delete</v-list-item-title>
                                            </v-list-item>
                                        </v-list>
                                    </v-menu>
                                </div>

                                <h3 class="text-h6 font-weight-black text-truncate mb-1">{{ goal.name }}</h3>
                                <div class="d-flex align-center gap-4">
                                    <div class="d-flex align-center text-[11px] font-weight-bold text-medium-emphasis">
                                        <Calendar :size="12" class="mr-1 text-primary opacity-60" />
                                        {{ goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'No Target' }}
                                    </div>
                                    <v-chip size="x-small" variant="tonal" :color="goal.color" class="font-weight-black text-[9px]">
                                        <Timer :size="10" class="mr-1" />
                                        {{ formatDaysRemaining(goal.target_date) }}
                                    </v-chip>
                                </div>
                            </div>

                            <!-- Progress Section -->
                            <div class="px-6 pb-6 mt-auto">
                                <div class="d-flex justify-space-between align-end mb-2">
                                    <div>
                                        <div class="text-h5 font-weight-black tabular-nums">{{ formatAmount(goal.current_amount) }}</div>
                                        <div class="text-[10px] font-weight-bold text-medium-emphasis opacity-60">
                                            OF {{ formatAmount(goal.target_amount) }} TARGET
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-h6 font-weight-black" :style="{ color: goal.color }">
                                            {{ Math.round(goal.progress_percentage) }}%
                                        </div>
                                        <!-- Real-time Day Change for Goal -->
                                        <div v-if="goal.day_change !== 0" :class="goal.day_change >= 0 ? 'text-success' : 'text-error'" class="text-[10px] font-weight-black d-flex align-center justify-end">
                                            {{ goal.day_change >= 0 ? '+' : '' }}{{ formatAmount(goal.day_change) }}
                                        </div>
                                    </div>
                                </div>
                                <v-progress-linear 
                                    :model-value="Math.max(0, goal.progress_percentage)" 
                                    :color="goal.color"
                                    height="8" 
                                    rounded="pill" 
                                    class="elevation-0 bg-surface-variant bg-opacity-10" 
                                />
                            </div>

                            <!-- Assets Breakdown Drawer-style Section -->
                            <div class="mx-4 mb-4 rounded-xl bg-surface bg-opacity-3 border border-opacity-5 overflow-hidden">
                                <div class="px-4 py-3 d-flex justify-space-between align-center border-b border-opacity-5">
                                    <span class="text-[10px] font-weight-black text-medium-emphasis uppercase letter-spacing-1">Linked Assets</span>
                                    <v-btn variant="text" size="x-small" color="primary" class="text-none font-weight-black px-2" @click="openAssetModal(goal.id)">
                                        <Plus :size="12" class="mr-1" /> Link Asset
                                    </v-btn>
                                </div>

                                <div class="pa-2">
                                    <!-- Empty Assets -->
                                    <div v-if="!goal.assets?.length && !goal.holdings?.length" class="pa-4 text-center">
                                        <span class="text-[10px] font-weight-bold opacity-30">No assets linked</span>
                                    </div>

                                    <!-- Asset Rows -->
                                    <div v-else class="d-flex flex-column gap-1">
                                        <!-- Mutual Funds -->
                                        <div v-for="h in goal.holdings" :key="h.id" class="asset-mini-row d-flex align-center gap-3 pa-2 rounded-lg hover-bg-surface-opacity-10 transition-all">
                                            <div class="pa-2 rounded-lg bg-primary-opacity">
                                                <TrendingUp :size="14" class="text-primary" />
                                            </div>
                                            <div class="flex-grow-1 overflow-hidden">
                                                <div class="text-[11px] font-weight-black text-truncate">{{ h.scheme_name }}</div>
                                                <div class="d-flex align-center gap-2">
                                                    <span class="text-[9px] font-weight-bold opacity-50">{{ formatAmount(h.current_value) }}</span>
                                                    <span v-if="h.day_change" :class="h.day_change >= 0 ? 'text-success' : 'text-error'" class="text-[9px] font-weight-black">
                                                        {{ h.day_change >= 0 ? '▲' : '▼' }}{{ Math.abs(h.day_change_percentage).toFixed(1) }}%
                                                    </span>
                                                </div>
                                            </div>
                                            <v-btn icon variant="text" size="x-small" color="error" class="opacity-0 group-hover-opacity-40" @click="unlinkHolding(goal.id, h.id)">
                                                <X :size="12" />
                                            </v-btn>
                                        </div>

                                        <!-- Manual/Bank Assets -->
                                        <div v-for="a in goal.assets" :key="a.id" class="asset-mini-row d-flex align-center gap-3 pa-2 rounded-lg hover-bg-surface-opacity-10 transition-all">
                                            <div class="pa-2 rounded-lg" :class="a.type === 'BANK_ACCOUNT' ? 'bg-success-opacity' : 'bg-warning-opacity'">
                                                <component :is="a.type === 'BANK_ACCOUNT' ? Building2 : Activity" :size="14" :class="a.type === 'BANK_ACCOUNT' ? 'text-success' : 'text-warning'" />
                                            </div>
                                            <div class="flex-grow-1 overflow-hidden">
                                                <div class="text-[11px] font-weight-black text-truncate">{{ a.display_name }}</div>
                                                <span class="text-[9px] font-weight-bold opacity-50">{{ formatAmount(a.current_value) }}</span>
                                            </div>
                                            <v-btn icon variant="text" size="x-small" color="error" class="opacity-0 group-hover-opacity-40" @click="removeAsset(a.id)">
                                                <X :size="12" />
                                            </v-btn>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </v-card>
                    </v-col>
                </v-row>
            </div>
            <!-- Goal Create/Edit Dialog -->
            <v-dialog v-model="showModal" max-width="500" persistent transition="dialog-bottom-transition">
                <v-card rounded="xl" class="premium-glass-modal elevation-24">
                    <div class="px-6 pt-6 pb-2 d-flex justify-space-between align-start">
                        <div>
                            <div class="text-overline font-weight-black text-primary mb-1 letter-spacing-2">
                                {{ isEditing ? 'Edit Goal' : 'New Goal' }}
                            </div>
                            <h2 class="text-h4 font-weight-black text-content">
                                {{ isEditing ? 'Refine Strategy' : 'Define Target' }}
                            </h2>
                        </div>
                        <v-btn icon variant="text" @click="showModal = false" density="comfortable"
                            class="bg-surface-variant bg-opacity-10 opacity-70 hover:opacity-100">
                            <X :size="20" />
                        </v-btn>
                    </div>

                    <v-card-text class="px-6 py-4">
                        <v-row dense>
                            <v-col cols="12" class="mb-4">
                                <div class="d-flex gap-4">
                                    <div style="width: 80px">
                                        <label
                                            class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">ICON</label>
                                        <v-text-field v-model="goalForm.icon" variant="outlined" density="comfortable"
                                            hide-details rounded="lg" class="icon-picker-field centered-input"
                                            bg-color="surface" />
                                    </div>
                                    <div class="flex-grow-1">
                                        <label
                                            class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">GOAL
                                            NAME</label>
                                        <v-text-field v-model="goalForm.name" placeholder="e.g. Dream Home"
                                            variant="outlined" density="comfortable" hide-details rounded="lg"
                                            bg-color="surface" color="primary" class="font-weight-bold" />
                                    </div>
                                </div>
                            </v-col>

                            <v-col cols="12" sm="6">
                                <label class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">TARGET
                                    AMOUNT</label>
                                <v-text-field v-model.number="goalForm.target_amount" type="number" prefix="₹"
                                    variant="outlined" density="comfortable" hide-details rounded="lg"
                                    bg-color="surface" color="primary" class="font-weight-black" />
                            </v-col>

                            <v-col cols="12" sm="6">
                                <label class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">TARGET
                                    DATE</label>
                                <v-text-field v-model="goalForm.target_date" type="date" variant="outlined"
                                    density="comfortable" hide-details rounded="lg" bg-color="surface" color="primary"
                                    class="font-weight-bold" />
                            </v-col>

                            <v-col cols="12" class="mt-4">
                                <label
                                    class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">OWNERSHIP</label>
                                <v-select v-model="goalForm.owner_id" :items="memberOptions" item-title="title"
                                    item-value="value" variant="outlined" density="comfortable" hide-details
                                    rounded="lg" bg-color="surface" placeholder="Assign Owner" color="primary">
                                    <template v-slot:append-inner>
                                        <ChevronDown :size="16" class="text-primary opacity-70" />
                                    </template>
                                    <template v-slot:item="{ props, item }">
                                        <v-list-item v-bind="props" :title="item.raw.title" class="rounded-lg ma-1">
                                            <template v-slot:prepend>
                                                <v-avatar size="28" color="primary" variant="tonal" class="mr-2">
                                                    <span class="text-caption font-weight-black">{{
                                                        item.raw.initials
                                                    }}</span>
                                                </v-avatar>
                                            </template>
                                        </v-list-item>
                                    </template>
                                    <template v-slot:selection="{ item }">
                                        <div class="d-flex align-center">
                                            <v-avatar size="24" color="primary" variant="tonal" class="mr-2">
                                                <span class="text-tiny font-weight-black">{{ item.raw.initials
                                                }}</span>
                                            </v-avatar>
                                            <span class="text-body-2 font-weight-bold">{{ item.raw.title }}</span>
                                        </div>
                                    </template>
                                </v-select>
                            </v-col>

                            <v-col cols="12" class="mt-4">
                                <label class="text-caption font-weight-bold text-medium-emphasis mb-3 d-block">THEME
                                    COLOR</label>
                                <div class="d-flex flex-wrap justify-space-between align-center px-2">
                                    <div v-for="c in ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']"
                                        :key="c" class="color-dot-premium" :style="{ background: c }"
                                        :class="{ active: goalForm.color === c }" @click="goalForm.color = c">
                                        <div v-if="goalForm.color === c" class="color-dot-ring"></div>
                                    </div>
                                </div>
                            </v-col>
                        </v-row>
                    </v-card-text>

                    <v-card-actions class="px-6 pb-6 pt-2">
                        <v-btn variant="text" @click="showModal = false" height="48" rounded="lg"
                            class="px-6 font-weight-bold text-none text-medium-emphasis">
                            Cancel
                        </v-btn>
                        <v-spacer />
                        <v-btn color="primary" variant="flat" rounded="lg" height="48"
                            class="px-8 font-weight-black text-none elevation-4" @click="handleGoalSubmit">
                            <span class="text-white">{{ isEditing ? 'Save Changes' : 'Create Goal' }}</span>
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Asset Linking Dialog -->
            <v-dialog v-model="showAssetModal" max-width="450" transition="dialog-bottom-transition">
                <v-card rounded="xl" class="premium-glass-modal elevation-24">
                    <div class="px-6 pt-6 pb-2 d-flex justify-space-between align-center">
                        <div>
                            <div class="text-overline font-weight-black text-primary mb-1 letter-spacing-2">Link
                                Assets
                            </div>
                            <h2 class="text-h5 font-weight-black text-content">Connect Wealth</h2>
                        </div>
                        <v-btn icon variant="text" @click="showAssetModal = false" density="comfortable"
                            class="bg-surface-variant bg-opacity-10 opacity-70 hover:opacity-100">
                            <X :size="20" />
                        </v-btn>
                    </div>

                    <v-card-text class="px-6 py-4">
                        <div class="d-flex mb-6 pa-1 bg-surface rounded-lg border border-opacity-10 elevation-0">
                            <v-btn v-for="t in ['MANUAL', 'BANK_ACCOUNT', 'MUTUAL_FUND']" :key="t" variant="flat"
                                rounded="md" size="small"
                                class="flex-grow-1 text-none font-weight-black h-36 letter-spacing-0"
                                :color="assetForm.type === t ? 'primary' : 'transparent'"
                                :class="assetForm.type === t ? 'elevation-2' : 'text-medium-emphasis opacity-60 hover:opacity-100'"
                                @click="assetForm.type = t">
                                <component
                                    :is="t === 'MANUAL' ? Activity : (t === 'BANK_ACCOUNT' ? Building2 : TrendingUp)"
                                    :size="14" class="mr-2" />
                                {{ t === 'BANK_ACCOUNT' ? 'Bank' : (t === 'MUTUAL_FUND' ? 'Funds' : 'Manual') }}
                            </v-btn>
                        </div>

                        <v-form @submit.prevent="handleAssetSubmit">
                            <div v-if="assetForm.type === 'MANUAL'">
                                <label class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">ASSET
                                    NAME</label>
                                <v-text-field v-model="assetForm.name" label="Asset Name" placeholder="e.g. EPF, Gold"
                                    variant="outlined" density="comfortable" hide-details rounded="lg"
                                    bg-color="surface" class="mb-4" />
                                <label class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">CURRENT
                                    VALUE</label>
                                <v-text-field v-model.number="assetForm.manual_amount" type="number" margin-top="8"
                                    prefix="₹" variant="outlined" density="comfortable" hide-details rounded="lg"
                                    bg-color="surface" class="mb-4" />
                                <label class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">INTEREST
                                    RATE</label>
                                <v-text-field v-model.number="assetForm.interest_rate" type="number" suffix="%"
                                    variant="outlined" density="comfortable" hide-details rounded="lg"
                                    bg-color="surface" />
                            </div>

                            <div v-else-if="assetForm.type === 'BANK_ACCOUNT'">
                                <label class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">SELECT
                                    ACCOUNT</label>
                                <v-select v-model="assetForm.linked_account_id" :items="accountOptions"
                                    item-title="label" item-value="value" label="Select Account" variant="outlined"
                                    density="comfortable" hide-details rounded="lg" bg-color="surface">
                                    <template v-slot:append-inner>
                                        <ChevronDown :size="16" class="text-primary opacity-70" />
                                    </template>
                                    <template v-slot:item="{ props, item }">
                                        <v-list-item v-bind="props" :title="item.raw.label" class="rounded-lg ma-1">
                                            <template v-slot:prepend>
                                                <v-avatar size="28" color="success" variant="tonal" class="mr-2">
                                                    <Building2 :size="14" />
                                                </v-avatar>
                                            </template>
                                        </v-list-item>
                                    </template>
                                    <template v-slot:selection="{ item }">
                                        <div class="d-flex align-center">
                                            <Building2 :size="16" class="mr-2 text-success" />
                                            <span class="text-body-2 font-weight-bold">{{ item.raw.label }}</span>
                                        </div>
                                    </template>
                                </v-select>
                            </div>

                            <div v-else>
                                <label class="text-caption font-weight-bold text-medium-emphasis mb-2 d-block">SELECT
                                    FUND</label>
                                <v-autocomplete v-model="assetForm.holding_id" :items="portfolioOptions"
                                    item-title="label" item-value="value" label="Search Mutual Fund" variant="outlined"
                                    density="comfortable" hide-details rounded="lg" bg-color="surface"
                                    auto-select-first>
                                    <template v-slot:append-inner>
                                        <ChevronDown :size="16" class="text-primary opacity-70" />
                                    </template>
                                    <template v-slot:item="{ props, item }">
                                        <v-list-item v-bind="props" :title="item.raw.label" class="rounded-lg ma-1">
                                            <template v-slot:prepend>
                                                <v-avatar size="28" color="info" variant="tonal" class="mr-2">
                                                    <TrendingUp :size="14" />
                                                </v-avatar>
                                            </template>
                                        </v-list-item>
                                    </template>
                                </v-autocomplete>
                            </div>
                        </v-form>
                    </v-card-text>

                    <v-card-actions class="px-6 pb-6 pt-2">
                        <v-btn variant="text" @click="showAssetModal = false" height="48" rounded="lg"
                            class="px-6 font-weight-bold text-none text-medium-emphasis">
                            Cancel
                        </v-btn>
                        <v-spacer />
                        <v-btn color="primary" variant="flat" rounded="lg" height="48"
                            class="px-8 font-weight-black text-none elevation-4" @click="handleAssetSubmit">
                            Link Asset
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- Delete confirmation -->
            <v-dialog v-model="showDeleteModal" max-width="400">
                <v-card rounded="xl" class="pa-6 text-center premium-glass-modal">
                    <div class="d-flex justify-center mb-6">
                        <div class="error-glow pa-4 rounded-circle">
                            <Trash2 :size="32" class="text-error" />
                        </div>
                    </div>
                    <h3 class="text-h5 font-weight-black mb-2">Delete Goal?</h3>
                    <p class="text-medium-emphasis mb-8 px-4">This will permanently remove the goal and all its
                        asset links.
                        This
                        action cannot be undone.</p>
                    <div class="d-flex gap-4">
                        <v-btn variant="text" rounded="lg" class="flex-grow-1 font-weight-bold text-none"
                            @click="showDeleteModal = false">Cancel</v-btn>
                        <v-btn color="error" variant="flat" rounded="lg" class="flex-grow-1 font-weight-black text-none"
                            @click="deleteGoal">Delete
                            Permanently</v-btn>
                    </div>
                </v-card>
            </v-dialog>
        </v-container>
    </MainLayout>
</template>

<style scoped>
/* Relies on base.css dashboard-page */

.relative-pos {
    position: relative;
}

.z-10 {
    z-index: 10;
}

.gap-3 {
    gap: 12px;
}

/* Relies on base.css premium-glass-card */

.premium-glass-card:not(.border-dashed) {
    border-color: rgba(var(--v-border-color), 0.15) !important;
}

.card-actions-overlay {
    transition: opacity 0.2s ease;
}

.goal-progress-bar :deep(.v-progress-linear__background) {
    opacity: 0.1;
}

.assets-scroll-area {
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
}

.hover-lift {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.hover-lift:hover {
    background: rgba(var(--v-theme-surface), 1) !important;
    border-color: rgba(var(--v-theme-primary), 0.3) !important;
    box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.1);
}

.hover-opacity-100 {
    transition: opacity 0.2s ease;
}

.hover-opacity-100:hover {
    opacity: 1 !important;
}

.leading-tight {
    line-height: 1.25;
}

.tabular-nums {
    font-variant-numeric: tabular-nums;
}

.line-height-tight {
    line-height: 1.1 !important;
}

.bg-primary-opacity { background: rgba(var(--v-theme-primary), 0.1); }
.bg-success-opacity { background: rgba(var(--v-theme-success), 0.1); }
.bg-warning-opacity { background: rgba(var(--v-theme-warning), 0.1); }
.bg-error-opacity { background: rgba(var(--v-theme-error), 0.1); }

.border-primary-glow {
    border-color: rgba(var(--v-theme-primary), 0.3) !important;
    box-shadow: 0 0 20px rgba(var(--v-theme-primary), 0.05) !important;
}

.card-glow-transition {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-glow {
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: progress-shine 2s infinite;
}

@keyframes progress-shine {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

.group-hover-rotate {
    transition: transform 0.3s ease;
}
.group:hover .group-hover-rotate {
    transform: rotate(90deg);
}

.asset-mini-row {
    cursor: default;
}
.asset-mini-row:hover {
    background: rgba(var(--v-theme-on-surface), 0.05);
}

.absolute-pos { position: absolute; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }

.hover-bg-surface-opacity-10:hover {
    background: rgba(var(--v-theme-on-surface), 0.05) !important;
}

.group:hover .group-hover-opacity-40 {
    opacity: 0.4 !important;
}
.group-hover-opacity-40:hover {
    opacity: 1 !important;
}

.text-tiny {
    font-size: 0.65rem;
}

.assets-scroll-area {
    max-height: 200px;
    overflow-y: auto;
    padding-right: 4px;
}

.assets-scroll-area::-webkit-scrollbar {
    width: 4px;
}

.assets-scroll-area::-webkit-scrollbar-thumb {
    background: rgba(var(--v-theme-primary), 0.2);
    border-radius: 10px;
}

.icon-picker-field :deep(input) {
    text-align: center;
    font-size: 1.5rem;
}

.color-dot-premium {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    position: relative;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid transparent;
}

.color-dot-premium:hover {
    transform: scale(1.1);
}

.color-dot-premium.active {
    border-color: rgba(var(--v-theme-surface), 1);
    box-shadow: 0 0 0 2px rgb(var(--v-theme-primary));
}

.color-dot-ring {
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    border: 2px solid rgba(var(--v-theme-primary), 0.3);
    animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
    0% {
        transform: scale(0.8);
        opacity: 1;
    }

    100% {
        transform: scale(1.2);
        opacity: 0;
    }
}

.centered-input :deep(input) {
    text-align: center;
    font-size: 1.25rem;
}

.premium-glass-modal {
    background: rgba(var(--v-theme-surface), 0.85) !important;
    backdrop-filter: blur(24px) saturate(200%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

.color-dot.active {
    border-color: #fff;
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.5);
    transform: scale(1.1);
}

.premium-glass-modal {
    background: rgba(var(--v-theme-surface), 0.9) !important;
    backdrop-filter: blur(30px) !important;
    border: 1px solid rgba(255, 255, 255, 0.5) !important;
}

.error-glow {
    background: rgba(var(--v-theme-error), 0.1);
    box-shadow: 0 0 20px rgba(var(--v-theme-error), 0.2);
}

.h-32 {
    height: 32px !important;
}

.letter-spacing-1 {
    letter-spacing: 1px;
}

.group-on-hover-scale {
    transition: transform 0.3s ease;
}

.group:hover .group-on-hover-scale {
    transform: scale(1.1);
}

.border-dashed {
    border-style: dashed !important;
}

.border-primary {
    border-color: rgba(var(--v-theme-primary), 0.5) !important;
}

@media (max-width: 960px) {
    .gap-3 {
        flex-wrap: wrap;
    }
}
</style>
