<script setup lang="ts">
import { computed } from 'vue'
import { ShieldCheck, Clock, Sparkles, TrendingDown, Info, AlertTriangle } from 'lucide-vue-next'

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

const exemptionLimit = computed(() => Number(props.data?.annual_ltcg_exemption_limit || 125000))
const realizedLtcg = computed(() => Number(props.data?.realized_ltcg || 0))
const remainingHeadroom = computed(() => Number(props.data?.remaining_exemption_headroom || 0))
const exemptionUtilizedPct = computed(() => {
    return Math.min(100, Math.max(0, Number(props.data?.exemption_utilized_pct || 0)))
})

// SVG Gauge calculation (Circumference: 2 * pi * 45 ≈ 283)
const strokeDashoffset = computed(() => {
    const circumference = 283
    return circumference - (circumference * exemptionUtilizedPct.value) / 100
})
</script>

<template>
    <div class="bg-wf-surface border border-wf-border rounded-wf-lg p-5 sm:p-6 shadow-xs space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-wf-border-subtle">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-wf-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                    <ShieldCheck class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h3 class="text-base font-bold text-wf-text-primary">Tax Optimization Infographic</h3>
                        <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {{ data?.financial_year || 'FY 2024-25' }}
                        </span>
                    </div>
                    <p class="text-xs text-wf-text-secondary">
                        Finance Act 2024 Section 112A ₹1,25,000 exemption & harvesting roadmap
                    </p>
                </div>
            </div>

            <div v-if="data?.potential_harvesting_savings > 0" class="flex items-center gap-1.5 px-3 py-1.5 rounded-wf-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <Sparkles class="w-4 h-4 text-emerald-500" />
                <span>Est. Harvesting Savings: {{ formatCurrency(data.potential_harvesting_savings) }}</span>
            </div>
        </div>

        <!-- Infographic Visual Speedometer & Headroom Hero -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 p-5 bg-linear-to-br from-emerald-500/5 via-wf-surface-variant/30 to-teal-500/5 border border-emerald-500/20 rounded-wf-xl items-center">
            <!-- Radial Circular Gauge -->
            <div class="flex flex-col items-center justify-center text-center">
                <div class="relative w-32 h-32 flex items-center justify-center">
                    <svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            class="text-wf-border-subtle stroke-current"
                            stroke-width="10"
                            fill="transparent"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            class="text-emerald-500 stroke-current transition-all duration-700 ease-out"
                            stroke-width="10"
                            stroke-linecap="round"
                            fill="transparent"
                            stroke-dasharray="283"
                            :stroke-dashoffset="strokeDashoffset"
                        />
                    </svg>
                    <div class="absolute flex flex-col items-center">
                        <span class="text-2xl font-black text-wf-text-primary font-mono">{{ exemptionUtilizedPct }}%</span>
                        <span class="text-[9px] uppercase tracking-wider text-wf-text-tertiary font-bold">Utilized</span>
                    </div>
                </div>
                <div class="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Annual LTCG Exemption
                </div>
            </div>

            <!-- Headroom Metric Cards -->
            <div class="lg:col-span-2 space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-wf-border-subtle">
                    <span class="text-xs text-wf-text-secondary">Statutory Exemption Limit</span>
                    <span class="text-sm font-bold font-mono text-wf-text-primary">{{ formatCurrency(exemptionLimit) }}</span>
                </div>
                <div class="flex items-center justify-between pb-2 border-b border-wf-border-subtle">
                    <span class="text-xs text-wf-text-secondary">Realized LTCG This FY</span>
                    <span class="text-sm font-bold font-mono text-wf-text-primary">{{ formatCurrency(realizedLtcg) }}</span>
                </div>
                <div class="flex items-center justify-between pt-1">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">Remaining Tax-Free Headroom</span>
                        <span class="text-[11px] text-wf-text-tertiary">Realize up to this amount before March 31 @ 0% Tax</span>
                    </div>
                    <span class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {{ formatCurrency(remainingHeadroom) }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Infographic Tax Rules Comparison Cards: LTCG vs STCG -->
        <div class="space-y-2">
            <div class="text-xs font-bold text-wf-text-primary flex items-center gap-1.5">
                <Info class="w-3.5 h-3.5 text-wf-primary" />
                <span>Tax Regimes at a Glance (Finance Act 2024)</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- LTCG Infographic Card -->
                <div class="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-wf-lg space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span class="text-xs font-bold text-emerald-700 dark:text-emerald-300">Long-Term Capital Gains (LTCG)</span>
                        </div>
                        <span class="px-2 py-0.5 rounded text-xs font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono">
                            12.5% Tax
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="p-2 bg-wf-surface rounded-wf-md border border-emerald-500/15">
                            <div class="text-[10px] text-wf-text-tertiary">Qualifying Holding Period</div>
                            <div class="font-bold text-wf-text-primary mt-0.5">&gt; 365 Days</div>
                        </div>
                        <div class="p-2 bg-wf-surface rounded-wf-md border border-emerald-500/15">
                            <div class="text-[10px] text-wf-text-tertiary">Annual Exemption</div>
                            <div class="font-bold text-emerald-600 mt-0.5">₹1,25,000 / FY</div>
                        </div>
                    </div>
                    <p class="text-[11px] text-wf-text-secondary leading-relaxed">
                        Gains up to ₹1.25 Lakh per financial year are completely tax-free. Any surplus gains above this threshold are taxed at a preferential 12.5%.
                    </p>
                </div>

                <!-- STCG Infographic Card -->
                <div class="p-4 bg-amber-500/5 border border-amber-500/25 rounded-wf-lg space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            <span class="text-xs font-bold text-amber-700 dark:text-amber-300">Short-Term Capital Gains (STCG)</span>
                        </div>
                        <span class="px-2 py-0.5 rounded text-xs font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono">
                            20.0% Tax
                        </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="p-2 bg-wf-surface rounded-wf-md border border-amber-500/15">
                            <div class="text-[10px] text-wf-text-tertiary">Qualifying Holding Period</div>
                            <div class="font-bold text-wf-text-primary mt-0.5">&le; 365 Days</div>
                        </div>
                        <div class="p-2 bg-wf-surface rounded-wf-md border border-amber-500/15">
                            <div class="text-[10px] text-wf-text-tertiary">Annual Exemption</div>
                            <div class="font-bold text-amber-600 mt-0.5">Nil (₹0)</div>
                        </div>
                    </div>
                    <p class="text-[11px] text-wf-text-secondary leading-relaxed">
                        Taxed at a flat 20% on all gains from day one without any exemption headroom. Avoid premature redemption of near-LTCG lots to save 7.5% tax.
                    </p>
                </div>
            </div>
        </div>

        <!-- Actionable Tax Harvesting Opportunities -->
        <div v-if="data?.harvesting_opportunities?.length > 0" class="space-y-2.5">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-wf-text-primary flex items-center gap-1.5">
                    <TrendingDown class="w-3.5 h-3.5 text-indigo-500" />
                    <span>Actionable Tax-Loss & Exemption Harvesting Roadmap</span>
                </span>
                <span class="text-[10px] text-wf-text-tertiary">Reinvest to step up purchase cost base</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div
                    v-for="(item, idx) in data.harvesting_opportunities"
                    :key="idx"
                    class="p-3 bg-wf-surface-variant/40 border border-wf-border-subtle rounded-wf-md flex flex-col justify-between text-xs space-y-2"
                >
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <div class="font-semibold text-wf-text-primary truncate">{{ item.scheme_name }}</div>
                            <div class="text-[10px] text-wf-text-tertiary mt-0.5">
                                Folio: {{ item.folio_number || 'Main Folio' }} • Held for {{ item.holding_days || item.holding_period_days || 0 }} days
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shrink-0 font-mono">
                            Save {{ formatCurrency(item.estimated_tax_savings || item.estimated_tax_saved) }}
                        </span>
                    </div>

                    <div class="p-2 bg-wf-surface rounded border border-wf-border-subtle flex items-center justify-between text-[11px] font-mono">
                        <span class="text-wf-text-secondary font-sans">Suggested Redemption:</span>
                        <span class="font-bold text-wf-text-primary">{{ item.suggested_units_to_sell || item.units }} units (Gain: {{ formatCurrency(item.target_gains || item.gain_to_harvest) }})</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Near-LTCG Alerts -->
        <div v-if="data?.near_ltcg_alerts?.length > 0" class="space-y-2">
            <div class="text-xs font-bold text-wf-text-primary flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-amber-500" />
                <span>Near-LTCG Maturation Alerts (Hold to Save 7.5% Tax)</span>
            </div>

            <div class="space-y-2">
                <div
                    v-for="(alert, idx) in data.near_ltcg_alerts"
                    :key="idx"
                    class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-wf-md flex items-center justify-between text-xs"
                >
                    <div class="flex items-center gap-2.5 min-w-0 pr-2">
                        <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
                        <div class="truncate">
                            <div class="font-bold text-amber-900 dark:text-amber-200 truncate">{{ alert.scheme_name }}</div>
                            <div class="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                                Crosses 365 days in <b>{{ alert.days_remaining_to_ltcg || alert.days_remaining }} days</b>
                            </div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="font-bold text-emerald-600 font-mono text-sm">+{{ formatCurrency(alert.potential_tax_difference || alert.potential_tax_drop) }}</div>
                        <span class="text-[9px] uppercase tracking-wider text-wf-text-tertiary font-bold">Tax Saved If Held</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
