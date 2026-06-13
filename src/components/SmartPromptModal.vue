<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sparkles, Tag, ShieldCheck, History, EyeOff } from 'lucide-vue-next'

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

function handleConfirm() {
    emit('confirm')
}
</script>

<template>
    <Dialog :open="isOpen" @update:open="emit('close')">
        <DialogContent class="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
            <!-- Header with Gradient -->
            <div class="bg-gradient-to-br from-primary to-indigo-600 p-6 text-white relative">
                <div class="flex items-center gap-3">
                    <div class="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
                        <Sparkles class="h-6 w-6 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
                    </div>
                    <div>
                        <DialogTitle class="text-xl font-black text-white m-0">Smart Action</DialogTitle>
                        <p class="text-xs text-white/80 font-bold mt-0.5">Automate your categorization</p>
                    </div>
                </div>
            </div>

            <div class="p-6 pt-8 space-y-6">
                <!-- Info Section -->
                <div class="bg-primary/5 border border-primary/10 flex items-center gap-4 p-4 rounded-xl">
                    <div class="w-12 h-12 flex items-center justify-center bg-background rounded-2xl shadow-sm border shrink-0">
                        <Tag class="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Detected Pattern</div>
                        <div class="text-base font-black text-primary">"{{ data.pattern }}"</div>
                    </div>
                </div>

                <div class="text-sm text-muted-foreground">
                    You've assigned <strong class="text-foreground font-extrabold">{{ data.category }}</strong> to this transaction.
                    <span v-if="hasSimilar" class="block mt-1">
                        We found <strong class="text-foreground font-extrabold">{{ data.count }}</strong> similar transactions in your history.
                    </span>
                </div>

                <!-- Options -->
                <div class="space-y-3">
                    <!-- Option 1: Permanent Rule -->
                    <div
                        class="flex items-center p-4 rounded-xl border transition-all cursor-pointer select-none"
                        :class="data.createRule 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border/40 bg-card hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20'"
                        @click="data.createRule = !data.createRule"
                    >
                        <div class="w-11 h-11 flex items-center justify-center rounded-xl mr-4 shrink-0 transition-colors"
                            :class="data.createRule ? 'bg-primary/15' : 'bg-muted'"
                        >
                            <ShieldCheck class="h-5 w-5" :class="data.createRule ? 'text-primary' : 'text-muted-foreground'" />
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="text-sm font-bold text-foreground">Create Permanent Rule</div>
                            <div class="text-xs text-muted-foreground mt-0.5">Auto-categorize matching future transactions</div>
                        </div>
                        <Checkbox :checked="data.createRule" @update:checked="(val: boolean) => data.createRule = val" class="ml-2" />
                    </div>

                    <!-- Option 2: Apply to Past History (Conditionally Shown) -->
                    <div v-if="hasSimilar"
                        class="flex items-center p-4 rounded-xl border transition-all cursor-pointer select-none"
                        :class="data.applyToSimilar 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border/40 bg-card hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20'"
                        @click="data.applyToSimilar = !data.applyToSimilar"
                    >
                        <div class="w-11 h-11 flex items-center justify-center rounded-xl mr-4 shrink-0 transition-colors"
                            :class="data.applyToSimilar ? 'bg-primary/15' : 'bg-muted'"
                        >
                            <History class="h-5 w-5" :class="data.applyToSimilar ? 'text-primary' : 'text-muted-foreground'" />
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="text-sm font-bold text-foreground">Apply to Past History</div>
                            <div class="text-xs text-muted-foreground mt-0.5">Update {{ data.count }} similar transactions now</div>
                        </div>
                        <Checkbox :checked="data.applyToSimilar" @update:checked="(val: boolean) => data.applyToSimilar = val" class="ml-2" />
                    </div>

                    <!-- Option 3: Exclude from Reports -->
                    <div
                        class="flex items-center p-4 rounded-xl border transition-all cursor-pointer select-none"
                        :class="data.excludeFromReports 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border/40 bg-card hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20'"
                        @click="data.excludeFromReports = !data.excludeFromReports"
                    >
                        <div class="w-11 h-11 flex items-center justify-center rounded-xl mr-4 shrink-0 transition-colors"
                            :class="data.excludeFromReports ? 'bg-primary/15' : 'bg-muted'"
                        >
                            <EyeOff class="h-5 w-5" :class="data.excludeFromReports ? 'text-primary' : 'text-muted-foreground'" />
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="text-sm font-bold text-foreground">Exclude from Reports</div>
                            <div class="text-xs text-muted-foreground mt-0.5">Don't count matching transactions in analytics</div>
                        </div>
                        <Checkbox :checked="data.excludeFromReports" @update:checked="(val: boolean) => data.excludeFromReports = val" class="ml-2" />
                    </div>
                </div>
            </div>

            <div class="p-6 bg-muted/30 border-t flex justify-end gap-3">
                <Button type="button" variant="ghost" class="px-6 rounded-xl font-bold" @click="emit('close')">Skip</Button>
                <Button type="button" class="px-8 rounded-xl font-bold shadow-md shadow-primary/20" @click="handleConfirm">
                    Approve Action
                </Button>
            </div>
        </DialogContent>
    </Dialog>
</template>
