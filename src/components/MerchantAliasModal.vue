<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { financeApi } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-vue-next'

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
    <Dialog v-model:open="isOpen">
        <DialogContent class="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle class="text-xl font-bold">New Merchant Alias</DialogTitle>
            </DialogHeader>
            <form @submit.prevent="save" class="space-y-6 pt-4">
                <div class="space-y-2">
                    <label class="text-sm font-bold text-foreground">Raw Text Pattern</label>
                    <Input v-model="form.pattern" placeholder="e.g. AMZN MKTP" required readonly class="bg-muted" />
                    <p class="text-xs text-muted-foreground mt-1">Matches if this text appears in description</p>
                </div>

                <div class="space-y-2">
                    <label class="text-sm font-bold text-foreground">Clean Merchant Name</label>
                    <Input v-model="form.alias" placeholder="e.g. Amazon" required />
                </div>

                <div class="flex items-start space-x-3 space-y-0 pt-2">
                    <Checkbox id="update-past" :checked="form.update_past" @update:checked="(val: boolean) => form.update_past = val" />
                    <div class="grid gap-1.5 leading-none">
                        <label for="update-past" class="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                            Update past transactions?
                        </label>
                        <p class="text-xs text-muted-foreground" v-if="impact !== null">
                            Will update approx. <strong class="text-primary font-bold">{{ impact }}</strong> transactions
                        </p>
                        <p class="text-xs text-muted-foreground" v-else>
                            Select to verify impact on history
                        </p>
                    </div>
                </div>

                <DialogFooter class="flex gap-3 justify-end pt-4">
                    <Button type="button" variant="ghost" @click="isOpen = false">Cancel</Button>
                    <Button type="submit" :disabled="loading">
                        <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                        Create Rule
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
