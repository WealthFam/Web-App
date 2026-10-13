<template>
    <div class="space-y-3.5">
        <!-- Clean Aether V4 Discovery Header -->
        <WfCard variant="flat" padding="none" radius="lg"
            class="border border-wf-border bg-wf-surface p-4 sm:p-5 shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="max-w-md">
                    <div class="flex items-center gap-2 mb-1">
                        <Sparkles class="w-4 h-4 text-wf-primary" />
                        <h2 class="text-sm font-bold tracking-tight text-wf-text-primary">Fund Discovery Hub</h2>
                        <span class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">40+ AMCs</span>
                    </div>
                    <p class="text-xs text-wf-text-secondary">
                        Discover and analyze mutual funds across verified AMCs with real-time performance analytics.
                    </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <div class="px-2.5 py-1 rounded-wf-sm bg-wf-surface-variant/40 border border-wf-border text-left">
                        <div class="text-[9px] uppercase tracking-wider text-wf-text-muted font-bold">Coverage</div>
                        <div class="text-xs font-bold text-wf-text-primary">40+ AMCs</div>
                    </div>
                    <div class="px-2.5 py-1 rounded-wf-sm bg-wf-surface-variant/40 border border-wf-border text-left">
                        <div class="text-[9px] uppercase tracking-wider text-wf-text-muted font-bold">Schemes</div>
                        <div class="text-xs font-bold text-wf-text-primary">2,500+</div>
                    </div>
                </div>
            </div>

            <div class="mt-3.5 max-w-xl flex items-center gap-2">
                <div class="relative flex-grow">
                    <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-wf-text-muted pointer-events-none" />
                    <input v-model="searchQuery" type="text" placeholder="Search funds, AMC, or AMFI codes..."
                        class="w-full h-8 pl-8 pr-3 text-xs rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-1 focus:ring-wf-primary focus:border-wf-primary transition-all"
                        @keyup.enter="handleSearch(1)" />
                </div>
                <button type="button" @click="handleSearch(1)" :disabled="isSearching"
                    class="h-8 px-4 text-xs font-bold rounded-wf-md bg-wf-primary text-white hover:bg-wf-primary-hover transition-colors shadow-2xs shrink-0 disabled:opacity-50">
                    {{ isSearching ? 'SEARCHING...' : 'DISCOVER' }}
                </button>
            </div>
        </WfCard>

        <!-- Dynamic Controls Bar -->
        <div class="flex items-center justify-between flex-wrap gap-2 px-0.5">
            <div class="flex items-center gap-1.5 overflow-x-auto">
                <button v-for="filter in searchFilters" :key="filter" type="button" @click="activeFilter = filter"
                    class="px-2.5 py-1 rounded-wf-sm text-xs font-semibold transition-all shrink-0"
                    :class="activeFilter === filter ? 'bg-wf-primary text-white shadow-2xs' : 'bg-wf-surface-variant text-wf-text-secondary hover:text-wf-text-primary'">
                    {{ filter }}
                </button>
            </div>

            <div class="flex items-center gap-2">
                <select v-if="searchResults.length" v-model="sortBy"
                    class="h-7 text-xs px-2 rounded-wf-sm border border-wf-border bg-wf-surface text-wf-text-primary focus:outline-none focus:border-wf-primary">
                    <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
            </div>
        </div>

        <!-- SEARCH RESULTS GRID -->
        <div v-if="isSearching" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <div v-for="i in 8" :key="`skel-${i}`"
                class="p-3 rounded-wf-md border border-wf-border bg-wf-surface h-40 animate-pulse flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <div class="w-7 h-7 rounded-wf-sm bg-wf-surface-variant"></div>
                        <div class="w-16 h-4 rounded-wf-pill bg-wf-surface-variant"></div>
                    </div>
                    <div class="h-3 w-3/4 bg-wf-surface-variant rounded-wf-xs mb-1.5"></div>
                    <div class="h-3 w-1/2 bg-wf-surface-variant rounded-wf-xs"></div>
                </div>
                <div class="pt-2 border-t border-wf-border-subtle flex justify-between items-end">
                    <div class="h-5 w-16 bg-wf-surface-variant rounded-wf-xs"></div>
                    <div class="h-5 w-14 bg-wf-surface-variant rounded-wf-xs"></div>
                </div>
            </div>
        </div>

        <div v-else-if="searchResults.length > 0"
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <div v-for="fund in searchResults" :key="fund.scheme_code"
                class="p-3 rounded-wf-md border border-wf-border bg-wf-surface shadow-2xs hover:border-wf-primary/40 transition-all flex flex-col justify-between cursor-pointer group"
                @click="openFundDetails(fund.scheme_code)">

                <!-- Card Header -->
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <div class="w-7 h-7 rounded-wf-sm flex items-center justify-center font-bold text-xs text-white"
                            :style="{ background: getRandomColor(fund.scheme_name) }">
                            <span>{{ fund.scheme_name[0] }}</span>
                        </div>
                        <div class="flex flex-col items-end gap-0.5">
                            <span class="px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold"
                                :class="getRiskBadgeClass(fund.risk_level)">
                                {{ fund.risk_level.toUpperCase() }} RISK
                            </span>
                            <div class="text-[9px] font-medium text-wf-text-muted">AUM: {{ fund.aum }}</div>
                        </div>
                    </div>

                    <div
                        class="text-xs font-bold text-wf-text-primary group-hover:text-wf-primary transition-colors line-clamp-2 h-8 leading-snug mb-2">
                        {{ fund.scheme_name }}
                    </div>

                    <div class="pt-2 border-t border-wf-border-subtle flex justify-between items-end">
                        <div>
                            <div class="text-[9px] font-bold text-wf-text-muted uppercase">3Y Returns</div>
                            <div
                                class="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                {{ fund.returns_3y }}%
                                <TrendingUp :size="12" />
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-[9px] font-bold text-wf-text-muted uppercase">NAV</div>
                            <div class="text-xs font-bold text-wf-text-primary">₹{{ fund.nav }}</div>
                        </div>
                    </div>
                </div>

                <!-- Invest Button -->
                <div class="mt-2.5 pt-2 border-t border-wf-border-subtle">
                    <button type="button"
                        class="w-full h-6 text-xs font-bold rounded-wf-xs bg-wf-primary text-white hover:bg-wf-primary-hover transition-colors flex items-center justify-center gap-1 shadow-2xs"
                        @click.stop="openInvestModal(fund)">
                        <span>INSTANT INVEST</span>
                        <Plus :size="12" />
                    </button>
                </div>
            </div>
        </div>

        <!-- EMPTY STATE -->
        <div v-else class="text-center py-12">
            <div
                class="w-12 h-12 rounded-full bg-wf-surface-variant flex items-center justify-center mx-auto mb-3 text-wf-text-muted">
                <Search :size="24" />
            </div>
            <h3 class="text-sm font-bold text-wf-text-primary mb-1">No mutual funds matched your search</h3>
            <p class="text-xs text-wf-text-secondary mb-4 max-w-sm mx-auto">
                Try adjusting your filters or use keywords like "Bluechip", "Nifty", or "HDFC".
            </p>
            <button type="button"
                class="px-4 py-1.5 text-xs font-bold rounded-wf-sm bg-wf-surface-variant text-wf-primary hover:bg-wf-primary/10 transition-colors"
                @click="resetFilters">
                RESET DISCOVERY
            </button>
        </div>

        <!-- PAGINATION -->
        <div v-if="totalPages > 1 && !isSearching" class="flex items-center justify-center gap-2 mt-4 mb-2">
            <button
                type="button"
                :disabled="currentPage === 1"
                @click="handleSearch(currentPage - 1)"
                class="h-8 w-8 rounded-wf-md border border-wf-border bg-wf-surface hover:bg-wf-surface-variant flex items-center justify-center text-wf-text-secondary disabled:opacity-40 cursor-pointer transition-colors"
                title="Previous Page"
            >
                <ChevronLeft :size="16" />
            </button>
            <span class="text-xs font-semibold text-wf-text-secondary px-2">
                Page <strong class="text-wf-text-primary">{{ currentPage }}</strong> of {{ totalPages }}
            </span>
            <button
                type="button"
                :disabled="currentPage >= totalPages"
                @click="handleSearch(currentPage + 1)"
                class="h-8 w-8 rounded-wf-md border border-wf-border bg-wf-surface hover:bg-wf-surface-variant flex items-center justify-center text-wf-text-secondary disabled:opacity-40 cursor-pointer transition-colors"
                title="Next Page"
            >
                <ChevronRight :size="16" />
            </button>
        </div>

        <!-- Curated Discovery -->
        <div v-if="!searchQuery && currentPage === 1" class="mt-4 pt-4 border-t border-wf-border-subtle">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <Sparkles :size="16" class="text-wf-primary" />
                    <h3 class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary">Curated Strategies
                    </h3>
                </div>
                <div class="text-[10px] font-bold text-wf-text-muted uppercase">Handpicked For You</div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div v-for="collection in curatedCollections" :key="collection.title"
                    class="p-3 rounded-wf-md border border-wf-border bg-wf-surface shadow-2xs hover:border-wf-primary/40 transition-all cursor-pointer group flex flex-col justify-between"
                    @click="handleCollectionClick(collection.title)">
                    <div class="mb-3">
                        <div class="w-8 h-8 rounded-wf-sm flex items-center justify-center mb-2"
                            :style="{ background: collection.color + '20' }">
                            <component :is="collection.icon" :size="18" :style="{ color: collection.color }" />
                        </div>
                        <div
                            class="text-xs font-bold text-wf-text-primary group-hover:text-wf-primary transition-colors mb-0.5">
                            {{ collection.title }}</div>
                        <div class="text-[11px] text-wf-text-secondary">{{ collection.subtitle }}</div>
                    </div>
                    <div
                        class="flex items-center gap-1 text-wf-text-muted group-hover:text-wf-primary transition-colors text-[10px] font-bold uppercase tracking-wider pt-2 border-t border-wf-border-subtle">
                        <span>EXPLORE</span>
                        <ArrowRight :size="12" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Invest Modal -->
        <InvestModal v-model="showInvestModal" :fund="selectedFund" @success="handleSearch(currentPage)" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Search, Plus, TrendingUp, Sparkles, ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Star, Target } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import WfCard from '@/components/ui/WfCard.vue'
import InvestModal from './modals/InvestModal.vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'

const router = useRouter()
const notification = useNotificationStore()

// State
const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<any[]>([])
const activeFilter = ref('ALL')
const searchFilters = ['ALL', 'EQUITY', 'DEBT', 'HYBRID', 'ELSS', 'INDEX FUNDS']
const sortBy = ref('relevance')
const sortOptions = [
    { label: 'Sort by Relevance', value: 'relevance' },
    { label: 'Highest Returns (3Y)', value: 'returns_desc' },
    { label: 'Lowest Returns (3Y)', value: 'returns_asc' }
]

// Pagination Stats
const currentPage = ref(1)
const totalItems = ref(0)
const itemsPerPage = ref(12)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

// Curated Collections Data
const curatedCollections = [
    { title: 'High Growth', subtitle: 'Aggressive equity for long term alpha generation', icon: TrendingUp, color: '#3b82f6' },
    { title: 'Tax Savers', subtitle: 'Strategic ELSS funds with 80C compliance', icon: ShieldCheck, color: '#10b981' },
    { title: 'Top Rated', subtitle: 'Consistently 5-star rated by major analysts', icon: Star, color: '#f59e0b' },
    { title: 'Passive Index', subtitle: 'Cost-efficient Nifty & Sensex trackers', icon: Target, color: '#8b5cf6' },
]

// Modals
const showInvestModal = ref(false)
const selectedFund = ref<any>(null)

onMounted(async () => {
    // Initial Search (Default Recommendations)
    await handleSearch(1)
})

watch([activeFilter, sortBy], () => {
    handleSearch(1)
})

function resetFilters() {
    searchQuery.value = ''
    activeFilter.value = 'ALL'
    sortBy.value = 'relevance'
    handleSearch(1)
}

function handleCollectionClick(title: string) {
    if (title === 'Tax Savers') activeFilter.value = 'ELSS'
    else if (title.includes('Index')) activeFilter.value = 'INDEX FUNDS'
    else if (title === 'High Growth') activeFilter.value = 'EQUITY'
    else if (title === 'Top Rated') {
        activeFilter.value = 'ALL'
        sortBy.value = 'returns_desc'
        searchQuery.value = ''
    }
    handleSearch(1)
}

async function handleSearch(page: number = 1) {
    if (isSearching.value && page === 1) return // Avoid double trigger for new search

    currentPage.value = page
    isSearching.value = true

    // Smooth transition: if we already have results, clear them first if it's a new query
    if (page === 1) searchResults.value = []

    try {
        const category = activeFilter.value === 'ALL' ? undefined : (activeFilter.value === 'INDEX FUNDS' ? 'index' : activeFilter.value.toLowerCase())
        const offset = (currentPage.value - 1) * itemsPerPage.value

        const response = await financeApi.searchFunds(
            searchQuery.value || '',
            category,
            undefined, // amc
            itemsPerPage.value,
            offset,
            sortBy.value
        )

        // Handle standardized API response
        const apiData = response.data
        const funds = apiData.data || []
        totalItems.value = apiData.total || funds.length

        searchResults.value = funds.map((fund: any) => ({
            scheme_code: fund.scheme_code,
            scheme_name: fund.scheme_name,
            category: fund.category || 'Mutual Fund',
            nav: fund.nav ? Number(fund.nav).toFixed(2) : 'N/A',
            returns_3y: fund.returns_3y ? Number(fund.returns_3y).toFixed(2) : 'N/A',
            risk_level: fund.risk_level || 'Moderate',
            aum: fund.aum || 'N/A',
            trending: fund.trending || false,
            rating: fund.rating || 4,
            ...fund
        }))

        // Scroll to top of results on page change
        if (page > 1) {
            window.scrollTo({ top: 400, behavior: 'smooth' })
        }

    } catch (error) {
        console.error('Search failed:', error)
        notification.error('Discovery engine unavailable. Resilience protocols activated.')
    } finally {
        // Slight delay for premium feel
        setTimeout(() => {
            isSearching.value = false
        }, 300)
    }
}

function getRandomColor(name: string) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
    let hash = 0
    if (!name) return colors[0]
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

function getRiskBadgeClass(risk: string) {
    switch (risk?.toLowerCase()) {
        case 'low': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
        case 'moderate': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
        case 'high': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
        case 'very high': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
        default: return 'bg-wf-surface-variant text-wf-text-secondary border border-wf-border-subtle'
    }
}

function openFundDetails(schemeCode: string) {
    router.push(`/mutual-funds/explore/${schemeCode}`)
}

function openInvestModal(fund: any) {
    selectedFund.value = {
        ...fund,
        scheme_code: fund.scheme_code,
        scheme_name: fund.scheme_name
    }
    showInvestModal.value = true
}
</script>

<style scoped>
.relative {
    position: relative;
}

.absolute {
    position: absolute;
}

.top-\[-50\%\] {
    top: -50%;
}

.right-\[-10\%\] {
    right: -10%;
}

.w-\[500px\] {
    width: 500px;
}

.h-\[500px\] {
    height: 500px;
}

.blur-\[120px\] {
    filter: blur(120px);
}

.opacity-20 {
    opacity: 0.2;
}

.z-10 {
    z-index: 10;
}

.line-height-1 {
    line-height: 1 !important;
}

.max-w-\[500px\] {
    max-width: 500px;
}

.max-w-\[400px\] {
    max-width: 400px;
}

.h-\[48px\] {
    height: 48px;
}

/* Stat Pills */
.stat-pill-premium {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 12px 24px 12px 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    min-width: 240px;
    transition: all 0.3s ease;
}

.stat-pill-premium.secondary {
    background: rgba(168, 85, 247, 0.1);
    border-color: rgba(168, 85, 247, 0.2);
}

.stat-pill-premium:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateX(-10px);
}

.premium-discover-btn {
    background: linear-gradient(135deg, rgb(99, 102, 241) 0%, rgba(99, 102, 241, 0.8) 100%) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    text-transform: uppercase;
    letter-spacing: 1.5px !important;
}

.premium-discover-btn:hover {
    transform: scale(1.02) translateY(-1px);
    box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.5) !important;
}

/* Results Grid */
.results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 2rem;
}

/* Fund Icon Wrapper */
.fund-icon-wrapper {
    width: 56px;
    height: 56px;
    background: var(--icon-color);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.75rem;
    box-shadow: 0 8px 20px -4px var(--icon-color);
    position: relative;
}

.fund-icon-wrapper::after {
    content: '';
    position: absolute;
    inset: -4px;
    border: 2px solid var(--icon-color);
    border-radius: 22px;
    opacity: 0.2;
}

/* Hover Effects */
.hover-lift {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
    transform: translateY(-10px);
}

.bg-primary-opacity-5 {
    background: rgba(99, 102, 241, 0.05);
}

/* Utilities */
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.bg-glass {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
}

.animate-fade-in {
    animation: fadeIn 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.delay-1 {
    animation-delay: 0.15s;
}

.delay-2 {
    animation-delay: 0.3s;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-slide-up {
    animation: slideUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(40px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
