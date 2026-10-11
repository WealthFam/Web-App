<template>
    <div class="space-y-3.5">
        <!-- Header Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 pb-2 border-b border-wf-border-subtle">
            <div>
                <h2 class="text-xs sm:text-sm font-bold text-wf-text-primary flex items-center gap-2">
                    <Palette :size="16" class="text-wf-primary" />
                    Benchmark Resolution Rules
                </h2>
                <p class="text-xs text-wf-text-secondary mt-0.5">
                    Define how funds are mapped to benchmarks based on category keywords.
                </p>
            </div>
            <div class="flex items-center gap-2">
                <v-tooltip text="Force re-mapping of all funds using current rules" location="bottom">
                    <template v-slot:activator="{ props }">
                        <v-btn
                            v-bind="props"
                            color="secondary"
                            variant="tonal"
                            :loading="syncLoading"
                            @click="triggerSync"
                            class="rounded-wf-sm text-xs font-semibold px-2.5"
                            height="28"
                        >
                            <template v-slot:prepend>
                                <RotateCw :size="12" class="mr-1.5" />
                            </template>
                            Sync All Holdings
                        </v-btn>
                    </template>
                </v-tooltip>
                
                <v-btn
                    color="primary"
                    @click="openAddDialog"
                    class="rounded-wf-sm text-xs font-bold px-3"
                    height="28"
                >
                    <template v-slot:prepend>
                        <Plus :size="14" class="mr-1" />
                    </template>
                    Add Rule
                </v-btn>
            </div>
        </div>

        <!-- Rules Table -->
        <div class="rounded-wf-md border border-wf-border bg-wf-surface shadow-2xs overflow-hidden">
            <v-data-table
                :headers="[
                    { title: 'Priority', key: 'priority', width: '90px' },
                    { title: 'Keyword Match', key: 'keyword' },
                    { title: 'Benchmark Label', key: 'benchmark_label' },
                    { title: 'API Symbol', key: 'benchmark_symbol' },
                    { title: 'Style', key: 'styling_color', sortable: false },
                    { title: '', key: 'actions', sortable: false, align: 'end', width: '80px' }
                ]"
                :items="rules"
                :loading="loading"
                density="compact"
                class="bg-transparent text-xs"
            >
                <template v-slot:item.priority="{ item }">
                    <span class="px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-surface-variant text-wf-text-secondary border border-wf-border-subtle">
                        {{ item.priority }}
                    </span>
                </template>

                <template v-slot:item.keyword="{ item }">
                    <span v-if="item.keyword" class="px-1.5 py-0.5 rounded-wf-xs text-xs font-mono font-semibold bg-wf-surface-variant text-wf-primary border border-wf-border-subtle">
                        {{ item.keyword }}
                    </span>
                    <span v-else class="px-1.5 py-0.2 rounded-wf-pill text-[10px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
                        Default Fallback
                    </span>
                </template>

                <template v-slot:item.benchmark_label="{ item }">
                    <span class="font-bold text-xs text-wf-text-primary">{{ item.benchmark_label }}</span>
                </template>

                <template v-slot:item.benchmark_symbol="{ item }">
                    <span class="font-mono text-xs text-wf-text-muted">{{ item.benchmark_symbol }}</span>
                </template>

                <template v-slot:item.styling_color="{ item }">
                    <div class="flex items-center gap-2">
                        <svg width="32" height="4">
                            <line x1="0" y1="2" x2="32" y2="2" 
                                :stroke="item.styling_color" 
                                :stroke-width="2"
                                :stroke-dasharray="item.styling_style === 'solid' ? '0' : (item.styling_dash_array || '4,2')"
                            />
                        </svg>
                        <span class="text-[10px] font-mono text-wf-text-muted">{{ item.styling_color }}</span>
                    </div>
                </template>

                <template v-slot:item.actions="{ item }">
                    <div class="flex items-center justify-end gap-1">
                        <button type="button" class="w-6 h-6 rounded-wf-xs flex items-center justify-center text-wf-primary hover:bg-wf-primary/10 transition-colors"
                            @click="openEditDialog(item)">
                            <Edit2 :size="13" />
                        </button>
                        <button type="button" class="w-6 h-6 rounded-wf-xs flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors"
                            @click="deleteRule(item.id)">
                            <Trash2 :size="13" />
                        </button>
                    </div>
                </template>

                <template v-slot:no-data>
                    <div class="py-8 text-center text-wf-text-muted">
                        <Info :size="32" class="mx-auto mb-1 opacity-50" />
                        <p class="text-xs">No benchmark rules found.</p>
                        <button type="button" class="text-xs font-semibold text-wf-primary hover:underline mt-1" @click="fetchRules">Retry</button>
                    </div>
                </template>
            </v-data-table>
        </div>

        <!-- Upsert Dialog with WfModal -->
        <WfModal
            v-model="dialog"
            :title="editMode ? 'Edit Benchmark Rule' : 'New Benchmark Rule'"
            description="Configure category keyword matching and proxy benchmark symbol"
            maxWidth="lg"
        >
            <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div class="sm:col-span-4 space-y-1">
                        <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-secondary block">Priority</label>
                        <input
                            v-model.number="ruleForm.priority"
                            type="number"
                            placeholder="0"
                            class="w-full h-9 px-3 text-xs font-mono font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        <span class="text-[10px] text-wf-text-muted">Lower number = higher priority</span>
                    </div>
                    <div class="sm:col-span-8 space-y-1">
                        <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-secondary block">Keyword Matching</label>
                        <input
                            v-model="ruleForm.keyword"
                            type="text"
                            placeholder="e.g. small cap"
                            class="w-full h-9 px-3 text-xs font-semibold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        <span class="text-[10px] text-wf-text-muted">Leave empty for default fallback rule</span>
                    </div>
                </div>

                <div class="pt-2 border-t border-wf-border space-y-3">
                    <div class="text-xs font-bold text-wf-text-secondary uppercase tracking-wider">Target Benchmark (Proxy Fund)</div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">Standard Benchmark</label>
                        <select
                            v-model="selectedCommonBenchmark"
                            @change="onBenchmarkSelect(selectedCommonBenchmark)"
                            class="w-full h-9 px-3 text-xs font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            <option v-for="b in commonBenchmarks" :key="b.symbol" :value="b.symbol">
                                {{ b.label }}
                            </option>
                        </select>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div class="sm:col-span-4 space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">Scheme Code</label>
                            <input
                                v-model="ruleForm.benchmark_symbol"
                                type="text"
                                placeholder="120716"
                                :readonly="selectedCommonBenchmark !== 'custom'"
                                class="w-full h-9 px-3 text-xs font-mono font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60"
                            />
                        </div>
                        <div class="sm:col-span-8 space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">Display Label</label>
                            <input
                                v-model="ruleForm.benchmark_label"
                                type="text"
                                placeholder="e.g. Nifty 50 Index"
                                :readonly="selectedCommonBenchmark !== 'custom'"
                                class="w-full h-9 px-3 text-xs font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60"
                            />
                        </div>
                    </div>
                </div>

                <div class="pt-2 border-t border-wf-border space-y-3">
                    <div class="text-xs font-bold text-wf-text-secondary uppercase tracking-wider">Visual Chart Styling</div>
                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div class="sm:col-span-6 space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">Line Color</label>
                            <div class="flex items-center gap-2">
                                <input
                                    v-model="ruleForm.styling_color"
                                    type="color"
                                    class="w-9 h-9 p-0.5 rounded-wf-md border border-wf-border bg-wf-surface-variant cursor-pointer"
                                />
                                <input
                                    v-model="ruleForm.styling_color"
                                    type="text"
                                    class="flex-1 h-9 px-3 text-xs font-mono font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary"
                                />
                            </div>
                        </div>
                        <div class="sm:col-span-6 space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">Line Style</label>
                            <select
                                v-model="ruleForm.styling_style"
                                class="w-full h-9 px-3 text-xs font-bold rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                            </select>
                        </div>
                        <div v-if="ruleForm.styling_style !== 'solid'" class="sm:col-span-12 space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-wider text-wf-text-muted block">SVG Dash Array</label>
                            <input
                                v-model="ruleForm.styling_dash_array"
                                type="text"
                                placeholder="e.g. 5,5"
                                class="w-full h-9 px-3 text-xs font-mono rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-wf-text-primary"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <button
                    type="button"
                    @click="dialog = false"
                    class="px-4 py-2 text-xs font-semibold rounded-wf-md border border-wf-border text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    @click="saveRule"
                    class="px-5 py-2 text-xs font-bold rounded-wf-md bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                >
                    <Check :size="14" />
                    <span>Save Benchmark Rule</span>
                </button>
            </template>
        </WfModal>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Edit2, Trash2, RotateCw, Check, Palette } from 'lucide-vue-next'
import WfModal from '@/components/ui/WfModal.vue'

import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'

const notify = useNotificationStore()

// State
const rules = ref<any[]>([])
const loading = ref(false)
const syncLoading = ref(false)
const dialog = ref(false)
const editMode = ref(false)

const defaultRule = {
    priority: 0,
    keyword: '',
    benchmark_symbol: '',
    benchmark_label: '',
    styling_color: '#3B82F6',
    styling_style: 'solid',
    styling_dash_array: ''
}

const ruleForm = ref({ ...defaultRule })
const editedId = ref<string | null>(null)
const selectedCommonBenchmark = ref('custom')

const commonBenchmarks = [
    { label: 'Nifty 50 TRI', symbol: '120716' },
    { label: 'Nifty Next 50 TRI', symbol: '147704' },
    { label: 'Nifty Midcap 150 TRI', symbol: '147980' },
    { label: 'Nifty Smallcap 250 TRI', symbol: '148093' },
    { label: 'Nifty 500 TRI', symbol: '147734' },
    { label: 'BSE Sensex TRI', symbol: '147915' },
    { label: 'Custom / Other', symbol: 'custom' }
]

const onBenchmarkSelect = (val: string) => {
    if (val === 'custom') return
    const found = commonBenchmarks.find(b => b.symbol === val)
    if (found) {
        ruleForm.value.benchmark_symbol = found.symbol
        ruleForm.value.benchmark_label = found.label
    }
}

// Methods
const fetchRules = async () => {
    loading.value = true
    try {
        const response = await financeApi.getBenchmarkRules()
        rules.value = response.data?.data || response.data
    } catch (error) {
        notify.error('Failed to fetch benchmark rules')
    } finally {
        loading.value = false
    }
}

const openAddDialog = () => {
    editMode.value = false
    ruleForm.value = { ...defaultRule }
    editedId.value = null
    selectedCommonBenchmark.value = 'custom'
    dialog.value = true
}

const openEditDialog = (rule: any) => {
    editMode.value = true
    ruleForm.value = { ...rule }
    editedId.value = rule.id
    
    const isCommon = commonBenchmarks.find(b => b.symbol === rule.benchmark_symbol)
    selectedCommonBenchmark.value = isCommon ? rule.benchmark_symbol : 'custom'
    
    dialog.value = true
}

const saveRule = async () => {
    try {
        await financeApi.saveBenchmarkRule(ruleForm.value, editedId.value || undefined)
        notify.success(`Rule ${editMode.value ? 'updated' : 'created'} successfully`)
        dialog.value = false
        fetchRules()
    } catch (error) {
        notify.error('Failed to save rule')
    }
}

const deleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    try {
        await financeApi.deleteBenchmarkRule(id)
        notify.success('Rule deleted')
        fetchRules()
    } catch (error) {
        notify.error('Failed to delete rule')
    }
}

const triggerSync = async () => {
    syncLoading.value = true
    try {
        const response = await financeApi.syncBenchmarks()
        notify.success(`Sync completed! Updated ${response.data.updated_count} fund mappings.`)
    } catch (error) {
        notify.error('Sync failed')
    } finally {
        syncLoading.value = false
    }
}

onMounted(fetchRules)
</script>

<style scoped>
.style-visualization {
    background: rgba(var(--v-theme-on-surface), 0.05);
    padding: 8px 12px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    border: 1px solid rgba(var(--v-border-color), 0.05);
}

.text-mono {
    font-family: monospace;
}

.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }

code {
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85rem;
}
</style>
