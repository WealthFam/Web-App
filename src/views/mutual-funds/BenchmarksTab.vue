<template>
    <div class="benchmarks-tab">
        <!-- Header Actions -->
        <div class="d-flex justify-space-between align-center mb-6">
            <div>
                <h2 class="text-h6 font-weight-bold d-flex align-center gap-2">
                    <Palette :size="20" class="text-primary" />
                    Benchmark Resolution Rules
                </h2>
                <p class="text-caption text-medium-emphasis mt-1">
                    Define how funds are mapped to benchmarks based on their category keywords.
                    Holdings will use these to determine their comparison line.
                </p>
            </div>
            <div class="d-flex gap-3">
                <v-tooltip text="Force re-mapping of all funds using current rules" location="bottom">
                    <template v-slot:activator="{ props }">
                        <v-btn
                            v-bind="props"
                            color="secondary"
                            variant="tonal"
                            :loading="syncLoading"
                            @click="triggerSync"
                            class="rounded-lg text-none"
                        >
                            <template v-slot:prepend>
                                <RotateCw :size="16" />
                            </template>
                            Sync All Holdings
                        </v-btn>
                    </template>
                </v-tooltip>
                
                <v-btn
                    color="primary"
                    @click="openAddDialog"
                    class="rounded-lg text-none shadow-sm"
                >
                    <template v-slot:prepend>
                        <Plus :size="18" />
                    </template>
                    Add New Rule
                </v-btn>
            </div>
        </div>

        <!-- Rules Table -->
        <v-card class="premium-card rounded-xl border" elevation="0">
            <v-data-table
                :headers="[
                    { title: 'Priority', key: 'priority', width: '100px' },
                    { title: 'Keyword Match', key: 'keyword' },
                    { title: 'Benchmark Label', key: 'benchmark_label' },
                    { title: 'API Symbol', key: 'benchmark_symbol' },
                    { title: 'Style', key: 'styling_color', sortable: false },
                    { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
                ]"
                :items="rules"
                :loading="loading"
                class="bg-transparent"
            >
                <template v-slot:item.priority="{ item }">
                    <v-chip size="small" variant="tonal" color="grey" class="font-weight-bold">
                        {{ item.priority }}
                    </v-chip>
                </template>

                <template v-slot:item.keyword="{ item }">
                    <span v-if="item.keyword" class="text-body-2 font-weight-medium">
                        <code>{{ item.keyword }}</code>
                    </span>
                    <v-chip v-else size="small" variant="outlined" color="primary" class="opacity-70">
                        Default Fallback
                    </v-chip>
                </template>

                <template v-slot:item.styling_color="{ item }">
                    <div class="d-flex align-center gap-3">
                        <div class="style-visualization">
                            <svg width="40" height="4">
                                <line x1="0" y1="2" x2="40" y2="2" 
                                    :stroke="item.styling_color" 
                                    :stroke-width="2"
                                    :stroke-dasharray="item.styling_style === 'solid' ? '0' : (item.styling_dash_array || '4,2')"
                                />
                            </svg>
                        </div>
                        <span class="text-caption font-weight-bold text-mono opacity-60">{{ item.styling_color }}</span>
                    </div>
                </template>

                <template v-slot:item.actions="{ item }">
                    <div class="d-flex justify-end gap-1">
                        <v-tooltip text="Edit Rule" location="top">
                            <template v-slot:activator="{ props }">
                                <v-btn v-bind="props" icon variant="text" size="small" color="primary" @click="openEditDialog(item)">
                                    <Edit2 :size="16" />
                                </v-btn>
                            </template>
                        </v-tooltip>

                        <v-tooltip text="Delete Rule" location="top">
                            <template v-slot:activator="{ props }">
                                <v-btn v-bind="props" icon variant="text" size="small" color="error" @click="deleteRule(item.id)">
                                    <Trash2 :size="16" />
                                </v-btn>
                            </template>
                        </v-tooltip>
                    </div>
                </template>

                <template v-slot:no-data>
                    <div class="py-12 text-center opacity-60">
                        <Info :size="48" class="mb-2" />
                        <p>No benchmark rules found.</p>
                        <v-btn color="primary" variant="text" @click="fetchRules" class="mt-2">Retry</v-btn>
                    </div>
                </template>
            </v-data-table>
        </v-card>

        <!-- Upsert Dialog -->
        <v-dialog v-model="dialog" max-width="600px">
            <v-card class="rounded-xl pa-4">
                <v-card-title class="px-2">
                    <span class="text-h6 font-weight-black">
                        {{ editMode ? 'Edit Benchmark Rule' : 'New Benchmark Rule' }}
                    </span>
                </v-card-title>
                <v-card-text>
                    <v-row>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model.number="ruleForm.priority"
                                label="Priority"
                                type="number"
                                hint="Lower is higher priority"
                                persistent-hint
                                variant="outlined"
                                density="comfortable"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="8">
                            <v-text-field
                                v-model="ruleForm.keyword"
                                label="Keyword Matching"
                                placeholder="e.g. small cap"
                                hint="Leave empty for default fallback"
                                persistent-hint
                                variant="outlined"
                                density="comfortable"
                            ></v-text-field>
                        </v-col>
                        
                        <v-divider class="my-2 mx-4"></v-divider>
                        <v-col cols="12">
                            <div class="text-subtitle-2 font-weight-bold mb-2 opacity-70">Target Benchmark (Proxy Fund)</div>
                        </v-col>

                        <v-col cols="12">
                            <v-select
                                v-model="selectedCommonBenchmark"
                                :items="commonBenchmarks"
                                item-title="label"
                                item-value="symbol"
                                label="Standard Benchmark"
                                placeholder="Select a common index..."
                                variant="outlined"
                                density="comfortable"
                                @update:model-value="onBenchmarkSelect"
                            ></v-select>
                        </v-col>

                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="ruleForm.benchmark_symbol"
                                label="Scheme Code"
                                placeholder="120716"
                                variant="outlined"
                                density="comfortable"
                                required
                                :readonly="selectedCommonBenchmark !== 'custom'"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="8">
                            <v-text-field
                                v-model="ruleForm.benchmark_label"
                                label="Display Label"
                                placeholder="e.g. Nifty 50 Index"
                                variant="outlined"
                                density="comfortable"
                                required
                                :readonly="selectedCommonBenchmark !== 'custom'"
                            ></v-text-field>
                        </v-col>

                        <v-divider class="my-2 mx-4"></v-divider>
                        <v-col cols="12">
                            <div class="text-subtitle-2 font-weight-bold mb-2 opacity-70">Visual Styling</div>
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="ruleForm.styling_color"
                                label="Hex Color"
                                type="color"
                                variant="outlined"
                                density="comfortable"
                                prepend-inner-icon="mdi-palette"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-autocomplete
                                v-model="ruleForm.styling_style"
                                :items="['solid', 'dashed', 'dotted']"
                                label="Line Style"
                                variant="outlined"
                                density="comfortable"
                            ></v-autocomplete>
                        </v-col>
                        <v-col cols="12">
                            <v-text-field
                                v-model="ruleForm.styling_dash_array"
                                label="SVG Dash Array"
                                placeholder="e.g. 5,5"
                                hint="Only for dashed/dotted lines"
                                persistent-hint
                                variant="outlined"
                                density="comfortable"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions class="px-4 pb-4">
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="dialog = false" class="text-none rounded-lg font-weight-bold">Cancel</v-btn>
                    <v-btn color="primary" @click="saveRule" class="text-none rounded-lg px-6 font-weight-bold shadow-sm">
                        <template v-slot:prepend>
                            <Check :size="18" />
                        </template>
                        Save Rule
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Edit2, Trash2, RotateCw, Check, Info, Palette } from 'lucide-vue-next'

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
        rules.value = response.data
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
