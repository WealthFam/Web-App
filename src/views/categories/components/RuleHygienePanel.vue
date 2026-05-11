<template>
    <div class="hygiene-panel pb-12">
        <v-toolbar color="transparent" class="px-2 premium-toolbar" height="64">
            <h2 class="text-h6 font-weight-black d-flex align-center">
                <v-avatar color="primary" variant="tonal" size="32" rounded="lg" class="mr-3 elevation-1">
                    <ShieldAlert :size="20" />
                </v-avatar>
                Rule Hygiene
            </h2>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="flat" @click="refreshAnalysis" :loading="rulesStore.analysisLoading" class="font-weight-bold text-none rounded-lg px-4 elevation-2">
                <template v-slot:prepend>
                    <Zap :size="18" />
                </template>
                Rescan Rules
            </v-btn>
        </v-toolbar>

        <v-card v-if="!rulesStore.analysisResult && rulesStore.analysisLoading" variant="outlined" class="pa-8 border-dashed opacity-70 border-thin rounded-xl mx-4 mb-4 premium-glass-card" color="surface-variant">
            <div class="d-flex flex-column align-center text-center justify-center py-8">
                <v-progress-circular indeterminate color="primary" :size="40" width="4" class="mb-4" />
                <span class="text-body-1 font-weight-black letter-spacing-1">RUNNING DEEP ANALYSIS...</span>
                <span class="text-caption mt-1">Cross-referencing {{ rulesStore.totalRules }} active rules for overlaps</span>
            </div>
        </v-card>

        <v-card v-else-if="!rulesStore.analysisResult?.issues?.length" variant="outlined" class="pa-8 border-thin rounded-xl mx-4 mb-4 premium-glass-card bg-green-lighten-5" color="success">
            <div class="d-flex flex-column align-center text-center justify-center py-8 text-success">
                <v-avatar color="success" variant="tonal" size="64" rounded="pill" class="mb-4 elevation-2">
                    <ShieldCheck :size="40" />
                </v-avatar>
                <span class="text-h6 font-weight-black">Your rules are in top shape!</span>
                <span class="text-body-2 font-weight-medium opacity-70 mt-1">No duplicates, conflicts, or redundancies detected.</span>
            </div>
        </v-card>

        <div v-else class="px-4">
            <v-alert
                type="warning"
                variant="tonal"
                class="mb-6 rounded-xl font-weight-bold border-thin elevation-1"
                border="start"
                elevation="2"
            >
                <template v-slot:prepend>
                    <AlertTriangle :size="24" class="mr-3 text-warning" />
                </template>
                Action Required: Found {{ rulesStore.analysisResult.issues.length }} potential hygiene issues that may cause categorization conflicts.
            </v-alert>

            <v-row dense>
                <v-col cols="12" md="6" lg="4" v-for="(issue, index) in rulesStore.analysisResult.issues" :key="index">
                    <v-card class="premium-glass-card h-100 rounded-xl overflow-hidden hover-card border-thin" :class="getConflictClass(issue.conflict_type)">
                        <div class="pa-1" :class="`bg-${getConflictColor(issue.conflict_type)} opacity-30`" style="height: 3px;"></div>
                        
                        <v-card-text class="pa-4">
                            <div class="d-flex align-start justify-space-between mb-3">
                                <v-chip size="x-small" :color="getConflictColor(issue.conflict_type)" variant="flat" class="font-weight-black elevation-2 px-2">
                                    <component :is="getConflictLucideIcon(issue.conflict_type)" :size="12" class="mr-1" />
                                    {{ formatConflictType(issue.conflict_type) }}
                                </v-chip>
                            </div>

                            <div class="d-flex align-center justify-center mb-3 ga-1">
                                <v-sheet class="flex-grow-1 pa-2 rounded-lg border-thin text-center overflow-hidden" color="surface-light" border style="position: relative; z-index: 1;">
                                    <div class="text-tiny font-weight-black opacity-60 mb-1 text-uppercase letter-spacing-1">Rule A</div>
                                    <div class="font-weight-black text-caption text-truncate">
                                        {{ issue.rule_a_name }}
                                        <v-tooltip activator="parent" location="top">{{ issue.rule_a_name }}</v-tooltip>
                                    </div>
                                    <div class="text-tiny font-weight-bold text-primary mt-1">
                                        {{ issue.rule_a_category }}
                                        <v-tooltip activator="parent" location="bottom">{{ issue.rule_a_category }}</v-tooltip>
                                    </div>
                                </v-sheet>
                                
                                <div class="d-flex align-center justify-center flex-shrink-0" style="width: 40px; position: relative; z-index: 10;">
                                    <v-chip color="primary" size="x-small" class="font-weight-black elevation-4 px-1" style="height: 20px; min-width: 32px; justify-content: center;">
                                        VS
                                    </v-chip>
                                </div>
                                
                                <v-sheet class="flex-grow-1 pa-2 rounded-lg border-thin text-center overflow-hidden" color="surface-light" border style="position: relative; z-index: 1;">
                                    <div class="text-tiny font-weight-black opacity-60 mb-1 text-uppercase letter-spacing-1">Rule B</div>
                                    <div class="font-weight-black text-caption text-truncate">
                                        {{ issue.rule_b_name }}
                                        <v-tooltip activator="parent" location="top">{{ issue.rule_b_name }}</v-tooltip>
                                    </div>
                                    <div class="text-tiny font-weight-bold text-primary mt-1">
                                        {{ issue.rule_b_category }}
                                        <v-tooltip activator="parent" location="bottom">{{ issue.rule_b_category }}</v-tooltip>
                                    </div>
                                </v-sheet>
                            </div>

                            <v-sheet class="pa-3 rounded-lg border-thin bg-surface" border>
                                <div class="text-caption font-weight-black text-primary mb-2 d-flex align-center letter-spacing-1">
                                    <Tag :size="14" class="mr-2" />
                                    COLLIDING KEYWORDS
                                </div>
                                <div class="d-flex flex-wrap gap-1">
                                    <v-chip v-for="kw in issue.overlapping_keywords" :key="kw" size="x-small" variant="flat" :color="getConflictColor(issue.conflict_type)" class="font-weight-black px-2 elevation-1">
                                        {{ kw }}
                                    </v-chip>
                                </div>
                            </v-sheet>
                        </v-card-text>
                        
                        <v-card-actions class="px-4 pb-4 pt-0 gap-2">
                            <v-btn color="error" variant="outlined" size="small" class="text-none font-weight-black rounded-lg flex-grow-1" @click="confirmDelete(issue.rule_a_id, issue.rule_b_category)">
                                <template v-slot:prepend>
                                    <Trash2 :size="14" />
                                </template>
                                Delete A
                            </v-btn>
                            <v-btn color="error" variant="tonal" size="small" class="text-none font-weight-black rounded-lg flex-grow-1" @click="confirmDelete(issue.rule_b_id, issue.rule_a_category)">
                                <template v-slot:prepend>
                                    <Trash2 :size="14" />
                                </template>
                                Delete B
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>
        </div>

        <!-- Delete Confirmation Dialog -->
        <v-dialog v-model="showDeleteConfirm" max-width="450px" persistent>
            <v-card class="premium-glass-card no-hover text-center pa-8" rounded="xl" elevation="24">
                <v-avatar color="error" variant="tonal" size="72" class="mb-6 mx-auto elevation-2">
                    <Trash2 :size="40" />
                </v-avatar>
                <h3 class="text-h5 font-weight-black mb-2">Delete Classification Rule?</h3>
                <p class="text-subtitle-2 font-weight-medium opacity-60 mb-6 px-4">
                    Future transactions matched by this rule will become <strong>uncategorized</strong>.
                </p>

                <!-- Migration Option -->
                <v-sheet v-if="migrationCategory" class="pa-4 rounded-xl border-thin bg-surface-light text-left mb-8 border-dashed" border>
                    <v-checkbox
                        v-model="shouldMigrate"
                        color="primary"
                        hide-details
                        density="compact"
                        class="mt-0"
                    >
                        <template v-slot:label>
                            <div class="text-caption font-weight-bold">
                                Migrate existing transactions to <span class="text-primary">{{ migrationCategory }}</span>?
                            </div>
                        </template>
                    </v-checkbox>
                    <div class="text-tiny opacity-60 ml-8 mt-1">
                        Historical transactions matched by this rule will be moved to the kept rule's category.
                    </div>
                </v-sheet>

                <div class="d-flex ga-3 justify-center">
                    <v-btn variant="text" rounded="pill" class="text-none font-weight-bold px-6" height="44"
                        @click="showDeleteConfirm = false">Cancel</v-btn>
                    <v-btn color="error" rounded="pill" class="text-none font-weight-black px-8 elevation-4"
                        height="44" @click="executeDelete">Yes, Delete</v-btn>
                </div>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ShieldAlert, ShieldCheck, Zap, Trash2, AlertTriangle, Tag, Copy, Layers, HelpCircle } from 'lucide-vue-next'
import { useRulesStore } from '@/stores/finance/rules'
import { useNotificationStore } from '@/stores/notification'

const rulesStore = useRulesStore()
const notify = useNotificationStore()

const showDeleteConfirm = ref(false)
const ruleToDelete = ref<string | null>(null)
const migrationCategory = ref<string | null>(null)
const shouldMigrate = ref(false)

onMounted(() => {
    refreshAnalysis()
})

const refreshAnalysis = () => {
    rulesStore.fetchRuleAnalysis()
}

const confirmDelete = (ruleId: string, targetCategory?: string) => {
    ruleToDelete.value = ruleId
    migrationCategory.value = targetCategory || null
    shouldMigrate.value = !!targetCategory
    showDeleteConfirm.value = true
}

const executeDelete = async () => {
    if (!ruleToDelete.value) return
    
    const migrateTo = shouldMigrate.value ? (migrationCategory.value || undefined) : undefined
    const success = await rulesStore.deleteRule(ruleToDelete.value, migrateTo)
    
    if (success) {
        showDeleteConfirm.value = false
        ruleToDelete.value = null
        migrationCategory.value = null
        shouldMigrate.value = false
        refreshAnalysis()
    }
}

const getConflictColor = (type: string) => {
    switch(type) {
        case 'EXACT_DUPLICATE': return 'warning'
        case 'CONFLICT': return 'error'
        case 'REDUNDANT': return 'info'
        default: return 'primary'
    }
}

const getConflictLucideIcon = (type: string) => {
    switch(type) {
        case 'EXACT_DUPLICATE': return Copy
        case 'CONFLICT': return AlertTriangle
        case 'REDUNDANT': return Layers
        default: return HelpCircle
    }
}

const getConflictClass = (type: string) => {
    switch(type) {
        case 'EXACT_DUPLICATE': return 'border-warning-thin'
        case 'CONFLICT': return 'border-error-thin'
        case 'REDUNDANT': return 'border-info-thin'
        default: return ''
    }
}

const formatConflictType = (type: string) => {
    return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
}
</script>

<style scoped>
.text-tiny {
    font-size: 10px;
    line-height: 1.2;
}
.gap-1 {
    gap: 4px;
}
.hover-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.hover-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px -10px rgba(var(--v-theme-primary), 0.15) !important;
}
.border-warning-thin { border: 1px solid rgba(var(--v-theme-warning), 0.3); }
.border-error-thin { border: 1px solid rgba(var(--v-theme-error), 0.3); }
.border-info-thin { border: 1px solid rgba(var(--v-theme-info), 0.3); }
</style>
