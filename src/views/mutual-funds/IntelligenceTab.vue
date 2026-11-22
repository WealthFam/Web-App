<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { financeApi } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { RefreshCw, ShieldCheck, Layers, PieChart, Calendar, Award } from 'lucide-vue-next'
import TaxOptimizationCard from './components/TaxOptimizationCard.vue'
import PortfolioOverlapCard from './components/PortfolioOverlapCard.vue'
import SectorHeatmapCard from './components/SectorHeatmapCard.vue'
import SipIntelligenceCard from './components/SipIntelligenceCard.vue'
import PeerComparisonCard from './components/PeerComparisonCard.vue'

const props = defineProps<{
    selectedMemberId?: string | null
}>()

const authStore = useAuthStore()
const isLoading = ref(true)
const activeSubView = ref<'tax' | 'overlap' | 'sector' | 'sip' | 'peer'>('tax')

// Intelligence Data States
const taxData = ref<any>(null)
const overlapData = ref<any>(null)
const sectorData = ref<any>(null)
const sipData = ref<any>(null)
const peerData = ref<any>(null)

const effectiveMemberId = computed(() => {
    if (props.selectedMemberId !== undefined) {
        return props.selectedMemberId || undefined
    }
    return authStore.selectedMemberId || undefined
})

const fetchAllIntelligence = async () => {
    isLoading.value = true
    try {
        const memberId = effectiveMemberId.value
        const [taxRes, overlapRes, sectorRes, sipRes, peerRes] = await Promise.allSettled([
            financeApi.getMFTaxOptimization(memberId),
            financeApi.getMFPortfolioOverlap(memberId),
            financeApi.getMFSectorHeatmap(memberId),
            financeApi.getMFSipIntelligence(memberId),
            financeApi.getMFPeerComparison(memberId)
        ])

        if (taxRes.status === 'fulfilled') taxData.value = taxRes.value.data
        if (overlapRes.status === 'fulfilled') overlapData.value = overlapRes.value.data
        if (sectorRes.status === 'fulfilled') sectorData.value = sectorRes.value.data
        if (sipRes.status === 'fulfilled') sipData.value = sipRes.value.data
        if (peerRes.status === 'fulfilled') peerData.value = peerRes.value.data
    } catch (e) {
        console.error('[IntelligenceTab] Error fetching intelligence suite:', e)
    } finally {
        isLoading.value = false
    }
}

watch([() => props.selectedMemberId, () => authStore.selectedMemberId], () => {
    fetchAllIntelligence()
})

onMounted(() => {
    fetchAllIntelligence()
})
</script>

<template>
    <div class="space-y-4">
        <!-- Dedicated Sub-Navigation Bar (Overview removed; separate focused views) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-wf-surface border border-wf-border rounded-wf-lg shadow-2xs">
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                    type="button"
                    @click="activeSubView = 'tax'"
                    class="px-3 py-1.5 rounded-wf-md text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
                    :class="activeSubView === 'tax' ? 'bg-wf-primary text-white shadow-xs' : 'text-wf-text-secondary hover:text-wf-text-primary bg-wf-surface-variant/50'"
                >
                    <ShieldCheck class="w-3.5 h-3.5" />
                    <span>Tax Optimization</span>
                </button>
                <button
                    type="button"
                    @click="activeSubView = 'overlap'"
                    class="px-3 py-1.5 rounded-wf-md text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
                    :class="activeSubView === 'overlap' ? 'bg-wf-primary text-white shadow-xs' : 'text-wf-text-secondary hover:text-wf-text-primary bg-wf-surface-variant/50'"
                >
                    <Layers class="w-3.5 h-3.5" />
                    <span>Portfolio Overlap</span>
                </button>
                <button
                    type="button"
                    @click="activeSubView = 'sector'"
                    class="px-3 py-1.5 rounded-wf-md text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
                    :class="activeSubView === 'sector' ? 'bg-wf-primary text-white shadow-xs' : 'text-wf-text-secondary hover:text-wf-text-primary bg-wf-surface-variant/50'"
                >
                    <PieChart class="w-3.5 h-3.5" />
                    <span>Sectoral Pareto</span>
                </button>
                <button
                    type="button"
                    @click="activeSubView = 'sip'"
                    class="px-3 py-1.5 rounded-wf-md text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
                    :class="activeSubView === 'sip' ? 'bg-wf-primary text-white shadow-xs' : 'text-wf-text-secondary hover:text-wf-text-primary bg-wf-surface-variant/50'"
                >
                    <Calendar class="w-3.5 h-3.5" />
                    <span>SIP Intelligence</span>
                </button>
                <button
                    type="button"
                    @click="activeSubView = 'peer'"
                    class="px-3 py-1.5 rounded-wf-md text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
                    :class="activeSubView === 'peer' ? 'bg-wf-primary text-white shadow-xs' : 'text-wf-text-secondary hover:text-wf-text-primary bg-wf-surface-variant/50'"
                >
                    <Award class="w-3.5 h-3.5" />
                    <span>Alpha & Peers</span>
                </button>
            </div>

            <button
                type="button"
                @click="fetchAllIntelligence"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-wf-md text-xs font-semibold text-wf-text-secondary hover:text-wf-text-primary border border-wf-border-subtle bg-wf-surface-variant/40 shrink-0 self-end sm:self-auto"
                :disabled="isLoading"
            >
                <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
                <span>Refresh Insights</span>
            </button>
        </div>

        <!-- Content Views (Independent Dedicated Screens) -->
        <div v-if="isLoading" class="p-12 text-center text-xs text-wf-text-secondary space-y-2">
            <RefreshCw class="w-6 h-6 animate-spin mx-auto text-wf-primary" />
            <p>Analyzing Mutual Fund Intelligence engines...</p>
        </div>

        <div v-else class="space-y-4">
            <!-- 1. Infographic Tax Optimization View -->
            <TaxOptimizationCard
                v-if="activeSubView === 'tax'"
                :data="taxData"
                :is-loading="isLoading"
            />

            <!-- 2. Visual Portfolio Overlap & Concentration View -->
            <PortfolioOverlapCard
                v-if="activeSubView === 'overlap'"
                :data="overlapData"
                :is-loading="isLoading"
            />

            <!-- 3. Sectoral Heatmap with Pareto View -->
            <SectorHeatmapCard
                v-if="activeSubView === 'sector'"
                :data="sectorData"
                :is-loading="isLoading"
            />

            <!-- 4. SIP Intelligence & Calendar (Confirmed vs Unconfirmed) View -->
            <SipIntelligenceCard
                v-if="activeSubView === 'sip'"
                :data="sipData"
                :is-loading="isLoading"
                @refresh="fetchAllIntelligence"
            />

            <!-- 5. Peer Benchmarking & Alpha Quadrant Chart View -->
            <PeerComparisonCard
                v-if="activeSubView === 'peer'"
                :data="peerData"
                :is-loading="isLoading"
            />
        </div>
    </div>
</template>
