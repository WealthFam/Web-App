<script setup lang="ts">
import { ref, computed } from 'vue'
import { TrendingUp, BarChart2 } from 'lucide-vue-next'

const props = defineProps<{
    data: any
    isLoading: boolean
}>()

const selectedSector = ref<any>(null)

const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0)
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(num)
}

const formatKeyHoldings = (stocks: any[]) => {
    if (!Array.isArray(stocks)) return ''
    return stocks
        .map((s: any) => {
            if (typeof s === 'string') return s
            const name = s.company_name || s.name || s.stock_name || ''
            if (!name) return ''
            return s.portfolio_weight ? `${name} (${s.portfolio_weight}%)` : name
        })
        .filter(Boolean)
        .join(', ')
}

const marketCap = computed(() => {
    return props.data?.market_cap_breakdown || props.data?.market_cap || null
})

// Compute Pareto Sorted Sectors with Cumulative Percentages
const paretoSectors = computed(() => {
    const list = [...(props.data?.sectors || [])]
    list.sort((a, b) => {
        const wA = Number(a.portfolio_weight ?? a.weight_pct ?? 0)
        const wB = Number(b.portfolio_weight ?? b.weight_pct ?? 0)
        return wB - wA
    })

    let runningTotal = 0
    return list.map((sec, idx) => {
        const weight = Number(sec.portfolio_weight ?? sec.weight_pct ?? 0)
        const totalVal = Number(sec.total_value ?? sec.invested_value ?? 0)
        runningTotal += weight
        return {
            ...sec,
            rank: idx + 1,
            weight_pct: weight,
            invested_value: totalVal,
            cumulative_pct: Math.min(100, Math.round(runningTotal * 10) / 10),
            is_top_80: runningTotal - weight < 80
        }
    })
})

const top80Count = computed(() => {
    return paretoSectors.value.filter(s => s.is_top_80).length
})

const top80Weight = computed(() => {
    const top = paretoSectors.value.filter(s => s.is_top_80)
    if (!top.length) return 0
    return top[top.length - 1].cumulative_pct
})
</script>

<template>
    <div class="bg-wf-surface border border-wf-border rounded-wf-lg p-5 sm:p-6 shadow-xs space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-wf-border-subtle">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-wf-lg bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                    <BarChart2 class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="text-base font-bold text-wf-text-primary">Sectoral Pareto & Heatmap</h3>
                        <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                            Pareto 80/20 Distribution
                        </span>
                    </div>
                    <p class="text-xs text-wf-text-secondary">
                        Macroeconomic industry exposure and cumulative capital concentration
                    </p>
                </div>
            </div>

            <div class="text-xs text-wf-text-secondary self-start sm:self-auto font-mono">
                Equity Portfolio: <span class="font-bold text-wf-text-primary">{{ formatCurrency(data?.total_portfolio_value) }}</span>
            </div>
        </div>

        <!-- Pareto 80/20 Takeaway Banner -->
        <div class="p-4 bg-linear-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 rounded-wf-lg flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                80/20
            </div>
            <div class="text-xs leading-relaxed">
                <span class="font-bold text-wf-text-primary">Pareto Concentration Finding:</span>
                <span class="text-wf-text-secondary ml-1">
                    Your top <b>{{ top80Count }} sectors</b> account for <b>{{ top80Weight }}%</b> of your total mutual fund equity investments.
                </span>
            </div>
        </div>

        <!-- Market Cap Allocation Segmented Bar -->
        <div v-if="marketCap" class="p-3.5 bg-wf-surface-variant/40 border border-wf-border-subtle rounded-wf-md space-y-2.5">
            <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-wf-text-primary">Market Capitalization Allocation (SEBI Classification)</span>
                <span class="text-[11px] text-wf-text-tertiary">Portfolio Split</span>
            </div>

            <!-- Segmented Bar -->
            <div class="w-full h-3 bg-wf-border-subtle rounded-full overflow-hidden flex">
                <div
                    class="bg-blue-500 h-full transition-all"
                    :style="{ width: `${marketCap.large_cap || marketCap.large_cap_pct || 0}%` }"
                    title="Large Cap"
                ></div>
                <div
                    class="bg-emerald-500 h-full transition-all"
                    :style="{ width: `${marketCap.mid_cap || marketCap.mid_cap_pct || 0}%` }"
                    title="Mid Cap"
                ></div>
                <div
                    class="bg-amber-500 h-full transition-all"
                    :style="{ width: `${marketCap.small_cap || marketCap.small_cap_pct || 0}%` }"
                    title="Small Cap"
                ></div>
                <div
                    class="bg-gray-400 h-full transition-all"
                    :style="{ width: `${marketCap.cash || marketCap.cash_and_debt_pct || 0}%` }"
                    title="Cash & Debt"
                ></div>
            </div>

            <!-- Legend Pills -->
            <div class="flex flex-wrap items-center gap-4 text-xs">
                <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span class="text-wf-text-secondary">Large Cap: <b class="text-wf-text-primary font-mono">{{ marketCap.large_cap || marketCap.large_cap_pct || 0 }}%</b></span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span class="text-wf-text-secondary">Mid Cap: <b class="text-wf-text-primary font-mono">{{ marketCap.mid_cap || marketCap.mid_cap_pct || 0 }}%</b></span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span class="text-wf-text-secondary">Small Cap: <b class="text-wf-text-primary font-mono">{{ marketCap.small_cap || marketCap.small_cap_pct || 0 }}%</b></span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                    <span class="text-wf-text-secondary">Cash / Debt: <b class="text-wf-text-primary font-mono">{{ marketCap.cash || marketCap.cash_and_debt_pct || 0 }}%</b></span>
                </div>
            </div>
        </div>

        <!-- Pareto Distribution Dual Visual Chart -->
        <div class="p-4 sm:p-5 bg-wf-surface-variant/30 border border-wf-border rounded-wf-xl space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="text-xs font-bold text-wf-text-primary flex items-center gap-1.5">
                        <TrendingUp class="w-4 h-4 text-purple-500" />
                        <span>Sectoral Pareto Distribution & Cumulative Exposure Curve</span>
                    </h4>
                    <p class="text-[11px] text-wf-text-tertiary mt-0.5">
                        Bars indicate individual sector weight; line/tag indicates cumulative portfolio exposure
                    </p>
                </div>
            </div>

            <!-- Pareto Visual List -->
            <div class="space-y-3 pt-2">
                <div
                    v-for="sec in paretoSectors"
                    :key="sec.sector_name"
                    class="p-2.5 bg-wf-surface rounded-wf-md border border-wf-border-subtle hover:border-purple-500/40 transition-colors space-y-1.5 cursor-pointer"
                    @click="selectedSector = sec"
                >
                    <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2 truncate max-w-[65%]">
                            <span class="w-4 text-[10px] text-wf-text-tertiary font-mono">{{ sec.rank }}.</span>
                            <span class="font-bold text-wf-text-primary truncate">{{ sec.sector_name }}</span>
                            <span
                                v-if="sec.is_top_80"
                                class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            >
                                Core 80%
                            </span>
                        </div>
                        <div class="flex items-center gap-3 font-mono text-xs shrink-0">
                            <span class="text-wf-text-secondary font-bold">{{ sec.weight_pct }}%</span>
                            <span class="text-[10px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded">
                                Cum: {{ sec.cumulative_pct }}%
                            </span>
                            <span class="text-wf-text-tertiary text-[10px] hidden sm:inline">
                                {{ formatCurrency(sec.invested_value) }}
                            </span>
                        </div>
                    </div>

                    <!-- Dual Pareto Progress Bar -->
                    <div class="relative w-full h-2.5 bg-wf-border-subtle/60 rounded-full overflow-hidden">
                        <!-- Individual sector bar -->
                        <div
                            class="h-full rounded-full transition-all duration-500"
                            :class="sec.is_top_80 ? 'bg-purple-600' : 'bg-purple-400/60'"
                            :style="{ width: `${Math.min(100, sec.weight_pct * 2.5)}%` }"
                        ></div>
                    </div>

                    <!-- Top Constituent Stocks Preview -->
                    <div v-if="sec.top_stocks && sec.top_stocks.length > 0" class="flex items-center gap-1.5 pt-1 text-[10px] text-wf-text-tertiary truncate">
                        <span class="font-medium text-wf-text-secondary shrink-0">Key Holdings:</span>
                        <span class="truncate">{{ formatKeyHoldings(sec.top_stocks) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
