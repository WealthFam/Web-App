<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import {
  Calendar,
  Timer,
  Plus,
  TrendingUp,
  Building2,
  Activity,
  MoreVertical,
  Pencil,
  Trash2,
  X
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
  goal: any
}>()

const emit = defineEmits<{
  (e: 'edit', goal: any): void
  (e: 'delete', goalId: string): void
  (e: 'linkAsset', goalId: string): void
  (e: 'removeAsset', assetId: string): void
  (e: 'unlinkHolding', goalId: string, holdingId: string): void
}>()

const { formatAmount } = useCurrency()

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenuOnClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenuOnClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnClickOutside)
})

function getDaysRemaining(dateStr: string) {
  if (!dateStr) return null
  const targetDate = new Date(dateStr)
  const today = new Date()
  const diff = targetDate.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDaysRemaining(dateStr: string) {
  const days = getDaysRemaining(dateStr)
  if (days === null) return 'No target'
  if (days < 0) return 'Overdue'
  if (days < 30) return `${days} days left`
  if (days < 365) return `${Math.floor(days / 30)} months left`
  return `${(days / 365).toFixed(1)} years left`
}

const progressPercentage = computed(() => {
  return Math.max(0, Math.min(100, Math.round(props.goal.progress_percentage || 0)))
})

const hasAssets = computed(() => {
  return (props.goal.assets && props.goal.assets.length > 0) ||
         (props.goal.holdings && props.goal.holdings.length > 0)
})
</script>

<template>
  <WfCard
    variant="flat"
    padding="none"
    radius="lg"
    class="relative flex flex-col justify-between overflow-hidden group hover:border-wf-border transition-all duration-200 shadow-2xs"
  >
    <!-- Background Gradient Glow Based on Goal Color -->
    <div
      class="absolute -top-12 -right-12 w-36 h-36 rounded-full opacity-10 blur-2xl pointer-events-none"
      :style="{ backgroundColor: goal.color || 'var(--wf-color-primary)' }"
    ></div>

    <div class="p-5 space-y-4">
      <!-- Top Row: Icon + Menu -->
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-wf-lg flex items-center justify-center text-xl shadow-2xs border"
            :style="{
              backgroundColor: `${goal.color || '#6366F1'}15`,
              borderColor: `${goal.color || '#6366F1'}30`
            }"
          >
            <span>{{ goal.icon || '🎯' }}</span>
          </div>

          <div class="space-y-0.5">
            <h3 class="text-sm font-bold text-wf-text-primary truncate max-w-[180px] sm:max-w-[220px]" :title="goal.name">
              {{ goal.name }}
            </h3>
            <div class="flex items-center gap-2 text-[11px] text-wf-text-muted">
              <div class="flex items-center gap-1 font-medium">
                <Calendar class="w-3 h-3 text-wf-text-muted" />
                <span>{{ goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'No Target Date' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Menu Action Dropdown -->
        <div class="relative" ref="menuRef">
          <button
            type="button"
            @click.stop="toggleMenu"
            class="p-1.5 rounded-wf-sm text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
          >
            <MoreVertical class="w-4 h-4" />
          </button>

          <!-- Dropdown Popup -->
          <div
            v-if="menuOpen"
            class="absolute right-0 top-full mt-1 w-36 bg-wf-surface border border-wf-border rounded-wf-md shadow-wf-modal py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              @click="emit('edit', goal); menuOpen = false"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-wf-text-primary hover:bg-wf-surface-variant text-left transition-colors"
            >
              <Pencil class="w-3.5 h-3.5 text-wf-text-muted" />
              <span>Edit Goal</span>
            </button>
            <button
              type="button"
              @click="emit('delete', goal.id); menuOpen = false"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 text-left transition-colors"
            >
              <Trash2 class="w-3.5 h-3.5 text-rose-500" />
              <span>Delete Goal</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Days Remaining Pill Tag -->
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-pill text-[10px] font-bold border"
          :style="{
            backgroundColor: `${goal.color || '#6366F1'}15`,
            borderColor: `${goal.color || '#6366F1'}40`,
            color: goal.color || 'var(--wf-color-primary)'
          }"
        >
          <Timer class="w-3 h-3" />
          {{ formatDaysRemaining(goal.target_date) }}
        </span>
      </div>

      <!-- Financial Metrics & Progress -->
      <div class="space-y-2 pt-1">
        <div class="flex items-end justify-between">
          <div>
            <div class="text-lg font-black text-wf-text-primary font-mono leading-none">
              {{ formatAmount(goal.current_amount) }}
            </div>
            <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block mt-1">
              OF {{ formatAmount(goal.target_amount) }} TARGET
            </span>
          </div>

          <div class="text-right">
            <div
              class="text-base font-black font-mono leading-none"
              :style="{ color: goal.color || 'var(--wf-color-primary)' }"
            >
              {{ Math.round(goal.progress_percentage || 0) }}%
            </div>
            <div
              v-if="goal.day_change && goal.day_change !== 0"
              class="text-[10px] font-bold font-mono mt-1"
              :class="goal.day_change >= 0 ? 'text-emerald-500' : 'text-rose-500'"
            >
              {{ goal.day_change >= 0 ? '+' : '' }}{{ formatAmount(goal.day_change) }}
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-wf-surface-variant rounded-wf-pill h-2 overflow-hidden">
          <div
            class="h-full rounded-wf-pill transition-all duration-500"
            :style="{
              width: `${progressPercentage}%`,
              backgroundColor: goal.color || 'var(--wf-color-primary)'
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Linked Assets Container (Seamless List Drawer) -->
    <div class="border-t border-wf-border-subtle bg-wf-surface-variant/30 flex-grow flex flex-col justify-between">
      <!-- Section Header -->
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-wf-border-subtle">
        <span class="text-[10px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Linked Assets
        </span>
        <button
          type="button"
          @click="emit('linkAsset', goal.id)"
          class="inline-flex items-center gap-1 text-[11px] font-bold text-wf-primary hover:text-indigo-600 transition-colors"
        >
          <Plus class="w-3 h-3" />
          <span>Link Asset</span>
        </button>
      </div>

      <!-- Assets Rows -->
      <div class="p-2 space-y-1 max-h-48 overflow-y-auto">
        <!-- Empty Assets State -->
        <div v-if="!hasAssets" class="py-4 text-center">
          <p class="text-[11px] text-wf-text-muted font-medium">No assets linked to this goal yet</p>
        </div>

        <template v-else>
          <!-- Mutual Funds (Holdings) -->
          <div
            v-for="h in (goal.holdings || [])"
            :key="`holding-${h.id}`"
            class="group/item flex items-center justify-between p-2 rounded-wf-sm bg-wf-surface border border-wf-border-subtle hover:border-wf-border transition-colors shadow-2xs"
          >
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-6 h-6 rounded-wf-xs bg-wf-primary-light text-wf-primary flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-900/50">
                <TrendingUp class="w-3 h-3" />
              </div>
              <div class="truncate">
                <p class="text-xs font-bold text-wf-text-primary truncate" :title="h.scheme_name">
                  {{ h.scheme_name }}
                </p>
                <div class="flex items-center gap-1.5 text-[10px] font-mono">
                  <span class="text-wf-text-secondary font-semibold">{{ formatAmount(h.current_value) }}</span>
                  <span
                    v-if="h.day_change_percentage"
                    class="font-bold"
                    :class="h.day_change >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                  >
                    {{ h.day_change >= 0 ? '▲' : '▼' }}{{ Math.abs(h.day_change_percentage).toFixed(1) }}%
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              @click="emit('unlinkHolding', goal.id, h.id)"
              class="p-1 rounded-wf-xs text-wf-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-60 group-hover/item:opacity-100 shrink-0"
              title="Unlink fund"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Bank & Manual Assets -->
          <div
            v-for="a in (goal.assets || [])"
            :key="`asset-${a.id}`"
            class="group/item flex items-center justify-between p-2 rounded-wf-sm bg-wf-surface border border-wf-border-subtle hover:border-wf-border transition-colors shadow-2xs"
          >
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div
                class="w-6 h-6 rounded-wf-xs flex items-center justify-center shrink-0 border"
                :class="a.type === 'BANK_ACCOUNT' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'"
              >
                <Building2 v-if="a.type === 'BANK_ACCOUNT'" class="w-3 h-3" />
                <Activity v-else class="w-3 h-3" />
              </div>
              <div class="truncate">
                <p class="text-xs font-bold text-wf-text-primary truncate" :title="a.display_name">
                  {{ a.display_name }}
                </p>
                <span class="text-[10px] font-mono text-wf-text-secondary font-semibold">
                  {{ formatAmount(a.current_value) }}
                </span>
              </div>
            </div>

            <button
              type="button"
              @click="emit('removeAsset', a.id)"
              class="p-1 rounded-wf-xs text-wf-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-60 group-hover/item:opacity-100 shrink-0"
              title="Remove asset"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>
      </div>
    </div>
  </WfCard>
</template>
