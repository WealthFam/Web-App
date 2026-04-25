<template>
    <v-data-table-server 
        v-model="tableSelection" 
        :headers="computedHeaders" 
        :items="transactions" 
        :items-length="total"
        :loading="loading" 
        :items-per-page="pageSize" 
        :page="page" 
        hover 
        @update:options="emit('optionsUpdate', $event)"
        class="premium-table" 
        density="comfortable" 
        :show-select="showSelect"
        :row-props="(data: any) => ({ class: { 'hidden-txn-row': data.item.exclude_from_reports } })">
        
        <!-- Selection Column Slot -->
        <template #[`item.data-table-select`]="{ item }">
            <v-checkbox-btn 
                :model-value="selectedIds.has(item.id)"
                @update:model-value="emit('toggleSelection', item.id)" 
                color="primary" 
            />
        </template>

        <!-- Date Column -->
        <template #[`item.date`]="{ item }">
            <div class="date-cell">
                <div class="text-subtitle-2 font-weight-bold">{{ formatDate(item.date).day }}</div>
                <div class="text-caption opacity-50 font-weight-medium">{{ formatDate(item.date).meta }}</div>
            </div>
        </template>

        <!-- Recipient Column -->
        <template #[`item.recipient`]="{ item }">
            <div class="d-flex align-center gap-3 py-2">
                <v-tooltip :text="getCategoryDisplay(item.category || '').text" location="top">
                    <template v-slot:activator="{ props }">
                        <v-avatar v-bind="props" size="36"
                            :color="getCategoryDisplay(item.category || '').color + '20'" rounded="lg">
                            <span class="text-h6 pb-1">{{ getCategoryDisplay(item.category || '').icon }}</span>
                        </v-avatar>
                    </template>
                </v-tooltip>
                <div>
                    <div class="text-subtitle-2 font-weight-bold text-truncate" style="max-width: 200px;">
                        <router-link v-if="item.recipient"
                            :to="`/merchants/${encodeURIComponent(item.recipient || '')}`"
                            class="text-decoration-none text-content hover-underline">
                            {{ item.recipient }}
                        </router-link>
                        <span v-else>{{ item.description }}</span>
                    </div>
                    <div class="text-caption d-flex align-center gap-1 font-weight-bold" v-if="item.source">
                        <div class="d-flex align-center opacity-50">
                            <span class="source-icon-mini">{{ item.source === 'SMS' ? '📱' : (item.source ===
                                'EMAIL' ? '📧' : '⌨️') }}</span>
                            {{ item.source }}
                        </div>
                        <v-tooltip text="Quick Insights" location="top">
                            <template v-slot:activator="{ props }">
                                <v-btn v-if="item.recipient" v-bind="props" icon variant="text" size="x-small" density="compact" class="ml-1" color="primary" @click.stop="emit('showVendorInsights', item.recipient || '')">
                                    <v-icon size="small" icon="$info"></v-icon>
                                </v-btn>
                            </template>
                        </v-tooltip>
                    </div>
                </div>
            </div>
        </template>

        <!-- Description Column -->
        <template #[`item.description`]="{ item }">
            <div class="py-2">
                <div class="text-body-2 text-medium-emphasis mb-1 d-flex align-center">
                    {{ item.description }}
                    <v-tooltip v-if="item.latitude || item.location_name"
                        :text="item.location_name || 'Location available'">
                        <template #activator="{ props }">
                            <MapPin v-bind="props" :size="14" class="ml-1 text-primary" />
                        </template>
                    </v-tooltip>
                </div>
                <div class="d-flex align-center flex-wrap gap-1">
                    <v-chip size="x-small" variant="flat" color="surface-variant"
                        class="text-uppercase font-weight-black opacity-70">
                        {{ getAccountName(item.account_id) }}
                    </v-chip>

                    <v-chip v-if="item.is_ai_parsed" size="x-small" color="primary" variant="tonal"
                        class="font-weight-bold">
                        ✨ AI
                    </v-chip>
                    <v-chip v-if="item.is_transfer" size="x-small" color="success" variant="tonal"
                        class="font-weight-bold">
                        🔄 Transfer
                    </v-chip>
                    <v-chip v-if="item.exclude_from_reports" size="x-small" color="error" variant="tonal"
                        class="font-weight-bold">
                        🚫 Hidden
                    </v-chip>
                    <v-chip v-if="item.is_emi" size="x-small" color="info" variant="tonal"
                        class="font-weight-bold">
                        🏦 EMI
                    </v-chip>
                    <v-chip v-if="item.expense_group_id" size="x-small" color="secondary" variant="tonal"
                        class="font-weight-bold">
                        📁 {{ getExpenseGroupName(item.expense_group_id) }}
                    </v-chip>
                </div>
            </div>
        </template>

        <!-- Amount Column -->
        <template #[`item.amount`]="{ item }">
            <div class="text-right">
                <div :class="[
                    'text-subtitle-1 font-weight-black',
                    Number(item.amount) > 0 ? 'text-success' : 'text-error',
                    item.is_transfer ? 'opacity-70 text-medium-emphasis grayscale' : ''
                ]">
                    <span v-if="item.is_transfer">🔄</span>
                    <span v-else-if="Number(item.amount) > 0">↑</span>
                    <span v-else>↓</span>
                    {{ formatAmount(Math.abs(Number(item.amount))) }}
                </div>
            </div>
        </template>

        <!-- Actions Column -->
        <template #[`item.actions`]="{ item }">
            <div class="text-center">
                <v-menu location="start">
                    <template v-slot:activator="{ props }">
                        <v-btn size="x-small" variant="text" color="medium-emphasis" v-bind="props">
                            <MoreVertical :size="18" />
                        </v-btn>
                    </template>
                    <v-list density="compact" class="rounded-lg border" elevation="2">
                        <v-list-item @click="emit('editTxn', item)" title="Edit" value="edit">
                            <template v-slot:prepend>
                                <Pencil :size="16" class="mr-2" />
                            </template>
                        </v-list-item>
                        <v-list-item @click="emit('openAliasModal', item)" title="Map Merchant" value="map">
                            <template v-slot:prepend>
                                <MapPin :size="16" class="mr-2" />
                            </template>
                        </v-list-item>
                        <v-divider class="my-1"></v-divider>
                        <v-list-item @click="emit('deleteTxn', item.id)"
                            title="Delete" value="delete" color="error">
                            <template v-slot:prepend>
                                <Trash2 :size="16" class="mr-2" />
                            </template>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </div>
        </template>

        <!-- Empty State -->
        <template #no-data>
            <div class="d-flex flex-column align-center justify-center pa-10 text-center animate-in">
                <v-avatar size="100" color="surface-variant" variant="tonal" class="mb-6">
                    <FileText :size="48" class="opacity-50" />
                </v-avatar>
                <h3 class="text-h5 font-weight-black mb-1">No Transactions Found</h3>
                <p class="text-body-1 text-medium-emphasis">Adjust your filters or try a different search term.</p>
                <v-btn color="primary" variant="text" class="mt-4 font-weight-bold" @click="emit('resetFilters')">Clear All Filters</v-btn>
            </div>
        </template>

        <!-- Loading State -->
        <template #loading>
            <div class="py-2">
                <div v-for="i in 10" :key="i"
                    class="d-flex align-center px-4 py-3 border-b border-opacity-25 glass-loader-row">
                    <v-skeleton-loader type="avatar" size="40" class="mr-4 skeleton-glass"></v-skeleton-loader>
                    <div class="flex-grow-1 mr-4">
                        <v-skeleton-loader type="text" width="60%" class="mb-1 skeleton-glass"></v-skeleton-loader>
                        <v-skeleton-loader type="text" width="40%" height="12" class="skeleton-glass"></v-skeleton-loader>
                    </div>
                    <div class="text-right">
                        <v-skeleton-loader type="text" width="80px" class="skeleton-glass"></v-skeleton-loader>
                    </div>
                </div>
            </div>
        </template>
        <!-- Bottom Slot Override -->
        <template #bottom v-if="hideFooter"></template>
    </v-data-table-server>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, MoreVertical, Pencil, Trash2, FileText } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'

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

const tableSelection = computed({
    get: () => Array.from(props.selectedIds),
    set: (newSelection: any[]) => {
        emit('update:selectedIds', new Set(newSelection))
    }
})

const computedHeaders = computed(() => {
    const base = [
        { title: 'Date', key: 'date', sortable: true, width: '110px' },
        { title: 'Recipient / Source', key: 'recipient', sortable: true, width: '250px' },
        { title: 'Description', key: 'description', sortable: false },
        { title: 'Amount', key: 'amount', sortable: true, align: 'end' as const, width: '130px' },
    ]
    if (!props.hideActions) {
        base.push({ title: '', key: 'actions', sortable: false, align: 'center' as const, width: '60px' })
    }
    return base
})

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
.date-cell { line-height: 1.3; }
.source-icon-mini { font-size: 0.75rem; }
.hidden-txn-row {
    opacity: 0.5;
    filter: grayscale(0.5);
    background: rgba(var(--v-theme-on-surface), 0.02);
}
.hover-underline:hover { text-decoration: underline !important; }
.animate-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }

/* Skeleton Loader Overrides */
.skeleton-glass { background: transparent !important; }
.skeleton-glass :deep(.v-skeleton-loader__bone) {
    background: rgba(var(--v-theme-on-surface), 0.05) !important;
    border-radius: 8px;
}
.skeleton-glass :deep(.v-skeleton-loader__avatar) { border-radius: 12px; }
.glass-loader-row { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
</style>
