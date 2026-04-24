<template>
    <v-dialog :model-value="show" @update:model-value="$emit('update:show', $event)" max-width="520px"
        transition="dialog-bottom-transition" persistent>
        <v-card class="premium-glass-card no-hover overflow-hidden" rounded="xl" elevation="24">
            <!-- Header with Dynamic Icon -->
            <div class="pa-6 border-b bg-surface d-flex align-center justify-space-between relative-pos overflow-hidden">
                <div class="d-flex align-center ga-4 relative-pos z-2">
                    <div class="category-icon-container" :style="{ '--icon-color': localForm.color }">
                        <span class="text-h4 relative-pos z-2">{{ localForm.icon || '🏷️' }}</span>
                        <div class="icon-gradient-bg" style="opacity: 0.2"></div>
                    </div>
                    <div>
                        <div class="text-overline font-weight-black text-primary line-height-1 mb-1">
                            {{ isEditing ? 'Update' : (localForm.parent_id ? 'New Sub-Category' : 'Initialize Category') }}
                        </div>
                        <div class="text-h5 font-weight-black line-height-1">
                            {{ previewName }}
                            <span v-if="localForm.parent_id && !isEditing"
                                class="text-caption opacity-60 d-block mt-1 font-weight-bold">
                                in {{ getParentDisplayName(localForm.parent_id) }}
                            </span>
                        </div>
                    </div>
                </div>
                <v-btn icon variant="text" size="small" @click="$emit('update:show', false)" class="text-medium-emphasis">
                    <X :size="20" />
                    <v-tooltip activator="parent" location="top">Close</v-tooltip>
                </v-btn>
            </div>

            <v-card-text class="pa-6 overflow-y-auto custom-scrollbar" style="max-height: 70vh;">
                <v-form @submit.prevent="handleSave">
                    <div class="d-flex flex-column ga-6">
                        <!-- Identity Section -->
                        <div class="d-flex flex-column ga-3">
                            <div class="text-tiny font-weight-black opacity-50 text-uppercase letter-spacing-1 ml-2">
                                Identity</div>
                            <div class="d-flex ga-4 align-center">
                                <div style="width: 80px;">
                                    <v-text-field v-model="localForm.icon" variant="solo-filled" flat rounded="xl"
                                        hide-details class="font-weight-black text-h5 centered-input" bg-color="surface"
                                        density="comfortable" placeholder="Icon" style="height: 56px;" />
                                </div>
                                <v-text-field v-model="localForm.name" variant="solo-filled" flat rounded="xl" required
                                    placeholder="Category Name" hide-details
                                    class="font-weight-black text-h6 flex-grow-1" bg-color="surface"
                                    density="comfortable" autofocus style="height: 56px;" />
                            </div>
                        </div>

                        <!-- Classification Section -->
                        <div class="d-flex flex-column ga-3">
                            <div class="text-tiny font-weight-black opacity-50 text-uppercase letter-spacing-1 ml-2">
                                Classification</div>
                            <div class="d-flex flex-column ga-3">
                                <v-autocomplete v-model="localForm.parent_id" label="Parent Category"
                                    variant="solo-filled" flat rounded="pill" hide-details density="comfortable"
                                    :items="parentOptions" item-title="title" item-value="value"
                                    class="font-weight-bold" bg-color="surface">
                                    <template v-slot:prepend-inner>
                                        <Folder :size="18" class="text-primary mr-2 opacity-70" />
                                    </template>
                                </v-autocomplete>

                                <v-select v-model="localForm.type" label="Financial Type" variant="solo-filled" flat
                                    rounded="pill" hide-details density="comfortable" :items="[
                                        { title: '🔴 Expense', value: 'expense' },
                                        { title: '🟢 Income', value: 'income' },
                                        { title: '🔄 Transfer', value: 'transfer' }
                                    ]" class="font-weight-bold" bg-color="surface">
                                    <template v-slot:prepend-inner>
                                        <Activity :size="18" class="text-primary mr-2 opacity-70" />
                                    </template>
                                </v-select>
                            </div>
                        </div>

                        <!-- Appearance Section -->
                        <div class="d-flex flex-column ga-3">
                            <div class="text-tiny font-weight-black opacity-50 text-uppercase letter-spacing-1 ml-2">
                                Theme
                                Appearance</div>
                            <v-card variant="flat" rounded="pill" class="bg-surface border-thin pa-3 px-5 shadow-sm">
                                <div class="d-flex flex-wrap ga-2 align-center">
                                    <v-btn v-for="c in colorPresets" :key="c" :color="c" icon size="x-small"
                                        @click="localForm.color = c" :elevation="localForm.color === c ? 8 : 0"
                                        :class="{ 'border-2 border-white scale-110': localForm.color === c }"
                                        style="width: 24px; height: 24px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)">
                                        <v-tooltip activator="parent" location="top">{{ c }}</v-tooltip>
                                    </v-btn>
                                    <v-divider vertical class="mx-2 my-2 opacity-30"
                                        style="height: 16px; align-self: center;" />
                                    <div class="relative-pos d-flex align-center">
                                        <input type="color" v-model="localForm.color" class="custom-color-input"
                                            style="width: 32px; height: 32px; border-radius: 50%" />
                                        <v-tooltip activator="parent" location="top">Custom Color</v-tooltip>
                                    </div>
                                </div>
                            </v-card>
                        </div>
                    </div>
                </v-form>
            </v-card-text>

            <!-- Actions -->
            <v-card-actions class="pa-6 bg-surface border-t">
                <v-btn v-if="isEditing" variant="text" color="error" class="text-none px-4 font-weight-bold"
                    rounded="pill" @click="$emit('delete')">
                    <template v-slot:prepend>
                        <Trash2 :size="16" />
                    </template>
                    Delete
                </v-btn>
                <v-spacer />
                <v-btn variant="text" @click="$emit('update:show', false)" class="text-none px-6 font-weight-bold"
                    rounded="pill">
                    <template v-slot:prepend>
                        <X :size="16" />
                    </template>
                    Cancel
                </v-btn>
                <v-btn color="primary" rounded="pill"
                    class="text-none px-10 font-weight-black elevation-8 shadow-primary" @click="handleSave" height="48"
                    :loading="loading" :disabled="!localForm.name || !localForm.icon">
                    <template v-slot:prepend>
                        <Save :size="18" />
                    </template>
                    {{ isEditing ? 'Update' : 'Create' }} Category
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X, Folder, Activity, Trash2, Save } from 'lucide-vue-next'

interface CategoryForm {
    name: string;
    icon: string;
    color: string;
    type: string;
    parent_id: string | null;
}

const props = defineProps<{
    show: boolean;
    isEditing: boolean;
    initialForm: CategoryForm;
    parentOptions: Array<{ title: string, value: string | null }>;
    categories: any[];
    loading?: boolean;
}>()

const emit = defineEmits(['update:show', 'save', 'delete'])

const localForm = ref<CategoryForm>({ ...props.initialForm })

const colorPresets = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#475569'
]

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

<style scoped>
.category-icon-container {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background: rgba(var(--v-theme-surface), 0.8);
    border: 1px solid rgba(var(--v-border-color), 0.1);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
    position: relative;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-icon-container::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    background: var(--icon-color);
    opacity: 0.15;
    z-index: 1;
}

.icon-gradient-bg {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, var(--icon-color), transparent 70%);
    filter: blur(10px);
    z-index: 0;
}

.centered-input :deep(input) {
    text-align: center;
}

.custom-color-input {
    appearance: none;
    -webkit-appearance: none;
    border: 2px solid white;
    cursor: pointer;
    background: none;
    padding: 0;
}

.custom-color-input::-webkit-color-swatch-wrapper {
    padding: 0;
}

.custom-color-input::-webkit-color-swatch {
    border: none;
    border-radius: 50%;
}
</style>
