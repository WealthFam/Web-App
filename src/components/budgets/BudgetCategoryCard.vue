<script setup lang="ts">
import { computed } from 'vue'
import { Flame, Pencil, PieChart, Plus } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'
import WfCard from '@/components/ui/WfCard.vue'

const props = defineProps<{
  group: any
  activeTab: 'expense' | 'income' | 'investment'
  isInactive?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', budget: any): void
  (e: 'open-details', category: string, budget: any): void
}>()

const { formatAmount } = useCurrency()

const iconColor = computed(() => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
  const str = props.group.parent.category || 'default'
  const hash = str.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
})

function formatCategoryName(name: string) {
  if (!name) return 'Uncategorized'
  return name.replace(/_[a-f0-9]{8}$/i, '')
}
</script>

<template>
  <WfCard
    class="p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-wf-card-hover border-wf-border relative group/card"
    :class="isInactive ? 'opacity-70 bg-wf-surface-variant/30' : ''"
  >
    <div class="space-y-4">
      <!-- Card Header -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-10 h-10 rounded-wf-md flex items-center justify-center text-xl shrink-0 shadow-2xs border border-wf-border/70"
            :style="{ backgroundColor: iconColor + '15', borderColor: iconColor + '30' }"
          >
            <span>{{ group.parent.icon || '🏷️' }}</span>
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-wf-text-primary truncate">
              {{ formatCategoryName(group.parent.category) }}
            </h3>
            <span
              v-if="isInactive"
              class="px-1.5 py-0.2 rounded-wf-pill text-[9px] font-semibold bg-wf-surface-variant text-wf-text-muted"
            >
              No Activity
            </span>
            <span
              v-else
              class="px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold bg-wf-primary-light text-wf-primary"
            >
              {{ group.children.length }} Subcategories
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            @click="emit('open-details', group.parent.category, group.parent)"
            class="p-1 rounded-wf-sm text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
            title="View Analytics"
          >
            <PieChart class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            @click="emit('edit', group.parent)"
            class="p-1 rounded-wf-sm text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
            title="Edit Budget"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Active Metrics -->
      <template v-if="!isInactive">
        <div
          @click="emit('open-details', group.parent.category, group.parent)"
          class="p-3 rounded-wf-md bg-wf-surface-variant/50 border border-wf-border-subtle cursor-pointer hover:bg-wf-surface-variant/80 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">
                {{ activeTab === 'income' ? 'RECEIVED' : (activeTab === 'investment' ? 'INVESTED' : 'SPENT') }}
              </span>
              <span
                class="text-sm font-bold tracking-tight"
                :class="activeTab === 'investment' ? 'text-amber-600 dark:text-amber-400' : (activeTab === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-wf-text-primary')"
              >
                {{ formatAmount(activeTab === 'income' ? group.parent.income : group.parent.spent) }}
              </span>
            </div>

            <div class="text-right">
              <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">
                {{ group.parent.remaining < 0 ? 'OVERSPENT' : 'REMAINING' }}
              </span>
              <span
                class="text-sm font-bold tracking-tight"
                :class="group.parent.remaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
              >
                {{ group.parent.remaining < 0 ? '-' : '' }}{{ formatAmount(Math.abs(group.parent.remaining)) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Linear Progress Bar -->
        <div v-if="group.parent.amount_limit" class="space-y-1.5">
          <div class="relative">
            <div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-wf-pill overflow-hidden">
              <div
                class="h-full rounded-wf-pill transition-all duration-300"
                :class="group.parent.percentage > 90 ? 'bg-rose-500' : group.parent.percentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'"
                :style="{ width: `${Math.max(0, Math.min(group.parent.percentage, 100))}%` }"
              ></div>
            </div>

            <!-- Flame overspent indicator -->
            <div
              v-if="group.parent.percentage > 100"
              class="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center z-10 shadow-xs"
            >
              <Flame class="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          <div
            class="flex items-center justify-between text-[10px] font-bold"
            :class="group.parent.percentage > 100 ? 'text-rose-600' : 'text-wf-text-secondary'"
          >
            <span>{{ group.parent.percentage.toFixed(0) }}% OF LIMIT</span>
            <span>{{ formatAmount(group.parent.amount_limit) }}</span>
          </div>
        </div>

        <!-- Subcategories List -->
        <div v-if="group.children.length > 0" class="space-y-1 pt-1 border-t border-wf-border-subtle">
          <div class="flex items-center justify-between px-1 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider mb-1.5">
            <span>Breakdown</span>
            <span>{{ group.children.length }} items</span>
          </div>

          <div class="space-y-1 max-h-40 overflow-y-auto pr-1">
            <div
              v-for="child in group.children"
              :key="child.category"
              @click.stop="emit('open-details', child.category, child)"
              class="flex items-center justify-between px-2.5 py-1.5 rounded-wf-sm bg-wf-surface-variant/40 hover:bg-wf-surface-variant border border-wf-border-subtle cursor-pointer transition-colors text-xs"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs shrink-0">{{ child.icon || '🏷️' }}</span>
                <span class="text-[11px] font-semibold text-wf-text-primary truncate max-w-[100px]">
                  {{ formatCategoryName(child.category) }}
                </span>
              </div>

              <div class="flex items-center gap-1.5 shrink-0 ml-2">
                <span
                  class="text-[11px] font-bold tabular-nums"
                  :class="child.percentage > 100 ? 'text-rose-600' : 'text-wf-text-primary'"
                >
                  {{ formatAmount(activeTab === 'income' ? child.income : child.spent) }}
                </span>

                <span v-if="child.amount_limit" class="text-[10px] text-wf-text-muted">
                  / {{ formatAmount(child.amount_limit) }}
                </span>

                <button
                  type="button"
                  @click.stop="emit('edit', child)"
                  class="px-1.5 py-0.5 rounded-wf-xs text-[10px] font-bold bg-wf-primary-light text-wf-primary hover:bg-wf-primary hover:text-white transition-colors ml-1"
                >
                  {{ child.amount_limit ? 'Edit' : 'Set' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Inactive Category Action -->
      <template v-else>
        <div class="py-4 text-center">
          <button
            type="button"
            @click="emit('edit', group.parent)"
            class="px-4 py-1.5 rounded-wf-sm text-xs font-bold bg-wf-surface-variant text-wf-text-primary hover:bg-wf-primary hover:text-white border border-wf-border transition-colors inline-flex items-center gap-1.5"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Set Limit</span>
          </button>
        </div>
      </template>
    </div>
  </WfCard>
</template>
