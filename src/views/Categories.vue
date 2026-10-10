<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Tag, Sparkles } from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import CategoriesTab from '@/views/categories/CategoriesTab.vue'
import RulesTab from '@/views/categories/RulesTab.vue'
import { useCategoriesStore } from '@/stores/finance/categories'

const activeTab = ref<'categories' | 'rules'>('categories')
const categoriesStore = useCategoriesStore()

onMounted(() => {
    categoriesStore.fetchCategories()
})
</script>

<template>
    <MainLayout>
        <div class="max-w-[1600px] mx-auto space-y-5 pb-8">
            <!-- HEADER: Title & Segmented Tab Switcher -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-wf-lg bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs">
                        <Tag class="w-5 h-5 text-wf-primary" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-wf-text-primary">
                                Categories & Classification Rules
                            </h1>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                {{ categoriesStore.categoryStats.total }} Items
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary">
                            Manage spending taxonomies, parent-child hierarchies, and automated triage rules.
                        </p>
                    </div>
                </div>

                <!-- Segmented Control Switcher -->
                <div class="flex items-center p-1 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md shadow-2xs self-start sm:self-auto">
                    <button
                        type="button"
                        @click="activeTab = 'categories'"
                        class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
                        :class="[
                            activeTab === 'categories'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <Tag class="w-3.5 h-3.5" />
                        <span>Categories</span>
                    </button>

                    <button
                        type="button"
                        @click="activeTab = 'rules'"
                        class="px-3.5 py-1.5 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5"
                        :class="[
                            activeTab === 'rules'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <Sparkles class="w-3.5 h-3.5" />
                        <span>Rules & Triage</span>
                    </button>
                </div>
            </div>

            <!-- TAB CONTENT -->
            <transition name="fade" mode="out-in">
                <CategoriesTab v-if="activeTab === 'categories'" />
                <RulesTab v-else />
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
