<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { useRoute } from 'vue-router'
import { financeApi } from '@/api/client'

import ImportModal from '@/components/ImportModal.vue'
import SmartPromptModal from '@/components/SmartPromptModal.vue'

import SpendingHeatmap from '@/components/SpendingHeatmap.vue'
import TransactionList from './transactions/TransactionList.vue'
import TransactionTriage from './transactions/TransactionTriage.vue'
import TransactionModal from './transactions/TransactionModal.vue'
import VendorInsightsModal from '@/components/transactions/VendorInsightsModal.vue'
import {
    LayoutList,
    Inbox,
    Map as MapIcon,
    Activity,
    Target,
    Trash2
} from 'lucide-vue-next'
import SpendingForecastChart from '@/components/SpendingForecastChart.vue'

// Composables
import { useTransactionState } from '@/composables/useTransactionState'
import { useTriageState } from '@/composables/useTriageState'
import { useTransactionModals } from '@/composables/useTransactionModals'
import { useAuthStore } from '@/stores/auth'
import { useFinanceStore } from '@/stores/finance'
import { useBudgetStore } from '@/stores/finance/budgets'
import { useExpenseGroupStore } from '@/stores/expenseGroups'

// shadcn-vue Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

// Global State
const route = useRoute()
const financeStore = useFinanceStore()
const budgetStore = useBudgetStore()
const groupStore = useExpenseGroupStore()

// Master Data
const accounts = computed(() => financeStore.accounts)
const categories = computed(() => financeStore.categories)
const budgets = computed(() => budgetStore.budgets)
const expenseGroups = computed(() => groupStore.groups)

// UI State
const showImportModal = ref(false)
const activeTab = ref<'list' | 'analytics' | 'pending' | 'training' | 'heatmap'>('list')
const activeTriageSubTab = ref<'pending' | 'training'>('pending')

// Smart Categorization Modal
const showSmartPrompt = ref(false)
const smartPromptData = ref({
    txnId: '',
    category: '',
    pattern: '',
    count: 0,
    createRule: true,
    applyToSimilar: true,
    excludeFromReports: false
})

const showVendorModal = ref(false)
const selectedVendorForInsights = ref('')

function openVendorInsights(name: string) {
    selectedVendorForInsights.value = name
    showVendorModal.value = true
}

// Initialize Transaction State
const {
    transactions,
    loading,
    forecastData,
    total,
    metrics,
    selectedAccount,
    searchQuery,
    categoryFilter,
    startDate,
    endDate,
    selectedTimeRange,
    page,
    pageSize,
    txnSortKey,
    txnSortOrder,
    selectedIds,
    showDeleteConfirm,
    fetchData,
    fetchModalData,
    handleTimeRangeChange,
    toggleTxnSort,
    refreshAccounts,
    confirmDelete
} = useTransactionState(route, accounts)

// Chart Responsiveness
const chartContainer = ref<HTMLElement | null>(null)
const chartWidth = ref(1200)

watch(chartContainer, (el) => {
    if (el) {
        chartWidth.value = el.clientWidth
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                chartWidth.value = entries[0].contentRect.width
            }
        })
        observer.observe(el)
    }
})

const {
    triageTransactions,
    triagePagination,
    triageSearchQuery,
    triageSourceFilter,
    triageSortKey,
    triageSortOrder,
    selectedTriageIds,
    unparsedMessages,
    trainingPagination,
    trainingSearchQuery,
    trainingSortKey,
    trainingSortOrder,
    trainingSenderFilter,
    trainingSubjectFilter,
    selectedTrainingIds,
    fetchTriage,
    approveTriage,
    rejectTriage,
    handleBulkRejectTriage,
    startLabeling,
    dismissTraining,
    handleBulkDismissTraining,
    showLabelForm,
    labelForm,
    handleLabelSubmit,
    selectedMessage,
    spamFilters,
    showSpamManager,
    markAsSpam,
    fetchSpamFilters,
    removeSpamFilter,
    findSimilar,
    showDiscardConfirm,
    showTrainingDiscardConfirm,
    createIgnoreRule,
    triageIdToDiscard,
    trainingIdToDiscard,
    confirmDiscard,
    confirmTrainingDiscard,
    handleConfirmGlobalTrainingDismiss
} = useTriageState(accounts, categories, showSmartPrompt, smartPromptData, fetchData)

const {
    showModal,
    isEditing,
    potentialMatches,
    isSearchingMatches,
    matchesSearched,
    form,
    openEditModal,
    handleSubmit,
    handleSmartCategorize,
    findMatches
} = useTransactionModals(selectedAccount, accounts, budgets, transactions, fetchData, showSmartPrompt, smartPromptData, refreshAccounts)

// Search debounce
let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
    if (searchDebounce) clearTimeout(searchDebounce)
    searchDebounce = setTimeout(() => {
        page.value = 1
        fetchData()
    }, 400)
})

const auth = useAuthStore()
watch(() => auth.selectedMemberId, () => {
    page.value = 1
    fetchData()
    fetchTriage()
})

async function checkDeepLink() {
    const txnId = route.query.id as string
    if (txnId) {
        try {
            const res = await financeApi.getTransaction(txnId)
            if (res.data) {
                await fetchModalData()
                openEditModal(res.data)
            }
        } catch (e) {
            console.error('Failed to load deep-linked transaction', e)
        }
    }
}

watch(() => route.query.id, () => {
    checkDeepLink()
})

onMounted(() => {
    fetchData()
    fetchTriage()
    checkDeepLink()
})
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6 relative overflow-hidden">
      <!-- Animated Mesh Background -->
      <div class="absolute w-[600px] h-[600px] bg-primary/10 rounded-full blur-[80px] -top-[200px] -right-[100px] opacity-15 animate-pulse -z-10 pointer-events-none"></div>
      <div class="absolute w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[80px] -bottom-[100px] -left-[100px] opacity-15 animate-pulse -z-10 pointer-events-none" style="animation-delay: -5s"></div>

      <Tabs v-model="activeTab" class="w-full">
        <!-- Header & Tabs -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Transactions</h1>
            <p class="text-muted-foreground mt-1">Track and manage your family's spending</p>
          </div>
          
          <div class="overflow-x-auto pb-2 md:pb-0">
            <TabsList class="h-11">
              <TabsTrigger value="list" class="flex items-center gap-2 px-4" @click="fetchData">
                <LayoutList class="h-4 w-4" />
                <span>List</span>
              </TabsTrigger>
              <TabsTrigger value="pending" class="flex items-center gap-2 px-4" @click="fetchTriage">
                <Inbox class="h-4 w-4" />
                <span>Inbox</span>
                <Badge v-if="triagePagination.total > 0" variant="secondary" class="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                  {{ triagePagination.total }}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="training" class="flex items-center gap-2 px-4" @click="fetchTriage">
                <Target class="h-4 w-4" />
                <span>Training</span>
                <Badge v-if="trainingPagination.total > 0" variant="secondary" class="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                  {{ trainingPagination.total }}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="heatmap" class="flex items-center gap-2 px-4">
                <MapIcon class="h-4 w-4" />
                <span>Heatmap</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <!-- Tab Contents -->
        <TabsContent value="list" class="space-y-6">
          <!-- QUICK CHART ROW -->
          <Card v-if="forecastData && forecastData.trend.length > 0" class="overflow-hidden border shadow-sm">
            <CardHeader class="pb-0 pt-5 px-5">
              <div class="flex items-center justify-between">
                <CardTitle class="text-base font-bold flex items-center gap-2">
                  <Activity class="h-5 w-5 text-primary" />
                  Spending Velocity & Forecast
                </CardTitle>
                <div class="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
                  AVG ₹{{ Math.round(metrics.avg_daily_spending || 0) }}/DAY
                </div>
              </div>
            </CardHeader>
            <CardContent class="p-0">
              <div ref="chartContainer" class="py-6 px-4" style="height: 180px; width: 100%;">
                <SpendingForecastChart :trend="forecastData.trend" :user-names="forecastData.user_names" :height="120" :width="chartWidth" />
              </div>
            </CardContent>
          </Card>

          <TransactionList 
            v-bind="{
              transactions, accounts, categories, expenseGroups,
              loading, total, selectedAccount, categoryFilter,
              searchQuery, startDate, endDate, selectedTimeRange,
              page, pageSize, txnSortKey, txnSortOrder, metrics,
              dailyTrend: forecastData?.trend
            }" 
            v-model:selectedIds="selectedIds"
            @update:selectedAccount="selectedAccount = $event; page = 1; fetchData()"
            @update:categoryFilter="categoryFilter = $event; page = 1; fetchData()"
            @update:searchQuery="searchQuery = $event"
            @update:startDate="startDate = $event; page = 1; fetchData()"
            @update:endDate="endDate = $event; page = 1; fetchData()"
            @update:selectedTimeRange="selectedTimeRange = $event; handleTimeRangeChange($event)"
            @update:page="page = $event; fetchData()"
            @update:pageSize="pageSize = $event; page = 1; fetchData()" 
            @sortChange="toggleTxnSort"
            @editTxn="(t) => { fetchModalData(); openEditModal(t) }"
            @deleteSelected="showDeleteConfirm = true" 
            @importCsv="showImportModal = true"
            @fetchData="fetchData" 
            @showVendorInsights="openVendorInsights"
            @resetFilters="selectedTimeRange = 'all'; startDate = ''; endDate = ''; searchQuery = ''; categoryFilter = ''; fetchData()" 
          />
        </TabsContent>

        <TabsContent value="pending" class="space-y-6">
          <TransactionTriage 
            v-bind="{
              activeSubTab: 'pending', accounts, categories,
              triageTransactions, triagePagination, triageSearchQuery,
              triageSourceFilter, triageSortKey, triageSortOrder,
              unparsedMessages, trainingPagination, trainingSearchQuery,
              trainingSortKey, trainingSortOrder,
              showDiscardConfirm, showTrainingDiscardConfirm, createIgnoreRule,
              triageIdToDiscard, trainingIdToDiscard,
              showLabelForm, selectedMessage, labelForm,
              trainingSenderFilter, trainingSubjectFilter,
              spamFilters, showSpamManager
            }" 
            v-model:selectedTriageIds="selectedTriageIds"
            v-model:selectedTrainingIds="selectedTrainingIds"
            @update:activeSubTab="activeTriageSubTab = $event"
            @update:triageSearchQuery="triageSearchQuery = $event"
            @update:triageSourceFilter="triageSourceFilter = $event as any"
            @update:triageSortKey="triageSortKey = $event"
            @update:triageSortOrder="triageSortOrder = $event"
            @update:triagePagination="triagePagination = $event; fetchTriage()"
            @update:trainingSearchQuery="trainingSearchQuery = $event"
            @update:trainingSortKey="trainingSortKey = $event"
            @update:trainingSortOrder="trainingSortOrder = $event"
            @update:trainingPagination="trainingPagination = $event; fetchTriage()"
            @update:showDiscardConfirm="showDiscardConfirm = $event"
            @update:showTrainingDiscardConfirm="showTrainingDiscardConfirm = $event"
            @update:createIgnoreRule="createIgnoreRule = $event" 
            @approveTriage="approveTriage"
            @rejectTriage="rejectTriage" 
            @bulkRejectTriage="handleBulkRejectTriage"
            @startLabeling="startLabeling" 
            @dismissTraining="dismissTraining"
            @bulkDismissTraining="handleBulkDismissTraining" 
            @confirmDiscard="confirmDiscard"
            @confirmTrainingDiscard="confirmTrainingDiscard"
            @confirmBulkDiscard="handleBulkRejectTriage"
            @confirmBulkTrainingDiscard="handleConfirmGlobalTrainingDismiss"
            @refreshTriage="() => { fetchTriage(); fetchData(); }"
            @update:showLabelForm="showLabelForm = $event" 
            @handleLabelSubmit="handleLabelSubmit"
            @update:trainingSenderFilter="trainingSenderFilter = $event"
            @update:trainingSubjectFilter="trainingSubjectFilter = $event"
            @update:showSpamManager="showSpamManager = $event"
            @markAsSpam="markAsSpam" 
            @findSimilar="findSimilar"
            @removeSpamFilter="removeSpamFilter" 
            @fetchSpamFilters="fetchSpamFilters" 
          />
        </TabsContent>

        <TabsContent value="training" class="space-y-6">
          <TransactionTriage 
            v-bind="{
              activeSubTab: 'training', accounts, categories,
              triageTransactions, triagePagination, triageSearchQuery,
              triageSourceFilter, triageSortKey, triageSortOrder,
              unparsedMessages, trainingPagination, trainingSearchQuery,
              trainingSortKey, trainingSortOrder,
              showDiscardConfirm, showTrainingDiscardConfirm, createIgnoreRule,
              triageIdToDiscard, trainingIdToDiscard,
              showLabelForm, selectedMessage, labelForm,
              trainingSenderFilter, trainingSubjectFilter,
              spamFilters, showSpamManager
            }" 
            v-model:selectedTriageIds="selectedTriageIds"
            v-model:selectedTrainingIds="selectedTrainingIds"
            @update:activeSubTab="activeTriageSubTab = $event"
            @update:triageSearchQuery="triageSearchQuery = $event"
            @update:triageSourceFilter="triageSourceFilter = $event as any"
            @update:triageSortKey="triageSortKey = $event"
            @update:triageSortOrder="triageSortOrder = $event"
            @update:triagePagination="triagePagination = $event; fetchTriage()"
            @update:trainingSearchQuery="trainingSearchQuery = $event"
            @update:trainingSortKey="trainingSortKey = $event"
            @update:trainingSortOrder="trainingSortOrder = $event"
            @update:trainingPagination="trainingPagination = $event; fetchTriage()"
            @update:showDiscardConfirm="showDiscardConfirm = $event"
            @update:showTrainingDiscardConfirm="showTrainingDiscardConfirm = $event"
            @update:createIgnoreRule="createIgnoreRule = $event" 
            @approveTriage="approveTriage"
            @rejectTriage="rejectTriage" 
            @bulkRejectTriage="handleBulkRejectTriage"
            @startLabeling="startLabeling" 
            @dismissTraining="dismissTraining"
            @bulkDismissTraining="handleBulkDismissTraining" 
            @confirmDiscard="confirmDiscard"
            @confirmTrainingDiscard="confirmTrainingDiscard"
            @confirmBulkDiscard="handleBulkRejectTriage"
            @confirmBulkTrainingDiscard="handleConfirmGlobalTrainingDismiss"
            @refreshTriage="() => { fetchTriage(); fetchData(); }"
            @update:showLabelForm="showLabelForm = $event" 
            @handleLabelSubmit="handleLabelSubmit"
            @update:trainingSenderFilter="trainingSenderFilter = $event"
            @update:trainingSubjectFilter="trainingSubjectFilter = $event"
            @update:showSpamManager="showSpamManager = $event"
            @markAsSpam="markAsSpam" 
            @findSimilar="findSimilar"
            @removeSpamFilter="removeSpamFilter" 
            @fetchSpamFilters="fetchSpamFilters" 
          />
        </TabsContent>

        <TabsContent value="heatmap" class="space-y-6">
          <Card class="border shadow-sm">
            <CardContent class="p-6">
              <SpendingHeatmap :start-date="startDate" :end-date="endDate" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    <!-- Modals -->
    <ImportModal :isOpen="showImportModal" @close="showImportModal = false" @import-success="fetchData" />
    <SmartPromptModal :isOpen="showSmartPrompt" :data="smartPromptData" @close="showSmartPrompt = false" @confirm="handleSmartCategorize" />
    <TransactionModal 
        :isOpen="showModal" 
        :isEditing="isEditing" 
        :form="form" 
        :accounts="accounts"
        :categories="categories" 
        :budgets="budgets" 
        :expenseGroups="expenseGroups"
        :potentialMatches="potentialMatches" 
        :isSearchingMatches="isSearchingMatches"
        :matchesSearched="matchesSearched" 
        @close="showModal = false" 
        @submit="handleSubmit"
        @findMatches="findMatches" 
    />
    <VendorInsightsModal v-model="showVendorModal" :vendor-name="selectedVendorForInsights" />

    <!-- Delete Confirmation Dialog -->
    <Dialog :open="showDeleteConfirm" @update:open="(val) => { if (!val) showDeleteConfirm = false }">
      <DialogContent class="sm:max-w-md text-center">
        <DialogHeader>
          <div class="text-4xl mb-4 text-center">🗑️</div>
          <DialogTitle class="text-center text-xl">Delete Transactions?</DialogTitle>
          <DialogDescription class="text-center text-sm pt-2">
            Are you sure you want to delete <span class="font-bold text-primary">{{ selectedIds.size }}</span> selected transactions? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="sm:justify-center gap-2 mt-4 flex w-full">
          <Button variant="ghost" @click="showDeleteConfirm = false" :disabled="loading">
            Cancel
          </Button>
          <Button variant="destructive" @click="async () => { await confirmDelete(); fetchData() }" :disabled="loading" class="gap-2">
            <Trash2 class="h-4 w-4" />
            Delete Forever
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </MainLayout>
</template>
