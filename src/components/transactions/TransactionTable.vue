<template>
    <div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
                <thead>
                    <tr class="bg-wf-surface-variant/60 text-[11px] font-semibold uppercase tracking-wider text-wf-text-muted">
                        <th v-if="showSelect" scope="col" class="w-10 px-3 h-9 text-left">
                            <input type="checkbox" aria-label="Select all on page" :checked="allSelected"
                                class="accent-[var(--wf-color-primary)]" @change="toggleAll" />
                        </th>
                        <th scope="col" class="px-3 h-9 text-left w-[110px]">Date</th>
                        <th scope="col" class="px-3 h-9 text-left w-[250px]">Recipient / Source</th>
                        <th scope="col" class="px-3 h-9 text-left">Description</th>
                        <th scope="col" class="px-3 h-9 text-right w-[130px]">Amount</th>
                        <th v-if="!hideActions" scope="col" class="px-3 h-9 w-[60px]"><span class="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    <template v-if="loading">
                        <tr v-for="i in 8" :key="'sk' + i" class="border-t border-wf-divider animate-pulse">
                            <td :colspan="colCount" class="px-3 py-3">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-wf-md bg-wf-surface-variant"></div>
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
                        <td :colspan="colCount" class="py-10 text-center">
                            <FileText :size="32" class="mx-auto mb-2 text-wf-text-muted" aria-hidden="true" />
                            <h3 class="text-sm font-semibold text-wf-text-primary">No Transactions Found</h3>
                            <p class="text-xs text-wf-text-muted mt-0.5">Adjust your filters or try a different search term.</p>
                            <WfButton variant="ghost" size="sm" class="mt-3" @click="emit('resetFilters')">Clear All Filters</WfButton>
                        </td>
                    </tr>

                    <tr v-else v-for="item in transactions" :key="item.id"
                        class="border-t border-wf-divider hover:bg-wf-surface-variant/50 transition-colors"
                        :class="{ 'opacity-50': item.exclude_from_reports }">
                        <td v-if="showSelect" class="px-3 py-2">
                            <input type="checkbox" :aria-label="'Select ' + (item.recipient || item.description)"
                                :checked="selectedIds.has(item.id)" class="accent-[var(--wf-color-primary)]"
                                @change="emit('toggleSelection', item.id)" />
                        </td>

                        <td class="px-3 py-2 align-middle leading-tight">
                            <div class="text-xs font-semibold text-wf-text-primary">{{ formatDate(item.date).day }}</div>
                            <div class="text-[10px] text-wf-text-muted">{{ formatDate(item.date).meta }}</div>
                        </td>

                        <td class="px-3 py-2 align-middle">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <span class="w-8 h-8 shrink-0 rounded-wf-md flex items-center justify-center text-sm"
                                    :style="{ backgroundColor: getCategoryDisplay(item.category || '').color + '20' }"
                                    :title="getCategoryDisplay(item.category || '').text">
                                    {{ getCategoryDisplay(item.category || '').icon }}
                                </span>
                                <div class="min-w-0">
                                    <div class="text-xs font-semibold truncate max-w-[200px] text-wf-text-primary">
                                        <router-link v-if="item.recipient"
                                            :to="`/merchants/${encodeURIComponent(item.recipient || '')}`"
                                            class="hover:underline">{{ item.recipient }}</router-link>
                                        <span v-else>{{ item.description }}</span>
                                    </div>
                                    <div v-if="item.source" class="flex items-center gap-1 text-[10px] text-wf-text-muted">
                                        <span>{{ item.source === 'SMS' ? '📱' : (item.source === 'EMAIL' ? '📧' : '⌨️') }}</span>
                                        <span>{{ item.source }}</span>
                                        <button v-if="item.recipient" type="button" aria-label="Quick insights"
                                            class="ml-1 text-wf-primary hover:opacity-80"
                                            @click.stop="emit('showVendorInsights', item.recipient || '')">
                                            <Info :size="12" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </td>

                        <td class="px-3 py-2 align-middle">
                            <div class="flex items-center gap-1 text-xs text-wf-text-secondary">
                                <span class="truncate">{{ item.description }}</span>
                                <span v-if="item.latitude || item.location_name" :title="item.location_name || 'Location available'">
                                    <MapPin :size="12" class="text-wf-primary" />
                                </span>
                            </div>
                            <div class="flex items-center flex-wrap gap-1 mt-0.5">
                                <span class="wf-tag bg-wf-surface-variant text-wf-text-secondary uppercase">{{ getAccountName(item.account_id) }}</span>
                                <span v-if="item.is_transfer" class="wf-tag bg-wf-success/10 text-wf-success">🔄 Transfer</span>
                                <span v-if="item.exclude_from_reports" class="wf-tag bg-wf-error/10 text-wf-error">🚫 Hidden</span>
                                <span v-if="item.is_emi" class="wf-tag bg-wf-info/10 text-wf-info">🏦 EMI</span>
                                <span v-if="item.expense_group_id" class="wf-tag bg-wf-secondary/10 text-wf-secondary">📁 {{ getExpenseGroupName(item.expense_group_id) }}</span>
                            </div>
                        </td>

                        <td class="px-3 py-2 align-middle text-right">
                            <div class="inline-flex items-center justify-end gap-1 font-mono tabular-nums text-sm font-bold"
                                :class="item.is_transfer ? 'text-wf-text-muted' : (Number(item.amount) > 0 ? 'text-wf-success' : 'text-wf-error')">
                                <span v-if="item.is_transfer" aria-label="Transfer">🔄</span>
                                <ArrowDownLeft v-else-if="Number(item.amount) > 0" :size="14" aria-label="Credit" />
                                <ArrowUpRight v-else :size="14" aria-label="Debit" />
                                {{ formatAmount(Math.abs(Number(item.amount))) }}
                            </div>
                        </td>

                        <td v-if="!hideActions" class="px-3 py-2 align-middle text-center">
                            <WfMenu label="Transaction actions">
                                <template #trigger><MoreVertical :size="16" /></template>
                                <button type="button" role="menuitem" class="wf-menu-item" @click="emit('editTxn', item)"><Pencil :size="14" /> Edit</button>
                                <button type="button" role="menuitem" class="wf-menu-item" @click="emit('openAliasModal', item)"><MapPin :size="14" /> Map Merchant</button>
                                <div class="my-1 border-t border-wf-divider"></div>
                                <button type="button" role="menuitem" class="wf-menu-item text-wf-error" @click="emit('deleteTxn', item.id)"><Trash2 :size="14" /> Delete</button>
                            </WfMenu>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <WfPagination v-if="!hideFooter" :page="page" :page-size="pageSize" :total="total"
            @update:page="emitOptions($event, pageSize)"
            @update:page-size="emitOptions(1, $event)" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, MoreVertical, Pencil, Trash2, FileText, ArrowDownLeft, ArrowUpRight, Info } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'
import WfButton from '@/components/ui/WfButton.vue'
import WfMenu from '@/components/ui/WfMenu.vue'
import WfPagination from '@/components/ui/WfPagination.vue'

const { formatAmount } = useCurrency()

interface Props {
    transactions: any[]
    total: number
    loading: boolean
    pageSize: number
    page: number
    selectedIds: Set<string>
    showSelect?: boolean
    hideActions?: boolean
    hideFooter?: boolean
    accounts: any[]
    categories: any[]
    expenseGroups: any[]
}

const props = withDefaults(defineProps<Props>(), {
    showSelect: true,
    hideActions: false,
    hideFooter: false
})

const emit = defineEmits<{
    'optionsUpdate': [options: any]
    'toggleSelection': [id: string]
    'showVendorInsights': [name: string]
    'editTxn': [txn: any]
    'openAliasModal': [txn: any]
    'deleteTxn': [id: string]
    'resetFilters': []
    'update:selectedIds': [value: Set<string>]
}>()

const colCount = computed(() => 4 + (props.showSelect ? 1 : 0) + (props.hideActions ? 0 : 1))

const allSelected = computed(() =>
    props.transactions.length > 0 && props.transactions.every(t => props.selectedIds.has(t.id)))

function toggleAll() {
    const next = new Set(props.selectedIds)
    if (allSelected.value) props.transactions.forEach(t => next.delete(t.id))
    else props.transactions.forEach(t => next.add(t.id))
    emit('update:selectedIds', next)
}

// Same payload shape the previous data-table emitted, so consumers keep working.
function emitOptions(page: number, itemsPerPage: number) {
    emit('optionsUpdate', { page, itemsPerPage, sortBy: [] })
}

// Helpers copied from TransactionList.vue
function formatDate(dateStr: string) {
    if (!dateStr) return { day: 'N/A', meta: '' }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { day: '?', meta: dateStr.split('T')[0] || dateStr }
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === today.toDateString()) return { day: 'Today', meta: time }
    if (d.toDateString() === yesterday.toDateString()) return { day: 'Yesterday', meta: time }
    const currentYear = today.getFullYear()
    const txnYear = d.getFullYear()
    let formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (txnYear !== currentYear) formatOptions.year = 'numeric'
    const monthDay = d.toLocaleDateString('en-US', formatOptions)
    return { day: monthDay, meta: time }
}

function getAccountName(id: string) {
    const acc = props.accounts.find(a => a.id === id)
    return acc ? acc.name : 'Unknown Account'
}

// Category colours come from user data (dynamic), not design tokens.
function getCategoryDisplay(name: string) {
    if (!name || name === 'Uncategorized') return { icon: '🏷️', text: 'Uncategorized', color: '#9ca3af' }
    const cat = props.categories.find(c => c.name === name)
    if (cat) {
        return { icon: cat.icon || '🏷️', text: cat.name, color: cat.color || '#3B82F6' }
    }
    return { icon: '🏷️', text: name, color: '#9ca3af' }
}

function getExpenseGroupName(id: string) {
    if (!id) return null
    const group = props.expenseGroups.find(g => g.id === id)
    return group ? group.name : null
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
