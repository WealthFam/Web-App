<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { CheckCircle, ArrowRight, Wallet, ArrowDownRight } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'
import WfModal from '@/components/ui/WfModal.vue'

const props = defineProps<{
    modelValue: boolean
    holding: any
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
    (e: 'success'): void
}>()

const notify = useNotificationStore()
const { formatAmount } = useCurrency()

const activeTab = ref<'amount' | 'units'>('amount')
const inputValue = ref<number | null>(null)
const isLoading = ref(false)
const showSuccess = ref(false)

const estimatedUnits = computed(() => {
    if (!inputValue.value || !props.holding?.last_nav) return 0
    if (activeTab.value === 'units') return inputValue.value
    return inputValue.value / Number(props.holding.last_nav)
})

const estimatedAmount = computed(() => {
    if (!inputValue.value || !props.holding?.last_nav) return 0
    if (activeTab.value === 'amount') return inputValue.value
    return inputValue.value * Number(props.holding.last_nav)
})

const isValid = computed(() => {
    if (!inputValue.value || inputValue.value <= 0) return false
    if (activeTab.value === 'units') {
        return inputValue.value <= (props.holding?.units || 0)
    } else {
        return inputValue.value <= (props.holding?.current_value || 0)
    }
})

async function handleSubmit() {
    if (!isValid.value) return
    isLoading.value = true
    try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        showSuccess.value = true
        setTimeout(() => {
            showSuccess.value = false
            emit('update:modelValue', false)
            emit('success')
            notify.success("Redemption request placed successfully!")
        }, 1200)
    } catch (e) {
        notify.error("Redemption failed. Please try again.")
    } finally {
        isLoading.value = false
    }
}

function handleClose() {
    if (!isLoading.value) emit('update:modelValue', false)
}

function setMax() {
    if (activeTab.value === 'units') {
        inputValue.value = props.holding?.units || 0
    } else {
        inputValue.value = props.holding?.current_value || 0
    }
}
</script>

<template>
    <WfModal
        :model-value="modelValue"
        @update:model-value="handleClose"
        :title="holding?.scheme_name ? `Redeem from ${holding.scheme_name}` : 'Redeem Holding'"
        description="Withdraw invested capital to your designated payout account"
        maxWidth="md"
    >
        <div class="relative space-y-4">
            <!-- Available Holdings Summary Tile -->
            <div class="p-3.5 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border grid grid-cols-2 gap-3">
                <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted flex items-center gap-1.5 mb-1">
                        <Wallet class="w-3.5 h-3.5 text-wf-primary" />
                        <span>Available Units</span>
                    </div>
                    <div class="font-mono font-bold text-sm text-wf-text-primary">
                        {{ Number(holding?.units || 0).toFixed(3) }}
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted mb-1">
                        Current Value
                    </div>
                    <div class="font-mono font-bold text-sm text-wf-primary">
                        {{ formatAmount(holding?.current_value) }}
                    </div>
                </div>
            </div>

            <!-- Mode Switcher -->
            <div class="grid grid-cols-2 p-1 rounded-wf-lg bg-wf-surface-variant border border-wf-border text-xs font-semibold">
                <button
                    type="button"
                    @click="activeTab = 'amount'"
                    class="py-2 px-3 rounded-wf-md transition-all text-center"
                    :class="activeTab === 'amount' ? 'bg-wf-primary text-white shadow-sm font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                >
                    Redeem by Amount (₹)
                </button>
                <button
                    type="button"
                    @click="activeTab = 'units'"
                    class="py-2 px-3 rounded-wf-md transition-all text-center"
                    :class="activeTab === 'units' ? 'bg-wf-primary text-white shadow-sm font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                >
                    Redeem by Units
                </button>
            </div>

            <!-- Input Container with MAX Button -->
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider block">
                        {{ activeTab === 'amount' ? 'Redemption Amount' : 'Redemption Units' }}
                    </label>
                    <button
                        type="button"
                        @click="setMax"
                        class="text-[11px] font-bold text-wf-primary hover:underline transition-all"
                    >
                        Redeem All (MAX)
                    </button>
                </div>

                <div class="relative">
                    <div v-if="activeTab === 'amount'" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <span class="text-base font-bold text-wf-text-muted">₹</span>
                    </div>
                    <input
                        v-model.number="inputValue"
                        type="number"
                        :step="activeTab === 'units' ? '0.001' : '100'"
                        :placeholder="activeTab === 'amount' ? 'Enter amount' : 'Enter units'"
                        class="w-full h-11 text-base font-bold rounded-wf-lg border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary font-mono transition-all"
                        :class="activeTab === 'amount' ? 'pl-8 pr-4' : 'px-4'"
                    />
                </div>
            </div>

            <!-- Conversion Projection Card -->
            <div class="p-3 rounded-wf-lg bg-wf-surface-variant/30 border border-wf-border flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-wf-text-muted">
                    <ArrowDownRight class="w-4 h-4 text-wf-primary" />
                    <span>Estimated {{ activeTab === 'amount' ? 'Units Deducted:' : 'Cash Value:' }}</span>
                </div>
                <div class="font-mono font-bold text-wf-text-primary">
                    {{ activeTab === 'amount' ? `${estimatedUnits.toFixed(3)} units` : formatAmount(estimatedAmount) }}
                </div>
            </div>

            <!-- Success Overlay -->
            <div v-if="showSuccess" class="absolute inset-0 bg-wf-surface/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 rounded-wf-xl animate-in fade-in duration-200">
                <div class="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-3">
                    <CheckCircle :size="32" />
                </div>
                <h4 class="text-base font-bold text-wf-text-primary">Redemption Submitted!</h4>
                <p class="text-xs text-wf-text-muted mt-1 max-w-xs">
                    Redemption request initiated. Proceeds will be credited per fund AMC turnaround time.
                </p>
            </div>
        </div>

        <template #footer>
            <button
                type="button"
                :disabled="isLoading"
                @click="handleClose"
                class="px-4 py-2 text-xs font-semibold rounded-wf-md border border-wf-border text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                :disabled="!isValid || isLoading"
                @click="handleSubmit"
                class="px-5 py-2 text-xs font-bold rounded-wf-md bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
                <span v-if="isLoading">Processing...</span>
                <span v-else>Confirm Redemption</span>
                <ArrowRight v-if="!isLoading" :size="14" />
            </button>
        </template>
    </WfModal>
</template>
