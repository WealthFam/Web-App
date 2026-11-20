<script setup lang="ts">
import { ref, reactive, watch, onBeforeUnmount } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfButton from '@/components/ui/WfButton.vue'

const notify = useNotificationStore()

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
    alias: ''
})

// Initialize form when opening
watch(() => props.modelValue, (val) => {
    if (val) {
        form.pattern = props.initialPattern || ''
        form.alias = props.initialAlias || ''
        impact.value = null
        checkImpact()
    } else if (impactDebounce) {
        clearTimeout(impactDebounce)
        impactDebounce = null
    }
})

let impactDebounce: any = null
function checkImpact() {
    const pat = form.pattern.trim()
    if (!pat) {
        impact.value = null
        return
    }
    if (impactDebounce) clearTimeout(impactDebounce)
    impactDebounce = setTimeout(async () => {
        try {
            const res = await financeApi.previewAliasImpact(pat)
            impact.value = res.data.match_count ?? 0
        } catch (e) {
            console.error(e)
            impact.value = null
        }
    }, 350)
}

watch(() => form.pattern, () => {
    if (!isOpen.value) return
    checkImpact()
})

onBeforeUnmount(() => {
    if (impactDebounce) {
        clearTimeout(impactDebounce)
        impactDebounce = null
    }
})

async function save() {
    const pattern = form.pattern.trim()
    const alias = form.alias.trim()
    if (!pattern || !alias) return

    loading.value = true
    try {
        const res = await financeApi.createAlias({ pattern, alias })
        const matched = res.data?.matched_transactions || 0
        notify.success(
            matched > 0
                ? `Merchant alias saved — resolves ${matched} matching transactions`
                : 'Merchant alias saved'
        )
        emit('saved')
        isOpen.value = false
    } catch (err: any) {
        console.error('Failed to create alias', err)
        notify.error(err?.response?.data?.detail || 'Failed to save merchant alias')
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <WfModal v-model="isOpen" title="Map Merchant Alias">
        <form id="merchant-alias-form" class="space-y-4" @submit.prevent="save">
            <WfInput
                v-model="form.pattern"
                label="Raw Text Pattern"
                placeholder="e.g. AMZN MKTP"
                hint="Case-insensitive keyword or space-separated words (e.g. AMZN MKTP matches AMZN*MKTP)"
                required
            />

            <WfInput v-model="form.alias" label="Clean Merchant Name" placeholder="e.g. Amazon" required />

            <div class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border text-xs space-y-1">
                <p class="font-semibold text-wf-text-primary" v-if="impact !== null">
                    Matches <strong class="font-mono">{{ impact }}</strong> existing ledger & triage transactions
                </p>
                <p class="font-semibold text-wf-text-primary" v-else>
                    Real-time merchant lookup
                </p>
                <p class="text-wf-text-muted">
                    Aliases resolve dynamically at read time across Ledger, Triage, Search, and Analytics without altering raw bank descriptions.
                </p>
            </div>
        </form>
        <template #footer>
            <WfButton variant="ghost" size="sm" @click="isOpen = false">Cancel</WfButton>
            <WfButton type="button" size="sm" :loading="loading" :disabled="!form.pattern.trim() || !form.alias.trim()" @click="save">Save Alias</WfButton>
        </template>
    </WfModal>
</template>
