<template>
    <v-container fluid class="pa-0 hide-scrollbars force-no-x-scroll">
        <!-- Market Pulse Row -->
        <div class="position-relative mb-6">
            <v-progress-linear v-if="isMarketPulseLoading" indeterminate color="primary" height="2"
                class="mb-4" style="z-index: 10"></v-progress-linear>

            <div class="d-flex align-center justify-space-between mb-4 px-1">
                <div class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Market Pulse</div>
                <v-btn-toggle v-model="marketPulsePeriod" mandatory variant="tonal" class="premium-toggle"
                    @update:model-value="fetchMarketIndices">
                    <v-btn value="1d" size="x-small" class="font-weight-black">1D</v-btn>
                    <v-btn value="7d" size="x-small" class="font-weight-black">7D</v-btn>
                    <v-btn value="30d" size="x-small" class="font-weight-black">30D</v-btn>
                </v-btn-toggle>
            </div>

            <v-row :class="{ 'opacity-50 pointer-events-none': isMarketPulseLoading && marketIndices.length }">
                <template v-if="isMarketPulseLoading && !marketIndices.length">
                    <v-col v-for="i in 6" :key="`pulse-skel-${i}`" cols="12" sm="6" md="4" lg="2">
                        <PremiumSkeleton type="pulse-card" glass />
                    </v-col>
                </template>
                <template v-else>
                    <v-col v-for="index in marketIndices" :key="index.name" cols="12" sm="6" md="4" lg="2">
                        <v-card class="premium-glass-card rounded-24 overflow-hidden border premium-market-card"
                            elevation="0">
                            <div class="pa-4 d-flex flex-column justify-space-between h-100">
                                <div class="mb-4">
                                    <div
                                        class="text-[10px] font-weight-black text-medium-emphasis uppercase letter-spacing-1 mb-1">
                                        {{ index.name }}</div>
                                    <div class="text-h6 font-weight-black text-content line-height-tight">{{ index.value
                                        }}</div>
                                    <div class="d-flex align-center gap-1 mt-1">
                                        <span class="text-[11px] font-weight-black"
                                            :class="index.isUp ? 'text-success' : 'text-error'">
                                            {{ index.change }} ({{ index.percent }})
                                        </span>
                                        <TrendingUp v-if="index.isUp" :size="10" class="text-success" />
                                        <TrendingDown v-else :size="10" class="text-error" />
                                    </div>
                                </div>
                                <div style="height: 32px" class="mt-auto">
                                    <Sparkline v-if="index.sparkline && index.sparkline.length > 1"
                                        :data="index.sparkline" :labels="index.labels"
                                        :color="index.isUp ? '#10b981' : '#ef4444'" :height="32" :smooth="true"
                                        :glow="true" :is-currency="false" />
                                </div>
                            </div>
                        </v-card>
                    </v-col>
                </template>
            </v-row>
        </div>
        <!-- Portfolio Header Summary -->
        <v-row class="mb-12">
            <template v-if="isLoading">
                <v-col cols="12" md="4" v-for="i in 3" :key="`skel-card-${i}`">
                    <PremiumSkeleton type="stat-card" glass />
                </v-col>
            </template>
            <template v-else>
                <!-- Current Value -->
                <v-col cols="12" md="4">
                    <v-card class="premium-glass-card h-100 pa-0 card-glow-transition d-flex flex-column"
                        :class="latestInsights.dayChange >= 0 ? 'hover-success-glow' : 'hover-error-glow'" rounded="24">
                        <div class="pa-8 pb-4">
                            <div class="d-flex align-center justify-space-between mb-4">
                                <span
                                    class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Current
                                    Value</span>
                                <div class="pa-2 rounded-lg"
                                    :class="latestInsights.dayChange >= 0 ? 'bg-success-opacity' : 'bg-error-opacity'">
                                    <TrendingUp v-if="latestInsights.dayChange >= 0" :size="18" class="text-success" />
                                    <TrendingDown v-else :size="18" class="text-error" />
                                </div>
                            </div>
                            <div>
                                <div class="text-h4 font-weight-black text-content mb-1">
                                    {{ formatAmount(portfolioStats.current) }}
                                </div>
                                <div class="d-flex align-center gap-2">
                                    <span :class="latestInsights.dayChange >= 0 ? 'text-success' : 'text-error'"
                                        class="text-caption font-weight-bold">
                                        {{ latestInsights.dayChange >= 0 ? '+' : '' }}{{
                                        formatAmount(latestInsights.dayChange) }}
                                        ({{ latestInsights.dayChangePercent.toFixed(2) }}%)
                                    </span>
                                    <span class="text-caption opacity-40 font-weight-bold uppercase">vs yesterday</span>
                                </div>
                            </div>
                        </div>

                        <v-spacer></v-spacer>

                        <div class="mt-auto">
                            <div class="px-8 d-flex align-center justify-space-between mb-2">
                                <span class="text-[10px] font-weight-black opacity-50 uppercase tracking-tighter">7D
                                    Trend</span>
                                <v-chip size="x-small" :color="portfolioStats.pl >= 0 ? 'success' : 'error'"
                                    variant="tonal" class="font-weight-black">
                                    {{ Math.abs(portfolioStats.plPercent).toFixed(2) }}% Returns
                                </v-chip>
                            </div>
                            <div class="px-2" style="height: 60px; margin-bottom: 8px;">
                                <Sparkline v-if="cvSparkline.length > 1" :data="cvSparkline"
                                    :color="latestInsights.dayChange >= 0 ? '#10b981' : '#ef4444'" :height="40" />
                            </div>
                        </div>
                    </v-card>
                </v-col>

                <!-- Total Invested -->
                <v-col cols="12" md="4">
                    <v-card
                        class="premium-glass-card h-100 pa-0 hover-primary-glow card-glow-transition d-flex flex-column"
                        rounded="24">
                        <div class="pa-8 pb-4">
                            <div class="d-flex align-center justify-space-between mb-4">
                                <span
                                    class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Invested
                                    Capital</span>
                                <div class="pa-2 rounded-lg bg-primary-opacity">
                                    <Clock :size="18" class="text-primary" />
                                </div>
                            </div>
                            <div>
                                <div class="text-h4 font-weight-black text-content mb-1">
                                    {{ formatAmount(portfolioStats.invested) }}
                                </div>
                                <div class="d-flex align-center gap-2">
                                    <span class="text-primary text-caption font-weight-bold">
                                        {{ (portfolioStats.current / (portfolioStats.invested || 1)).toFixed(2) }}x
                                    </span>
                                    <span class="text-caption opacity-40 font-weight-bold uppercase">Growth
                                        factor</span>
                                </div>
                            </div>
                        </div>

                        <v-spacer></v-spacer>

                        <div class="mt-auto">
                            <div class="px-8 d-flex align-center justify-space-between mb-2">
                                <span
                                    class="text-[10px] font-weight-black opacity-50 uppercase tracking-tighter">Accumulation
                                    Path</span>
                                <span class="text-[10px] font-weight-bold opacity-60">{{ portfolio.length }}
                                    Schemes</span>
                            </div>
                            <div class="px-2" style="height: 60px; margin-bottom: 8px;">
                                <Sparkline v-if="icSparkline.length > 1" :data="icSparkline" color="#3b82f6"
                                    :height="40" />
                            </div>
                        </div>
                    </v-card>
                </v-col>

                <!-- Overall P&L / XIRR -->
                <v-col cols="12" md="4">
                    <v-card class="premium-glass-card h-100 pa-0 card-glow-transition d-flex flex-column"
                        :class="portfolioStats.pl >= 0 ? 'hover-success-glow' : 'hover-error-glow'" rounded="24">
                        <div class="pa-8 pb-4">
                            <div class="d-flex align-center justify-space-between mb-4">
                                <span class="text-overline font-weight-black text-medium-emphasis letter-spacing-1">Net
                                    Gain/Loss</span>
                                <div class="pa-2 rounded-lg"
                                    :class="portfolioStats.pl >= 0 ? 'bg-success-opacity' : 'bg-error-opacity'">
                                    <Target :size="18"
                                        :class="portfolioStats.pl >= 0 ? 'text-success' : 'text-error'" />
                                </div>
                            </div>
                            <div>
                                <div class="text-h4 font-weight-black mb-1"
                                    :class="portfolioStats.pl >= 0 ? 'text-success' : 'text-error'">
                                    {{ portfolioStats.pl >= 0 ? '+' : '' }}{{ formatAmount(portfolioStats.pl) }}
                                </div>
                                <div class="d-flex align-center gap-2">
                                    <span :class="portfolioStats.pl >= 0 ? 'text-success' : 'text-error'"
                                        class="text-caption font-weight-bold" v-if="analytics?.xirr != null">
                                        {{ analytics.xirr.toFixed(2) }}% Annualized
                                    </span>
                                    <span class="text-caption opacity-40 font-weight-bold uppercase"
                                        v-if="analytics?.xirr != null">XIRR Return</span>
                                </div>
                            </div>
                        </div>

                        <v-spacer></v-spacer>

                        <div class="mt-auto">
                            <div class="px-8 d-flex align-center justify-space-between mb-2">
                                <span class="text-[10px] font-weight-black opacity-50 uppercase tracking-tighter">Profit
                                    Velocity</span>
                                <v-chip size="x-small" variant="tonal"
                                    :color="portfolioStats.pl >= 0 ? 'success' : 'error'"
                                    class="font-weight-black px-1">
                                    {{ portfolioStats.pl >= 0 ? 'PROFIT' : 'LOSS' }}
                                </v-chip>
                            </div>
                            <div class="px-2" style="height: 60px; margin-bottom: 8px;">
                                <Sparkline v-if="ngSparkline.length > 1" :data="ngSparkline"
                                    :color="portfolioStats.pl >= 0 ? '#10b981' : '#ef4444'" :height="40" />
                            </div>
                        </div>
                    </v-card>
                </v-col>
            </template>
        </v-row>

        <!-- Portfolio Performance Chart (Restored) -->
        <v-row class="mb-12">
            <v-col cols="12">
                <v-card class="premium-glass-card pa-10 overflow-hidden" rounded="32">
                    <div class="d-flex align-center justify-space-between mb-6">
                        <div>
                            <h3 class="text-subtitle-1 font-weight-black text-content d-flex align-center gap-2">
                                <Activity :size="20" class="text-primary" /> Performance Architecture
                            </h3>
                            <p class="text-caption opacity-60">Historical net value vs. invested capital trend</p>
                        </div>
                <div class="d-flex align-center gap-4">
                    <!-- Sync Status Indicator -->
                    <div v-if="mfStore.syncStatus" class="d-flex align-center gap-2 px-3 py-1 rounded-pill bg-surface-variant-opacity-10 border border-white-10">
                        <div class="status-dot" :class="mfStore.isSyncing ? 'status-syncing' : (mfStore.syncStatus.status === 'completed' ? 'status-online' : 'status-error')"></div>
                        <span class="text-[10px] font-weight-black opacity-60 uppercase letter-spacing-1">
                            {{ mfStore.isSyncing ? 'Syncing NAVs...' : (mfStore.syncStatus.status === 'completed' ? 'NAVs Current' : 'Sync Error') }}
                        </span>
                        <span v-if="!mfStore.isSyncing && mfStore.syncStatus.completed_at" class="text-[9px] opacity-40 font-weight-bold">
                            {{ formatDateShort(mfStore.syncStatus.completed_at) }}
                        </span>
                    </div>

                    <v-btn size="x-small" variant="tonal" color="primary" class="font-weight-black px-4"
                        @click="hardRefreshTimeline" :loading="isTimelineRefreshing">
                        <RefreshCcw :size="12" class="mr-1" /> RECALCULATE TRENDS
                    </v-btn>
                    
                    <v-menu location="bottom end">
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" icon size="small" variant="tonal" color="primary">
                                <Settings :size="16" />
                            </v-btn>
                        </template>
                        <v-list density="compact" rounded="xl" class="pa-2" width="240">
                            <v-list-item @click="mfStore.triggerSync" :disabled="mfStore.isSyncing" rounded="lg" class="mb-1">
                                <template v-slot:prepend><RefreshCcw :size="14" class="mr-3" /></template>
                                <v-list-item-title class="text-caption font-weight-bold">Sync Latest NAVs</v-list-item-title>
                            </v-list-item>
                            
                            <v-divider class="my-2 opacity-10"></v-divider>
                            
                            <v-list-item @click="handleRebuildHoldings" rounded="lg" class="mb-1" :loading="isRebuilding">
                                <template v-slot:prepend><Activity :size="14" class="mr-3 text-warning" /></template>
                                <v-list-item-title class="text-caption font-weight-bold">Rebuild Holdings</v-list-item-title>
                                <v-list-item-subtitle class="text-[9px]">Fixes unit/cost desync</v-list-item-subtitle>
                            </v-list-item>
                            
                            <v-list-item @click="handleCleanupDuplicates" rounded="lg">
                                <template v-slot:prepend><Trash2 :size="14" class="mr-3 text-error" /></template>
                                <v-list-item-title class="text-caption font-weight-bold">Cleanup Duplicates</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <div class="d-flex gap-2">
                                <v-chip size="small" variant="tonal" color="primary" class="font-weight-black">1 YEAR</v-chip>
                                <v-menu :close-on-content-click="false" location="bottom end">
                                    <template v-slot:activator="{ props }">
                                        <v-btn v-bind="props" size="small" variant="tonal" color="primary"
                                            class="font-weight-black">
                                            <TrendingUp :size="14" class="mr-2" /> BENCHMARKS
                                        </v-btn>
                                    </template>
                                    <v-list density="compact" class="pa-2" width="220" rounded="xl">
                                        <v-list-item v-for="bm in benchmarksData" :key="bm.symbol" density="compact"
                                            rounded="lg" class="mb-1">
                                            <template v-slot:prepend>
                                                <div class="mr-3"
                                                    :style="{ width: '12px', height: '12px', borderRadius: '3px', background: bm.styling?.color }">
                                                </div>
                                            </template>
                                            <v-list-item-title class="text-caption font-weight-bold">{{ bm.label
                                                }}</v-list-item-title>
                                            <template v-slot:append>
                                                <v-checkbox-btn v-model="selectedBenchmarkSymbols" :value="bm.symbol"
                                                    density="compact" color="primary"></v-checkbox-btn>
                                            </template>
                                        </v-list-item>
                                    </v-list>
                                </v-menu>
                            </div>
                        </div>
                    </div>

                    <div style="height: 320px; position: relative;">
                        <div v-if="isTimelineLoading" class="fill-height d-flex align-center justify-center">
                            <v-progress-circular indeterminate color="primary" />
                        </div>
                        <FundPerformanceChart v-else-if="timelineData.length" :data="timelineData"
                            :benchmarks="filteredBenchmarksData" :height="320" valueLabel="Portfolio Value"
                            investedLabel="Net Invested" @toggle-benchmark="(symbol) => {
                                if (selectedBenchmarkSymbols.includes(symbol)) {
                                    selectedBenchmarkSymbols = selectedBenchmarkSymbols.filter(s => s !== symbol)
                                } else {
                                    selectedBenchmarkSymbols.push(symbol)
                                }
                            }" />
                        <div v-else class="fill-height d-flex flex-column align-center justify-center opacity-40">
                            <div class="pa-4 rounded-circle bg-surface-variant mb-4">
                                <TrendingUp :size="32" />
                            </div>
                            <div class="text-body-2 font-weight-bold">Awaiting historical data synchronization...</div>
                        </div>
                    </div>
                </v-card>
            </v-col>
        </v-row>

        <!-- Category & Asset Allocation (Donut Charts) -->
        <v-row class="mb-12" v-if="analytics">
            <v-col cols="12" md="6">
                <v-card class="premium-glass-card pa-10 h-100 rounded-32" elevation="0">
                    <div class="d-flex align-center justify-space-between mb-10">
                        <div>
                            <h3 class="text-h6 font-weight-black text-content uppercase letter-spacing-1">Category
                                Exposure</h3>
                            <p class="text-caption opacity-60">Portfolio diversification by scheme type</p>
                        </div>
                        <v-avatar color="primary-lighten" size="44">
                            <Target :size="24" class="text-primary" />
                        </v-avatar>
                    </div>

                    <div class="px-4">
                        <PortfolioDonutChart :data="categoryData" label="Type" :size="260" :strokeWidth="18"
                            showLegend />
                    </div>
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card class="premium-glass-card pa-10 h-100 rounded-32" elevation="0">
                    <div class="d-flex align-center justify-space-between mb-10">
                        <div>
                            <h3 class="text-h6 font-weight-black text-content uppercase letter-spacing-1">Asset
                                Allocation</h3>
                            <p class="text-caption opacity-60">Broad asset class distribution</p>
                        </div>
                        <v-avatar color="secondary-lighten" size="44">
                            <Briefcase :size="24" class="text-secondary" />
                        </v-avatar>
                    </div>

                    <div class="px-4">
                        <PortfolioDonutChart :data="assetData" label="Assets" :size="260" :strokeWidth="18"
                            showLegend />
                    </div>
                </v-card>
            </v-col>
        </v-row>

        <!-- Insights Row -->
        <v-row class="mb-12">
            <!-- AI Advisor CTA -->
            <v-col cols="12" md="6">
                <v-card class="premium-glass-card h-100 rounded-24 transition-all hover-glow border-primary-glow"
                    @click="router.push({ name: 'portfolio-analysis' })" style="cursor: pointer">
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
                            Analyze category exposure, rebalancing guardrails, and AI-driven growth detection for your
                            complete
                            portfolio.
                        </p>
                        <v-spacer></v-spacer>
                        <div class="d-flex align-center gap-2">
                            <div class="analysis-status-pill">AI ANALYSIS READY</div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- Top Performance Snapshot -->
            <v-col cols="12" md="6">
                <v-card class="premium-glass-card h-100 pa-0 overflow-hidden rounded-24" elevation="0">
                    <div class="pa-8 d-flex align-center justify-space-between">
                        <div>
                            <h3 class="text-subtitle-1 font-weight-black text-content uppercase letter-spacing-1">Market
                                Velocity</h3>
                            <p class="text-caption opacity-60">Top performing and declining assets</p>
                        </div>
                        <v-chip size="x-small" variant="tonal" color="primary" class="font-weight-black">TOP
                            MOVERS</v-chip>
                    </div>

                    <div class="px-8 pb-8">
                        <v-row>
                            <v-col cols="6" class="border-e">
                                <h4
                                    class="text-[10px] font-weight-black text-success mb-4 uppercase letter-spacing-1 d-flex align-center gap-1">
                                    <TrendingUp :size="12" /> Top Gainers
                                </h4>
                                <div class="d-flex flex-column gap-4">
                                    <div v-for="item in topGainers" :key="item.id" class="mini-mover-row group pointer"
                                        @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                                        <div
                                            class="text-truncate text-[11px] font-weight-black text-content group-hover:text-primary transition-all flex-grow-1 mr-4"
                                            style="min-width: 0">
                                            {{ item.scheme_name }}</div>
                                        <div class="text-success font-weight-black text-[11px] flex-shrink-0" style="white-space: nowrap">+{{
                                            formatAmount(item.profit_loss) }}</div>
                                    </div>
                                    <div v-if="!topGainers.length" class="text-[10px] opacity-30 py-2">No gainers found
                                    </div>
                                </div>
                            </v-col>

                            <v-col cols="6" class="ps-6">
                                <h4
                                    class="text-[10px] font-weight-black text-error mb-4 uppercase letter-spacing-1 d-flex align-center gap-1">
                                    <TrendingDown :size="12" /> Top Losers
                                </h4>
                                <div class="d-flex flex-column gap-4">
                                    <div v-for="item in topLosers" :key="item.id" class="mini-mover-row group pointer"
                                        @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                                        <div
                                            class="text-truncate text-[11px] font-weight-black text-content group-hover:text-primary transition-all flex-grow-1 mr-4"
                                            style="min-width: 0">
                                            {{ item.scheme_name }}</div>
                                        <div class="text-error font-weight-black text-[11px] flex-shrink-0" style="white-space: nowrap">{{
                                            formatAmount(item.profit_loss)
                                            }}</div>
                                    </div>
                                    <div v-if="!topLosers.length" class="text-[10px] opacity-30 py-2">All funds positive
                                    </div>
                                </div>
                            </v-col>
                        </v-row>
                    </div>
                </v-card>
            </v-col>
        </v-row>

        <!-- Holdings Table -->
        <v-card class="premium-glass-card rounded-24 overflow-visible border" elevation="0">
            <div class="px-4 py-4 d-flex justify-space-between align-center border-b">
                <div>
                    <h3 class="text-subtitle-1 font-weight-black text-content">Portfolio Holdings</h3>
                    <p class="text-[10px] text-medium-emphasis">Complete breakdown of all registered folios</p>
                </div>
                <v-text-field v-model="search" density="compact" variant="outlined" hide-details placeholder="Search..."
                    style="max-width: 200px" class="glass-input-rounded text-caption">
                    <template v-slot:prepend-inner>
                        <Search :size="18" class="text-medium-emphasis mr-2" />
                    </template>
                </v-text-field>
            </div>

            <div v-if="isLoading">
                <div v-for="i in 5" :key="`skel-table-${i}`"
                    class="d-flex align-center px-8 py-6 border-b glass-loader-row">
                    <v-skeleton-loader type="avatar" size="32" class="mr-4 skeleton-glass"></v-skeleton-loader>
                    <div class="flex-grow-1 mr-4">
                        <v-skeleton-loader type="text" width="40%" class="mb-1 skeleton-glass"></v-skeleton-loader>
                        <v-skeleton-loader type="text" width="20%" height="12"
                            class="skeleton-glass"></v-skeleton-loader>
                    </div>
                </div>
            </div>

            <v-data-table v-else :headers="headers" :items="sortedPortfolio" :search="search" hover
                class="premium-table-hardened bg-transparent no-scroll-table" density="comfortable" item-value="id"
                v-model:expanded="expanded" :items-per-page="10" height="auto">
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

                        <div class="cursor-pointer group flex-grow-1 overflow-hidden"
                            @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                            <div
                                class="font-weight-black text-body-2 text-content group-hover-text-primary transition-all text-truncate">
                                {{ item.scheme_name }}</div>
                            <div class="d-flex align-center gap-2 mt-1 wrap">
                                <span class="text-[10px] font-weight-black opacity-50">{{ item.scheme_code }}</span>
                                <v-chip v-if="item.goal_id" size="x-small" color="success" variant="flat"
                                    class="font-weight-black text-[9px] px-1" height="16">
                                    {{ item.goal_name || 'LINKED' }}
                                </v-chip>
                                <span class="text-[10px] font-weight-black text-primary opacity-80" v-if="item.units">
                                    {{ Number(item.units).toFixed(2) }} Units @ {{ formatAmount(item.average_price) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Category -->
                <template #[`item.category`]="{ item }">
                    <v-chip size="x-small" variant="tonal" color="primary"
                        class="font-weight-black letter-spacing-1 px-2" style="font-size: 9px">
                        {{ item.category?.toUpperCase() || 'OTHER' }}
                    </v-chip>
                </template>

                <!-- Sparkline Trend -->
                <template #[`item.sparkline`]="{ item }">
                    <div class="d-flex align-center justify-center" style="height: 100%">
                        <div v-if="item.sparkline && item.sparkline.length > 1" style="width: 100px; height: 24px">
                            <Sparkline :data="item.sparkline" :color="item.profit_loss >= 0 ? '#10b981' : '#ef4444'"
                                :height="24" :width="100" />
                        </div>
                        <div v-else class="text-[10px] opacity-20 text-center">NO TREND</div>
                    </div>
                </template>

                <!-- Value Columns -->
                <template #[`item.current_value`]="{ item }">
                    <div class="d-flex flex-column align-end">
                        <span class="font-weight-black text-body-2">{{ formatAmount(item.current_value) }}</span>
                        <div v-if="item.last_nav" class="text-[9px] opacity-60 font-weight-bold">
                            NAV {{ formatAmount(item.last_nav) }} <span class="opacity-70">({{ item.last_updated_at
                                }})</span>
                        </div>
                    </div>
                </template>

                <template #[`item.profit_loss`]="{ item }">
                    <div class="d-flex flex-column align-end">
                        <span :class="item.profit_loss >= 0 ? 'text-success' : 'text-error'"
                            class="font-weight-black text-body-2">
                            {{ item.profit_loss >= 0 ? '+' : '' }}{{ formatAmount(item.profit_loss) }}
                        </span>
                        <div :class="item.profit_loss >= 0 ? 'text-success' : 'text-error'"
                            class="text-[10px] font-weight-black opacity-80">
                            {{ item.profit_loss >= 0 ? '▲' : '▼' }} {{ Number(item.profit_loss_pct || 0).toFixed(2) }}%
                        </div>
                    </div>
                </template>

                <!-- Actions -->
                <template #[`item.actions`]="{ item }">
                    <div class="d-flex justify-end gap-1">
                        <v-btn icon variant="tonal" density="compact" color="primary" class="rounded-lg" icon-only
                            @click="item.has_multiple ? $router.push(`/mutual-funds/${item.scheme_code}?type=aggregate`) : $router.push(`/mutual-funds/${item.id}`)">
                            <EyeIconMain :size="16" />
                        </v-btn>
                        <v-btn icon variant="tonal" density="compact" color="error" class="rounded-lg"
                            @click="openDeleteModal(item)">
                            <Trash2 :size="16" />
                        </v-btn>
                    </div>
                </template>

                <!-- Expanded Row for Grouped Folios -->
                <template #expanded-row="{ columns, item }">
                    <tr>
                        <td :colspan="columns.length" class="pa-0">
                            <div class="bg-surface-variant-opacity-10 py-1">
                                <div v-for="child in item.children" :key="child.id"
                                    class="d-flex align-center px-6 py-3 border-b hover-bg-opacity-5 transition-all"
                                    style="min-height: 64px">
                                    <div class="flex-grow-1">
                                        <div
                                            class="text-caption font-weight-black opacity-60 uppercase letter-spacing-1">
                                            Folio</div>
                                        <div class="text-body-2 font-weight-bold">{{ child.folio_number || 'Direct' }}
                                        </div>
                                    </div>
                                    <div class="mx-4 text-right" style="min-width: 100px">
                                        <div
                                            class="text-caption font-weight-black opacity-60 uppercase letter-spacing-1">
                                            Units</div>
                                        <div class="text-body-2 font-weight-bold">{{ Number(child.units).toFixed(3) }}
                                        </div>
                                    </div>
                                    <div class="mx-4 text-center d-flex flex-column align-center justify-center"
                                        style="min-width: 100px">
                                        <div
                                            class="text-[9px] font-weight-black opacity-60 uppercase letter-spacing-1 mb-1">
                                            Trend</div>
                                        <div v-if="child.sparkline && child.sparkline.length > 1"
                                            style="height: 16px; width: 80px">
                                            <Sparkline :data="child.sparkline"
                                                :color="child.profit_loss >= 0 ? '#10b981' : '#ef4444'" :height="16"
                                                :width="80" />
                                        </div>
                                        <div v-else class="text-[9px] opacity-30">N/A</div>
                                    </div>
                                    <div class="mx-4 text-right" style="min-width: 120px">
                                        <div
                                            class="text-caption font-weight-black opacity-60 uppercase letter-spacing-1">
                                            Current</div>
                                        <div class="text-body-2 font-weight-black">{{ formatAmount(child.current_value)
                                            }}</div>
                                    </div>
                                    <div class="d-flex gap-1 ml-8">
                                        <v-btn icon variant="tonal" density="compact" color="primary" class="rounded-lg"
                                            @click="$router.push(`/mutual-funds/${child.id}`)">
                                            <EyeIconMain :size="14" />
                                        </v-btn>
                                        <v-btn icon variant="tonal" density="compact" color="error" class="rounded-lg"
                                            @click="openDeleteModal(child)">
                                            <Trash2 :size="14" />
                                        </v-btn>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </template>
            </v-data-table>
        </v-card>

        <!-- Modals -->
        <LinkGoalModal v-model="showLinkGoalModal" :holding="selectedHolding" @saved="fetchPortfolio" />
        <DeleteHoldingDeepDiveModal v-model="showDeleteModal" :holding="selectedHolding" :loading="isManagementLoading"
            @delete-holding="handleDeleteHolding" @delete-transactions="handleBulkDelete" />
    </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
    TrendingUp, TrendingDown, Clock, Search, Target, Sparkles,
    ExternalLink, Eye as EyeIconMain, ChevronDown, ChevronRight,
    Trash2, Activity, Briefcase, RefreshCcw, Settings
} from 'lucide-vue-next'

import { useMutualFundStore } from '@/stores/finance/mutualFunds'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'

import PremiumSkeleton from '@/components/common/PremiumSkeleton.vue'
import Sparkline from '@/components/Sparkline.vue'
import FundPerformanceChart from './components/FundPerformanceChart.vue'
import PortfolioDonutChart from './components/PortfolioDonutChart.vue'
import LinkGoalModal from './modals/LinkGoalModal.vue'
import DeleteHoldingDeepDiveModal from './modals/DeleteHoldingDeepDiveModal.vue'



const router = useRouter()
const mfStore = useMutualFundStore()
const authStore = useAuthStore()
const { formatAmount } = useCurrency()
const notify = useNotificationStore()

// State
const props = defineProps<{
    active?: boolean
}>()

const portfolio = ref<any[]>([])
const analytics = ref<any>(null)
const timelineData = ref<any[]>([])
const benchmarkData = ref<any[]>([]); const benchmarksData = ref<any[]>([]); const selectedBenchmarkSymbols = ref<string[]>([])
const isLoading = ref(true)
const isTimelineLoading = ref(true)
const isTimelineRefreshing = ref(false)
const search = ref('')
const expanded = ref<string[]>([])
const selectedHolding = ref<any>(null)
const showLinkGoalModal = ref(false)
const showDeleteModal = ref(false)
const isManagementLoading = ref(false)
const marketIndices = ref<any[]>([])
const marketPulsePeriod = ref('1d')
const isMarketPulseLoading = ref(false)
const isRebuilding = ref(false)

// Headers
const headers = [
    { title: 'Scheme Details', key: 'scheme_name', align: 'start' as const, width: '30%' },
    { title: 'Category', key: 'category', align: 'start' as const, minWidth: '100px' },
    { title: 'Trend', key: 'sparkline', align: 'center' as const, sortable: false, width: '100px' },
    { title: 'Invested', key: 'invested_value', align: 'end' as const, minWidth: '110px' },
    { title: 'Current Value', key: 'current_value', align: 'end' as const, minWidth: '110px' },
    { title: 'Returns', key: 'profit_loss', align: 'end' as const, minWidth: '110px' },
    { title: '', key: 'actions', align: 'end' as const, sortable: false, width: '90px' },
]

// Computed
const portfolioStats = computed(() => {
    if (!portfolio.value.length) return { invested: 0, current: 0, pl: 0, plPercent: 0 }
    const invested = portfolio.value.reduce((s, i) => s + (Number(i.invested_value) || 0), 0)
    const current = portfolio.value.reduce((s, i) => s + (Number(i.current_value) || 0), 0)
    const pl = current - invested
    return { invested, current, pl, plPercent: invested ? (pl / invested) * 100 : 0 }
})

const cvSparkline = computed(() => timelineData.value.map(d => d.value))
const icSparkline = computed(() => timelineData.value.map(d => d.invested))
const ngSparkline = computed(() => timelineData.value.map(d => d.value - d.invested))

const latestInsights = computed(() => {
    if (timelineData.value.length < 2) return { dayChange: 0, dayChangePercent: 0 }
    const last = timelineData.value[timelineData.value.length - 1]
    const prev = timelineData.value[timelineData.value.length - 2]
    const dayChange = last.value - prev.value
    const dayChangePercent = prev.value ? (dayChange / prev.value) * 100 : 0
    return { dayChange, dayChangePercent }
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
                category: items[0].category,
                sparkline: items[0].sparkline,
                last_nav: items[0].last_nav,
                last_updated_at: items[0].last_updated_at,
                units: items.reduce((s, i) => s + Number(i.units), 0),
                average_price: totalInv / items.reduce((s, i) => s + Number(i.units), 1),
                goal_name: items.find(i => i.goal_name)?.goal_name,
                invested_value: totalInv,
                current_value: totalCur,
                profit_loss: totalCur - totalInv,
                profit_loss_pct: ((totalCur - totalInv) / (totalInv || 1)) * 100,
                has_multiple: true,
                children: items
            })
        } else {
            result.push({ ...items[0], has_multiple: false })
        }
    })
    return result
})

const topGainers = computed(() => sortedPortfolio.value.filter(i => i.profit_loss > 0).sort((a, b) => b.profit_loss - a.profit_loss).slice(0, 3))
const topLosers = computed(() => sortedPortfolio.value.filter(i => i.profit_loss < 0).sort((a, b) => a.profit_loss - b.profit_loss).slice(0, 3))

const categoryData = computed(() => {
    if (!analytics.value?.category_allocation) return []
    return Object.entries(analytics.value.category_allocation).map(([label, value]) => ({
        label,
        value: Number(value)
    })).sort((a, b) => b.value - a.value)
})

const assetData = computed(() => {
    if (!analytics.value?.asset_allocation) return []
    return Object.entries(analytics.value.asset_allocation).map(([label, value]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value: Number(value)
    })).filter(i => i.value > 0)
})


const filteredBenchmarksData = computed(() => {
    return benchmarksData.value.filter(bm => selectedBenchmarkSymbols.value.includes(bm.symbol))
})

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

async function fetchPortfolioTimeline() {
    isTimelineLoading.value = true
    try {
        // Fetch portfolio-wide timeline (no scheme_code/holding_id)
        const res = await financeApi.getPerformanceTimeline('1y', '1d', authStore.selectedMemberId || undefined)
        timelineData.value = res.data?.timeline || []
        benchmarkData.value = res.data?.benchmark || []
        benchmarksData.value = res.data?.benchmarks || [];
        if (selectedBenchmarkSymbols.value.length === 0 && benchmarksData.value.length > 0) {
            // Default to Nifty 50 if available, else first standard
            const nifty = benchmarksData.value.find(b => b.symbol === '120716');
            selectedBenchmarkSymbols.value = nifty ? [nifty.symbol] : [benchmarksData.value[0].symbol];
        }
    } catch (e) {
        console.error("Failed to fetch portfolio timeline", e)
    } finally {
        isTimelineLoading.value = false
    }
}

async function fetchMarketIndices() {
    isMarketPulseLoading.value = true
    try {
        const res = await financeApi.getMarketIndices(marketPulsePeriod.value)
        marketIndices.value = res.data?.data || res.data || []
    } catch (e) {
        console.error("Failed to fetch market indices", e)
    } finally {
        isMarketPulseLoading.value = false
    }
}

async function handleRebuildHoldings() {
    isRebuilding.value = true
    try {
        await mfStore.rebuildHoldings()
        await refreshAll()
    } finally {
        isRebuilding.value = false
    }
}

async function handleCleanupDuplicates() {
    try {
        await mfStore.cleanupDuplicates()
        await refreshAll()
    } catch (e) { console.error(e) }
}

async function refreshAll() {
    await Promise.all([
        fetchPortfolio(),
        fetchAnalytics(),
        fetchPortfolioTimeline()
    ])
}

function formatDateShort(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

async function hardRefreshTimeline() {
    isTimelineRefreshing.value = true
    try {
        await mfStore.hardRefreshPortfolio()
        await fetchTimeline()
    } catch (e) {
        console.error("Manual refresh failed:", e)
    } finally {
        isTimelineRefreshing.value = false
    }
}

onMounted(() => {
    fetchPortfolio()
    fetchAnalytics()
    fetchPortfolioTimeline()
    fetchMarketIndices()
})

// Refresh data when tab becomes active
watch(() => props.active, (isActive) => {
    if (isActive) {
        fetchPortfolio()
        fetchAnalytics()
        fetchPortfolioTimeline()
        fetchMarketIndices()
    }
})

const emit = defineEmits(['update:count'])
watch(portfolio, (val) => emit('update:count', val.length))
</script>

<style scoped>
.rounded-20 {
    border-radius: 20px !important;
}

.rounded-24 {
    border-radius: 24px !important;
}

.letter-spacing-1 {
    letter-spacing: 1px;
}

.premium-glass-card {
    background: rgba(var(--v-theme-surface), 0.6) !important;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.card-glow-transition {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-success-glow:hover {
    box-shadow: 0 0 30px rgba(var(--v-theme-success), 0.15) !important;
    transform: translateY(-4px);
    border-color: rgba(var(--v-theme-success), 0.3) !important;
}

.hover-error-glow:hover {
    box-shadow: 0 0 30px rgba(var(--v-theme-error), 0.15) !important;
    transform: translateY(-4px);
    border-color: rgba(var(--v-theme-error), 0.3) !important;
}

.hover-primary-glow:hover {
    box-shadow: 0 0 30px rgba(var(--v-theme-primary), 0.15) !important;
    transform: translateY(-4px);
    border-color: rgba(var(--v-theme-primary), 0.3) !important;
}

.bg-success-opacity {
    background: rgba(var(--v-theme-success), 0.1);
}

.bg-error-opacity {
    background: rgba(var(--v-theme-error), 0.1);
}

.bg-primary-opacity {
    background: rgba(var(--v-theme-primary), 0.1);
}

.border-t-dashed {
    border-top: 1px dashed rgba(var(--v-border-color), 0.15);
}

.tracking-tighter {
    letter-spacing: -0.5px;
}

.allocation-glow {
    height: 100%;
    background: inherit;
    box-shadow: 0 0 10px rgba(var(--v-theme-primary), 0.3);
    border-radius: 6px;
}

.mini-mover-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 0;
    transition: all 0.2s;
}

.pointer {
    cursor: pointer;
}

.no-scroll-table :deep(.v-table__wrapper) {
    overflow-y: visible !important;
    overflow-x: hidden !important;
    height: auto !important;
}

/* Hide scrollbars globally for cleaner UI */
::-webkit-scrollbar {
    width: 0px;
    height: 0px;
}
* {
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.bg-surface-variant-opacity {
    background: rgba(var(--v-theme-on-surface), 0.05);
}

/* Market Pulse Premium UI */
.premium-toggle {
    background: rgba(var(--v-theme-surface), 0.6) !important;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(var(--v-border-color), 0.1) !important;
    padding: 6px;
    border-radius: 24px !important;
    height: auto !important;
    gap: 8px;
    /* Increased gap as requested */
}

.premium-toggle .v-btn {
    border-radius: 20px !important;
    /* Matches pill shape */
    text-transform: none !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    letter-spacing: 0.2px !important;
    min-width: 52px !important;
    height: 32px !important;
    border: none !important;
    color: rgba(var(--v-theme-on-surface), 0.6) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.premium-toggle .v-btn--active {
    background: rgb(var(--v-theme-primary)) !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.2) !important;
}

.premium-toggle .v-btn:hover:not(.v-btn--active) {
    color: rgba(var(--v-theme-on-surface), 0.9) !important;
    background: rgba(var(--v-theme-on-surface), 0.05) !important;
}

.premium-market-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.premium-market-card:hover {
    transform: translateY(-4px);
    border-color: rgba(var(--v-theme-primary), 0.2) !important;
    box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.12) !important;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.status-online {
    background-color: rgb(var(--v-theme-success));
    box-shadow: 0 0 8px rgba(var(--v-theme-success), 0.5);
}

.status-syncing {
    background-color: rgb(var(--v-theme-primary));
    animation: pulse 1.5s infinite;
}

.status-error {
    background-color: rgb(var(--v-theme-error));
}

@keyframes pulse {
    0% { transform: scale(0.9); opacity: 0.7; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.7; }
}

.bg-surface-variant-opacity-10 {
    background: rgba(var(--v-theme-on-surface), 0.05);
}
</style>
