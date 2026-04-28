<template>
    <v-container fluid class="pa-0">
        <!-- Hero Section -->
        <v-card class="midnight-premium-card mb-8 pa-10 overflow-hidden relative" rounded="32" elevation="0">
            <!-- Background Decorative Blobs -->
            <div class="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-primary blur-[120px] opacity-20 rounded-full"></div>
            
            <v-row align="center" class="relative z-10">
                <v-col cols="12" md="7">
                    <h1 class="text-h3 font-weight-black text-white mb-4 animate-fade-in letter-spacing-tight">Financial Command Center</h1>
                    <p class="text-h6 text-white opacity-70 mb-8 font-weight-medium animate-fade-in delay-1 max-w-[500px]">
                        Seamlessly discover and analyze thousands of mutual funds with real-time performance architecture.
                    </p>

                    <div class="search-wrap animate-fade-in delay-2">
                        <v-text-field v-model="searchQuery" placeholder="Search funds, AMC, or AMFI codes..."
                            density="comfortable" variant="solo" rounded="24" hide-details class="premium-search-field"
                            @keyup.enter="handleSearch(1)">
                            <template v-slot:prepend-inner>
                                <Search :size="22" class="text-primary mr-3" />
                            </template>
                            <template v-slot:append-inner>
                                <v-btn color="primary" rounded="xl" height="42" 
                                    class="px-8 font-weight-black elevation-12 premium-discover-btn"
                                    @click="handleSearch(1)" :loading="isSearching">
                                    DISCOVER
                                </v-btn>
                            </template>

                        </v-text-field>
                    </div>
                </v-col>
                <v-col cols="12" md="5" class="d-none d-md-block text-right">
                    <div class="d-inline-flex flex-column gap-4 align-end">
                        <div class="stat-pill-premium">
                            <v-avatar color="primary" size="48" class="mr-4 elevation-4">
                                <Activity :size="24" class="text-white" />
                            </v-avatar>
                            <div class="text-left">
                                <div class="text-overline text-white opacity-60 line-height-1 mb-1">MARKET COVERAGE</div>
                                <div class="text-h5 font-weight-black text-white">40+ AMCs</div>
                            </div>
                        </div>
                        <div class="stat-pill-premium secondary">
                            <v-avatar color="secondary" size="48" class="mr-4 elevation-4">
                                <TrendingUp :size="24" class="text-white" />
                            </v-avatar>
                            <div class="text-left">
                                <div class="text-overline text-white opacity-60 line-height-1 mb-1">ACTIVE SCHEMES</div>
                                <div class="text-h5 font-weight-black text-white">2,500+</div>
                            </div>
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-card>

        <!-- Dynamic Controls Bar -->
        <div class="d-flex align-center justify-space-between mb-8 flex-wrap gap-4 px-1">
            <div class="d-flex align-center gap-4">
                <v-chip-group v-model="activeFilter" mandatory selected-class="bg-primary text-white"
                    class="premium-chip-group">
                    <v-chip v-for="filter in searchFilters" :key="filter" :value="filter" filter variant="tonal"
                        class="font-weight-black px-6 rounded-xl">
                        {{ filter.toUpperCase() }}
                    </v-chip>
                </v-chip-group>
            </div>
            
            <div class="d-flex align-center gap-3">
                <v-select v-if="searchResults.length" v-model="sortBy" :items="sortOptions" item-title="label" item-value="value"
                    density="compact" variant="outlined" rounded="xl" hide-details style="width: 200px"
                    class="premium-select text-caption font-weight-bold">
                    <template v-slot:prepend-inner>
                        <Settings2 :size="16" class="text-medium-emphasis mr-2" />
                    </template>
                </v-select>
            </div>
        </div>

        <!-- SEARCH RESULTS GRID -->
        <div v-if="isSearching" class="results-grid">
            <v-col v-for="i in 8" :key="`skel-${i}`" cols="12" class="pa-0">
                <PremiumSkeleton type="fund-card" glass />
            </v-col>
        </div>

        <div v-else-if="searchResults.length > 0" class="results-grid animate-fade-in">
            <v-card v-for="fund in searchResults" :key="fund.scheme_code" class="premium-glass-card group hover-lift overflow-hidden" rounded="24"
                @click="openFundDetails(fund.scheme_code)" elevation="0">
                
                <!-- Card Header -->
                <div class="pa-6">
                    <div class="d-flex justify-space-between align-start mb-6">
                        <div class="fund-icon-wrapper" :style="{ '--icon-color': getRandomColor(fund.scheme_name) }">
                            <span class="font-weight-black">{{ fund.scheme_name[0] }}</span>
                        </div>
                        <div class="d-flex flex-column align-end gap-1">
                            <v-chip size="x-small" :color="getRiskColor(fund.risk_level)" variant="flat"
                                class="font-weight-black rounded-lg">
                                {{ fund.risk_level.toUpperCase() }} RISK
                            </v-chip>
                            <div class="text-[10px] font-weight-bold opacity-40 uppercase tracking-wider">AUM: {{ fund.aum }}</div>
                        </div>
                    </div>

                    <div class="text-subtitle-1 font-weight-black line-height-tight line-clamp-2 mb-6 h-[48px] text-content group-hover:text-primary transition-colors">
                        {{ fund.scheme_name }}
                    </div>

                    <v-divider class="mb-6 opacity-5"></v-divider>

                    <div class="d-flex justify-space-between align-end">
                        <div>
                            <div class="text-overline font-weight-black opacity-40 line-height-1 mb-1">3Y RETURNS</div>
                            <div class="text-h5 font-weight-black text-success d-flex align-center tabular-nums">
                                {{ fund.returns_3y }}%
                                <TrendingUp :size="18" class="ml-2" />
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-overline font-weight-black opacity-40 line-height-1 mb-1">CURRENT NAV</div>
                            <div class="text-h6 font-weight-black tabular-nums">₹{{ fund.nav }}</div>
                        </div>
                    </div>
                </div>

                <!-- Hover Invest Layer -->
                <div class="bg-primary-opacity-5 pa-4 border-t opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 d-flex gap-2">
                    <v-btn block color="primary" rounded="xl" variant="flat" 
                        class="font-weight-black elevation-4 premium-discover-btn"
                        @click.stop="openInvestModal(fund)">
                        INSTANT INVEST
                        <Plus :size="16" class="ml-2" />
                    </v-btn>

                </div>
            </v-card>
        </div>

        <!-- EMPTY STATE -->
        <div v-else class="text-center py-20 animate-fade-in">
            <v-avatar color="surface-variant" size="120" class="mb-6 opacity-20">
                <Search :size="64" />
            </v-avatar>
            <h3 class="text-h5 font-weight-black mb-2">No algorithms matched your search</h3>
            <p class="text-body-1 opacity-60 mb-8 max-w-[400px] mx-auto">
                Try adjusting your filters or use different keywords like "Bluechip", "Nifty", or "HDFC".
            </p>
            <v-btn variant="tonal" color="primary" rounded="xl" class="font-weight-black px-10" @click="resetFilters">
                RESET DISCOVERY
            </v-btn>
        </div>

        <!-- PAGINATION -->
        <div v-if="totalPages > 1 && !isSearching" class="d-flex justify-center mt-12 mb-8 animate-slide-up">
            <v-pagination v-model="currentPage" :length="totalPages" total-visible="7" rounded="xl" color="primary"
                class="premium-pagination shadow-md bg-glass px-4 py-2 rounded-pill" density="comfortable"
                @update:model-value="handleSearch" />
        </div>

        <!-- Curated Discovery (Only on first page or no query) -->
        <div v-if="!searchQuery && currentPage === 1" class="mt-16 animate-slide-up delay-2">
            <div class="d-flex align-center gap-3 mb-8">
                <v-avatar color="primary-lighten" size="40">
                    <Sparkles :size="20" class="text-primary" />
                </v-avatar>
                <h3 class="text-h6 font-weight-black text-content uppercase letter-spacing-1">Curated Strategies</h3>
                <v-spacer></v-spacer>
                <div class="text-caption font-weight-bold opacity-40">HANDPICKED FOR YOU</div>
            </div>
            
            <v-row>
                <v-col v-for="collection in curatedCollections" :key="collection.title" cols="12" sm="6" lg="3">
                    <v-card class="premium-glass-card pa-6 group hover-lift d-flex flex-column h-100" rounded="24"
                        @click="handleCollectionClick(collection.title)">
                        <div class="mb-6">
                            <v-avatar :color="collection.color + '20'" size="56" rounded="20" class="mb-4">
                                <v-icon :icon="collection.icon" :color="collection.color" size="28" />
                            </v-avatar>
                            <div class="text-h6 font-weight-black line-height-tight mb-1">{{ collection.title }}</div>
                            <div class="text-caption font-weight-bold opacity-50">{{ collection.subtitle }}</div>
                        </div>
                        <v-spacer></v-spacer>
                        <div class="d-flex align-center gap-2 group-hover:text-primary transition-all">
                            <span class="text-[10px] font-weight-black uppercase letter-spacing-wide">EXPLORE COLLECTION</span>
                            <ArrowRight :size="14" />
                        </div>
                    </v-card>
                </v-col>
            </v-row>
        </div>

        <!-- Invest Modal -->
        <InvestModal v-model="showInvestModal" :fund="selectedFund" @success="handleSearch(currentPage)" />
    </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Search, Plus, TrendingUp, Sparkles, Activity, Settings2, ArrowRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import InvestModal from './modals/InvestModal.vue'
import PremiumSkeleton from '@/components/common/PremiumSkeleton.vue'
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
    { title: 'High Growth', subtitle: 'Aggressive equity for long term alpha generation', icon: 'mdi-chart-line-variant', color: '#3b82f6' },
    { title: 'Tax Savers', subtitle: 'Strategic ELSS funds with 80C compliance', icon: 'mdi-shield-check', color: '#10b981' },
    { title: 'Top Rated', subtitle: 'Consistently 5-star rated by major analysts', icon: 'mdi-star', color: '#f59e0b' },
    { title: 'Passive Index', subtitle: 'Cost-efficient Nifty & Sensex trackers', icon: 'mdi-target', color: '#8b5cf6' },
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

function getRiskColor(risk: string) {
    switch (risk?.toLowerCase()) {
        case 'low': return 'success'
        case 'moderate': return 'info'
        case 'high': return 'warning'
        case 'very high': return 'error'
        default: return 'primary'
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
.relative { position: relative; }
.absolute { position: absolute; }
.top-\[-50\%\] { top: -50%; }
.right-\[-10\%\] { right: -10%; }
.w-\[500px\] { width: 500px; }
.h-\[500px\] { height: 500px; }
.blur-\[120px\] { filter: blur(120px); }
.opacity-20 { opacity: 0.2; }
.z-10 { z-index: 10; }
.line-height-1 { line-height: 1 !important; }
.max-w-\[500px\] { max-width: 500px; }
.max-w-\[400px\] { max-width: 400px; }
.h-\[48px\] { height: 48px; }

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
    background: rgba(var(--v-theme-secondary), 0.1);
    border-color: rgba(var(--v-theme-secondary), 0.2);
}

.stat-pill-premium:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateX(-10px);
}

/* Premium Search */
.premium-search-field :deep(.v-field) {
    background: white !important;
    box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.2) !important;
    border: none !important;
    padding-right: 4px !important;
}

.premium-discover-btn {
    background: linear-gradient(135deg, rgba(var(--v-theme-primary), 1) 0%, rgba(var(--v-theme-primary), 0.8) 100%) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    text-transform: uppercase;
    letter-spacing: 1.5px !important;
}

.premium-discover-btn:hover {
    transform: scale(1.02) translateY(-1px);
    box-shadow: 0 10px 25px -5px rgba(var(--v-theme-primary), 0.5) !important;
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
    background: rgba(var(--v-theme-primary), 0.05);
}

/* Pagination Styling */
.premium-pagination :deep(.v-pagination__item--active) {
    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
}

.premium-pagination :deep(.v-pagination__list) {
    gap: 8px;
}

/* Utilities */
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.bg-glass {
    background: rgba(var(--v-theme-surface), 0.6);
    backdrop-filter: blur(10px);
}

.animate-fade-in {
    animation: fadeIn 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.delay-1 { animation-delay: 0.15s; }
.delay-2 { animation-delay: 0.3s; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-slide-up {
    animation: slideUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
