<script setup lang="ts">
import { computed } from 'vue'
import { Layers, AlertTriangle, Building2 } from 'lucide-vue-next'

const props = defineProps<{
    data: any
    isLoading: boolean
}>()

const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0)
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(num)
}

const diversityScore = computed(() => Number(props.data?.portfolio_diversity_score || 85))

const scoreClassification = computed(() => {
    if (diversityScore.value >= 75) {
        return { label: 'High Diversity (Low Concentration)', color: 'text-emerald-600', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' }
    } else if (diversityScore.value >= 55) {
        return { label: 'Moderate Overlap (Standard)', color: 'text-blue-600', bg: 'bg-blue-500/15', border: 'border-blue-500/30' }
    }
    return { label: 'High Overlap Risk (Heavy Duplication)', color: 'text-red-600', bg: 'bg-red-500/15', border: 'border-red-500/30' }
})

const topHoldings = computed(() => {
    return (props.data?.top_holdings || props.data?.stock_concentration || []).slice(0, 10)
})
</script>

<template>
    <div class="bg-wf-surface border border-wf-border rounded-wf-lg p-5 sm:p-6 shadow-xs space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-wf-border-subtle">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-wf-lg bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                    <Layers class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="text-base font-bold text-wf-text-primary">Portfolio Overlap & Concentration Visualizer</h3>
                        <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            {{ data?.funds_count || 0 }} Funds Evaluated
                        </span>
                    </div>
                    <p class="text-xs text-wf-text-secondary">
                        Underlying stock duplication and single-stock exposure thresholds
                    </p>
                </div>
            </div>

            <!-- Diversity Score Pill & Gauge -->
            <div class="flex items-center gap-3 self-start sm:self-auto p-2 bg-wf-surface-variant/40 border border-wf-border-subtle rounded-wf-lg">
                <div class="text-right">
                    <div class="text-[10px] text-wf-text-tertiary">Diversity Score</div>
                    <div class="text-xs font-bold" :class="scoreClassification.color">
                        {{ scoreClassification.label }}
                    </div>
                </div>
                <div
                    class="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm font-mono shadow-xs"
                    :class="[scoreClassification.color, scoreClassification.bg, scoreClassification.border]"
                >
                    {{ diversityScore }}
                </div>
            </div>
        </div>

        <!-- Concentration Risk Alerts -->
        <div v-if="data?.concentration_alerts?.length > 0" class="space-y-2">
            <div
                v-for="(alert, idx) in data.concentration_alerts"
                :key="idx"
                class="p-3.5 rounded-wf-md border text-xs flex items-start gap-2.5"
                :class="alert.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'"
            >
                <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                    <div class="font-bold">{{ alert.title }}</div>
                    <div class="text-[11px] opacity-90 mt-0.5">{{ alert.description }}</div>
                </div>
            </div>
        </div>

        <!-- Visual Bar Chart: Top 10 Underlying Stock Exposures with Threshold Markers -->
        <div class="p-4 sm:p-5 bg-wf-surface-variant/30 border border-wf-border rounded-wf-xl space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h4 class="text-xs font-bold text-wf-text-primary flex items-center gap-1.5">
                        <Building2 class="w-4 h-4 text-blue-500" />
                        <span>Top 10 Effective Stock Exposures (Weighted Across All Funds)</span>
                    </h4>
                    <p class="text-[11px] text-wf-text-tertiary mt-0.5">
                        Guardrails: Safe (&le;10%), Warning (&gt;10%), Critical Risk (&gt;15%)
                    </p>
                </div>
                <!-- Threshold Legend -->
                <div class="flex items-center gap-3 text-[10px] font-mono shrink-0">
                    <span class="flex items-center gap-1 text-emerald-600 font-semibold"><span class="w-2 h-2 rounded-xs bg-emerald-500"></span> &le;10% Safe</span>
                    <span class="flex items-center gap-1 text-amber-600 font-semibold"><span class="w-2 h-2 rounded-xs bg-amber-500"></span> &gt;10% Warning</span>
                    <span class="flex items-center gap-1 text-red-600 font-semibold"><span class="w-2 h-2 rounded-xs bg-red-500"></span> &gt;15% Critical</span>
                </div>
            </div>

            <!-- Horizontal Bar Chart -->
            <div class="space-y-3 pt-2">
                <div
                    v-for="(stock, idx) in topHoldings"
                    :key="idx"
                    class="space-y-1"
                >
                    <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2 truncate max-w-[70%]">
                            <span class="w-4 text-[10px] text-wf-text-tertiary font-mono">{{ idx + 1 }}.</span>
                            <span class="font-bold text-wf-text-primary truncate">{{ stock.company_name || stock.stock_name }}</span>
                            <span class="px-1.5 py-0.2 rounded text-[9px] bg-wf-surface border border-wf-border-subtle text-wf-text-secondary truncate">
                                {{ stock.sector }}
                            </span>
                        </div>
                        <div class="flex items-center gap-2 font-mono text-xs shrink-0">
                            <span class="text-wf-text-tertiary text-[10px]">({{ formatCurrency(stock.effective_portfolio_value || stock.aggregate_value) }})</span>
                            <span
                                class="font-bold"
                                :class="{
                                    'text-red-600 dark:text-red-400': Number(stock.effective_portfolio_weight) > 15,
                                    'text-amber-600 dark:text-amber-400': Number(stock.effective_portfolio_weight) > 10 && Number(stock.effective_portfolio_weight) <= 15,
                                    'text-wf-text-primary': Number(stock.effective_portfolio_weight) <= 10
                                }"
                            >
                                {{ stock.effective_portfolio_weight }}%
                            </span>
                        </div>
                    </div>

                    <!-- Progress bar with 10% and 15% threshold markers -->
                    <div class="relative w-full h-3 bg-wf-border-subtle/70 rounded-full overflow-hidden">
                        <!-- 10% marker line -->
                        <div class="absolute top-0 bottom-0 left-[40%] w-[1px] bg-amber-500/50 z-10" title="10% Warning Threshold"></div>
                        <!-- 15% marker line -->
                        <div class="absolute top-0 bottom-0 left-[60%] w-[1px] bg-red-500/60 z-10" title="15% Critical Threshold"></div>

                        <!-- Bar fill (Scaled so 25% = 100% width) -->
                        <div
                            class="h-full rounded-full transition-all duration-500"
                            :class="{
                                'bg-red-500': Number(stock.effective_portfolio_weight) > 15,
                                'bg-amber-500': Number(stock.effective_portfolio_weight) > 10 && Number(stock.effective_portfolio_weight) <= 15,
                                'bg-blue-500': Number(stock.effective_portfolio_weight) <= 10
                            }"
                            :style="{ width: `${Math.min(100, (Number(stock.effective_portfolio_weight) / 25) * 100)}%` }"
                        ></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pairwise Fund Overlap Matrix Visual Cards -->
        <div v-if="data?.pairwise_overlap?.length > 0" class="space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-wf-text-primary">Pairwise Fund Overlap Spectrum</span>
                <span class="text-[10px] text-wf-text-tertiary">Percentage of shared holdings between schemes</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                    v-for="(pair, idx) in data.pairwise_overlap"
                    :key="idx"
                    class="p-3 bg-wf-surface border border-wf-border-subtle rounded-wf-md space-y-2 hover:border-wf-border transition-all"
                >
                    <div class="flex items-start justify-between gap-2 text-xs">
                        <div class="min-w-0">
                            <div class="font-bold text-wf-text-primary truncate">{{ pair.fund_a_name || pair.fund_1_name }}</div>
                            <div class="text-[10px] text-wf-text-tertiary">overlaps with</div>
                            <div class="font-bold text-wf-text-primary truncate">{{ pair.fund_b_name || pair.fund_2_name }}</div>
                        </div>

                        <div class="text-right shrink-0">
                            <div
                                class="text-base font-black font-mono"
                                :class="{
                                    'text-red-500': Number(pair.overlap_percentage) > 40,
                                    'text-amber-500': Number(pair.overlap_percentage) > 25 && Number(pair.overlap_percentage) <= 40,
                                    'text-emerald-500': Number(pair.overlap_percentage) <= 25
                                }"
                            >
                                {{ pair.overlap_percentage }}%
                            </div>
                            <div class="text-[10px] text-wf-text-tertiary font-mono">{{ pair.common_stocks_count }} stocks shared</div>
                        </div>
                    </div>

                    <!-- Visual Spectrum Bar -->
                    <div class="w-full h-1.5 bg-wf-border-subtle rounded-full overflow-hidden">
                        <div
                            class="h-full rounded-full transition-all"
                            :class="{
                                'bg-red-500': Number(pair.overlap_percentage) > 40,
                                'bg-amber-500': Number(pair.overlap_percentage) > 25 && Number(pair.overlap_percentage) <= 40,
                                'bg-emerald-500': Number(pair.overlap_percentage) <= 25
                            }"
                            :style="{ width: `${pair.overlap_percentage}%` }"
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
