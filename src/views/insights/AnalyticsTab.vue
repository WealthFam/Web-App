<template>
    <div class="space-y-6 pb-6">
        <!-- 1. Period Filter Bar -->
        <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <!-- Period Selector Buttons -->
                <div class="flex items-center gap-2 flex-wrap">
                    <div class="flex items-center gap-2 text-wf-text-secondary mr-2">
                        <CalendarRange :size="16" class="text-wf-primary" />
                        <span class="text-[11px] font-bold uppercase tracking-wider text-wf-text-muted">Period</span>
                    </div>

                    <div class="flex items-center p-1 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md shadow-2xs flex-wrap gap-1">
                        <button
                            v-for="opt in timeRangeOptions"
                            :key="opt.value"
                            type="button"
                            @click="handleTimeRangeChange(opt.value)"
                            class="px-3 py-1 rounded-wf-sm text-xs font-semibold transition-all duration-150 cursor-pointer"
                            :class="[
                                selectedTimeRange === opt.value
                                    ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                    : 'text-wf-text-secondary hover:text-wf-text-primary'
                            ]"
                        >
                            {{ opt.label }}
                        </button>
                    </div>

                    <WfButton
                        v-if="selectedTimeRange !== 'this-month' && selectedTimeRange !== 'all'"
                        variant="ghost"
                        size="sm"
                        @click="selectedTimeRange = 'this-month'; handleTimeRangeChange('this-month')"
                    >
                        <RefreshCcw :size="12" class="mr-1" />
                        <span>Reset</span>
                    </WfButton>
                </div>

                <!-- Account & Custom Date Filters -->
                <div class="flex items-center gap-3 flex-wrap">
                    <!-- Account Selector -->
                    <div class="w-48 sm:w-56">
                        <WfSelect
                            v-model="localSelectedAccount"
                            :items="[{ title: 'All Accounts', value: '' }, ...accountOptions]"
                            placeholder="All Accounts"
                            size="sm"
                        />
                    </div>

                    <!-- Custom Date Range -->
                    <div v-if="selectedTimeRange === 'custom'" class="flex items-center gap-2">
                        <input
                            v-model="startDate"
                            type="date"
                            @change="fetchAnalyticsData"
                            class="h-9 px-2.5 text-xs font-semibold bg-wf-surface border border-wf-border rounded-wf-sm text-wf-text-primary focus:outline-none focus:border-wf-primary shadow-2xs"
                        />
                        <ArrowRight :size="14" class="text-wf-text-muted" />
                        <input
                            v-model="endDate"
                            type="date"
                            @change="fetchAnalyticsData"
                            class="h-9 px-2.5 text-xs font-semibold bg-wf-surface border border-wf-border rounded-wf-sm text-wf-text-primary focus:outline-none focus:border-wf-primary shadow-2xs"
                        />
                    </div>
                </div>
            </div>
        </WfCard>

        <!-- 2. Primary KPI Metric Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Total Income -->
            <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">Total Income</span>
                    <div class="w-8 h-8 rounded-wf-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shadow-2xs">
                        <TrendingUp :size="16" />
                    </div>
                </div>
                <div class="mt-2">
                    <div class="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                        {{ formatAmount(analyticsData.income || 0) }}
                    </div>
                    <p class="text-[10px] text-wf-text-muted mt-0.5">Recorded inflows this period</p>
                </div>
            </WfCard>

            <!-- Total Expenses -->
            <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between hover:border-rose-300 dark:hover:border-rose-800 transition-colors">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">Total Expenses</span>
                    <div class="w-8 h-8 rounded-wf-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center border border-rose-100 dark:border-rose-900/50 shadow-2xs">
                        <TrendingDown :size="16" />
                    </div>
                </div>
                <div class="mt-2">
                    <div class="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
                        {{ formatAmount(analyticsData.expense_total || 0) }}
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-wf-text-muted mt-0.5">
                        <span>Operational outflows</span>
                        <span v-if="financialHealth.dailyBurn > 0" class="font-mono font-semibold text-rose-600 dark:text-rose-400">~{{ formatAmount(financialHealth.dailyBurn) }}/day</span>
                    </div>
                </div>
            </WfCard>

            <!-- Total Investments -->
            <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">Total Investments</span>
                    <div class="w-8 h-8 rounded-wf-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center border border-amber-100 dark:border-amber-900/50 shadow-2xs">
                        <Target :size="16" />
                    </div>
                </div>
                <div class="mt-2">
                    <div class="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight tabular-nums">
                        {{ formatAmount(analyticsData.investment_total || 0) }}
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-wf-text-muted mt-0.5">
                        <span>Asset accumulation</span>
                        <span v-if="financialHealth.investmentRate > 0" class="font-mono font-semibold text-amber-600 dark:text-amber-400">{{ financialHealth.investmentRate }}% rate</span>
                    </div>
                </div>
            </WfCard>

            <!-- Net Savings -->
            <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">Net Savings</span>
                    <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                        <Scale :size="16" />
                    </div>
                </div>
                <div class="mt-2">
                    <div
                        class="text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums"
                        :class="(analyticsData.net || 0) >= 0 ? 'text-wf-primary dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'"
                    >
                        {{ formatAmount(analyticsData.net || 0) }}
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-wf-text-muted mt-0.5">
                        <span>Retained liquid balance</span>
                        <span v-if="analyticsData.income > 0" class="font-mono font-semibold" :class="financialHealth.savingsRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                            {{ financialHealth.savingsRate }}% rate
                        </span>
                    </div>
                </div>
            </WfCard>
        </div>

        <!-- 4. Protected Transactions Banner (if any) -->
        <WfCard
            v-if="analyticsData.excludedExpense > 0 || analyticsData.excludedIncome > 0"
            variant="flat"
            padding="md"
            radius="xl"
            class="border border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/20 cursor-pointer"
            @click="showExcludedDetails = !showExcludedDetails"
        >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-wf-md bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center shrink-0">
                        <ShieldAlert :size="20" />
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-wf-text-primary">Protected Transactions Notice</h4>
                        <p class="text-xs text-wf-text-secondary mt-0.5">
                            We've shielded <strong class="font-mono tabular-nums">{{ formatAmount(analyticsData.excludedExpense + analyticsData.excludedIncome) }}</strong> from primary spending reports (transfers & hidden items).
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 self-start sm:self-auto">
                    <span v-if="analyticsData.excludedIncome" class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 font-mono tabular-nums">
                        +{{ formatAmount(analyticsData.excludedIncome) }} Income Shielded
                    </span>
                    <span v-if="analyticsData.excludedExpense" class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/30 font-mono tabular-nums">
                        -{{ formatAmount(analyticsData.excludedExpense) }} Spending Shielded
                    </span>
                </div>
            </div>

            <!-- Expandable Breakdown -->
            <div v-if="showExcludedDetails" class="mt-4 pt-4 border-t border-amber-200/60 dark:border-amber-900/40 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                    v-for="cat in analyticsData.excludedCategories"
                    :key="cat.name"
                    class="p-2.5 rounded-wf-md bg-wf-surface border border-wf-border-subtle flex items-center gap-2.5"
                >
                    <component :is="getCategoryLucideIcon(cat.name)" :size="16" class="text-wf-primary shrink-0" />
                    <div class="min-w-0">
                        <div class="text-[11px] font-semibold text-wf-text-primary truncate">{{ cat.name }}</div>
                        <div class="text-xs font-bold font-mono text-wf-text-secondary tabular-nums">{{ formatAmount(cat.value) }}</div>
                    </div>
                </div>
            </div>
        </WfCard>

        <!-- 5. Discipline & Behavioral Insights (50/30/20 Rule & Weekday vs Weekend) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- 50 / 30 / 20 Budget Rule Diagnostic (7 cols) -->
            <div class="lg:col-span-7">
                <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border h-full flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-2">
                                <Scale :size="16" class="text-wf-primary" />
                                <h3 class="text-sm font-bold text-wf-text-primary">50 / 30 / 20 Budget Discipline</h3>
                            </div>
                            <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-surface-variant text-wf-text-secondary border border-wf-border">
                                Financial Benchmark
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary mb-4">
                            Evaluates how your outflows align with the classic 50% Needs, 30% Wants, and 20% Wealth rule.
                        </p>

                        <!-- Multi-Color Segmented Bar -->
                        <div class="space-y-1.5 mb-5">
                            <div class="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-wf-pill overflow-hidden flex">
                                <div
                                    class="h-full bg-blue-500 transition-all duration-300"
                                    :style="{ width: `${budgetDiscipline.needsPct}%` }"
                                    :title="`Needs: ${budgetDiscipline.needsPct}%`"
                                ></div>
                                <div
                                    class="h-full bg-amber-500 transition-all duration-300"
                                    :style="{ width: `${budgetDiscipline.wantsPct}%` }"
                                    :title="`Wants: ${budgetDiscipline.wantsPct}%`"
                                ></div>
                                <div
                                    class="h-full bg-emerald-500 transition-all duration-300"
                                    :style="{ width: `${budgetDiscipline.savingsPct}%` }"
                                    :title="`Savings & Invest: ${budgetDiscipline.savingsPct}%`"
                                ></div>
                            </div>
                            <div class="flex items-center justify-between text-[10px] font-semibold text-wf-text-muted px-0.5">
                                <span>0%</span>
                                <span class="text-blue-600 font-bold">Needs Target (50%)</span>
                                <span class="text-amber-600 font-bold">Wants (30%)</span>
                                <span class="text-emerald-600 font-bold">Savings (20%)</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <!-- 3 Progress Breakdown Rows -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <!-- Needs -->
                            <div class="p-3 rounded-wf-md bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                                <div class="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                    <span>🏠 Needs</span>
                                    <span class="font-mono">{{ budgetDiscipline.needsPct }}%</span>
                                </div>
                                <div class="text-sm font-bold font-mono text-wf-text-primary mt-1 tabular-nums">
                                    {{ formatAmount(budgetDiscipline.needsAmount) }}
                                </div>
                                <div class="text-[10px] text-wf-text-muted mt-0.5">Target: ~50% (Rent, Groceries, Bills)</div>
                            </div>

                            <!-- Wants -->
                            <div class="p-3 rounded-wf-md bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                                <div class="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                    <span>🛍️ Wants</span>
                                    <span class="font-mono">{{ budgetDiscipline.wantsPct }}%</span>
                                </div>
                                <div class="text-sm font-bold font-mono text-wf-text-primary mt-1 tabular-nums">
                                    {{ formatAmount(budgetDiscipline.wantsAmount) }}
                                </div>
                                <div class="text-[10px] text-wf-text-muted mt-0.5">Target: ~30% (Dining, Shopping)</div>
                            </div>

                            <!-- Savings & Investments -->
                            <div class="p-3 rounded-wf-md bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                <div class="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                    <span>📈 Savings</span>
                                    <span class="font-mono">{{ budgetDiscipline.savingsPct }}%</span>
                                </div>
                                <div class="text-sm font-bold font-mono text-wf-text-primary mt-1 tabular-nums">
                                    {{ formatAmount(budgetDiscipline.savingsAmount) }}
                                </div>
                                <div class="text-[10px] text-wf-text-muted mt-0.5">Target: ~20% (Net retain + funds)</div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 pt-3 border-t border-wf-border-subtle flex items-center justify-between text-xs">
                        <span class="text-wf-text-secondary font-medium">{{ budgetDiscipline.verdict }}</span>
                    </div>
                </WfCard>
            </div>

            <!-- Weekday vs Weekend Spending Behavior (5 cols) -->
            <div class="lg:col-span-5">
                <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border h-full flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-2">
                                <Compass :size="16" class="text-wf-primary" />
                                <h3 class="text-sm font-bold text-wf-text-primary">Weekday vs Weekend Habits</h3>
                            </div>
                            <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary border border-indigo-200 dark:border-indigo-900/40">
                                {{ weekdayVsWeekend.weekendMultiplier }}x Weekend Pace
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary mb-4">
                            Contrast between Monday–Friday routines and weekend leisure outflow velocity.
                        </p>

                        <div class="space-y-3.5">
                            <!-- Weekdays -->
                            <div class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-wf-sm bg-slate-100 dark:bg-slate-800 text-wf-text-secondary flex items-center justify-center font-bold text-xs">
                                        M-F
                                    </div>
                                    <div>
                                        <div class="text-xs font-bold text-wf-text-primary">Workweek Outflows</div>
                                        <div class="text-[10px] text-wf-text-muted mt-0.5">
                                            Avg <strong class="font-mono text-wf-text-primary">{{ formatAmount(weekdayVsWeekend.weekdayAvg) }}</strong> / day
                                        </div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-bold font-mono text-wf-text-primary tabular-nums">
                                        {{ formatAmount(weekdayVsWeekend.weekdayTotal) }}
                                    </div>
                                    <div class="text-[10px] text-wf-text-muted">{{ weekdayVsWeekend.weekdayDays }} active days</div>
                                </div>
                            </div>

                            <!-- Weekends -->
                            <div class="p-3 rounded-wf-md bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-wf-sm bg-indigo-100 dark:bg-indigo-900/60 text-wf-primary flex items-center justify-center font-bold text-xs">
                                        S-S
                                    </div>
                                    <div>
                                        <div class="text-xs font-bold text-wf-text-primary">Weekend Outflows</div>
                                        <div class="text-[10px] text-wf-text-muted mt-0.5">
                                            Avg <strong class="font-mono text-wf-text-primary">{{ formatAmount(weekdayVsWeekend.weekendAvg) }}</strong> / day
                                        </div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-bold font-mono text-wf-text-primary tabular-nums">
                                        {{ formatAmount(weekdayVsWeekend.weekendTotal) }}
                                    </div>
                                    <div class="text-[10px] text-wf-text-muted">{{ weekdayVsWeekend.weekendDays }} active days</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 pt-3 border-t border-wf-border-subtle flex items-center justify-between text-xs text-wf-text-secondary font-medium">
                        <span>{{ weekdayVsWeekend.verdict }}</span>
                    </div>
                </WfCard>
            </div>
        </div>

        <!-- 6. Major Charts Row: Categorization & Top Merchants -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <!-- Categorization Breakdown with Interactive Legend -->
            <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <Sparkles :size="16" class="text-wf-primary" />
                            <h3 class="text-sm font-bold text-wf-text-primary">Categorization Breakdown</h3>
                            <button
                                v-if="selectedTrendCategory"
                                type="button"
                                @click="selectedTrendCategory = ''"
                                class="text-[10px] px-2 py-0.5 rounded-wf-pill bg-wf-primary-light text-wf-primary font-bold hover:underline cursor-pointer"
                            >
                                Reset Filter: {{ selectedTrendCategory }}
                            </button>
                        </div>

                        <!-- Expenses vs Investments Toggle -->
                        <div class="flex items-center p-0.5 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md text-xs">
                            <button
                                type="button"
                                @click="breakdownView = 'expense'"
                                class="px-2.5 py-1 rounded-wf-sm font-semibold transition-colors cursor-pointer"
                                :class="breakdownView === 'expense' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                            >
                                Expenses
                            </button>
                            <button
                                type="button"
                                @click="breakdownView = 'investment'"
                                class="px-2.5 py-1 rounded-wf-sm font-semibold transition-colors cursor-pointer"
                                :class="breakdownView === 'investment' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                            >
                                Investments
                            </button>
                        </div>
                    </div>

                    <!-- Doughnut Chart Section -->
                    <div class="h-64 w-full relative flex items-center justify-center">
                        <BaseChart
                            type="doughnut"
                            :data="categoryChartData"
                            :height="240"
                            :options="{
                                cutout: '75%',
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context: any) {
                                                const label = context.label || '';
                                                const value = formatAmount(context.raw);
                                                return ` ${label}: ${value}`;
                                            }
                                        }
                                    }
                                }
                            }"
                            @chart-click="handleCategoryClick"
                        />
                        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted">
                                {{ breakdownView === 'expense' ? 'TOTAL SPENT' : 'TOTAL INVESTED' }}
                            </span>
                            <span class="text-base font-bold font-mono text-wf-text-primary tabular-nums">
                                {{ formatAmount(breakdownView === 'expense' ? analyticsData.expense_total : analyticsData.investment_total) }}
                            </span>
                        </div>
                    </div>

                    <!-- Interactive Category Drilldown Chips -->
                    <div class="mt-4 pt-3 border-t border-wf-border-subtle">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block mb-2">
                            Top Categories (Click to filter ledger)
                        </span>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div
                                v-for="cat in categoryBreakdownList"
                                :key="cat.name"
                                @click="handleCategorySelect(cat.name)"
                                class="p-2 rounded-wf-md border transition-all cursor-pointer flex items-center justify-between"
                                :class="[
                                    selectedTrendCategory === cat.name
                                        ? 'bg-wf-primary-light/40 border-wf-primary ring-1 ring-wf-primary'
                                        : 'bg-wf-surface border-wf-border-subtle hover:border-wf-border hover:bg-wf-surface-variant/40'
                                ]"
                            >
                                <div class="flex items-center gap-1.5 min-w-0">
                                    <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: cat.color }"></span>
                                    <span class="text-xs font-semibold text-wf-text-primary truncate">{{ cat.name }}</span>
                                </div>
                                <div class="text-right shrink-0 ml-2">
                                    <span class="text-xs font-bold font-mono text-wf-text-primary block tabular-nums">{{ formatAmount(cat.value) }}</span>
                                    <span class="text-[9px] text-wf-text-muted">{{ cat.pct }}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </WfCard>

            <!-- Top Merchants Card (Dual List & Chart View) -->
            <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <Scale :size="16" class="text-wf-primary" />
                            <h3 class="text-sm font-bold text-wf-text-primary">Top Outflow Merchants</h3>
                        </div>

                        <!-- View Toggle -->
                        <div class="flex items-center p-0.5 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md text-xs">
                            <button
                                type="button"
                                @click="merchantView = 'list'"
                                class="px-2.5 py-1 rounded-wf-sm font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                :class="merchantView === 'list' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                            >
                                <List :size="12" />
                                <span>Leaderboard</span>
                            </button>
                            <button
                                type="button"
                                @click="merchantView = 'chart'"
                                class="px-2.5 py-1 rounded-wf-sm font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                :class="merchantView === 'chart' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                            >
                                <BarChart2 :size="12" />
                                <span>Bar Chart</span>
                            </button>
                        </div>
                    </div>

                    <!-- List / Leaderboard View -->
                    <div v-if="merchantView === 'list'" class="space-y-3 min-h-[300px]">
                        <div v-if="topMerchantsList.length === 0" class="py-16 text-center text-xs text-wf-text-muted">
                            No merchant activity in selected period
                        </div>
                        <div
                            v-for="(merc, idx) in topMerchantsList"
                            :key="merc.name"
                            class="p-2.5 rounded-wf-md bg-wf-surface border border-wf-border-subtle hover:border-wf-border transition-colors flex items-center justify-between gap-3"
                        >
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="w-6 h-6 rounded-wf-full bg-wf-surface-variant text-wf-text-secondary font-bold text-[10px] flex items-center justify-center shrink-0">
                                    #{{ Number(idx) + 1 }}
                                </div>
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-wf-text-primary truncate">{{ merc.name }}</div>
                                    <!-- Mini Proportional Bar -->
                                    <div class="w-24 sm:w-36 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-wf-pill overflow-hidden mt-1">
                                        <div
                                            class="h-full rounded-wf-pill transition-all"
                                            :style="{ width: `${merc.pct}%`, backgroundColor: merc.color }"
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div class="text-right shrink-0">
                                <div class="text-xs font-bold font-mono text-wf-text-primary tabular-nums">
                                    {{ formatAmount(merc.value) }}
                                </div>
                                <div class="text-[10px] text-wf-text-muted font-medium">
                                    {{ merc.pct }}% of spend
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Chart View -->
                    <div v-else class="h-80 w-full">
                        <BaseChart
                            type="bar"
                            :data="merchantChartData"
                            :height="320"
                            :options="{
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context: any) {
                                                return ` Spending: ${formatAmount(context.raw)}`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        grid: { display: false },
                                        ticks: {
                                            callback: (val: any) => '₹' + val,
                                            font: { size: 10 }
                                        }
                                    },
                                    y: {
                                        grid: { display: false },
                                        ticks: {
                                            font: { size: 11, weight: 'bold' }
                                        }
                                    }
                                }
                            }"
                        />
                    </div>
                </div>
            </WfCard>
        </div>

        <!-- 7. Spending Dynamics -->
        <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div class="flex items-center gap-2">
                    <TrendingUp :size="16" class="text-wf-primary" />
                    <h3 class="text-sm font-bold text-wf-text-primary">Spending Dynamics</h3>
                    <span v-if="selectedTrendCategory" class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary">
                        Filtered: {{ selectedTrendCategory }}
                    </span>
                </div>

                <div class="flex items-center gap-3 flex-wrap">
                    <!-- Daily vs Monthly Toggle -->
                    <div class="flex items-center p-0.5 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md text-xs">
                        <button
                            type="button"
                            @click="trendView = 'daily'"
                            class="px-2.5 py-1 rounded-wf-sm font-semibold transition-colors cursor-pointer"
                            :class="trendView === 'daily' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                        >
                            Daily
                        </button>
                        <button
                            type="button"
                            @click="trendView = 'monthly'"
                            class="px-2.5 py-1 rounded-wf-sm font-semibold transition-colors cursor-pointer"
                            :class="trendView === 'monthly' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                        >
                            Monthly
                        </button>
                    </div>

                    <!-- Category Filter -->
                    <div class="w-56">
                        <WfSelect
                            v-model="selectedTrendCategory"
                            :items="categoryOptions.map(c => ({ title: `${c.icon || '🏷️'} ${c.title}`, value: c.value }))"
                            placeholder="All Categories"
                            size="sm"
                        />
                    </div>
                </div>
            </div>

            <div class="h-80 w-full">
                <BaseChart
                    v-if="filteredTrendData.length > 0"
                    type="line"
                    :data="trendChartData"
                    :height="320"
                />
                <div v-else class="flex flex-col items-center justify-center h-full text-center py-12 text-wf-text-muted space-y-2">
                    <BarChart2 :size="36" class="opacity-40" />
                    <div class="text-xs font-bold text-wf-text-primary">No Activity Logged</div>
                    <p class="text-[11px] max-w-sm">No spending data matches this interval. Protected transfers and hidden records are excluded.</p>
                </div>
            </div>
        </WfCard>

        <!-- 8. Foresight Forecast & Historical Arc (Equal 2-Column Grid) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <!-- Foresight Forecast -->
            <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border h-full flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <Sparkles :size="16" class="text-wf-primary" />
                            <h3 class="text-sm font-bold text-wf-text-primary">Foresight Forecast (30 Days)</h3>
                        </div>
                        <span class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-wf-primary border border-indigo-200 dark:border-indigo-900/40">
                            Predictive Runway
                        </span>
                    </div>

                    <div class="h-64 sm:h-72 w-full">
                        <BaseChart
                            v-if="forecastData.length > 0"
                            type="line"
                            :data="forecastChartData"
                            :height="260"
                        />
                        <div v-else class="flex items-center justify-center h-full text-xs text-wf-text-muted">
                            Calculating projection...
                        </div>
                    </div>
                </div>

                <div class="mt-3 p-3 rounded-wf-md bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                    <span class="text-wf-text-secondary">Projected net based on recurring bills and burn pace:</span>
                    <span class="font-bold font-mono text-wf-primary tabular-nums">
                        Est. Net: {{ formatAmount(analyticsData.net + store.recurringTransactions.reduce((acc, t) => acc + (t.type === 'DEBIT' ? -t.amount : t.amount), 0)) }}
                    </span>
                </div>
            </WfCard>

            <!-- Historical Budget Arc & Discipline -->
            <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border h-full flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <TrendingUp :size="16" class="text-wf-primary" />
                            <h3 class="text-sm font-bold text-wf-text-primary">Historical Budget Arc</h3>
                        </div>
                        <span
                            class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold border"
                            :class="budgetHistoryStats.adherenceRate >= 75
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                                : budgetHistoryStats.adherenceRate >= 50
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'"
                        >
                            {{ budgetHistoryStats.adherenceRate }}% Avg Discipline
                        </span>
                    </div>

                    <!-- 6-Month Performance Strip -->
                    <div class="grid grid-cols-3 gap-2.5 mb-3">
                        <div class="p-2.5 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted block">6-Mo Avg Limit</span>
                            <span class="text-xs font-bold font-mono text-wf-text-primary tabular-nums">{{ formatAmount(budgetHistoryStats.avgLimit) }}</span>
                        </div>
                        <div class="p-2.5 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-wf-text-muted block">6-Mo Avg Spent</span>
                            <span class="text-xs font-bold font-mono text-wf-text-primary tabular-nums">{{ formatAmount(budgetHistoryStats.avgSpent) }}</span>
                        </div>
                        <div class="p-2.5 rounded-wf-md bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Discipline</span>
                            <span class="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                                {{ budgetHistoryStats.underBudgetCount }} / {{ budgetHistoryStats.totalMonths }} Mo. Under
                            </span>
                        </div>
                    </div>

                    <div class="h-64 sm:h-72 w-full">
                        <BudgetHistoryChart v-if="budgetHistory.length > 0" :history="budgetHistory" />
                        <div v-else class="flex items-center justify-center h-full text-xs text-wf-text-muted">
                            No historical snapshots available
                        </div>
                    </div>
                </div>
            </WfCard>
        </div>

        <!-- 9. Temporal Outflow Dynamics & Heatmap -->
        <WfCard v-if="heatmapData" variant="flat" padding="md" radius="xl" class="border border-wf-border">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div class="flex items-center gap-2">
                    <Clock :size="16" class="text-wf-primary" />
                    <div>
                        <h3 class="text-sm font-bold text-wf-text-primary">Temporal Outflow Dynamics</h3>
                        <p class="text-[11px] text-wf-text-muted mt-0.5">Discover what times of day your money flows out fastest</p>
                    </div>
                </div>

                <!-- View Switcher -->
                <div class="flex items-center p-0.5 bg-wf-surface-variant/80 border border-wf-border rounded-wf-md text-xs">
                    <button
                        type="button"
                        @click="heatmapView = 'blocks'"
                        class="px-2.5 py-1 rounded-wf-sm font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        :class="heatmapView === 'blocks' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                    >
                        <LayoutGrid :size="12" />
                        <span>Daypart Insights</span>
                    </button>
                    <button
                        type="button"
                        @click="heatmapView = 'grid'"
                        class="px-2.5 py-1 rounded-wf-sm font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        :class="heatmapView === 'grid' ? 'bg-wf-surface text-wf-primary shadow-xs font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                    >
                        <Clock :size="12" />
                        <span>24-Hour Matrix</span>
                    </button>
                </div>
            </div>

            <!-- Peak Outflow Insight Banner -->
            <div class="p-3 mb-4 rounded-wf-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-wf-sm bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <Flame :size="15" />
                    </div>
                    <div>
                        <span class="font-bold text-amber-800 dark:text-amber-200">Peak Outflow Window:</span>
                        <span class="text-wf-text-secondary ml-1.5 font-medium">
                            {{ temporalInsights.peakWindowLabel }} accounts for {{ temporalInsights.peakBlockShare }}% of daily spending.
                        </span>
                    </div>
                </div>

                <div class="text-[11px] font-semibold text-wf-text-muted self-start sm:self-auto">
                    Peak Hour: <strong class="text-wf-text-primary font-mono">{{ temporalInsights.peakHourLabel }}</strong> ({{ temporalInsights.peakCategory }})
                </div>
            </div>

            <!-- VIEW 1: DAYPART CARDS -->
            <div v-if="heatmapView === 'blocks'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div
                    v-for="block in daypartBlocks"
                    :key="block.id"
                    class="p-4 rounded-wf-lg bg-wf-surface border border-wf-border-subtle hover:border-wf-border hover:shadow-2xs transition-all flex flex-col justify-between"
                >
                    <div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <component :is="block.iconComponent" :size="16" :style="{ color: block.color }" />
                                <span class="text-xs font-bold text-wf-text-primary">{{ block.title }}</span>
                            </div>
                            <span class="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-wf-pill bg-wf-surface-variant text-wf-text-secondary">
                                {{ block.pct }}%
                            </span>
                        </div>
                        <div class="text-[10px] text-wf-text-muted mt-0.5">{{ block.hours }}</div>

                        <!-- Amount -->
                        <div class="text-lg font-bold font-mono text-wf-text-primary mt-3 tabular-nums">
                            {{ formatAmount(block.total) }}
                        </div>

                        <!-- Proportional Accent Bar -->
                        <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-wf-pill overflow-hidden mt-2">
                            <div
                                class="h-full rounded-wf-pill transition-all duration-300"
                                :style="{ width: `${block.pct}%`, backgroundColor: block.color }"
                            ></div>
                        </div>
                    </div>

                    <div class="mt-3 pt-2.5 border-t border-wf-border-subtle flex items-center justify-between text-[10px] text-wf-text-muted">
                        <span>Top Driver:</span>
                        <span class="font-bold text-wf-text-primary truncate max-w-[120px]">{{ block.topCategory }}</span>
                    </div>
                </div>
            </div>

            <!-- VIEW 2: 24-HOUR DETAILED HEATMAP -->
            <div v-else class="space-y-3">
                <div class="overflow-x-auto pb-2">
                    <div class="w-full min-w-[760px] space-y-2">
                        <!-- Hour Headers -->
                        <div class="grid grid-cols-[140px_repeat(24,1fr)] items-center gap-1.5 text-[10px] font-bold text-wf-text-muted">
                            <div class="text-[11px] font-bold text-wf-text-secondary pr-2 truncate">Category / Hour</div>
                            <div
                                v-for="h in (heatmapData?.hours || Array.from({ length: 24 }, (_, i) => i))"
                                :key="h"
                                class="text-center font-mono text-[9px] text-wf-text-muted hover:text-wf-text-primary transition-colors"
                            >
                                {{ h }}
                            </div>
                        </div>

                        <!-- Category Rows -->
                        <div
                            v-for="cat in (heatmapData?.categories || [])"
                            :key="cat"
                            class="grid grid-cols-[140px_repeat(24,1fr)] items-center gap-1.5 py-1 text-xs hover:bg-wf-surface-variant/30 rounded-wf-sm transition-colors px-1 -mx-1"
                        >
                            <div class="truncate font-semibold text-wf-text-primary flex items-center gap-1.5 pr-2" :title="cat">
                                <component :is="getCategoryLucideIcon(cat)" :size="13" class="text-wf-primary shrink-0" />
                                <span class="truncate">{{ cat }}</span>
                            </div>
                            <div
                                v-for="h in (heatmapData?.hours || Array.from({ length: 24 }, (_, i) => i))"
                                :key="h"
                                class="h-7 w-full rounded-wf-xs transition-all hover:scale-110 hover:shadow-xs cursor-pointer flex items-center justify-center text-[9px] border border-black/5 dark:border-white/5"
                                :style="{
                                    backgroundColor: heatmapData.grid[cat]?.[h] > 0 ? store.getCategoryColor(cat) : 'transparent',
                                    opacity: heatmapData.grid[cat]?.[h] > 0 ? Math.min(1, 0.35 + (heatmapData.grid[cat][h] / heatmapData.max * 0.65)) : 0.08,
                                    border: heatmapData.grid[cat]?.[h] > 0 ? 'none' : ''
                                }"
                                :title="`${cat} at ${h}:00 – ${formatAmount(heatmapData.grid[cat]?.[h] || 0)}`"
                            ></div>
                        </div>
                    </div>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-wf-border-subtle text-[11px] text-wf-text-muted">
                    <div class="flex items-center gap-4">
                        <span>Intensity:</span>
                        <div class="flex items-center gap-1.5">
                            <span class="w-3 h-3 rounded-wf-xs bg-slate-200 dark:bg-slate-800"></span>
                            <span class="text-[10px]">Zero</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-3 h-3 rounded-wf-xs bg-indigo-300"></span>
                            <span class="text-[10px]">Moderate</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-3 h-3 rounded-wf-xs bg-indigo-600"></span>
                            <span class="text-[10px]">Peak Velocity</span>
                        </div>
                    </div>
                    <span>Hover cell for exact outflow sum</span>
                </div>
            </div>
        </WfCard>

        <!-- 10. Analytical Transactions Table -->
        <WfCard variant="flat" padding="none" radius="xl" class="border border-wf-border overflow-hidden">
            <div class="p-4 border-b border-wf-border flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2">
                    <Wallet :size="16" class="text-wf-primary" />
                    <h3 class="text-sm font-bold text-wf-text-primary">Analytical Transactions</h3>
                    <!-- Category Active Filter Tag -->
                    <span
                        v-if="selectedTrendCategory"
                        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-wf-pill text-xs font-semibold bg-wf-primary-light text-wf-primary border border-wf-border"
                    >
                        <span>Filtered: {{ selectedTrendCategory }}</span>
                        <button type="button" @click="selectedTrendCategory = ''" class="hover:text-rose-600 cursor-pointer">
                            <X :size="12" />
                        </button>
                    </span>
                </div>

                <span v-if="analyticsData.excludedExpense > 0 || analyticsData.excludedIncome > 0" class="px-2 py-0.5 rounded-wf-pill text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/30 font-mono tabular-nums">
                    {{ formatAmount(analyticsData.excludedExpense + analyticsData.excludedIncome) }} Shielded
                </span>
            </div>

            <div>
                <TransactionTable
                    hide-actions
                    :show-select="false"
                    :transactions="filteredTransactions"
                    :total="transactionPagination.total"
                    :loading="loadingTransactions"
                    :page-size="transactionPagination.limit"
                    :page="transactionPagination.page"
                    :selected-ids="new Set()"
                    :accounts="store.accounts"
                    :categories="store.categories"
                    :expense-groups="[]"
                    @optionsUpdate="fetchFilteredTransactions"
                />
            </div>
        </WfCard>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
    TrendingUp, TrendingDown, Scale,
    CalendarRange, ArrowRight, RefreshCcw, BarChart2,
    ShieldAlert, Wallet, Sparkles,
    Compass, Target, List, X,
    Sun, SunMedium, Sunset, Moon, Clock, LayoutGrid, Flame
} from 'lucide-vue-next'

import { financeApi } from '@/api/client'
import BaseChart from '@/components/BaseChart.vue'
import BudgetHistoryChart from '@/components/BudgetHistoryChart.vue'
import TransactionTable from '@/components/transactions/TransactionTable.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import { useCurrency } from '@/composables/useCurrency'
import { useAuthStore } from '@/stores/auth'
import { useFinanceStore } from '@/stores/finance'
import { useInsightsStore } from '@/stores/insights'
import { useSettingsStore } from '@/stores/settings'
import { getCategoryLucideIcon } from '@/utils/iconMapping'
import { localDateString } from '@/utils/time'

interface Props {
    selectedAccount?: string
}

const props = defineProps<Props>()

const insightsStore = useInsightsStore()
const store = useFinanceStore()
const authStore = useAuthStore()
const settings = useSettingsStore()
const { formatAmount } = useCurrency()

// Filters local to analytics
const selectedTimeRange = ref('this-month')
const startDate = ref('')
const endDate = ref('')
const selectedTrendCategory = ref('')
const trendView = ref<'daily' | 'monthly'>('daily')
const localSelectedAccount = ref(props.selectedAccount || '')
const breakdownView = ref<'expense' | 'investment'>('expense')
const merchantView = ref<'list' | 'chart'>('list')
const heatmapView = ref<'blocks' | 'grid'>('blocks')
const showExcludedDetails = ref(false)

// Pagination for transactions
const filteredTransactions = ref<any[]>([])
const transactionPagination = ref({
    page: 1,
    limit: 10,
    total: 0
})

const monthlyHistory = ref<any[]>([])
const loadingMonthly = ref(false)
const loadingTransactions = ref(false)
const forecastData = ref<any[]>([])
const budgets = ref<any[]>([])
const budgetHistory = ref<any[]>([])

// 6-Month Budget History Performance Stats
const budgetHistoryStats = computed(() => {
    if (!budgetHistory.value || budgetHistory.value.length === 0) {
        return { avgLimit: 0, avgSpent: 0, underBudgetCount: 0, totalMonths: 0, adherenceRate: 100 }
    }
    let totalLimit = 0
    let totalSpent = 0
    let underCount = 0

    budgetHistory.value.forEach((h: any) => {
        const overall = h.data?.find((d: any) => d.category === 'OVERALL')
        let limit = 0
        let spent = 0
        if (overall) {
            limit = Number(overall.limit || 0)
            spent = Number(overall.spent || 0)
        } else if (Array.isArray(h.data)) {
            h.data.forEach((d: any) => {
                limit += Number(d.limit || 0)
                spent += Number(d.spent || 0)
            })
        }
        totalLimit += limit
        totalSpent += spent
        if (limit > 0 && spent <= limit) underCount++
    })

    const count = budgetHistory.value.length
    const avgLimit = Math.round(totalLimit / Math.max(1, count))
    const avgSpent = Math.round(totalSpent / Math.max(1, count))
    const adherenceRate = count > 0 ? Math.round((underCount / count) * 100) : 100

    return {
        avgLimit,
        avgSpent,
        underBudgetCount: underCount,
        totalMonths: count,
        adherenceRate
    }
})

// Temporal Daypart Macro Blocks
const daypartBlocks = computed(() => {
    const grid = heatmapData.value?.grid || {}
    const categories = heatmapData.value?.categories || []

    const morningHours = [6, 7, 8, 9, 10, 11]
    const afternoonHours = [12, 13, 14, 15, 16]
    const eveningHours = [17, 18, 19, 20, 21]
    const nightHours = [22, 23, 0, 1, 2, 3, 4, 5]

    function calcBlock(hours: number[]) {
        let total = 0
        const catTotals: Record<string, number> = {}

        categories.forEach((cat: string) => {
            const catGrid = grid[cat] || {}
            hours.forEach(h => {
                const amt = Number(catGrid[h] || 0)
                total += amt
                catTotals[cat] = (catTotals[cat] || 0) + amt
            })
        })

        let topCat = 'None'
        let maxVal = 0
        Object.entries(catTotals).forEach(([cat, val]) => {
            if (val > maxVal) {
                maxVal = val
                topCat = cat
            }
        })

        return { total, topCategory: topCat }
    }

    const morning = calcBlock(morningHours)
    const afternoon = calcBlock(afternoonHours)
    const evening = calcBlock(eveningHours)
    const night = calcBlock(nightHours)

    const grandTotal = morning.total + afternoon.total + evening.total + night.total || 1

    return [
        {
            id: 'morning',
            title: 'Morning',
            hours: '06:00 – 12:00',
            iconComponent: Sun,
            total: morning.total,
            pct: Math.round((morning.total / grandTotal) * 100),
            topCategory: morning.topCategory,
            color: '#F59E0B'
        },
        {
            id: 'afternoon',
            title: 'Afternoon',
            hours: '12:00 – 17:00',
            iconComponent: SunMedium,
            total: afternoon.total,
            pct: Math.round((afternoon.total / grandTotal) * 100),
            topCategory: afternoon.topCategory,
            color: '#3B82F6'
        },
        {
            id: 'evening',
            title: 'Evening',
            hours: '17:00 – 22:00',
            iconComponent: Sunset,
            total: evening.total,
            pct: Math.round((evening.total / grandTotal) * 100),
            topCategory: evening.topCategory,
            color: '#8B5CF6'
        },
        {
            id: 'night',
            title: 'Late Night',
            hours: '22:00 – 06:00',
            iconComponent: Moon,
            total: night.total,
            pct: Math.round((night.total / grandTotal) * 100),
            topCategory: night.topCategory,
            color: '#6366F1'
        }
    ]
})

// Temporal Peak Insights
const temporalInsights = computed(() => {
    const blocks = daypartBlocks.value
    let peakBlock = blocks[0]
    blocks.forEach(b => {
        if (b.total > peakBlock.total) peakBlock = b
    })

    let peakHour = 20
    let peakHourAmt = 0
    let peakHourCat = 'Food & Dining'

    if (heatmapData.value) {
        const grid = heatmapData.value.grid || {}
        const categories = heatmapData.value.categories || []
        for (let h = 0; h < 24; h++) {
            categories.forEach((cat: string) => {
                const amt = Number(grid[cat]?.[h] || 0)
                if (amt > peakHourAmt) {
                    peakHourAmt = amt
                    peakHour = h
                    peakHourCat = cat
                }
            })
        }
    }

    const periodStr = peakHour >= 12 ? `${peakHour % 12 || 12}:00 PM` : `${peakHour}:00 AM`

    return {
        peakWindowLabel: `${peakBlock.title} (${peakBlock.hours})`,
        peakBlockShare: peakBlock.pct,
        peakHourLabel: periodStr,
        peakAmount: peakHourAmt,
        peakCategory: peakHourCat
    }
})

const accountOptions = computed(() => {
    return store.accounts.map(acc => ({
        title: acc.name,
        value: acc.id,
        subtitle: acc.type
    }))
})

const chartPalette = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6'
]

function handleCategoryClick(payload: any) {
    if (payload && payload.label) {
        selectedTrendCategory.value = payload.label === selectedTrendCategory.value ? '' : payload.label
    }
}

function handleCategorySelect(catName: string) {
    selectedTrendCategory.value = selectedTrendCategory.value === catName ? '' : catName
}

const timeRangeOptions = [
    { label: 'All Time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'this-week' },
    { label: 'This Month', value: 'this-month' },
    { label: 'Last Month', value: 'last-month' },
    { label: 'Last 30 Days', value: 'last-30' },
    { label: 'This Quarter', value: 'this-quarter' },
    { label: 'This Year', value: 'this-year' },
    { label: 'Custom Range', value: 'custom' }
]

const analyticsData = computed(() => insightsStore.analyticsData)

// 1. Financial Vitality & Health Diagnostic
const financialHealth = computed(() => {
    const income = analyticsData.value.income || 0
    const expenses = analyticsData.value.expense_total || 0
    const investments = analyticsData.value.investment_total || 0
    const net = analyticsData.value.net || 0

    // Savings rate %
    const savingsRate = income > 0 ? Math.round((net / income) * 100) : (net >= 0 ? 0 : -100)

    // Investment velocity %
    const investmentRate = income > 0 ? Math.round((investments / income) * 100) : 0

    // Days in period
    const daysInPeriod = filteredTrendData.value.length || 30
    const dailyBurn = Math.round(expenses / Math.max(1, daysInPeriod))

    // Days remaining in calendar month
    const today = new Date().getDate()
    const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const daysRemaining = Math.max(1, lastDayOfMonth - today)
    const dailySafeSpend = Math.max(0, Math.round(net / daysRemaining))

    // Scoring Engine
    let score = 50
    if (savingsRate >= 30) score += 30
    else if (savingsRate >= 20) score += 20
    else if (savingsRate >= 10) score += 10
    else if (savingsRate < 0) score -= 20

    if (investmentRate >= 20) score += 15
    else if (investmentRate >= 10) score += 10

    if (expenses <= income * 0.65 && income > 0) score += 10
    else if (expenses > income && income > 0) score -= 15

    score = Math.min(98, Math.max(20, score))

    let verdict = 'Balanced Capital Pace'
    let tone: 'emerald' | 'amber' | 'rose' = 'amber'
    let headline = 'Healthy Cashflow Alignment'
    let subtext = `You are maintaining a balanced outflow rhythm with a ${dailySafeSpend > 0 ? formatAmount(dailySafeSpend) + '/day safe runway' : 'steady pace'}.`

    if (score >= 75) {
        verdict = 'Superb Cash Flow Health'
        tone = 'emerald'
        headline = `Strong Capital Accumulation (+${savingsRate}% Savings Rate)`
        subtext = `Outflows remain tightly disciplined below income, allowing robust liquidity retention and wealth expansion.`
    } else if (score < 55) {
        verdict = 'Elevated Outflow Pace'
        tone = 'rose'
        headline = `Outflows Exceeding Recommended Buffer`
        subtext = `Operational expenses are absorbing the majority of inflows this period. Review discretionary categories.`
    }

    return {
        score,
        verdict,
        tone,
        headline,
        subtext,
        savingsRate,
        investmentRate,
        dailyBurn,
        dailySafeSpend,
        daysRemaining
    }
})

// 2. 50 / 30 / 20 Budget Rule Breakdown
const budgetDiscipline = computed(() => {
    const expenses = analyticsData.value.expense_total || 0
    const investments = analyticsData.value.investment_total || 0
    const net = Math.max(0, analyticsData.value.net || 0)
    const totalOutflows = expenses + investments

    if (totalOutflows <= 0) {
        return {
            needsAmount: 0,
            needsPct: 50,
            wantsAmount: 0,
            wantsPct: 30,
            savingsAmount: 0,
            savingsPct: 20,
            verdict: 'No outflow records in this period'
        }
    }

    const categories = analyticsData.value.categories || []
    let needsTotal = 0
    let wantsTotal = 0

    const needsKeywords = [
        'grocer', 'food', 'rent', 'housing', 'utilit', 'bill',
        'medic', 'health', 'fuel', 'petrol', 'transport', 'educat',
        'insur', 'emi', 'loan', 'tax'
    ]

    categories.forEach((cat: any) => {
        const name = (cat.name || '').toLowerCase()
        const isNeed = needsKeywords.some(k => name.includes(k))
        if (isNeed) {
            needsTotal += cat.value || 0
        } else {
            wantsTotal += cat.value || 0
        }
    })

    const savingsAndInvest = investments + net
    const grandTotal = needsTotal + wantsTotal + savingsAndInvest || 1

    const needsPct = Math.round((needsTotal / grandTotal) * 100)
    const wantsPct = Math.round((wantsTotal / grandTotal) * 100)
    const savingsPct = Math.max(0, 100 - needsPct - wantsPct)

    let verdict = 'Balanced 50/30/20 lifestyle distribution.'
    if (needsPct > 60) verdict = 'Essential living expenses taking higher proportion than target 50%.'
    else if (wantsPct > 40) verdict = 'Discretionary lifestyle outflows exceed recommended 30% threshold.'
    else if (savingsPct >= 20) verdict = 'Superb wealth accumulation exceeding the 20% benchmark.'

    return {
        needsAmount: needsTotal,
        needsPct,
        wantsAmount: wantsTotal,
        wantsPct,
        savingsAmount: savingsAndInvest,
        savingsPct,
        verdict
    }
})

// 3. Weekday vs Weekend Spending Behavior
const weekdayVsWeekend = computed(() => {
    const trend = analyticsData.value.trend || []
    if (trend.length === 0) {
        return {
            weekdayTotal: 0,
            weekendTotal: 0,
            weekdayAvg: 0,
            weekendAvg: 0,
            weekdayDays: 0,
            weekendDays: 0,
            weekendMultiplier: '1.0',
            verdict: 'Evenly distributed across days'
        }
    }

    let weekdayTotal = 0
    let weekendTotal = 0
    let weekdayCount = 0
    let weekendCount = 0

    trend.forEach((d: any) => {
        const dateObj = new Date(d.date)
        const day = dateObj.getDay()
        const amt = d.amount || 0
        if (day === 0 || day === 6) {
            weekendTotal += amt
            weekendCount++
        } else {
            weekdayTotal += amt
            weekdayCount++
        }
    })

    const weekdayAvg = Math.round(weekdayTotal / Math.max(1, weekdayCount))
    const weekendAvg = Math.round(weekendTotal / Math.max(1, weekendCount))
    const multiplier = (weekendAvg / Math.max(1, weekdayAvg)).toFixed(1)

    let verdict = 'Balanced weekday and weekend outflows.'
    if (parseFloat(multiplier) >= 1.5) {
        verdict = `Weekend outflows are ${multiplier}x higher per day than workweek.`
    } else if (parseFloat(multiplier) <= 0.7) {
        verdict = 'Spending concentrated primarily during workweek routine.'
    }

    return {
        weekdayTotal,
        weekendTotal,
        weekdayAvg,
        weekendAvg,
        weekdayDays: weekdayCount,
        weekendDays: weekendCount,
        weekendMultiplier: multiplier,
        verdict
    }
})

// 4. Top Merchants Leaderboard
const topMerchantsList = computed(() => {
    const totalExp = analyticsData.value.expense_total || 1
    return (analyticsData.value.merchants || []).map((m: any, idx: number) => ({
        name: m.name || 'Unknown',
        value: m.value || 0,
        pct: Math.min(100, Math.round(((m.value || 0) / totalExp) * 100)),
        color: chartPalette[idx % chartPalette.length]
    }))
})

// 5. Category Breakdown Interactive List
const categoryBreakdownList = computed(() => {
    const source = breakdownView.value === 'expense' ? analyticsData.value.categories : analyticsData.value.investment_breakdown
    const total = (breakdownView.value === 'expense' ? analyticsData.value.expense_total : analyticsData.value.investment_total) || 1
    return (source || []).map((cat: any, idx: number) => ({
        name: cat.name || 'Uncategorized',
        value: cat.value || 0,
        pct: Math.min(100, Math.round(((cat.value || 0) / total) * 100)),
        color: chartPalette[idx % chartPalette.length]
    }))
})

let lastMonthlyFetchKey = ''

async function fetchMonthlyHistory() {
    const fetchKey = `${localSelectedAccount.value}-${authStore.selectedMemberId}`
    if (monthlyHistory.value.length > 0 && lastMonthlyFetchKey === fetchKey) return

    loadingMonthly.value = true
    try {
        const res = await financeApi.getBudgetHistory(12, authStore.selectedMemberId || undefined, localSelectedAccount.value || undefined)
        monthlyHistory.value = res.data.map((m: any) => {
            const overall = m.data.find((d: any) => d.category === 'OVERALL')
            return {
                label: m.month,
                value: overall ? overall.spent : m.data.reduce((acc: number, d: any) => acc + d.spent, 0)
            }
        })
        lastMonthlyFetchKey = fetchKey
    } catch (e) {
        console.error("Failed to fetch monthly history:", e)
    } finally {
        loadingMonthly.value = false
    }
}

async function fetchFilteredTransactions(options?: any) {
    if (options) {
        transactionPagination.value.page = options.page
        transactionPagination.value.limit = options.itemsPerPage
    }

    loadingTransactions.value = true
    try {
        const res = await financeApi.getTransactions(
            localSelectedAccount.value || undefined,
            transactionPagination.value.page,
            transactionPagination.value.limit,
            startDate.value || undefined,
            endDate.value || undefined,
            selectedTrendCategory.value || undefined,
            undefined,
            'date',
            'desc',
            authStore.selectedMemberId || undefined,
            true,
            true
        )

        filteredTransactions.value = res.data.data
        transactionPagination.value.total = res.data.total
    } catch (e) {
        console.error("Failed to fetch transactions:", e)
    } finally {
        loadingTransactions.value = false
    }
}

watch(trendView, (newVal) => {
    if (newVal === 'monthly') {
        fetchMonthlyHistory()
    }
})

watch([localSelectedAccount, selectedTimeRange, startDate, endDate, () => authStore.selectedMemberId, selectedTrendCategory], () => {
    transactionPagination.value.page = 1
    fetchFilteredTransactions()
})

onMounted(async () => {
    handleTimeRangeChange('this-month')
    fetchFilteredTransactions()
})

watch(() => authStore.selectedMemberId, async () => {
    await fetchAnalyticsData()
})

watch(localSelectedAccount, () => {
    fetchAnalyticsData()
})

function handleTimeRangeChange(val: string) {
    selectedTimeRange.value = val
    const now = new Date()
    const start = new Date()
    const end = new Date()

    startDate.value = ''
    endDate.value = ''

    if (val === 'today') {
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        startDate.value = localDateString(start.getFullYear(), start.getMonth(), start.getDate())
        endDate.value = localDateString(end.getFullYear(), end.getMonth(), end.getDate())
    } else if (val === 'this-week') {
        const day = now.getDay()
        const diffToMonday = (day === 0 ? 6 : day - 1)
        start.setDate(now.getDate() - diffToMonday)
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        startDate.value = localDateString(start.getFullYear(), start.getMonth(), start.getDate())
        endDate.value = localDateString(end.getFullYear(), end.getMonth(), end.getDate())
    } else if (val === 'this-month') {
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(now.getMonth() + 1)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
        startDate.value = localDateString(start.getFullYear(), start.getMonth(), start.getDate())
        endDate.value = localDateString(end.getFullYear(), end.getMonth(), end.getDate())
    } else if (val === 'last-month') {
        start.setMonth(start.getMonth() - 1)
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(end.getMonth())
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
        startDate.value = localDateString(start.getFullYear(), start.getMonth(), start.getDate())
        endDate.value = localDateString(end.getFullYear(), end.getMonth(), end.getDate())
    } else if (val === 'last-30') {
        start.setDate(now.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        startDate.value = localDateString(start.getFullYear(), start.getMonth(), start.getDate())
        endDate.value = localDateString(end.getFullYear(), end.getMonth(), end.getDate())
    } else if (val === 'this-quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3)
        start.setMonth(currentQuarter * 3, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(currentQuarter * 3 + 3, 0)
        end.setHours(23, 59, 59, 999)
        startDate.value = localDateString(start.getFullYear(), start.getMonth(), start.getDate())
        endDate.value = localDateString(end.getFullYear(), end.getMonth(), end.getDate())
    } else if (val === 'this-year') {
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
        startDate.value = localDateString(start.getFullYear(), start.getMonth(), start.getDate())
        endDate.value = localDateString(end.getFullYear(), end.getMonth(), end.getDate())
    }

    fetchAnalyticsData()
}

watch(selectedTrendCategory, () => {
    fetchAnalyticsData()
})

async function fetchAnalyticsData() {
    try {
        const userId = authStore.selectedMemberId || undefined

        const [, forecastRes, budgetRes, historyRes] = await Promise.all([
            insightsStore.fetchAnalytics({
                account_id: localSelectedAccount.value || undefined,
                start_date: startDate.value || undefined,
                end_date: endDate.value || undefined,
                category: selectedTrendCategory.value || undefined
            }),
            financeApi.getForecast(localSelectedAccount.value || undefined, 30, userId),
            financeApi.getBudgets(undefined, undefined, userId),
            financeApi.getBudgetHistory(6, userId, localSelectedAccount.value || undefined)
        ])
        forecastData.value = forecastRes.data
        budgets.value = budgetRes.data
        budgetHistory.value = historyRes.data

        if (trendView.value === 'monthly') {
            fetchMonthlyHistory()
        }
    } catch (e) {
        console.error(e)
    }
}

const categoryOptions = computed(() => {
    const parents = store.categories.filter(c => !c.parent_id)
    const result: any[] = [{ title: 'All Spending', value: '', icon: '📊', isChild: false }]

    parents.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
        result.push({ title: p.name, value: p.name, icon: p.icon || '🏷️', isChild: false })
        const children = store.categories.filter(c => c.parent_id === p.id)
        children.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
            result.push({ title: c.name, value: c.name, icon: c.icon || '🔹', isChild: true })
        })
    })

    return result
})

const filteredTrendData = computed(() => {
    if (trendView.value === 'monthly') {
        return monthlyHistory.value
    }
    const trend = analyticsData.value.trend || []
    return trend.map((d: any) => ({ label: d.date, value: d.amount }))
})

const trendChartData = computed(() => {
    const color = selectedTrendCategory.value ? store.getCategoryColor(selectedTrendCategory.value) : '#6366F1'
    const bgColor = color.startsWith('#') ? color + '20' : 'rgba(99, 102, 241, 0.1)'

    return {
        labels: filteredTrendData.value.map((d: any) => {
            if (trendView.value === 'daily') return d.label.slice(5)
            if (d.label.includes(' ')) return d.label
            const parts = d.label.split('-')
            if (parts.length < 2) return d.label
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1)
            return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        }),
        datasets: [{
            label: selectedTrendCategory.value || 'All Spending',
            data: filteredTrendData.value.map((d: any) => d.value / (settings.maskingFactor || 1)),
            borderColor: color,
            backgroundColor: bgColor,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: color
        }]
    }
})

const heatmapData = computed(() => {
    return analyticsData.value.heatmap
})

const merchantChartData = computed(() => ({
    labels: analyticsData.value.merchants?.map((m: any) => m.name) || [],
    datasets: [{
        label: 'Spending',
        data: analyticsData.value.merchants?.map((m: any) => m.value / (settings.maskingFactor || 1)) || [],
        backgroundColor: analyticsData.value.merchants?.map((_: any, i: number) => chartPalette[i % chartPalette.length]) || [],
        borderRadius: 6,
        borderSkipped: false
    }]
}))

const categoryChartData = computed(() => {
    const source = breakdownView.value === 'expense' ? analyticsData.value.categories : analyticsData.value.investment_breakdown
    return {
        labels: source?.map((c: any) => c.name) || [],
        datasets: [{
            data: source?.map((c: any) => c.value / (settings.maskingFactor || 1)) || [],
            backgroundColor: source?.map((_: any, i: number) => chartPalette[i % chartPalette.length]) || [],
            hoverOffset: 12,
            borderWidth: 0
        }]
    }
})

const forecastChartData = computed(() => ({
    labels: forecastData.value.map((d: any) => d.date.split('T')[0].slice(5)),
    datasets: [{
        label: 'Projected Balance',
        data: forecastData.value.map((d: any) => d.balance / (settings.maskingFactor || 1)),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0
    }]
}))
</script>
