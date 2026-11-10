<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, TrendingUp, Shield, BarChart2, Star, Target, Globe, Briefcase, RefreshCcw } from 'lucide-vue-next'

import MainLayout from '@/layouts/MainLayout.vue'
import { useMutualFundStore } from '@/stores/finance/mutualFunds'
import { useNotificationStore } from '@/stores/notification'
import FundPerformanceChart from './mutual-funds/components/FundPerformanceChart.vue'
import InvestModal from './mutual-funds/modals/InvestModal.vue'
import WfCard from '@/components/ui/WfCard.vue'

const route = useRoute()
const router = useRouter()
const notify = useNotificationStore()
const mfStore = useMutualFundStore()

const schemeCode = route.params.id as string
const fund = ref<any>(null)
const isLoading = ref(true)
const isChartLoading = ref(true)
const isRecalculating = ref(false)

// Modal
const showInvestModal = ref(false)

async function fetchFundInfo() {
    isLoading.value = true
    try {
        fund.value = await mfStore.getExploreFundInfo(schemeCode)
    } catch (e) {
        console.error("Failed to fetch fund info:", e)
        notify.error("Failed to load fund details")
        router.back()
    } finally {
        isLoading.value = false
        isChartLoading.value = false
    }
}

async function recalculateTrends() {
    isRecalculating.value = true
    try {
        notify.info("Synchronizing NAV history from architecture...")
        await mfStore.recalculateFundTrends(schemeCode)
        await fetchFundInfo()
        notify.success("NAV trends updated successfully.")
    } catch (e) {
        console.error("Recalculate failed:", e)
        notify.error("Architecture sync failed. Repository may be unreachable.")
    } finally {
        isRecalculating.value = false
    }
}

onMounted(() => {
    fetchFundInfo()
})

const chartData = computed(() => {
    return (fund.value?.nav_history || []).map((point: any) => ({
        date: point.date,
        value: point.value,
        invested: null
    }))
})

function getRiskBadgeClass(risk: string) {
    switch (risk?.toLowerCase()) {
        case 'low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
        case 'moderate': return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
        case 'high': return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
        case 'very high': return 'text-rose-500 bg-rose-500/10 border-rose-500/20'
        default: return 'text-wf-primary bg-wf-primary/10 border-wf-primary/20'
    }
}
</script>

<template>
    <MainLayout>
        <div class="space-y-4 pb-8">
            <!-- Loading State -->
            <div v-if="isLoading && !fund" class="flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <div class="w-9 h-9 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
                <span class="text-xs font-semibold text-wf-text-muted">Loading fund details...</span>
            </div>

            <template v-else-if="fund">
                <!-- Header Card -->
                <WfCard padding="md" radius="lg" class="border-wf-border shadow-wf-card">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                @click="router.back()"
                                class="h-9 w-9 rounded-wf-lg border border-wf-border bg-wf-surface-variant hover:bg-wf-surface-variant/80 flex items-center justify-center text-wf-text-muted hover:text-wf-text-primary transition-colors flex-shrink-0"
                                title="Go Back"
                            >
                                <ChevronLeft :size="20" />
                            </button>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2.5 flex-wrap">
                                    <h1 class="text-base sm:text-lg font-bold text-wf-text-primary truncate">
                                        {{ fund.scheme_name }}
                                    </h1>
                                    <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-wf-pill bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                        {{ fund.category || 'Mutual Fund' }}
                                    </span>
                                </div>
                                <div class="flex items-center gap-3.5 mt-1.5 flex-wrap text-xs text-wf-text-muted">
                                    <div v-if="fund.fund_house" class="flex items-center gap-1 font-medium">
                                        <Briefcase :size="13" class="opacity-70" />
                                        <span>{{ fund.fund_house }}</span>
                                    </div>
                                    <div class="flex items-center gap-1 font-mono text-xs">
                                        <Globe :size="13" class="opacity-70 text-wf-primary" />
                                        <span>Code: {{ fund.scheme_code }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                            <button
                                type="button"
                                @click="showInvestModal = true"
                                class="h-9 px-4 text-xs font-bold rounded-wf-md bg-wf-primary text-white shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                                <Target :size="14" />
                                <span>Invest Now</span>
                            </button>
                        </div>
                    </div>
                </WfCard>

                <!-- Main Content Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <!-- Left: Performance Chart (8 cols) -->
                    <div class="lg:col-span-8 space-y-4">
                        <WfCard padding="md" radius="xl" class="border-wf-border shadow-wf-card">
                            <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
                                <div class="flex items-center gap-2.5">
                                    <span class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary flex items-center gap-1.5">
                                        <TrendingUp :size="16" class="text-wf-primary" />
                                        <span>NAV Historical Performance (1Y)</span>
                                    </span>
                                    <button
                                        type="button"
                                        @click="recalculateTrends"
                                        :disabled="isRecalculating"
                                        class="h-6 px-2 text-[10px] font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant hover:bg-wf-surface-variant/80 disabled:opacity-50 flex items-center gap-1 text-wf-text-secondary transition-colors"
                                    >
                                        <RefreshCcw :size="11" :class="{ 'animate-spin': isRecalculating }" />
                                        <span>{{ isRecalculating ? 'SYNCING...' : 'SYNC TRENDS' }}</span>
                                    </button>
                                </div>
                                <div class="flex items-center gap-2 font-mono">
                                    <span v-if="fund.last_nav > 0" class="text-base font-bold text-wf-primary">
                                        ₹{{ fund.last_nav.toFixed(2) }}
                                    </span>
                                    <span v-else class="px-2 py-0.5 text-[10px] font-bold rounded-wf-sm bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        PENDING SYNC
                                    </span>
                                    <span class="text-[10px] font-bold text-wf-text-muted uppercase">Latest NAV</span>
                                </div>
                            </div>

                            <!-- Chart Canvas -->
                            <div class="h-[340px] sm:h-[380px] w-full">
                                <div v-if="isChartLoading" class="flex flex-col items-center justify-center h-full gap-2">
                                    <div class="w-8 h-8 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
                                    <span class="text-xs font-medium text-wf-text-muted">Calculating NAV Performance...</span>
                                </div>
                                <template v-else>
                                    <FundPerformanceChart
                                        v-if="chartData.length"
                                        :data="chartData"
                                        :markers="[]"
                                        :benchmarks="[]"
                                    />
                                    <div v-else class="flex items-center justify-center h-full text-xs font-medium text-wf-text-muted">
                                        No historical NAV data available for this scheme
                                    </div>
                                </template>
                            </div>
                        </WfCard>
                    </div>

                    <!-- Right: Overview & CTA (4 cols) -->
                    <div class="lg:col-span-4 space-y-4">
                        <!-- Key Metrics Tile Box -->
                        <WfCard padding="md" radius="xl" class="border-wf-border shadow-wf-card space-y-3">
                            <h3 class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary">
                                Fund Overview
                            </h3>

                            <div class="grid grid-cols-2 gap-2.5">
                                <!-- Risk Profile -->
                                <div class="p-3 rounded-wf-lg border border-wf-border bg-wf-surface-variant/40">
                                    <div class="flex items-center gap-1.5 mb-1 text-wf-text-muted">
                                        <Shield :size="13" />
                                        <span class="text-[10px] font-bold uppercase tracking-wider">Risk Profile</span>
                                    </div>
                                    <span class="inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-wf-sm border" :class="getRiskBadgeClass(fund.risk_level)">
                                        {{ fund.risk_level || 'N/A' }}
                                    </span>
                                </div>

                                <!-- AUM -->
                                <div class="p-3 rounded-wf-lg border border-wf-border bg-wf-surface-variant/40">
                                    <div class="flex items-center gap-1.5 mb-1 text-wf-text-muted">
                                        <BarChart2 :size="13" class="text-wf-primary" />
                                        <span class="text-[10px] font-bold uppercase tracking-wider">Fund Size</span>
                                    </div>
                                    <div class="text-xs font-bold text-wf-text-primary font-mono">
                                        {{ fund.aum || 'N/A' }}
                                    </div>
                                </div>

                                <!-- 3Y Returns -->
                                <div class="p-3 rounded-wf-lg border border-wf-border bg-wf-surface-variant/40">
                                    <div class="flex items-center gap-1.5 mb-1 text-wf-text-muted">
                                        <TrendingUp :size="13" class="text-emerald-500" />
                                        <span class="text-[10px] font-bold uppercase tracking-wider">3Y Returns</span>
                                    </div>
                                    <div class="text-xs font-bold font-mono" :class="fund.returns_3y > 0 ? 'text-emerald-500' : 'text-wf-text-primary'">
                                        {{ fund.returns_3y > 0 ? '+' : '' }}{{ fund.returns_3y ? fund.returns_3y + '%' : 'N/A' }}
                                    </div>
                                </div>

                                <!-- Rating -->
                                <div class="p-3 rounded-wf-lg border border-wf-border bg-wf-surface-variant/40">
                                    <div class="flex items-center gap-1.5 mb-1 text-wf-text-muted">
                                        <Star :size="13" class="text-amber-500" />
                                        <span class="text-[10px] font-bold uppercase tracking-wider">Rating</span>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-xs font-bold text-wf-text-primary font-mono">{{ fund.rating || 0 }}</span>
                                        <div class="flex items-center gap-0.5">
                                            <Star
                                                v-for="i in 5"
                                                :key="i"
                                                :size="10"
                                                :class="i <= (fund.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-wf-text-muted opacity-25'"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </WfCard>

                        <!-- CTA Box -->
                        <WfCard padding="md" radius="xl" class="border-wf-primary/25 bg-wf-primary/5 shadow-wf-card space-y-3">
                            <div class="flex items-start gap-3">
                                <div class="w-9 h-9 rounded-wf-lg bg-wf-primary/10 text-wf-primary flex items-center justify-center flex-shrink-0">
                                    <Target :size="18" />
                                </div>
                                <div>
                                    <div class="text-xs font-bold text-wf-text-primary">Ready to invest?</div>
                                    <div class="text-xs text-wf-text-muted">Deploy capital directly into this fund via lumpsum or SIP.</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                @click="showInvestModal = true"
                                class="w-full h-9 px-4 text-xs font-bold rounded-wf-md bg-wf-primary text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
                            >
                                Start Investing
                            </button>
                        </WfCard>
                    </div>
                </div>
            </template>
        </div>

        <!-- Invest Modal -->
        <InvestModal v-model="showInvestModal" :fund="fund" @success="router.push('/mutual-funds')" />
    </MainLayout>
</template>
