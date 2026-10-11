<template>
    <div class="triage-view animate-in">
            <!-- PENDING TAB -->
            <div>
                <!-- Review Intake Banner -->
                <WfCard variant="flat" padding="md" radius="lg" class="mb-4 bg-wf-info/10 border border-wf-info/20">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-wf-md bg-wf-info/15 text-wf-info flex items-center justify-center shrink-0">
                                <ShieldAlert :size="20" />
                            </div>
                            <div>
                                <div class="text-sm font-bold text-wf-text-primary flex items-center gap-2">
                                    <span>Review Intake</span>
                                    <span class="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-wf-info/15 text-wf-info border border-wf-info/20">
                                        {{ triagePagination.total }} Pending
                                    </span>
                                </div>
                                <div class="text-xs text-wf-text-secondary mt-0.5">
                                    Auto-detected transactions awaiting categorization or confirmation before ledger posting.
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-auto">
                            <WfButton
                                variant="outline"
                                size="sm"
                                @click="emit('refreshTriage')"
                                title="Refresh Triage Data"
                            >
                                <RotateCw :size="14" />
                                <span>Refresh</span>
                            </WfButton>
                        </div>
                    </div>
                </WfCard>

                <!-- Filters Toolbar -->
                <WfCard variant="flat" padding="none" radius="lg" class="p-3 mb-3 border border-wf-border-subtle bg-wf-surface shadow-xs">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <!-- Left: Search and Segmented Source Toggle -->
                        <div class="flex flex-wrap items-center gap-2 flex-1">
                            <!-- Search with clear button -->
                            <div class="relative min-w-[200px] flex-1 sm:flex-initial sm:w-72">
                                <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-wf-text-muted pointer-events-none" aria-hidden="true" />
                                <input
                                    :value="triageSearchQuery"
                                    type="search"
                                    autocomplete="off"
                                    aria-label="Search review intake"
                                    placeholder="Search description or recipient..."
                                    class="w-full h-9 pl-9 pr-8 text-xs rounded-wf-md bg-wf-surface-variant/40 text-wf-text-primary border border-wf-border placeholder:text-wf-text-muted focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary focus:bg-wf-surface transition-all"
                                    @input="emit('update:triageSearchQuery', ($event.target as HTMLInputElement).value)"
                                />
                                <button
                                    v-if="triageSearchQuery"
                                    type="button"
                                    @click="emit('update:triageSearchQuery', '')"
                                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-wf-text-muted hover:text-wf-text-primary transition-colors"
                                    title="Clear search"
                                >
                                    <X :size="13" />
                                </button>
                            </div>

                            <!-- Segmented Source Toggle -->
                            <div class="inline-flex rounded-wf-md border border-wf-border bg-wf-surface-variant/30 p-0.5" role="group" aria-label="Source filter">
                                <button
                                    v-for="s in [{ v: 'ALL', t: 'All Sources' }, { v: 'SMS', t: '📱 SMS' }, { v: 'EMAIL', t: '📧 Email' }]"
                                    :key="s.v"
                                    type="button"
                                    class="h-7.5 px-3 text-xs font-medium rounded-wf-sm transition-all"
                                    :class="triageSourceFilter === s.v
                                        ? 'bg-wf-surface text-wf-primary shadow-xs font-bold border border-wf-border-subtle'
                                        : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant/50'"
                                    :aria-pressed="triageSourceFilter === s.v"
                                    @click="emit('update:triageSourceFilter', s.v)"
                                >
                                    {{ s.t }}
                                </button>
                            </div>
                        </div>

                        <!-- Right: Sort Dropdown & Direction Toggle Group -->
                        <div class="flex items-center gap-1.5 self-end sm:self-auto">
                            <WfSelect
                                size="sm"
                                class="w-[125px]"
                                aria-label="Sort by"
                                :model-value="triageSortKey"
                                :items="[{ title: 'Date', value: 'date' }, { title: 'Amount', value: 'amount' }, { title: 'Description', value: 'description' }]"
                                @update:model-value="emit('update:triageSortKey', $event)"
                            />

                            <button
                                type="button"
                                class="h-9 w-9 inline-flex items-center justify-center rounded-wf-md border border-wf-border bg-wf-surface text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                                :aria-label="`Sort ${triageSortOrder === 'asc' ? 'descending' : 'ascending'}`"
                                :title="`Sort ${triageSortOrder === 'asc' ? 'descending' : 'ascending'}`"
                                @click="emit('update:triageSortOrder', triageSortOrder === 'asc' ? 'desc' : 'asc')"
                            >
                                <ArrowUpNarrowWide v-if="triageSortOrder === 'asc'" :size="15" />
                                <ArrowDownNarrowWide v-else :size="15" />
                            </button>
                        </div>
                    </div>
                </WfCard>

                <!-- Bulk Selection & Action Bar -->
                <div class="flex items-center justify-between mb-3 px-1 text-xs">
                    <label class="flex items-center gap-2 font-semibold text-wf-text-secondary hover:text-wf-text-primary cursor-pointer select-none transition-colors">
                        <input
                            type="checkbox"
                            :checked="selectedTriageIds.length === filteredTriageTransactions.length && filteredTriageTransactions.length > 0"
                            @change="toggleSelectAllTriage"
                            class="rounded border-wf-border text-wf-primary focus:ring-wf-primary cursor-pointer"
                        />
                        <span>Select All Filtered ({{ filteredTriageTransactions.length }})</span>
                    </label>

                    <Transition enter-active-class="transition-opacity duration-150" enter-from-class="opacity-0">
                        <div v-if="selectedTriageIds.length > 0" class="flex items-center gap-2">
                            <WfButton
                                variant="danger"
                                size="sm"
                                @click="emit('update:showDiscardConfirm', true)"
                            >
                                <Trash2 :size="13" />
                                <span>Discard {{ selectedTriageIds.length }} Selected</span>
                            </WfButton>
                        </div>
                    </Transition>
                </div>

                <!-- Transactions Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <WfCard
                        v-for="txn in filteredTriageTransactions"
                        :key="txn.id"
                        variant="flat"
                        padding="md"
                        radius="lg"
                        class="flex flex-col justify-between transition-all hover:shadow-md border border-wf-border-subtle hover:border-wf-border"
                        :class="{ 'ring-2 ring-wf-primary bg-wf-primary/[0.02]': selectedTriageIds.includes(txn.id) }"
                    >
                        <div>
                            <!-- Card Header: Checkbox + Merchant/Title + Amount -->
                            <div class="flex items-start justify-between gap-3 mb-3">
                                <div class="flex items-start gap-2.5 min-w-0 flex-1">
                                    <input
                                        type="checkbox"
                                        :value="txn.id"
                                        v-model="selectedTriageIds"
                                        class="mt-1 rounded border-wf-border text-wf-primary focus:ring-wf-primary cursor-pointer shrink-0"
                                    />
                                    <div class="min-w-0 flex-1">
                                        <div class="text-sm font-bold text-wf-text-primary truncate" :title="txn.recipient || txn.description">
                                            {{ txn.recipient || txn.description }}
                                        </div>
                                        <div class="flex items-center flex-wrap gap-1.5 text-xs text-wf-text-muted font-medium mt-0.5">
                                            <span>{{ formatDate(txn.date).day }}</span>
                                            <span class="opacity-40">•</span>
                                            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold tracking-wider uppercase"
                                                :class="txn.source === 'SMS' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'">
                                                {{ txn.source }}
                                            </span>
                                            <span v-if="txn.latitude" class="inline-flex items-center gap-0.5 text-[10px] text-wf-primary font-semibold bg-wf-primary/10 px-1.5 py-0.5 rounded">
                                                <MapPin :size="10" /> GPS
                                            </span>
                                            <span v-if="txn.external_id" class="text-[10px] font-mono text-wf-text-muted bg-wf-surface-variant px-1.5 py-0.5 rounded truncate max-w-[100px]" :title="'Ref: ' + txn.external_id">
                                                {{ txn.external_id }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-right shrink-0">
                                    <div class="text-base font-bold font-mono tracking-tight"
                                        :class="Number(txn.amount) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
                                        {{ Number(txn.amount) < 0 ? '-' : '+' }}{{ formatAmount(Math.abs(Number(txn.amount))) }}
                                    </div>
                                    <div class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">
                                        {{ Number(txn.amount) < 0 ? 'Debit' : 'Credit' }}
                                    </div>
                                </div>
                            </div>

                            <!-- Account & Toggle Pills Row -->
                            <div class="flex items-center justify-between text-xs font-medium text-wf-text-secondary mb-3 gap-2">
                                <div class="flex items-center gap-1.5 truncate text-wf-text-muted">
                                    <Landmark :size="13" class="opacity-70 shrink-0" />
                                    <span class="truncate">{{ getAccountName(txn.account_id) }}</span>
                                </div>
                                <div class="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        @click="txn.is_transfer = !txn.is_transfer; if (txn.is_transfer) txn.exclude_from_reports = true"
                                        class="px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all flex items-center gap-1"
                                        :class="txn.is_transfer
                                            ? 'bg-wf-info/15 text-wf-info border-wf-info/30'
                                            : 'text-wf-text-muted hover:text-wf-text-primary border-wf-border'"
                                    >
                                        <ArrowLeftRight :size="10" />
                                        <span>Transfer</span>
                                    </button>
                                    <button
                                        type="button"
                                        @click="txn.exclude_from_reports = !txn.exclude_from_reports"
                                        class="px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all flex items-center gap-1"
                                        :class="txn.exclude_from_reports
                                            ? 'bg-wf-surface-variant text-wf-text-secondary border-wf-border'
                                            : 'text-wf-text-muted hover:text-wf-text-primary border-wf-border'"
                                    >
                                        <EyeOff :size="10" />
                                        <span>Hide</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Category Selector -->
                            <div class="space-y-2">
                                <WfSelect v-model="txn.category" size="sm" aria-label="Category" placeholder="Select Category *"
                                    searchable
                                    :items="categoryOptions" />

                                <!-- Transfer Destination Account (Conditional) -->
                                <div v-if="txn.is_transfer">
                                    <WfSelect v-model="txn.to_account_id" size="sm" aria-label="Destination account" placeholder="Destination Account *"
                                        :items="accountOptions.filter(a => a.value !== txn.account_id)" />
                                </div>
                            </div>

                            <!-- Raw Ingestion Message Snippet -->
                            <div v-if="txn.raw_message" class="text-[11px] text-wf-text-muted italic bg-wf-surface-variant/40 px-2.5 py-1.5 rounded-wf-sm border border-wf-border-subtle line-clamp-2 leading-relaxed mt-2.5">
                                {{ txn.raw_message }}
                            </div>
                        </div>

                        <!-- Card Footer Tooling Actions -->
                        <div class="flex items-center justify-between pt-2.5 mt-3 border-t border-wf-border-subtle">
                            <div class="flex items-center gap-1">
                                <button
                                    type="button"
                                    @click="emit('rejectTriage', txn.id)"
                                    class="w-7 h-7 rounded-wf-md flex items-center justify-center text-wf-text-muted hover:text-wf-error hover:bg-wf-error/10 transition-colors"
                                    title="Discard Transaction"
                                >
                                    <Trash2 :size="14" />
                                </button>
                                <button
                                    type="button"
                                    @click="openAliasModal(txn)"
                                    class="w-7 h-7 rounded-wf-md flex items-center justify-center text-wf-text-muted hover:text-wf-primary hover:bg-wf-primary/10 transition-colors"
                                    title="Map Merchant Alias"
                                >
                                    <MapPin :size="14" />
                                </button>
                                <button
                                    type="button"
                                    @click="openTriageDetails(txn)"
                                    class="w-7 h-7 rounded-wf-md flex items-center justify-center text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
                                    title="Full Details"
                                >
                                    <Info :size="14" />
                                </button>
                            </div>

                            <button
                                type="button"
                                :disabled="!txn.category || txn.category === 'Uncategorized'"
                                @click="emit('approveTriage', txn)"
                                class="px-3.5 py-1.5 text-xs font-semibold rounded-wf-md transition-all flex items-center gap-1.5"
                                :class="(!txn.category || txn.category === 'Uncategorized')
                                    ? 'opacity-40 cursor-not-allowed bg-wf-surface-variant text-wf-text-muted'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow'"
                            >
                                <Check :size="14" />
                                <span>Approve</span>
                            </button>
                        </div>
                    </WfCard>
                </div>

                <!-- Empty State -->
                <div v-if="triagePagination.total === 0" class="text-center py-16 animate-in">
                    <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 :size="36" />
                    </div>
                    <h3 class="text-lg font-bold text-wf-text-primary">Inbox Zero!</h3>
                    <p class="text-sm text-wf-text-muted mt-1">No new transactions waiting for review.</p>
                </div>

                <!-- Pagination Footer -->
                <div v-if="triagePagination.total > 0" class="flex items-center justify-between py-4 px-2 mt-4 text-xs font-medium text-wf-text-muted">
                    <div class="flex items-center gap-2">
                        <span>Show</span>
                        <select
                            :value="triagePagination.limit"
                            @change="handleTriagePaginationLimitChange(Number(($event.target as HTMLSelectElement).value))"
                            class="bg-wf-surface border border-wf-border rounded-wf-md px-2 py-1 font-bold text-wf-text-primary text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-wf-primary"
                        >
                            <option :value="12">12</option>
                            <option :value="24">24</option>
                            <option :value="60">60</option>
                        </select>
                        <span>per page</span>
                    </div>

                    <div class="flex items-center gap-3">
                        <span class="font-mono text-wf-text-secondary">
                            {{ triagePagination.skip + 1 }}-{{ Math.min(triagePagination.skip + triagePagination.limit, triagePagination.total) }} of {{ triagePagination.total }}
                        </span>
                        <div class="flex items-center gap-1">
                            <button
                                type="button"
                                :disabled="triagePagination.skip === 0"
                                @click="triageCurrentPage--"
                                class="w-7 h-7 rounded-wf-md flex items-center justify-center border border-wf-border text-wf-text-secondary hover:bg-wf-surface-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft :size="16" />
                            </button>
                            <button
                                type="button"
                                :disabled="triagePagination.skip + triagePagination.limit >= triagePagination.total"
                                @click="triageCurrentPage++"
                                class="w-7 h-7 rounded-wf-md flex items-center justify-center border border-wf-border text-wf-text-secondary hover:bg-wf-surface-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight :size="16" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        <!-- Details Modal -->
        <WfModal
            v-model="triageDetailsDialog"
            title="Transaction Details"
            :description="selectedTriageTxn ? `${selectedTriageTxn.recipient || selectedTriageTxn.description} • ${formatDate(selectedTriageTxn.date).day}` : ''"
            max-width="md"
        >
            <div v-if="selectedTriageTxn" class="space-y-4 py-1">
                <div class="flex items-center justify-between p-3.5 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle">
                    <div>
                        <div class="text-sm font-bold text-wf-text-primary">
                            {{ selectedTriageTxn.recipient || selectedTriageTxn.description }}
                        </div>
                        <div class="text-xs text-wf-text-muted mt-0.5">
                            {{ formatDate(selectedTriageTxn.date).day }} • {{ formatDate(selectedTriageTxn.date).meta }}
                            <span v-if="selectedTriageTxn.external_id">• Ref: {{ selectedTriageTxn.external_id }}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-base font-bold font-mono"
                            :class="Number(selectedTriageTxn?.amount || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
                            {{ Number(selectedTriageTxn?.amount || 0) < 0 ? '-' : '+' }}{{ formatAmount(Math.abs(Number(selectedTriageTxn?.amount || 0))) }}
                        </div>
                        <div class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">
                            {{ Number(selectedTriageTxn?.amount || 0) < 0 ? 'DEBIT' : 'CREDIT' }}
                        </div>
                    </div>
                </div>

                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-bold text-wf-text-secondary mb-1">Account</label>
                        <WfSelect v-model="selectedTriageTxn.account_id" size="sm" aria-label="Account" :items="accountOptions" />
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-wf-text-secondary mb-1">Category</label>
                        <WfSelect v-model="selectedTriageTxn.category" size="sm" aria-label="Category" placeholder="Select Category" searchable :items="categoryOptions" />
                    </div>

                    <div v-if="selectedTriageTxn?.is_transfer">
                        <label class="block text-xs font-bold text-wf-text-secondary mb-1">
                            {{ Number(selectedTriageTxn?.amount || 0) < 0 ? 'Transfer To' : 'Transfer From' }}
                        </label>
                        <WfSelect v-model="selectedTriageTxn.to_account_id" size="sm" aria-label="Transfer account"
                            :items="accountOptions.filter(a => a.value !== (selectedTriageTxn?.account_id || ''))" />
                    </div>
                </div>

                <div class="flex items-center gap-4 pt-1">
                    <label class="flex items-center gap-2 text-xs font-semibold text-wf-text-secondary cursor-pointer select-none">
                        <input
                            type="checkbox"
                            v-model="selectedTriageTxn.is_transfer"
                            @change="selectedTriageTxn.exclude_from_reports = selectedTriageTxn.is_transfer"
                            class="rounded border-wf-border text-wf-primary focus:ring-wf-primary"
                        />
                        <span>Internal Transfer</span>
                    </label>

                    <label class="flex items-center gap-2 text-xs font-semibold text-wf-text-secondary cursor-pointer select-none">
                        <input
                            type="checkbox"
                            v-model="selectedTriageTxn.exclude_from_reports"
                            class="rounded border-wf-border text-wf-text-secondary focus:ring-wf-primary"
                        />
                        <span>Hide in Reports</span>
                    </label>
                </div>

                <div v-if="selectedTriageTxn.raw_message" class="pt-1">
                    <label class="block text-xs font-bold text-wf-text-muted mb-1">Raw Ingestion Message</label>
                    <div class="bg-wf-surface-variant/40 p-3 rounded-wf-md text-xs text-wf-text-muted italic border border-wf-border-subtle leading-relaxed font-mono">
                        {{ selectedTriageTxn.raw_message }}
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex items-center justify-end gap-2 w-full">
                    <WfButton
                        variant="ghost"
                        size="sm"
                        @click="triageDetailsDialog = false"
                    >
                        Close
                    </WfButton>
                    <WfButton
                        size="sm"
                        @click="saveTriageDetails"
                    >
                        Apply Changes
                    </WfButton>
                </div>
            </template>
        </WfModal>

        <!-- Add Alias Modal -->
        <MerchantAliasModal v-model="showAliasModal" :initial-pattern="aliasForm.pattern"
            :initial-alias="aliasForm.alias" @saved="emit('refreshTriage')" />

        <!-- Discard Confirmation Dialog (Triage) -->
        <WfModal
            :model-value="showDiscardConfirm"
            @update:model-value="emit('update:showDiscardConfirm', $event)"
            :title="triageIdToDiscard ? 'Discard Transaction' : `Discard ${selectedTriageIds.length} Transactions`"
            description="Permanently remove selected transaction(s) from inbox."
            max-width="sm"
        >
            <div class="py-2 text-center">
                <div class="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3">
                    <Trash2 :size="24" />
                </div>
                <p class="text-sm text-wf-text-secondary mb-4">
                    This action will permanently remove the selected transaction(s) from your inbox.
                </p>
                <label class="flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold text-wf-text-secondary select-none">
                    <input
                        type="checkbox"
                        :checked="createIgnoreRule"
                        @change="emit('update:createIgnoreRule', ($event.target as HTMLInputElement).checked)"
                        class="rounded border-wf-border text-wf-error focus:ring-wf-error"
                    />
                    <span>Ignore this pattern in future</span>
                </label>
            </div>
            <template #footer>
                <div class="flex items-center justify-end gap-2 w-full">
                    <WfButton
                        variant="ghost"
                        size="sm"
                        @click="emit('update:showDiscardConfirm', false)"
                    >
                        Cancel
                    </WfButton>
                    <WfButton
                        variant="danger"
                        size="sm"
                        @click="triageIdToDiscard ? emit('confirmDiscard') : emit('confirmBulkDiscard')"
                    >
                        <Trash2 :size="14" />
                        <span>Discard</span>
                    </WfButton>
                </div>
            </template>
        </WfModal>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfButton from '@/components/ui/WfButton.vue'
import MerchantAliasModal from '@/components/MerchantAliasModal.vue'
import { useCurrency } from '@/composables/useCurrency'
import {
    Search,
    ArrowUpNarrowWide,
    ArrowDownNarrowWide,
    ArrowLeftRight,
    Trash2,
    RotateCw,
    Landmark,
    ShieldAlert,
    MapPin,
    Info,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    EyeOff,
    X

} from 'lucide-vue-next'

export interface AccountItem {
    id: string
    name: string
    [key: string]: any
}

export interface CategoryItem {
    id: string
    name: string
    icon?: string
    color?: string
    parent_id?: string | null
    subcategories?: CategoryItem[]
    [key: string]: any
}

export interface TriageTransaction {
    id: string
    date: string
    amount: number | string
    recipient?: string
    description?: string
    source?: string
    external_id?: string
    account_id: string
    raw_message?: string
    is_transfer?: boolean
    exclude_from_reports?: boolean
    category?: string
    to_account_id?: string
    [key: string]: any
}

// Props
const props = defineProps<{
    activeSubTab?: string
    accounts: AccountItem[]
    categories: CategoryItem[]
    triageTransactions: TriageTransaction[]
    triagePagination: { total: number; limit: number; skip: number }
    triageSearchQuery: string
    triageSourceFilter: string
    triageSortKey: string
    triageSortOrder: 'asc' | 'desc'
    // Confirmation States
    showDiscardConfirm: boolean
    createIgnoreRule: boolean
    triageIdToDiscard: string | null
}>()

// Emits
const emit = defineEmits<{
    'update:activeSubTab': [value: string]
    'update:triageSearchQuery': [value: string]
    'update:triageSourceFilter': [value: string]
    'update:triageSortKey': [value: string]
    'update:triageSortOrder': [value: 'asc' | 'desc']
    'update:triagePagination': [value: { total: number; limit: number; skip: number }]
    'approveTriage': [txn: TriageTransaction]
    'rejectTriage': [id: string]
    'bulkRejectTriage': []
    'refreshTriage': []
    'update:showDiscardConfirm': [value: boolean]
    'update:createIgnoreRule': [value: boolean]
    'confirmDiscard': []
    'confirmBulkDiscard': []
}>()

// Local State
const selectedTriageIds = defineModel<string[]>('selectedTriageIds', { default: [] })
// Computed Interface for Tabs

const accountOptions = computed(() => {
    return props.accounts.map(a => ({ title: a.name, value: a.id }))
})

const categoryOptions = computed(() => {
    const list: { title: string; value: string }[] = []

    const buildTree = (flatList: CategoryItem[]) => {
        const lookup = new Map<string, any>()
        const roots: any[] = []

        flatList.forEach(c => {
            lookup.set(c.id || c.name, { ...c, subcategories: [] })
        })

        flatList.forEach(c => {
            const parentKey = c.parent_id
            if (parentKey && lookup.has(parentKey)) {
                lookup.get(parentKey).subcategories.push(lookup.get(c.id || c.name))
            } else {
                roots.push(lookup.get(c.id || c.name))
            }
        })
        return roots
    }

    const flatten = (cats: any[], depth = 0) => {
        const sorted = [...cats].sort((a, b) => a.name.localeCompare(b.name))
        sorted.forEach(c => {
            const prefix = depth > 0 ? '　'.repeat(depth) + '└ ' : ''
            list.push({
                title: `${prefix}${c.icon || '🏷️'} ${c.name}`,
                value: c.name
            })
            if (c.subcategories && c.subcategories.length > 0) {
                flatten(c.subcategories, depth + 1)
            }
        })
    }

    const hasTreeStructure = props.categories.some(c => c.subcategories && c.subcategories.length > 0)
    const tree = hasTreeStructure ? props.categories.filter(c => !c.parent_id) : buildTree(props.categories)

    flatten(tree)

    if (!list.find(o => o.value === 'Uncategorized')) {
        list.push({ title: '🏷️ Uncategorized', value: 'Uncategorized' })
    }
    return list
})

const filteredTriageTransactions = computed(() => {
    let filtered = props.triageTransactions

    if (props.triageSearchQuery) {
        const q = props.triageSearchQuery.toLowerCase()
        filtered = filtered.filter(t =>
            (t.recipient && t.recipient.toLowerCase().includes(q)) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.external_id && t.external_id.toLowerCase().includes(q)) ||
            (t.amount && String(t.amount).includes(q))
        )
    }

    if (props.triageSourceFilter && props.triageSourceFilter !== 'ALL') {
        filtered = filtered.filter(t => t.source === props.triageSourceFilter)
    }

    return filtered
})

const triageCurrentPage = computed({
    get: () => Math.floor(props.triagePagination.skip / props.triagePagination.limit) + 1,
    set: (val) => emit('update:triagePagination', { ...props.triagePagination, skip: (val - 1) * props.triagePagination.limit })
})

// Methods
function getAccountName(id: string) {
    const acc = props.accounts.find(a => a.id === id)
    return acc ? acc.name : 'Unknown Account'
}

function formatDate(dateStr: string) {
    if (!dateStr) return { day: 'N/A', meta: '' }

    const d = new Date(dateStr)
    if (isNaN(d.getTime())) {
        return { day: '?', meta: dateStr.split('T')[0] || dateStr }
    }

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    if (d.toDateString() === today.toDateString()) {
        return { day: 'Today', meta: time }
    }
    if (d.toDateString() === yesterday.toDateString()) {
        return { day: 'Yesterday', meta: time }
    }

    const currentYear = today.getFullYear()
    const txnYear = d.getFullYear()

    let formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (txnYear !== currentYear) {
        formatOptions.year = 'numeric'
    }

    const monthDay = d.toLocaleDateString('en-US', formatOptions)
    return {
        day: monthDay,
        meta: time
    }
}

function toggleSelectAllTriage() {
    if (selectedTriageIds.value.length === filteredTriageTransactions.value.length && filteredTriageTransactions.value.length > 0) {
        selectedTriageIds.value = []
    } else {
        selectedTriageIds.value = filteredTriageTransactions.value.map(t => t.id)
    }
}

function handleTriagePaginationLimitChange(newLimit: number) {
    emit('update:triagePagination', { ...props.triagePagination, limit: newLimit, skip: 0 })
}

const showAliasModal = ref(false)
const aliasForm = reactive({
    pattern: '',
    alias: '',
    update_past: false
})

function openAliasModal(txn: TriageTransaction) {
    aliasForm.pattern = txn.description || txn.recipient || ''
    aliasForm.alias = txn.recipient || ''
    showAliasModal.value = true
}

// --- Triage Details Modal ---
const triageDetailsDialog = ref(false)
const selectedTriageTxn = ref<TriageTransaction | null>(null)

function openTriageDetails(txn: TriageTransaction) {
    selectedTriageTxn.value = JSON.parse(JSON.stringify(txn)) // Deep copy
    triageDetailsDialog.value = true
}

function saveTriageDetails() {
    if (!selectedTriageTxn.value) return
    const index = props.triageTransactions.findIndex(t => t.id === selectedTriageTxn.value?.id)
    if (index !== -1) {
        Object.assign(props.triageTransactions[index], selectedTriageTxn.value)
    }
    triageDetailsDialog.value = false
}

const { formatAmount } = useCurrency()
</script>

<style scoped>
.cat-needed-warning :deep(.v-field__outline) {
    --v-field-border-opacity: 0.5;
    border-color: rgba(var(--v-theme-warning), 0.6) !important;
}

.triage-cat-input :deep(.v-field) {
    border-radius: 10px;
}

.border-thin {
    border: 1px solid rgba(var(--v-border-color), 0.15) !important;
}

.animate-in {
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
