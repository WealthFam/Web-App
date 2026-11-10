<script setup lang="ts">
import { computed } from 'vue'
import { Tag, ShieldCheck, History, EyeOff } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

const props = defineProps<{
    isOpen: boolean
    data: {
        txnId: string
        category: string
        pattern: string
        count: number
        createRule: boolean
        applyToSimilar: boolean
        excludeFromReports: boolean
    }
}>()

const emit = defineEmits(['close', 'confirm'])

const hasSimilar = computed(() => props.data.count > 0)

const options = computed(() => [
    { key: 'createRule' as const, icon: ShieldCheck, title: 'Create Permanent Rule', desc: 'Auto-categorize matching future transactions', show: true },
    { key: 'applyToSimilar' as const, icon: History, title: 'Apply to Past History', desc: `Update ${props.data.count} similar transactions now`, show: hasSimilar.value },
    { key: 'excludeFromReports' as const, icon: EyeOff, title: 'Exclude from Reports', desc: "Don't count matching transactions in analytics", show: true },
].filter(o => o.show))

function handleConfirm() {
    emit('confirm')
}
</script>

<template>
    <WfModal :model-value="isOpen" title="Rule Action" description="Automate your categorization"
        @update:model-value="emit('close')">
        <div class="flex items-center gap-3 p-3 mb-4 rounded-wf-lg bg-wf-primary/5 border border-wf-primary/10">
            <div class="w-10 h-10 flex items-center justify-center rounded-wf-md bg-wf-surface border border-wf-border">
                <Tag class="w-5 h-5 text-wf-primary" aria-hidden="true" />
            </div>
            <div class="min-w-0">
                <div class="text-xs font-medium uppercase tracking-wider text-wf-text-muted">Detected Pattern</div>
                <div class="text-sm font-semibold text-wf-primary truncate">"{{ data.pattern }}"</div>
            </div>
        </div>

        <p class="text-sm text-wf-text-secondary mb-4">
            You've assigned <strong>{{ data.category }}</strong> to this transaction.
            <span v-if="hasSimilar">
                We found <strong class="font-mono">{{ data.count }}</strong> similar transactions in your history.
            </span>
        </p>

        <div class="flex flex-col gap-2">
            <label v-for="o in options" :key="o.key"
                class="flex items-center gap-3 p-3 rounded-wf-lg border cursor-pointer transition-colors hover:border-wf-primary/40"
                :class="data[o.key] ? 'border-wf-primary bg-wf-primary/5' : 'border-wf-border bg-wf-surface'">
                <component :is="o.icon" class="w-5 h-5 shrink-0"
                    :class="data[o.key] ? 'text-wf-primary' : 'text-wf-text-muted'" aria-hidden="true" />
                <span class="flex-1 min-w-0">
                    <span class="block text-sm font-semibold text-wf-text-primary">{{ o.title }}</span>
                    <span class="block text-xs text-wf-text-muted">{{ o.desc }}</span>
                </span>
                <input v-model="data[o.key]" type="checkbox" class="accent-[var(--wf-color-primary)]" />
            </label>
        </div>

        <template #footer>
            <WfButton variant="ghost" size="sm" @click="emit('close')">Skip</WfButton>
            <WfButton size="sm" @click="handleConfirm">Approve Action</WfButton>
        </template>
    </WfModal>
</template>
