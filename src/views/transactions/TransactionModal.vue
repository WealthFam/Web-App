<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useCurrency } from '@/composables/useCurrency'
import {
    CheckCircle2, X, Pencil, Plus, Loader2,
    ArrowLeftRight, Search, Link, SearchX, LineChart, IndianRupee, Calendar,
    FileText, Paperclip, ExternalLink, Trash2, Link2, MapPin,
    FileImage, FileVideo, Music, FileCode, FileArchive, Fingerprint, ShieldCheck, Receipt, Scale, Folder,
    FileSpreadsheet, Presentation, 
} from 'lucide-vue-next'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import WfModal from '@/components/ui/WfModal.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfSelect from '@/components/ui/WfSelect.vue'
import WfAlert from '@/components/ui/WfAlert.vue'

const props = defineProps<{
    isOpen: boolean
    isEditing: boolean
    form: any
    accounts: any[]
    categories: any[]
    budgets: any[]
    expenseGroups: any[]
    potentialMatches: any[]
    isSearchingMatches: boolean
    matchesSearched: boolean
}>()

const emit = defineEmits(['close', 'submit', 'findMatches', 'selectMatch'])

const { formatAmount } = useCurrency()
// Date picker theme follows the app theme (data-theme attr / .dark class), sampled when the modal opens
const isDark = ref(false)
watch(() => props.isOpen, (open) => {
    if (open) {
        const root = document.documentElement
        isDark.value = root.dataset.theme === 'dark' || root.classList.contains('dark')
    }
}, { immediate: true })

function toggleMatch(match: any) {
    if (localForm.linked_transaction_id === match.id) {
        localForm.linked_transaction_id = ''
    } else {
        localForm.linked_transaction_id = match.id
        localForm.is_transfer = true
        localForm.exclude_from_reports = true
    }
}

// Local state to avoid prop mutation

const localForm = reactive({ ...props.form })

watch(() => props.isOpen, (next) => {
    if (next) {
        Object.assign(localForm, props.form)
    }
})

// Deep watch on props.form to keep local state in sync if parent changes it
watch(() => props.form, (newForm) => {
    Object.assign(localForm, newForm)
}, { deep: true })

// Document Management
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'

const notification = useNotificationStore()
const attachedDocs = ref<any[]>([])
const loadingDocs = ref(false)

// Vault picker for linking existing docs
const vaultPickerOpen = ref(false)
const vaultPickerSearch = ref('')
const vaultPickerResults = ref<any[]>([])
const vaultPickerLoading = ref(false)
let vaultPickerTimeout: ReturnType<typeof setTimeout> | null = null

async function searchVaultDocs(q: string) {
    vaultPickerLoading.value = true
    try {
        // When q is empty, list all root-level files; when typing, use backend search (spans all folders)
        const params = q.trim()
            ? { search: q.trim(), limit: 20 }
            : { limit: 20 }
        const res = await financeApi.getDocuments(params)
        const all: any[] = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || [])
        vaultPickerResults.value = all.filter(d => !d.is_folder)
    } catch { vaultPickerResults.value = [] }
    finally { vaultPickerLoading.value = false }
}

function onVaultPickerInput() {
    if (vaultPickerTimeout) clearTimeout(vaultPickerTimeout)
    vaultPickerTimeout = setTimeout(() => searchVaultDocs(vaultPickerSearch.value), 300)
}

async function linkVaultDoc(doc: any) {
    if (!localForm.id) return
    try {
        await financeApi.linkDocToTransaction(doc.id, localForm.id)
        notification.success(`"${doc.filename}" linked to this transaction`)
        vaultPickerOpen.value = false
        vaultPickerSearch.value = ''
        fetchAttachedDocs()
    } catch { notification.error('Failed to link document') }
}

function openVaultPicker() {
    vaultPickerOpen.value = true
    vaultPickerSearch.value = ''
    searchVaultDocs('')
}

function detectLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            localForm.latitude = pos.coords.latitude
            localForm.longitude = pos.coords.longitude
            if (!localForm.location_name) {
                localForm.location_name = `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
            }
            notification.success('Current location detected')
        }, () => {
            notification.error('Could not access GPS location')
        })
    } else {
        notification.error('Geolocation not supported by browser')
    }
}

async function fetchAttachedDocs() {
    if (!props.isEditing || !localForm.id) {
        attachedDocs.value = []
        return
    }
    loadingDocs.value = true
    try {
        const res = await financeApi.getDocuments({ transaction_id: localForm.id })
        attachedDocs.value = res.data.data || res.data || []
    } catch (e) {
        console.error('Failed to fetch docs', e)
    } finally {
        loadingDocs.value = false
    }
}

watch(() => props.isOpen, (next) => {
    if (next && props.isEditing) fetchAttachedDocs()
})

async function handleFileUpload(e: any) {
    const file = e.target.files[0]
    if (!file || !localForm.id) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('transaction_id', localForm.id)
    formData.append('is_shared', 'true')

    try {
        await financeApi.uploadDocument(formData)
        notification.success('Document attached')
        fetchAttachedDocs()
    } catch (e) {
        notification.error('Failed to upload document')
    }
}

async function detachDoc(docId: string) {
    try {
        await financeApi.deleteDocument(docId)
        notification.success('Document detached')
        fetchAttachedDocs()
    } catch (e) {
        notification.error('Failed to detach document')
    }
}

async function openDoc(docId: string) {
    try {
        const doc = attachedDocs.value.find(d => d.id === docId)
        const res = await financeApi.getDocumentBlob(docId)
        const blob = new Blob([res.data], { type: res.headers['content-type'] || doc?.mime_type || 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = doc?.filename || 'document'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (e) {
        notification.error('Failed to open document')
    }
}

const categoryOptions = computed(() => {
    const list: any[] = []

    // Helper to build hierarchy manually if not provided as tree
    const buildTree = (flatList: any[]) => {
        const lookup = new Map();
        const roots: any[] = [];

        // First pass: put everything in a map
        flatList.forEach(c => {
            lookup.set(c.id || c.name, { ...c, subcategories: [] });
        });

        // Second pass: link children to parents
        flatList.forEach(c => {
            const parentKey = c.parent_id;
            if (parentKey && lookup.has(parentKey)) {
                lookup.get(parentKey).subcategories.push(lookup.get(c.id || c.name));
            } else if (!parentKey) {
                roots.push(lookup.get(c.id || c.name));
            } else {
                // If parent_id exists but parent not found, treat as root to avoid losing it
                roots.push(lookup.get(c.id || c.name));
            }
        });
        return roots;
    }

    const flatten = (cats: any[], depth = 0) => {
        // Sort alphabetically to maintain order
        const sorted = [...cats].sort((a, b) => a.name.localeCompare(b.name))

        sorted.forEach(c => {
            const prefix = depth > 0 ? '　'.repeat(depth) + '└ ' : ''
            list.push({
                title: `${prefix}${c.icon || '🏷️'} ${c.name}`,
                value: c.name
            })
            if (c.subcategories && c.subcategories.length > 0) {
                flatten(c.subcategories, depth + 1)
            }
        })
    }

    // Check if we already have a tree structure (some roots have subcategories)
    const hasTreeStructure = props.categories.some(c => c.subcategories && c.subcategories.length > 0)
    const tree = hasTreeStructure ? props.categories.filter(c => !c.parent_id) : buildTree(props.categories)

    flatten(tree)

    if (!list.find(o => o.value === 'Uncategorized')) {
        list.push({ title: '🏷️ Uncategorized', value: 'Uncategorized' })
    }
    return list
})

const accountOptions = computed(() => {
    return props.accounts.map(a => ({ title: a.name, value: a.id }))
})

const expenseGroupOptions = computed(() => {
    return [{ title: 'None', value: '' }, ...props.expenseGroups.map(g => ({ title: g.name, value: g.id }))]
})

const currentCategoryBudget = computed(() => {
    if (!localForm.category || localForm.is_transfer) return null
    return props.budgets.find(b => b.category === localForm.category) || null
})

// Auto-detect Credit Card Payment
watch(() => localForm.category, (newVal) => {
    if (!newVal) return;

    // Don't auto-toggle if we're just loading an existing transaction's category
    if (props.isEditing && newVal === props.form.category) return;
    
    // Don't auto-toggle for 'Money In' (Credit) transactions
    if (localForm.type === 'CREDIT') return;

    // Check if category implies credit card payment
    const lower = newVal.toLowerCase();
    if (lower.includes('credit card') || lower.includes('cc payment') || lower.includes('card payment')) {
        // Find if we have credit card accounts
        const ccAccounts = props.accounts.filter(a => a.type === 'CREDIT_CARD');

        if (ccAccounts.length > 0) {
            // Suggest Transfer mode (Safe to mutate localForm now)
            if (!localForm.is_transfer) {
                localForm.is_transfer = true;

                // If only one card, auto-select it
                if (ccAccounts.length === 1) {
                    localForm.to_account_id = ccAccounts[0].id;
                }
            }
        }
    }
})

const isFormValid = computed(() => {
    const basicValid = Number(localForm.amount) > 0 && !!localForm.date && !!localForm.account_id && !!localForm.category
    if (localForm.is_transfer) {
        return basicValid && !!localForm.to_account_id
    }
    return basicValid
})

function handleSubmit() {
    if (!isFormValid.value) return
    emit('submit', { ...localForm }) // Emit a clone of the local result
}

function handleClose() {
    emit('close')
}

function getIcon(item: any) {
    if (!item) return FileText
    if (item.is_folder) return Folder

    const filename = (item.filename || '').toLowerCase()
    const mt = (item.mime_type || '').toLowerCase()

    if (item.file_type === 'INVOICE') return Receipt
    if (item.file_type === 'POLICY') return ShieldCheck
    if (item.file_type === 'TAX') return Scale
    if (item.file_type === 'IDENTITY') return Fingerprint

    if (filename.endsWith('.pdf') || mt === 'application/pdf') return FileText
    if (filename.endsWith('.xls') || filename.endsWith('.xlsx') || filename.endsWith('.csv') ||
        mt.includes('spreadsheet') || mt.includes('excel') || mt.includes('csv') || mt.includes('sheet')) return FileSpreadsheet
    if (filename.endsWith('.ppt') || filename.endsWith('.pptx') ||
        mt.includes('presentation') || mt.includes('powerpoint')) return Presentation
    if (filename.endsWith('.doc') || filename.endsWith('.docx') || mt.includes('word') || mt.includes('msword')) return FileText

    if (mt.startsWith('image/')) return FileImage
    if (mt.startsWith('video/')) return FileVideo
    if (mt.startsWith('audio/')) return Music
    if (mt.includes('javascript') || mt.includes('json') || mt.includes('html') || mt.includes('css')) return FileCode
    if (mt.includes('zip') || mt.includes('rar') || mt.includes('tar') || mt.includes('7z') || mt.includes('archive')) return FileArchive
    return FileText
}

</script>

<template>
    <WfModal :model-value="isOpen" @update:model-value="handleClose" max-width="2xl">
        <template #header>
            <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-primary border border-wf-border-subtle shrink-0">
                    <component :is="isEditing ? Pencil : Plus" class="w-4 h-4 text-wf-primary" aria-hidden="true" />
                </div>
                <div>
                    <h3 class="text-sm sm:text-base font-bold text-wf-text-primary leading-tight">
                        {{ isEditing ? 'Edit Transaction' : 'New Transaction' }}
                    </h3>
                    <p class="text-[11px] text-wf-text-muted">
                        {{ isEditing ? 'Update transaction details and category' : 'Record a new spending or income' }}
                    </p>
                </div>
            </div>
        </template>

        <form @submit.prevent="handleSubmit" class="max-h-[74vh] overflow-y-auto pr-1 pb-2 space-y-3">
            <!-- Row 1: Amount, Type, Date & Time -->
            <div class="grid grid-cols-12 gap-2.5">
                <div class="col-span-12 sm:col-span-5">
                    <WfInput v-model="localForm.amount" label="Amount" required type="number" placeholder="0.00">
                        <template #prepend><IndianRupee :size="14" class="text-wf-primary" /></template>
                    </WfInput>
                </div>
                <div class="col-span-6 sm:col-span-3">
                    <WfSelect v-model="localForm.type" label="Type" :teleport="true"
                        :items="[{ title: 'Debit', value: 'DEBIT' }, { title: 'Credit', value: 'CREDIT' }]" />
                </div>
                <div class="col-span-6 sm:col-span-4">
                    <div class="w-full flex flex-col gap-1.5 text-left">
                        <label class="text-xs font-semibold text-wf-text-secondary uppercase tracking-wider select-none">
                            Date &amp; Time<span class="text-wf-error ml-0.5">*</span>
                        </label>
                        <div class="date-picker-wrapper">
                            <VueDatePicker v-model="localForm.date" :dark="isDark" auto-apply
                                :enable-time-picker="true" model-type="yyyy-MM-dd'T'HH:mm"
                                format="dd MMM yyyy HH:mm" placeholder="Date & Time *" :teleport="true"
                                input-class-name="premium-date-input">
                                <template #trigger>
                                    <button type="button"
                                        class="w-full h-10 flex items-center gap-2 px-3 text-sm text-left rounded-wf-md border border-wf-border bg-wf-surface text-wf-text-primary hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wf-primary/20 focus-visible:border-wf-primary transition-all">
                                        <Calendar :size="14" class="text-wf-primary shrink-0" aria-hidden="true" />
                                        <span class="truncate">{{ localForm.date ? new Date(localForm.date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Select date' }}</span>
                                    </button>
                                </template>
                            </VueDatePicker>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Row 2: Merchant & Description -->
            <div class="grid grid-cols-12 gap-2.5">
                <div class="col-span-12 sm:col-span-6">
                    <WfInput v-model="localForm.recipient" label="Merchant / Payee" placeholder="Who did you pay?" />
                </div>
                <div class="col-span-12 sm:col-span-6">
                    <WfInput v-model="localForm.description" label="Description" placeholder="What was this for?" />
                </div>
            </div>

            <!-- Row 3: Account & Category -->
            <div class="grid grid-cols-12 gap-2.5">
                <div class="col-span-12 sm:col-span-6">
                    <WfSelect v-model="localForm.account_id" label="Account" required placeholder="Select account" :items="accountOptions" :teleport="true" />
                </div>
                <div class="col-span-12 sm:col-span-6">
                    <WfSelect v-model="localForm.category" label="Category" required placeholder="Select Category" searchable :items="categoryOptions" :teleport="true" />
                </div>
            </div>

            <!-- Row 4: Life Event & Location -->
            <div class="grid grid-cols-12 gap-2.5">
                <div class="col-span-12 sm:col-span-6">
                    <WfSelect v-model="localForm.expense_group_id" label="Life Event / Group (Optional)" :items="expenseGroupOptions" :teleport="true" />
                </div>
                <div class="col-span-12 sm:col-span-6">
                    <WfInput v-model="localForm.location_name" label="Location (Optional)" placeholder="e.g. Indiranagar, Bengaluru">
                        <template #prepend><MapPin :size="14" class="text-wf-primary" /></template>
                        <template #append>
                            <button type="button" title="Detect current GPS location" @click="detectLocation"
                                class="text-[11px] font-semibold text-wf-primary bg-wf-primary/10 hover:opacity-80 px-2 py-0.5 rounded-wf-sm">
                                Auto GPS
                            </button>
                        </template>
                    </WfInput>
                </div>
            </div>

            <!-- Row 5: Compact Toggles -->
            <div class="flex flex-wrap items-center justify-between gap-3 p-2 rounded-wf-md border border-wf-border bg-wf-surface-variant/30 text-xs">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                    <input v-model="localForm.is_transfer" type="checkbox" role="switch" class="accent-wf-primary h-3.5 w-3.5 rounded" />
                    <span class="font-semibold text-wf-text-primary">Internal Transfer</span>
                    <span class="text-[10px] text-wf-text-muted hidden sm:inline">(between own accounts)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer select-none">
                    <input v-model="localForm.exclude_from_reports" type="checkbox" role="switch" class="accent-wf-error h-3.5 w-3.5 rounded" />
                    <span class="font-semibold text-wf-text-primary">Hide from Reports</span>
                    <span class="text-[10px] text-wf-text-muted hidden sm:inline">(exclude from analytics)</span>
                </label>
            </div>

            <!-- Transfer Matching -->
            <div v-if="localForm.is_transfer" class="p-2.5 rounded-wf-md bg-wf-primary/5 border border-wf-primary/10 space-y-2.5">
                <div class="flex items-center gap-2">
                    <ArrowLeftRight :size="14" class="text-wf-primary" aria-hidden="true" />
                    <span class="text-xs font-bold uppercase tracking-wider text-wf-primary">Match Transfer Pair</span>
                </div>

                <div class="grid grid-cols-12 gap-2.5 items-end">
                    <div class="col-span-12 sm:col-span-8">
                        <WfSelect v-model="localForm.to_account_id" label="Destination Account" required placeholder="Select account" :items="accountOptions" :teleport="true" />
                    </div>
                    <div class="col-span-12 sm:col-span-4">
                        <WfButton block :loading="isSearchingMatches" @click="emit('findMatches', localForm)">Scan Matches</WfButton>
                    </div>
                </div>

                <div v-if="matchesSearched" class="pt-1">
                    <p class="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-wf-text-muted">
                        <Search :size="13" aria-hidden="true" />
                        Found {{ potentialMatches.length }} matches within 3-day window
                    </p>

                    <div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                        <button v-for="match in potentialMatches" :key="match.id" type="button"
                            class="flex items-center justify-between gap-3 p-2 text-left rounded-wf-md border transition-colors"
                            :class="localForm.linked_transaction_id === match.id
                                ? 'border-wf-primary bg-wf-primary/10'
                                : 'border-wf-border bg-wf-surface hover:border-wf-primary/40'"
                            :aria-pressed="localForm.linked_transaction_id === match.id"
                            @click="toggleMatch(match)">
                            <span class="flex items-center gap-2 min-w-0">
                                <span class="w-6 h-6 shrink-0 rounded-full bg-wf-primary text-white flex items-center justify-center"><Link :size="12" /></span>
                                <span class="min-w-0">
                                    <span class="block text-xs font-semibold text-wf-text-primary truncate">{{ match.description }}</span>
                                    <span class="block text-[10px] text-wf-text-muted">{{ match.date }}</span>
                                </span>
                            </span>
                            <span class="flex items-center gap-2 shrink-0">
                                <span class="font-mono tabular-nums text-xs font-bold text-wf-text-primary">{{ formatAmount(match.amount) }}</span>
                                <CheckCircle2 v-if="localForm.linked_transaction_id === match.id" :size="16" class="text-wf-primary" aria-label="Selected" />
                                <span v-else class="w-4 h-4 rounded-full border border-wf-border" aria-hidden="true"></span>
                            </span>
                        </button>

                        <div v-if="potentialMatches.length === 0" class="text-center py-2.5 text-wf-text-muted">
                            <SearchX :size="18" class="mx-auto mb-1 text-wf-text-muted" aria-hidden="true" />
                            <div class="text-xs font-semibold">No matching txns found</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Budget Alert -->
            <WfAlert v-if="currentCategoryBudget" variant="info" class="py-1 px-2.5">
                <div class="flex items-center justify-between w-full gap-3 text-xs font-semibold">
                    <span class="flex items-center gap-1.5"><LineChart :size="13" aria-hidden="true" /> {{ currentCategoryBudget.name }} Budget</span>
                    <span class="font-mono tabular-nums text-xs">Remaining: {{ formatAmount(currentCategoryBudget.remaining) }}</span>
                </div>
            </WfAlert>

            <!-- Document Vault Section -->
            <div v-if="isEditing" class="pt-2 border-t border-wf-border-subtle space-y-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                        <Paperclip :size="14" class="text-wf-text-secondary" aria-hidden="true" />
                        <span class="text-xs font-bold uppercase tracking-wider text-wf-text-secondary">Receipts &amp; Documents</span>
                        <span v-if="attachedDocs.length" class="text-[10px] font-bold px-1.5 py-0.2 rounded-wf-pill bg-wf-primary/10 text-wf-primary">
                            {{ attachedDocs.length }}
                        </span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button type="button" class="px-2 py-0.5 text-xs font-medium text-wf-primary hover:bg-wf-primary/10 rounded-wf-sm transition-colors flex items-center gap-1" @click="($refs.txFileInput as HTMLInputElement).click()">
                            <Plus :size="12" /> Upload
                        </button>
                        <button type="button" class="px-2 py-0.5 text-xs font-medium text-wf-text-secondary hover:bg-wf-surface-variant rounded-wf-sm transition-colors flex items-center gap-1" @click="openVaultPicker">
                            <Link2 :size="12" /> Link Vault
                        </button>
                    </div>
                    <input type="file" ref="txFileInput" class="hidden" aria-label="Upload document" @change="handleFileUpload" />
                </div>

                <!-- Vault Picker panel -->
                <div v-if="vaultPickerOpen" class="p-2.5 rounded-wf-md border border-wf-secondary/30 bg-wf-secondary/5">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">Pick from vault</span>
                        <button type="button" aria-label="Close vault picker" class="p-0.5 rounded text-wf-text-muted hover:bg-wf-surface-variant" @click="vaultPickerOpen = false"><X :size="13" /></button>
                    </div>
                    <WfInput v-model="vaultPickerSearch" placeholder="Search vault documents…" class="mb-2"
                        @update:model-value="onVaultPickerInput">
                        <template #prepend><Search :size="13" /></template>
                        <template #append><Loader2 v-if="vaultPickerLoading" :size="13" class="animate-spin" /></template>
                    </WfInput>
                    <div v-if="vaultPickerResults.length" class="max-h-36 overflow-y-auto rounded-wf-sm border border-wf-border divide-y divide-wf-divider">
                        <button v-for="doc in vaultPickerResults" :key="doc.id" type="button"
                            class="w-full flex items-center gap-2 p-1.5 text-left hover:bg-wf-surface-variant" @click="linkVaultDoc(doc)">
                            <span class="w-6 h-6 shrink-0 rounded bg-wf-surface-variant overflow-hidden flex items-center justify-center">
                                <img v-if="doc.thumbnail_path" :src="financeApi.getDocumentThumbnailUrl(doc.id)" :alt="doc.filename" class="w-full h-full object-cover" />
                                <component v-else :is="getIcon(doc)" :size="13" class="text-wf-text-muted" />
                            </span>
                            <span class="flex-1 min-w-0">
                                <span class="block text-xs font-semibold text-wf-text-primary truncate">{{ doc.filename }}</span>
                            </span>
                            <span class="text-[10px] font-bold px-1 py-0.5 rounded bg-wf-primary/10 text-wf-primary">LINK</span>
                        </button>
                    </div>
                    <div v-else-if="!vaultPickerLoading" class="text-[11px] text-wf-text-muted text-center py-2">No documents found</div>
                </div>

                <!-- Attached docs list -->
                <div v-if="attachedDocs.length > 0" class="p-1 rounded-wf-md border border-wf-border bg-wf-surface">
                    <ul class="space-y-0.5">
                        <li v-for="doc in attachedDocs" :key="doc.id" class="flex items-center gap-2.5 p-1.5 rounded hover:bg-wf-surface-variant">
                            <span class="w-6 h-6 shrink-0 rounded bg-wf-surface-variant overflow-hidden flex items-center justify-center">
                                <img v-if="doc.thumbnail_path" :src="financeApi.getDocumentThumbnailUrl(doc.id)" :alt="doc.filename" class="w-full h-full object-cover" />
                                <component v-else :is="getIcon(doc)" :size="13" class="text-wf-text-muted" />
                            </span>
                            <span class="flex-1 min-w-0 text-xs font-semibold text-wf-text-primary truncate">{{ doc.filename }}</span>
                            <button type="button" aria-label="Open document" class="p-1 rounded text-wf-primary hover:bg-wf-primary/10" @click="openDoc(doc.id)"><ExternalLink :size="13" /></button>
                            <button type="button" aria-label="Detach document" class="p-1 rounded text-wf-error hover:bg-wf-error/10" @click="detachDoc(doc.id)"><Trash2 :size="13" /></button>
                        </li>
                    </ul>
                </div>
            </div>
        </form>

        <template #footer>
            <div class="flex items-center justify-between w-full">
                <WfButton variant="ghost" size="sm" @click="handleClose">
                    Cancel
                </WfButton>
                <WfButton variant="primary" size="sm" @click="handleSubmit" :disabled="!isFormValid">
                    <CheckCircle2 class="w-4 h-4 mr-1.5" />
                    <span>{{ isEditing ? 'Update Entry' : 'Create Transaction' }}</span>
                </WfButton>
            </div>
        </template>
    </WfModal>
</template>

<style scoped>
.date-picker-wrapper :deep(.dp__input_wrap) {
    display: none;
}
</style>

<style>
/* DatePicker theming via Aether tokens (teleported, so intentionally unscoped) */
.dp__theme_light,
.dp__theme_dark {
    --dp-background-color: var(--wf-color-surface);
    --dp-text-color: var(--wf-color-text-primary);
    --dp-hover-color: var(--wf-color-surface-variant);
    --dp-hover-text-color: var(--wf-color-text-primary);
    --dp-hover-icon-color: var(--wf-color-text-primary);
    --dp-primary-color: var(--wf-color-primary);
    --dp-primary-text-color: #ffffff;
    --dp-secondary-color: var(--wf-color-text-muted);
    --dp-border-color: var(--wf-color-border);
    --dp-menu-border-color: var(--wf-color-border);
    --dp-border-color-hover: var(--wf-color-text-muted);
    --dp-icon-color: var(--wf-color-text-muted);
    --dp-danger-color: var(--wf-color-error);
    --dp-success-color: var(--wf-color-success);
    font-family: inherit;
}
</style>
