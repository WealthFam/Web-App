<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useMutualFundStore } from '@/stores/finance/mutualFunds'
import MainLayout from '@/layouts/MainLayout.vue'
import { FileText, Search, Upload, Sliders, TrendingUp } from 'lucide-vue-next'
import PortfolioTab from './mutual-funds/PortfolioTab.vue'
import SearchTab from './mutual-funds/SearchTab.vue'
import ImportTab from './mutual-funds/ImportTab.vue'
import BenchmarksTab from './mutual-funds/BenchmarksTab.vue'

// State
const mfStore = useMutualFundStore()
const { activeTab } = storeToRefs(mfStore)
</script>

<template>
    <MainLayout>
        <div class="max-w-[1600px] mx-auto space-y-4 pb-8">
            <!-- Header: Title & Segmented Tab Switcher -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
                        <TrendingUp class="w-4 h-4 text-wf-primary" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-base sm:text-lg font-bold tracking-tight text-wf-text-primary leading-tight">
                                Mutual Funds
                            </h1>
                            <span class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                Portfolio Intelligence
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary">
                            Track portfolio holdings, performance timelines, and benchmark analysis.
                        </p>
                    </div>
                </div>

                <!-- Segmented Control Switcher -->
                <div class="flex items-center p-0.5 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md shadow-2xs self-start sm:self-auto overflow-x-auto">
                    <button
                        type="button"
                        @click="activeTab = 'portfolio'"
                        class="px-3 py-1 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 shrink-0"
                        :class="[
                            activeTab === 'portfolio'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <FileText class="w-3.5 h-3.5" />
                        <span>Portfolio</span>
                    </button>

                    <button
                        type="button"
                        @click="activeTab = 'search'"
                        class="px-3 py-1 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 shrink-0"
                        :class="[
                            activeTab === 'search'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <Search class="w-3.5 h-3.5" />
                        <span>Search & Add</span>
                    </button>

                    <button
                        type="button"
                        @click="activeTab = 'import'"
                        class="px-3 py-1 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 shrink-0"
                        :class="[
                            activeTab === 'import'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <Upload class="w-3.5 h-3.5" />
                        <span>Import CAS</span>
                    </button>

                    <button
                        type="button"
                        @click="activeTab = 'benchmarks'"
                        class="px-3 py-1 rounded-wf-sm text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 shrink-0"
                        :class="[
                            activeTab === 'benchmarks'
                                ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                : 'text-wf-text-secondary hover:text-wf-text-primary'
                        ]"
                    >
                        <Sliders class="w-3.5 h-3.5" />
                        <span>Benchmarks</span>
                    </button>
                </div>
            </div>

            <!-- Tab Content -->
            <transition name="fade" mode="out-in">
                <PortfolioTab v-if="activeTab === 'portfolio'" :active="activeTab === 'portfolio'" />
                <SearchTab v-else-if="activeTab === 'search'" />
                <ImportTab v-else-if="activeTab === 'import'" @success="activeTab = 'portfolio'" />
                <BenchmarksTab v-else-if="activeTab === 'benchmarks'" />
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
