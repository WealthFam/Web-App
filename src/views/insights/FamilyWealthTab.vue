<template>
    <div class="space-y-6 pb-10">
        <!-- Loading Skeleton -->
        <div v-if="loading" class="space-y-6 animate-pulse">
            <div class="h-64 rounded-wf-xl bg-slate-900/80 border border-slate-800"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="h-80 rounded-wf-xl bg-wf-surface-variant/40 border border-wf-border-subtle"></div>
                <div class="h-80 rounded-wf-xl bg-wf-surface-variant/40 border border-wf-border-subtle"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div v-for="i in 4" :key="`skel-m-${i}`" class="h-48 rounded-wf-xl bg-wf-surface-variant/40 border border-wf-border-subtle"></div>
            </div>
        </div>

        <template v-else-if="wealthData">
            <!-- Total Wealth Hero Card (Midnight Theme) -->
            <div class="relative rounded-wf-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white p-6 sm:p-8 shadow-wf-card overflow-hidden">
                <!-- Ambient Glow Elements -->
                <div class="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="space-y-4">
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-wf-pill text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-200 border border-white/15">
                            <ShieldCheck :size="14" class="text-blue-400" />
                            <span>Family Consolidated</span>
                        </div>

                        <div>
                            <span class="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                                Total Family Net Worth
                            </span>
                            <h1 class="text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight text-white">
                                {{ formatAmount(wealthData.total_net_worth) }}
                            </h1>
                        </div>

                        <!-- Asset & Liability Stats Chips -->
                        <div class="flex items-center gap-3 flex-wrap pt-1">
                            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-wf-pill bg-white/5 border border-white/10 text-xs font-semibold backdrop-blur-sm">
                                <TrendingUp :size="15" class="text-emerald-400" />
                                <span class="font-mono text-emerald-400 font-bold">{{ formatAmount(wealthData.total_assets) }}</span>
                                <span class="text-slate-400 text-[11px]">Assets</span>
                            </div>
                            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-wf-pill bg-white/5 border border-white/10 text-xs font-semibold backdrop-blur-sm">
                                <TrendingDown :size="15" class="text-rose-400" />
                                <span class="font-mono text-rose-400 font-bold">{{ formatAmount(wealthData.total_liabilities) }}</span>
                                <span class="text-slate-400 text-[11px]">Liabilities</span>
                            </div>
                        </div>
                    </div>

                    <!-- Member Avatar Stack -->
                    <div v-if="wealthData.members?.length" class="flex items-center -space-x-3 self-start md:self-center pr-2">
                        <div
                            v-for="(m, i) in wealthData.members.slice(0, 5)"
                            :key="m.user_id || i"
                            class="w-12 h-12 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-sm text-white shadow-md transition-transform hover:-translate-y-1"
                            :style="{ backgroundColor: chartPalette[i % chartPalette.length] }"
                            :title="m.name"
                        >
                            {{ m.name ? m.name.charAt(0).toUpperCase() : 'U' }}
                        </div>
                        <div
                            v-if="wealthData.members.length > 5"
                            class="w-12 h-12 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shadow-md"
                        >
                            +{{ wealthData.members.length - 5 }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Interactive Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <!-- Wealth Composition Bar Chart (7 cols) -->
                <div class="lg:col-span-7">
                    <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border h-full flex flex-col justify-between">
                        <div class="flex items-center gap-2.5 mb-4">
                            <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                                <BarChart3 :size="18" />
                            </div>
                            <div>
                                <h3 class="text-sm font-bold text-wf-text-primary leading-none">Wealth Composition</h3>
                                <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">Asset vs liability by member</p>
                            </div>
                        </div>

                        <div class="h-80 w-full">
                            <BaseChart
                                v-if="compositionChartData"
                                type="bar"
                                :data="compositionChartData"
                                :options="stackedChartOptions"
                                :height="320"
                            />
                        </div>
                    </WfCard>
                </div>

                <!-- Equity Distribution Doughnut Chart (5 cols) -->
                <div class="lg:col-span-5">
                    <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border h-full flex flex-col justify-between">
                        <div class="flex items-center gap-2.5 mb-4">
                            <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                                <PieChart :size="18" />
                            </div>
                            <div>
                                <h3 class="text-sm font-bold text-wf-text-primary leading-none">Equity Distribution</h3>
                                <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">Percentage of net family wealth</p>
                            </div>
                        </div>

                        <div class="h-80 w-full relative flex items-center justify-center">
                            <BaseChart
                                v-if="distributionChartData"
                                type="doughnut"
                                :data="distributionChartData"
                                :height="280"
                                :options="{ cutout: '75%', plugins: { legend: { display: false } } }"
                            />
                            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">TOTAL NET</span>
                                <span class="text-base font-bold font-mono text-wf-text-primary">{{ formatAmount(wealthData.total_net_worth) }}</span>
                            </div>
                        </div>
                    </WfCard>
                </div>
            </div>

            <!-- Member Profile Grid -->
            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <Users :size="18" class="text-wf-primary" />
                    <h2 class="text-sm font-bold text-wf-text-primary leading-none">Family Member Insights</h2>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <WfCard
                        v-for="(member, i) in wealthData.members"
                        :key="member.user_id || i"
                        variant="flat"
                        padding="md"
                        radius="xl"
                        class="border border-wf-border hover:shadow-wf-card-hover transition-all duration-200 flex flex-col justify-between"
                    >
                        <div class="space-y-3.5">
                            <div class="flex items-start justify-between gap-2">
                                <div
                                    class="w-12 h-12 rounded-wf-xl flex items-center justify-center font-bold text-base text-white shadow-xs"
                                    :style="{ backgroundColor: chartPalette[i % chartPalette.length] }"
                                >
                                    {{ member.name ? member.name.charAt(0).toUpperCase() : 'U' }}
                                </div>
                                <span
                                    class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold uppercase tracking-wider"
                                    :class="member.role === 'OWNER' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary border border-indigo-200 dark:border-indigo-900/50' : 'bg-wf-surface-variant text-wf-text-secondary'"
                                >
                                    {{ member.role }}
                                </span>
                            </div>

                            <div>
                                <h3 class="text-sm font-bold text-wf-text-primary truncate">{{ member.name }}</h3>
                                <div class="flex items-center justify-between text-xs mt-1">
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">Net Worth</span>
                                    <span class="font-bold font-mono text-wf-text-primary">{{ formatAmount(member.net_worth) }}</span>
                                </div>
                            </div>

                            <!-- Member Progress Bar -->
                            <div class="space-y-1">
                                <div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-wf-pill overflow-hidden">
                                    <div
                                        class="h-full rounded-wf-pill transition-all duration-300"
                                        :style="{
                                            width: `${Math.max(0, Math.min(wealthData.total_assets > 0 ? (member.net_worth / wealthData.total_assets) * 100 : 0, 100))}%`,
                                            backgroundColor: chartPalette[i % chartPalette.length]
                                        }"
                                    ></div>
                                </div>
                            </div>

                            <!-- Stats Footer -->
                            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-wf-border-subtle text-xs">
                                <div>
                                    <span class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted block">Accounts</span>
                                    <span class="font-bold font-mono text-wf-text-primary">{{ member.account_count }}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted block">Equity</span>
                                    <span class="font-bold font-mono text-wf-text-primary">
                                        {{ wealthData.total_assets > 0 ? ((member.net_worth / wealthData.total_assets) * 100).toFixed(1) : 0 }}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </WfCard>

                    <!-- Shared Wealth Card (if any accounts) -->
                    <WfCard
                        v-if="wealthData.shared?.account_count > 0"
                        variant="flat"
                        padding="md"
                        radius="xl"
                        class="border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20 hover:shadow-wf-card-hover transition-all duration-200 flex flex-col justify-between"
                    >
                        <div class="space-y-3.5">
                            <div class="flex items-start justify-between gap-2">
                                <div class="w-12 h-12 rounded-wf-xl bg-wf-primary text-white flex items-center justify-center font-bold text-base shadow-xs">
                                    <Users :size="22" />
                                </div>
                                <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold uppercase tracking-wider bg-wf-primary text-white">
                                    Collective
                                </span>
                            </div>

                            <div>
                                <h3 class="text-sm font-bold text-wf-text-primary">Shared Wealth</h3>
                                <div class="flex items-center justify-between text-xs mt-1">
                                    <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">Net Worth</span>
                                    <span class="font-bold font-mono text-wf-text-primary">{{ formatAmount(wealthData.shared.net_worth) }}</span>
                                </div>
                            </div>

                            <div class="space-y-1">
                                <div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-wf-pill overflow-hidden">
                                    <div
                                        class="h-full rounded-wf-pill bg-wf-primary transition-all duration-300"
                                        :style="{
                                            width: `${Math.max(0, Math.min(wealthData.total_assets > 0 ? (wealthData.shared.net_worth / wealthData.total_assets) * 100 : 0, 100))}%`
                                        }"
                                    ></div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-wf-border-subtle text-xs">
                                <div>
                                    <span class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted block">Accounts</span>
                                    <span class="font-bold font-mono text-wf-text-primary">{{ wealthData.shared.account_count }}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted block">Equity</span>
                                    <span class="font-bold font-mono text-wf-text-primary">
                                        {{ wealthData.total_assets > 0 ? ((wealthData.shared.net_worth / wealthData.total_assets) * 100).toFixed(1) : 0 }}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </WfCard>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import BaseChart from '@/components/BaseChart.vue'
import WfCard from '@/components/ui/WfCard.vue'
import { Users, PieChart, ShieldCheck, TrendingUp, TrendingDown, BarChart3 } from 'lucide-vue-next'

const { formatAmount } = useCurrency()

const wealthData = ref<any>(null)
const loading = ref(true)

const chartPalette = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#14B8A6'  // Teal
]

onMounted(async () => {
    loading.value = true
    try {
        const res = await financeApi.getFamilyWealth()
        wealthData.value = res.data
    } catch (e) {
        console.error("Failed to fetch family wealth data", e)
    } finally {
        loading.value = false
    }
})

const distributionChartData = computed(() => {
    if (!wealthData.value) return null

    const labels = [...wealthData.value.members.map((m: any) => m.name)]
    const data = [...wealthData.value.members.map((m: any) => Math.max(0, m.net_worth))]

    if (wealthData.value.shared?.net_worth > 0) {
        labels.push('Shared')
        data.push(wealthData.value.shared.net_worth)
    }

    return {
        labels,
        datasets: [{
            data,
            backgroundColor: chartPalette.slice(0, labels.length),
            hoverOffset: 12,
            borderWidth: 0,
            borderRadius: 6
        }]
    }
})

const compositionChartData = computed(() => {
    if (!wealthData.value) return null

    const labels = [...wealthData.value.members.map((m: any) => m.name)]
    if (wealthData.value.shared?.account_count > 0) labels.push('Shared')

    const assetsData = [...wealthData.value.members.map((m: any) => m.assets)]
    if (wealthData.value.shared?.account_count > 0) assetsData.push(wealthData.value.shared.assets)

    const liabilitiesData = [...wealthData.value.members.map((m: any) => m.liabilities)]
    if (wealthData.value.shared?.account_count > 0) liabilitiesData.push(wealthData.value.shared.liabilities)

    return {
        labels,
        datasets: [
            {
                label: 'Assets',
                data: assetsData,
                backgroundColor: '#10B981',
                borderRadius: 6
            },
            {
                label: 'Liabilities',
                data: liabilitiesData,
                backgroundColor: '#EF4444',
                borderRadius: 6
            }
        ]
    }
})

const stackedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'bottom' as const,
            labels: { boxWidth: 10, padding: 12, font: { size: 11, weight: 'bold' } }
        }
    },
    scales: {
        x: {
            stacked: true,
            grid: { display: false },
            ticks: {
                maxRotation: 45,
                autoSkip: true,
                font: { size: 11, weight: 'bold' }
            }
        },
        y: {
            stacked: true,
            grid: { color: 'rgba(150, 150, 150, 0.08)' },
            ticks: {
                callback: (val: any) => '₹' + val,
                font: { size: 10 }
            }
        }
    }
}
</script>
