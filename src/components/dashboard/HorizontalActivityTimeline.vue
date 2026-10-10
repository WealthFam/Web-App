<template>
  <WfCard variant="elevated" padding="md" radius="lg" class="w-full overflow-hidden">
    <div class="space-y-3">
      <!-- HEADER & CONTROLS -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-wf-border-subtle">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shadow-2xs">
            <Clock3 class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Single Cashflow & Activity Timeline</h3>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1 animate-pulse"></span>
                Past &rarr; Now &rarr; Future
              </span>
            </div>
            <p class="text-[11px] text-wf-text-muted">Left: Settled History • Center: Today • Right: Upcoming Due</p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <!-- Filter Tabs -->
          <div class="h-8 flex items-center gap-1 bg-wf-surface-variant p-0.5 rounded-wf-md border border-wf-border-subtle">
            <button
              v-for="tab in filterTabs"
              :key="tab.id"
              type="button"
              class="h-full px-2 text-[10px] font-bold rounded-wf-sm transition-all flex items-center gap-1"
              :class="activeFilter === tab.id ? 'bg-wf-surface text-wf-primary shadow-2xs font-semibold' : 'text-wf-text-muted hover:text-wf-text-primary'"
              @click="activeFilter = tab.id"
            >
              <span>{{ tab.label }}</span>
              <span class="text-[9px] opacity-75">({{ tab.count }})</span>
            </button>
          </div>

          <!-- Focus 'Now' Button -->
          <button
            type="button"
            class="h-8 px-2.5 text-[10px] font-bold rounded-wf-sm bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-900/50 transition-colors flex items-center justify-center gap-1 shrink-0"
            @click="scrollToNow"
            title="Focus on Today"
          >
            <LocateFixed class="w-3.5 h-3.5" />
            <span>Today</span>
          </button>

          <!-- Scroll Chevrons -->
          <div class="hidden sm:flex items-center gap-1 h-8">
            <button
              type="button"
              class="h-8 w-8 rounded-wf-sm bg-wf-surface-variant text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface transition-colors border border-wf-border-subtle flex items-center justify-center"
              @click="scrollTimeline(-240)"
              title="Scroll Left (Past)"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="h-8 w-8 rounded-wf-sm bg-wf-surface-variant text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface transition-colors border border-wf-border-subtle flex items-center justify-center"
              @click="scrollTimeline(240)"
              title="Scroll Right (Future)"
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- HORIZONTAL CONTINUOUS TIMELINE TRACK -->
      <div class="relative w-full pt-1 pb-1">
        <!-- Scrollable Track Container -->
        <div
          ref="scrollContainer"
          class="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scroll-smooth relative z-10 px-1"
        >
          <!-- 1. PAST / SETTLED ITEMS (Oldest to Recent) -->
          <div
            v-for="item in pastItems"
            :key="item.id"
            class="w-[185px] sm:w-[195px] shrink-0 p-2.5 rounded-wf-md bg-wf-surface border border-wf-border-subtle hover:border-wf-primary/40 transition-all flex flex-col justify-between shadow-2xs group relative"
          >
            <!-- Timeline Node Indicator Dot on top spine -->
            <div class="flex items-center justify-between gap-1 mb-1.5">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="w-2 h-2 rounded-full ring-2 ring-wf-surface shrink-0" :class="item.dotClass"></span>
                <span class="text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded border truncate" :class="item.badgeClass">
                  {{ item.badge }}
                </span>
              </div>
              <span class="text-[9px] font-semibold text-wf-text-muted shrink-0 tabular-nums">
                {{ item.timeDisplay }}
              </span>
            </div>

            <!-- Card Body -->
            <div class="flex items-center gap-2 my-0.5 flex-1 min-w-0">
              <div class="w-6 h-6 rounded-wf-sm bg-wf-surface-variant flex items-center justify-center text-xs shrink-0 border border-wf-border-subtle group-hover:scale-105 transition-transform">
                <component :is="item.iconComponent" v-if="item.iconComponent" class="w-3 h-3 text-wf-text-primary" />
                <span v-else class="text-xs">{{ item.iconEmoji || '💳' }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-bold text-wf-text-primary truncate" :title="item.title">{{ item.title }}</p>
                <p class="text-[9px] text-wf-text-secondary truncate" :title="item.subtitle">{{ item.subtitle }}</p>
              </div>
            </div>

            <!-- Footer Horizon & Value -->
            <div class="pt-1.5 border-t border-wf-border-subtle/70 mt-1 flex items-center justify-between text-[10px]">
              <span class="text-[8px] font-medium text-wf-text-muted truncate max-w-[80px]">
                {{ item.horizonLabel }}
              </span>
              <span
                v-if="item.amount !== undefined"
                class="font-bold tabular-nums text-[11px] shrink-0"
                :class="item.amountClass"
              >
                {{ item.amountPrefix }}{{ formatAmount(Math.abs(item.amount)) }}
              </span>
            </div>
          </div>

          <!-- 2. NOW / TODAY DIVIDER & HIGHLIGHT MILESTONE -->
          <div
            ref="todayNodeRef"
            class="w-[195px] sm:w-[210px] shrink-0 p-2.5 rounded-wf-md bg-indigo-50/60 dark:bg-indigo-950/40 border-2 border-indigo-400 dark:border-indigo-500 shadow-md ring-2 ring-indigo-400/20 flex flex-col justify-between group relative"
          >
            <!-- Timeline Node Indicator Dot with glowing ring -->
            <div class="flex items-center justify-between gap-1 mb-1.5">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-4 ring-indigo-200 dark:ring-indigo-900 shrink-0 animate-pulse"></span>
                <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-600 text-white shadow-2xs">
                  NOW • TODAY
                </span>
              </div>
              <span class="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
                {{ todayFormatted }}
              </span>
            </div>

            <!-- Today Milestone Content -->
            <div class="flex items-center gap-2 my-0.5 flex-1 min-w-0">
              <div class="w-6 h-6 rounded-wf-sm bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-xs shrink-0 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                <Sparkles class="w-3.5 h-3.5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-bold text-indigo-950 dark:text-indigo-100 truncate">Live Cashflow State</p>
                <p class="text-[9px] text-indigo-700 dark:text-indigo-300 truncate">
                  {{ todayItemCount }} activities tracked today
                </p>
              </div>
            </div>

            <!-- Today Footer -->
            <div class="pt-1.5 border-t border-indigo-200 dark:border-indigo-800 mt-1 flex items-center justify-between text-[10px]">
              <span class="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Present Marker</span>
              <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Live Active</span>
            </div>
          </div>

          <!-- 3. FUTURE / UPCOMING OBLIGATIONS (Nearest to Furthest) -->
          <div
            v-for="item in futureItems"
            :key="item.id"
            class="w-[185px] sm:w-[195px] shrink-0 p-2.5 rounded-wf-md bg-amber-50/30 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 hover:border-amber-400 transition-all flex flex-col justify-between shadow-2xs group relative"
          >
            <!-- Timeline Node Indicator Dot on top spine -->
            <div class="flex items-center justify-between gap-1 mb-1.5">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="w-2 h-2 rounded-full ring-2 ring-wf-surface shrink-0" :class="item.dotClass"></span>
                <span class="text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded border truncate" :class="item.badgeClass">
                  {{ item.badge }}
                </span>
              </div>
              <span class="text-[9px] font-bold text-amber-700 dark:text-amber-300 shrink-0 tabular-nums">
                {{ item.timeDisplay }}
              </span>
            </div>

            <!-- Card Body -->
            <div class="flex items-center gap-2 my-0.5 flex-1 min-w-0">
              <div class="w-6 h-6 rounded-wf-sm bg-amber-100/60 dark:bg-amber-900/40 flex items-center justify-center text-xs shrink-0 border border-amber-200 dark:border-amber-800 group-hover:scale-105 transition-transform">
                <component :is="item.iconComponent" v-if="item.iconComponent" class="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span v-else class="text-xs">{{ item.iconEmoji || '🗓️' }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-bold text-wf-text-primary truncate" :title="item.title">{{ item.title }}</p>
                <p class="text-[9px] text-wf-text-secondary truncate" :title="item.subtitle">{{ item.subtitle }}</p>
              </div>
            </div>

            <!-- Footer Horizon & Value -->
            <div class="pt-1.5 border-t border-amber-200/60 dark:border-amber-900/40 mt-1 flex items-center justify-between text-[10px]">
              <span class="text-[8px] font-bold truncate max-w-[80px]" :class="item.horizonClass">
                {{ item.horizonLabel }}
              </span>
              <span
                v-if="item.amount !== undefined"
                class="font-bold tabular-nums text-[11px] text-amber-600 dark:text-amber-400 shrink-0"
              >
                {{ formatAmount(Math.abs(item.amount)) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER ACTION BAR -->
      <div class="flex items-center justify-between pt-2 border-t border-wf-border-subtle text-[10px] text-wf-text-muted">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
            <span>Past History</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
            <span>Now / Today</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            <span>Upcoming Due</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <router-link to="/transactions" class="font-bold text-wf-primary hover:underline flex items-center gap-1">
            <span>All Transactions</span>
            <ArrowRight class="w-3 h-3" />
          </router-link>
          <router-link to="/insights?tab=1" class="font-bold text-wf-primary hover:underline flex items-center gap-1">
            <span>All Bills</span>
            <ArrowRight class="w-3 h-3" />
          </router-link>
        </div>
      </div>
    </div>
  </WfCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import {
  Clock3,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Zap,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Sparkles,
  LocateFixed
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
  transactions: any[]
  activities: any[]
  upcomingBills: any[]
  categories?: any[]
}>()

const { formatAmount } = useCurrency()
const scrollContainer = ref<HTMLElement | null>(null)
const todayNodeRef = ref<HTMLElement | null>(null)

type FilterType = 'all' | 'transactions' | 'pulse' | 'bills'
const activeFilter = ref<FilterType>('all')

const todayFormatted = computed(() => {
  return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})

function scrollTimeline(offset: number) {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: offset, behavior: 'smooth' })
  }
}

function scrollToNow() {
  if (todayNodeRef.value && scrollContainer.value) {
    const containerWidth = scrollContainer.value.clientWidth
    const nodeOffsetLeft = todayNodeRef.value.offsetLeft
    const nodeWidth = todayNodeRef.value.clientWidth
    const targetScroll = nodeOffsetLeft - (containerWidth / 2) + (nodeWidth / 2)
    scrollContainer.value.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
  }
}

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      scrollToNow()
    }, 200)
  })
})

function cleanOwnerName(name?: string) {
  if (!name) return ''
  return name.replace(/(Test User\s*)+/gi, 'Test User').trim()
}

function cleanHash(str: string) {
  if (!str) return ''
  return str.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '')
    .replace(/[a-f0-9]{6,}/gi, '')
    .trim()
}

const filterTabs = computed(() => [
  { id: 'all' as FilterType, label: 'All', count: allNormalizedItems.value.length },
  { id: 'transactions' as FilterType, label: 'Transactions', count: props.transactions.length },
  { id: 'pulse' as FilterType, label: 'Family Pulse', count: props.activities.length },
  { id: 'bills' as FilterType, label: 'Upcoming Bills', count: props.upcomingBills.length }
])

const allNormalizedItems = computed(() => {
  const items: any[] = []
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const todayEnd = todayStart + 86400000

  // 1. Transactions (Past & Today)
  props.transactions.forEach(t => {
    const d = t.date ? new Date(t.date) : new Date()
    const time = d.getTime()
    const isToday = time >= todayStart && time <= todayEnd
    const isPast = time < todayStart
    const isIncome = t.amount > 0

    items.push({
      id: `txn-${t.id}`,
      kind: 'transaction',
      timestamp: time,
      isToday,
      isPast,
      isFuture: time > todayEnd,
      title: t.description || 'Transaction',
      subtitle: `${t.category || 'General'} • ${cleanOwnerName(t.account_owner_name) || cleanHash(t.account_name || 'Personal')}`,
      badge: isIncome ? 'Income' : 'Expense',
      dotClass: isIncome ? 'bg-emerald-500' : 'bg-rose-500',
      badgeClass: isIncome ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900/50',
      amount: t.amount,
      amountPrefix: isIncome ? '+' : '-',
      amountClass: isIncome ? 'text-wf-success' : 'text-wf-text-primary',
      horizonLabel: isToday ? 'Today' : 'Settled',
      horizonClass: isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-wf-text-muted',
      iconEmoji: t.category_icon || '💳',
      timeDisplay: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    })
  })

  // 2. Family Pulse Activities
  props.activities.forEach(a => {
    const d = a.created_at ? new Date(a.created_at) : new Date()
    const time = d.getTime()
    const isToday = time >= todayStart && time <= todayEnd
    const isPast = time < todayStart
    const alertType = (a.alert_type || a.type || 'INFO').toUpperCase()

    let iconComp = Zap
    let badgeClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50'
    let dotClass = 'bg-indigo-500'
    let badgeLabel = 'Pulse'

    if (alertType.includes('BUDGET') || alertType.includes('ALERT')) {
      iconComp = AlertTriangle
      badgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
      dotClass = 'bg-rose-500'
      badgeLabel = 'Budget Alert'
    } else if (alertType.includes('ACCOUNT') || alertType.includes('CARD')) {
      iconComp = CreditCard
      badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
      dotClass = 'bg-emerald-500'
      badgeLabel = 'Account Link'
    } else if (alertType.includes('SYNC')) {
      iconComp = RefreshCw
      badgeClass = 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border-sky-200 dark:border-sky-900/50'
      dotClass = 'bg-sky-500'
      badgeLabel = 'Sync Event'
    }

    items.push({
      id: `act-${a.id}`,
      kind: 'pulse',
      timestamp: time,
      isToday,
      isPast,
      isFuture: time > todayEnd,
      title: cleanHash(a.title || 'Family Notification'),
      subtitle: cleanHash(a.message || 'Audit event update'),
      badge: badgeLabel,
      dotClass,
      badgeClass,
      amount: undefined,
      horizonLabel: isToday ? 'Today' : 'Event Log',
      horizonClass: 'text-indigo-600 dark:text-indigo-400 font-semibold',
      iconComponent: iconComp,
      timeDisplay: formatRelativeTime(d)
    })
  })

  // 3. Upcoming Bills (Future Horizon)
  props.upcomingBills.forEach(b => {
    const rawDate = b.next_run_date || b.next_date
    const d = rawDate ? new Date(rawDate) : new Date()
    const time = d.getTime()
    const daysLeft = b.days_left !== undefined ? b.days_left : Math.ceil((time - Date.now()) / (1000 * 60 * 60 * 24))

    items.push({
      id: `bill-${b.id}`,
      kind: 'bill',
      timestamp: time,
      isToday: daysLeft <= 0,
      isPast: false,
      isFuture: true,
      title: b.description || b.name || 'Subscription',
      subtitle: `${b.category || 'Recurring'} • Auto-renewal`,
      badge: 'Upcoming Due',
      dotClass: daysLeft <= 3 ? 'bg-rose-500' : 'bg-amber-500',
      badgeClass: daysLeft <= 3 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
      amount: b.amount,
      amountPrefix: '',
      amountClass: 'text-amber-600 dark:text-amber-400',
      horizonLabel: daysLeft <= 0 ? 'Due Today' : `Due in ${daysLeft}d`,
      horizonClass: daysLeft <= 3 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-semibold',
      iconEmoji: '🗓️',
      timeDisplay: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    })
  })

  return items
})

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return allNormalizedItems.value
  return allNormalizedItems.value.filter(item => {
    if (activeFilter.value === 'transactions') return item.kind === 'transaction'
    if (activeFilter.value === 'pulse') return item.kind === 'pulse'
    if (activeFilter.value === 'bills') return item.kind === 'bill'
    return true
  })
})

// Past items: arranged from oldest to newest (so as you scroll right, time advances towards today)
const pastItems = computed(() => {
  return filteredItems.value
    .filter(item => item.isPast || (item.kind !== 'bill' && !item.isToday))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-8) // Take latest 8 past items
})

// Today items count
const todayItemCount = computed(() => {
  return filteredItems.value.filter(item => item.isToday).length
})

// Future items: arranged from closest to furthest future date
const futureItems = computed(() => {
  return filteredItems.value
    .filter(item => item.isFuture || item.kind === 'bill')
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 8) // Take next 8 upcoming bills
})

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
</script>
