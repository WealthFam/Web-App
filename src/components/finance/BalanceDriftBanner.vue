<template>
    <div
        v-if="hasDrift"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-wf-xl bg-amber-500/10 border border-amber-500/30"
    >
        <div class="text-xs text-amber-800 dark:text-amber-200">
            <span class="font-bold">Balance drift detected:</span>
            Stored balance differs from ledger transactions by
            <span class="font-mono font-bold">{{ formatAmount(Math.abs(driftAmount)) }}</span>.
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <WfButton
                variant="outline"
                size="sm"
                :loading="reconciling"
                @click="$emit('reconcile')"
            >
                <span>Reconcile Balance</span>
            </WfButton>
            <WfButton
                variant="ghost"
                size="sm"
                @click="$emit('override')"
            >
                <span>Override Manually</span>
            </WfButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import WfButton from '@/components/ui/WfButton.vue'

const props = defineProps<{
    driftAmount: number
    reconciling?: boolean
}>()

defineEmits<{
    (e: 'reconcile'): void
    (e: 'override'): void
}>()

const { formatAmount } = useCurrency()
const hasDrift = computed(() => Math.abs(Number(props.driftAmount || 0)) > 0.01)
</script>
