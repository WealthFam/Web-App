<template>
    <div class="animate-in">
        <v-card v-if="rulesStore.suggestions.length > 0" class="premium-glass-card overflow-hidden border-thin elevation-2" rounded="xl">
            <v-data-table :headers="headers" :items="rulesStore.suggestions" density="comfortable"
                class="premium-table" hide-default-footer items-per-page="-1" item-value="name">
                <!-- Pattern/Name Column -->
                <template v-slot:item.name="{ item }">
                    <div class="d-flex align-center ga-3 py-2">
                        <v-avatar color="secondary" variant="tonal" rounded="lg" size="36" class="elevation-1 border">
                            <Sparkles :size="18" />
                        </v-avatar>
                        <div class="min-w-0">
                            <div class="font-weight-black truncate" style="max-width: 180px;">{{ item.name }}</div>
                            <div class="text-tiny font-weight-black opacity-40 truncate" :title="item.reason">{{ item.reason }}</div>
                        </div>
                    </div>
                </template>

                <!-- Keywords Column -->
                <template v-slot:item.keywords="{ item }">
                    <div class="d-flex flex-wrap ga-1 py-1">
                        <v-chip v-for="(k, idx) in item.keywords.slice(0, 3)" :key="idx" size="x-small" variant="flat"
                            class="font-mono font-weight-black bg-surface elevation-1 border">
                            {{ k }}
                        </v-chip>
                        <v-chip v-if="item.keywords.length > 3" size="x-small" variant="text"
                            class="text-primary font-weight-black">
                            +{{ item.keywords.length - 3 }}
                        </v-chip>
                    </div>
                </template>

                <!-- Category Column -->
                <template v-slot:item.category="{ item }">
                    <v-chip size="small" variant="flat" color="surface" class="font-weight-black border elevation-1"
                        label>
                        {{ categoriesStore.getCategoryDisplay(item.category) }}
                    </v-chip>
                </template>

                <!-- Impact Column -->
                <template v-slot:item.count="{ item }">
                    <v-chip size="x-small" color="secondary" variant="tonal" class="font-weight-black border">
                        {{ item.count }} matches
                    </v-chip>
                </template>

                <!-- Confidence Column -->
                <template v-slot:item.confidence_level="{ item }">
                    <div class="d-flex align-center ga-1">
                        <Zap :size="12"
                            :class="['High', 'Very High'].includes(item.confidence_level || '') ? 'text-success' : 'text-warning'" />
                        <span class="text-caption font-weight-black">{{ item.confidence_level }}</span>
                    </div>
                </template>

                <!-- Actions Column -->
                <template v-slot:item.actions="{ item }">
                    <div class="d-flex ga-2 justify-center">
                        <v-btn variant="tonal" size="small" color="medium-emphasis" rounded="pill"
                            class="text-none font-weight-bold" @click="rulesStore.ignoreSuggestion(item)">
                            <template v-slot:prepend>
                                <XCircle :size="14" />
                            </template>
                            Ignore
                        </v-btn>
                        <v-btn color="primary" variant="flat" size="small" rounded="pill"
                            class="text-none font-weight-black elevation-2" @click="acceptSuggestion(item)">
                            <template v-slot:prepend>
                                <Check :size="14" />
                            </template>
                            Approve
                        </v-btn>
                    </div>
                </template>

                <!-- Empty State -->
                <template v-slot:no-data>
                    <div class="text-center py-16">
                        <v-avatar size="96" color="surface-variant" variant="tonal" class="mb-6 elevation-2 border">
                            <Sparkles :size="48" class="opacity-20" />
                        </v-avatar>
                        <h3 class="text-h5 font-weight-black mb-2">No Suggestions</h3>
                        <p class="text-subtitle-1 opacity-60 mb-8 font-weight-medium mx-auto" style="max-width: 400px">
                            Add more transactions and the engine will generate classification suggestions automatically.
                        </p>
                    </div>
                </template>
            </v-data-table>
        </v-card>

        <!-- No data state (if empty list) -->
        <div v-else class="text-center py-16">
            <v-avatar size="96" color="surface-variant" variant="tonal" class="mb-6 elevation-2 border">
                <Sparkles :size="48" class="opacity-20" />
            </v-avatar>
            <h3 class="text-h5 font-weight-black mb-2">Intelligence Idle</h3>
            <p class="text-subtitle-1 opacity-60 mb-4 font-weight-medium mx-auto" style="max-width: 400px">
                As you categorize more transactions, WealthFam will suggest automated rules here.
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Sparkles, Zap, XCircle, Check } from 'lucide-vue-next'
import { useRulesStore, type RuleSuggestion } from '@/stores/finance/rules'
import { useCategoriesStore } from '@/stores/finance/categories'

const rulesStore = useRulesStore()
const categoriesStore = useCategoriesStore()

const emit = defineEmits<{
    (e: 'accept-suggestion', suggestion: RuleSuggestion): void
}>()

const headers = [
    { title: 'Suggested Pattern', key: 'name', sortable: true },
    { title: 'Keywords', key: 'keywords', sortable: false },
    { title: 'Target Category', key: 'category', sortable: true },
    { title: 'Impact', key: 'count', sortable: true, align: 'center' as const },
    { title: 'Confidence', key: 'confidence_level', sortable: true, align: 'center' as const },
    { title: '', key: 'actions', sortable: false, align: 'center' as const, width: '200px' },
]

function acceptSuggestion(s: RuleSuggestion) {
    emit('accept-suggestion', s)
}
</script>

<style scoped>
.animate-in {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.text-tiny {
    font-size: 0.65rem !important;
    letter-spacing: 0.5px;
}
</style>
