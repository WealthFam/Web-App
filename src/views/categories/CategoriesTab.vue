<template>
    <v-container fluid class="pa-0 animate-in relative-pos z-10">
        <!-- Stats Overview -->
        <v-row class="mb-6">
            <v-col cols="12" sm="6" md="3">
                <v-card @click="categoriesStore.searchFilter = 'all'"
                    class="premium-glass-card pa-5 h-100 cursor-pointer border-thin elevation-2" rounded="xl">
                    <div class="d-flex justify-space-between align-start mb-2">
                        <div>
                            <span class="text-overline font-weight-black opacity-50 letter-spacing-2">Total</span>
                            <div class="text-h4 font-weight-black mt-1">
                                {{ categoriesStore.categoryStats.total }}
                            </div>
                        </div>
                        <v-avatar color="primary" variant="tonal" rounded="lg" size="48" class="elevation-1">
                            <BarChart3 :size="24" />
                        </v-avatar>
                    </div>
                    <div class="text-caption font-weight-bold opacity-60">Revenue & Expense items</div>
                </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
                <v-card @click="categoriesStore.searchFilter = 'expense'"
                    class="premium-glass-card pa-5 h-100 cursor-pointer border-thin elevation-2" rounded="xl"
                    :class="{ 'border-error': categoriesStore.searchFilter === 'expense' }">
                    <div class="d-flex justify-space-between align-start mb-2">
                        <div>
                            <span class="text-overline font-weight-black opacity-50 letter-spacing-2">Expenses</span>
                            <div class="text-h4 font-weight-black mt-1"
                                :class="categoriesStore.searchFilter === 'expense' ? 'text-error' : ''">
                                {{ categoriesStore.categoryStats.expenses }}
                            </div>
                        </div>
                        <v-avatar color="error" variant="tonal" rounded="lg" size="48" class="elevation-1">
                            <TrendingDown :size="24" />
                        </v-avatar>
                    </div>
                    <v-progress-linear
                        :model-value="(categoriesStore.categoryStats.expenses / (categoriesStore.categoryStats.total || 1)) * 100"
                        color="error" height="6" rounded class="mt-4 opacity-30" />
                </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
                <v-card @click="categoriesStore.searchFilter = 'income'"
                    class="premium-glass-card pa-5 h-100 cursor-pointer border-thin elevation-2" rounded="xl"
                    :class="{ 'border-success': categoriesStore.searchFilter === 'income' }">
                    <div class="d-flex justify-space-between align-start mb-2">
                        <div>
                            <span class="text-overline font-weight-black opacity-50 letter-spacing-2">Income</span>
                            <div class="text-h4 font-weight-black mt-1"
                                :class="categoriesStore.searchFilter === 'income' ? 'text-success' : ''">
                                {{ categoriesStore.categoryStats.income }}
                            </div>
                        </div>
                        <v-avatar color="success" variant="tonal" rounded="lg" size="48" class="elevation-1">
                            <TrendingUp :size="24" />
                        </v-avatar>
                    </div>
                    <v-progress-linear
                        :model-value="(categoriesStore.categoryStats.income / (categoriesStore.categoryStats.total || 1)) * 100"
                        color="success" height="6" rounded class="mt-4 opacity-30" />
                </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="3">
                <v-card @click="categoriesStore.searchFilter = 'transfer'"
                    class="premium-glass-card pa-5 h-100 cursor-pointer border-thin elevation-2" rounded="xl"
                    :class="{ 'border-info': categoriesStore.searchFilter === 'transfer' }">
                    <div class="d-flex justify-space-between align-start mb-2">
                        <div>
                            <span class="text-overline font-weight-black opacity-50 letter-spacing-2">Transfers</span>
                            <div class="text-h4 font-weight-black mt-1"
                                :class="categoriesStore.searchFilter === 'transfer' ? 'text-info' : ''">
                                {{ categoriesStore.categoryStats.transfer }}
                            </div>
                        </div>
                        <v-avatar color="info" variant="tonal" rounded="lg" size="48" class="elevation-1">
                            <Repeat :size="24" />
                        </v-avatar>
                    </div>
                    <div class="text-caption font-weight-bold opacity-60 mt-4">Linked movements</div>
                </v-card>
            </v-col>
        </v-row>

        <!-- Toolbar -->
        <v-card class="premium-glass-card mb-6 border-thin premium-toolbar" rounded="xl">
            <v-row align="center" dense class="w-100">
                <v-col cols="12" md="4">
                    <v-text-field v-model="categoriesStore.searchQuery" prepend-inner-icon="mdi-magnify"
                        placeholder="Filter categories..." variant="solo-filled" flat rounded="pill" hide-details
                        density="compact" class="search-input" bg-color="surface">
                        <template v-slot:prepend-inner>
                            <Search :size="18" class="text-primary opacity-60" />
                        </template>
                    </v-text-field>
                </v-col>
                <v-spacer />
                <v-col cols="12" md="auto" class="d-flex align-center ga-3">
                    <div class="d-flex ga-2 bg-surface pa-1 rounded-pill border-thin shadow-sm">
                        <v-btn variant="text" size="small" rounded="pill" color="primary"
                            class="text-none font-weight-black px-4" @click="startAddCategory">
                            <template v-slot:prepend>
                                <Plus :size="14" />
                            </template>
                            Add Category
                        </v-btn>
                        <v-divider vertical class="mx-1 my-2 opacity-30" style="height: 16px; align-self: center;" />
                        <v-btn variant="text" size="small" rounded="pill" color="primary"
                            class="text-none font-weight-black px-4" @click="categoriesStore.exportCategories">
                            <template v-slot:prepend>
                                <Download :size="14" />
                            </template>
                            Export
                        </v-btn>
                        <v-divider vertical class="mx-1 my-2 opacity-30" style="height: 16px; align-self: center;" />
                        <v-btn variant="text" size="small" rounded="pill" color="primary"
                            class="text-none font-weight-black px-4" @click="triggerImport">
                            <template v-slot:prepend>
                                <Upload :size="14" />
                            </template>
                            Import
                        </v-btn>
                    </div>
                </v-col>
            </v-row>
        </v-card>

        <!-- Invisible file input for import -->
        <input type="file" ref="fileInput" accept=".json" style="display: none" @change="handleImportCategories" />

        <!-- Categories List -->
        <div v-if="categoriesStore.loading" class="d-flex flex-column ga-3 mb-10">
            <v-skeleton-loader type="table-row-divider@6" class="rounded-xl border-thin premium-glass-card" />
        </div>

        <v-card v-if="!categoriesStore.loading" class="premium-glass-card overflow-hidden border-thin elevation-2 mb-16"
            rounded="xl">
            <v-data-table :headers="headers" :items="categoriesStore.rootCategories" :search="categoriesStore.searchQuery"
                density="comfortable" class="premium-table" hide-default-footer :items-per-page="-1">

                <!-- Name Column -->
                <template v-slot:item.name="{ item }">
                    <div class="d-flex align-center py-2">
                        <v-avatar :style="{ background: item.color + '20' }" rounded="lg" size="36" class="mr-3 border">
                            <span class="text-subtitle-1">{{ item.icon || '🏷️' }}</span>
                        </v-avatar>
                        <div class="d-flex flex-column">
                            <span class="font-weight-black text-subtitle-2">{{ item.name }}</span>
                            <span v-if="item.parent_id" class="text-tiny opacity-40 font-weight-bold">Sub-category</span>
                        </div>
                    </div>
                </template>

                <!-- Type Column -->
                <template v-slot:item.type="{ item }">
                    <v-chip :color="item.type === 'expense' ? 'error' : (item.type === 'income' ? 'success' : 'info')"
                        size="x-small" class="text-none font-weight-black px-2" variant="tonal">
                        {{ item.type.toUpperCase() }}
                    </v-chip>
                </template>

                <!-- Subcategories Column -->
                <template v-slot:item.subcategories="{ item }">
                    <div class="d-flex flex-wrap ga-1 py-1 align-center">
                        <template v-if="categoriesStore.getChildren(item.id).length > 0">
                            <v-chip v-for="child in categoriesStore.getChildren(item.id).slice(0, 5)" :key="child.id"
                                size="x-small" variant="tonal" color="primary"
                                class="font-weight-bold bg-surface border-thin cursor-pointer"
                                @click.stop="editCategory(child)">
                                <span class="mr-1">{{ child.icon }}</span>
                                {{ child.name }}
                            </v-chip>
                            <v-chip v-if="categoriesStore.getChildren(item.id).length > 5" size="x-small" variant="text"
                                color="primary" class="font-weight-black">
                                +{{ categoriesStore.getChildren(item.id).length - 5 }}
                            </v-chip>
                        </template>
                        <span v-else class="text-tiny opacity-30 font-weight-black italic mr-2">0 sub-categories</span>

                        <!-- Add New Subcategory Button -->
                        <v-chip size="x-small" color="success" variant="tonal"
                            class="font-weight-black border-thin cursor-pointer"
                            style="background: rgba(var(--v-theme-success), 0.05) !important;"
                            @click.stop="startAddSubCategory(item)">
                            <Plus :size="10" class="mr-1" />
                            New
                        </v-chip>
                    </div>
                </template>

                <!-- Actions Column -->
                <template v-slot:item.actions="{ item }">
                    <div class="d-flex ga-1 justify-end align-center">
                        <v-btn icon variant="text" size="small" color="medium-emphasis" rounded="pill"
                            @click.stop="editCategory(item)">
                            <Pencil :size="14" />
                            <v-tooltip activator="parent" location="top">Edit</v-tooltip>
                        </v-btn>
                        <v-btn icon variant="text" size="small" color="error" rounded="pill"
                            :loading="isCheckingUsage && categoryToDelete?.id === item.id"
                            @click.stop="categoryToDelete = item; startDeleteCategory(item)">
                            <Trash2 :size="14" />
                            <v-tooltip activator="parent" location="top">Delete</v-tooltip>
                        </v-btn>
                    </div>
                </template>

                <!-- Empty State -->
                <template v-slot:no-data>
                    <div class="text-center py-16 opacity-40">
                        <Inbox :size="48" class="mb-4" />
                        <div class="text-h6 font-weight-black">No categories found</div>
                    </div>
                </template>
            </v-data-table>
        </v-card>

        <CategoryModal v-model:show="showCategoryModal" :is-editing="isEditingCategory" :initial-form="categoryForm"
            :parent-options="parentOptions" :categories="categoriesStore.categories" :loading="categoriesStore.loading"
            @save="saveCategory" @delete="startDeleteFromModal" />

        <!-- Delete Confirmation Modal -->
        <v-dialog v-model="showDeleteCategoryConfirm" max-width="450px" persistent>
            <v-card class="premium-glass-card no-hover text-center pa-8" rounded="xl" elevation="24">
                <v-avatar color="error" variant="tonal" size="72" class="mb-6 mx-auto elevation-2">
                    <AlertCircle :size="40" />
                </v-avatar>
                <h3 class="text-h5 font-weight-black mb-2">Delete Category?</h3>
                <p class="text-subtitle-2 font-weight-medium opacity-60 mb-8 px-4">
                    Existing transactions will become <strong>uncategorized</strong>. This action is permanent and
                    affects your financial history.
                </p>
                <div class="d-flex ga-3 justify-center">
                    <v-btn variant="text" rounded="pill" class="text-none font-weight-bold px-6" height="44"
                        @click="showDeleteCategoryConfirm = false">No, Keep It</v-btn>
                    <v-btn color="error" rounded="pill" class="text-none font-weight-black px-8 elevation-4" height="44"
                        @click="confirmDeleteCategory">Yes, Delete</v-btn>
                </div>
            </v-card>
        </v-dialog>

        <!-- Delete Restricted Modal -->
        <v-dialog v-model="showDeleteRestrictedModal" max-width="450px" persistent>
            <v-card class="premium-glass-card no-hover text-center pa-8" rounded="xl" elevation="24">
                <v-avatar color="warning" variant="tonal" size="72" class="mb-6 mx-auto elevation-2">
                    <AlertCircle :size="40" />
                </v-avatar>
                <h3 class="text-h5 font-weight-black mb-2">Notice</h3>
                <p class="text-subtitle-2 font-weight-medium opacity-60 mb-8 px-4" v-html="restrictionMessage"></p>
                <v-btn block color="primary" rounded="pill" class="text-none font-weight-black" height="48"
                    @click="showDeleteRestrictedModal = false">Understand</v-btn>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCategoriesStore } from '@/stores/finance/categories'
import {
    Search, Plus, Pencil, Trash2,
    Download, Upload, AlertCircle,
    BarChart3, TrendingDown, TrendingUp, Repeat, Inbox
} from 'lucide-vue-next'
import CategoryModal from './components/CategoryModal.vue'

const categoriesStore = useCategoriesStore()

// Local UI State (Modals)
const showCategoryModal = ref(false)
const isEditingCategory = ref(false)
const editingCategoryId = ref<string | null>(null)
const showDeleteCategoryConfirm = ref(false)
const showDeleteRestrictedModal = ref(false)
const categoryToDelete = ref<any>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const restrictionMessage = ref('')
const isCheckingUsage = ref(false)

const headers = [
    { title: 'Category', key: 'name', sortable: true },
    { title: 'Type', key: 'type', sortable: true, width: '100px' },
    { title: 'Folders', key: 'subcategories', sortable: false },
    { title: '', key: 'actions', sortable: false, align: 'end' as const, width: '220px' },
]

const categoryForm = ref({
    name: '',
    icon: '🏷️',
    color: '#6366f1',
    type: 'expense',
    parent_id: null as string | null
})

const parentOptions = computed(() => {
    return [
        { title: 'None (Root Category)', value: null },
        ...categoriesStore.rootCategories.map(c => ({
            title: `${c.icon} ${c.name}`,
            value: c.id
        }))
    ]
})

function triggerImport() {
    fileInput.value?.click()
}

function handleImportCategories(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
        categoriesStore.importCategories(target.files[0])
    }
}

function startAddCategory() {
    isEditingCategory.value = false
    editingCategoryId.value = null
    categoryForm.value = {
        name: '',
        icon: '🏷️',
        color: '#6366f1',
        type: 'expense',
        parent_id: null
    }
    showCategoryModal.value = true
}

function startAddSubCategory(parent: any) {
    isEditingCategory.value = false
    editingCategoryId.value = null
    categoryForm.value = {
        name: '',
        icon: '🏷️',
        color: parent.color,
        type: parent.type,
        parent_id: parent.id
    }
    showCategoryModal.value = true
}

function editCategory(cat: any) {
    isEditingCategory.value = true
    editingCategoryId.value = cat.id
    categoryForm.value = {
        name: cat.name,
        icon: cat.icon || '🏷️',
        color: cat.color || '#6366f1',
        type: cat.type || 'expense',
        parent_id: cat.parent_id
    }
    showCategoryModal.value = true
}

async function saveCategory(formData: any) {
    let success = false
    if (isEditingCategory.value && editingCategoryId.value) {
        success = await categoriesStore.updateCategory(editingCategoryId.value, formData)
    } else {
        success = await categoriesStore.createCategory(formData)
    }

    if (success) {
        showCategoryModal.value = false
    }
}

async function startDeleteCategory(cat: any) {
    isCheckingUsage.value = true
    try {
        const usage = await categoriesStore.getCategoryUsage(cat.id)
        if (usage && !usage.is_safe) {
            restrictionMessage.value = `This category cannot be deleted because:<br/><br/>` +
                usage.reasons.map((r: string) => `• ${r}`).join('<br/>') +
                `<br/><br/>Please resolve these dependencies before removing the category.`
            showDeleteRestrictedModal.value = true
        } else {
            categoryToDelete.value = cat
            showDeleteCategoryConfirm.value = true
        }
    } finally {
        isCheckingUsage.value = false
    }
}

function startDeleteFromModal() {
    const cat = categoriesStore.categories.find(c => c.id === editingCategoryId.value)
    if (cat) {
        showCategoryModal.value = false
        startDeleteCategory(cat)
    }
}

async function confirmDeleteCategory() {
    if (!categoryToDelete.value) return
    const success = await categoriesStore.deleteCategory(categoryToDelete.value.id)
    if (success) {
        showDeleteCategoryConfirm.value = false
        categoryToDelete.value = null
    }
}

// Expose open modal method
defineExpose({
    startAddCategory
})
</script>

<style scoped>
.premium-table :deep(tr) {
    transition: all 0.2s ease;
}

.premium-table :deep(tr:hover) {
    background: rgba(var(--v-theme-primary), 0.02) !important;
}

.action-btn {
    opacity: 0.6;
    transition: all 0.2s ease;
}

.action-btn:hover {
    opacity: 1;
    transform: scale(1.1);
}
</style>
