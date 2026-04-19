<template>
    <MainLayout>
        <v-container fluid class="page-container dashboard-page py-6">
            <!-- AI Advisor Header -->
            <v-row class="mb-8 align-center">
                <v-col cols="12" class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center gap-4">
                        <v-tooltip text="Back to Portfolio" location="bottom">
                            <template v-slot:activator="{ props }">
                                <v-btn v-bind="props" icon @click="router.push('/mutual-funds')" variant="tonal" class="rounded-lg mr-2">
                                    <ArrowLeft :size="20" />
                                </v-btn>
                            </template>
                        </v-tooltip>
                        <div>
                            <h1 class="text-h5 font-weight-black text-content d-flex align-center gap-2 text-gradient">
                                <Sparkles class="text-primary" :size="24" />
                                AI Advisor Briefing
                            </h1>
                            <p class="text-subtitle-2 text-medium-emphasis mt-1">
                                High-fidelity performance auditing and tactical growth detection
                            </p>
                        </div>
                    </div>

                    <v-btn
                        color="primary"
                        variant="flat"
                        class="rounded-xl px-6"
                        :loading="isAnalyzing"
                        @click="fetchInsights(true)"
                    >
                        <template v-slot:prepend>
                            <RefreshCw :size="18" :class="{ 'animate-spin': isAnalyzing }" />
                        </template>
                        Refresh Analysis
                    </v-btn>
                </v-col>
            </v-row>

            <!-- Loading State -->
            <div v-if="isAnalyzing && !aiAnalysis" class="d-flex flex-column align-center justify-center py-16">
                <v-progress-circular indeterminate color="primary" size="64" width="6" class="mb-6"></v-progress-circular>
                <h3 class="text-h6 font-weight-bold opacity-70">Synthesizing Advisor Data...</h3>
                <p class="text-caption mt-2">Checking XIRR performance and rebalancing guardrails</p>
            </div>

            <!-- Error State -->
            <v-alert
                v-else-if="error"
                type="error"
                variant="tonal"
                class="rounded-xl mb-6 mx-auto"
                style="max-width: 800px"
            >
                {{ error }}
            </v-alert>

            <!-- Analysis Content -->
            <template v-else-if="aiAnalysis">
                <v-row>
                    <!-- Executive Narrative -->
                    <v-col cols="12" md="7">
                        <v-card class="premium-glass rounded-24 pa-0 overflow-hidden border">
                            <div class="pa-8">
                                <div class="d-flex align-center gap-2 mb-6">
                                    <div class="strategic-pill uppercase">Advisor Briefing</div>
                                </div>
                                <div class="mf-ai-markdown-full" v-html="formattedSummary"></div>
                            </div>
                        </v-card>
                    </v-col>

                    <!-- Advisor Insights -->
                    <v-col cols="12" md="5">
                        <h3 class="text-subtitle-1 font-weight-black mb-4 px-2 d-flex align-center gap-2 uppercase">
                            <Zap :size="18" class="text-primary" />
                            Advisor Insights
                        </h3>
                        
                        <div class="d-flex flex-column gap-4">
                            <v-card
                                v-for="insight in highlights"
                                :key="insight.id"
                                class="rounded-20 border transition-all"
                                :style="{
                                    background: getInsightColor(insight.type),
                                    borderColor: getInsightBorderColor(insight.type)
                                }"
                                variant="flat"
                            >
                                <v-card-text class="pa-5 d-flex gap-4 align-start">
                                    <div class="pa-2 rounded-lg bg-surface flex-shrink-0 d-flex align-center justify-center border" style="width: 44px; height: 44px">
                                        <span class="text-h6">{{ insight.icon }}</span>
                                    </div>
                                    <div>
                                        <h4 class="text-subtitle-2 font-weight-black mb-1 text-uppercase letter-spacing-1">
                                            {{ insight.title }}
                                        </h4>
                                        <p class="text-body-2 font-weight-medium opacity-80 line-height-1-5">
                                            {{ insight.content }}
                                        </p>
                                    </div>
                                </v-card-text>
                            </v-card>
                        </div>
                    </v-col>
                </v-row>

                <!-- Advisor Actions Grid -->
                <v-row v-if="suggestions.length > 0" class="mt-8">
                    <v-col cols="12">
                        <div class="d-flex align-center gap-3 mb-6">
                            <div class="pa-2 rounded-lg bg-primary-lighten">
                                <Sparkles class="text-primary" :size="20" />
                            </div>
                            <h3 class="text-h6 font-weight-black text-content uppercase letter-spacing-1">
                                Advisor Actions for Growth
                            </h3>
                        </div>

                        <v-row>
                            <v-col v-for="suggestion in suggestions" :key="suggestion.id" cols="12" md="4">
                                <v-card class="premium-glass rounded-24 h-100 border hover-glow transition-all pa-6">
                                    <div class="d-flex justify-space-between align-start mb-4">
                                        <div 
                                            class="priority-badge"
                                            :class="`priority-${suggestion.priority}`"
                                        >
                                            {{ suggestion.priority.toUpperCase() }} PRIORITY
                                        </div>
                                        <Zap :size="20" class="text-primary opacity-50" />
                                    </div>
                                    <h4 class="text-subtitle-1 font-weight-black mb-2 text-content">
                                        {{ suggestion.title }}
                                    </h4>
                                    <p class="text-body-2 text-medium-emphasis mb-0 opacity-80 line-height-1-6">
                                        {{ suggestion.content }}
                                    </p>
                                </v-card>
                            </v-col>
                        </v-row>
                    </v-col>
                </v-row>
            </template>
        </v-container>
    </MainLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { ArrowLeft, Sparkles, RefreshCw, Zap } from 'lucide-vue-next'
import { useMutualFundAi } from '@/composables/useMutualFundAi'

const router = useRouter()
const {
    isAnalyzing,
    aiAnalysis,
    error,
    highlights,
    suggestions,
    formattedSummary,
    fetchInsights,
    getInsightColor,
    getInsightBorderColor
} = useMutualFundAi()

onMounted(() => {
    fetchInsights()
})
</script>

<style scoped>
.rounded-24 { border-radius: 24px !important; }
.rounded-20 { border-radius: 20px !important; }

.gap-4 { gap: 16px; }
.line-height-1-5 { line-height: 1.5; }

.text-gradient {
    background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #6366f1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.premium-glass {
    background: rgba(var(--v-theme-surface), 0.4);
    backdrop-filter: blur(12px);
}

.strategic-pill {
    background: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
    font-size: 0.7rem;
    font-weight: 900;
    padding: 4px 12px;
    border-radius: 100px;
    letter-spacing: 1px;
}

/* Hardened Markdown Styling for Full View */
.mf-ai-markdown-full {
    color: rgba(var(--v-theme-on-surface), 0.9);
    line-height: 1.7;
}

.mf-ai-markdown-full :deep(h3) {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-weight: 900;
    font-size: 1.1rem;
    color: rgb(var(--v-theme-primary));
    display: flex;
    align-items: center;
    gap: 8px;
    text-transform: uppercase;
}

.mf-ai-markdown-full :deep(p) {
    margin-bottom: 1rem;
    font-size: 0.95rem;
}

.mf-ai-markdown-full :deep(strong) {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.08);
    padding: 0 4px;
    border-radius: 4px;
}

.mf-ai-markdown-full :deep(blockquote) {
    background: linear-gradient(90deg, rgba(var(--v-theme-primary), 0.1) 0%, transparent 100%);
    border-left: 4px solid rgb(var(--v-theme-primary));
    padding: 16px 20px;
    margin: 1.5rem 0;
    border-radius: 0 12px 12px 0;
}

.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.letter-spacing-1 {
    letter-spacing: 0.5px;
}

.priority-badge {
    font-size: 0.65rem;
    font-weight: 900;
    padding: 2px 10px;
    border-radius: 6px;
    letter-spacing: 1px;
}

.priority-high {
    background: rgba(var(--v-theme-error), 0.1);
    color: rgb(var(--v-theme-error));
    border: 1px solid rgba(var(--v-theme-error), 0.2);
}

.priority-medium {
    background: rgba(var(--v-theme-warning), 0.1);
    color: rgb(var(--v-theme-warning));
    border: 1px solid rgba(var(--v-theme-warning), 0.2);
}

.priority-low {
    background: rgba(var(--v-theme-info), 0.1);
    color: rgb(var(--v-theme-info));
    border: 1px solid rgba(var(--v-theme-info), 0.2);
}

.line-height-1-6 {
    line-height: 1.6;
}

.hover-glow:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px -8px rgba(var(--v-theme-primary), 0.2);
    border-color: rgba(var(--v-theme-primary), 0.4) !important;
}
</style>
