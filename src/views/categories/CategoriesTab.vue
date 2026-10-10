<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCategoriesStore } from '@/stores/finance/categories'
import {
    Search, Plus, Pencil, Trash2,
    Download, Upload, AlertCircle,
    BarChart3, TrendingDown, TrendingUp, Repeat, Inbox, Filter,
    ChevronLeft, ChevronRight, X
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
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

// Pagination State
const currentPage = ref(1)
const pageSize = ref(10)

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

// Filtered root categories based on type and search query
const filteredRootCategories = computed<any[]>(() => {
    let list = categoriesStore.rootCategories

    if (categoriesStore.searchFilter && categoriesStore.searchFilter !== 'all') {
        list = list.filter(c => c.type === categoriesStore.searchFilter)
    }

    if (categoriesStore.searchQuery && categoriesStore.searchQuery.trim()) {
        const q = categoriesStore.searchQuery.toLowerCase().trim()
        list = list.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(q)
            const children = categoriesStore.getChildren(c.id)
            const childMatch = children.some((child: any) => child.name.toLowerCase().includes(q))
            return nameMatch || childMatch
        })
    }

    return list
})

const totalPages = computed(() => {
    return Math.ceil(filteredRootCategories.value.length / pageSize.value) || 1
})

const paginatedRootCategories = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredRootCategories.value.slice(start, start + pageSize.value)
})

watch([() => categoriesStore.searchQuery, () => categoriesStore.searchFilter], () => {
    currentPage.value = 1
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
        color: parent.color || '#6366f1',
        type: parent.type || 'expense',
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

function getTypeBadge(type: string) {
    switch (type) {
        case 'expense':
            return { label: 'EXPENSE', bg: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/60' }
        case 'income':
            return { label: 'INCOME', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60' }
        case 'investment':
            return { label: 'INVESTMENT', bg: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60' }
        case 'transfer':
            return { label: 'TRANSFER', bg: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-900/60' }
        default:
            return { label: type?.toUpperCase() || 'OTHER', bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' }
    }
}

defineExpose({
    startAddCategory
})
</script>

<template>
    <div class="space-y-5">
        <!-- 1. STATS OVERVIEW: 5 Metric Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- Total Categories -->
            <WfCard
                variant="elevated"
                padding="md"
                radius="lg"
                class="cursor-pointer transition-all flex flex-col justify-between"
                :class="[
                    categoriesStore.searchFilter === 'all' ? 'ring-2 ring-wf-primary border-wf-primary/40' : 'hover:border-wf-border-subtle'
                ]"
                @click="categoriesStore.searchFilter = 'all'"
            >
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">Total</span>
                    <div class="w-8 h-8 rounded-wf-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary">
                        <BarChart3 class="w-4 h-4" />
                    </div>
                </div>
                <div>
                    <div class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary tabular-nums">
                        {{ categoriesStore.categoryStats.total }}
                    </div>
                    <span class="text-[11px] font-semibold text-wf-text-muted mt-0.5 block">Master Inventory</span>
                </div>
            </WfCard>

            <!-- Expenses -->
            <WfCard
                variant="elevated"
                padding="md"
                radius="lg"
                class="cursor-pointer transition-all flex flex-col justify-between"
                :class="[
                    categoriesStore.searchFilter === 'expense' ? 'ring-2 ring-wf-error border-wf-error/40' : 'hover:border-wf-border-subtle'
                ]"
                @click="categoriesStore.searchFilter = 'expense'"
            >
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">Expenses</span>
                    <div class="w-8 h-8 rounded-wf-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-wf-error">
                        <TrendingDown class="w-4 h-4" />
                    </div>
                </div>
                <div>
                    <div class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary tabular-nums" :class="{ 'text-wf-error': categoriesStore.searchFilter === 'expense' }">
                        {{ categoriesStore.categoryStats.expenses }}
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-wf-pill overflow-hidden mt-2">
                        <div
                            class="bg-wf-error h-full rounded-wf-pill transition-all duration-300"
                            :style="{ width: `${(categoriesStore.categoryStats.expenses / (categoriesStore.categoryStats.total || 1)) * 100}%` }"
                        />
                    </div>
                </div>
            </WfCard>

            <!-- Income -->
            <WfCard
                variant="elevated"
                padding="md"
                radius="lg"
                class="cursor-pointer transition-all flex flex-col justify-between"
                :class="[
                    categoriesStore.searchFilter === 'income' ? 'ring-2 ring-wf-success border-wf-success/40' : 'hover:border-wf-border-subtle'
                ]"
                @click="categoriesStore.searchFilter = 'income'"
            >
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">Income</span>
                    <div class="w-8 h-8 rounded-wf-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-wf-success">
                        <TrendingUp class="w-4 h-4" />
                    </div>
                </div>
                <div>
                    <div class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary tabular-nums" :class="{ 'text-wf-success': categoriesStore.searchFilter === 'income' }">
                        {{ categoriesStore.categoryStats.income }}
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-wf-pill overflow-hidden mt-2">
                        <div
                            class="bg-wf-success h-full rounded-wf-pill transition-all duration-300"
                            :style="{ width: `${(categoriesStore.categoryStats.income / (categoriesStore.categoryStats.total || 1)) * 100}%` }"
                        />
                    </div>
                </div>
            </WfCard>

            <!-- Investment -->
            <WfCard
                variant="elevated"
                padding="md"
                radius="lg"
                class="cursor-pointer transition-all flex flex-col justify-between"
                :class="[
                    categoriesStore.searchFilter === 'investment' ? 'ring-2 ring-amber-500 border-amber-500/40' : 'hover:border-wf-border-subtle'
                ]"
                @click="categoriesStore.searchFilter = 'investment'"
            >
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">Investment</span>
                    <div class="w-8 h-8 rounded-wf-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <TrendingUp class="w-4 h-4" />
                    </div>
                </div>
                <div>
                    <div class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary tabular-nums" :class="{ 'text-amber-600 dark:text-amber-400': categoriesStore.searchFilter === 'investment' }">
                        {{ categoriesStore.categoryStats.investment }}
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-wf-pill overflow-hidden mt-2">
                        <div
                            class="bg-amber-500 h-full rounded-wf-pill transition-all duration-300"
                            :style="{ width: `${(categoriesStore.categoryStats.investment / (categoriesStore.categoryStats.total || 1)) * 100}%` }"
                        />
                    </div>
                </div>
            </WfCard>

            <!-- Transfers -->
            <WfCard
                variant="elevated"
                padding="md"
                radius="lg"
                class="cursor-pointer transition-all flex flex-col justify-between"
                :class="[
                    categoriesStore.searchFilter === 'transfer' ? 'ring-2 ring-sky-500 border-sky-500/40' : 'hover:border-wf-border-subtle'
                ]"
                @click="categoriesStore.searchFilter = 'transfer'"
            >
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold text-wf-text-muted uppercase tracking-wider block">Transfers</span>
                    <div class="w-8 h-8 rounded-wf-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Repeat class="w-4 h-4" />
                    </div>
                </div>
                <div>
                    <div class="text-xl sm:text-2xl font-bold tracking-tight text-wf-text-primary tabular-nums" :class="{ 'text-sky-600 dark:text-sky-400': categoriesStore.searchFilter === 'transfer' }">
                        {{ categoriesStore.categoryStats.transfer }}
                    </div>
                    <span class="text-[11px] font-semibold text-wf-text-muted mt-0.5 block">Linked movements</span>
                </div>
            </WfCard>
        </div>

        <!-- 2. TOOLBAR & ACTIONS -->
        <WfCard variant="flat" padding="sm" radius="lg" class="border border-wf-border bg-wf-surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 flex-1 max-w-lg">
                <!-- Type Filter Dropdown -->
                <div class="flex items-center h-8 px-2.5 bg-wf-surface border border-wf-border rounded-wf-sm text-wf-text-primary focus-within:ring-1 focus-within:ring-wf-primary focus-within:border-wf-primary transition-all shadow-2xs gap-1.5 w-36 shrink-0">
                    <Filter class="w-3.5 h-3.5 text-wf-text-muted shrink-0 pointer-events-none" />
                    <select
                        v-model="categoriesStore.searchFilter"
                        class="w-full h-full bg-transparent text-xs font-semibold text-wf-text-primary focus:outline-none cursor-pointer"
                    >
                        <option value="all">All Types</option>
                        <option value="expense">Expenses</option>
                        <option value="income">Income</option>
                        <option value="investment">Investment</option>
                        <option value="transfer">Transfer</option>
                    </select>
                </div>

                <!-- Search Input -->
                <div class="flex-1 flex items-center h-8 px-2.5 bg-wf-surface border border-wf-border rounded-wf-sm text-wf-text-primary focus-within:ring-1 focus-within:ring-wf-primary focus-within:border-wf-primary transition-all shadow-2xs gap-2">
                    <Search class="w-3.5 h-3.5 text-wf-text-muted shrink-0 pointer-events-none" />
                    <input
                        v-model="categoriesStore.searchQuery"
                        type="text"
                        placeholder="Search category names..."
                        class="w-full h-full bg-transparent text-xs text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none"
                    />
                    <button
                        v-if="categoriesStore.searchQuery"
                        @click="categoriesStore.searchQuery = ''"
                        class="text-wf-text-muted hover:text-wf-text-primary p-0.5 rounded-wf-xs transition-colors flex items-center justify-center shrink-0"
                        title="Clear search"
                    >
                        <X class="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 shrink-0">
                <WfButton
                    variant="outline"
                    size="sm"
                    @click="triggerImport"
                    class="h-8 px-3 text-xs font-semibold shadow-2xs"
                >
                    <Upload class="w-3.5 h-3.5 mr-1" />
                    <span>Import</span>
                </WfButton>

                <WfButton
                    variant="outline"
                    size="sm"
                    @click="categoriesStore.exportCategories"
                    class="h-8 px-3 text-xs font-semibold shadow-2xs"
                >
                    <Download class="w-3.5 h-3.5 mr-1" />
                    <span>Export</span>
                </WfButton>

                <WfButton
                    variant="primary"
                    size="sm"
                    @click="startAddCategory"
                    class="h-8 px-3.5 text-xs font-semibold shadow-2xs"
                >
                    <Plus class="w-3.5 h-3.5 mr-1" />
                    <span>Add Category</span>
                </WfButton>
            </div>
        </WfCard>

        <!-- Invisible file input for JSON import -->
        <input type="file" ref="fileInput" accept=".json" class="hidden" @change="handleImportCategories" />

        <!-- 3. CATEGORIES TREE TABLE (Paginated) -->
        <WfCard variant="flat" padding="none" radius="lg" class="border border-wf-border bg-wf-surface overflow-hidden flex flex-col">
            <!-- Loading State -->
            <div v-if="categoriesStore.loading" class="p-6 space-y-3">
                <div v-for="i in 5" :key="`cat-skel-${i}`" class="h-12 rounded-wf-md bg-wf-surface-variant animate-pulse" />
            </div>

            <!-- Table Layout -->
            <div v-else-if="filteredRootCategories.length > 0" class="overflow-x-auto flex-1 min-h-0">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="border-b border-wf-border bg-wf-surface-variant/40 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
                            <th class="py-3 px-4 w-[280px]">Category</th>
                            <th class="py-3 px-3 w-[120px]">Type</th>
                            <th class="py-3 px-3">Sub-Categories / Folders</th>
                            <th class="py-3 px-4 text-right w-[100px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-wf-border-subtle">
                        <tr
                            v-for="item in paginatedRootCategories"
                            :key="item.id"
                            class="hover:bg-wf-surface-variant/40 transition-colors group"
                        >
                            <!-- Name Column with Icon Avatar -->
                            <td class="py-3 px-4">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-9 h-9 rounded-wf-md flex items-center justify-center text-base border shrink-0 transition-transform group-hover:scale-105"
                                        :style="{
                                            backgroundColor: `${item.color || '#6366f1'}15`,
                                            borderColor: `${item.color || '#6366f1'}35`
                                        }"
                                    >
                                        <span>{{ item.icon || '🏷️' }}</span>
                                    </div>
                                    <div class="min-w-0">
                                        <span class="font-bold text-xs text-wf-text-primary block truncate" :title="item.name">
                                            {{ item.name }}
                                        </span>
                                        <span v-if="item.parent_id" class="text-[10px] text-wf-text-muted block">
                                            Sub-category
                                        </span>
                                    </div>
                                </div>
                            </td>

                            <!-- Type Column -->
                            <td class="py-3 px-3">
                                <span
                                    class="inline-flex items-center px-2 py-0.5 rounded-wf-sm text-[10px] font-bold border"
                                    :class="getTypeBadge(item.type).bg"
                                >
                                    {{ getTypeBadge(item.type).label }}
                                </span>
                            </td>

                            <!-- Subcategories Column -->
                            <td class="py-3 px-3">
                                <div class="flex flex-wrap items-center gap-1.5">
                                    <template v-if="categoriesStore.getChildren(item.id).length > 0">
                                        <button
                                            v-for="child in categoriesStore.getChildren(item.id).slice(0, 5)"
                                            :key="child.id"
                                            @click.stop="editCategory(child)"
                                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-sm text-[11px] font-medium bg-wf-surface-variant/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-wf-border hover:border-wf-primary/40 text-wf-text-primary transition-all cursor-pointer"
                                        >
                                            <span class="text-xs">{{ child.icon }}</span>
                                            <span>{{ child.name }}</span>
                                        </button>

                                        <span
                                            v-if="categoriesStore.getChildren(item.id).length > 5"
                                            class="text-[10px] font-bold text-wf-primary px-1"
                                        >
                                            +{{ categoriesStore.getChildren(item.id).length - 5 }}
                                        </span>
                                    </template>
                                    <span v-else class="text-[11px] text-wf-text-muted italic mr-1">
                                        0 sub-categories
                                    </span>

                                    <!-- Add New Subcategory Button -->
                                    <button
                                        @click.stop="startAddSubCategory(item)"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-wf-sm text-[10px] font-bold text-wf-success bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900/60 transition-colors"
                                        title="Add sub-category"
                                    >
                                        <Plus class="w-3 h-3" />
                                        <span>New</span>
                                    </button>
                                </div>
                            </td>

                            <!-- Actions Column -->
                            <td class="py-3 px-4 text-right">
                                <div class="flex items-center justify-end gap-1">
                                    <button
                                        @click.stop="editCategory(item)"
                                        class="p-1 rounded-wf-sm text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                                        title="Edit category"
                                    >
                                        <Pencil class="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        @click.stop="startDeleteCategory(item)"
                                        :disabled="isCheckingUsage && categoryToDelete?.id === item.id"
                                        class="p-1 rounded-wf-sm text-wf-text-muted hover:text-wf-error hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                                        title="Delete category"
                                    >
                                        <Trash2 class="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Empty State -->
            <div v-else class="p-12 text-center flex flex-col items-center justify-center text-wf-text-muted">
                <Inbox class="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                <h3 class="text-xs font-bold text-wf-text-primary">No categories found</h3>
                <p class="text-[11px] text-wf-text-muted mt-0.5">Try adjusting your filters or create a new category.</p>
            </div>

            <!-- Pagination Footer -->
            <div
                v-if="filteredRootCategories.length > 0"
                class="p-3 border-t border-wf-border bg-wf-surface-variant/30 flex items-center justify-between text-xs shrink-0"
            >
                <span class="text-[11px] text-wf-text-secondary font-medium">
                    Showing {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredRootCategories.length) }} of {{ filteredRootCategories.length }} categories
                </span>
                <div class="flex items-center gap-2">
                    <span class="text-[11px] text-wf-text-secondary font-semibold mr-1">
                        Page {{ currentPage }} of {{ totalPages }}
                    </span>
                    <button
                        :disabled="currentPage <= 1"
                        @click="currentPage--"
                        class="p-1.5 rounded-wf-sm border border-wf-border text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        title="Previous page"
                    >
                        <ChevronLeft class="w-3.5 h-3.5" />
                    </button>
                    <button
                        :disabled="currentPage >= totalPages"
                        @click="currentPage++"
                        class="p-1.5 rounded-wf-sm border border-wf-border text-wf-text-secondary hover:text-wf-primary hover:bg-wf-surface transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        title="Next page"
                    >
                        <ChevronRight class="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </WfCard>

        <!-- Category Create/Edit Modal -->
        <CategoryModal
            v-model:show="showCategoryModal"
            :is-editing="isEditingCategory"
            :initial-form="categoryForm"
            :parent-options="parentOptions"
            :categories="categoriesStore.categories"
            :loading="categoriesStore.loading"
            @save="saveCategory"
            @delete="startDeleteFromModal"
        />

        <!-- Delete Confirmation Modal -->
        <WfModal
            :model-value="showDeleteCategoryConfirm"
            @update:model-value="showDeleteCategoryConfirm = $event"
            max-width="sm"
        >
            <div class="text-center py-2 space-y-4">
                <div class="w-12 h-12 rounded-wf-pill bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-wf-error mx-auto">
                    <AlertCircle class="w-6 h-6" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-wf-text-primary">Delete Category?</h3>
                    <p class="text-xs text-wf-text-secondary mt-1 max-w-xs mx-auto">
                        Existing transactions will become <strong class="text-wf-text-primary">uncategorized</strong>. This action is permanent and affects your financial history.
                    </p>
                </div>
                <div class="flex items-center justify-center gap-3 pt-2">
                    <WfButton
                        variant="ghost"
                        size="sm"
                        @click="showDeleteCategoryConfirm = false"
                    >
                        No, Keep It
                    </WfButton>
                    <WfButton
                        variant="danger"
                        size="sm"
                        @click="confirmDeleteCategory"
                    >
                        Yes, Delete
                    </WfButton>
                </div>
            </div>
        </WfModal>

        <!-- Delete Restricted Modal -->
        <WfModal
            :model-value="showDeleteRestrictedModal"
            @update:model-value="showDeleteRestrictedModal = $event"
            max-width="sm"
        >
            <div class="text-center py-2 space-y-4">
                <div class="w-12 h-12 rounded-wf-pill bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 mx-auto">
                    <AlertCircle class="w-6 h-6" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-wf-text-primary">Notice</h3>
                    <div class="text-xs text-wf-text-secondary mt-2 text-left bg-wf-surface-variant/50 p-3 rounded-wf-md border border-wf-border" v-html="restrictionMessage"></div>
                </div>
                <div class="pt-2">
                    <WfButton
                        variant="primary"
                        size="sm"
                        block
                        @click="showDeleteRestrictedModal = false"
                    >
                        Understand
                    </WfButton>
                </div>
            </div>
        </WfModal>
    </div>
</template>
