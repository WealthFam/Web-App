<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import SpendingHeatmap from '@/components/SpendingHeatmap.vue'

// Props - SpendingHeatmap now self-fetches, just pass date range
defineProps<{
    startDate: string
    endDate: string
    loading?: boolean
}>()
</script>

<template>
    <div class="relative min-h-[400px]">
        <div v-if="loading" role="status"
            class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-wf-surface/80">
            <Loader2 class="w-10 h-10 mb-3 animate-spin text-wf-primary" aria-hidden="true" />
            <p class="text-xs font-semibold text-wf-text-muted">Loading Map Data...</p>
        </div>
        <SpendingHeatmap :start-date="startDate" :end-date="endDate" />
        <p class="mt-4 text-xs font-medium text-wf-text-muted">
            Showing spending density based on transaction geolocation. Only
            transactions with coordinates are displayed.
        </p>
    </div>
</template>
