<template>
    <div class="transaction-list-container">
        <!-- Integrated compact toolbar -->
        <WfCard variant="flat" padding="none" radius="lg" class="p-3 mb-3 border border-wf-border-subtle bg-wf-surface shadow-xs">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <!-- Left: Search & Filter Controls -->
                <div class="flex flex-wrap items-center gap-2 flex-1">
                    <!-- Search with clean icon and clear button -->
                    <div class="relative min-w-[200px] flex-1 sm:flex-initial sm:w-64">
                        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-wf-text-muted pointer-events-none" aria-hidden="true" />
                        <input
                            :value="searchQuery"
                            type="search"
                            autocomplete="off"
                            aria-label="Search transactions"
                            placeholder="Search description or vendor..."
                            class="w-full h-9 pl-9 pr-8 text-xs rounded-wf-md bg-wf-surface-variant/40 text-wf-text-primary border border-wf-border placeholder:text-wf-text-muted focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary focus:bg-wf-surface transition-all"
                            @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
                        />
                        <button
                            v-if="searchQuery"
                            type="button"
                            @click="emit('update:searchQuery', '')"
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-wf-text-muted hover:text-wf-text-primary transition-colors"
                            title="Clear search"
                        >
                            <X :size="13" />
                        </button>
                    </div>

                    <!-- Account Filter -->
                    <WfSelect
                        size="sm"
                        class="w-[155px]"
                        aria-label="Filter by account"
                        :model-value="selectedAccount"
                        :items="accountOptions"
                        @update:model-value="emit('update:selectedAccount', $event)"
                    />

                    <!-- Category Filter -->
                    <WfSelect
                        size="sm"
                        class="w-[165px]"
                        searchable
                        aria-label="Filter by category"
                        :model-value="categoryFilter"
                        :items="[{ title: 'All Categories', value: '' }, ...categoryOptions]"
                        @update:model-value="emit('update:categoryFilter', $event); emit('fetchData')"
                    />

                    <!-- Time Range Filter -->
                    <WfSelect
                        size="sm"
                        class="w-[130px]"
                        aria-label="Filter by time range"
                        :model-value="selectedTimeRange"
                        :items="timeRangeOptions"
                        @update:model-value="handleTimeRangeChange"
                    />

                    <!-- Custom Date Range Inputs (if selected) -->
                    <div v-if="selectedTimeRange === 'custom'" class="flex items-center gap-1.5 bg-wf-surface-variant/40 px-2 py-1 rounded-wf-md border border-wf-border">
                        <input :value="startDate" type="date" aria-label="Start date" class="wf-date-input text-xs h-7 px-1.5 rounded-wf-sm bg-wf-surface border border-wf-border text-wf-text-primary"
                            @change="emit('update:startDate', ($event.target as HTMLInputElement).value); emit('fetchData')" />
                        <span class="text-[11px] text-wf-text-muted">to</span>
                        <input :value="endDate" type="date" aria-label="End date" class="wf-date-input text-xs h-7 px-1.5 rounded-wf-sm bg-wf-surface border border-wf-border text-wf-text-primary"
                            @change="emit('update:endDate', ($event.target as HTMLInputElement).value); emit('fetchData')" />
                    </div>

                    <!-- Reset Active Filters Button -->
                    <button
                        v-if="startDate || endDate || searchQuery || categoryFilter || selectedAccount"
                        type="button"
                        @click="handleReset"
                        class="h-9 px-2.5 text-xs font-semibold text-wf-primary hover:text-wf-primary-hover hover:bg-wf-primary/10 rounded-wf-md transition-colors flex items-center gap-1.5"
                        title="Reset all filters"
                    >
                        <RotateCcw :size="13" />
                        <span>Reset</span>
                    </button>
                </div>

                <!-- Right: Selection & Action Buttons -->
                <div class="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                    <!-- Contextual Selection / Delete -->
                    <Transition enter-active-class="transition-opacity duration-150" enter-from-class="opacity-0">
                        <div v-if="selectedIds.size > 0" class="flex items-center gap-2 bg-wf-primary/10 px-2.5 py-1 rounded-wf-md border border-wf-primary/20">
                            <span class="text-xs font-semibold font-mono text-wf-primary">{{ selectedIds.size }} selected</span>
                            <WfButton variant="danger" size="sm" @click="emit('deleteSelected')">
                                <Trash2 :size="12" /> Delete
                            </WfButton>
                        </div>
                    </Transition>

                    <!-- Records Count Badge -->
                    <span class="text-xs font-mono font-medium px-2.5 py-1.5 rounded-wf-md bg-wf-surface-variant text-wf-text-secondary border border-wf-border-subtle whitespace-nowrap">
                        {{ total }} <span class="text-[11px] text-wf-text-muted">records</span>
                    </span>

                    <div class="h-5 w-px bg-wf-border-subtle hidden sm:block"></div>

                    <!-- Primary Action Buttons -->
                    <WfButton variant="outline" size="sm" @click="emit('importCsv')">
                        <Upload :size="13" />
                        <span>Import</span>
                    </WfButton>
                    <WfButton size="sm" @click="emit('editTxn', null)">
                        <Plus :size="14" />
                        <span>Add Transaction</span>
                    </WfButton>
                </div>
            </div>
        </WfCard>

        <!-- Compact KPI Strip -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <WfCard variant="flat" padding="none" radius="lg" class="px-2.5 py-1.5 flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-wf-md bg-wf-success/10 text-wf-success flex items-center justify-center shrink-0"><TrendingUp :size="14" aria-hidden="true" /></div>
                <div class="min-w-0">
                    <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider leading-none mb-0.5">Income</div>
                    <div class="text-sm font-bold font-mono tabular-nums text-wf-success truncate leading-tight">{{ formatAmount(props.metrics.monthly_income) }}</div>
                </div>
            </WfCard>

            <WfCard variant="flat" padding="none" radius="lg" class="px-2.5 py-1.5 flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-wf-md bg-wf-error/10 text-wf-error flex items-center justify-center shrink-0"><TrendingDown :size="14" aria-hidden="true" /></div>
                <div class="min-w-0">
                    <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider leading-none mb-0.5">Expenses</div>
                    <div class="text-sm font-bold font-mono tabular-nums text-wf-error truncate leading-tight">{{ formatAmount(Math.abs(props.metrics.monthly_spending)) }}</div>
                </div>
            </WfCard>

            <WfCard variant="flat" padding="none" radius="lg" class="px-2.5 py-1.5 flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-wf-md bg-wf-primary/10 text-wf-primary flex items-center justify-center shrink-0"><ArrowUpRight :size="14" aria-hidden="true" /></div>
                <div class="min-w-0">
                    <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider leading-none mb-0.5">Investments</div>
                    <div class="text-sm font-bold font-mono tabular-nums text-wf-primary truncate leading-tight">{{ formatAmount(Math.abs(props.metrics.monthly_investment || 0)) }}</div>
                </div>
            </WfCard>

            <WfCard variant="flat" padding="none" radius="lg" class="px-2.5 py-1.5 flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-wf-md flex items-center justify-center shrink-0"
                    :class="netFlow >= 0 ? 'bg-wf-primary/10 text-wf-primary' : 'bg-wf-warning/10 text-wf-warning'"><Wallet :size="14" aria-hidden="true" /></div>
                <div class="min-w-0">
                    <div class="text-[10px] font-semibold text-wf-text-muted uppercase tracking-wider leading-none mb-0.5">Net Flow</div>
                    <div class="text-sm font-bold font-mono tabular-nums truncate leading-tight"
                        :class="netFlow >= 0 ? 'text-wf-primary' : 'text-wf-warning'">{{ formatAmount(netFlow) }}</div>
                </div>
            </WfCard>
        </div>

        <!-- Transaction Table -->
        <WfCard variant="flat" padding="none" radius="lg" class="overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                    <thead>
                        <tr class="bg-wf-surface-variant/60 text-[11px] font-semibold uppercase tracking-wider text-wf-text-muted">
                            <th scope="col" class="w-10 px-3 h-9 text-left">
                                <input type="checkbox" aria-label="Select all on page" :checked="allSelected"
                                    class="accent-[var(--wf-color-primary)]" @change="toggleAll" />
                            </th>
                            <th v-for="h in sortableHeaders" :key="h.key" scope="col"
                                class="px-3 h-9 whitespace-nowrap" :class="[h.align === 'right' ? 'text-right' : 'text-left', h.width]"
                                :aria-sort="ariaSort(h.key)">
                                <button v-if="h.sortable" type="button"
                                    class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-wf-text-primary"
                                    @click="emit('sortChange', h.key)">
                                    {{ h.title }}
                                    <ArrowUp v-if="txnSortKey === h.key && txnSortOrder === 'asc'" :size="11" />
                                    <ArrowDown v-else-if="txnSortKey === h.key" :size="11" />
                                </button>
                                <span v-else>{{ h.title }}</span>
                            </th>
                            <th scope="col" class="px-3 h-9 w-[60px]"><span class="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        <template v-if="loading">
                            <tr v-for="i in 10" :key="'sk' + i" class="border-t border-wf-divider animate-pulse">
                                <td colspan="6" class="px-3 py-3">
                                    <div class="flex items-center gap-3">
                                        <div class="w-7 h-7 rounded-wf-md bg-wf-surface-variant"></div>
                                        <div class="flex-1 space-y-1.5">
                                            <div class="h-3 w-3/5 rounded-wf-sm bg-wf-surface-variant"></div>
                                            <div class="h-2.5 w-2/5 rounded-wf-sm bg-wf-surface-variant"></div>
                                        </div>
                                        <div class="h-3 w-20 rounded-wf-sm bg-wf-surface-variant"></div>
                                    </div>
                                </td>
                            </tr>
                        </template>

                        <tr v-else-if="transactions.length === 0">
                            <td colspan="6" class="py-10 text-center">
                                <FileText :size="32" class="mx-auto mb-2 text-wf-text-muted" aria-hidden="true" />
                                <h3 class="text-sm font-semibold text-wf-text-primary">No Transactions Found</h3>
                                <p class="text-xs text-wf-text-muted mt-0.5">Adjust your filters or try a different search term.</p>
                                <WfButton variant="ghost" size="sm" class="mt-3" @click="handleReset">Clear All Filters</WfButton>
                            </td>
                        </tr>

                        <tr v-else v-for="item in transactions" :key="item.id"
                            class="border-t border-wf-divider cursor-pointer hover:bg-wf-primary/5 transition-colors"
                            :class="{ 'opacity-50': item.exclude_from_reports }"
                            @click="handleRowClick(item)">
                            <td class="px-3 py-1.5" @click.stop>
                                <input type="checkbox" :aria-label="'Select ' + (item.recipient || item.description)"
                                    :checked="selectedIds.has(item.id)" class="accent-[var(--wf-color-primary)]"
                                    @change="toggleSelection(item.id)" />
                            </td>

                            <td class="px-3 py-1.5 align-middle leading-tight">
                                <div class="text-xs font-semibold text-wf-text-primary">{{ formatDate(item.date).day }}</div>
                                <div class="text-[10px] text-wf-text-muted">{{ formatDate(item.date).meta }}</div>
                            </td>

                            <td class="px-3 py-1.5 align-middle">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="w-[26px] h-[26px] shrink-0 rounded-wf-md flex items-center justify-center text-xs leading-none"
                                        :style="{ backgroundColor: getCategoryDisplay(item.category || '').color + '20' }"
                                        :title="getCategoryDisplay(item.category || '').text">
                                        {{ getCategoryDisplay(item.category || '').icon }}
                                    </span>
                                    <div class="min-w-0">
                                        <router-link
                                            :to="`/merchants/${encodeURIComponent(item.recipient || item.description || '')}`"
                                            @click.stop
                                            class="group inline-flex items-center gap-1 max-w-[180px] text-xs font-semibold truncate text-wf-text-primary hover:underline"
                                            :title="'Open Merchant Profile for ' + (item.recipient || item.description)">
                                            <span class="truncate">{{ item.recipient || item.description }}</span>
                                            <Store :size="11" class="text-wf-text-muted group-hover:text-wf-primary shrink-0" aria-hidden="true" />
                                        </router-link>
                                        <div class="flex items-center gap-1.5 text-[10px] font-medium mt-0.5 leading-none">
                                            <span v-if="item.source" class="text-wf-text-muted flex items-center gap-0.5">
                                                <span>{{ item.source === 'SMS' ? '📱' : (item.source === 'EMAIL' ? '📧' : '⌨️') }}</span>{{ item.source }}
                                            </span>
                                            <button type="button" title="View Vendor Analytics"
                                                class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-wf-primary bg-wf-primary/10 hover:opacity-80 px-1 rounded-wf-xs"
                                                @click.stop="emit('showVendorInsights', item.recipient || item.description || '')">
                                                <BarChart2 :size="10" /> Analytics
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <td class="px-3 py-1.5 align-middle min-w-0">
                                <div class="flex items-center gap-1.5 text-xs text-wf-text-secondary max-w-sm">
                                    <span class="truncate">{{ item.description }}</span>
                                    <a v-if="item.latitude || item.location_name"
                                        :href="item.latitude && item.longitude ? `https://www.google.com/maps?q=${item.latitude},${item.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location_name || '')}`"
                                        target="_blank" rel="noopener" @click.stop
                                        :title="item.location_name ? `${item.location_name} (Click to open map)` : `Coordinates: ${item.latitude}, ${item.longitude}`"
                                        class="inline-flex items-center gap-0.5 shrink-0 text-[10px] font-semibold text-wf-success bg-wf-success/10 hover:bg-wf-success/20 px-1.5 rounded-wf-xs transition-colors">
                                        <MapPin :size="10" />
                                        <span v-if="item.location_name">{{ item.location_name }}</span>
                                        <span v-else>GPS</span>
                                    </a>
                                </div>
                                <div class="flex items-center flex-wrap gap-1 mt-0.5">
                                    <span class="wf-tag bg-wf-surface-variant text-wf-text-secondary">{{ getAccountName(item.account_id) }}</span>
                                    <span v-if="item.external_id" class="wf-tag border border-wf-border font-mono text-wf-text-muted" title="Reference ID">#{{ item.external_id }}</span>
                                    <span v-if="item.is_transfer" class="wf-tag bg-wf-success/10 text-wf-success">🔄 Transfer</span>
                                    <span v-if="item.exclude_from_reports" class="wf-tag bg-wf-error/10 text-wf-error">🚫 Hidden</span>
                                    <span v-if="item.is_emi" class="wf-tag bg-wf-info/10 text-wf-info">🏦 EMI</span>
                                    <span v-if="item.expense_group_id" class="wf-tag bg-wf-secondary/10 text-wf-secondary">📁 {{ getExpenseGroupName(item.expense_group_id) }}</span>
                                </div>
                            </td>

                            <td class="px-3 py-1.5 align-middle text-right">
                                <div class="font-mono tabular-nums text-sm font-bold"
                                    :class="item.is_transfer ? 'text-wf-text-muted' : (Number(item.amount) > 0 ? 'text-wf-success' : 'text-wf-error')">
                                    <span v-if="item.is_transfer" aria-label="Transfer">🔄</span>
                                    <span v-else-if="Number(item.amount) > 0" aria-label="Credit">+</span>
                                    <span v-else aria-label="Debit">-</span>
                                    {{ formatAmount(Math.abs(Number(item.amount))) }}
                                </div>
                            </td>

                            <td class="px-3 py-1.5 align-middle text-center" @click.stop>
                                <WfMenu label="Transaction actions">
                                    <template #trigger><MoreVertical :size="16" /></template>
                                    <router-link :to="`/merchants/${encodeURIComponent(item.recipient || item.description || '')}`" role="menuitem" class="wf-menu-item"><Store :size="14" class="text-wf-primary" /> Merchant Profile</router-link>
                                    <button type="button" role="menuitem" class="wf-menu-item" @click="emit('showVendorInsights', item.recipient || item.description || '')"><BarChart2 :size="14" class="text-wf-primary" /> Vendor Analytics</button>
                                    <a v-if="item.latitude || item.location_name" role="menuitem" class="wf-menu-item" target="_blank" rel="noopener"
                                        :href="item.latitude && item.longitude ? `https://www.google.com/maps?q=${item.latitude},${item.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location_name || '')}`"><MapPin :size="14" class="text-wf-success" /> View on Map</a>
                                    <button type="button" role="menuitem" class="wf-menu-item" @click="emit('editTxn', item)"><Pencil :size="14" /> Edit</button>
                                    <button type="button" role="menuitem" class="wf-menu-item" @click="openAliasModal(item)"><MapPin :size="14" /> Map Merchant</button>
                                    <div class="my-1 border-t border-wf-divider"></div>
                                    <button type="button" role="menuitem" class="wf-menu-item text-wf-error" @click="() => { selectedIds = new Set([item.id]); emit('deleteSelected') }"><Trash2 :size="14" /> Delete</button>
                                </WfMenu>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <WfPagination :page="page" :page-size="pageSize" :total="total"
                @update:page="emit('update:page', $event)"
                @update:page-size="emit('update:pageSize', $event)" />
        </WfCard>

        <MerchantAliasModal v-model="showAliasModal" :initial-pattern="aliasForm.pattern"
            :initial-alias="aliasForm.alias" @saved="() => { emit('fetchData') }" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfMenu from '@/components/ui/WfMenu.vue'
import WfPagination from '@/components/ui/WfPagination.vue'
import MerchantAliasModal from '@/components/MerchantAliasModal.vue'
import { useCurrency } from '@/composables/useCurrency'
import {
    Search,
    Trash2,
    Upload,
    Plus,
    MapPin,
    Pencil,
    MoreVertical,
    FileText,
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    BarChart2,
    Store,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    X
} from 'lucide-vue-next'

const { formatAmount } = useCurrency()

export interface AccountItem {
    id: string
    name: string
    type?: string
    [key: string]: any
}

export interface CategoryItem {
    id: string
    name: string
    icon?: string
    color?: string
    parent_id?: string
    subcategories?: CategoryItem[]
    [key: string]: any
}

export interface ExpenseGroup {
    id: string
    name: string
    [key: string]: any
}

export interface TransactionItem {
    id: string
    date: string
    amount: number | string
    recipient?: string
    description?: string
    category?: string
    account_id: string
    source?: string
    is_ai_parsed?: boolean
    is_transfer?: boolean
    exclude_from_reports?: boolean
    is_emi?: boolean
    expense_group_id?: string
    latitude?: number
    location_name?: string
    external_id?: string
    [key: string]: any
}

// Props
const props = defineProps<{
    transactions: TransactionItem[]
    accounts: AccountItem[]
    categories: CategoryItem[]
    expenseGroups: ExpenseGroup[]
    total: number
    loading: boolean
    selectedAccount: string
    categoryFilter: string
    searchQuery: string
    startDate: string
    endDate: string
    selectedTimeRange: string
    page: number
    pageSize: number
    txnSortOrder: 'asc' | 'desc'
    metrics: {
        monthly_income: number
        monthly_spending: number
        monthly_investment: number
        breakdown: {
            net_worth: number
        }
    }
    txnSortKey: string
}>()

// Emits
const emit = defineEmits<{
    'update:selectedAccount': [value: string]
    'update:categoryFilter': [value: string]
    'update:searchQuery': [value: string]
    'update:startDate': [value: string]
    'update:endDate': [value: string]
    'update:selectedTimeRange': [value: string]
    'update:page': [value: number]
    'update:pageSize': [value: number]
    'sortChange': [key: string]
    'editTxn': [txn: TransactionItem | null]
    'deleteSelected': []
    'importCsv': [],
    'fetchData': [],
    'resetFilters': [],
    'showVendorInsights': [vendorName: string]
}>()

// --- Merchant Alias Logic (Encapsulated) ---
const showAliasModal = ref(false)
const aliasForm = reactive({
    pattern: '',
    alias: ''
})

function openAliasModal(txn: TransactionItem) {
    aliasForm.pattern = txn.description || txn.recipient || ''
    aliasForm.alias = txn.recipient || ''
    showAliasModal.value = true
}

// Local State
const selectedIds = defineModel<Set<string>>('selectedIds', { default: () => new Set() })

const sortableHeaders = [
    { title: 'Date', key: 'date', sortable: true, width: 'w-[110px]', align: 'left' },
    { title: 'Recipient / Source', key: 'recipient', sortable: true, width: 'w-[250px]', align: 'left' },
    { title: 'Description', key: 'description', sortable: false, width: '', align: 'left' },
    { title: 'Amount', key: 'amount', sortable: true, width: 'w-[130px]', align: 'right' },
]

const netFlow = computed(() =>
    props.metrics.monthly_income - props.metrics.monthly_spending - (props.metrics.monthly_investment || 0))

// Computed
const accountOptions = computed(() => {
    return [{ title: 'All Accounts', value: '' }, ...props.accounts.map(a => ({ title: a.name, value: a.id }))]
})

const flatCategories = computed<CategoryItem[]>(() => {
    const list: CategoryItem[] = []
    const flatten = (cats: CategoryItem[]) => {
        cats.forEach(c => {
            list.push(c)
            if (c.subcategories && c.subcategories.length > 0) {
                flatten(c.subcategories)
            }
        })
    }
    flatten(props.categories)
    return list
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

const timeRangeOptions = [
    { title: 'All Time', value: 'all' },
    { title: 'Today', value: 'today' },
    { title: 'This Week', value: 'this-week' },
    { title: 'This Month', value: 'this-month' },
    { title: 'Last Month', value: 'last-month' },
    { title: 'Custom Range', value: 'custom' }
]

// Methods
function handleRowClick(item: TransactionItem) {
    if (!item) return
    const vendorName = item.recipient || item.description || ''
    if (vendorName) {
        emit('showVendorInsights', vendorName)
    }
}

function ariaSort(key: string) {
    if (props.txnSortKey !== key) return 'none'
    return props.txnSortOrder === 'asc' ? 'ascending' : 'descending'
}

const allSelected = computed(() =>
    props.transactions.length > 0 && props.transactions.every(t => selectedIds.value.has(t.id)))

function toggleAll() {
    const next = new Set(selectedIds.value)
    if (allSelected.value) props.transactions.forEach(t => next.delete(t.id))
    else props.transactions.forEach(t => next.add(t.id))
    selectedIds.value = next
}


function toggleSelection(id: string) {
    const newSet = new Set(selectedIds.value)
    if (newSet.has(id)) {
        newSet.delete(id)
    } else {
        newSet.add(id)
    }
    selectedIds.value = newSet
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

function getAccountName(id: string) {
    const acc = props.accounts.find(a => a.id === id)
    return acc ? acc.name : 'Unknown Account'
}

function getCategoryDisplay(name: string) {
    if (!name || name === 'Uncategorized') return { icon: '🏷️', text: 'Uncategorized', color: '#9ca3af' }

    const cat = flatCategories.value.find(c => c.name === name)
    if (cat) {
        let text = cat.name
        // Try to find parent name from flat list
        const parent = cat.parent_id ? flatCategories.value.find(p => p.id === cat.parent_id) : null
        if (parent) {
            text = `${parent.name} › ${cat.name}`
        }
        return { icon: cat.icon || '🏷️', text: text, color: cat.color || '#3B82F6' }
    }

    return { icon: '🏷️', text: name, color: '#9ca3af' }
}

function getExpenseGroupName(id: string) {
    if (!id) return null
    const group = props.expenseGroups.find(g => g.id === id)
    return group ? group.name : null
}

function handleTimeRangeChange(val: string) {
    emit('update:selectedTimeRange', val)
}

function handleReset() {
    emit('resetFilters')
}
</script>

<style scoped>
.wf-tag {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 6px;
    border-radius: var(--wf-radius-sm, 4px);
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
}
.wf-date-input {
    height: 32px;
    width: 125px;
    padding: 0 8px;
    font-size: 12px;
    border-radius: var(--wf-radius-md, 8px);
    border: 1px solid var(--wf-color-border);
    background: var(--wf-color-surface);
    color: var(--wf-color-text-primary);
}
.wf-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    font-size: 12px;
    text-align: left;
    color: var(--wf-color-text-primary);
}
.wf-menu-item:hover { background: var(--wf-color-surface-variant); }
</style>