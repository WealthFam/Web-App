<template>
    <div class="relative overflow-hidden rounded-wf-lg bg-wf-surface border border-wf-border/60"
        :class="[containerClass, { 'backdrop-blur-md bg-wf-surface/60': glass }]"
        :style="{ height: typeof height === 'number' ? `${height}px` : height, width: typeof width === 'number' ? `${width}px` : width }">
        
        <!-- Hero Variant -->
        <div v-if="type === 'hero'" class="p-6 space-y-4 animate-pulse">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-wf-surface-variant"></div>
                <div class="space-y-2 flex-1">
                    <div class="h-4 bg-wf-surface-variant rounded w-1/3"></div>
                    <div class="h-3 bg-wf-surface-variant rounded w-1/4"></div>
                </div>
            </div>
            <div class="h-32 bg-wf-surface-variant/70 rounded-wf-md"></div>
        </div>

        <!-- Stat Card Variant -->
        <div v-else-if="type === 'stat-card'" class="p-4 space-y-3 animate-pulse">
            <div class="h-3 bg-wf-surface-variant rounded w-1/3"></div>
            <div class="h-7 bg-wf-surface-variant rounded w-2/3"></div>
            <div class="h-3 bg-wf-surface-variant rounded w-1/2"></div>
        </div>

        <!-- Category Card Variant -->
        <div v-else-if="type === 'category-card'" class="p-5 space-y-3 animate-pulse">
            <div class="h-28 bg-wf-surface-variant rounded-wf-md"></div>
            <div class="h-4 bg-wf-surface-variant rounded w-2/3"></div>
            <div class="h-3 bg-wf-surface-variant rounded w-1/3"></div>
        </div>

        <!-- Insight Card Variant -->
        <div v-else-if="type === 'insight-card'" class="p-4 space-y-2.5 animate-pulse">
            <div class="h-4 bg-wf-surface-variant rounded w-3/4"></div>
            <div class="h-3 bg-wf-surface-variant rounded w-full"></div>
            <div class="h-3 bg-wf-surface-variant rounded w-5/6"></div>
        </div>

        <!-- List Item Variant -->
        <div v-else-if="type === 'list-item'" class="p-3 flex items-center gap-3 animate-pulse">
            <div class="w-10 h-10 rounded-full bg-wf-surface-variant shrink-0"></div>
            <div class="space-y-2 flex-1">
                <div class="h-3.5 bg-wf-surface-variant rounded w-1/3"></div>
                <div class="h-2.5 bg-wf-surface-variant rounded w-1/4"></div>
            </div>
            <div class="h-4 bg-wf-surface-variant rounded w-16"></div>
        </div>

        <!-- Pulse Card Variant -->
        <div v-else-if="type === 'pulse-card'" class="p-4 space-y-2 animate-pulse">
            <div class="h-3 bg-wf-surface-variant rounded w-1/2"></div>
            <div class="h-5 bg-wf-surface-variant rounded w-3/4"></div>
        </div>

        <!-- Fund Card Variant / Default -->
        <div v-else class="p-5 space-y-3 animate-pulse">
            <div class="h-20 bg-wf-surface-variant rounded-wf-md"></div>
            <div class="h-4 bg-wf-surface-variant rounded w-3/4"></div>
            <div class="h-3 bg-wf-surface-variant rounded w-1/2"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    type?: 'hero' | 'stat-card' | 'category-card' | 'insight-card' | 'list-item' | 'pulse-card' | 'fund-card'
    height?: string | number
    width?: string | number
    glass?: boolean
}>()

const containerClass = computed(() => {
    switch (props.type) {
        case 'hero': return 'min-h-[280px]'
        case 'stat-card': return 'h-[120px]'
        case 'category-card': return 'h-[240px]'
        case 'pulse-card': return 'h-[110px]'
        case 'fund-card': return 'h-[280px]'
        case 'list-item': return 'h-[64px]'
        default: return 'min-h-[100px]'
    }
})
</script>
