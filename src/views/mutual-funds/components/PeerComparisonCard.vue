<script setup lang="ts">
import { ref, computed } from 'vue'
import { Award, Sparkles, FileText, X, Compass, BarChart2, TrendingUp, Zap, Shield, AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{
    data: any
    isLoading: boolean
}>()

const showFullAdvisorModal = ref(false)
const selectedFundForModal = ref<any | null>(null)
const hoveredFund = ref<any | null>(null)

const formatPercent = (val: number | string | undefined) => {
    const num = Number(val || 0)
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

const fundsList = computed(() => {
    return props.data?.funds || props.data?.fund_rankings || []
})

// Coordinate mapping parameters
// SVG dimensions: 600 wide by 320 high
// Active chart rect: X from 60 to 540 (width 480), Y from 35 to 275 (height 240)
// Center point: X = 300 (Beta = 1.0), Y = 155 (Alpha = 0.0%)
// Beta domain: [0.5, 1.5]
// Alpha domain: [-8.0%, +12.0%]
const mapCoords = (betaVal: number, alphaVal: number) => {
    const clampedBeta = Math.max(0.5, Math.min(1.5, betaVal))
    const x = 60 + ((clampedBeta - 0.5) / 1.0) * 480

    const clampedAlpha = Math.max(-8, Math.min(12, alphaVal))
    // 12% is top (y=35), -8% is bottom (y=275)
    const y = 275 - ((clampedAlpha + 8) / 20) * 240

    return { x, y }
}

// Portfolio overall point
const portfolioCoords = computed(() => {
    const beta = Number(props.data?.portfolio_beta ?? 1.0)
    const alpha = Number(props.data?.portfolio_alpha ?? 0.0)
    return {
        ...mapCoords(beta, alpha),
        beta,
        alpha
    }
})

// Plotted Fund Points
const plotPoints = computed(() => {
    return fundsList.value.map((f: any) => {
        const beta = Number(f.beta ?? 1.0)
        const alpha = Number(f.alpha ?? 0.0)
        const coords = mapCoords(beta, alpha)

        return {
            ...f,
            plotX: coords.x,
            plotY: coords.y,
            beta,
            alpha,
            shortName: (f.scheme_name || 'Scheme').split(' ').slice(0, 2).join(' ')
        }
    })
})

// Dynamic Portfolio Posture Assessment
const portfolioPosture = computed(() => {
    const alpha = portfolioCoords.value.alpha
    const beta = portfolioCoords.value.beta

    if (alpha >= 0 && beta <= 1.0) {
        return {
            quadrant: 'Star Outperformer',
            badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
            icon: Zap,
            headline: 'Optimal Capital Efficiency (High Alpha, Low Beta)',
            description: `Your portfolio generates ${formatPercent(alpha)} annualized excess returns over benchmark indices while maintaining lower systemic volatility (Beta ${beta.toFixed(2)}).`
        }
    } else if (alpha >= 0 && beta > 1.0) {
        return {
            quadrant: 'Aggressive Alpha',
            badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
            icon: TrendingUp,
            headline: 'High-Octane Growth Profile (High Alpha, High Beta)',
            description: `Your portfolio achieves robust excess return (${formatPercent(alpha)}), capitalizing on market upside with active risk factor exposure (Beta ${beta.toFixed(2)}).`
        }
    } else if (alpha < 0 && beta <= 1.0) {
        return {
            quadrant: 'Defensive Value',
            badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
            icon: Shield,
            headline: 'Low-Volatility Defensive Stance',
            description: `Systemic market risk is well-contained (Beta ${beta.toFixed(2)}), but portfolio alpha is lagging (${formatPercent(alpha)}). Consider reallocating low-quartile schemes.`
        }
    } else {
        return {
            quadrant: 'High Risk Lagging',
            badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
            icon: AlertTriangle,
            headline: 'Sub-Optimal Risk/Return Tradeoff',
            description: `The portfolio carries elevated volatility (Beta ${beta.toFixed(2)}) without compensatory alpha (${formatPercent(alpha)}). Targeted replacement of bottom-quartile funds is recommended.`
        }
    }
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
                <span class="font-bold text-wf-text-primary truncate max-w-[180px]">{{ data?.top_alpha_fund || 'Active Schemes' }}</span>
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
                    {{ Number(data?.portfolio_sharpe || data?.portfolio_sharpe_ratio || 0).toFixed(2) }}
                </div>
                <div class="text-[10px] text-wf-text-tertiary">&gt;1.0 indicates attractive risk premium</div>
            </div>
        </div>

        <!-- Visual Risk-Return Quadrant Scatter Chart (Alpha on Y vs Beta on X) -->
        <div class="p-4 sm:p-5 bg-wf-surface-variant/30 border border-wf-border rounded-wf-xl space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h4 class="text-xs font-bold text-wf-text-primary flex items-center gap-1.5">
                        <Compass class="w-4 h-4 text-indigo-500" />
                        <span>Alpha vs. Beta Risk-Return Quadrant Matrix</span>
                    </h4>
                    <p class="text-[11px] text-wf-text-tertiary mt-0.5">
                        Interactive cross-sectional map of active schemes vs category benchmark
                    </p>
                </div>
                <div class="flex items-center gap-3 text-[11px]">
                    <div class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs"></span>
                        <span class="text-wf-text-secondary">Individual Scheme</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 bg-indigo-500 inline-block ring-2 ring-indigo-500/30"></span>
                        <span class="text-wf-text-primary font-bold">Your Portfolio</span>
                    </div>
                </div>
            </div>

            <!-- SVG Quadrant Plot -->
            <div class="relative w-full aspect-5/3 sm:aspect-2/1 bg-wf-surface border border-wf-border-subtle rounded-wf-lg overflow-hidden select-none">
                <svg viewBox="0 0 600 320" class="w-full h-full">
                    <defs>
                        <!-- Radial Gradients for 4 Quadrants -->
                        <radialGradient id="starGradient" cx="20%" cy="20%" r="80%">
                            <stop offset="0%" stop-color="#10B981" stop-opacity="0.14" />
                            <stop offset="100%" stop-color="#10B981" stop-opacity="0.02" />
                        </radialGradient>
                        <radialGradient id="aggGradient" cx="80%" cy="20%" r="80%">
                            <stop offset="0%" stop-color="#6366F1" stop-opacity="0.14" />
                            <stop offset="100%" stop-color="#6366F1" stop-opacity="0.02" />
                        </radialGradient>
                        <radialGradient id="defGradient" cx="20%" cy="80%" r="80%">
                            <stop offset="0%" stop-color="#0EA5E9" stop-opacity="0.10" />
                            <stop offset="100%" stop-color="#0EA5E9" stop-opacity="0.02" />
                        </radialGradient>
                        <radialGradient id="riskGradient" cx="80%" cy="80%" r="80%">
                            <stop offset="0%" stop-color="#EF4444" stop-opacity="0.14" />
                            <stop offset="100%" stop-color="#EF4444" stop-opacity="0.02" />
                        </radialGradient>

                        <!-- Glow filter for Portfolio point -->
                        <filter id="portfolioGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <!-- Quadrant Background Zones -->
                    <!-- Top Left: Star (High Alpha, Low Beta) -->
                    <rect x="60" y="35" width="240" height="120" rx="4" fill="url(#starGradient)" />
                    <!-- Top Right: Aggressive Outperformer (High Alpha, High Beta) -->
                    <rect x="300" y="35" width="240" height="120" rx="4" fill="url(#aggGradient)" />
                    <!-- Bottom Left: Defensive / Low Risk (Low Alpha, Low Beta) -->
                    <rect x="60" y="155" width="240" height="120" rx="4" fill="url(#defGradient)" />
                    <!-- Bottom Right: High Risk Lagging (Low Alpha, High Beta) -->
                    <rect x="300" y="155" width="240" height="120" rx="4" fill="url(#riskGradient)" />

                    <!-- Quadrant Zone Watermarks / Badges -->
                    <g opacity="0.85">
                        <text x="75" y="58" class="text-[10px] font-bold fill-emerald-600 dark:fill-emerald-400">⭐ STAR OUTPERFORMER</text>
                        <text x="75" y="70" class="text-[8px] fill-emerald-600/70 font-mono">High Alpha • Low Beta (Ideal)</text>

                        <text x="405" y="58" class="text-[10px] font-bold fill-indigo-600 dark:fill-indigo-400">🚀 AGGRESSIVE ALPHA</text>
                        <text x="405" y="70" class="text-[8px] fill-indigo-600/70 font-mono">High Alpha • High Beta</text>

                        <text x="75" y="255" class="text-[10px] font-bold fill-sky-600 dark:fill-sky-400">🛡️ DEFENSIVE VALUE</text>
                        <text x="75" y="267" class="text-[8px] fill-sky-600/70 font-mono">Subdued Alpha • Low Volatility</text>

                        <text x="410" y="255" class="text-[10px] font-bold fill-rose-600 dark:fill-rose-400">⚠️ HIGH RISK LAGGING</text>
                        <text x="410" y="267" class="text-[8px] fill-rose-600/70 font-mono">Negative Alpha • High Volatility</text>
                    </g>

                    <!-- Auxiliary Guideline Grids -->
                    <line x1="180" y1="35" x2="180" y2="275" stroke="currentColor" class="text-wf-border-subtle" stroke-dasharray="2,4" stroke-width="0.75" />
                    <line x1="420" y1="35" x2="420" y2="275" stroke="currentColor" class="text-wf-border-subtle" stroke-dasharray="2,4" stroke-width="0.75" />
                    <line x1="60" y1="95" x2="540" y2="95" stroke="currentColor" class="text-wf-border-subtle" stroke-dasharray="2,4" stroke-width="0.75" />
                    <line x1="60" y1="215" x2="540" y2="215" stroke="currentColor" class="text-wf-border-subtle" stroke-dasharray="2,4" stroke-width="0.75" />

                    <!-- Center Crosshair Axes (Beta = 1.0, Alpha = 0.0%) -->
                    <line x1="300" y1="35" x2="300" y2="275" stroke="#64748B" stroke-width="1.5" stroke-dasharray="4,3" />
                    <line x1="60" y1="155" x2="540" y2="155" stroke="#64748B" stroke-width="1.5" stroke-dasharray="4,3" />

                    <!-- Axis Direction Markers / Labels -->
                    <text x="300" y="25" text-anchor="middle" class="text-[9px] font-bold fill-emerald-600 dark:fill-emerald-400">▲ Excess Return (Alpha > 0)</text>
                    <text x="300" y="295" text-anchor="middle" class="text-[9px] font-bold fill-rose-500">▼ Underperforming (Alpha &lt; 0)</text>

                    <text x="60" y="308" text-anchor="start" class="text-[9px] font-mono fill-wf-text-tertiary">◀ β 0.5 (Defensive)</text>
                    <text x="300" y="308" text-anchor="middle" class="text-[9px] font-mono font-bold fill-wf-text-secondary">β = 1.0 (Market Benchmark)</text>
                    <text x="540" y="308" text-anchor="end" class="text-[9px] font-mono fill-wf-text-tertiary">β 1.5 (Aggressive) ▶</text>

                    <text x="25" y="159" class="text-[9px] font-mono font-bold fill-wf-text-secondary">α = 0%</text>

                    <!-- Plotted Individual Funds -->
                    <g v-for="(p, pidx) in plotPoints" :key="pidx">
                        <!-- Connecting hairline on hover -->
                        <line
                            v-if="hoveredFund === p"
                            :x1="p.plotX"
                            :y1="p.plotY"
                            :x2="portfolioCoords.x"
                            :y2="portfolioCoords.y"
                            stroke="#6366F1"
                            stroke-width="1.5"
                            stroke-dasharray="3,3"
                            opacity="0.6"
                        />

                        <!-- Outer hover ring -->
                        <circle
                            v-if="hoveredFund === p"
                            :cx="p.plotX"
                            :cy="p.plotY"
                            r="12"
                            fill="none"
                            stroke="#10B981"
                            stroke-width="2"
                            opacity="0.8"
                        />

                        <!-- Fund Node Circle -->
                        <circle
                            :cx="p.plotX"
                            :cy="p.plotY"
                            :r="hoveredFund === p ? 8 : 6"
                            :class="p.alpha >= 0 ? 'fill-emerald-500 stroke-white dark:stroke-wf-surface' : 'fill-rose-500 stroke-white dark:stroke-wf-surface'"
                            stroke-width="2"
                            class="cursor-pointer transition-all duration-200"
                            @mouseenter="hoveredFund = p"
                            @mouseleave="hoveredFund = null"
                            @click="selectedFundForModal = p"
                        />

                        <!-- Scheme Short Label -->
                        <text
                            :x="p.plotX + 8"
                            :y="p.plotY + 3"
                            class="text-[9px] font-semibold fill-wf-text-primary pointer-events-none drop-shadow-xs"
                        >
                            {{ p.shortName }} ({{ p.alpha >= 0 ? '+' : '' }}{{ p.alpha.toFixed(1) }}%)
                        </text>
                    </g>

                    <!-- Your Portfolio Node (High-emphasis pulsing halo & target icon) -->
                    <g class="cursor-pointer" filter="url(#portfolioGlow)">
                        <!-- Outer Halo Ring -->
                        <circle
                            :cx="portfolioCoords.x"
                            :cy="portfolioCoords.y"
                            r="16"
                            fill="rgba(99, 102, 241, 0.15)"
                            stroke="#6366F1"
                            stroke-width="1.5"
                            class="animate-pulse"
                        />

                        <!-- Core Portfolio Circle -->
                        <circle
                            :cx="portfolioCoords.x"
                            :cy="portfolioCoords.y"
                            r="8"
                            fill="#6366F1"
                            stroke="#FFFFFF"
                            stroke-width="2.5"
                        />

                        <!-- Inner Bullseye Dot -->
                        <circle
                            :cx="portfolioCoords.x"
                            :cy="portfolioCoords.y"
                            r="2.5"
                            fill="#FFFFFF"
                        />

                        <!-- Portfolio Label Tag with Background Badge -->
                        <g :transform="`translate(${portfolioCoords.x > 380 ? portfolioCoords.x - 140 : portfolioCoords.x + 14}, ${portfolioCoords.y - 12})`">
                            <rect
                                x="0"
                                y="0"
                                width="128"
                                height="22"
                                rx="5"
                                fill="#1E1B4B"
                                stroke="#818CF8"
                                stroke-width="1"
                                opacity="0.95"
                            />
                            <text
                                x="6"
                                y="14"
                                class="text-[9px] font-bold fill-white font-mono"
                            >
                                🎯 You: α {{ formatPercent(portfolioCoords.alpha) }}, β {{ portfolioCoords.beta.toFixed(2) }}
                            </text>
                        </g>
                    </g>
                </svg>

                <!-- Floating Hover Tooltip Card -->
                <div
                    v-if="hoveredFund"
                    class="absolute top-3 right-3 z-10 max-w-[220px] p-2.5 bg-wf-surface/95 dark:bg-wf-surface/95 backdrop-blur-md border border-wf-border rounded-wf-md shadow-lg text-xs space-y-1.5 transition-all"
                >
                    <div class="font-bold text-wf-text-primary truncate">
                        {{ hoveredFund.scheme_name }}
                    </div>
                    <div class="text-[10px] text-wf-text-tertiary">
                        vs {{ hoveredFund.benchmark_label || 'Category TRI' }}
                    </div>
                    <div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-wf-border-subtle font-mono text-[11px]">
                        <div>
                            <span class="text-wf-text-tertiary block text-[9px]">Alpha (α)</span>
                            <span :class="hoveredFund.alpha >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'">
                                {{ formatPercent(hoveredFund.alpha) }}
                            </span>
                        </div>
                        <div>
                            <span class="text-wf-text-tertiary block text-[9px]">Beta (β)</span>
                            <span class="text-wf-text-primary font-bold">
                                {{ Number(hoveredFund.beta).toFixed(2) }}
                            </span>
                        </div>
                        <div>
                            <span class="text-wf-text-tertiary block text-[9px]">Sharpe</span>
                            <span class="text-indigo-600 font-bold">
                                {{ Number(hoveredFund.sharpe_ratio || hoveredFund.sharpe || 0).toFixed(2) }}
                            </span>
                        </div>
                        <div>
                            <span class="text-wf-text-tertiary block text-[9px]">1Y Return</span>
                            <span class="text-wf-text-primary font-bold">
                                {{ hoveredFund.annualized_return }}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Dynamic Executive Posture Takeaway Banner -->
            <div
                class="p-3.5 rounded-wf-lg border flex items-start gap-3 transition-colors"
                :class="portfolioPosture.badgeClass"
            >
                <component :is="portfolioPosture.icon" class="w-5 h-5 shrink-0 mt-0.5" />
                <div class="space-y-0.5">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold">{{ portfolioPosture.headline }}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 dark:bg-black/20">
                            {{ portfolioPosture.quadrant }}
                        </span>
                    </div>
                    <p class="text-[11px] leading-relaxed opacity-90">
                        {{ portfolioPosture.description }}
                    </p>
                </div>
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
                    class="p-3 bg-wf-surface border border-wf-border-subtle rounded-wf-md space-y-2 hover:border-wf-border transition-colors cursor-pointer"
                    @click="selectedFundForModal = f"
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
