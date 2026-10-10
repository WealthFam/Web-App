<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

defineProps<{
  modelValue: boolean
  isEditing: boolean
  goalForm: {
    name: string
    target_amount: number
    target_date: string
    icon: string
    color: string
    owner_id: string | null
  }
  memberOptions: Array<{
    title: string
    value: string | null
    initials: string
  }>
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'save'): void
  (e: 'close'): void
}>()

const availableColors = [
  '#4f46e5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316'
]

const emojiSuggestions = ['🎯', '🏠', '🚗', '💍', '🎓', '✈️', '🏖️', '🚀', '💻', '👶', '💎', '🛡️']

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <WfModal
    :model-value="modelValue"
    @update:model-value="handleClose"
    maxWidth="md"
  >
    <!-- Header -->
    <template #header>
      <div class="flex items-center gap-2.5">
        <div
          class="w-9 h-9 rounded-wf-md flex items-center justify-center text-lg border shadow-2xs"
          :style="{
            backgroundColor: `${goalForm.color || '#6366F1'}15`,
            borderColor: `${goalForm.color || '#6366F1'}30`
          }"
        >
          <span>{{ goalForm.icon || '🎯' }}</span>
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary leading-none">
            {{ isEditing ? 'Edit Financial Goal' : 'Create New Financial Goal' }}
          </h3>
          <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
            {{ isEditing ? 'Adjust targets, milestones and asset alignment' : 'Define your roadmap, target date, and capital requirements' }}
          </p>
        </div>
      </div>
    </template>

    <!-- Body Form -->
    <form @submit.prevent="emit('save')" class="space-y-4">
      <!-- Icon & Name Row -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Icon & Goal Name
        </label>
        <div class="flex items-center gap-2">
          <!-- Emoji Input -->
          <div class="relative w-14 shrink-0">
            <input
              v-model="goalForm.icon"
              type="text"
              maxlength="4"
              class="w-full h-10 text-center text-xl bg-wf-surface border border-wf-border rounded-wf-md focus:border-wf-primary focus:outline-none shadow-2xs"
              placeholder="🎯"
            />
          </div>

          <!-- Name Input -->
          <div class="flex-grow">
            <input
              v-model="goalForm.name"
              type="text"
              placeholder="e.g. Dream House, Emergency Fund, College"
              class="w-full h-10 px-3 bg-wf-surface text-xs font-semibold text-wf-text-primary border border-wf-border rounded-wf-md focus:border-wf-primary focus:outline-none shadow-2xs placeholder:text-wf-text-muted/60"
              required
            />
          </div>
        </div>

        <!-- Quick Emoji Strip -->
        <div class="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
          <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider shrink-0 mr-1">Quick:</span>
          <button
            v-for="emoji in emojiSuggestions"
            :key="emoji"
            type="button"
            @click="goalForm.icon = emoji"
            class="w-6 h-6 rounded-wf-xs flex items-center justify-center text-sm hover:bg-wf-surface-variant hover:scale-110 transition-transform"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <!-- Target Amount & Date Row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Target Amount -->
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Target Amount (₹)
          </label>
          <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
            <span class="text-sm font-bold text-wf-text-muted mr-1.5">₹</span>
            <input
              v-model.number="goalForm.target_amount"
              type="number"
              min="1"
              step="1000"
              placeholder="1,000,000"
              class="w-full bg-transparent text-sm font-bold text-wf-text-primary focus:outline-none font-mono"
              required
            />
          </div>
        </div>

        <!-- Target Date -->
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Target Date
          </label>
          <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
            <input
              v-model="goalForm.target_date"
              type="date"
              class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Ownership Assignment -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Ownership & Responsibility
        </label>
        <div class="flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
          <select
            v-model="goalForm.owner_id"
            class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none cursor-pointer"
          >
            <option
              v-for="m in memberOptions"
              :key="m.value === null ? 'shared' : m.value"
              :value="m.value"
            >
              {{ m.title }}
            </option>
          </select>
        </div>
      </div>

      <!-- Theme Color Palette -->
      <div class="space-y-1.5 pt-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Theme Accent Color
        </label>
        <div class="flex items-center justify-between gap-2 p-2 bg-wf-surface-variant/40 rounded-wf-md border border-wf-border-subtle">
          <button
            v-for="c in availableColors"
            :key="c"
            type="button"
            @click="goalForm.color = c"
            class="w-7 h-7 rounded-full transition-transform duration-150 flex items-center justify-center relative hover:scale-110 shadow-2xs"
            :style="{ backgroundColor: c }"
          >
            <Check v-if="goalForm.color === c" class="w-3.5 h-3.5 text-white" />
            <span
              v-if="goalForm.color === c"
              class="absolute -inset-1 rounded-full border-2 border-wf-primary"
            ></span>
          </button>
        </div>
      </div>
    </form>

    <!-- Footer Actions -->
    <template #footer>
      <WfButton variant="ghost" @click="handleClose">
        Cancel
      </WfButton>
      <WfButton variant="primary" :loading="saving" @click="emit('save')">
        <Check class="w-3.5 h-3.5 mr-1" />
        <span>{{ isEditing ? 'Save Changes' : 'Create Goal' }}</span>
      </WfButton>
    </template>
  </WfModal>
</template>
