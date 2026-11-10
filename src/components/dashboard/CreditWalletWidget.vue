<template>
  <WfCard variant="elevated" padding="md" radius="lg" class="w-full overflow-hidden">
    <div class="space-y-3">
      <!-- HEADER & CONTROLS -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-wf-border-subtle">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary shadow-2xs shrink-0">
            <CreditCard class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-xs font-bold text-wf-text-primary uppercase tracking-wider">Credit Wallet & Headroom</h3>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors"
                :class="utilizationClass"
              >
                {{ totalUtilization.toFixed(0) }}% Total Utilization
              </span>
              <span
                v-if="urgentDueCount > 0"
                class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1 animate-pulse"
              >
                <AlertCircle class="w-3 h-3" />
                {{ urgentDueCount }} Due Soon
              </span>
            </div>
            <p class="text-[11px] text-wf-text-muted">Real-time statement tracking, billing dates, and liquidity limits</p>
          </div>
        </div>

        <!-- RIGHT: Portfolio Quick Metrics & Navigation -->
        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <!-- Summary Ribbon -->
          <div class="h-8 flex items-center gap-2.5 text-[11px] bg-wf-surface-variant/70 px-2.5 rounded-wf-md border border-wf-border-subtle">
            <div class="flex flex-col justify-center">
              <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block leading-none">Limit</span>
              <span class="font-bold text-wf-text-primary tabular-nums leading-tight">{{ formatAmount(totalLimit) }}</span>
            </div>
            <div class="w-px h-4 bg-wf-border-subtle"></div>
            <div class="flex flex-col justify-center">
              <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block leading-none">Due</span>
              <span class="font-bold text-rose-600 dark:text-rose-400 tabular-nums leading-tight">{{ formatAmount(totalBalance) }}</span>
            </div>
            <div class="w-px h-4 bg-wf-border-subtle"></div>
            <div class="flex flex-col justify-center">
              <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider block leading-none">Available</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight">{{ formatAmount(totalAvailable) }}</span>
            </div>
          </div>

          <!-- View Mode Toggle -->
          <div class="h-8 flex items-center bg-wf-surface-variant p-0.5 rounded-wf-md border border-wf-border-subtle">
            <button
              type="button"
              class="h-full px-2 rounded-wf-sm transition-all flex items-center justify-center"
              :class="viewMode === 'cards' ? 'bg-wf-surface text-wf-primary shadow-2xs font-semibold' : 'text-wf-text-muted hover:text-wf-text-primary'"
              title="Card Deck View"
              @click="viewMode = 'cards'"
            >
              <LayoutGrid class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="h-full px-2 rounded-wf-sm transition-all flex items-center justify-center"
              :class="viewMode === 'table' ? 'bg-wf-surface text-wf-primary shadow-2xs font-semibold' : 'text-wf-text-muted hover:text-wf-text-primary'"
              title="Matrix Table View"
              @click="viewMode = 'table'"
            >
              <Table2 class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Scroll Chevrons (when in cards view) -->
          <div v-if="viewMode === 'cards'" class="hidden sm:flex items-center gap-1 h-8">
            <button
              type="button"
              class="h-8 w-8 rounded-wf-sm bg-wf-surface-variant text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface transition-colors border border-wf-border-subtle flex items-center justify-center"
              title="Scroll Left"
              @click="scrollCards(-240)"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="h-8 w-8 rounded-wf-sm bg-wf-surface-variant text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface transition-colors border border-wf-border-subtle flex items-center justify-center"
              title="Scroll Right"
              @click="scrollCards(240)"
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Manage Link -->
          <button
            type="button"
            class="h-8 px-2.5 text-[11px] font-semibold rounded-wf-sm bg-wf-surface border border-wf-border-subtle text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant transition-colors flex items-center justify-center gap-1 shrink-0"
            @click="router.push('/accounts')"
          >
            <span>Manage</span>
            <ArrowUpRight class="w-3 h-3 text-wf-text-muted" />
          </button>
        </div>
      </div>

      <!-- MAIN CONTENT AREA -->
      <!-- 1. HORIZONTALLY SCROLLABLE CARDS TRACK -->
      <div v-if="viewMode === 'cards'">
        <div
          v-if="cards && cards.length > 0"
          ref="scrollContainer"
          class="flex items-stretch gap-3 overflow-x-auto pb-2 pt-0.5 scrollbar-thin scroll-smooth"
        >
          <!-- Compact Mini Card Node -->
          <div
            v-for="card in cards"
            :key="card.id"
            class="w-[215px] sm:w-[230px] shrink-0 rounded-wf-lg border transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:shadow-md hover:-translate-y-0.5"
            :class="getCardTheme(card.bank || card.name).cardBorderClass"
          >
            <!-- Card Front Visual Background -->
            <div
              class="p-3 relative overflow-hidden flex flex-col justify-between"
              :class="getCardTheme(card.bank || card.name).gradientClass"
            >
              <!-- Decorative Subtle Glow Orb -->
              <div
                class="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-20 blur-xl pointer-events-none"
                :class="getCardTheme(card.bank || card.name).glowClass"
              ></div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 pointer-events-none"></div>

              <!-- Top Row: Bank Badge, Name, Chip & Due Badge -->
              <div class="relative z-10 flex items-start justify-between gap-2 mb-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <div class="w-6 h-6 rounded-wf-sm flex items-center justify-center border shadow-2xs shrink-0" :class="getCardTheme(card.bank || card.name).badgeClass">
                    <component :is="getBankBrand(card.bank || card.name).icon" class="w-3.5 h-3.5" />
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-[11px] font-bold text-white truncate tracking-wide leading-tight">
                      {{ card.name }}
                    </h4>
                    <span class="text-[9px] font-medium text-white/70 uppercase tracking-wider block">
                      {{ card.bank || 'Credit' }}
                    </span>
                  </div>
                </div>

                <!-- EMV Chip & Contactless Glyph -->
                <div class="flex items-center gap-1 shrink-0">
                  <div class="w-4.5 h-3.5 rounded-2xs bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/80 shadow-2xs flex items-center justify-center relative">
                    <div class="w-full h-px bg-amber-800/40 absolute top-1"></div>
                    <div class="h-full w-px bg-amber-800/40 absolute left-1.5"></div>
                  </div>
                </div>
              </div>

              <!-- Middle: Masked Number & Due Date Status -->
              <div class="relative z-10 flex items-center justify-between mb-2 text-white/80">
                <span class="font-mono text-[10px] tracking-widest text-white/90">
                  •••• {{ getCardMask(card) }}
                </span>

                <span
                  v-if="card.days_until_due !== undefined && card.days_until_due <= 5"
                  class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-500 text-white shadow-2xs uppercase tracking-wider"
                >
                  Due {{ card.days_until_due <= 0 ? 'Today' : `${card.days_until_due}d` }}
                </span>
                <span
                  v-else-if="card.due_date || card.next_due_date"
                  class="px-1.5 py-0.5 rounded text-[8px] font-medium bg-white/15 text-white/90 border border-white/20 backdrop-blur-2xs"
                >
                  Due {{ formatDueDate(card.next_due_date || card.due_date) }}
                </span>
              </div>

              <!-- Bottom Row: Statement Balance & Headroom Preview -->
              <div class="relative z-10 flex items-end justify-between text-white pt-0.5">
                <div>
                  <span class="text-[8px] font-bold uppercase tracking-wider text-white/70 block leading-none mb-0.5">Statement</span>
                  <div class="text-sm sm:text-base font-extrabold tabular-nums tracking-tight leading-tight">
                    {{ formatAmount(card.statement_balance || 0) }}
                  </div>
                </div>

                <div class="text-right">
                  <span class="text-[8px] font-bold uppercase tracking-wider text-white/70 block leading-none mb-0.5">Available</span>
                  <div class="text-xs font-bold text-emerald-300 tabular-nums leading-tight">
                    {{ formatAmount(Math.max(0, (card.credit_limit || 0) - (card.statement_balance || 0))) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Bottom Metrics Tray -->
            <div class="p-2.5 bg-wf-surface border-t border-wf-border-subtle flex flex-col justify-between gap-1.5">
              <!-- Limit Utilization Bar -->
              <div>
                <div class="flex items-center justify-between text-[9px] mb-1 font-medium text-wf-text-muted">
                  <span>Limit: {{ formatAmount(card.credit_limit || 0) }}</span>
                  <span
                    class="font-bold tabular-nums"
                    :class="getCardUtilization(card) > 30 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
                  >
                    {{ getCardUtilization(card) }}% used
                  </span>
                </div>

                <div class="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                  <!-- 30% Safety Threshold Marker -->
                  <div class="absolute top-0 bottom-0 left-[30%] w-0.5 bg-amber-400/80 z-10 pointer-events-none" title="30% Bureau Safe Line"></div>
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="getCardUtilization(card) > 40 ? 'bg-rose-500' : getCardUtilization(card) > 25 ? 'bg-amber-500' : 'bg-emerald-500'"
                    :style="{ width: `${Math.min(100, getCardUtilization(card))}%` }"
                  ></div>
                </div>
              </div>

              <!-- Unbilled Spend & Action -->
              <div class="pt-1.5 border-t border-wf-border-subtle/50 flex items-center justify-between text-[10px]">
                <div>
                  <span class="text-[8px] font-bold text-wf-text-muted uppercase tracking-wider block leading-none">Unbilled</span>
                  <span class="font-semibold text-wf-text-primary tabular-nums">
                    {{ formatAmount(card.unbilled_spend || card.current_cycle_spend || 0) }}
                  </span>
                </div>

                <button
                  type="button"
                  class="px-2 py-0.5 text-[10px] font-semibold rounded bg-wf-surface-variant hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 border border-wf-border-subtle text-wf-text-secondary transition-colors"
                  @click="router.push('/accounts')"
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="py-6 text-center text-xs text-wf-text-muted flex flex-col items-center justify-center bg-wf-surface rounded-wf-md border border-wf-border-subtle">
          <CreditCard class="w-8 h-8 text-wf-text-muted/40 mb-2 stroke-[1.5]" />
          <h4 class="text-xs font-bold text-wf-text-primary mb-0.5">No Active Credit Cards Linked</h4>
          <p class="text-[11px] text-wf-text-muted max-w-sm mb-2.5">Connect credit card accounts to automatically track statements, due dates, and limit headroom.</p>
          <button
            type="button"
            class="px-3 py-1 text-xs font-semibold rounded-wf-md bg-wf-primary text-white hover:bg-wf-primary-hover shadow-2xs transition-colors flex items-center gap-1.5"
            @click="router.push('/accounts')"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Add Credit Card</span>
          </button>
        </div>
      </div>

      <!-- 2. STATEMENT MATRIX / TABLE VIEW -->
      <div v-else-if="viewMode === 'table'" class="overflow-x-auto bg-wf-surface rounded-wf-md border border-wf-border-subtle">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/50 text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">
              <th class="py-2 px-3">Card & Bank</th>
              <th class="py-2 px-2.5">Statement Balance</th>
              <th class="py-2 px-2.5">Unbilled Spend</th>
              <th class="py-2 px-2.5">Available Limit</th>
              <th class="py-2 px-2.5">Total Limit</th>
              <th class="py-2 px-2.5">Utilization</th>
              <th class="py-2 px-2.5">Due Date</th>
              <th class="py-2 px-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-wf-border-subtle/70">
            <tr
              v-for="card in cards"
              :key="card.id"
              class="hover:bg-wf-surface-variant/40 transition-colors"
            >
              <!-- Card Name -->
              <td class="py-2.5 px-3">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-wf-sm flex items-center justify-center border shadow-2xs shrink-0" :class="getCardTheme(card.bank || card.name).badgeClass">
                    <component :is="getBankBrand(card.bank || card.name).icon" class="w-3 h-3" />
                  </div>
                  <div>
                    <span class="font-bold text-wf-text-primary block text-xs leading-tight">{{ card.name }}</span>
                    <span class="text-[9px] text-wf-text-muted font-mono">•••• {{ getCardMask(card) }}</span>
                  </div>
                </div>
              </td>

              <!-- Statement Balance -->
              <td class="py-2.5 px-2.5 font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {{ formatAmount(card.statement_balance || 0) }}
              </td>

              <!-- Unbilled -->
              <td class="py-2.5 px-2.5 font-semibold text-wf-text-primary tabular-nums">
                {{ formatAmount(card.unbilled_spend || card.current_cycle_spend || 0) }}
              </td>

              <!-- Available Limit -->
              <td class="py-2.5 px-2.5 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {{ formatAmount(Math.max(0, (card.credit_limit || 0) - (card.statement_balance || 0))) }}
              </td>

              <!-- Total Limit -->
              <td class="py-2.5 px-2.5 font-medium text-wf-text-muted tabular-nums">
                {{ formatAmount(card.credit_limit || 0) }}
              </td>

              <!-- Utilization % & bar -->
              <td class="py-2.5 px-2.5">
                <div class="w-20">
                  <div class="flex items-center justify-between text-[9px] font-bold mb-0.5">
                    <span :class="getCardUtilization(card) > 30 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
                      {{ getCardUtilization(card) }}%
                    </span>
                  </div>
                  <div class="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :class="getCardUtilization(card) > 40 ? 'bg-rose-500' : getCardUtilization(card) > 25 ? 'bg-amber-500' : 'bg-emerald-500'"
                      :style="{ width: `${Math.min(100, getCardUtilization(card))}%` }"
                    ></div>
                  </div>
                </div>
              </td>

              <!-- Due Date -->
              <td class="py-2.5 px-2.5">
                <span
                  v-if="card.days_until_due !== undefined && card.days_until_due <= 5"
                  class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 uppercase"
                >
                  Due in {{ card.days_until_due }}d
                </span>
                <span
                  v-else-if="card.due_date || card.next_due_date"
                  class="text-xs text-wf-text-secondary font-medium"
                >
                  {{ formatDueDate(card.next_due_date || card.due_date) }}
                </span>
                <span v-else class="text-xs text-emerald-600 font-semibold">Settled</span>
              </td>

              <!-- Actions -->
              <td class="py-2.5 px-2.5 text-right">
                <button
                  type="button"
                  class="px-2 py-0.5 text-[11px] font-semibold rounded bg-wf-surface-variant hover:bg-wf-surface-variant/80 text-wf-primary border border-wf-border-subtle transition-colors"
                  @click="router.push('/accounts')"
                >
                  Manage
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </WfCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  CreditCard,
  LayoutGrid,
  Table2,
  AlertCircle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import { useCurrency } from '@/composables/useCurrency'
import { useDashboardHelpers } from '@/composables/useDashboardHelpers'

const props = defineProps<{
  cards: any[]
}>()

const router = useRouter()
const { formatAmount } = useCurrency()
const { getBankBrand } = useDashboardHelpers()

const viewMode = ref<'cards' | 'table'>('cards')
const scrollContainer = ref<HTMLElement | null>(null)

function scrollCards(offset: number) {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: offset, behavior: 'smooth' })
  }
}

const totalLimit = computed(() => {
  return props.cards.reduce((acc, c) => acc + Number(c.credit_limit || 0), 0)
})

const totalBalance = computed(() => {
  return props.cards.reduce((acc, c) => acc + Number(c.statement_balance || 0), 0)
})

const totalAvailable = computed(() => {
  return Math.max(0, totalLimit.value - totalBalance.value)
})

const totalUtilization = computed(() => {
  if (totalLimit.value <= 0) return 0
  return (totalBalance.value / totalLimit.value) * 100
})

const urgentDueCount = computed(() => {
  return props.cards.filter(c => c.days_until_due !== undefined && c.days_until_due <= 5 && (c.statement_balance || 0) > 0).length
})

const utilizationClass = computed(() => {
  const u = totalUtilization.value
  if (u > 30) return 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
  if (u > 20) return 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
  return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
})

function getCardUtilization(card: any): number {
  if (!card.credit_limit || card.credit_limit <= 0) return 0
  return Math.round(((card.statement_balance || 0) / card.credit_limit) * 100)
}

function getCardMask(card: any): string {
  if (card.account_mask) return String(card.account_mask)
  if (card.mask) return String(card.mask)
  if (card.id) {
    const s = String(card.id)
    return s.slice(-4)
  }
  return '8821'
}

function formatDueDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getCardTheme(bankName: string) {
  const b = (bankName || '').toLowerCase()
  if (b.includes('hdfc')) {
    return {
      cardBorderClass: 'border-blue-300/80 dark:border-blue-900/60 shadow-blue-500/5',
      gradientClass: 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white',
      badgeClass: 'bg-white/10 text-blue-300 border-blue-400/30 backdrop-blur-xs',
      glowClass: 'bg-blue-400'
    }
  }
  if (b.includes('icici') || b.includes('amazon')) {
    return {
      cardBorderClass: 'border-amber-300/80 dark:border-amber-900/60 shadow-amber-500/5',
      gradientClass: 'bg-gradient-to-br from-stone-900 via-amber-950 to-orange-950 text-white',
      badgeClass: 'bg-white/10 text-amber-300 border-amber-400/30 backdrop-blur-xs',
      glowClass: 'bg-amber-400'
    }
  }
  if (b.includes('axis')) {
    return {
      cardBorderClass: 'border-rose-300/80 dark:border-rose-900/60 shadow-rose-500/5',
      gradientClass: 'bg-gradient-to-br from-slate-950 via-rose-950 to-red-950 text-white',
      badgeClass: 'bg-white/10 text-rose-300 border-rose-400/30 backdrop-blur-xs',
      glowClass: 'bg-rose-400'
    }
  }
  if (b.includes('sbi')) {
    return {
      cardBorderClass: 'border-sky-300/80 dark:border-sky-900/60 shadow-sky-500/5',
      gradientClass: 'bg-gradient-to-br from-slate-900 via-cyan-950 to-blue-950 text-white',
      badgeClass: 'bg-white/10 text-cyan-300 border-cyan-400/30 backdrop-blur-xs',
      glowClass: 'bg-cyan-400'
    }
  }
  if (b.includes('amex') || b.includes('american')) {
    return {
      cardBorderClass: 'border-slate-400/80 dark:border-slate-700/60 shadow-slate-500/5',
      gradientClass: 'bg-gradient-to-br from-neutral-800 via-slate-800 to-zinc-900 text-white',
      badgeClass: 'bg-white/10 text-slate-200 border-slate-300/30 backdrop-blur-xs',
      glowClass: 'bg-slate-300'
    }
  }
  // Default / Other
  return {
    cardBorderClass: 'border-indigo-300/80 dark:border-indigo-900/60 shadow-indigo-500/5',
    gradientClass: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white',
    badgeClass: 'bg-white/10 text-indigo-300 border-indigo-400/30 backdrop-blur-xs',
    glowClass: 'bg-indigo-400'
  }
}
</script>
