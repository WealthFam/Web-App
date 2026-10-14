<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { Check, AlertCircle } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'
import WfModal from '@/components/ui/WfModal.vue'

const props = defineProps<{
    holding: any
    modelValue: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
    (e: 'success'): void
}>()

const notify = useNotificationStore()
const { formatAmount } = useCurrency()

const goals = ref<any[]>([])
const loading = ref(false)
const processing = ref(false)
const selectedGoalId = ref<string | null>(null)

const fetchGoals = async () => {
    loading.value = true
    try {
        const res = await financeApi.getInvestmentGoals()
        goals.value = res.data || []

        if (props.holding?.goal_id) {
            selectedGoalId.value = props.holding.goal_id
        }
    } catch (e) {
        notify.error("Failed to load goals")
    } finally {
        loading.value = false
    }
}

const handleLink = async () => {
    if (!selectedGoalId.value) {
        if (props.holding?.goal_id) {
            processing.value = true
            try {
                await financeApi.unlinkHoldingFromGoal(props.holding.goal_id, props.holding.id)
                notify.success("Goal unlinked successfully")
                emit('success')
                emit('update:modelValue', false)
            } catch (e) {
                notify.error("Failed to unlink goal")
            } finally {
                processing.value = false
            }
        } else {
            emit('update:modelValue', false)
        }
        return
    }

    processing.value = true
    try {
        await financeApi.linkHoldingToGoal(selectedGoalId.value, props.holding.id)
        notify.success("Goal linked successfully")
        emit('success')
        emit('update:modelValue', false)
    } catch (e) {
        notify.error("Failed to link goal")
    } finally {
        processing.value = false
    }
}

function handleClose() {
    if (!processing.value) {
        emit('update:modelValue', false)
    }
}

onMounted(fetchGoals)
</script>

<template>
    <WfModal
        :model-value="modelValue"
        @update:model-value="handleClose"
        title="Link to Financial Goal"
        description="Attach this fund holding to an active family goal to track its progress"
        maxWidth="md"
    >
        <div class="space-y-3">
            <!-- Loading indicator -->
            <div v-if="loading" class="py-8 flex flex-col items-center justify-center gap-2">
                <div class="w-7 h-7 rounded-full border-2 border-wf-primary border-t-transparent animate-spin"></div>
                <span class="text-xs font-medium text-wf-text-muted">Loading active goals...</span>
            </div>

            <template v-else>
                <!-- Holding Summary Notice -->
                <div class="p-3 rounded-wf-lg bg-wf-surface-variant/40 border border-wf-border flex items-center justify-between text-xs">
                    <span class="text-wf-text-muted">Holding Current Value:</span>
                    <span class="font-mono font-bold text-wf-text-primary">{{ formatAmount(holding?.current_value) }}</span>
                </div>

                <!-- Goals List -->
                <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
                    <!-- Option to unlink / no goal -->
                    <div
                        @click="selectedGoalId = null"
                        class="p-3 rounded-wf-lg border transition-all cursor-pointer flex items-center justify-between"
                        :class="selectedGoalId === null ? 'border-wf-primary bg-wf-primary/5' : 'border-wf-border bg-wf-surface hover:bg-wf-surface-variant/40'"
                    >
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-text-muted">
                                <AlertCircle class="w-4 h-4" />
                            </div>
                            <div>
                                <div class="text-xs font-bold text-wf-text-primary">No Linked Goal</div>
                                <div class="text-[11px] text-wf-text-muted">Do not associate with any specific target</div>
                            </div>
                        </div>
                        <div v-if="selectedGoalId === null" class="w-5 h-5 rounded-full bg-wf-primary text-white flex items-center justify-center">
                            <Check class="w-3 h-3" />
                        </div>
                    </div>

                    <!-- List of Goals -->
                    <div
                        v-for="g in goals"
                        :key="g.id"
                        @click="selectedGoalId = g.id"
                        class="p-3 rounded-wf-lg border transition-all cursor-pointer flex items-center justify-between"
                        :class="selectedGoalId === g.id ? 'border-wf-primary bg-wf-primary/5' : 'border-wf-border bg-wf-surface hover:bg-wf-surface-variant/40'"
                    >
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div
                                class="w-8 h-8 rounded-wf-md flex items-center justify-center text-sm font-bold flex-shrink-0"
                                :style="{ background: (g.color || '#6366f1') + '20', color: g.color || '#6366f1' }"
                            >
                                {{ g.icon || '🎯' }}
                            </div>
                            <div class="min-w-0">
                                <div class="text-xs font-bold text-wf-text-primary truncate">{{ g.name }}</div>
                                <div class="text-[11px] font-mono text-wf-text-muted">Target: {{ formatAmount(g.target_amount) }}</div>
                            </div>
                        </div>
                        <div v-if="selectedGoalId === g.id" class="w-5 h-5 rounded-full bg-wf-primary text-white flex items-center justify-center flex-shrink-0">
                            <Check class="w-3 h-3" />
                        </div>
                    </div>

                    <div v-if="!goals.length" class="p-6 text-center text-xs text-wf-text-muted">
                        No financial goals found. Create goals in the Goals section first.
                    </div>
                </div>
            </template>
        </div>

        <template #footer>
            <button
                type="button"
                :disabled="processing"
                @click="handleClose"
                class="px-4 py-2 text-xs font-semibold rounded-wf-md border border-wf-border text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                :disabled="processing"
                @click="handleLink"
                class="px-5 py-2 text-xs font-bold rounded-wf-md bg-wf-primary text-white shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
                <span v-if="processing">Updating...</span>
                <span v-else>Save Goal Association</span>
            </button>
        </template>
    </WfModal>
</template>
