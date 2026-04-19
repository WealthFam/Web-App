<template>
    <div>
        <!-- Portfolio Header Summary -->
        <v-row class="mb-6">
            <template v-if="isLoading">
                <v-col cols="12" md="4" v-for="i in 3" :key="`skel-card-${i}`">
                    <PremiumSkeleton type="stat-card" glass />
                </v-col>
            </template>
            <template v-else>
                <!-- Current Value -->
                <v-col cols="12" md="4">
                    <v-card class="premium-glass-card h-100 pa-6" rounded="xl">
                        <div class="d-flex align-center justify-space-between mb-2">
                            <span class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Current Value</span>
                            <div class="pa-2 rounded-lg bg-surface-variant-opacity">
                                <TrendingUp v-if="portfolioStats.pl >= 0" :size="18" class="text-success" />
                                <TrendingDown v-else :size="18" class="text-error" />
                            </div>
                        </div>
                        <div class="text-h4 font-weight-black text-content mb-2">
                            {{ formatAmount(portfolioStats.current) }}
                        </div>
                        <v-chip size="small" :color="portfolioStats.pl >= 0 ? 'success' : 'error'" variant="tonal" class="font-weight-black mt-1">
                            {{ portfolioStats.pl >= 0 ? '↑' : '↓' }} {{ Math.abs(portfolioStats.plPercent).toFixed(2) }}% Returns
                        </v-chip>
                    </v-card>
                </v-col>

                <!-- Total Invested -->
                <v-col cols="12" md="4">
                    <v-card class="premium-glass-card h-100 pa-6" rounded="xl">
                        <div class="d-flex align-center justify-space-between mb-2">
                            <span class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Invested Capital</span>
                            <div class="pa-2 rounded-lg bg-surface-variant-opacity">
                                <Clock :size="18" class="text-primary" />
                            </div>
                        </div>
                        <div class="text-h4 font-weight-black text-content mb-2">
                            {{ formatAmount(portfolioStats.invested) }}
                        </div>
                        <div class="text-caption font-weight-bold opacity-60">
                            Distributed across {{ portfolio.length }} unique schemes
                        </div>
                    </v-card>
                </v-col>

                <!-- Overall P&L / XIRR -->
                <v-col cols="12" md="4">
                    <v-card class="premium-glass-card h-100 pa-6" rounded="xl">
                        <div class="d-flex align-center justify-space-between mb-2">
                            <span class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Net Gain/Loss</span>
                            <div class="pa-2 rounded-lg bg-surface-variant-opacity">
                                <Target :size="18" class="text-secondary" />
                            </div>
                        </div>
                        <div class="text-h4 font-weight-black" :class="portfolioStats.pl >= 0 ? 'text-success' : 'text-error'">
                            {{ portfolioStats.pl >= 0 ? '+' : '' }}{{ formatAmount(portfolioStats.pl) }}
                        </div>
                        <div class="d-flex align-center gap-4 mt-1">
                             <div class="text-caption font-weight-black opacity-70" v-if="analytics?.xirr != null">
                                XIRR: <span :class="analytics.xirr >= 0 ? 'text-success' : 'text-error'">{{ analytics.xirr.toFixed(2) }}%</span>
                            </div>
                        </div>
                    </v-card>
                </v-col>
            </template>
        </v-row>

        <!-- Insights & Advisor Access Row -->
        <v-row class="mb-8">
            <!-- AI Advisor CTA -->
            <v-col cols="12" md="5">
                <v-card class="premium-glass-card h-100 rounded-24 transition-all hover-glow border-primary-glow" @click="router.push({ name: 'portfolio-analysis' })" style="cursor: pointer">
                    <v-card-text class="pa-8 d-flex flex-column h-100">
                        <div class="d-flex align-center justify-space-between mb-6">
                            <div class="pa-4 rounded-20 bg-primary-lighten d-flex align-center justify-center">
                                <Sparkles class="text-primary" :size="28" />
                            </div>
                            <v-btn icon variant="tonal" color="primary" class="rounded-xl">
                                <ExternalLink :size="20" />
                            </v-btn>
                        </div>
                        <h3 class="text-h5 font-weight-black mb-2 text-content">AI Advisor</h3>
                        <p class="text-body-2 text-medium-emphasis mb-6 opacity-80">
                            Analyze category exposure, rebalancing guardrails, and AI-driven growth detection for your complete portfolio.
                        </p>
                        <v-spacer></v-spacer>
                        <div class="d-flex align-center gap-2">
                            <div class="analysis-status-pill">AI ANALYSIS READY</div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- Top Performance Snapshot -->
            <v-col cols="12" md="7">
                <v-card class="premium-glass-card h-100 pa-6 rounded-24" elevation="0">
                    <div class="d-flex align-center justify-space-between mb-6">
                        <h3 class="text-subtitle-1 font-weight-black text-content uppercase letter-spacing-1">Market Velocity</h3>
                        <v-chip size="x-small" variant="tonal" class="font-weight-black">Top Movers</v-chip>
                    </div>
                    
                    <v-row>
                        <v-col cols="12" sm="6">
                            <h4 class="text-caption font-weight-black text-success mb-3 uppercase letter-spacing-1">Top Gainers</h4>
                            <div class="d-flex flex-column gap-3">
                                <div v-for="item in topGainers" :key="item.id" class="profit-mini-row" @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                                    <div class="text-truncate text-body-2 font-weight-bold pr-2" style="max-width: 140px">{{ item.scheme_name }}</div>
                                    <div class="text-right flex-shrink-0">
                                        <div class="text-success font-weight-black text-body-2">+{{ formatAmount(item.profit_loss) }}</div>
                                        <div class="text-[10px] text-success font-weight-bold">{{ ((item.profit_loss / (item.invested_value || 1)) * 100).toFixed(2) }}%</div>
                                    </div>
                                </div>
                                <div v-if="!topGainers.length" class="text-caption opacity-40 py-4 text-center border-dashed rounded-lg">No growth data</div>
                            </div>
                        </v-col>

                        <v-col cols="12" sm="6">
                            <h4 class="text-caption font-weight-black text-error mb-3 uppercase letter-spacing-1">Primary Losers</h4>
                            <div class="d-flex flex-column gap-3">
                                <div v-for="item in topLosers" :key="item.id" class="loss-mini-row" @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                                    <div class="text-truncate text-body-2 font-weight-bold pr-2" style="max-width: 140px">{{ item.scheme_name }}</div>
                                    <div class="text-right flex-shrink-0">
                                        <div class="text-error font-weight-black text-body-2">{{ formatAmount(item.profit_loss) }}</div>
                                        <div class="text-[10px] text-error font-weight-bold">{{ ((item.profit_loss / (item.invested_value || 1)) * 100).toFixed(2) }}%</div>
                                    </div>
                                </div>
                                <div v-if="!topLosers.length" class="text-caption opacity-40 py-4 text-center border-dashed rounded-lg">All funds positive</div>
                            </div>
                        </v-col>
                    </v-row>
                </v-card>
            </v-col>
        </v-row>

        <!-- Holdings Table -->
        <v-card class="premium-glass-card rounded-24 overflow-hidden border" elevation="0">
            <div class="px-8 py-6 d-flex justify-space-between align-center border-b">
                <div>
                    <h3 class="text-h6 font-weight-black text-content">Portfolio Holdings</h3>
                    <p class="text-caption text-medium-emphasis">Complete breakdown of all registered folios</p>
                </div>
                <v-text-field v-model="search" density="comfortable" variant="outlined" hide-details
                    placeholder="Search schemes..." style="max-width: 320px" class="glass-input-rounded">
                    <template v-slot:prepend-inner>
                        <Search :size="18" class="text-medium-emphasis mr-2" />
                    </template>
                </v-text-field>
            </div>

            <div v-if="isLoading">
                <div v-for="i in 5" :key="`skel-table-${i}`" class="d-flex align-center px-8 py-6 border-b glass-loader-row">
                    <v-skeleton-loader type="avatar" size="32" class="mr-4 skeleton-glass"></v-skeleton-loader>
                    <div class="flex-grow-1 mr-4">
                        <v-skeleton-loader type="text" width="40%" class="mb-1 skeleton-glass"></v-skeleton-loader>
                        <v-skeleton-loader type="text" width="20%" height="12" class="skeleton-glass"></v-skeleton-loader>
                    </div>
                </div>
            </div>

            <v-data-table v-else :headers="headers" :items="sortedPortfolio" :search="search" hover
                class="premium-table-hardened bg-transparent" density="comfortable" item-value="id" v-model:expanded="expanded" hide-default-footer>
                <!-- Fund Name Column -->
                <template #[`item.scheme_name`]="{ item }">
                    <div class="d-flex align-center py-3">
                        <div class="mr-4 flex-shrink-0" style="width: 4px; height: 36px; border-radius: 4px;"
                            :style="{ background: getRandomColor(item.scheme_name) }"></div>

                        <v-btn v-if="item.has_multiple" icon density="compact" variant="tonal" size="28" class="mr-3"
                            @click.stop="toggleGroup(item.id)">
                            <ChevronDown v-if="expanded.includes(item.id)" :size="16" />
                            <ChevronRight v-else :size="16" />
                        </v-btn>
                        <div v-else class="mr-3" style="width: 28px"></div>

                        <div class="cursor-pointer group" @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                            <div class="font-weight-black text-body-2 text-content group-hover-text-primary transition-all">{{ item.scheme_name }}</div>
                            <div class="d-flex align-center gap-2 mt-1">
                                <span class="text-[10px] font-weight-black opacity-50">{{ item.scheme_code }}</span>
                                <v-chip v-if="item.goal_id" size="x-small" color="success" variant="flat" class="font-weight-black text-[9px] px-1" height="16">LINKED</v-chip>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Value Columns -->
                <template #[`item.current_value`]="{ item }">
                    <span class="font-weight-black text-body-2">{{ formatAmount(item.current_value) }}</span>
                </template>

                <template #[`item.profit_loss`]="{ item }">
                    <div class="d-flex flex-column align-end">
                        <span class="font-weight-black text-body-2" :class="item.profit_loss >= 0 ? 'text-success' : 'text-error'">
                            {{ item.profit_loss >= 0 ? '+' : '' }}{{ formatAmount(item.profit_loss) }}
                        </span>
                        <span class="text-[10px] font-weight-black opacity-60">
                            {{ ((item.profit_loss / (item.invested_value || 1)) * 100).toFixed(2) }}%
                        </span>
                    </div>
                </template>

                <!-- Actions -->
                <template #[`item.actions`]="{ item }">
                    <div class="d-flex justify-end gap-1">
                        <v-btn icon variant="tonal" density="compact" color="primary" class="rounded-lg"
                            @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                            <EyeIconMain :size="16" />
                        </v-btn>
                        <v-btn icon variant="tonal" density="compact" color="error" class="rounded-lg"
                            @click="openDeleteModal(item)">
                            <Trash2 :size="16" />
                        </v-btn>
                    </div>
                </template>
            </v-data-table>
        </v-card>

        <!-- Modals -->
        <LinkGoalModal v-model="showLinkGoalModal" :holding="selectedHolding" @saved="fetchPortfolio" />
        <DeleteHoldingDeepDiveModal 
            v-model="showDeleteModal" 
            :holding="selectedHolding" 
            :loading="isManagementLoading"
            @delete-holding="handleDeleteHolding"
            @delete-transactions="handleBulkDelete"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMutualFundStore } from '@/stores/finance/mutualFunds'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'
import { TrendingUp, TrendingDown, Clock, Search, Target, Sparkles, ExternalLink, Eye as EyeIconMain, ChevronDown, ChevronRight, Trash2 } from 'lucide-vue-next'
import LinkGoalModal from './modals/LinkGoalModal.vue'
import DeleteHoldingDeepDiveModal from './modals/DeleteHoldingDeepDiveModal.vue'
import PremiumSkeleton from '@/components/common/PremiumSkeleton.vue'

const router = useRouter()
const mfStore = useMutualFundStore()
const authStore = useAuthStore()
const { formatAmount } = useCurrency()
const notify = useNotificationStore()

// State
const portfolio = ref<any[]>([])
const analytics = ref<any>(null)
const isLoading = ref(true)
const search = ref('')
const expanded = ref<string[]>([])
const selectedHolding = ref<any>(null)
const showLinkGoalModal = ref(false)
const showDeleteModal = ref(false)
const isManagementLoading = ref(false)

// Headers
const headers = [
    { title: 'Scheme Details', key: 'scheme_name', align: 'start' as const },
    { title: 'Invested', key: 'invested_value', align: 'end' as const },
    { title: 'Current Value', key: 'current_value', align: 'end' as const },
    { title: 'P&L / Returns', key: 'profit_loss', align: 'end' as const },
    { title: '', key: 'actions', align: 'end' as const, sortable: false },
]

// Computed
const portfolioStats = computed(() => {
    if (!portfolio.value.length) return { invested: 0, current: 0, pl: 0, plPercent: 0 }
    const invested = portfolio.value.reduce((s, i) => s + (Number(i.invested_value) || 0), 0)
    const current = portfolio.value.reduce((s, i) => s + (Number(i.current_value) || 0), 0)
    const pl = current - invested
    return { invested, current, pl, plPercent: invested ? (pl / invested) * 100 : 0 }
})

const sortedPortfolio = computed(() => {
    if (!Array.isArray(portfolio.value)) return []
    const groups: Record<string, any[]> = {}
    portfolio.value.forEach(item => {
        const code = item.scheme_code
        if (!groups[code]) groups[code] = []
        groups[code].push(item)
    })

    const result: any[] = []
    Object.keys(groups).forEach(code => {
        const items = groups[code]
        if (items.length > 1) {
            const totalInv = items.reduce((s, i) => s + Number(i.invested_value), 0)
            const totalCur = items.reduce((s, i) => s + Number(i.current_value), 0)
            result.push({
                id: `group-${code}`,
                scheme_code: code,
                scheme_name: items[0].scheme_name,
                invested_value: totalInv,
                current_value: totalCur,
                profit_loss: totalCur - totalInv,
                has_multiple: true,
                children: items
            })
        } else {
            result.push({ ...items[0], has_multiple: false })
        }
    })
    return result
})

const topGainers = computed(() => sortedPortfolio.value.filter(i => i.profit_loss > 0).sort((a,b) => b.profit_loss - a.profit_loss).slice(0, 3))
const topLosers = computed(() => sortedPortfolio.value.filter(i => i.profit_loss < 0).sort((a,b) => a.profit_loss - b.profit_loss).slice(0, 3))

// Methods
async function fetchPortfolio() {
    isLoading.value = true
    try {
        const res = await financeApi.getPortfolio(authStore.selectedMemberId || undefined)
        const data = res.data?.data || res.data
        portfolio.value = Array.isArray(data) ? data : []
        mfStore.portfolio = portfolio.value
    } catch (e) { console.error(e) } finally { isLoading.value = false }
}

async function fetchAnalytics() {
    try {
        const res = await financeApi.getAnalytics(authStore.selectedMemberId || undefined)
        analytics.value = res.data?.data || res.data
        mfStore.analytics = analytics.value
    } catch (e) { console.error(e) }
}

function openDeleteModal(item: any) {
    selectedHolding.value = item
    showDeleteModal.value = true
}

async function handleDeleteHolding(id: string) {
    isManagementLoading.value = true
    try {
        await financeApi.deleteHolding(id)
        notify.success("Holding removed")
        await fetchPortfolio()
    } catch (e) { notify.error("Delete failed") } finally { isManagementLoading.value = false; showDeleteModal.value = false }
}

async function handleBulkDelete(ids: string[]) {
    isManagementLoading.value = true
    try {
        await financeApi.bulkDeleteFundTransactions(ids)
        notify.success(`Cleaned ${ids.length} records`)
        await fetchPortfolio()
    } catch (e) { notify.error("Cleanup failed") } finally { isManagementLoading.value = false; showDeleteModal.value = false }
}

function toggleGroup(id: string) {
    const idx = expanded.value.indexOf(id)
    if (idx !== -1) expanded.value.splice(idx, 1)
    else expanded.value.push(id)
}

function getRandomColor(name: string) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
}

onMounted(() => {
    fetchPortfolio()
    fetchAnalytics()
})

const emit = defineEmits(['update:count'])
watch(portfolio, (val) => emit('update:count', val.length))
</script>

<style scoped>
.rounded-20 { border-radius: 20px !important; }
.rounded-24 { border-radius: 24px !important; }
.letter-spacing-1 { letter-spacing: 1px; }

.premium-glass-card {
    background: rgba(var(--v-theme-surface), 0.6) !important;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.hover-glow:hover {
    box-shadow: 0 0 30px rgba(var(--v-theme-primary), 0.15) !important;
    transform: translateY(-2px);
    border-color: rgba(var(--v-theme-primary), 0.3) !important;
}

.analysis-status-pill {
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
    font-size: 0.7rem;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 100px;
    letter-spacing: 1px;
}

.profit-mini-row, .loss-mini-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(var(--v-theme-on-surface), 0.03);
    cursor: pointer;
    transition: all 0.2s ease;
}

.profit-mini-row:hover { background: rgba(var(--v-theme-success), 0.08); transform: translateX(4px); }
.loss-mini-row:hover { background: rgba(var(--v-theme-error), 0.08); transform: translateX(4px); }

.glass-input-rounded :deep(.v-field__outline) { display: none; }
.glass-input-rounded {
    background: rgba(var(--v-theme-on-surface), 0.05);
    border-radius: 14px;
}

.premium-table-hardened :deep(thead th) {
    font-weight: 800;
    text-transform: uppercase;
    font-size: 0.65rem;
    color: rgba(var(--v-theme-on-surface), 0.5);
    letter-spacing: 1px;
}
</style>
