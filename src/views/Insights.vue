<template>
    <MainLayout>
        <div class="space-y-6">
            <!-- Header: Title left, Segmented Tabs right -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
                <div>
                    <div class="flex items-center gap-2">
                        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary">
                            Insights
                        </h1>
                        <span
                            v-if="authStore.selectedMemberId"
                            class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50"
                        >
                            Member Filter Active
                        </span>
                    </div>
                    <p class="text-xs text-wf-text-secondary mt-0.5">
                        Deep cashflow dynamics, subscriptions intelligence, and family wealth consolidation
                    </p>
                </div>

                <!-- Aether V4 Segmented Tab Switcher -->
                <div class="flex items-center p-1 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md shadow-2xs self-start sm:self-auto">
                    <button
                        type="button"
                        @click="switchTab(0)"
                        class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                        :class="[
                            activeTab === 0
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <BarChart3 :size="15" />
                        <span>Analytics</span>
                    </button>

                    <button
                        type="button"
                        @click="switchTab(1)"
                        class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                        :class="[
                            activeTab === 1
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <RefreshCw :size="15" />
                        <span>Subscriptions</span>
                    </button>

                    <button
                        type="button"
                        @click="switchTab(2)"
                        class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                        :class="[
                            activeTab === 2
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <Users :size="15" />
                        <span>Family Wealth</span>
                    </button>
                </div>
            </div>

            <!-- Tab Panels -->
            <div>
                <!-- ANALYTICS TAB -->
                <div v-show="activeTab === 0">
                    <AnalyticsTab :selected-account="selectedAccount" />
                </div>

                <!-- RECURRING TAB -->
                <div v-show="activeTab === 1">
                    <RecurringTab />
                </div>

                <!-- FAMILY WEALTH TAB -->
                <div v-show="activeTab === 2">
                    <FamilyWealthTab />
                </div>
            </div>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useFinanceStore } from '@/stores/finance'
import { useAuthStore } from '@/stores/auth'
import AnalyticsTab from '@/views/insights/AnalyticsTab.vue'
import RecurringTab from '@/views/insights/RecurringTab.vue'
import FamilyWealthTab from '@/views/insights/FamilyWealthTab.vue'
import { BarChart3, RefreshCw, Users } from 'lucide-vue-next'

const store = useFinanceStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref(0)
const selectedAccount = ref('')

function switchTab(idx: number) {
    activeTab.value = idx
    router.replace({ query: { ...route.query, tab: idx } })
}

onMounted(() => {
    store.fetchAll(authStore.selectedMemberId || undefined)

    if (route.query.tab) {
        const tab = parseInt(route.query.tab as string)
        if (!isNaN(tab)) activeTab.value = tab
    }
})

watch(() => authStore.selectedMemberId, () => {
    selectedAccount.value = ''
    store.fetchAll(authStore.selectedMemberId || undefined)
})

watch(() => route.query.tab, (newTab) => {
    if (newTab !== undefined) {
        const tab = parseInt(newTab as string)
        if (!isNaN(tab)) activeTab.value = tab
    }
})
</script>
