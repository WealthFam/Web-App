<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Activity,
  Building2,
  TrendingUp,
  Check,
  Search,
  Plus
} from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

const props = defineProps<{
  modelValue: boolean
  assetForm: {
    type: string
    name: string
    manual_amount: number
    interest_rate: number
    linked_account_id: string | null
    holding_id: string | null
  }
  accountOptions: Array<{
    label: string
    value: string
    type?: string
  }>
  portfolioOptions: Array<{
    label: string
    value: string
  }>
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'save'): void
  (e: 'close'): void
}>()

const fundSearch = ref('')

const filteredPortfolioOptions = computed(() => {
  if (!fundSearch.value.trim()) return props.portfolioOptions
  const query = fundSearch.value.toLowerCase()
  return props.portfolioOptions.filter(f => f.label.toLowerCase().includes(query))
})

function handleClose() {
  fundSearch.value = ''
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
        <div class="w-9 h-9 rounded-wf-md bg-wf-primary-light text-wf-primary flex items-center justify-center border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
          <Plus class="w-4 h-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-wf-text-primary leading-none">
            Connect Asset to Goal
          </h3>
          <p class="text-[11px] text-wf-text-muted mt-0.5 leading-none">
            Back this milestone with mutual funds, savings accounts, or custom assets
          </p>
        </div>
      </div>
    </template>

    <!-- Body Content -->
    <form @submit.prevent="emit('save')" class="space-y-4">
      <!-- Asset Type Pill Selector -->
      <div class="space-y-1">
        <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
          Asset Category
        </label>
        <div class="grid grid-cols-3 gap-1.5 p-1 bg-wf-surface-variant/40 rounded-wf-md border border-wf-border-subtle">
          <button
            type="button"
            @click="assetForm.type = 'MANUAL'"
            class="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-wf-sm transition-all"
            :class="assetForm.type === 'MANUAL' ? 'bg-wf-surface text-wf-primary shadow-2xs border border-wf-border' : 'text-wf-text-muted hover:text-wf-text-primary'"
          >
            <Activity class="w-3.5 h-3.5" />
            <span>Manual</span>
          </button>

          <button
            type="button"
            @click="assetForm.type = 'BANK_ACCOUNT'"
            class="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-wf-sm transition-all"
            :class="assetForm.type === 'BANK_ACCOUNT' ? 'bg-wf-surface text-emerald-500 shadow-2xs border border-wf-border' : 'text-wf-text-muted hover:text-wf-text-primary'"
          >
            <Building2 class="w-3.5 h-3.5" />
            <span>Bank</span>
          </button>

          <button
            type="button"
            @click="assetForm.type = 'MUTUAL_FUND'"
            class="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-wf-sm transition-all"
            :class="assetForm.type === 'MUTUAL_FUND' ? 'bg-wf-surface text-indigo-500 shadow-2xs border border-wf-border' : 'text-wf-text-muted hover:text-wf-text-primary'"
          >
            <TrendingUp class="w-3.5 h-3.5" />
            <span>Fund</span>
          </button>
        </div>
      </div>

      <!-- Type: MANUAL -->
      <div v-if="assetForm.type === 'MANUAL'" class="space-y-3">
        <!-- Asset Name -->
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Asset Description
          </label>
          <input
            v-model="assetForm.name"
            type="text"
            placeholder="e.g. EPF, PPF, Physical Gold, Land Parcel"
            class="w-full h-10 px-3 bg-wf-surface text-xs font-semibold text-wf-text-primary border border-wf-border rounded-wf-md focus:border-wf-primary focus:outline-none shadow-2xs"
            required
          />
        </div>

        <!-- Value & Interest Rate -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Current Value -->
          <div class="space-y-1">
            <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
              Current Valuation (₹)
            </label>
            <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
              <span class="text-sm font-bold text-wf-text-muted mr-1.5">₹</span>
              <input
                v-model.number="assetForm.manual_amount"
                type="number"
                min="0"
                step="1000"
                placeholder="50,000"
                class="w-full bg-transparent text-sm font-bold text-wf-text-primary focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          <!-- Interest Rate -->
          <div class="space-y-1">
            <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
              Yield / Return (%)
            </label>
            <div class="relative flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
              <input
                v-model.number="assetForm.interest_rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="7.1"
                class="w-full bg-transparent text-sm font-bold text-wf-text-primary focus:outline-none font-mono"
              />
              <span class="text-xs font-bold text-wf-text-muted ml-1">%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Type: BANK_ACCOUNT -->
      <div v-else-if="assetForm.type === 'BANK_ACCOUNT'" class="space-y-3">
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Select Linked Bank Account
          </label>
          <div class="flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
            <select
              v-model="assetForm.linked_account_id"
              class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none cursor-pointer"
              required
            >
              <option :value="null" disabled>Choose a bank account...</option>
              <option
                v-for="acc in accountOptions"
                :key="acc.value"
                :value="acc.value"
              >
                {{ acc.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="accountOptions.length === 0" class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-wf-md text-xs text-amber-600 dark:text-amber-400 font-medium">
          No bank accounts found. Create one in Accounts first.
        </div>
      </div>

      <!-- Type: MUTUAL_FUND -->
      <div v-else class="space-y-3">
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-wf-text-secondary uppercase tracking-wider">
            Search & Select Mutual Fund
          </label>

          <!-- Search Filter Box -->
          <div class="relative flex items-center h-9 px-2.5 mb-2 rounded-wf-sm bg-wf-surface-variant/40 border border-wf-border-subtle focus-within:border-wf-primary">
            <Search class="w-3.5 h-3.5 text-wf-text-muted mr-2" />
            <input
              v-model="fundSearch"
              type="text"
              placeholder="Search scheme name or folio..."
              class="w-full bg-transparent text-xs text-wf-text-primary focus:outline-none"
            />
          </div>

          <!-- Fund Options Select / List -->
          <div class="flex items-center h-10 px-3 rounded-wf-md bg-wf-surface border border-wf-border focus-within:border-wf-primary shadow-2xs">
            <select
              v-model="assetForm.holding_id"
              class="w-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none cursor-pointer"
              required
            >
              <option :value="null" disabled>Choose a mutual fund holding...</option>
              <option
                v-for="fund in filteredPortfolioOptions"
                :key="fund.value"
                :value="fund.value"
              >
                {{ fund.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="portfolioOptions.length === 0" class="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-wf-md text-xs text-wf-primary font-medium">
          No mutual fund holdings found in your portfolio.
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
        <span>Link Asset</span>
      </WfButton>
    </template>
  </WfModal>
</template>
