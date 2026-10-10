<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'
import { useConfirmStore } from '@/stores/confirm'
import { useAuthStore } from '@/stores/auth'
import { useGoalStore } from '@/stores/finance/goals'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import GoalHeroRibbon from '@/components/goals/GoalHeroRibbon.vue'
import GoalCard from '@/components/goals/GoalCard.vue'
import GoalModal from '@/components/goals/GoalModal.vue'
import LinkAssetModal from '@/components/goals/LinkAssetModal.vue'
import {
  Target,
  Plus,
  TrendingUp,
  Building2,
  Activity,
  Trash2
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
const savingGoal = ref(false)
const savingAsset = ref(false)

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
  color: '#4f46e5',
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
    notify.error('Failed to load goals')
  } finally {
    loading.value = false
  }
}

const fetchAccounts = async () => {
  try {
    await goalStore.fetchAccounts(authStore.selectedMemberId || undefined)
  } catch (e) {
    console.error('Failed to fetch accounts')
  }
}

const fetchPortfolio = async () => {
  try {
    await goalStore.fetchPortfolio()
  } catch (e) {
    console.error('Failed to fetch portfolio')
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
    color: '#4f46e5',
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
    color: goal.color || '#4f46e5',
    owner_id: goal.owner_id
  }
  showModal.value = true
}

const handleGoalSubmit = async () => {
  if (!goalForm.value.name.trim()) {
    notify.error('Please enter a goal name')
    return
  }
  if (!goalForm.value.target_amount || goalForm.value.target_amount <= 0) {
    notify.error('Please enter a valid target amount')
    return
  }

  savingGoal.value = true
  try {
    if (isEditing.value && editingId.value) {
      await financeApi.updateInvestmentGoal(editingId.value, goalForm.value)
      notify.success('Goal updated')
    } else {
      await financeApi.createInvestmentGoal(goalForm.value)
      notify.success('Goal created')
    }
    showModal.value = false
    fetchGoals()
  } catch (e) {
    notify.error('Failed to save goal')
  } finally {
    savingGoal.value = false
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
    notify.success('Goal deleted')
    showDeleteModal.value = false
    goalToDelete.value = null
    fetchGoals()
  } catch (e) {
    notify.error('Failed to delete goal')
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
  fetchPortfolio() // Refresh holdings when opening modal
}

const handleAssetSubmit = async () => {
  if (!selectedGoalId.value) return
  savingAsset.value = true
  try {
    const payload = { ...assetForm.value }
    if (!payload.linked_account_id) payload.linked_account_id = null
    if (!payload.holding_id) payload.holding_id = null

    if (payload.type === 'MUTUAL_FUND') {
      if (!payload.holding_id) throw new Error('Please select a fund')
      await financeApi.linkHoldingToGoal(selectedGoalId.value, payload.holding_id)
      notify.success('Mutual Fund linked to goal')
    } else {
      await (financeApi as any).addGoalAsset(selectedGoalId.value, payload)
      notify.success('Asset added to goal')
    }
    showAssetModal.value = false
    fetchGoals()
  } catch (e: any) {
    notify.error(e.message || 'Failed to add asset')
  } finally {
    savingAsset.value = false
  }
}

const removeAsset = async (assetId: string) => {
  try {
    await (financeApi as any).removeGoalAsset(assetId)
    notify.success('Asset removed')
    fetchGoals()
  } catch (e) {
    notify.error('Failed to remove asset')
  }
}

const unlinkHolding = async (goalId: string, holdingId: string) => {
  const isConfirmed = await confirmDialog.prompt(
    'Are you sure you want to remove this mutual fund from the goal?',
    'Remove Fund',
    'Remove',
    'Cancel'
  )
  if (!isConfirmed) return
  try {
    await financeApi.unlinkHoldingFromGoal(goalId, holdingId)
    notify.success('Mutual fund unlinked')
    fetchGoals()
  } catch (e) {
    notify.error('Failed to unlink mutual fund')
  }
}

const accountOptions = computed(() => {
  return accounts.value.map(acc => ({
    label: `${acc.name} (${formatAmount(acc.balance)})`,
    value: acc.id,
    type: acc.type
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
  if (!goals.value.length) {
    return { current: 0, target: 0, progress: 0, dayChange: 0, dayChangePct: 0, remaining: 0 }
  }

  const current = goals.value.reduce((s, g) => s + (Number(g.current_amount) || 0), 0)
  const target = goals.value.reduce((s, g) => s + (Number(g.target_amount) || 0), 0)
  const dayChange = goals.value.reduce((s, g) => s + (Number(g.day_change) || 0), 0)
  const remaining = goals.value.reduce((s, g) => s + (Number(g.remaining_amount) || 0), 0)
  const progress = target > 0 ? (current / target) * 100 : 0
  const dayChangePct = current > 0 ? (dayChange / current) * 100 : 0

  return { current, target, progress, dayChange, dayChangePct, remaining }
})

const assetDistribution = computed(() => {
  let manual = 0
  let bank = 0
  let mutualFunds = 0

  goals.value.forEach(goal => {
    ;(goal.assets || []).forEach((a: any) => {
      if (a.type === 'MANUAL') manual += Number(a.current_value || 0)
      else bank += Number(a.current_value || 0)
    })
    ;(goal.holdings || []).forEach((h: any) => {
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
    <div class="max-w-[1600px] mx-auto space-y-8 pb-16">
      <!-- PAGE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs">
            <Target class="w-5 h-5 text-wf-primary" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary">
                Investment Goals
              </h1>
              <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                {{ goals.length }} Active Goals
              </span>
            </div>
            <p class="text-xs text-wf-text-secondary">
              Personal milestone trackers, asset allocation alignment, and target dates.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 self-start sm:self-auto">
          <WfButton variant="primary" size="md" @click="openAddModal">
            <Plus class="w-4 h-4 mr-1.5" />
            <span>Create Goal</span>
          </WfButton>
        </div>
      </div>

      <!-- HERO SUMMARY RIBBON -->
      <GoalHeroRibbon
        v-if="goals.length > 0"
        :overall-stats="overallStats"
        :asset-distribution="assetDistribution"
      />

      <!-- LOADING SKELETONS -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="i in 3"
          :key="`skel-goal-${i}`"
          class="h-64 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border-subtle animate-pulse p-6 space-y-4"
        >
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-wf-lg bg-wf-surface-variant"></div>
            <div class="space-y-2 flex-grow">
              <div class="h-4 bg-wf-surface-variant rounded w-3/4"></div>
              <div class="h-3 bg-wf-surface-variant rounded w-1/2"></div>
            </div>
          </div>
          <div class="h-4 bg-wf-surface-variant rounded w-full mt-6"></div>
          <div class="h-2 bg-wf-surface-variant rounded-full w-full"></div>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-else-if="goals.length === 0"
        class="flex flex-col items-center justify-center p-12 text-center rounded-wf-xl bg-wf-surface border border-wf-border shadow-2xs max-w-lg mx-auto mt-12 space-y-4"
      >
        <div class="w-16 h-16 rounded-full bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-sm">
          <Target class="w-8 h-8" />
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-wf-text-primary">No Goals Set Yet</h3>
          <p class="text-xs text-wf-text-secondary max-w-sm">
            Define your financial milestones, connect holdings and bank balances, and track progress effortlessly.
          </p>
        </div>
        <WfButton variant="primary" size="md" @click="openAddModal">
          <Plus class="w-4 h-4 mr-1.5" />
          <span>Set Your First Goal</span>
        </WfButton>
      </div>

      <!-- GOALS GRID -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GoalCard
          v-for="goal in goals"
          :key="goal.id"
          :goal="goal"
          @edit="openEditModal"
          @delete="confirmDelete"
          @link-asset="openAssetModal"
          @remove-asset="removeAsset"
          @unlink-holding="unlinkHolding"
        />
      </div>

      <!-- GOAL CREATE / EDIT MODAL -->
      <GoalModal
        v-model="showModal"
        :is-editing="isEditing"
        :goal-form="goalForm"
        :member-options="memberOptions"
        :saving="savingGoal"
        @save="handleGoalSubmit"
      />

      <!-- ASSET LINKING MODAL -->
      <LinkAssetModal
        v-model="showAssetModal"
        :asset-form="assetForm"
        :account-options="accountOptions"
        :portfolio-options="portfolioOptions"
        :saving="savingAsset"
        @save="handleAssetSubmit"
      />

      <!-- DELETE GOAL MODAL -->
      <WfModal
        v-model="showDeleteModal"
        maxWidth="sm"
      >
        <div class="text-center space-y-4 pt-2">
          <div class="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
            <Trash2 class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-wf-text-primary">Delete Financial Goal?</h3>
            <p class="text-xs text-wf-text-muted mt-1 px-4">
              This will permanently remove the goal and all associated linked asset connections.
            </p>
          </div>
          <div class="flex items-center justify-center gap-3 pt-2">
            <WfButton variant="ghost" @click="showDeleteModal = false">
              Cancel
            </WfButton>
            <WfButton variant="danger" @click="deleteGoal">
              Delete Permanently
            </WfButton>
          </div>
        </div>
      </WfModal>
    </div>
  </MainLayout>
</template>
