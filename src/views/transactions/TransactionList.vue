<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import MerchantAliasModal from '@/components/MerchantAliasModal.vue'
import { useCurrency } from '@/composables/useCurrency'
import {
    Search, Trash2, Upload, Plus, MapPin, Pencil, MoreVertical,
    FileText, TrendingUp, TrendingDown, Wallet, ArrowUpRight
} from 'lucide-vue-next'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'

const { formatAmount } = useCurrency()

export interface AccountItem { id: string; name: string; type?: string; [key: string]: any }
export interface CategoryItem { id: string; name: string; icon?: string; color?: string; parent_id?: string; subcategories?: CategoryItem[]; [key: string]: any }
export interface ExpenseGroup { id: string; name: string; [key: string]: any }
export interface TransactionItem { id: string; date: string; amount: number | string; recipient?: string; description?: string; category?: string; account_id: string; source?: string; is_ai_parsed?: boolean; is_transfer?: boolean; exclude_from_reports?: boolean; is_emi?: boolean; expense_group_id?: string; latitude?: number; location_name?: string; external_id?: string; [key: string]: any }

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
    metrics: { monthly_income: number; monthly_spending: number; monthly_investment: number; breakdown: { net_worth: number } }
    txnSortKey: string
}>()

const emit = defineEmits([
    'update:selectedAccount',
    'update:categoryFilter',
    'update:searchQuery',
    'update:startDate',
    'update:endDate',
    'update:selectedTimeRange',
    'update:page',
    'update:pageSize',
    'sortChange',
    'editTxn',
    'deleteSelected',
    'importCsv',
    'fetchData',
    'resetFilters',
    'showVendorInsights'
])

const showAliasModal = ref(false)
const aliasForm = reactive({ pattern: '', alias: '' })

function openAliasModal(txn: TransactionItem) {
    aliasForm.pattern = txn.description || txn.recipient || ''
    aliasForm.alias = txn.recipient || ''
    showAliasModal.value = true
}

const selectedIds = defineModel<Set<string>>('selectedIds', { default: () => new Set() })

const accountOptions = computed(() => [{ title: 'All Accounts', value: '' }, ...props.accounts.map(a => ({ title: a.name, value: a.id }))])

const flatCategories = computed(() => {
    const list: CategoryItem[] = []
    const flatten = (cats: CategoryItem[]) => { cats.forEach(c => { list.push(c); if (c.subcategories && c.subcategories.length > 0) flatten(c.subcategories) }) }
    flatten(props.categories)
    return list
})

const categoryOptions = computed(() => {
    const options = flatCategories.value.map(c => {
        let depth = 0; let current = c
        while (current.parent_id) {
            depth++; const parent = flatCategories.value.find(p => p.id === current.parent_id)
            if (!parent) break; current = parent
        }
        const prefix = depth > 0 ? '　'.repeat(depth) + '└ ' : ''
        return { 
            title: `${prefix}${c.icon || '🏷️'} ${c.name}`, 
            value: c.name,
            name: c.name,
            icon: c.icon || '🏷️',
            depth
        }
    })
    if (!options.find(o => o.value === 'Uncategorized')) {
        options.push({ 
            title: '🏷️ Uncategorized', 
            value: 'Uncategorized',
            name: 'Uncategorized',
            icon: '🏷️',
            depth: 0
        })
    }
    return options
})

const timeRangeOptions = [
    { title: 'All Time', value: 'all' },
    { title: 'Today', value: 'today' },
    { title: 'This Week', value: 'this-week' },
    { title: 'This Month', value: 'this-month' },
    { title: 'Last Month', value: 'last-month' },
    { title: 'Custom Range', value: 'custom' }
]

function formatDate(dateStr: string) {
    if (!dateStr) return { day: 'N/A', meta: '' }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { day: '?', meta: dateStr.split('T')[0] || dateStr }
    const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    if (d.toDateString() === today.toDateString()) return { day: 'Today', meta: time }
    if (d.toDateString() === yesterday.toDateString()) return { day: 'Yesterday', meta: time }
    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (d.getFullYear() !== today.getFullYear()) formatOptions.year = 'numeric'
    return { day: d.toLocaleDateString('en-US', formatOptions), meta: time }
}

function getAccountName(id: string) { return props.accounts.find(a => a.id === id)?.name || 'Unknown Account' }
function getCategoryDisplay(name: string) {
    if (!name || name === 'Uncategorized') return { icon: '🏷️', text: 'Uncategorized', color: '#9ca3af' }
    const cat = flatCategories.value.find(c => c.name === name)
    if (cat) {
        let text = cat.name
        const parent = cat.parent_id ? flatCategories.value.find(p => p.id === cat.parent_id) : null
        if (parent) text = `${parent.name} › ${cat.name}`
        return { icon: cat.icon || '🏷️', text, color: cat.color || '#3B82F6' }
    }
    return { icon: '🏷️', text: name, color: '#9ca3af' }
}

function getExpenseGroupName(id: string) { return props.expenseGroups.find(g => g.id === id)?.name || null }

function handleReset() { emit('resetFilters') }

</script>

<template>
  <div class="space-y-6">
    <!-- Filter Bar -->
    <Card>
      <CardContent class="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 items-center">
        <!-- Account Filter -->
        <div class="flex items-center gap-2 col-span-1 sm:col-span-2 lg:col-span-1">
          <span class="text-xs font-bold text-muted-foreground uppercase hidden lg:inline">Account</span>
          <Select :model-value="selectedAccount" @update:model-value="emit('update:selectedAccount', $event)">
            <SelectTrigger class="h-9 w-full">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in accountOptions" :key="opt.value" :value="opt.value || 'all'">
                {{ opt.title }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Time Range -->
        <div class="flex items-center gap-2 col-span-1 lg:col-span-1">
          <span class="text-xs font-bold text-muted-foreground uppercase hidden lg:inline">Time</span>
          <Select :model-value="selectedTimeRange" @update:model-value="emit('update:selectedTimeRange', $event)">
            <SelectTrigger class="h-9 w-full">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in timeRangeOptions" :key="opt.value" :value="opt.value">
                {{ opt.title }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Custom Dates -->
        <div v-if="selectedTimeRange === 'custom'" class="flex items-center gap-2 col-span-1 sm:col-span-2 lg:col-span-2 animate-in fade-in">
          <Input type="date" :model-value="startDate" @update:model-value="emit('update:startDate', $event as string); emit('fetchData')" class="h-9" />
          <span class="text-xs text-muted-foreground">to</span>
          <Input type="date" :model-value="endDate" @update:model-value="emit('update:endDate', $event as string); emit('fetchData')" class="h-9" />
        </div>

        <!-- Search -->
        <div class="relative col-span-1 sm:col-span-2 lg:col-span-2">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            :model-value="searchQuery" 
            @update:model-value="emit('update:searchQuery', $event as string)" 
            placeholder="Search description or recipient..." 
            class="pl-8 h-9" 
          />
        </div>

        <!-- Category -->
        <div class="col-span-1 lg:col-span-1">
          <Select :model-value="categoryFilter" @update:model-value="emit('update:categoryFilter', $event); emit('fetchData')">
            <SelectTrigger class="h-9 w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in [{ title: 'All Categories', value: 'all', name: 'All Categories', icon: '🏷️', depth: 0 }, ...categoryOptions]" :key="opt.value" :value="opt.value">
                <div :style="{ paddingLeft: `${opt.depth * 16}px` }" class="flex items-center gap-2 py-0.5">
                  <span v-if="opt.depth > 0" class="text-muted-foreground/30 font-mono select-none text-[10px]">└</span>
                  <span class="text-sm">{{ opt.icon }}</span>
                  <span :class="opt.depth === 0 ? 'font-bold text-foreground' : 'text-muted-foreground font-medium'">
                    {{ opt.name }}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Reset -->
        <div v-if="startDate || endDate || searchQuery || categoryFilter" class="col-span-1 lg:col-span-1 flex justify-end lg:justify-start">
          <Button variant="ghost" size="sm" @click="handleReset" class="h-9 text-primary">
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Bulk Actions & Info -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <span class="text-xl font-bold">
          {{ total }} <span class="text-sm font-normal text-muted-foreground">Transactions</span>
        </span>
        <div v-if="selectedIds.size > 0" class="flex items-center gap-2 animate-in fade-in">
          <div class="h-4 w-px bg-border mx-2"></div>
          <span class="text-xs font-bold text-primary">{{ selectedIds.size }} Selected</span>
          <Button variant="destructive" size="sm" @click="emit('deleteSelected')" class="h-8 text-xs gap-1">
            <Trash2 class="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="secondary" size="sm" @click="emit('importCsv')" class="gap-1 h-9">
          <Upload class="h-4 w-4" /> Import
        </Button>
        <Button size="sm" @click="emit('editTxn', null)" class="gap-1 h-9 rounded-full">
          <Plus class="h-4 w-4" /> Add
        </Button>
      </div>
    </div>

    <!-- Transaction KPIs -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent class="p-4 flex items-center gap-4">
          <div class="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <TrendingUp class="h-5 w-5" />
          </div>
          <div>
            <div class="text-[10px] font-bold text-muted-foreground uppercase">Income</div>
            <div class="text-lg font-bold text-emerald-500">{{ formatAmount(props.metrics.monthly_income) }}</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-4 flex items-center gap-4">
          <div class="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
            <TrendingDown class="h-5 w-5" />
          </div>
          <div>
            <div class="text-[10px] font-bold text-muted-foreground uppercase">Expenses</div>
            <div class="text-lg font-bold text-red-500">{{ formatAmount(Math.abs(props.metrics.monthly_spending)) }}</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-4 flex items-center gap-4">
          <div class="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <ArrowUpRight class="h-5 w-5" />
          </div>
          <div>
            <div class="text-[10px] font-bold text-muted-foreground uppercase">Investments</div>
            <div class="text-lg font-bold text-blue-500">{{ formatAmount(Math.abs(props.metrics.monthly_investment || 0)) }}</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-4 flex items-center gap-4">
          <div class="h-10 w-10 rounded-lg flex items-center justify-center" :class="(props.metrics.monthly_income - props.metrics.monthly_spending - (props.metrics.monthly_investment || 0)) >= 0 ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'">
            <Wallet class="h-5 w-5" />
          </div>
          <div>
            <div class="text-[10px] font-bold text-muted-foreground uppercase">Net Flow</div>
            <div class="text-lg font-bold" :class="(props.metrics.monthly_income - props.metrics.monthly_spending - (props.metrics.monthly_investment || 0)) >= 0 ? 'text-primary' : 'text-amber-500'">
              {{ formatAmount(props.metrics.monthly_income - props.metrics.monthly_spending - (props.metrics.monthly_investment || 0)) }}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- We will use a custom native table for Transactions instead of generic DataTable.vue due to the highly customized cells and slots required, which are easier to migrate using standard Vue rendering inside shadcn table structure. -->
    <Card class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-muted-foreground font-medium">
              <th class="w-10 px-4 py-3 text-left">
                <Checkbox :checked="selectedIds.size === transactions.length && transactions.length > 0" @update:checked="(val: boolean) => { if (val) { selectedIds = new Set(transactions.map(t => t.id)) } else { selectedIds = new Set() } }" />
              </th>
              <th class="px-4 py-3 text-left">Date</th>
              <th class="px-4 py-3 text-left">Recipient / Source</th>
              <th class="px-4 py-3 text-left">Description</th>
              <th class="px-4 py-3 text-right">Amount</th>
              <th class="w-14 px-4 py-3 text-center"></th>
            </tr>
          </thead>
          <tbody v-if="loading">
             <!-- Skeleton Loader -->
             <tr v-for="i in 5" :key="i" class="border-b">
               <td class="px-4 py-4"><div class="h-4 w-4 bg-muted rounded animate-pulse"></div></td>
               <td class="px-4 py-4"><div class="h-4 w-16 bg-muted rounded animate-pulse mb-1"></div><div class="h-3 w-12 bg-muted rounded animate-pulse"></div></td>
               <td class="px-4 py-4 flex gap-3"><div class="h-10 w-10 bg-muted rounded animate-pulse"></div><div><div class="h-4 w-32 bg-muted rounded animate-pulse mb-1"></div><div class="h-3 w-16 bg-muted rounded animate-pulse"></div></div></td>
               <td class="px-4 py-4"><div class="h-4 w-48 bg-muted rounded animate-pulse"></div></td>
               <td class="px-4 py-4"><div class="h-5 w-20 bg-muted rounded animate-pulse ml-auto"></div></td>
               <td class="px-4 py-4"><div class="h-4 w-4 bg-muted rounded animate-pulse mx-auto"></div></td>
             </tr>
          </tbody>
          <tbody v-else-if="transactions.length > 0">
            <tr v-for="item in transactions" :key="item.id" class="border-b hover:bg-muted/50 transition-colors" :class="{ 'opacity-50 grayscale bg-muted/20': item.exclude_from_reports }">
              <td class="px-4 py-3">
                <Checkbox :checked="selectedIds.has(item.id)" @update:checked="(val: boolean) => { const n = new Set(selectedIds); if(val) n.add(item.id); else n.delete(item.id); selectedIds = n; }" />
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="font-bold text-sm">{{ formatDate(item.date).day }}</div>
                <div class="text-[10px] text-muted-foreground">{{ formatDate(item.date).meta }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <div class="h-9 w-9 rounded-lg flex items-center justify-center text-lg" :style="`background: ${getCategoryDisplay(item.category || '').color}20`">
                          {{ getCategoryDisplay(item.category || '').icon }}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{{ getCategoryDisplay(item.category || '').text }}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div>
                    <div class="font-bold text-sm max-w-[200px] truncate">
                      <router-link v-if="item.recipient" :to="`/merchants/${encodeURIComponent(item.recipient || '')}`" class="hover:underline">
                        {{ item.recipient }}
                      </router-link>
                      <span v-else>{{ item.description }}</span>
                    </div>
                    <div class="text-[10px] flex items-center gap-1 font-bold text-muted-foreground" v-if="item.source">
                      <span>{{ item.source === 'SMS' ? '📱' : (item.source === 'EMAIL' ? '📧' : '⌨️') }} {{ item.source }}</span>
                      <Button v-if="item.recipient" variant="ghost" size="icon" class="h-4 w-4 text-primary ml-1" @click.stop="emit('showVendorInsights', item.recipient || '')">
                        <ArrowUpRight class="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm mb-1 flex items-center">
                  {{ item.description }}
                  <TooltipProvider v-if="item.latitude || item.location_name">
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <MapPin class="h-3 w-3 ml-1 text-primary" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{{ item.location_name || 'Location available' }}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div class="flex flex-wrap gap-1">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground uppercase">
                    {{ getAccountName(item.account_id) }}
                  </span>
                  <span v-if="item.external_id" class="text-[10px] font-medium px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground" title="Reference ID">
                    {{ item.external_id }}
                  </span>
                  <span v-if="item.is_ai_parsed" class="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">✨ AI</span>
                  <span v-if="item.is_transfer" class="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500">🔄 Transfer</span>
                  <span v-if="item.exclude_from_reports" class="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-500">🚫 Hidden</span>
                  <span v-if="item.is_emi" class="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-500">🏦 EMI</span>
                  <span v-if="item.expense_group_id" class="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-secondary/20 text-secondary-foreground">📁 {{ getExpenseGroupName(item.expense_group_id) }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="font-bold whitespace-nowrap" :class="[Number(item.amount) > 0 ? 'text-emerald-500' : 'text-red-500', item.is_transfer ? 'opacity-70 grayscale' : '']">
                  <span v-if="item.is_transfer">🔄</span>
                  <span v-else-if="Number(item.amount) > 0">↓</span>
                  <span v-else>↑</span>
                  {{ formatAmount(Math.abs(Number(item.amount))) }}
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground">
                      <MoreVertical class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="emit('editTxn', item)">
                      <Pencil class="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="openAliasModal(item)">
                      <MapPin class="h-4 w-4 mr-2" /> Map Merchant
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem @click="() => { selectedIds = new Set([item.id]); emit('deleteSelected') }" class="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                      <Trash2 class="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="6">
                <div class="flex flex-col items-center justify-center py-16 text-center animate-in fade-in">
                  <div class="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                    <FileText class="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <h3 class="text-xl font-bold mb-2">No Transactions Found</h3>
                  <p class="text-muted-foreground mb-4">Adjust your filters or try a different search term.</p>
                  <Button variant="outline" @click="handleReset">Clear All Filters</Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination Controls (Simple) -->
      <div v-if="total > 0 && !loading" class="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
        <div>Showing {{ (page - 1) * pageSize + 1 }} - {{ Math.min(page * pageSize, total) }} of {{ total }}</div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" :disabled="page <= 1" @click="emit('update:page', page - 1); emit('fetchData')">Previous</Button>
          <Button variant="outline" size="sm" :disabled="page * pageSize >= total" @click="emit('update:page', page + 1); emit('fetchData')">Next</Button>
        </div>
      </div>
    </Card>

    <MerchantAliasModal v-model="showAliasModal" :initial-pattern="aliasForm.pattern" :initial-alias="aliasForm.alias" @saved="() => { emit('fetchData') }" />
  </div>
</template>
