<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import {
    Mail,
    Users,
    Bot,
    Smartphone,
    FileText
} from 'lucide-vue-next'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Child Components
import EmailSettings from './settings/EmailSettings.vue'
import FamilySettings from './settings/FamilySettings.vue'
import AISettings from './settings/AISettings.vue'
import DevicesSettings from './settings/DevicesSettings.vue'
import ParserSettings from './settings/ParserSettings.vue'

const route = useRoute()
const activeTab = ref('tenants')

onMounted(() => {
    if (route.query.tab) {
        activeTab.value = route.query.tab as string
    }
})
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6 relative overflow-hidden">
      <!-- Animated Mesh Background -->
      <div class="absolute w-[600px] h-[600px] bg-primary/10 rounded-full blur-[80px] -top-[200px] -right-[100px] opacity-15 animate-pulse -z-10 pointer-events-none"></div>
      <div class="absolute w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[80px] -bottom-[100px] -left-[100px] opacity-15 animate-pulse -z-10 pointer-events-none" style="animation-delay: -5s"></div>
      <div class="absolute w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] top-[40%] left-[30%] opacity-15 animate-pulse -z-10 pointer-events-none" style="animation-delay: -8s"></div>

      <Tabs v-model="activeTab" class="w-full">
        <!-- Header & Tabs -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
            <p class="text-muted-foreground mt-1">Manage your family configuration and system preferences</p>
          </div>
          
          <div class="overflow-x-auto pb-2 md:pb-0">
            <TabsList class="h-11">
              <TabsTrigger value="tenants" class="flex items-center gap-2 px-4">
                <Users class="h-4 w-4" />
                <span>Family</span>
              </TabsTrigger>
              <TabsTrigger value="emails" class="flex items-center gap-2 px-4">
                <Mail class="h-4 w-4" />
                <span>Emails</span>
              </TabsTrigger>
              <TabsTrigger value="ai" class="flex items-center gap-2 px-4">
                <Bot class="h-4 w-4" />
                <span>AI Integration</span>
              </TabsTrigger>
              <TabsTrigger value="devices" class="flex items-center gap-2 px-4">
                <Smartphone class="h-4 w-4" />
                <span>Devices</span>
              </TabsTrigger>
              <TabsTrigger value="parser" class="flex items-center gap-2 px-4">
                <FileText class="h-4 w-4" />
                <span>Parser Engine</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <!-- Tab Contents -->
        <TabsContent value="tenants" class="space-y-6">
          <FamilySettings />
        </TabsContent>

        <TabsContent value="emails" class="space-y-6">
          <EmailSettings />
        </TabsContent>

        <TabsContent value="ai" class="space-y-6">
          <AISettings />
        </TabsContent>

        <TabsContent value="devices" class="space-y-6">
          <DevicesSettings />
        </TabsContent>

        <TabsContent value="parser" class="space-y-6">
          <ParserSettings />
        </TabsContent>
      </Tabs>
    </div>
  </MainLayout>
</template>
