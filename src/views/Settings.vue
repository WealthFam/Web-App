<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import {
  Settings as SettingsIcon,
  Users,
  Mail,
  Smartphone,
  Activity
} from 'lucide-vue-next'

// Child Components
import FamilySettings from './settings/FamilySettings.vue'
import IngestionsSettings from './settings/IngestionsSettings.vue'
import EmailSettings from './settings/EmailSettings.vue'
import DevicesSettings from './settings/DevicesSettings.vue'

const route = useRoute()
const router = useRouter()
const activeTab = ref<'tenants' | 'ingestions' | 'emails' | 'devices'>('tenants')

const tabs = [
  { id: 'tenants', label: 'Family Circle', icon: Users },
  { id: 'ingestions', label: 'Ingestions', icon: Activity },
  { id: 'emails', label: 'Email Sync', icon: Mail },
  { id: 'devices', label: 'Devices', icon: Smartphone }
]

const validTabs = ['tenants', 'ingestions', 'emails', 'devices']

function normalizeTabParam(rawTab: unknown): 'tenants' | 'ingestions' | 'emails' | 'devices' | null {
  if (typeof rawTab !== 'string') return null
  if (rawTab === 'parser' || rawTab === 'sms') return 'ingestions'
  if (validTabs.includes(rawTab)) return rawTab as any
  return null
}

function selectTab(tabId: any) {
  activeTab.value = tabId
  router.replace({ query: { ...route.query, tab: tabId } })
}

onMounted(() => {
  const mapped = normalizeTabParam(route.query.tab)
  if (mapped) {
    activeTab.value = mapped
  }
})

watch(() => route.query.tab, (newTab) => {
  const mapped = normalizeTabParam(newTab)
  if (mapped) {
    activeTab.value = mapped
  }
})
</script>

<template>
  <MainLayout>
    <div class="space-y-4 pb-8">
      <!-- PAGE HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
            <SettingsIcon class="w-4 h-4 text-wf-primary" />
          </div>
          <div>
            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary leading-tight">
              Settings & Administration
            </h1>
            <p class="text-xs text-wf-text-secondary">
              Manage family circle, SMS & email ingestions, mailboxes, and sync devices.
            </p>
          </div>
        </div>

        <!-- Segmented Tab Switcher -->
        <div class="flex items-center p-0.5 bg-wf-surface-variant/80 border border-wf-border-subtle rounded-wf-md shadow-2xs self-start sm:self-auto overflow-x-auto">
          <button
            v-for="t in tabs"
            :key="t.id"
            type="button"
            @click="selectTab(t.id)"
            class="px-3 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 shrink-0"
            :class="[
              activeTab === t.id
                ? 'bg-wf-surface text-wf-primary font-bold shadow-xs border border-wf-border/60'
                : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface/50'
            ]"
          >
            <component :is="t.icon" class="w-3.5 h-3.5" />
            <span>{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- ACTIVE TAB CONTENT -->
      <transition name="fade" mode="out-in">
        <div :key="activeTab">
          <FamilySettings v-if="activeTab === 'tenants'" />
          <IngestionsSettings v-else-if="activeTab === 'ingestions'" />
          <EmailSettings v-else-if="activeTab === 'emails'" />
          <DevicesSettings v-else-if="activeTab === 'devices'" />
        </div>
      </transition>
    </div>
  </MainLayout>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
