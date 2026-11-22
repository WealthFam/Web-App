<script setup lang="ts">
import { ref, computed } from 'vue'
import { Award, Sparkles, FileText, X, Compass, BarChart2 } from 'lucide-vue-next'

const props = defineProps<{
    data: any
    isLoading: boolean
}>()

const showFullAdvisorModal = ref(false)
const selectedFundForModal = ref<any | null>(null)

const formatPercent = (val: number | string | undefined) => {
    const num = Number(val || 0)
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

const fundsList = computed(() => {
    return props.data?.funds || []
})

// Compute Quadrant Positions for Alpha vs Beta Scatter Chart
// SVG dimensions: 500 wide by 260 high
// X-axis: Beta from 0.5 to 1.5 (Center = 1.0 at X=250)
// Y-axis: Alpha from -6% to +10% (Center = 0% at Y=130)
const plotPoints = computed(() => {
    return fundsList.value.map((f: any) => {
        const beta = Number(f.beta || 1.0)
        const alpha = Number(f.alpha || 0.0)

        // Clamp beta between 0.5 and 1.5 -> map to x: 40 to 460
        const clampedBeta = Math.max(0.5, Math.min(1.5, beta))
        const x = 40 + ((clampedBeta - 0.5) / 1.0) * 420

        // Clamp alpha between -6 and 10 -> map to y: 220 (at -6) down to 30 (at 10)
        const clampedAlpha = Math.max(-6, Math.min(10, alpha))
        const y = 220 - ((clampedAlpha + 6) / 16) * 190

        return {
            ...f,
            plotX: x,
            plotY: y,
            beta,
            alpha
        }
    })
})
</script>

<template>
    <div class="bg-wf-surface border border-wf-border rounded-wf-lg p-5 sm:p-6 shadow-xs space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-wf-border-subtle">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-wf-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                    <Award class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="text-base font-bold text-wf-text-primary">Peer Benchmarking & Alpha Quadrant Chart</h3>
                        <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Jensen's Alpha & Beta Scatter
                        </span>
                    </div>
                    <p class="text-xs text-wf-text-secondary">
                        Risk-adjusted metrics benchmarked against category TRI indices
                    </p>
                </div>
            </div>

            <div class="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                <span class="text-wf-text-tertiary">Top Outperformer:</span>
                <span class="font-bold text-wf-text-primary truncate max-w-[150px]">{{ data?.top_alpha_fund || 'Active Schemes' }}</span>
            </div>
        </div>

        <!-- 3 Quantitative Risk/Return KPI Tiles -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="p-3.5 bg-wf-surface-variant/50 border border-wf-border-subtle rounded-wf-md space-y-1">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-medium text-wf-text-secondary">Portfolio Alpha (α)</span>
                    <span class="text-[10px] text-emerald-600 font-bold">Excess Return</span>
                </div>
                <div class="text-2xl font-bold font-mono" :class="Number(data?.portfolio_alpha || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'">
                    {{ formatPercent(data?.portfolio_alpha) }}
                </div>
                <div class="text-[10px] text-wf-text-tertiary">Annualized excess over benchmark</div>
            </div>

            <div class="p-3.5 bg-wf-surface-variant/50 border border-wf-border-subtle rounded-wf-md space-y-1">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-medium text-wf-text-secondary">Portfolio Beta (β)</span>
                    <span class="text-[10px] text-blue-600 font-bold">Market Sensitivity</span>
                </div>
                <div class="text-2xl font-bold text-wf-text-primary font-mono">
                    {{ Number(data?.portfolio_beta || 1).toFixed(2) }}
                </div>
                <div class="text-[10px] text-wf-text-tertiary">1.0 = equal volatility to market</div>
            </div>

            <div class="p-3.5 bg-wf-surface-variant/50 border border-wf-border-subtle rounded-wf-md space-y-1">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-medium text-wf-text-secondary">Sharpe Ratio</span>
                    <span class="text-[10px] text-indigo-600 font-bold">Risk-Adjusted</span>
                </div>
                <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {{ Number(data?.portfolio_sharpe || 0).toFixed(2) }}
                </div>
                <div class="text-[10px] text-wf-text-tertiary">&gt;1.0 indicates attractive risk premium</div>
            </div>
        </div>

        <!-- Visual Risk-Return Quadrant Scatter Chart (Alpha on Y vs Beta on X) -->
        <div class="p-4 sm:p-5 bg-wf-surface-variant/30 border border-wf-border rounded-wf-xl space-y-3">
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="text-xs font-bold text-wf-text-primary flex items-center gap-1.5">
                        <Compass class="w-4 h-4 text-indigo-500" />
                        <span>Alpha vs. Beta Risk-Return Quadrant Matrix</span>
                    </h4>
                    <p class="text-[11px] text-wf-text-tertiary mt-0.5">
                        Ideal position: Top-Left Quadrant (High Alpha, Low Beta)
                    </p>
                </div>
            </div>

            <!-- SVG Quadrant Plot -->
            <div class="relative w-full aspect-5/2 sm:aspect-3/1 bg-wf-surface border border-wf-border-subtle rounded-wf-lg overflow-hidden p-2">
                <svg viewBox="0 0 500 260" class="w-full h-full">
                    <!-- Quadrant Background Tints -->
                    <!-- Top Left: Stars (High Alpha, Low Beta) -->
                    <rect x="40" y="30" width="210" height="100" fill="rgba(16, 185, 129, 0.08)" />
                    <text x="50" y="48" class="text-[9px] fill-emerald-600 font-bold">⭐ Star (High Alpha, Low Risk)</text>

                    <!-- Top Right: Aggressive Outperformers -->
                    <rect x="250" y="30" width="210" height="100" fill="rgba(99, 102, 241, 0.06)" />
                    <text x="260" y="48" class="text-[9px] fill-indigo-600 font-bold">🚀 Aggressive Outperformer</text>

                    <!-- Bottom Left: Defensive Laggards -->
                    <rect x="40" y="130" width="210" height="90" fill="rgba(107, 114, 128, 0.05)" />
                    <text x="50" y="210" class="text-[9px] fill-gray-500 font-bold">🛡️ Defensive Laggard</text>

                    <!-- Bottom Right: High-Risk Laggards -->
                    <rect x="250" y="130" width="210" height="90" fill="rgba(239, 68, 68, 0.06)" />
                    <text x="260" y="210" class="text-[9px] fill-red-500 font-bold">⚠️ High Risk Laggard</text>

                    <!-- Center Axis Lines -->
                    <line x1="250" y1="30" x2="250" y2="220" stroke="rgba(156, 163, 175, 0.5)" stroke-dasharray="3,3" stroke-width="1.5" />
                    <line x1="40" y1="130" x2="460" y2="130" stroke="rgba(156, 163, 175, 0.5)" stroke-dasharray="3,3" stroke-width="1.5" />

                    <!-- Axis Labels -->
                    <text x="252" y="235" class="text-[9px] fill-gray-400 font-mono">β = 1.0 (Market)</text>
                    <text x="420" y="125" class="text-[9px] fill-gray-400 font-mono">α = 0%</text>

                    <!-- Plotted Fund Circles -->
                    <g v-for="(p, pidx) in plotPoints" :key="pidx">
                        <circle
                            :cx="p.plotX"
                            :cy="p.plotY"
                            r="7"
                            :class="p.alpha >= 0 ? 'fill-emerald-500 stroke-white' : 'fill-red-500 stroke-white'"
                            stroke-width="2"
                            class="cursor-pointer hover:r-9 transition-all"
                            @click="selectedFundForModal = p"
                        />
                        <text
                            :x="p.plotX + 10"
                            :y="p.plotY + 3"
                            class="text-[9px] fill-gray-700 dark:fill-gray-200 font-semibold truncate max-w-[100px]"
                        >
                            {{ p.scheme_name.split(' ')[0] }} ({{ p.alpha >= 0 ? '+' : '' }}{{ p.alpha }}%)
                        </text>
                    </g>
                </svg>
            </div>
        </div>

        <!-- Scheme vs Category Benchmark 1Y Return Bar Comparison -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-wf-text-primary flex items-center gap-1.5">
                    <BarChart2 class="w-4 h-4 text-emerald-500" />
                    <span>Fund 1Y Return vs. Category Benchmark (TRI)</span>
                </span>
                <span class="text-[10px] text-wf-text-tertiary">Blue = Fund, Grey = Benchmark</span>
            </div>

            <div class="space-y-3">
                <div
                    v-for="(f, fidx) in fundsList"
                    :key="fidx"
                    class="p-3 bg-wf-surface border border-wf-border-subtle rounded-wf-md space-y-2 hover:border-wf-border transition-colors"
                >
                    <div class="flex items-center justify-between text-xs">
                        <div class="min-w-0 pr-2">
                            <span class="font-bold text-wf-text-primary truncate block">{{ f.scheme_name }}</span>
                            <span class="text-[10px] text-wf-text-tertiary truncate">vs {{ f.benchmark_label }}</span>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span
                                class="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                                :class="Number(f.alpha) >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'"
                            >
                                α {{ formatPercent(f.alpha) }}
                            </span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-wf-surface-variant text-wf-text-secondary border border-wf-border-subtle">
                                {{ typeof f.quartile_rank === 'number' ? 'Q' + f.quartile_rank : f.quartile_rank }}
                            </span>
                        </div>
                    </div>

                    <!-- Dual Comparison Bars -->
                    <div class="space-y-1 text-[11px] font-mono">
                        <div class="flex items-center gap-2">
                            <span class="w-12 text-[10px] text-wf-text-secondary">Fund:</span>
                            <div class="flex-1 h-2 bg-wf-border-subtle/50 rounded-full overflow-hidden">
                                <div
                                    class="h-full bg-blue-600 rounded-full"
                                    :style="{ width: `${Math.min(100, Math.max(5, Number(f.annualized_return) * 2.5))}%` }"
                                ></div>
                            </div>
                            <span class="w-12 text-right font-bold text-blue-600">{{ f.annualized_return }}%</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-12 text-[10px] text-wf-text-secondary">Bench:</span>
                            <div class="flex-1 h-2 bg-wf-border-subtle/50 rounded-full overflow-hidden">
                                <div
                                    class="h-full bg-gray-400 rounded-full"
                                    :style="{ width: `${Math.min(100, Math.max(5, Number(f.benchmark_return) * 2.5))}%` }"
                                ></div>
                            </div>
                            <span class="w-12 text-right text-wf-text-tertiary">{{ f.benchmark_return }}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Advisor Intelligence Highlights & Modal Trigger -->
        <div class="p-3.5 bg-linear-to-br from-indigo-500/5 via-wf-surface to-purple-500/5 border border-indigo-500/20 rounded-wf-lg shadow-2xs space-y-3">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <Sparkles class="w-4 h-4 text-indigo-500" />
                    <span>AI Advisor Intelligence Highlights</span>
                </div>
                <button
                    v-if="data?.advisor_insights_markdown"
                    type="button"
                    @click="showFullAdvisorModal = true"
                    class="px-2.5 py-1 rounded-wf-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                    <FileText class="w-3.5 h-3.5" />
                    <span>View Full Advisory Review</span>
                </button>
            </div>
        </div>

        <!-- Full AI Advisor Review Modal Dialog -->
        <div
            v-if="showFullAdvisorModal"
            class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <div class="bg-wf-surface border border-wf-border rounded-wf-lg max-w-2xl w-full p-5 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
                <div class="flex items-center justify-between pb-3 border-b border-wf-border-subtle shrink-0">
                    <div class="flex items-center gap-2">
                        <Sparkles class="w-4 h-4 text-indigo-500" />
                        <h4 class="text-sm font-bold text-wf-text-primary">Section 16.1 AI Advisor Comprehensive Report</h4>
                    </div>
                    <button
                        type="button"
                        @click="showFullAdvisorModal = false"
                        class="p-1 rounded text-wf-text-tertiary hover:text-wf-text-primary"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>

                <div class="overflow-y-auto pr-1 text-xs text-wf-text-secondary whitespace-pre-line leading-relaxed space-y-3">
                    {{ data?.advisor_insights_markdown }}
                </div>

                <div class="pt-3 border-t border-wf-border-subtle flex justify-end shrink-0">
                    <button
                        type="button"
                        @click="showFullAdvisorModal = false"
                        class="px-4 py-1.5 rounded-wf-md bg-wf-surface-variant hover:bg-wf-border text-wf-text-primary text-xs font-semibold"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
