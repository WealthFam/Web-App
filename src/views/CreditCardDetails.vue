<template>
    <MainLayout>
        <div class="space-y-5">
            <!-- Back to Credit Cards Navigation (Matching AccountDetails.vue) -->
            <div>
                <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-xs font-semibold text-wf-text-muted hover:text-wf-text-primary transition-colors cursor-pointer"
                    @click="router.push('/credit-cards')"
                >
                    <ChevronLeft :size="16" />
                    <span>Back to Credit Cards</span>
                </button>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3">
                <div class="w-8 h-8 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
                <span class="text-xs font-medium text-wf-text-muted">Loading card telemetry...</span>
            </div>

            <!-- Card Content -->
            <div v-else-if="card" class="space-y-6">
                <!-- Header: Icon, Identity, Actions -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-wf-border-subtle">
                    <div class="flex items-start sm:items-center gap-3.5">
                        <div class="w-12 h-12 rounded-wf-xl flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <CreditCard :size="24" />
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary">
                                    {{ card.name }}
                                </h1>
                                <span 
                                    v-if="card.is_verified === false"
                                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                >
                                    <AlertCircle :size="10" />
                                    <span>Unverified</span>
                                </span>
                            </div>
                            <div class="flex items-center flex-wrap gap-2 text-xs text-wf-text-muted mt-1">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                    {{ card.card_network || 'Card' }}
                                </span>
                                <span v-if="card.card_tier" class="px-2 py-0.5 rounded text-[10px] font-medium bg-wf-surface-variant text-wf-text-secondary">
                                    {{ card.card_tier }}
                                </span>
                                <span v-if="card.card_last_4" class="font-mono text-[10px] bg-wf-surface-variant text-wf-text-secondary px-1.5 py-0.5 rounded">
                                    ••{{ card.card_last_4 }}
                                </span>
                                <span class="opacity-40">•</span>
                                <span class="text-xs text-wf-text-muted font-medium">
                                    Billing Day: <strong class="text-wf-text-secondary">{{ card.billing_day || 'N/A' }}</strong>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-2 flex-wrap">
                        <WfButton
                            variant="primary"
                            size="sm"
                            class="bg-emerald-600 hover:bg-emerald-500 text-white"
                            @click="openPayModal"
                        >
                            <DollarSign :size="14" class="mr-1" />
                            <span>Pay Bill</span>
                        </WfButton>

                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="openEditModal"
                        >
                            <Edit2 :size="14" class="mr-1" />
                            <span>Edit Card</span>
                        </WfButton>

                        <WfButton
                            variant="ghost"
                            size="sm"
                            class="text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            @click="showDeleteConfirm = true"
                        >
                            <Trash2 :size="14" class="mr-1" />
                            <span>Delete</span>
                        </WfButton>
                    </div>
                </div>

                <!-- 4 Metrics Strip (Matching AccountDetails.vue) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between">
                        <div>
                            <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                                Current Outstanding
                            </div>
                            <div class="text-xl sm:text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                                {{ formatAmount(card.balance) }}
                            </div>
                        </div>
                        <div class="text-[11px] text-wf-text-muted mt-2 pt-2 border-t border-wf-border-subtle">
                            Total Limit: {{ formatAmount(card.credit_limit) }}
                        </div>
                    </WfCard>

                    <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between">
                        <div>
                            <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                                Available Limit
                            </div>
                            <div class="text-xl sm:text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                                {{ formatAmount(card.available_limit) }}
                            </div>
                        </div>
                        <div class="text-[11px] text-wf-text-muted mt-2 pt-2 border-t border-wf-border-subtle flex items-center justify-between">
                            <span>Utilization: {{ card.utilization }}%</span>
                            <span :class="utilizationTextClass" class="font-bold">{{ card.status }}</span>
                        </div>
                    </WfCard>

                    <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between">
                        <div>
                            <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                                Statement Due
                            </div>
                            <div class="text-xl sm:text-2xl font-bold font-mono tracking-tight text-wf-text-primary mt-1">
                                {{ formatAmount(card.statement_balance) }}
                            </div>
                        </div>
                        <div class="text-[11px] text-wf-text-muted mt-2 pt-2 border-t border-wf-border-subtle">
                            <span v-if="card.next_due_date">Due on {{ formatDate(card.next_due_date) }}</span>
                            <span v-else>No pending bill due</span>
                        </div>
                    </WfCard>

                    <WfCard variant="flat" padding="md" radius="xl" class="border border-wf-border flex flex-col justify-between">
                        <div>
                            <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                                Minimum Due
                            </div>
                            <div class="text-xl sm:text-2xl font-bold font-mono tracking-tight text-amber-500 mt-1">
                                {{ formatAmount(card.minimum_due) }}
                            </div>
                        </div>
                        <div class="text-[11px] text-wf-text-muted mt-2 pt-2 border-t border-wf-border-subtle">
                            {{ dueNotice }}
                        </div>
                    </WfCard>
                </div>

                <!-- Billing Cycle Ledger Section -->
                <div class="space-y-4 pt-2">
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                            <h2 class="text-base sm:text-lg font-bold text-wf-text-primary flex items-center gap-2">
                                <Receipt :size="18" class="text-wf-primary" />
                                <span>Cycle Ledger & Statement History</span>
                            </h2>
                            <p class="text-xs text-wf-text-secondary mt-0.5">
                                Transactions filtered strictly by billing cycle timeframe rather than calendar months.
                            </p>
                        </div>

                        <!-- Cycle Horizon Controls -->
                        <div class="flex items-center gap-2 flex-wrap">
                            <!-- Quick Tabs -->
                            <div class="flex items-center p-0.5 bg-wf-surface-variant/80 rounded-wf-md border border-wf-border text-xs font-semibold">
                                <button
                                    type="button"
                                    class="px-2.5 py-1 rounded-wf-sm transition-all cursor-pointer flex items-center gap-1.5"
                                    :class="selectedCycle === 'current_unbilled'
                                        ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                        : 'text-wf-text-secondary hover:text-wf-text-primary'"
                                    @click="selectedCycle = 'current_unbilled'"
                                >
                                    <span>Current Cycle</span>
                                    <span 
                                        class="px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-mono"
                                        :class="selectedCycle === 'current_unbilled' 
                                            ? 'bg-wf-primary/10 text-wf-primary font-bold' 
                                            : 'bg-wf-surface text-wf-text-muted'"
                                    >
                                        {{ cycleCounts.current_unbilled }}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    class="px-2.5 py-1 rounded-wf-sm transition-all cursor-pointer flex items-center gap-1.5"
                                    :class="isLastStatementActive
                                        ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                        : 'text-wf-text-secondary hover:text-wf-text-primary'"
                                    @click="selectedCycle = 'last_statement'"
                                >
                                    <span>Last Statement</span>
                                    <span 
                                        class="px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-mono"
                                        :class="isLastStatementActive 
                                            ? 'bg-wf-primary/10 text-wf-primary font-bold' 
                                            : 'bg-wf-surface text-wf-text-muted'"
                                    >
                                        {{ cycleCounts.last_statement }}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    class="px-2.5 py-1 rounded-wf-sm transition-all cursor-pointer flex items-center gap-1.5"
                                    :class="selectedCycle === 'all'
                                        ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                                        : 'text-wf-text-secondary hover:text-wf-text-primary'"
                                    @click="selectedCycle = 'all'"
                                >
                                    <span>All</span>
                                    <span 
                                        class="px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-mono"
                                        :class="selectedCycle === 'all' 
                                            ? 'bg-wf-primary/10 text-wf-primary font-bold' 
                                            : 'bg-wf-surface text-wf-text-muted'"
                                    >
                                        {{ cycleCounts.all }}
                                    </span>
                                </button>
                            </div>

                            <!-- Past Cycle Selector Dropdown with Proper Dates -->
                            <div class="w-full sm:w-auto min-w-[210px] sm:min-w-[260px]">
                                <WfSelect
                                    v-model="selectedCycle"
                                    size="sm"
                                    :items="cycleDropdownOptions"
                                    placeholder="Select Past Cycle..."
                                    aria-label="Select Billing Cycle"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Enhanced Cycle Summary Snippet with Proper Dates -->
                    <div class="p-3.5 rounded-wf-lg bg-wf-surface-variant/30 border border-wf-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div class="flex items-center gap-3 flex-wrap">
                            <div class="flex items-center gap-1.5">
                                <Calendar :size="13" class="text-wf-primary shrink-0" />
                                <span class="font-bold text-wf-text-primary">{{ currentCycleSummary.label }}</span>
                                <span v-if="currentCycleSummary.date_range_label" class="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                    ({{ currentCycleSummary.date_range_label }})
                                </span>
                            </div>
                            <span class="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
                            <div class="flex items-center gap-1.5">
                                <span class="text-wf-text-muted font-semibold">Spend:</span>
                                <span class="font-black tabular-nums text-rose-600 dark:text-rose-400">
                                    {{ formatAmount(currentCycleSummary.spend) }}
                                </span>
                            </div>
                            <template v-if="currentCycleSummary.payments > 0">
                                <span class="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
                                <div class="flex items-center gap-1.5">
                                    <span class="text-wf-text-muted font-semibold">Payments:</span>
                                    <span class="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        {{ formatAmount(currentCycleSummary.payments) }}
                                    </span>
                                </div>
                            </template>
                        </div>
                        <div class="flex items-center gap-3 flex-wrap text-[11px] text-wf-text-muted font-medium">
                            <span v-if="currentCycleSummary.statement_date">
                                Statement: <strong class="text-wf-text-secondary">{{ formatDate(currentCycleSummary.statement_date) }}</strong>
                            </span>
                            <span v-if="currentCycleSummary.due_date">
                                · Due: <strong class="text-wf-text-secondary">{{ formatDate(currentCycleSummary.due_date) }}</strong>
                            </span>
                            <span>
                                · Total: <strong class="text-wf-text-secondary">{{ currentCycleSummary.count }} txs</strong>
                            </span>
                        </div>
                    </div>

                    <!-- Search Filter for Ledger -->
                    <div class="flex items-center justify-between gap-3">
                        <div class="relative w-full sm:w-72">
                            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search :size="14" class="text-wf-text-muted shrink-0" />
                            </div>
                            <input
                                v-model="txSearchQuery"
                                type="text"
                                placeholder="Filter cycle transactions..."
                                class="w-full h-8 pl-9 pr-8 text-xs bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary transition-colors"
                            />
                            <div v-if="txSearchQuery" class="absolute inset-y-0 right-0 flex items-center pr-2.5">
                                <button
                                    type="button"
                                    class="text-wf-text-muted hover:text-wf-text-primary p-0.5 rounded cursor-pointer flex items-center justify-center"
                                    aria-label="Clear search"
                                    @click="txSearchQuery = ''"
                                >
                                    <X :size="13" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Transactions Table -->
                    <div class="rounded-wf-lg border border-wf-border bg-wf-surface overflow-hidden shadow-2xs">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr class="border-b border-wf-border bg-wf-surface-variant/70 text-[11px] font-bold text-wf-text-muted uppercase tracking-wider">
                                        <th class="py-2.5 px-3 w-28">Date</th>
                                        <th class="py-2.5 px-3 min-w-[200px]">Merchant / Description</th>
                                        <th class="py-2.5 px-3">Category</th>
                                        <th class="py-2.5 px-3 text-right w-32">Amount</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-wf-border-subtle">
                                    <tr 
                                        v-for="item in filteredTransactions" 
                                        :key="item.id"
                                        class="hover:bg-wf-surface-variant/40 transition-colors"
                                    >
                                        <td class="py-2 px-3 whitespace-nowrap text-wf-text-secondary font-medium tabular-nums">
                                            {{ formatDate(item.date) }}
                                        </td>
                                        <td class="py-2 px-3">
                                            <div class="font-semibold text-wf-text-primary line-clamp-1">
                                                {{ item.recipient || item.description || 'Transaction' }}
                                            </div>
                                            <div v-if="item.recipient && item.description !== item.recipient" class="text-[10px] text-wf-text-muted line-clamp-1">
                                                {{ item.description }}
                                            </div>
                                        </td>
                                        <td class="py-2 px-3 whitespace-nowrap">
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                                                {{ item.category || 'Uncategorized' }}
                                            </span>
                                        </td>
                                        <td class="py-2 px-3 text-right whitespace-nowrap font-bold tabular-nums" :class="Number(item.amount) >= 0 ? 'text-wf-success' : 'text-wf-error'">
                                            {{ Number(item.amount) >= 0 ? '+' : '-' }}{{ formatAmount(Math.abs(item.amount)) }}
                                        </td>
                                    </tr>

                                    <tr v-if="loadingTransactions">
                                        <td colspan="4" class="py-8 text-center text-wf-text-muted">
                                            <div class="flex items-center justify-center gap-2">
                                                <div class="w-4 h-4 border-2 border-wf-primary border-t-transparent rounded-full animate-spin"></div>
                                                <span class="text-xs font-semibold">Loading cycle transactions...</span>
                                            </div>
                                        </td>
                                    </tr>

                                    <tr v-else-if="filteredTransactions.length === 0">
                                        <td colspan="4" class="py-10 px-4 text-center">
                                            <div class="max-w-md mx-auto space-y-3">
                                                <div class="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                                    <CheckCircle2 :size="22" />
                                                </div>
                                                <div v-if="selectedCycle === 'current_unbilled'">
                                                    <div class="text-xs font-bold text-wf-text-primary">No unbilled charges in current cycle</div>
                                                    <div class="text-[11px] text-wf-text-muted mt-1 leading-relaxed">
                                                        No new purchases were posted since the statement on {{ formatDate(card.last_statement_date) }}.
                                                        <span v-if="Number(card.balance || 0) > 0">
                                                            Your current outstanding of {{ formatAmount(card.balance) }} is billed in previous statements.
                                                        </span>
                                                    </div>
                                                    <div class="flex items-center justify-center gap-2 mt-3 flex-wrap">
                                                        <button
                                                            v-if="cycleCounts.last_statement > 0"
                                                            type="button"
                                                            class="px-3 py-1 text-xs font-semibold rounded-wf-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 cursor-pointer transition-colors"
                                                            @click="selectedCycle = 'last_statement'"
                                                        >
                                                            View Last Statement ({{ cycleCounts.last_statement }} txs)
                                                        </button>
                                                        <button
                                                            v-if="cycleCounts.all > 0"
                                                            type="button"
                                                            class="px-3 py-1 text-xs font-semibold rounded-wf-md bg-wf-surface-variant hover:bg-wf-surface-variant/80 text-wf-text-secondary border border-wf-border cursor-pointer transition-colors"
                                                            @click="selectedCycle = 'all'"
                                                        >
                                                            View All History ({{ cycleCounts.all }} txs)
                                                        </button>
                                                    </div>
                                                </div>
                                                <div v-else-if="isLastStatementActive">
                                                    <div class="text-xs font-bold text-wf-text-primary">No transactions found in last statement period</div>
                                                    <div class="text-[11px] text-wf-text-muted mt-1 leading-relaxed">
                                                        No charges or payments were recorded for the statement cycle ending {{ formatDate(card.last_statement_date) }}.
                                                    </div>
                                                    <div class="flex items-center justify-center gap-2 mt-3 flex-wrap">
                                                        <button
                                                            v-if="cycleCounts.all > 0"
                                                            type="button"
                                                            class="px-3 py-1 text-xs font-semibold rounded-wf-md bg-wf-surface-variant hover:bg-wf-surface-variant/80 text-wf-text-secondary border border-wf-border cursor-pointer transition-colors"
                                                            @click="selectedCycle = 'all'"
                                                        >
                                                            View All History ({{ cycleCounts.all }} txs)
                                                        </button>
                                                    </div>
                                                </div>
                                                <div v-else-if="selectedCycle === 'all'">
                                                    <div class="text-xs font-bold text-wf-text-primary">No transactions found for this card</div>
                                                    <div class="text-[11px] text-wf-text-muted mt-1 leading-relaxed">
                                                        Transactions imported or recorded under {{ card.name }} will appear here.
                                                    </div>
                                                </div>
                                                <div v-else>
                                                    <div class="text-xs font-bold text-wf-text-primary">No transactions in {{ currentCycleSummary.label }}</div>
                                                    <div class="text-[11px] text-wf-text-muted mt-1 leading-relaxed">
                                                        No charges or payments were recorded during {{ currentCycleSummary.date_range_label }}.
                                                    </div>
                                                    <div class="flex items-center justify-center gap-2 mt-3 flex-wrap">
                                                        <button
                                                            v-if="cycleCounts.all > 0"
                                                            type="button"
                                                            class="px-3 py-1 text-xs font-semibold rounded-wf-md bg-wf-surface-variant hover:bg-wf-surface-variant/80 text-wf-text-secondary border border-wf-border cursor-pointer transition-colors"
                                                            @click="selectedCycle = 'all'"
                                                        >
                                                            View All History ({{ cycleCounts.all }} txs)
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Not Found State -->
            <div v-else class="text-center py-20 animate-in">
                <div class="w-16 h-16 rounded-full bg-wf-surface-variant text-wf-text-muted flex items-center justify-center mx-auto mb-4">
                    <CreditCard :size="32" class="opacity-40" />
                </div>
                <h3 class="text-base font-bold text-wf-text-primary">Credit Card not found</h3>
                <p class="text-xs text-wf-text-muted mt-1 mb-4">This card may have been deleted or does not exist.</p>
                <WfButton variant="outline" size="sm" @click="router.push('/credit-cards')">
                    Back to Credit Cards
                </WfButton>
            </div>

            <!-- Edit Card Modal -->
            <WfModal
                v-model="cardModal"
                max-width="md"
                title="Edit Credit Card"
                description="Update credit limit, billing days, and details."
            >
                <form @submit.prevent="saveCard" class="space-y-4 py-1">
                    <WfInput
                        v-model="cardForm.name"
                        label="Card Name"
                        required
                    />

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfInput
                            v-model.number="cardForm.credit_limit"
                            label="Total Credit Limit (₹)"
                            type="number"
                            required
                        />
                        <WfInput
                            v-model="cardForm.card_last_4"
                            label="Last 4 Digits"
                            maxlength="4"
                        />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfInput
                            v-model.number="cardForm.billing_day"
                            label="Statement / Billing Day (1-31)"
                            type="number"
                            min="1"
                            max="31"
                        />
                        <WfInput
                            v-model.number="cardForm.due_day"
                            label="Payment Due Day (1-31)"
                            type="number"
                            min="1"
                            max="31"
                        />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <WfSelect
                            v-model="cardForm.card_network"
                            label="Card Network"
                            :items="networkOptions"
                        />
                        <WfInput
                            v-model="cardForm.card_tier"
                            label="Card Tier / Program"
                        />
                    </div>

                    <div class="flex items-center justify-end gap-2 pt-3 border-t border-wf-border">
                        <WfButton
                            variant="outline"
                            size="sm"
                            type="button"
                            @click="cardModal = false"
                        >
                            Cancel
                        </WfButton>
                        <WfButton
                            variant="primary"
                            size="sm"
                            type="submit"
                            :loading="savingCard"
                        >
                            Save Changes
                        </WfButton>
                    </div>
                </form>
            </WfModal>

            <!-- Mark Paid / Pay Bill Modal (3-mode) -->
            <MarkCardPaidModal
                :show="payModal"
                :card-id="card?.account_id || card?.id || ''"
                :card-name="card?.name || 'Credit Card'"
                :default-amount="Number(card?.statement_balance || card?.balance || 0)"
                :bank-accounts="bankAccountOptions"
                @close="payModal = false"
                @paid="fetchCardDetails"
            />

            <!-- Delete Confirmation Modal -->
            <WfModal
                v-model="showDeleteConfirm"
                max-width="sm"
                title="Delete Credit Card?"
                description="Irreversible Action"
            >
                <div class="space-y-4 py-1">
                    <div class="p-3.5 rounded-wf-md bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <Trash2 :size="20" class="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div class="text-xs text-wf-text-primary">
                            You are about to permanently delete <strong class="text-rose-600 dark:text-rose-400">{{ card?.name }}</strong>.
                        </div>
                    </div>

                    <div class="text-[11px] text-wf-text-muted italic bg-wf-surface-variant/20 p-2.5 rounded-wf-sm border border-wf-border-subtle">
                        Warning: Card cycle details will be removed from future billing calculations. Historical ledger transactions will be preserved.
                    </div>
                </div>

                <template #footer>
                    <div class="flex items-center justify-end gap-2 w-full">
                        <WfButton
                            variant="outline"
                            size="sm"
                            @click="showDeleteConfirm = false"
                        >
                            Keep Card
                        </WfButton>
                        <WfButton
                            variant="danger"
                            size="sm"
                            :loading="isDeletingCard"
                            @click="confirmDeleteCard"
                        >
                            <Trash2 :size="13" class="mr-1" />
                            <span>Confirm Delete</span>
                        </WfButton>
                    </div>
                </template>
            </WfModal>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
    ChevronLeft, CreditCard, DollarSign, Edit2, Trash2, Calendar,
    Receipt, CheckCircle2, Search, X, AlertCircle
} from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import MarkCardPaidModal from '@/components/finance/MarkCardPaidModal.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'

const route = useRoute()
const router = useRouter()
const { formatAmount } = useCurrency()
const notification = useNotificationStore()

const loading = ref(true)
const card = ref<any>(null)
const cardId = computed(() => route.params.id as string)

// Delete confirm modal state
const showDeleteConfirm = ref(false)
const isDeletingCard = ref(false)

// Cycle transactions state - ALWAYS default to current_unbilled
const selectedCycle = ref('current_unbilled')
const cycleTransactions = ref<any[]>([])
const loadingTransactions = ref(false)
const availableCycles = ref<any[]>([])
const activeCycleData = ref<any>(null)
const txSearchQuery = ref('')
const cycleCounts = ref({
    current_unbilled: 0,
    last_statement: 0,
    all: 0
})

const networkOptions = [
    { title: 'VISA', value: 'VISA' },
    { title: 'Mastercard', value: 'MASTERCARD' },
    { title: 'RuPay', value: 'RUPAY' },
    { title: 'American Express', value: 'AMEX' },
    { title: 'Diners Club', value: 'DINERS' },
    { title: 'Other', value: 'OTHER' }
]

// Bank accounts for bill pay
const bankAccounts = ref<any[]>([])

// Card Modal State
const cardModal = ref(false)
const savingCard = ref(false)
const cardForm = reactive({
    name: '',
    credit_limit: 100000,
    card_last_4: '',
    billing_day: 15,
    due_day: 5,
    card_network: 'VISA',
    card_tier: '',
    is_verified: true
})

// Pay Modal State
const payModal = ref(false)
const payForm = reactive({
    source_account_id: '',
    amount: 0,
    date: new Date().toISOString().substring(0, 10),
    description: 'Credit Card Bill Payment'
})

const utilizationTextClass = computed(() => {
    const util = Number(card.value?.utilization || 0)
    if (util > 70) return 'text-wf-error'
    if (util > 30) return 'text-amber-500'
    return 'text-wf-success'
})

const dueNotice = computed(() => {
    if (!card.value || !card.value.next_due_date) return 'No pending bill due'
    const days = card.value.days_until_due
    if (days == null) return `Due on ${formatDate(card.value.next_due_date)}`
    if (days < 0) return `⚠️ Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}!`
    if (days === 0) return '⚡ Due Today!'
    if (days <= 3) return `🔥 Due in ${days} day${days === 1 ? '' : 's'}`
    return `Due in ${days} days`
})

const isLastStatementActive = computed(() => {
    if (selectedCycle.value === 'last_statement') return true
    const lastStmt = availableCycles.value.find(c => c.is_last_statement)
    return !!(lastStmt && selectedCycle.value === lastStmt.id)
})

const cycleDropdownOptions = computed(() => {
    const list: { title: string; value: string }[] = []
    
    for (const c of availableCycles.value) {
        let label = c.label
        if (c.date_range_label) {
            label += ` (${c.date_range_label})`
        }
        if (c.count > 0) {
            label += ` · ${c.count} txs`
            if (c.spend > 0) {
                label += ` · ${formatAmount(c.spend)}`
            }
        } else {
            label += ` · 0 txs`
        }
        list.push({
            title: label,
            value: c.id
        })
    }

    list.push({
        title: `All Lifetime History · ${cycleCounts.value.all} txs`,
        value: 'all'
    })

    return list
})

const currentCycleSummary = computed(() => {
    if (activeCycleData.value) {
        return {
            label: activeCycleData.value.label || 'Cycle',
            date_range_label: activeCycleData.value.date_range_label || '',
            spend: Number(activeCycleData.value.spend || 0),
            payments: Number(activeCycleData.value.payments || 0),
            statement_date: activeCycleData.value.statement_date || null,
            due_date: activeCycleData.value.due_date || null,
            count: activeCycleData.value.count != null ? activeCycleData.value.count : cycleTransactions.value.length
        }
    }
    
    if (selectedCycle.value === 'current_unbilled') {
        return {
            label: 'Current Cycle (Unbilled)',
            date_range_label: card.value?.last_statement_date ? `Since ${formatDate(card.value.last_statement_date)}` : 'Live Spends',
            spend: Number(card.value?.unbilled_spend || 0),
            payments: Number(card.value?.current_cycle_payments || 0),
            statement_date: null,
            due_date: null,
            count: cycleCounts.value.current_unbilled
        }
    }

    if (isLastStatementActive.value) {
        return {
            label: 'Last Statement Period',
            date_range_label: formatDate(card.value?.last_statement_date),
            spend: Number(card.value?.statement_balance || 0),
            payments: Number(card.value?.last_cycle_payments || 0),
            statement_date: card.value?.last_statement_date,
            due_date: card.value?.next_due_date,
            count: cycleCounts.value.last_statement
        }
    }

    return {
        label: 'All History',
        date_range_label: 'Lifetime Transactions',
        spend: Number(card.value?.balance || 0),
        payments: 0,
        statement_date: null,
        due_date: null,
        count: cycleCounts.value.all
    }
})

const filteredTransactions = computed(() => {
    if (!txSearchQuery.value.trim()) return cycleTransactions.value
    const q = txSearchQuery.value.toLowerCase().trim()
    return cycleTransactions.value.filter(t => 
        (t.recipient && t.recipient.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
    )
})

const bankAccountOptions = computed(() => {
    return bankAccounts.value.map(b => ({
        title: `${b.name} (${formatAmount(b.balance)})`,
        value: b.id
    }))
})

function formatDate(iso?: string) {
    if (!iso) return 'N/A'
    try {
        const d = new Date(iso)
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
        return iso
    }
}

async function fetchCardDetails() {
    loading.value = true
    try {
        const res = await financeApi.getCreditCard(cardId.value)
        card.value = res.data
        await fetchCycleTransactions()
    } catch (e) {
        console.error('Failed to fetch card details', e)
        notification.error('Failed to load card details')
    } finally {
        loading.value = false
    }
}

async function fetchBankAccounts() {
    try {
        const res = await financeApi.getAccounts()
        const raw = res.data?.data || res.data || []
        bankAccounts.value = raw.filter((a: any) => a.type === 'BANK' && !a.is_deleted)
    } catch (e) {
        console.error('Failed to load bank accounts', e)
    }
}

async function fetchCycleTransactions() {
    if (!cardId.value) return
    loadingTransactions.value = true
    try {
        const targetId = card.value?.account_id || cardId.value
        const res = await financeApi.getCreditCardCycleTransactions(targetId, {
            cycle: selectedCycle.value,
            limit: 100
        })
        cycleTransactions.value = res.data?.items || []
        if (res.data?.cycle_info) {
            const info = res.data.cycle_info
            if (info.cycles) {
                availableCycles.value = info.cycles
            }
            if (info.active_cycle) {
                activeCycleData.value = info.active_cycle
            }
            if (info.counts) {
                cycleCounts.value = {
                    current_unbilled: info.counts.current_unbilled || 0,
                    last_statement: info.counts.last_statement || 0,
                    all: info.counts.all || 0
                }
            }
        }
    } catch (e) {
        console.error('Failed to fetch cycle transactions', e)
    } finally {
        loadingTransactions.value = false
    }
}

watch(selectedCycle, () => {
    fetchCycleTransactions()
})

function openEditModal() {
    if (!card.value) return
    cardForm.name = card.value.name
    cardForm.credit_limit = Number(card.value.credit_limit || 0)
    cardForm.card_last_4 = card.value.card_last_4 || ''
    cardForm.billing_day = card.value.billing_day || 15
    cardForm.due_day = card.value.due_day || 5
    cardForm.card_network = card.value.card_network || 'VISA'
    cardForm.card_tier = card.value.card_tier || ''
    cardForm.is_verified = card.value.is_verified !== false
    cardModal.value = true
}

async function saveCard() {
    savingCard.value = true
    try {
        const targetId = card.value.account_id || card.value.id
        await financeApi.updateCreditCard(targetId, {
            name: cardForm.name,
            credit_limit: cardForm.credit_limit,
            billing_day: cardForm.billing_day,
            due_day: cardForm.due_day,
            card_network: cardForm.card_network,
            card_tier: cardForm.card_tier,
            card_last_4: cardForm.card_last_4,
            is_verified: cardForm.is_verified
        })
        notification.success('Credit card updated successfully')
        cardModal.value = false
        await fetchCardDetails()
    } catch (e) {
        console.error('Failed to update card', e)
        notification.error('Failed to save changes')
    } finally {
        savingCard.value = false
    }
}

function openPayModal() {
    if (!card.value) return
    payForm.amount = Number(card.value.statement_balance || card.value.balance || 0)
    payForm.source_account_id = bankAccounts.value.length ? bankAccounts.value[0].id : ''
    payForm.date = new Date().toISOString().substring(0, 10)
    payForm.description = `Bill Payment - ${card.value.name}`
    payModal.value = true
}

async function confirmDeleteCard() {
    isDeletingCard.value = true
    try {
        const targetId = card.value.account_id || card.value.id
        await financeApi.deleteCreditCard(targetId)
        notification.success('Credit card deleted successfully')
        showDeleteConfirm.value = false
        router.push('/credit-cards')
    } catch (e) {
        console.error('Failed to delete credit card', e)
        notification.error('Failed to delete credit card')
    } finally {
        isDeletingCard.value = false
    }
}

onMounted(() => {
    fetchCardDetails()
    fetchBankAccounts()
})
</script>
