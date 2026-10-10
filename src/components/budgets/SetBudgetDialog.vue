<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, RefreshCw, Lightbulb } from 'lucide-vue-next'
import { financeApi } from '@/api/client'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

const props = defineProps<{
  modelValue: boolean
  newBudget: any
  categories: any[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'save'): void
  (e: 'close'): void
}>()

const isEditing = computed(() => !!props.newBudget.category && props.newBudget.category !== 'OVERALL')

const categoryOptions = computed(() => {
  return props.categories.map(c => ({
    label: `${c.icon || '🏷️'} ${c.name}`,
    value: c.name,
    icon: c.icon
  }))
})

// Smart Suggestion State
type BudgetSuggestion = {
    recommended_amount: number;
    rationale: string;
}

const isGeneratingSuggestion = ref(false)
const budgetSuggestion = ref<BudgetSuggestion | null>(null)
const suggestionCache = ref<Map<string, BudgetSuggestion>>(new Map())

function onCategoryChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const val = target.value
  props.newBudget.category = val
  const cat = props.categories.find(c => c.name === val)
  if (cat) {
    props.newBudget.icon = cat.icon
  }
  generateRecommendation(false)
}

async function generateRecommendation(forceRefresh = false) {
    const category = props.newBudget.category
    if (!category || category === 'OVERALL') {
        budgetSuggestion.value = null
        return
    }

    if (!forceRefresh && suggestionCache.value.has(category)) {
        budgetSuggestion.value = suggestionCache.value.get(category)!
        return
    }

    isGeneratingSuggestion.value = true
    budgetSuggestion.value = null
    
    try {
        const res = await financeApi.getBudgetRecommendation(category, forceRefresh)
        if (res.data && res.data.recommended_amount) {
            const data = res.data as BudgetSuggestion
            budgetSuggestion.value = data
            suggestionCache.value.set(category, data)
        }
    } catch (err: any) {
        console.error('Budget Recommendation failed:', err)
    } finally {
        isGeneratingSuggestion.value = false
    }
}

function applySuggestion() {
    if (budgetSuggestion.value) {
        props.newBudget.amount_limit = budgetSuggestion.value.recommended_amount
    }
}

function refreshSuggestion() {
    generateRecommendation(true)
}

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        generateRecommendation(false)
    } else {
        suggestionCache.value.clear()
        budgetSuggestion.value = null
    }
})

function handleClose() {
    emit('update:modelValue', false)
    emit('close')
}
</script>

<template>
  <WfModal
    :model-value="modelValue"
    @update:model-value="handleClose"
    maxWidth="sm"
  >
    <!-- Header -->
    <template #header>
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
          <span>{{ newBudget.icon || '🎯' }}</span>
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary leading-none">
            {{ isEditing ? 'Edit Category Budget' : (newBudget.category === 'OVERALL' ? 'Set Monthly Overall Limit' : 'Set Category Budget') }}
          </h3>
          <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
            {{ newBudget.category === 'OVERALL' ? 'Global spending cap for the family' : 'Define monthly spending ceiling for classification' }}
          </p>
        </div>
      </div>
    </template>

    <!-- Body Form -->
    <form @submit.prevent="emit('save')" class="space-y-4">
      <!-- Target Category Selector (Only for New) -->
      <div v-if="!isEditing && newBudget.category !== 'OVERALL'" class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Target Category</label>
        <div class="flex items-center h-9 px-3 rounded-wf-sm bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
          <select
            :value="newBudget.category"
            @change="onCategoryChange"
            class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none cursor-pointer"
          >
            <option value="" disabled selected>Choose a category...</option>
            <option v-for="c in categoryOptions" :key="c.value" :value="c.value">
              {{ c.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Limit Input Section -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">Monthly Limit (₹)</label>
          <div v-if="isGeneratingSuggestion" class="flex items-center gap-1 text-[10px] text-wf-primary">
            <RefreshCw class="w-3 h-3 animate-spin" />
            <span>Calculating...</span>
          </div>
        </div>

        <div class="relative flex items-center h-11 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
          <span class="text-base font-black text-wf-text-muted mr-2">₹</span>
          <input
            v-model.number="newBudget.amount_limit"
            type="number"
            min="0"
            step="100"
            placeholder="0.00"
            class="w-full bg-transparent text-base font-black text-wf-text-primary focus:outline-none"
            autofocus
          />
        </div>
      </div>

      <!-- Historical AI Suggestion Pill -->
      <div v-if="budgetSuggestion || isGeneratingSuggestion" class="pt-1">
        <div
          v-if="isGeneratingSuggestion"
          class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle flex items-center gap-2 text-xs text-wf-text-muted animate-pulse"
        >
          <RefreshCw class="w-3.5 h-3.5 animate-spin text-wf-primary" />
          <span>Calculating intelligent recommendation from history...</span>
        </div>

        <div
          v-else-if="budgetSuggestion"
          @click="applySuggestion"
          class="p-3 rounded-wf-md bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors shadow-2xs space-y-1"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-[10px] font-bold text-wf-primary uppercase tracking-wider">
              <Lightbulb class="w-3.5 h-3.5" />
              <span>Suggested Limit</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-black text-wf-primary">₹{{ budgetSuggestion.recommended_amount.toLocaleString() }}</span>
              <button
                type="button"
                @click.stop="refreshSuggestion"
                class="p-0.5 rounded-wf-xs text-wf-text-muted hover:text-wf-primary"
                title="Recalculate"
              >
                <RefreshCw class="w-3 h-3" :class="isGeneratingSuggestion ? 'animate-spin' : ''" />
              </button>
            </div>
          </div>
          <p class="text-[11px] text-wf-text-secondary truncate">
            {{ budgetSuggestion.rationale }}
          </p>
          <span class="text-[10px] font-bold text-wf-primary block pt-0.5">
            Click to apply suggested limit
          </span>
        </div>
      </div>
    </form>

    <!-- Footer Actions -->
    <template #footer>
      <WfButton variant="ghost" @click="handleClose">
        Cancel
      </WfButton>
      <WfButton variant="primary" @click="emit('save')">
        <Check class="w-3.5 h-3.5 mr-1" />
        <span>Save Budget</span>
      </WfButton>
    </template>
  </WfModal>
</template>
