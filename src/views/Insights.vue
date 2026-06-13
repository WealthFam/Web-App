<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useFinanceStore } from '@/stores/finance'
import { useAuthStore } from '@/stores/auth'
import AnalyticsTab from '@/views/insights/AnalyticsTab.vue'
import RecurringTab from '@/views/insights/RecurringTab.vue'
import FamilyWealthTab from '@/views/insights/FamilyWealthTab.vue'
import { BarChart3, RefreshCw, Users } from 'lucide-vue-next'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

const store = useFinanceStore()
const authStore = useAuthStore()
const route = useRoute()

// We map numeric values from the original to string values for shadcn Tabs
const activeTab = ref('analytics')
const selectedAccount = ref('')

// Mapping for backward compatibility with route queries
const tabMap: Record<number, string> = {
    0: 'analytics',
    1: 'recurring',
    2: 'family'
}


onMounted(() => {
    store.fetchAll(authStore.selectedMemberId || undefined)

    if (route.query.tab) {
        const tabIdx = parseInt(route.query.tab as string)
        if (!isNaN(tabIdx) && tabMap[tabIdx]) activeTab.value = tabMap[tabIdx]
    }
})

watch(() => authStore.selectedMemberId, () => {
    selectedAccount.value = ''
    store.fetchAll(authStore.selectedMemberId || undefined)
})

watch(() => route.query.tab, (newTab) => {
    if (newTab !== undefined) {
        const tabIdx = parseInt(newTab as string)
        if (!isNaN(tabIdx) && tabMap[tabIdx]) activeTab.value = tabMap[tabIdx]
    }
})
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6 relative overflow-hidden">
      <!-- Animated Mesh Background -->
      <div class="absolute w-[600px] h-[600px] bg-primary/10 rounded-full blur-[80px] -top-[200px] -right-[100px] opacity-15 animate-pulse -z-10 pointer-events-none"></div>
      <div class="absolute w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[80px] -bottom-[100px] -left-[100px] opacity-15 animate-pulse -z-10 pointer-events-none" style="animation-delay: -5s"></div>

      <Tabs v-model="activeTab" class="w-full">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-3xl font-bold tracking-tight mb-1">Insights</h1>
            <p class="text-muted-foreground font-medium flex items-center gap-3">
              Strategy and forecasting
              <Badge v-if="authStore.selectedMemberId" variant="default" class="text-[10px] tracking-widest px-2 h-5">
                MEMBER FILTER ACTIVE
              </Badge>
            </p>
          </div>

          <div class="overflow-x-auto pb-2 md:pb-0">
            <TabsList class="h-11">
              <TabsTrigger value="analytics" class="flex items-center gap-2 px-4">
                <BarChart3 class="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="recurring" class="flex items-center gap-2 px-4">
                <RefreshCw class="h-4 w-4" />
                <span>Recurring</span>
              </TabsTrigger>
              <TabsTrigger value="family" class="flex items-center gap-2 px-4">
                <Users class="h-4 w-4" />
                <span>Family Wealth</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <!-- Content -->
        <div class="mt-6">
          <TabsContent value="analytics" class="m-0 border-none p-0 outline-none">
            <AnalyticsTab :selected-account="selectedAccount" />
          </TabsContent>
          <TabsContent value="recurring" class="m-0 border-none p-0 outline-none">
            <RecurringTab />
          </TabsContent>
          <TabsContent value="family" class="m-0 border-none p-0 outline-none">
            <FamilyWealthTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  </MainLayout>
</template>
