<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X, ArrowLeft, Check } from 'lucide-vue-next'
import { financeApi } from '@/api/client'

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

const show = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const isEditing = computed(() => !!props.newBudget.category && props.newBudget.category !== 'OVERALL')

const categoryOptions = computed(() => {
  return props.categories.map(c => ({
    label: `${c.icon} ${c.name}`,
    value: c.name,
    icon: c.icon
  }))
})

// AI Suggestion State
type AiSuggestion = {
    amount: number;
    title: string;
    reason: string;
    icon: string;
    color: string;
}

const isGeneratingAi = ref(false)
const aiSuggestion = ref<AiSuggestion | null>(null)
const aiError = ref<string | null>(null)

// Component-level cache: avoids repeated API calls for the same category
// within the same dialog session. Cleared when dialog closes.
const suggestionCache = ref<Map<string, AiSuggestion>>(new Map())

function onCategoryChange(val: string) {
  const cat = props.categories.find(c => c.name === val)
  if (cat) {
    props.newBudget.icon = cat.icon
  }
  generateAiRecommendation(false)
}

async function generateAiRecommendation(forceRefresh = false) {
    const category = props.newBudget.category
    if (!category) {
        aiSuggestion.value = null
        aiError.value = null
        return
    }

    // Check local in-memory cache first (skip API entirely unless forced)
    if (!forceRefresh && suggestionCache.value.has(category)) {
        aiSuggestion.value = suggestionCache.value.get(category)!
        aiError.value = null
        return
    }

    isGeneratingAi.value = true
    aiError.value = null
    aiSuggestion.value = null
    
    try {
        const res = await financeApi.getBudgetRecommendation(category, forceRefresh)
        if (res.data) {
            const data = res.data as AiSuggestion
            aiSuggestion.value = data
            suggestionCache.value.set(category, data)
        } else {
            aiError.value = 'AI Advisor is unavailable. Configure a valid API key or try again later.'
        }
    } catch (err: any) {
        console.error('AI Recommendation failed:', err)
        const status = err?.response?.status
        if (status === 429) {
            aiError.value = 'AI quota exceeded. Cached suggestions will appear once your quota resets.'
        } else if (status === 401 || status === 403) {
            aiError.value = 'Invalid API key. Please check your AI settings.'
        } else {
            aiError.value = 'AI Advisor is temporarily unavailable. Please try again later.'
        }
        // Never cache errors — next open should retry the real API
    } finally {
        isGeneratingAi.value = false
    }
}

function applyAiSuggestion() {
    if (aiSuggestion.value) {
        props.newBudget.amount_limit = aiSuggestion.value.amount
    }
}

function refreshAiSuggestion() {
    generateAiRecommendation(true)
}

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        generateAiRecommendation(false)
    } else {
        suggestionCache.value.clear()
        aiSuggestion.value = null
        aiError.value = null
    }
})
</script>

<template>
  <v-dialog v-model="show" max-width="440" transition="dialog-bottom-transition">
    <v-card class="m3-card overflow-hidden" rounded="xl" elevation="24">
      <!-- Compact Header -->
      <v-toolbar color="surface" flat class="px-2 border-b" height="64">
        <div class="d-flex align-center ga-3 pl-4">
            <v-avatar size="32" color="primary" variant="tonal" rounded="lg">
                <span class="text-subtitle-2">{{ newBudget.icon || '🏷️' }}</span>
            </v-avatar>
            <v-toolbar-title class="text-subtitle-1 font-weight-black letter-spacing-1">
                {{ isEditing ? 'Edit Budget' : 'Set Budget' }}
            </v-toolbar-title>
        </div>
        <v-spacer />
        <v-btn icon variant="text" size="small" @click="emit('close')" color="medium-emphasis">
          <X :size="18" />
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-5">
        <v-form @submit.prevent="emit('save')">
          
          <!-- Category Selector (Only for New) -->
          <div v-if="!isEditing" class="mb-5 px-1">
            <label class="text-tiny font-weight-black opacity-40 uppercase letter-spacing-1 d-block mb-1">Target Category</label>
            <v-select 
                v-model="newBudget.category" 
                :items="categoryOptions" 
                item-title="label"
                item-value="value" 
                variant="outlined" 
                rounded="lg"
                density="comfortable"
                placeholder="Choose category"
                class="category-select-compact"
                @update:model-value="onCategoryChange"
                hide-details
            />
          </div>

          <!-- Limit Input Section -->
          <div class="mb-5 px-1">
            <div class="d-flex align-center justify-space-between mb-1">
                <label class="text-tiny font-weight-black opacity-40 uppercase letter-spacing-1">Monthly Limit (₹)</label>
                <div v-if="isGeneratingAi" class="d-flex align-center ga-1">
                    <v-progress-circular indeterminate size="12" width="2" color="primary" />
                    <span class="text-tiny font-weight-bold opacity-40">AI Analysis...</span>
                </div>
            </div>
            
            <v-card variant="flat" class="pa-4 rounded-lg border bg-surface-variant-opacity d-flex align-center ga-3">
                <span class="text-h6 opacity-30 font-weight-black">₹</span>
                <v-text-field 
                    v-model="newBudget.amount_limit" 
                    type="number" 
                    variant="plain" 
                    placeholder="0.00" 
                    hide-details 
                    class="amount-field-compact font-weight-black"
                    autofocus
                />
            </v-card>
          </div>

          <!-- Compact AI Suggestion / Error -->
          <v-expand-transition>
            <div v-if="aiSuggestion || isGeneratingAi || aiError" class="mb-6">
                <!-- Loading state -->
                <v-card v-if="isGeneratingAi" class="insight-pill-compact pa-3 border rounded-lg" elevation="0">
                    <div class="d-flex align-center ga-2 pa-1">
                        <v-progress-circular indeterminate size="14" width="2" color="primary" />
                        <span class="text-tiny font-weight-bold opacity-50">AI Strategist analyzing…</span>
                    </div>
                </v-card>

                <!-- Error state -->
                <v-card v-else-if="aiError" class="insight-pill-error pa-3 border rounded-lg" elevation="0">
                    <div class="d-flex align-center ga-2">
                        <span class="text-body-1">⚠️</span>
                        <div class="flex-grow-1">
                            <div class="d-flex align-center justify-space-between">
                                <span class="text-tiny font-weight-black text-error uppercase letter-spacing-tight">AI Advisor Unavailable</span>
                                <v-btn icon variant="text" size="x-small" color="medium-emphasis" @click.stop="refreshAiSuggestion" title="Retry">
                                    <v-icon size="13">mdi-refresh</v-icon>
                                </v-btn>
                            </div>
                            <p class="text-tiny font-weight-medium opacity-60 mb-0">{{ aiError }}</p>
                        </div>
                    </div>
                </v-card>

                <!-- Success state -->
                <v-card 
                    v-else-if="aiSuggestion"
                    class="insight-pill-compact pa-3 border rounded-lg cursor-pointer" 
                    @click="applyAiSuggestion"
                    elevation="0"
                >
                    <div class="d-flex align-center">
                        <span class="mr-3 text-h6">{{ aiSuggestion.icon }}</span>
                        <div class="flex-grow-1 overflow-hidden">
                            <div class="d-flex align-center justify-space-between mb-0.5">
                                <span class="text-tiny font-weight-black text-primary uppercase letter-spacing-tight">{{ aiSuggestion.title }}</span>
                                <div class="d-flex align-center ga-1">
                                    <span class="text-caption font-weight-black">₹{{ aiSuggestion.amount.toLocaleString() }}</span>
                                    <v-btn icon variant="text" size="x-small" :loading="isGeneratingAi" color="medium-emphasis" @click.stop="refreshAiSuggestion" title="Refresh AI recommendation">
                                        <v-icon size="13">mdi-refresh</v-icon>
                                    </v-btn>
                                </div>
                            </div>
                            <p class="text-tiny font-weight-medium opacity-60 mb-0 text-truncate">
                                {{ aiSuggestion.reason }}
                            </p>
                        </div>
                    </div>
                </v-card>

                <div v-if="aiSuggestion && !isGeneratingAi" class="text-center mt-1">
                    <span class="text-tiny font-weight-bold text-primary opacity-40">Tap to apply · ↻ for fresh analysis</span>
                </div>
            </div>
          </v-expand-transition>

          <!-- Footer Actions (Standardized with Icons) -->
          <div class="d-flex ga-3">
            <v-btn 
              variant="tonal" 
              rounded="pill" 
              height="44"
              class="text-none flex-grow-1 font-weight-bold" 
              @click="emit('close')"
            >
              <template v-slot:prepend>
                <ArrowLeft :size="16" />
              </template>
              Cancel
            </v-btn>
            <v-btn 
              color="primary" 
              rounded="pill" 
              height="44"
              class="text-none flex-grow-2 font-weight-black elevation-4" 
              type="submit"
            >
              <template v-slot:prepend>
                <Check :size="16" />
              </template>
              Save Budget
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.m3-card {
    background: rgb(var(--v-theme-surface)) !important;
    border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.bg-surface-variant-opacity {
    background: rgba(var(--v-theme-on-surface), 0.03);
}

.amount-field-compact :deep(input) {
    font-size: 1.5rem !important;
    height: 2rem !important;
    padding: 0 !important;
    color: rgb(var(--v-theme-on-surface)) !important;
}

.category-select-compact :deep(.v-field) {
    border-radius: 8px !important;
}

.insight-pill-compact {
    background: rgba(var(--v-theme-primary), 0.03);
    border-color: rgba(var(--v-theme-primary), 0.1) !important;
    transition: all 0.2s;
}

.insight-pill-compact:hover {
    background: rgba(var(--v-theme-primary), 0.08);
    border-color: rgba(var(--v-theme-primary), 0.3) !important;
}

.insight-pill-error {
    background: rgba(var(--v-theme-error), 0.04);
    border-color: rgba(var(--v-theme-error), 0.15) !important;
}

.line-height-1 { line-height: 1; }
.letter-spacing-1 { letter-spacing: 0.05em !important; }
.text-tiny { font-size: 0.65rem !important; }

.uppercase { text-transform: uppercase; }
.letter-spacing-tight { letter-spacing: -0.02em !important; }
</style>
