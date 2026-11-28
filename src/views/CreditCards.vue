<template>
    <MainLayout>
        <div class="space-y-5">
            <!-- Header Section (Matching Accounts.vue) -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wf-border-subtle">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shadow-2xs shrink-0">
                        <CreditCard class="w-4.5 h-4.5 text-wf-primary" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-lg sm:text-xl font-bold text-wf-text-primary tracking-tight leading-tight">
                                Credit Cards
                            </h1>
                            <span class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                                {{ verifiedCards.length }} Active
                            </span>
                        </div>
                        <p class="text-xs text-wf-text-secondary mt-0.5">
                            Manage credit cards, track statement billing cycles, unbilled spends, and credit utilization.
                        </p>
                    </div>
                </div>

                <!-- Navigation Tabs (Pill Segmented Switcher Matching Accounts.vue) -->
                <div class="flex items-center p-0.5 bg-wf-surface-variant/80 rounded-wf-md border border-wf-border shadow-2xs text-xs font-semibold self-start sm:self-auto">
                    <button
                        type="button"
                        class="flex items-center gap-1.5 px-3 py-1 rounded-wf-sm transition-all cursor-pointer"
                        :class="activeTab === 'approved'
                            ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                            : 'text-wf-text-secondary hover:text-wf-text-primary'"
                        @click="activeTab = 'approved'"
                    >
                        <CreditCard :size="14" />
                        <span>Approved</span>
                    </button>
                    <button
                        type="button"
                        class="flex items-center gap-1.5 px-3 py-1 rounded-wf-sm transition-all cursor-pointer"
                        :class="activeTab === 'triage'
                            ? 'bg-wf-surface text-wf-primary shadow-xs border border-wf-border/60'
                            : 'text-wf-text-secondary hover:text-wf-text-primary'"
                        @click="activeTab = 'triage'"
                    >
                        <AlertCircle :size="14" class="text-amber-500" />
                        <span>Triage</span>
                        <span
                            v-if="untrustedCards.length > 0"
                            class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        >
                            {{ untrustedCards.length }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- Summary Stats Strip (Matching Accounts.vue) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Total Outstanding -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-error-light text-wf-error border border-rose-500/20 flex items-center justify-center shrink-0">
                            <CreditCard :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Total Outstanding
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-wf-error mt-0.5">
                            {{ formatAmount(totalOutstanding) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Across {{ verifiedCards.length }} active card{{ verifiedCards.length === 1 ? '' : 's' }}
                        </div>
                    </div>
                </WfCard>

                <!-- Available Limit -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-success-light text-wf-success border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <ShieldCheck :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Available Limit
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-wf-success mt-0.5">
                            {{ formatAmount(totalAvailableLimit) }}
                        </div>
                        <div class="text-[11px] text-wf-text-secondary mt-1">
                            Total Limit: {{ formatAmount(totalLimit) }}
                        </div>
                    </div>
                </WfCard>

                <!-- Credit Utilization -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-wf-warning-light text-wf-warning border border-amber-500/20 flex items-center justify-center shrink-0">
                            <Zap :size="20" />
                        </div>
                        <span 
                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                            :class="utilizationBadgeClass"
                        >
                            {{ utilizationStatus }}
                        </span>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Credit Utilization
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight mt-0.5" :class="utilizationTextClass">
                            {{ overallUtilization.toFixed(1) }}%
                        </div>
                        <div class="w-full bg-wf-surface-variant rounded-full h-1.5 mt-2 overflow-hidden">
                            <div 
                                class="h-1.5 rounded-full transition-all duration-300" 
                                :class="utilizationBarClass"
                                :style="{ width: `${overallUtilization}%` }"
                            ></div>
                        </div>
                    </div>
                </WfCard>

                <!-- Upcoming Payment -->
                <WfCard variant="flat" padding="md" radius="lg" class="border border-wf-border flex flex-col justify-between">
                    <div class="flex items-start justify-between">
                        <div class="w-10 h-10 rounded-wf-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <Clock :size="20" />
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="text-[11px] font-semibold text-wf-text-muted uppercase tracking-wider">
                            Upcoming Bill
                        </div>
                        <div class="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-wf-text-primary mt-0.5">
                            {{ formatAmount(nextDueAmount) }}
                        </div>
                        <div class="text-[11px] font-semibold mt-1" :class="nextDueStatusClass">
                            {{ nextDueNotice }}
                        </div>
                    </div>
                </WfCard>
            </div>

            <!-- Unified Toolbar (Matching Accounts.vue) -->
            <WfCard variant="flat" padding="sm" radius="lg" class="border border-wf-border">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <!-- Global Search Input -->
                    <div class="relative flex-1 min-w-[200px]">
                        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search :size="14" class="text-wf-text-muted shrink-0" />
                        </div>
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Search by card name, bank or mask..."
                            class="w-full h-8 pl-9 pr-8 text-xs bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary transition-colors"
                        />
                        <div v-if="searchQuery" class="absolute inset-y-0 right-0 flex items-center pr-2.5">
                            <button
                                type="button"
                                class="text-wf-text-muted hover:text-wf-text-primary p-0.5 rounded cursor-pointer flex items-center justify-center"
                                aria-label="Clear search"
                                @click="searchQuery = ''"
                            >
                                <X :size="13" />
                            </button>
                        </div>
                    </div>

                    <!-- Add Card CTA -->
                    <WfButton
                        variant="primary"
                        size="sm"
                        class="shrink-0"
                        @click="openAddModal"
                    >
                        <Plus :size="14" class="mr-1" />
                        <span>Add Credit Card</span>
                    </WfButton>
                </div>
            </WfCard>

            <!-- Loading State -->
            <div v-if="loading" class="p-12 text-center flex flex-col items-center justify-center text-wf-text-muted">
                <div class="w-8 h-8 border-2 border-wf-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                <span class="text-xs font-semibold">Loading credit cards...</span>
            </div>

            <!-- TAB 1: Approved Credit Cards -->
            <div v-show="activeTab === 'approved'" class="space-y-6">
                <!-- Empty State (No Cards At All) -->
                <div 
                    v-if="!loading && cards.length === 0"
                    class="p-12 rounded-wf-xl bg-wf-surface border border-wf-border text-center max-w-lg mx-auto shadow-sm"
                >
                    <div class="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-wf-primary flex items-center justify-center mx-auto mb-4 border border-indigo-200 dark:border-indigo-900/60">
                        <CreditCard :size="32" />
                    </div>
                    <h3 class="text-base font-bold text-wf-text-primary mb-1">No Credit Cards Added</h3>
                    <p class="text-xs text-wf-text-secondary mb-6 leading-relaxed">
                        Add your credit cards to track billing periods, unbilled purchases, payment due dates, and real-time utilization.
                    </p>
                    <WfButton
                        variant="primary"
                        size="md"
                        @click="openAddModal"
                        class="h-9 px-5 text-xs font-semibold"
                    >
                        <Plus :size="14" class="mr-1.5" />
                        <span>Add Your First Card</span>
                    </WfButton>
                </div>

                <div v-else-if="!loading" class="space-y-6">
                    <!-- Cards Grid (Matching Accounts.vue layout) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        <WfCard 
                            v-for="card in filteredCards" 
                            :key="card.id"
                            variant="flat"
                            padding="sm"
                            radius="lg"
                            class="group h-full flex flex-col justify-between transition-all duration-150 hover:shadow-wf-card-hover border border-wf-border hover:border-wf-primary/40 cursor-pointer"
                            @click="navigateToCard(card)"
                        >
                            <div>
                                <!-- Header: Icon + Name + Actions in single row (Matching AccountCard.vue) -->
                                <div class="flex items-start justify-between gap-2 mb-1.5">
                                    <div class="flex items-start gap-2.5 min-w-0 flex-1">
                                        <div class="w-8 h-8 rounded-wf-md flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                            <CreditCard :size="16" />
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <div class="text-xs sm:text-sm font-bold text-wf-text-primary truncate" :title="card.name">
                                                {{ card.name }}
                                            </div>
                                            <div class="flex items-center gap-1.5 text-xs text-wf-text-muted mt-0.5">
                                                <span class="text-[10px] font-semibold uppercase tracking-wider">
                                                    {{ card.card_network || 'Card' }}
                                                </span>
                                                <span v-if="card.card_last_4" class="font-mono text-[9px] bg-wf-surface-variant text-wf-text-secondary px-1 py-0.2 rounded-wf-xs">
                                                    ••{{ card.card_last_4 }}
                                                </span>
                                                <span v-if="card.card_tier" class="truncate text-[10px] text-wf-text-muted hidden sm:inline">
                                                    • {{ card.card_tier }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Actions: Pay Bill + WfMenu (Matching AccountCard.vue) -->
                                    <div class="flex items-center gap-1 shrink-0" @click.stop>
                                        <button
                                            v-if="Number(card.balance || 0) > 0"
                                            type="button"
                                            class="px-2 py-0.5 text-[10px] font-semibold rounded-wf-sm bg-wf-primary/10 text-wf-primary hover:bg-wf-primary/20 transition-colors cursor-pointer"
                                            @click.stop="openPayModal(card)"
                                        >
                                            Pay
                                        </button>

                                        <WfMenu align="right">
                                            <template #trigger>
                                                <MoreVertical :size="14" />
                                            </template>
                                            <div class="py-1">
                                                <button 
                                                    type="button" 
                                                    class="w-full text-left px-3 py-1.5 text-xs text-wf-text-primary hover:bg-wf-surface-variant flex items-center gap-2 cursor-pointer"
                                                    @click="navigateToCard(card)"
                                                >
                                                    <Receipt :size="13" class="text-wf-primary" />
                                                    <span>View Details & Cycle</span>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    class="w-full text-left px-3 py-1.5 text-xs text-wf-text-primary hover:bg-wf-surface-variant flex items-center gap-2 cursor-pointer"
                                                    @click="openPayModal(card)"
                                                >
                                                    <DollarSign :size="13" class="text-emerald-500" />
                                                    <span>Pay Bill</span>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    class="w-full text-left px-3 py-1.5 text-xs text-wf-text-primary hover:bg-wf-surface-variant flex items-center gap-2 cursor-pointer"
                                                    @click="openEditModal(card)"
                                                >
                                                    <Edit2 :size="13" class="text-wf-text-muted" />
                                                    <span>Edit Details</span>
                                                </button>
                                                <button 
                                                    type="button" 
                                                    class="w-full text-left px-3 py-1.5 text-xs text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                                                    @click="requestDeleteCard(card)"
                                                >
                                                    <Trash2 :size="13" class="text-wf-error" />
                                                    <span>Delete Card</span>
                                                </button>
                                            </div>
                                        </WfMenu>
                                    </div>
                                </div>

                                <!-- Compact Statement Intelligence Snippet (Matching AccountCard.vue) -->
                                <div class="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-wf-sm px-2.5 py-1.5 my-1.5 text-xs">
                                    <div class="flex items-center justify-between text-[11px]">
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Stmt</span>
                                            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">{{ formatAmount(card.statement_balance || 0) }}</span>
                                        </div>
                                        <div class="flex items-center gap-1 text-[10px] text-wf-text-muted font-medium">
                                            <span>{{ card.days_until_due != null ? `Due ${card.days_until_due}d` : 'Billing Day ' + (card.billing_day || 'N/A') }}</span>
                                            <span v-if="card.days_until_due != null && card.days_until_due < 0" class="px-1 py-0.2 text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded">
                                                Overdue
                                            </span>
                                            <span v-else-if="card.days_until_due != null && card.days_until_due <= 3" class="px-1 py-0.2 text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded">
                                                Soon
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Utilization Bar -->
                                <div class="space-y-1 my-1.5">
                                    <div class="flex items-center justify-between text-[10px] text-wf-text-muted">
                                        <span>Utilized ({{ card.utilization }}%)</span>
                                        <span class="font-medium text-wf-success">Avail: {{ formatAmount(card.available_limit) }}</span>
                                    </div>
                                    <div class="w-full bg-wf-surface-variant rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            class="h-1.5 rounded-full transition-all duration-300" 
                                            :class="card.utilization > 70 ? 'bg-rose-500' : (card.utilization > 30 ? 'bg-amber-500' : 'bg-wf-primary')"
                                            :style="{ width: `${Math.min(100, Math.max(0, card.utilization))}%` }"
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Footer: Current Balance & Cycle Link (Matching AccountCard.vue) -->
                            <div class="pt-2 border-t border-wf-border-subtle mt-2 flex items-baseline justify-between">
                                <div>
                                    <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider">
                                        Current Owed
                                    </div>
                                    <div class="text-sm sm:text-base font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 mt-0.5">
                                        {{ formatAmount(card.balance) }}
                                    </div>
                                </div>
                                <span class="text-[11px] font-semibold text-wf-primary group-hover:underline flex items-center gap-1">
                                    <span>Details & Cycle</span>
                                    <ArrowRight :size="12" />
                                </span>
                            </div>
                        </WfCard>

                        <!-- Compact Add Card Placeholder Card (Matching Accounts.vue) -->
                        <div
                            v-if="!searchQuery"
                            class="border-2 border-dashed border-wf-border hover:border-wf-primary/50 rounded-wf-lg p-5 flex flex-col items-center justify-center transition-all cursor-pointer group hover:bg-wf-primary/[0.02] min-h-[140px]"
                            @click="openAddModal"
                        >
                            <div class="w-8 h-8 rounded-full bg-wf-primary/10 text-wf-primary flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
                                <Plus :size="18" />
                            </div>
                            <div class="text-xs font-bold text-wf-text-primary">
                                Add Credit Card
                            </div>
                            <div class="text-[11px] text-wf-text-muted mt-0.5 text-center">
                                Link a card & set billing cycle
                            </div>
                        </div>
                    </div>

                    <!-- Empty Search State (Matching Accounts.vue) -->
                    <div v-if="filteredCards.length === 0 && !loading" class="text-center py-16 animate-in">
                        <div class="w-16 h-16 rounded-full bg-wf-surface-variant text-wf-text-muted flex items-center justify-center mx-auto mb-4">
                            <Search :size="32" class="opacity-40" />
                        </div>
                        <h3 class="text-base font-bold text-wf-text-primary">No matching cards</h3>
                        <p class="text-xs text-wf-text-muted mt-1 mb-4">Try adjusting your search query</p>
                        <WfButton variant="outline" size="sm" @click="searchQuery = ''">
                            <RotateCcw :size="13" class="mr-1.5" />
                            <span>Clear search</span>
                        </WfButton>
                    </div>
                </div>
            </div>

            <!-- TAB 2: Triage Cards (Matching Accounts.vue) -->
            <div v-show="activeTab === 'triage'" class="space-y-4">
                <!-- Triage Intake Info Banner -->
                <div class="flex items-start gap-3 p-3.5 rounded-wf-md bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                    <div class="w-9 h-9 rounded-wf-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <AlertCircle :size="18" />
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-wf-text-primary">Detected Credit Cards</h3>
                        <p class="text-xs text-wf-text-muted mt-0.5">Verify and configure credit cards automatically detected from transaction streams or statement ingestion before adding to cycle tracking.</p>
                    </div>
                </div>

                <!-- Triage Cards Grid (Compact 4-column) -->
                <div v-if="untrustedCards.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <WfCard
                        v-for="card in untrustedCards"
                        :key="card.id"
                        variant="flat"
                        padding="sm"
                        radius="lg"
                        class="border border-wf-border hover:shadow-wf-card-hover transition-all flex flex-col justify-between"
                    >
                        <div>
                            <div class="flex items-start justify-between gap-2 mb-2">
                                <div class="w-8 h-8 rounded-wf-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                    <AlertCircle :size="16" />
                                </div>
                                <div class="flex items-center gap-1">
                                    <WfButton
                                        variant="primary"
                                        size="sm"
                                        class="h-6 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                                        @click="openEditModal(card, true)"
                                    >
                                        <Check :size="12" class="mr-0.5" />
                                        <span>Verify</span>
                                    </WfButton>
                                    <WfButton
                                        variant="ghost"
                                        size="sm"
                                        class="h-6 px-1.5 text-[11px] text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        @click="requestDeleteCard(card)"
                                    >
                                        <X :size="13" />
                                    </WfButton>
                                </div>
                            </div>

                            <div class="mb-2">
                                <div class="text-xs sm:text-sm font-bold text-wf-text-primary truncate" :title="card.name">
                                    {{ card.name }}
                                </div>
                                <div class="flex items-center gap-1.5 text-xs text-wf-text-muted mt-0.5">
                                    <span class="text-[10px] font-semibold uppercase tracking-wider">
                                        {{ card.card_network || 'Card' }}
                                    </span>
                                    <span v-if="card.card_last_4" class="font-mono text-[9px] bg-wf-surface-variant text-wf-text-secondary px-1 py-0.2 rounded-wf-xs">
                                        ••{{ card.card_last_4 }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="pt-2 border-t border-wf-border-subtle flex items-baseline justify-between mt-auto">
                            <div>
                                <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider">Reported Balance</div>
                                <div class="text-sm sm:text-base font-bold font-mono tracking-tight text-wf-error mt-0.5">
                                    {{ formatAmount(card.balance) }}
                                </div>
                            </div>
                            <button
                                type="button"
                                class="text-[11px] font-semibold text-wf-primary hover:underline cursor-pointer"
                                @click="openEditModal(card)"
                            >
                                Details
                            </button>
                        </div>
                    </WfCard>
                </div>

                <!-- Empty Triage (Inbox Zero) -->
                <div v-else class="text-center py-16 animate-in">
                    <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <Check :size="32" />
                    </div>
                    <h3 class="text-base font-bold text-wf-text-primary">All clear!</h3>
                    <p class="text-xs text-wf-text-muted mt-1">No unverified credit cards require attention</p>
                </div>
            </div>

            <!-- Add / Edit Card Modal -->
            <WfModal
                v-model="cardModal"
                max-width="md"
                :title="isEditingCard ? 'Edit Credit Card' : 'Add Credit Card'"
                description="Configure card limit, billing cycle dates, and card program"
            >
                <form @submit.prevent="saveCard" class="space-y-4 py-1">
                    <WfInput
                        v-model="cardForm.name"
                        label="Card Name"
                        placeholder="e.g. HDFC Swiggy, ICICI Sapphiro, Axis Magnus"
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
                            placeholder="7119"
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
                            placeholder="e.g. Rewards, Cashback, Miles"
                        />
                    </div>

                    <WfInput
                        v-if="!isEditingCard"
                        v-model.number="cardForm.initial_balance"
                        label="Current Outstanding Balance (₹)"
                        type="number"
                        hint="Amount you currently owe on this card (opening liability)"
                    />

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
                            {{ isEditingCard ? 'Save Changes' : 'Create Card' }}
                        </WfButton>
                    </div>
                </form>
            </WfModal>

            <!-- Mark Paid / Pay Bill Modal (3-mode) -->
            <MarkCardPaidModal
                :show="payModal"
                :card-id="payingCard?.account_id || payingCard?.id || ''"
                :card-name="payingCard?.name || 'Credit Card'"
                :default-amount="Number(payingCard?.statement_balance || payingCard?.balance || 0)"
                :bank-accounts="bankAccountOptions"
                @close="payModal = false"
                @paid="fetchCards"
            />

            <!-- Delete Confirmation Modal (Matching Accounts.vue) -->
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
                            You are about to permanently delete <strong class="text-rose-600 dark:text-rose-400">{{ cardToDelete?.name }}</strong>.
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
                            @click="confirmDeleteCardAction"
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
    CreditCard, Plus, ShieldCheck, Clock, Receipt,
    MoreVertical, Edit2, Trash2, DollarSign, Zap, Search, X, RotateCcw,
    AlertCircle, Check, ArrowRight
} from 'lucide-vue-next'
import MainLayout from '@/layouts/MainLayout.vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import MarkCardPaidModal from '@/components/finance/MarkCardPaidModal.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfMenu from '@/components/ui/WfMenu.vue'
import { financeApi } from '@/api/client'
import { useCurrency } from '@/composables/useCurrency'
import { useNotificationStore } from '@/stores/notification'

const router = useRouter()
const { formatAmount } = useCurrency()
const notification = useNotificationStore()

const loading = ref(true)
const cards = ref<any[]>([])
const activeTab = ref<'approved' | 'triage'>('approved')
const searchQuery = ref('')

function navigateToCard(card: any) {
    const id = card.account_id || card.id
    router.push(`/credit-cards/${id}`)
}

// Delete confirm modal state
const showDeleteConfirm = ref(false)
const cardToDelete = ref<any>(null)
const isDeletingCard = ref(false)

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
const isEditingCard = ref(false)
const savingCard = ref(false)
const cardForm = reactive({
    id: '',
    name: '',
    credit_limit: 100000,
    card_last_4: '',
    billing_day: 15,
    due_day: 5,
    card_network: 'VISA',
    card_tier: '',
    initial_balance: 0,
    is_verified: true
})

// Pay Modal State
const payModal = ref(false)
const payingCard = ref<any>(null)
const payForm = reactive({
    source_account_id: '',
    amount: 0,
    date: new Date().toISOString().substring(0, 10),
    description: 'Credit Card Bill Payment'
})

// Triage vs Approved Cards (Matching Accounts.vue)
const verifiedCards = computed(() => cards.value.filter(c => c.is_verified !== false))
const untrustedCards = computed(() => cards.value.filter(c => c.is_verified === false))

// Search filtered cards
const filteredCards = computed(() => {
    let list = verifiedCards.value
    if (!searchQuery.value) return list
    const q = searchQuery.value.toLowerCase()
    return list.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.card_last_4 && c.card_last_4.includes(q)) ||
        (c.card_network && c.card_network.toLowerCase().includes(q)) ||
        (c.institution_name && c.institution_name.toLowerCase().includes(q))
    )
})

// Metrics computed (from verified cards)
const totalOutstanding = computed(() => verifiedCards.value.reduce((s, c) => s + Number(c.balance || 0), 0))
const totalLimit = computed(() => verifiedCards.value.reduce((s, c) => s + Number(c.credit_limit || 0), 0))
const totalAvailableLimit = computed(() => verifiedCards.value.reduce((s, c) => s + Number(c.available_limit || 0), 0))

const overallUtilization = computed(() => {
    if (totalLimit.value <= 0) return 0
    return Math.min(100, Math.max(0, (totalOutstanding.value / totalLimit.value) * 100))
})

const utilizationBadgeClass = computed(() => {
    if (overallUtilization.value > 70) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
    if (overallUtilization.value > 30) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
})

const utilizationTextClass = computed(() => {
    if (overallUtilization.value > 70) return 'text-wf-error'
    if (overallUtilization.value > 30) return 'text-amber-500'
    return 'text-wf-success'
})

const utilizationBarClass = computed(() => {
    if (overallUtilization.value > 70) return 'bg-rose-500'
    if (overallUtilization.value > 30) return 'bg-amber-500'
    return 'bg-emerald-500'
})

const utilizationStatus = computed(() => {
    if (overallUtilization.value > 70) return 'High Debt'
    if (overallUtilization.value > 30) return 'Moderate'
    return 'Optimal (<30%)'
})

const nextDueCard = computed(() => {
    const withDue = verifiedCards.value.filter(c => c.days_until_due != null && Number(c.statement_balance || 0) > 0)
    if (!withDue.length) return null
    return withDue.sort((a, b) => (a.days_until_due ?? 999) - (b.days_until_due ?? 999))[0]
})

const nextDueAmount = computed(() => nextDueCard.value ? Number(nextDueCard.value.statement_balance || 0) : 0)

const nextDueNotice = computed(() => {
    if (!nextDueCard.value) return 'No pending statement bills'
    const days = nextDueCard.value.days_until_due
    if (days < 0) return `⚠️ Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}!`
    if (days === 0) return '⚡ Due Today!'
    if (days <= 3) return `🔥 Due in ${days} day${days === 1 ? '' : 's'} (${nextDueCard.value.name})`
    return `Due in ${days} days on ${formatDate(nextDueCard.value.next_due_date)}`
})

const nextDueStatusClass = computed(() => {
    if (!nextDueCard.value) return 'text-wf-text-muted'
    const days = nextDueCard.value.days_until_due
    if (days <= 3) return 'text-wf-error font-bold'
    return 'text-amber-500 font-semibold'
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

async function fetchCards() {
    loading.value = true
    try {
        const res = await financeApi.getCreditCards()
        cards.value = res.data || []
    } catch (e) {
        console.error('Failed to fetch credit cards', e)
        notification.error('Failed to load credit cards')
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

function openAddModal() {
    isEditingCard.value = false
    cardForm.id = ''
    cardForm.name = ''
    cardForm.credit_limit = 100000
    cardForm.card_last_4 = ''
    cardForm.billing_day = 15
    cardForm.due_day = 5
    cardForm.card_network = 'VISA'
    cardForm.card_tier = ''
    cardForm.initial_balance = 0
    cardForm.is_verified = true
    cardModal.value = true
}

function openEditModal(card: any, autoVerify = false) {
    isEditingCard.value = true
    cardForm.id = card.account_id || card.id
    cardForm.name = card.name
    cardForm.credit_limit = Number(card.credit_limit || 0)
    cardForm.card_last_4 = card.card_last_4 || ''
    cardForm.billing_day = card.billing_day || 15
    cardForm.due_day = card.due_day || 5
    cardForm.card_network = card.card_network || 'VISA'
    cardForm.card_tier = card.card_tier || ''
    cardForm.is_verified = autoVerify ? true : card.is_verified !== false
    cardModal.value = true
}

async function saveCard() {
    savingCard.value = true
    try {
        if (isEditingCard.value) {
            await financeApi.updateCreditCard(cardForm.id, {
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
        } else {
            await financeApi.createCreditCard(cardForm)
            notification.success('Credit card created successfully')
        }
        cardModal.value = false
        await fetchCards()
    } catch (e) {
        console.error('Failed to save credit card', e)
        notification.error('Failed to save credit card')
    } finally {
        savingCard.value = false
    }
}

function requestDeleteCard(card: any) {
    cardToDelete.value = card
    showDeleteConfirm.value = true
}

async function confirmDeleteCardAction() {
    if (!cardToDelete.value) return
    isDeletingCard.value = true
    try {
        await financeApi.deleteCreditCard(cardToDelete.value.account_id || cardToDelete.value.id)
        notification.success('Card deleted')
        showDeleteConfirm.value = false
        await fetchCards()
    } catch (e) {
        console.error('Failed to delete card', e)
        notification.error('Failed to delete card')
    } finally {
        isDeletingCard.value = false
    }
}

function openPayModal(card: any) {
    payingCard.value = card
    payForm.source_account_id = bankAccounts.value[0]?.id || ''
    payForm.amount = Number(card.statement_balance || card.balance || 0)
    payForm.date = new Date().toISOString().substring(0, 10)
    payForm.description = `Bill Payment for ${card.name}`
    payModal.value = true
}

onMounted(() => {
    fetchCards()
    fetchBankAccounts()
})
</script>
