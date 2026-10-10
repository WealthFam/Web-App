<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Folder, Activity, Trash2, Save } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'

interface CategoryForm {
    name: string
    icon: string
    color: string
    type: string
    parent_id: string | null
}

const props = defineProps<{
    show: boolean
    isEditing: boolean
    initialForm: CategoryForm
    parentOptions: Array<{ title: string, value: string | null }>
    categories: any[]
    loading?: boolean
}>()

const emit = defineEmits(['update:show', 'save', 'delete'])

const localForm = ref<CategoryForm>({ ...props.initialForm })

const colorPresets = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#475569'
]

const quickEmojis = ['🏷️', '🍔', '🛒', '🚗', '💡', '🏠', '💊', '🎬', '📈', '✈️', '💼', '🎁']

const previewName = computed(() => localForm.value.name || 'New Category')

watch(() => props.initialForm, (newVal) => {
    localForm.value = { ...newVal }
}, { deep: true })

function getParentDisplayName(parentId: string) {
    const parent = props.categories.find(c => c.id === parentId)
    return parent ? `${parent.icon} ${parent.name}` : 'Parent'
}

function handleSave() {
    if (!localForm.value.name || !localForm.value.icon) return
    emit('save', { ...localForm.value })
}
</script>

<template>
    <WfModal
        :model-value="show"
        @update:model-value="$emit('update:show', $event)"
        max-width="md"
    >
        <template #header>
            <div class="flex items-center gap-3">
                <div
                    class="w-11 h-11 rounded-wf-lg flex items-center justify-center text-2xl border shadow-2xs shrink-0 transition-colors"
                    :style="{
                        backgroundColor: `${localForm.color}15`,
                        borderColor: `${localForm.color}40`
                    }"
                >
                    <span>{{ localForm.icon || '🏷️' }}</span>
                </div>
                <div class="min-w-0">
                    <span class="text-[10px] font-bold text-wf-primary uppercase tracking-wider block">
                        {{ isEditing ? 'Update Category' : (localForm.parent_id ? 'New Sub-Category' : 'Create Category') }}
                    </span>
                    <h3 class="text-base font-bold text-wf-text-primary truncate">
                        {{ previewName }}
                    </h3>
                    <p v-if="localForm.parent_id && !isEditing" class="text-xs text-wf-text-muted mt-0.5 truncate">
                        Inside {{ getParentDisplayName(localForm.parent_id) }}
                    </p>
                </div>
            </div>
        </template>

        <form @submit.prevent="handleSave" class="space-y-4">
            <!-- Identity Section -->
            <div class="space-y-2">
                <label class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider block">
                    Identity
                </label>
                <div class="flex items-center gap-2.5">
                    <div class="w-14 shrink-0">
                        <input
                            v-model="localForm.icon"
                            type="text"
                            placeholder="🏷️"
                            maxlength="4"
                            class="w-full h-10 text-center text-lg bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                        />
                    </div>
                    <div class="flex-1">
                        <input
                            v-model="localForm.name"
                            type="text"
                            required
                            placeholder="Category Name"
                            class="w-full h-10 px-3 text-sm bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-2 focus:ring-wf-primary/20 focus:border-wf-primary"
                        />
                    </div>
                </div>

                <!-- Quick Emojis Row -->
                <div class="flex items-center gap-1 overflow-x-auto pb-1">
                    <button
                        v-for="e in quickEmojis"
                        :key="e"
                        type="button"
                        @click="localForm.icon = e"
                        class="w-7 h-7 rounded-wf-sm text-sm hover:bg-wf-surface-variant flex items-center justify-center transition-transform hover:scale-110 shrink-0"
                        :class="[localForm.icon === e ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50' : '']"
                    >
                        {{ e }}
                    </button>
                </div>
            </div>

            <!-- Classification Section -->
            <div class="space-y-3">
                <label class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider block">
                    Classification
                </label>
                
                <div class="space-y-2.5">
                    <!-- Parent Category Select -->
                    <div>
                        <span class="text-xs font-semibold text-wf-text-secondary mb-1 block">Parent Category</span>
                        <div class="flex items-center h-10 px-3 bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary focus-within:ring-2 focus-within:ring-wf-primary/20 focus-within:border-wf-primary transition-all gap-2">
                            <Folder class="w-4 h-4 text-wf-text-muted shrink-0 pointer-events-none" />
                            <select
                                v-model="localForm.parent_id"
                                class="w-full h-full bg-transparent text-sm text-wf-text-primary focus:outline-none cursor-pointer"
                            >
                                <option v-for="opt in parentOptions" :key="String(opt.value)" :value="opt.value">
                                    {{ opt.title }}
                                </option>
                            </select>
                        </div>
                    </div>

                    <!-- Financial Type Select -->
                    <div>
                        <span class="text-xs font-semibold text-wf-text-secondary mb-1 block">Financial Type</span>
                        <div class="flex items-center h-10 px-3 bg-wf-surface border border-wf-border rounded-wf-md text-wf-text-primary focus-within:ring-2 focus-within:ring-wf-primary/20 focus-within:border-wf-primary transition-all gap-2">
                            <Activity class="w-4 h-4 text-wf-text-muted shrink-0 pointer-events-none" />
                            <select
                                v-model="localForm.type"
                                class="w-full h-full bg-transparent text-sm text-wf-text-primary focus:outline-none cursor-pointer"
                            >
                                <option value="expense">🔴 Expense</option>
                                <option value="income">🟢 Income</option>
                                <option value="transfer">🔄 Transfer</option>
                                <option value="investment">📈 Investment</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Theme Color Section -->
            <div class="space-y-2">
                <label class="text-[11px] font-bold text-wf-text-muted uppercase tracking-wider block">
                    Theme Color
                </label>
                <div class="p-2.5 bg-wf-surface-variant/40 border border-wf-border rounded-wf-md flex items-center justify-between gap-2 overflow-x-auto">
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button
                            v-for="c in colorPresets"
                            :key="c"
                            type="button"
                            @click="localForm.color = c"
                            class="w-5.5 h-5.5 rounded-wf-pill transition-all border shrink-0"
                            :style="{ backgroundColor: c }"
                            :class="[
                                localForm.color === c ? 'ring-2 ring-wf-primary ring-offset-1 scale-110 border-white' : 'border-transparent hover:scale-110 opacity-80 hover:opacity-100'
                            ]"
                            :title="c"
                        />
                    </div>
                    <div class="h-5 w-px bg-wf-border shrink-0"></div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <input
                            type="color"
                            v-model="localForm.color"
                            class="w-6 h-6 rounded-wf-pill cursor-pointer border border-wf-border p-0 bg-transparent shrink-0"
                            title="Custom Color"
                        />
                        <span class="text-[11px] font-mono font-semibold text-wf-text-muted uppercase">{{ localForm.color }}</span>
                    </div>
                </div>
            </div>
        </form>

        <template #footer>
            <div class="flex items-center justify-between w-full">
                <div>
                    <WfButton
                        v-if="isEditing"
                        variant="ghost"
                        size="sm"
                        @click="$emit('delete')"
                        class="text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                        <Trash2 class="w-4 h-4 mr-1.5" />
                        <span>Delete</span>
                    </WfButton>
                </div>

                <div class="flex items-center gap-2">
                    <WfButton
                        variant="ghost"
                        size="sm"
                        @click="$emit('update:show', false)"
                    >
                        Cancel
                    </WfButton>
                    <WfButton
                        variant="primary"
                        size="sm"
                        @click="handleSave"
                        :loading="loading"
                        :disabled="!localForm.name || !localForm.icon"
                    >
                        <Save class="w-4 h-4 mr-1.5" />
                        <span>{{ isEditing ? 'Update' : 'Create' }} Category</span>
                    </WfButton>
                </div>
            </div>
        </template>
    </WfModal>
</template>
