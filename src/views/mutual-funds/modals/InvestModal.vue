<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { CheckCircle, ArrowRight, Calendar, DollarSign, Sparkles } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'
import WfModal from '@/components/ui/WfModal.vue'

defineProps<{
    modelValue: boolean
    fund: any
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
    (e: 'success'): void
}>()

const notify = useNotificationStore()
const { formatAmount } = useCurrency()

const activeTab = ref<'lumpsum' | 'sip'>('lumpsum')
const amount = ref<number | null>(null)
const sipDate = ref<number>(5)
const isLoading = ref(false)
const showSuccess = ref(false)

const isValid = computed(() => {
    return amount.value && amount.value > 0
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
            notify.success(`Investment order of ${formatAmount(amount.value!)} initiated successfully!`)
        }, 1200)
    } catch (e) {
        notify.error("Investment failed. Please try again.")
    } finally {
        isLoading.value = false
    }
}

function handleClose() {
    if (!isLoading.value) {
        emit('update:modelValue', false)
    }
}
</script>

<template>
    <WfModal
        :model-value="modelValue"
        @update:model-value="handleClose"
        :title="fund?.scheme_name ? `Invest in ${fund.scheme_name}` : 'Invest in Fund'"
        :description="fund?.category ? `${fund.category} • Select investment mode and amount` : 'Choose investment frequency and amount'"
        maxWidth="md"
    >
        <div class="relative space-y-5">
            <!-- Investment Mode Tabs -->
            <div class="grid grid-cols-2 p-1 rounded-wf-lg bg-wf-surface-variant border border-wf-border text-xs font-semibold">
                <button
                    type="button"
                    @click="activeTab = 'lumpsum'"
                    class="py-2 px-3 rounded-wf-md transition-all text-center flex items-center justify-center gap-1.5"
                    :class="activeTab === 'lumpsum' ? 'bg-wf-primary text-white shadow-sm font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                >
                    <DollarSign class="w-3.5 h-3.5" />
                    <span>One-Time (Lumpsum)</span>
                </button>
                <button
                    type="button"
                    @click="activeTab = 'sip'"
                    class="py-2 px-3 rounded-wf-md transition-all text-center flex items-center justify-center gap-1.5"
                    :class="activeTab === 'sip' ? 'bg-wf-primary text-white shadow-sm font-bold' : 'text-wf-text-muted hover:text-wf-text-primary'"
                >
                    <Calendar class="w-3.5 h-3.5" />
                    <span>Monthly SIP</span>
                </button>
            </div>

            <!-- Amount Input -->
            <div class="space-y-2">
                <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider block">
                    Investment Amount
                </label>
                <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <span class="text-base font-bold text-wf-text-muted">₹</span>
                    </div>
                    <input
                        v-model.number="amount"
                        type="number"
                        placeholder="5,000"
                        class="w-full h-11 pl-8 pr-4 text-base font-bold rounded-wf-lg border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary font-mono transition-all"
                    />
                </div>

                <!-- Quick Amount Chips -->
                <div class="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                        v-for="amt in [2500, 5000, 10000, 25000]"
                        :key="amt"
                        type="button"
                        @click="amount = amt"
                        class="px-2.5 py-1 text-xs font-semibold font-mono rounded-wf-md border border-wf-border bg-wf-surface-variant/60 hover:bg-wf-surface-variant text-wf-text-secondary hover:text-wf-text-primary transition-all"
                    >
                        + ₹{{ amt.toLocaleString('en-IN') }}
                    </button>
                </div>
            </div>

            <!-- SIP Date Selection -->
            <div v-if="activeTab === 'sip'" class="space-y-2 pt-1">
                <div class="flex items-center justify-between">
                    <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider block">
                        Monthly Debit Date
                    </label>
                    <span class="text-xs font-mono font-medium text-wf-primary">Every {{ sipDate }}th of month</span>
                </div>
                <div class="grid grid-cols-6 gap-1.5">
                    <button
                        v-for="d in [1, 5, 10, 15, 20, 25]"
                        :key="d"
                        type="button"
                        @click="sipDate = d"
                        class="h-9 text-xs font-bold rounded-wf-md border transition-all text-center"
                        :class="sipDate === d ? 'border-wf-primary bg-wf-primary text-white shadow-sm' : 'border-wf-border bg-wf-surface-variant/40 text-wf-text-muted hover:border-wf-primary/40 hover:text-wf-text-primary'"
                    >
                        {{ d }}th
                    </button>
                </div>
            </div>

            <!-- Summary Box -->
            <div class="p-3 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-wf-text-muted">
                    <Sparkles class="w-4 h-4 text-wf-primary" />
                    <span>Order Type:</span>
                    <span class="font-semibold text-wf-text-primary">{{ activeTab === 'sip' ? 'Automated Monthly SIP' : 'Lumpsum Immediate Purchase' }}</span>
                </div>
                <div class="font-mono font-bold text-wf-text-primary">
                    {{ amount ? formatAmount(amount) : '₹0' }}
                </div>
            </div>

            <!-- Success Overlay -->
            <div v-if="showSuccess" class="absolute inset-0 bg-wf-surface/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 rounded-wf-xl animate-in fade-in duration-200">
                <div class="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-3">
                    <CheckCircle :size="32" />
                </div>
                <h4 class="text-base font-bold text-wf-text-primary">Order Submitted!</h4>
                <p class="text-xs text-wf-text-muted mt-1 max-w-xs">
                    {{ activeTab === 'sip' ? `Monthly SIP of ${formatAmount(amount || 0)} scheduled on ${sipDate}th.` : `Investment of ${formatAmount(amount || 0)} initiated successfully.` }}
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
                class="px-5 py-2 text-xs font-bold rounded-wf-md bg-wf-primary text-white shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
                <span v-if="isLoading">Processing Order...</span>
                <span v-else>Confirm & Invest {{ amount ? formatAmount(amount) : '' }}</span>
                <ArrowRight v-if="!isLoading" :size="14" />
            </button>
        </template>
    </WfModal>
</template>
