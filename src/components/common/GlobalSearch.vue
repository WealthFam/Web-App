<script lang="ts">
import { ref } from 'vue'

// Cache to keep results persistent when modal is toggled
const backendResults = ref<any[]>([])
const isSearching = ref(false)

export default {
    name: 'GlobalSearch'
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
    Search,
    LayoutDashboard,
    Wallet,
    PieChart,
    Sparkles,
    Coins,
    Target,
    Landmark,
    TrendingUp,
    Plus,
    History,
    ArrowRight,
    CreditCard,
    Command,
    Store
} from 'lucide-vue-next'
import { financeApi } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
    modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const auth = useAuthStore()
const { formatAmount } = useCurrency()

const searchQuery = ref('')
const selectedIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)
let debounceTimer: any = null

const navItems = [
    { title: 'Dashboard', icon: LayoutDashboard, to: '/' },
    { title: 'Ledger', icon: Wallet, to: '/transactions' },
    { title: 'Budgets', icon: PieChart, to: '/budgets' },
    { title: 'Insights', icon: Sparkles, to: '/insights' },
    { title: 'Funds', icon: Coins, to: '/mutual-funds' },
    { title: 'Goals', icon: Target, to: '/investment-goals' }
]

const quickActions = [
    { title: 'Add Transaction', icon: Plus, to: '/transactions?action=new' },
    { title: 'Import CAS', icon: History, to: '/mutual-funds?tab=import' },
]

async function performSearch() {
    if (!searchQuery.value.trim()) {
        backendResults.value = []
        return
    }

    isSearching.value = true
    try {
        const userId = auth.selectedMemberId || undefined
        const res = await financeApi.globalSearch(searchQuery.value, userId)

        // Map backend results to include icons and formatting
        backendResults.value = (res.data || []).map((item: any) => {
            let icon = Search
            let color = 'primary'
            let to = item.route_params?.to || '/'

            if (item.type === 'account') { icon = CreditCard; color = 'info'; to = `/transactions?accountId=${item.id}`; }
            if (item.type === 'loan') { icon = Landmark; color = 'error'; to = `/loans/${item.id}`; }
            if (item.type === 'goal') { icon = Target; color = 'success'; to = '/investment-goals'; }
            if (item.type === 'fund') { icon = TrendingUp; color = 'primary'; to = `/mutual-funds/${item.code}?type=aggregate`; }
            if (item.type === 'merchant') { icon = Store; color = 'warning'; to = `/merchants/${encodeURIComponent(item.id)}`; }

            return {
                ...item,
                icon,
                color,
                to,
                displayValue: item.value ? formatAmount(Number(item.value)) : null
            }
        })
    } catch (e) {
        console.error("Search failed", e)
    } finally {
        isSearching.value = false
    }
}

watch(searchQuery, (newVal) => {
    selectedIndex.value = 0
    if (debounceTimer) clearTimeout(debounceTimer)

    if (newVal.trim()) {
        debounceTimer = setTimeout(() => {
            performSearch()
        }, 300)
    } else {
        backendResults.value = []
    }
})

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        searchQuery.value = ''
        selectedIndex.value = 0
        document.body.style.overflow = 'hidden'
        nextTick(() => {
            searchInputRef.value?.focus()
        })
    } else {
        document.body.style.overflow = ''
    }
})

// Consolidated list for keyboard navigation
const flattenedResults = computed(() => {
    if (!searchQuery.value.trim()) {
        return [...navItems, ...quickActions]
    }
    return backendResults.value
})

function navigateTo(item: any) {
    if (item.to) {
        router.push(item.to)
    }
    emit('update:modelValue', false)
}

function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
        e.preventDefault()
        selectedIndex.value = (selectedIndex.value + 1) % Math.max(1, flattenedResults.value.length)
    } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        selectedIndex.value = (selectedIndex.value - 1 + flattenedResults.value.length) % Math.max(1, flattenedResults.value.length)
    } else if (e.key === 'Enter') {
        if (flattenedResults.value[selectedIndex.value]) {
            navigateTo(flattenedResults.value[selectedIndex.value])
        }
    } else if (e.key === 'Escape') {
        emit('update:modelValue', false)
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleGlobalKeyDown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalKeyDown)
    document.body.style.overflow = ''
})

function handleGlobalKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        emit('update:modelValue', !props.modelValue)
    }
}
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="modelValue"
                class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
                @click.self="emit('update:modelValue', false)"
                @keydown="handleKeyDown"
            >
                <div class="w-full max-w-2xl rounded-wf-xl bg-wf-surface border border-wf-border shadow-wf-modal overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <!-- Search Header -->
                    <div class="p-4 flex items-center gap-3 border-b border-wf-border-subtle bg-wf-surface">
                        <Search :size="18" class="text-wf-primary shrink-0" />
                        <input
                            ref="searchInputRef"
                            v-model="searchQuery"
                            type="text"
                            class="flex-1 bg-transparent border-none outline-hidden text-sm sm:text-base font-semibold text-wf-text-primary placeholder:text-wf-text-muted"
                            placeholder="Search accounts, loans, funds, merchants..."
                            @input="selectedIndex = 0"
                        />

                        <div class="flex items-center gap-2">
                            <div v-if="isSearching" class="w-4 h-4 rounded-full border-2 border-wf-primary border-t-transparent animate-spin shrink-0"></div>
                            <span class="hidden sm:inline-flex px-1.5 py-0.5 rounded-wf-xs bg-wf-surface-variant text-[10px] font-mono font-bold text-wf-text-muted border border-wf-border-subtle">
                                ESC
                            </span>
                        </div>
                    </div>

                    <!-- Results / Quick Access Area -->
                    <div class="max-h-[460px] overflow-y-auto p-4 space-y-4">
                        <!-- Empty State: Quick Access & Actions -->
                        <div v-if="!searchQuery.trim()" class="space-y-4">
                            <div>
                                <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block mb-2">
                                    Quick Access
                                </span>
                                <div class="flex flex-wrap items-center gap-2">
                                    <div
                                        v-for="(item, idx) in navItems"
                                        :key="item.title"
                                        @click="navigateTo(item)"
                                        @mouseenter="selectedIndex = idx"
                                        class="flex items-center gap-2 px-3 py-1.5 rounded-wf-pill text-xs font-semibold cursor-pointer transition-all border"
                                        :class="selectedIndex === idx
                                            ? 'bg-wf-primary-light text-wf-primary border-indigo-200 dark:border-indigo-800 shadow-2xs'
                                            : 'bg-wf-surface-variant text-wf-text-secondary border-wf-border-subtle hover:text-wf-text-primary'"
                                    >
                                        <component :is="item.icon" :size="14" class="opacity-80" />
                                        <span>{{ item.title }}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block mb-2">
                                    Quick Actions
                                </span>
                                <div class="flex flex-wrap items-center gap-2">
                                    <div
                                        v-for="(item, idx) in quickActions"
                                        :key="item.title"
                                        @click="navigateTo(item)"
                                        @mouseenter="selectedIndex = navItems.length + idx"
                                        class="flex items-center gap-2 px-3 py-1.5 rounded-wf-pill text-xs font-semibold cursor-pointer transition-all border border-dashed"
                                        :class="selectedIndex === navItems.length + idx
                                            ? 'bg-wf-primary-light text-wf-primary border-indigo-300 dark:border-indigo-700 shadow-2xs'
                                            : 'bg-wf-surface-variant/60 text-wf-text-secondary border-wf-border-subtle hover:text-wf-text-primary'"
                                    >
                                        <component :is="item.icon" :size="14" class="opacity-80" />
                                        <span>{{ item.title }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Live Search Results -->
                        <div v-else>
                            <div v-if="backendResults.length === 0 && !isSearching" class="py-12 text-center space-y-1">
                                <div class="text-3xl mb-2">🔍</div>
                                <h3 class="text-sm font-bold text-wf-text-primary">No results for "{{ searchQuery }}"</h3>
                                <p class="text-xs text-wf-text-muted">Try searching for bank name, fund scheme, or merchant</p>
                            </div>

                            <div v-else class="space-y-1">
                                <div
                                    v-for="(item, idx) in backendResults"
                                    :key="item.id || item.code || item.title"
                                    @click="navigateTo(item)"
                                    @mouseenter="selectedIndex = idx"
                                    class="flex items-center justify-between p-2.5 rounded-wf-lg cursor-pointer transition-all border"
                                    :class="selectedIndex === idx
                                        ? 'bg-wf-surface-variant border-wf-border shadow-2xs'
                                        : 'bg-transparent border-transparent hover:bg-wf-surface-variant/50'"
                                >
                                    <div class="flex items-center gap-3 min-w-0">
                                        <div
                                            class="w-9 h-9 rounded-wf-md flex items-center justify-center shrink-0 border"
                                            :class="selectedIndex === idx
                                                ? 'bg-wf-primary text-white border-wf-primary'
                                                : 'bg-wf-surface-variant text-wf-primary border-wf-border-subtle'"
                                        >
                                            <component :is="item.icon" :size="16" />
                                        </div>

                                        <div class="min-w-0">
                                            <div class="text-xs font-bold text-wf-text-primary truncate">
                                                {{ item.title }}
                                            </div>
                                            <div class="text-[10px] font-semibold uppercase tracking-wider text-wf-text-muted truncate mt-0.5">
                                                {{ item.subtitle }}
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3 shrink-0 ml-3">
                                        <span v-if="item.displayValue" class="text-xs font-bold font-mono text-wf-primary tabular-nums">
                                            {{ item.displayValue }}
                                        </span>
                                        <ArrowRight
                                            :size="14"
                                            class="text-wf-primary transition-opacity"
                                            :class="selectedIndex === idx ? 'opacity-100' : 'opacity-0'"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-4 py-2.5 border-t border-wf-border-subtle bg-wf-surface-variant/40 flex items-center justify-between text-[11px] text-wf-text-muted">
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-1.5">
                                <span class="px-1 py-0.2 rounded-wf-xs bg-wf-surface border border-wf-border-subtle font-mono font-bold text-[9px]">↑</span>
                                <span class="px-1 py-0.2 rounded-wf-xs bg-wf-surface border border-wf-border-subtle font-mono font-bold text-[9px]">↓</span>
                                <span>Navigate</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="px-1.5 py-0.2 rounded-wf-xs bg-wf-surface border border-wf-border-subtle font-mono font-bold text-[9px]">↵</span>
                                <span>Select</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-wf-primary">
                            <Command :size="12" />
                            <span>Global Search</span>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
