<template>
    <WfCard variant="elevated" padding="none" class="heatmap-card h-full overflow-hidden">
        <div class="p-4 flex items-center justify-between gap-3">
            <div>
                <div class="flex items-center gap-2 mb-0.5">
                    <MapPin :size="18" class="text-wf-primary" aria-hidden="true" />
                    <h3 class="text-base font-semibold text-wf-text-primary">Spending Heatmap</h3>
                </div>
                <p class="text-xs text-wf-text-muted">Visualizing expenses by location</p>
            </div>

            <div class="flex items-center gap-2">
                <div class="flex items-center gap-3 px-4 py-2 rounded-full bg-wf-surface-variant border border-wf-border">
                    <span class="text-[10px] font-semibold uppercase text-wf-text-muted">Low</span>
                    <div class="gradient-bar-premium"></div>
                    <span class="text-[10px] font-semibold uppercase text-wf-text-muted">High</span>
                    <span v-if="hasLocationData"
                        class="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-wf-primary/10 text-wf-primary">
                        {{ data.length }} Points
                    </span>
                </div>
                <RouterLink
                    :to="{ path: '/spending-map', query: { startDate: props.startDate, endDate: props.endDate } }"
                    class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-wf-primary/10 text-wf-primary hover:bg-wf-primary hover:text-white text-xs font-semibold transition-colors"
                    title="Open Full-Screen Spending Map"
                >
                    <Maximize2 :size="14" aria-hidden="true" />
                    <span class="hidden sm:inline">Full Screen</span>
                </RouterLink>
            </div>
        </div>

        <div class="map-wrapper border-t border-wf-border">
            <div id="map" class="heatmap-canvas" ref="mapContainer"></div>

            <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
                leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
                <div v-if="!hasLocationData" class="no-data-overlay flex items-center justify-center">
                    <div class="text-center">
                        <MapPin :size="40" class="mx-auto mb-3 text-wf-text-muted" aria-hidden="true" />
                        <h3 class="text-base font-semibold text-wf-text-primary mb-1">No Geolocation Data</h3>
                        <p class="text-sm text-wf-text-muted">Transactions with location coordinates will appear here.</p>
                    </div>
                </div>
            </Transition>
        </div>
    </WfCard>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import L from 'leaflet'
import { MapPin, Maximize2 } from 'lucide-vue-next'
// @ts-ignore - plugin compatibility
if (typeof window !== 'undefined') window.L = L
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { useHeatmapData } from '@/composables/useHeatmapData'
import WfCard from '@/components/ui/WfCard.vue'

// Data-viz palette (documented exception to the no-raw-colour rule: Leaflet canvas cannot read CSS vars)
const HEAT_GRADIENT = { 0.2: '#3b82f6', 0.4: '#10b981', 0.6: '#f59e0b', 0.8: '#ef4444', 1.0: '#7f1d1d' }

const props = defineProps<{
    startDate: string
    endDate: string
}>()

const { data, fetchHeatmap } = useHeatmapData(() => props.startDate, () => props.endDate)

onMounted(() => {
    fetchHeatmap()
    // Small timeout to ensure container has dimensions
    setTimeout(initMap, 100)
})

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let heatLayer: any = null
let markerLayer: L.LayerGroup | null = null

const hasLocationData = computed(() => data.value && data.value.length > 0)

const initMap = () => {
    if (!mapContainer.value) return

    // Default center (can be tuned or detected from data)
    const center: L.LatLngExpression = hasLocationData.value
        ? [data.value[0].latitude, data.value[0].longitude]
        : [20.5937, 78.9629] // India center fallback

    map = L.map(mapContainer.value, {
        zoomControl: false,
        attributionControl: false
    }).setView(center, 13)

    // Keyless OpenStreetMap tiles (with optional VITE_MAP_TILE_URL_DARK override)
    const customDarkTileUrl = (import.meta.env.VITE_MAP_TILE_URL_DARK as string | undefined)?.trim()
    const tileUrl = customDarkTileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    if (mapContainer.value) {
        mapContainer.value.classList.toggle('wf-map-dark', !customDarkTileUrl)
    }
    L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    // Add zoom control manually to bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map)

    updateHeatmap()

    // Ensure layout is captured correctly - sometimes Leaflet needs a trigger
    setTimeout(() => {
        if (map) {
            map.invalidateSize()
        }
    }, 500)
}

function escapeHtml(raw: string): string {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

const updateHeatmap = () => {
    if (!map) return

    if (heatLayer) {
        map.removeLayer(heatLayer)
        heatLayer = null
    }
    if (markerLayer) {
        map.removeLayer(markerLayer)
        markerLayer = null
    }

    if (!hasLocationData.value) return

    // Ensure map is correctly sized (especially after layout animations)
    map.invalidateSize()
    const size = map.getSize()

    if (size.x === 0 || size.y === 0) {
        // Retry shortly if layout hasn't settled
        setTimeout(updateHeatmap, 200)
        return
    }

    markerLayer = L.layerGroup().addTo(map)

    // Prepare heatmap data: [lat, lng, intensity]
    const heatPoints = data.value.map(p => {
        // Boost intensity calculation for deeper colors - ensure minimum visibility
        const intensity = Math.max(0.4, Math.min(Math.abs(p.amount) / 500, 1.2))

        // Add marker for each point
        if (markerLayer) {
            const marker = L.circleMarker([p.latitude, p.longitude], {
                radius: 4,
                fillColor: '#ffffff',
                color: '#3b82f6',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.6
            })

            const safeCat = escapeHtml(p.category || 'Expense')
            const safeTitle = escapeHtml(p.recipient || p.description || 'Raw Transaction')
            const tooltipContent = `
                <div class="p-2">
                    <div class="text-xs font-semibold mb-1">${safeCat}</div>
                    <div class="text-sm font-bold font-mono">₹${Math.abs(p.amount).toLocaleString('en-IN')}</div>
                    <div class="text-[10px] opacity-70 mt-1">${safeTitle}</div>
                </div>
            `
            marker.bindPopup(tooltipContent, { closeButton: false })

            // Show data on hover
            marker.on('mouseover', () => {
                marker.openPopup()
            })
            marker.on('mouseout', () => {
                marker.closePopup()
            })

            marker.addTo(markerLayer)
        }

        return [p.latitude, p.longitude, intensity]
    })

    // @ts-ignore - leaflet.heat is not in types
    heatLayer = L.heatLayer(heatPoints as any, {
        radius: 30,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.5,
        gradient: HEAT_GRADIENT
    }).addTo(map)

    // Ensure map is visible and focused on the data
    if (data.value.length === 1) {
        map.setView([data.value[0].latitude, data.value[0].longitude], 13)
    } else if (data.value.length > 1) {
        const bounds = L.latLngBounds(data.value.map(p => [p.latitude, p.longitude] as L.LatLngTuple))
        map.fitBounds(bounds, { padding: [50, 50] })
    }
}

watch(data, (newData) => {
    if (!map) {
        if (newData && newData.length > 0) {
            initMap()
        }
    } else {
        updateHeatmap()
    }
}, { deep: true, immediate: true })

onUnmounted(() => {
    if (map) {
        map.remove()
        map = null
    }
})
</script>

<style scoped>
.heatmap-card {
    min-height: 600px;
    display: flex;
    flex-direction: column;
}

.map-wrapper {
    position: relative;
    flex: 1;
    min-height: 500px;
    background: var(--wf-color-surface);
}

.heatmap-canvas {
    height: 100%;
    width: 100%;
    min-height: 500px;
    z-index: 1;
}

.gradient-bar-premium {
    width: 100px;
    height: 6px;
    border-radius: var(--wf-radius-sm, 4px);
    background: linear-gradient(to right, #3b82f6, #10b981, #f59e0b, #ef4444, #7f1d1d);
}

.no-data-overlay {
    position: absolute;
    inset: 0;
    background: var(--wf-color-surface);
    opacity: 0.92;
    z-index: 10;
}

/* Leaflet Overrides */
:deep(.leaflet-container) {
    background: var(--wf-color-surface) !important;
}

:deep(.leaflet-popup-content-wrapper),
:deep(.leaflet-popup-tip) {
    background: var(--wf-color-surface) !important;
    color: var(--wf-color-text-primary) !important;
}

:deep(.leaflet-popup-content-wrapper) {
    border: 1px solid var(--wf-color-border);
    border-radius: var(--wf-radius-lg, 12px);
}

:deep(.leaflet-control-zoom) {
    border: none !important;
}

:deep(.leaflet-control-zoom-in),
:deep(.leaflet-control-zoom-out) {
    background: var(--wf-color-surface) !important;
    color: var(--wf-color-text-primary) !important;
    border: 1px solid var(--wf-color-border) !important;
}

:deep(.leaflet-control-zoom-in:hover),
:deep(.leaflet-control-zoom-out:hover) {
    background: var(--wf-color-primary) !important;
    color: white !important;
}

.wf-map-dark :deep(.leaflet-tile-pane) {
    filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
}
</style>