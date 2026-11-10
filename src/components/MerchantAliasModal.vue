<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { financeApi } from '@/api/client'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfButton from '@/components/ui/WfButton.vue'

const props = defineProps<{
    modelValue: boolean
    initialPattern?: string
    initialAlias?: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'saved': []
}>()

const isOpen = ref(props.modelValue)
watch(() => props.modelValue, (val) => isOpen.value = val)
watch(isOpen, (val) => emit('update:modelValue', val))

// Form State
const loading = ref(false)
const impact = ref<number | null>(null)
const form = reactive({
    pattern: '',
    alias: '',
    update_past: true
})

// Initialize form when opening
watch(() => props.modelValue, (val) => {
    if (val) {
        form.pattern = props.initialPattern || ''
        form.alias = props.initialAlias || ''
        form.update_past = true
        impact.value = null
        checkImpact()
    }
})

let impactDebounce: any = null
function checkImpact() {
    if (!form.pattern) {
        impact.value = null
        return
    }
    if (impactDebounce) clearTimeout(impactDebounce)
    impactDebounce = setTimeout(async () => {
        try {
            const res = await financeApi.previewAliasImpact(form.pattern)
            impact.value = res.data.match_count
        } catch (e) {
            console.error(e)
        }
    }, 500)
}

async function save() {
    loading.value = true
    try {
        await financeApi.createAlias({
            pattern: form.pattern,
            alias: form.alias,
            update_past_transactions: form.update_past
        })
        emit('saved')
        isOpen.value = false
    } catch (err) {
        console.error("Failed to create alias", err)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <WfModal v-model="isOpen" title="New Merchant Alias">
        <form id="merchant-alias-form" class="space-y-4" @submit.prevent="save">
            <WfInput v-model="form.pattern" label="Raw Text Pattern" placeholder="e.g. AMZN MKTP"
                hint="Matches if this text appears in description" required disabled />

            <WfInput v-model="form.alias" label="Clean Merchant Name" placeholder="e.g. Amazon" required />

            <label class="flex items-start gap-2 cursor-pointer">
                <input v-model="form.update_past" type="checkbox" class="mt-0.5 accent-[var(--wf-color-primary)]" />
                <span>
                    <span class="block text-sm font-semibold text-wf-text-primary">Update past transactions?</span>
                    <span class="block text-xs text-wf-text-muted" v-if="impact !== null">
                        Will update approx. <strong class="font-mono">{{ impact }}</strong> transactions
                    </span>
                    <span class="block text-xs text-wf-text-muted" v-else>
                        Select to verify impact on history
                    </span>
                </span>
            </label>
        </form>
        <template #footer>
            <WfButton variant="ghost" size="sm" @click="isOpen = false">Cancel</WfButton>
            <WfButton type="submit" size="sm" :loading="loading" :disabled="!form.alias" @click="save">Create Rule</WfButton>
        </template>
    </WfModal>
</template>
