<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import L from 'leaflet'
if (typeof window !== 'undefined') (window as any).L = L
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import {
    MapPin,
    Search,
    X,
    SlidersHorizontal,
    Layers,
    Flame,
    LocateFixed,
    Sun,
    Moon,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Compass,
    Receipt,
    Calendar,
    RotateCcw,
    ExternalLink,
} from 'lucide-vue-next'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns'
import { financeApi } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useHeatmapData, type HeatmapDataPoint, type HeatmapFilters } from '@/composables/useHeatmapData'
import { useLocationSearch, type LocationSearchResult } from '@/composables/useLocationSearch'
import MainLayout from '@/layouts/MainLayout.vue'
import BrandIcon from '@/components/common/BrandIcon.vue'

type LayerMode = 'hybrid' | 'clusters' | 'heatmap'
type DatePreset = 'this-month' | '3m' | 'ytd' | 'all' | 'custom'

const HEAT_GRADIENT = { 0.2: '#3b82f6', 0.4: '#10b981', 0.6: '#f59e0b', 0.8: '#ef4444', 1.0: '#7f1d1d' }

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settingsStore = useSettingsStore()

// --- Date & Filter State ---
const today = new Date()
const initialStart = typeof route.query.startDate === 'string' && route.query.startDate ? route.query.startDate : format(startOfMonth(today), 'yyyy-MM-dd')
const initialEnd = typeof route.query.endDate === 'string' && route.query.endDate ? route.query.endDate : format(endOfMonth(today), 'yyyy-MM-dd')

const datePreset = ref<DatePreset>(route.query.startDate ? 'custom' : 'this-month')
const startDate = ref<string>(initialStart)
const endDate = ref<string>(initialEnd)

const selectedCategoryIds = ref<string[]>([])
const selectedAccountId = ref<string>('')
const selectedExpenseGroupId = ref<string>('')
const minAmount = ref<string>('')
const maxAmount = ref<string>('')

// Dropdown options
const categories = ref<Array<{ id: string; name: string; color?: string; icon?: string; type?: string }>>([])
const accounts = ref<Array<{ id: string; name: string; type?: string }>>([])
const expenseGroups = ref<Array<{ id: string; name: string }>>([])

function applyDatePreset(preset: DatePreset) {
    datePreset.value = preset
    const now = new Date()
    if (preset === 'this-month') {
        startDate.value = format(startOfMonth(now), 'yyyy-MM-dd')
        endDate.value = format(endOfMonth(now), 'yyyy-MM-dd')
    } else if (preset === '3m') {
        startDate.value = format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd')
        endDate.value = format(endOfMonth(now), 'yyyy-MM-dd')
    } else if (preset === 'ytd') {
        startDate.value = format(startOfYear(now), 'yyyy-MM-dd')
        endDate.value = format(endOfMonth(now), 'yyyy-MM-dd')
    } else if (preset === 'all') {
        startDate.value = ''
        endDate.value = ''
    }
}

const activeFilters = computed<HeatmapFilters>(() => ({
    period: datePreset.value === 'all' ? 'all' : undefined,
    categoryIds: selectedCategoryIds.value.length ? selectedCategoryIds.value : undefined,
    accountId: selectedAccountId.value || undefined,
    expenseGroupId: selectedExpenseGroupId.value || undefined,
    minAmount: minAmount.value !== '' && !Number.isNaN(Number(minAmount.value)) ? Number(minAmount.value) : undefined,
    maxAmount: maxAmount.value !== '' && !Number.isNaN(Number(maxAmount.value)) ? Number(maxAmount.value) : undefined,
}))

const activeFilterCount = computed(() => {
    let count = 0
    if (selectedCategoryIds.value.length) count += selectedCategoryIds.value.length
    if (selectedAccountId.value) count += 1
    if (selectedExpenseGroupId.value) count += 1
    if (minAmount.value !== '') count += 1
    if (maxAmount.value !== '') count += 1
    return count
})

function resetFilters() {
    selectedCategoryIds.value = []
    selectedAccountId.value = ''
    selectedExpenseGroupId.value = ''
    minAmount.value = ''
    maxAmount.value = ''
    applyDatePreset('this-month')
}

function toggleCategory(id: string) {
    const idx = selectedCategoryIds.value.indexOf(id)
    if (idx === -1) {
        selectedCategoryIds.value = [...selectedCategoryIds.value, id]
    } else {
        selectedCategoryIds.value = selectedCategoryIds.value.filter(c => c !== id)
    }
}

// --- Heatmap Data ---
const { data, loading, error, fetchHeatmap } = useHeatmapData(
    () => (datePreset.value === 'all' ? '' : startDate.value),
    () => (datePreset.value === 'all' ? '' : endDate.value),
    () => activeFilters.value
)

// --- Location & Merchant Search ---
const {
    query: searchQuery,
    combinedResults,
    searchingPlaces,
    onQueryChange,
    clearSearch,
} = useLocationSearch(data)
const showSearchDropdown = ref(false)

// --- UI Controls ---
const layerMode = ref<LayerMode>('hybrid')
const isPanelOpen = ref(true)
const panelTab = ref<'viewport' | 'filters'>('viewport')
const mapDark = ref<boolean>(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
)
const selectedPointId = ref<string | null>(null)

// --- Formatting Helpers ---
function escapeHtml(raw: string): string {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function formatMoney(amount: number): string {
    const masked = amount / (settingsStore.maskingFactor || 1)
    return `₹${Math.round(masked).toLocaleString('en-IN')}`
}

function formatCompactMoney(amount: number): string {
    const val = amount / (settingsStore.maskingFactor || 1)
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`
    return `₹${Math.round(val)}`
}

function formatDateLabel(iso?: string | null): string {
    if (!iso) return ''
    try {
        return format(new Date(iso), 'dd MMM yyyy')
    } catch {
        return ''
    }
}

// --- Leaflet Map State ---
const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let tileLayer: L.TileLayer | null = null
let heatLayer: any = null
let clusterGroup: any = null
let markerById = new Map<string, L.Marker>()
let themeObserver: MutationObserver | null = null

const viewportBounds = ref<L.LatLngBounds | null>(null)

const visiblePoints = computed<HeatmapDataPoint[]>(() => {
    if (!viewportBounds.value) return data.value
    const bounds = viewportBounds.value
    return data.value.filter(p => bounds.contains([p.latitude, p.longitude]))
})

const viewportSummary = computed(() => {
    const list = visiblePoints.value
    let total = 0
    const byCat = new Map<string, number>()
    for (const p of list) {
        total += p.amount
        const cat = p.category || 'Uncategorized'
        byCat.set(cat, (byCat.get(cat) || 0) + p.amount)
    }
    let topCategory = '—'
    let topAmt = 0
    for (const [cat, amt] of byCat.entries()) {
        if (amt > topAmt) {
            topAmt = amt
            topCategory = cat
        }
    }
    return {
        count: list.length,
        total,
        topCategory,
    }
})

const DEFAULT_OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

function syncTileLayer() {
    if (!map) return
    if (tileLayer) {
        map.removeLayer(tileLayer)
    }
    const customDark = (import.meta.env.VITE_MAP_TILE_URL_DARK as string | undefined)?.trim()
    const customLight = (import.meta.env.VITE_MAP_TILE_URL_LIGHT as string | undefined)?.trim()
    const url = mapDark.value
        ? (customDark || DEFAULT_OSM_TILE_URL)
        : (customLight || DEFAULT_OSM_TILE_URL)

    // Apply CSS dark-mode filter on base tiles when using keyless OSM in dark mode
    if (mapContainer.value) {
        mapContainer.value.classList.toggle('wf-map-dark', mapDark.value && !customDark)
    }

    tileLayer = L.tileLayer(url, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
}

function initMap() {
    if (!mapContainer.value || map) return

    map = L.map(mapContainer.value, {
        zoomControl: false,
        attributionControl: false,
    }).setView([20.5937, 78.9629], 5)

    syncTileLayer()

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    map.on('moveend zoomend', () => {
        if (map) {
            viewportBounds.value = map.getBounds()
        }
    })

    renderLayers(true)
    setTimeout(() => map?.invalidateSize(), 250)
}

function createPinIcon(color: string, isSelected: boolean): L.DivIcon {
    const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#3b82f6'
    const size = isSelected ? 18 : 13
    const ring = isSelected ? 'box-shadow: 0 0 0 5px rgba(59,130,246,0.35);' : 'box-shadow: 0 2px 6px rgba(0,0,0,0.45);'
    return L.divIcon({
        className: 'wf-map-pin-wrapper',
        html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${safeColor};border:2.5px solid #ffffff;${ring}"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    })
}

function buildPopupHtml(p: HeatmapDataPoint): string {
    const title = escapeHtml(p.recipient || p.description || p.category || 'Expense')
    const cat = escapeHtml(p.category || 'Expense')
    const acct = escapeHtml(p.account_name || '')
    const dt = escapeHtml(formatDateLabel(p.date))
    const amt = escapeHtml(formatMoney(p.amount))
    const color = /^#[0-9a-fA-F]{3,8}$/.test(p.category_color || '') ? p.category_color! : '#3b82f6'

    return `
        <div class="wf-popup-card">
            <div class="wf-popup-header">
                <span class="wf-popup-dot" style="background:${color}"></span>
                <span class="wf-popup-cat">${cat}</span>
                ${dt ? `<span class="wf-popup-date">${dt}</span>` : ''}
            </div>
            <div class="wf-popup-amount">${amt}</div>
            <div class="wf-popup-title">${title}</div>
            ${acct ? `<div class="wf-popup-meta">${acct}</div>` : ''}
        </div>
    `
}

function renderLayers(shouldFitBounds = false) {
    if (!map) return

    if (heatLayer) {
        map.removeLayer(heatLayer)
        heatLayer = null
    }
    if (clusterGroup) {
        map.removeLayer(clusterGroup)
        clusterGroup = null
    }
    markerById.clear()

    if (!data.value.length) {
        viewportBounds.value = map.getBounds()
        return
    }

    // 1. Heatmap layer (heatmap or hybrid)
    if (layerMode.value === 'heatmap' || layerMode.value === 'hybrid') {
        const heatPoints = data.value.map(p => {
            const intensity = Math.max(0.35, Math.min(Math.abs(p.amount) / 600, 1.2))
            return [p.latitude, p.longitude, intensity]
        })
        heatLayer = (L as any).heatLayer(heatPoints, {
            radius: 30,
            blur: 18,
            maxZoom: 17,
            minOpacity: layerMode.value === 'hybrid' ? 0.35 : 0.5,
            gradient: HEAT_GRADIENT,
        }).addTo(map)
    }

    // 2. Cluster layer (clusters or hybrid)
    if (layerMode.value === 'clusters' || layerMode.value === 'hybrid') {
        clusterGroup = (L as any).markerClusterGroup({
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            maxClusterRadius: 55,
            iconCreateFunction: (cluster: any) => {
                const children = cluster.getAllChildMarkers()
                const count = children.length
                let sum = 0
                for (const m of children) {
                    sum += (m.options as any).wfAmount || 0
                }
                const tier = sum >= 25000 ? 'high' : sum >= 5000 ? 'med' : 'low'
                return L.divIcon({
                    html: `<div class="wf-cluster-pill wf-cluster-${tier}">
                        <span class="wf-cluster-count">${count}</span>
                        <span class="wf-cluster-sum">${escapeHtml(formatCompactMoney(sum))}</span>
                    </div>`,
                    className: 'wf-cluster-icon',
                    iconSize: L.point(76, 30),
                })
            },
        })

        for (const p of data.value) {
            const key = p.id || `${p.latitude}-${p.longitude}-${p.amount}`
            const marker = L.marker([p.latitude, p.longitude], {
                icon: createPinIcon(p.category_color || '#3b82f6', selectedPointId.value === key),
                // Store amount for cluster aggregation
                ...({ wfAmount: p.amount } as any),
            })
            marker.bindPopup(buildPopupHtml(p), { maxWidth: 260 })
            marker.on('click', () => {
                selectedPointId.value = key
            })
            clusterGroup.addLayer(marker)
            markerById.set(key, marker)
        }
        map.addLayer(clusterGroup)
    }

    if (shouldFitBounds) {
        fitAllBounds()
    } else {
        viewportBounds.value = map.getBounds()
    }
}

function fitAllBounds() {
    if (!map || !data.value.length) return
    if (data.value.length === 1) {
        map.flyTo([data.value[0].latitude, data.value[0].longitude], 14, { duration: 0.6 })
    } else {
        const bounds = L.latLngBounds(data.value.map(p => [p.latitude, p.longitude] as L.LatLngTuple))
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 })
    }
    setTimeout(() => {
        if (map) viewportBounds.value = map.getBounds()
    }, 300)
}

function focusPoint(p: HeatmapDataPoint) {
    if (!map) return
    const key = p.id || `${p.latitude}-${p.longitude}-${p.amount}`
    selectedPointId.value = key
    const marker = markerById.get(key)
    if (clusterGroup && marker) {
        clusterGroup.zoomToShowLayer(marker, () => {
            marker.openPopup()
        })
    } else {
        map.flyTo([p.latitude, p.longitude], 16, { duration: 0.6 })
        marker?.openPopup()
    }
}

function selectSearchResult(item: LocationSearchResult) {
    showSearchDropdown.value = false
    if (!map) return

    if (item.kind === 'transaction') {
        focusPoint(item.point)
    } else if (item.boundingBox) {
        const [south, north, west, east] = item.boundingBox
        map.flyToBounds(
            [
                [south, west],
                [north, east],
            ],
            { padding: [40, 40], maxZoom: 15, duration: 0.8 }
        )
    } else {
        map.flyTo([item.latitude, item.longitude], 14, { duration: 0.8 })
    }
}

function openMerchant(recipient?: string | null) {
    if (!recipient) return
    router.push(`/merchants/${encodeURIComponent(recipient)}`)
}

// --- Load Filter Metadata ---
async function loadFilterOptions() {
    try {
        const [catRes, acctRes, grpRes] = await Promise.all([
            financeApi.getCategories(false),
            financeApi.getAccounts(auth.selectedMemberId || undefined),
            financeApi.getExpenseGroups(auth.selectedMemberId || undefined),
        ])
        categories.value = (Array.isArray(catRes.data) ? catRes.data : []).filter(
            (c: any) => !c.type || c.type === 'expense'
        )
        accounts.value = Array.isArray(acctRes.data) ? acctRes.data : []
        expenseGroups.value = Array.isArray(grpRes.data) ? grpRes.data : []
    } catch (e) {
        console.warn('Could not load spending map filter options', e)
    }
}

watch(data, () => {
    if (map) {
        renderLayers(true)
    }
})

watch([layerMode, () => settingsStore.maskingFactor], () => {
    if (map) {
        renderLayers(false)
    }
})

watch(mapDark, () => {
    syncTileLayer()
})

watch(isPanelOpen, () => {
    nextTick(() => {
        setTimeout(() => map?.invalidateSize(), 260)
    })
})

watch(() => auth.selectedMemberId, () => {
    loadFilterOptions()
})

onMounted(() => {
    loadFilterOptions()
    fetchHeatmap()
    setTimeout(initMap, 80)

    themeObserver = new MutationObserver(() => {
        mapDark.value = document.documentElement.classList.contains('dark')
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
    themeObserver?.disconnect()
    if (map) {
        map.remove()
        map = null
    }
})
</script>

<template>
    <MainLayout>
    <div class="spending-map-page relative flex w-full overflow-hidden rounded-2xl border border-wf-border bg-wf-surface">
        <!-- Map Canvas Area -->
        <div class="relative flex-1 h-full min-w-0">
            <div ref="mapContainer" class="h-full w-full z-0"></div>

            <!-- Floating Top-Left Search & Quick Stats Bar -->
            <div class="absolute top-3 left-3 right-3 sm:right-auto z-[450] flex flex-col gap-2 sm:w-96 pointer-events-none">
                <div class="relative pointer-events-auto">
                    <div class="flex items-center gap-2 rounded-xl border border-wf-border bg-wf-surface/95 backdrop-blur-md px-3 py-2 shadow-lg">
                        <Search :size="16" class="text-wf-text-muted shrink-0" aria-hidden="true" />
                        <input
                            :value="searchQuery"
                            type="text"
                            placeholder="Search places, merchants, or categories..."
                            class="w-full bg-transparent text-sm text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none"
                            @input="onQueryChange(($event.target as HTMLInputElement).value); showSearchDropdown = true"
                            @focus="showSearchDropdown = true"
                            @keydown.escape="showSearchDropdown = false"
                        />
                        <Loader2 v-if="searchingPlaces" :size="15" class="animate-spin text-wf-primary shrink-0" />
                        <button
                            v-else-if="searchQuery"
                            type="button"
                            class="p-0.5 rounded-md text-wf-text-muted hover:text-wf-text-primary"
                            aria-label="Clear search"
                            @click="clearSearch(); showSearchDropdown = false"
                        >
                            <X :size="15" />
                        </button>
                    </div>

                    <!-- Search Results Dropdown -->
                    <div
                        v-if="showSearchDropdown && (combinedResults.length > 0 || (searchQuery.trim().length >= 3 && !searchingPlaces))"
                        class="mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-wf-border bg-wf-surface/98 backdrop-blur-md shadow-xl divide-y divide-wf-border/60"
                    >
                        <button
                            v-for="item in combinedResults"
                            :key="`${item.kind}-${item.id}`"
                            type="button"
                            class="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-wf-surface-variant/80 transition-colors"
                            @click="selectSearchResult(item)"
                        >
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div
                                    class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                    :class="item.kind === 'place' ? 'bg-wf-primary/10 text-wf-primary' : 'bg-emerald-500/10 text-emerald-500'"
                                >
                                    <Compass v-if="item.kind === 'place'" :size="14" />
                                    <Receipt v-else :size="14" />
                                </div>
                                <div class="min-w-0">
                                    <div class="text-xs font-semibold text-wf-text-primary truncate">{{ item.label }}</div>
                                    <div class="text-[11px] text-wf-text-muted truncate">{{ item.sublabel }}</div>
                                </div>
                            </div>
                            <span v-if="item.kind === 'transaction'" class="text-xs font-mono font-semibold text-wf-text-primary shrink-0">
                                {{ formatMoney(item.amount) }}
                            </span>
                            <span v-else class="text-[10px] font-semibold uppercase tracking-wide text-wf-text-muted shrink-0">
                                Place
                            </span>
                        </button>

                        <div
                            v-if="combinedResults.length === 0 && searchQuery.trim().length >= 3 && !searchingPlaces"
                            class="px-3 py-3 text-xs text-wf-text-muted text-center"
                        >
                            No matching places or transactions found.
                        </div>
                    </div>
                </div>
            </div>

            <!-- Floating Top-Right Map Mode & Utility Controls -->
            <div class="absolute top-3 right-3 z-[440] hidden sm:flex items-center gap-2">
                <!-- Layer Mode Switcher -->
                <div class="flex items-center rounded-xl border border-wf-border bg-wf-surface/95 backdrop-blur-md p-1 shadow-lg">
                    <button
                        type="button"
                        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        :class="layerMode === 'hybrid' ? 'bg-wf-primary text-white' : 'text-wf-text-muted hover:text-wf-text-primary'"
                        @click="layerMode = 'hybrid'"
                    >
                        <Layers :size="13" /> Hybrid
                    </button>
                    <button
                        type="button"
                        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        :class="layerMode === 'clusters' ? 'bg-wf-primary text-white' : 'text-wf-text-muted hover:text-wf-text-primary'"
                        @click="layerMode = 'clusters'"
                    >
                        <MapPin :size="13" /> Pins
                    </button>
                    <button
                        type="button"
                        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        :class="layerMode === 'heatmap' ? 'bg-wf-primary text-white' : 'text-wf-text-muted hover:text-wf-text-primary'"
                        @click="layerMode = 'heatmap'"
                    >
                        <Flame :size="13" /> Heat
                    </button>
                </div>

                <!-- Fit Bounds -->
                <button
                    type="button"
                    class="p-2 rounded-xl border border-wf-border bg-wf-surface/95 backdrop-blur-md text-wf-text-primary hover:bg-wf-surface-variant shadow-lg transition-colors"
                    title="Fit all pins"
                    aria-label="Fit all pins"
                    @click="fitAllBounds"
                >
                    <LocateFixed :size="16" />
                </button>

                <!-- Basemap Dark/Light Toggle -->
                <button
                    type="button"
                    class="p-2 rounded-xl border border-wf-border bg-wf-surface/95 backdrop-blur-md text-wf-text-primary hover:bg-wf-surface-variant shadow-lg transition-colors"
                    :title="mapDark ? 'Switch to light map tiles' : 'Switch to dark map tiles'"
                    aria-label="Toggle map basemap theme"
                    @click="mapDark = !mapDark"
                >
                    <Sun v-if="mapDark" :size="16" />
                    <Moon v-else :size="16" />
                </button>

                <!-- Toggle Side Panel -->
                <button
                    type="button"
                    class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-wf-border bg-wf-surface/95 backdrop-blur-md text-xs font-semibold text-wf-text-primary hover:bg-wf-surface-variant shadow-lg transition-colors"
                    @click="isPanelOpen = !isPanelOpen"
                >
                    <SlidersHorizontal :size="14" />
                    <span>Panel</span>
                    <span
                        v-if="activeFilterCount > 0"
                        class="px-1.5 py-0.2 rounded-full text-[10px] bg-wf-primary text-white font-mono"
                    >
                        {{ activeFilterCount }}
                    </span>
                    <ChevronRight v-if="isPanelOpen" :size="14" />
                    <ChevronLeft v-else :size="14" />
                </button>
            </div>

            <!-- Floating Bottom-Left Heatmap Legend -->
            <div
                v-if="layerMode !== 'clusters' && data.length > 0"
                class="absolute bottom-4 left-3 z-[430] flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-wf-border bg-wf-surface/90 backdrop-blur-md shadow-md"
            >
                <span class="text-[10px] font-semibold uppercase text-wf-text-muted">Low</span>
                <div class="wf-heat-legend-bar"></div>
                <span class="text-[10px] font-semibold uppercase text-wf-text-muted">High</span>
                <span class="text-[10px] font-mono font-semibold text-wf-primary ml-1">
                    {{ data.length }} pts
                </span>
            </div>

            <!-- Loading Overlay -->
            <div
                v-if="loading"
                role="status"
                class="absolute inset-0 z-[460] flex flex-col items-center justify-center bg-wf-surface/70 backdrop-blur-[2px]"
            >
                <Loader2 class="w-9 h-9 mb-2.5 animate-spin text-wf-primary" aria-hidden="true" />
                <p class="text-xs font-semibold text-wf-text-muted">Loading geolocated spending...</p>
            </div>

            <!-- Empty / Error Overlay -->
            <div
                v-if="!loading && (error || data.length === 0)"
                class="absolute inset-0 z-[420] flex items-center justify-center pointer-events-none"
            >
                <div class="pointer-events-auto max-w-sm mx-4 rounded-2xl border border-wf-border bg-wf-surface/95 backdrop-blur-md p-6 text-center shadow-xl">
                    <MapPin :size="36" class="mx-auto mb-3 text-wf-text-muted" aria-hidden="true" />
                    <h3 class="text-base font-semibold text-wf-text-primary mb-1">
                        {{ error ? 'Unable to load map data' : 'No Geolocated Expenses' }}
                    </h3>
                    <p class="text-xs text-wf-text-muted mb-4">
                        {{ error || 'No transactions with GPS coordinates match the current filters.' }}
                    </p>
                    <div class="flex items-center justify-center gap-2">
                        <button
                            v-if="datePreset !== 'all'"
                            type="button"
                            class="px-3 py-1.5 rounded-lg bg-wf-primary text-white text-xs font-semibold hover:opacity-90"
                            @click="applyDatePreset('all')"
                        >
                            Try All Time
                        </button>
                        <button
                            v-if="activeFilterCount > 0"
                            type="button"
                            class="px-3 py-1.5 rounded-lg border border-wf-border text-wf-text-primary text-xs font-semibold hover:bg-wf-surface-variant"
                            @click="resetFilters"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Collapsible Right Side Panel (Viewport Summary + Filters) -->
        <aside
            v-if="isPanelOpen"
            class="w-80 lg:w-96 shrink-0 h-full border-l border-wf-border bg-wf-surface flex flex-col z-[445]"
        >
            <!-- Panel Header Tabs -->
            <div class="p-3 border-b border-wf-border flex items-center justify-between gap-2">
                <div class="flex-1 grid grid-cols-2 rounded-lg bg-wf-surface-variant p-1">
                    <button
                        type="button"
                        class="py-1.5 rounded-md text-xs font-semibold transition-colors"
                        :class="panelTab === 'viewport' ? 'bg-wf-surface text-wf-text-primary shadow-sm' : 'text-wf-text-muted hover:text-wf-text-primary'"
                        @click="panelTab = 'viewport'"
                    >
                        In View ({{ viewportSummary.count }})
                    </button>
                    <button
                        type="button"
                        class="py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                        :class="panelTab === 'filters' ? 'bg-wf-surface text-wf-text-primary shadow-sm' : 'text-wf-text-muted hover:text-wf-text-primary'"
                        @click="panelTab = 'filters'"
                    >
                        <span>Filters</span>
                        <span
                            v-if="activeFilterCount > 0"
                            class="px-1.5 rounded-full text-[10px] bg-wf-primary text-white font-mono"
                        >
                            {{ activeFilterCount }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- TAB 1: Viewport Summary & Visible Transactions -->
            <div v-if="panelTab === 'viewport'" class="flex-1 flex flex-col min-h-0">
                <!-- KPI Strip -->
                <div class="p-3.5 border-b border-wf-border grid grid-cols-2 gap-2.5 bg-wf-surface-variant/30">
                    <div class="rounded-xl border border-wf-border bg-wf-surface p-2.5">
                        <div class="text-[10px] font-semibold uppercase tracking-wide text-wf-text-muted">Visible Spend</div>
                        <div class="text-base font-bold font-mono text-wf-text-primary mt-0.5">
                            {{ formatMoney(viewportSummary.total) }}
                        </div>
                    </div>
                    <div class="rounded-xl border border-wf-border bg-wf-surface p-2.5">
                        <div class="text-[10px] font-semibold uppercase tracking-wide text-wf-text-muted">Top Category</div>
                        <div class="text-xs font-semibold text-wf-text-primary mt-1 truncate" :title="viewportSummary.topCategory">
                            {{ viewportSummary.topCategory }}
                        </div>
                    </div>
                </div>

                <!-- Scrollable Visible Transactions -->
                <div class="flex-1 overflow-y-auto divide-y divide-wf-border/60">
                    <div
                        v-for="p in visiblePoints"
                        :key="p.id || `${p.latitude}-${p.longitude}-${p.amount}`"
                        class="px-3.5 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-wf-surface-variant/60 transition-colors"
                        :class="{ 'bg-wf-primary/10': selectedPointId === (p.id || `${p.latitude}-${p.longitude}-${p.amount}`) }"
                        @click="focusPoint(p)"
                    >
                        <div class="flex items-center gap-2.5 min-w-0">
                            <BrandIcon
                                :name="p.recipient || p.description || ''"
                                :category="p.category || 'Other'"
                                size="sm"
                            />
                            <div class="min-w-0">
                                <div class="text-xs font-semibold text-wf-text-primary truncate">
                                    {{ p.recipient || p.description || p.category }}
                                </div>
                                <div class="text-[11px] text-wf-text-muted truncate flex items-center gap-1.5">
                                    <span
                                        class="inline-block w-2 h-2 rounded-full shrink-0"
                                        :style="{ backgroundColor: p.category_color || '#3b82f6' }"
                                    ></span>
                                    <span class="truncate">{{ p.category }}</span>
                                    <span v-if="p.date">· {{ formatDateLabel(p.date) }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right shrink-0 flex items-center gap-1.5">
                            <span class="text-xs font-mono font-bold text-wf-text-primary">
                                {{ formatMoney(p.amount) }}
                            </span>
                            <button
                                v-if="p.recipient"
                                type="button"
                                class="p-1 rounded-md text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface"
                                title="Open merchant details"
                                @click.stop="openMerchant(p.recipient)"
                            >
                                <ExternalLink :size="12" />
                            </button>
                        </div>
                    </div>

                    <div v-if="visiblePoints.length === 0" class="p-6 text-center text-xs text-wf-text-muted">
                        Pan or zoom out to see transactions in this area.
                    </div>
                </div>
            </div>

            <!-- TAB 2: Pin Filters -->
            <div v-else class="flex-1 overflow-y-auto p-3.5 space-y-4">
                <!-- Date Range Presets -->
                <div>
                    <label class="text-[11px] font-semibold uppercase tracking-wide text-wf-text-muted flex items-center gap-1.5 mb-2">
                        <Calendar :size="12" /> Date Range
                    </label>
                    <div class="grid grid-cols-2 gap-1.5">
                        <button
                            v-for="preset in ([
                                { key: 'this-month', label: 'This Month' },
                                { key: '3m', label: 'Last 3 Months' },
                                { key: 'ytd', label: 'This Year' },
                                { key: 'all', label: 'All Time' },
                            ] as const)"
                            :key="preset.key"
                            type="button"
                            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                            :class="datePreset === preset.key
                                ? 'border-wf-primary bg-wf-primary/10 text-wf-primary'
                                : 'border-wf-border text-wf-text-muted hover:text-wf-text-primary'"
                            @click="applyDatePreset(preset.key)"
                        >
                            {{ preset.label }}
                        </button>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <input
                            v-model="startDate"
                            type="date"
                            class="w-full rounded-lg border border-wf-border bg-wf-surface-variant px-2 py-1.5 text-xs text-wf-text-primary"
                            @change="datePreset = 'custom'"
                        />
                        <input
                            v-model="endDate"
                            type="date"
                            class="w-full rounded-lg border border-wf-border bg-wf-surface-variant px-2 py-1.5 text-xs text-wf-text-primary"
                            @change="datePreset = 'custom'"
                        />
                    </div>
                </div>

                <!-- Categories Multi-Select Chips -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-[11px] font-semibold uppercase tracking-wide text-wf-text-muted">
                            Categories
                        </label>
                        <button
                            v-if="selectedCategoryIds.length"
                            type="button"
                            class="text-[11px] text-wf-primary hover:underline"
                            @click="selectedCategoryIds = []"
                        >
                            Clear
                        </button>
                    </div>
                    <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                        <button
                            v-for="cat in categories"
                            :key="cat.id"
                            type="button"
                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
                            :class="selectedCategoryIds.includes(cat.id)
                                ? 'border-wf-primary bg-wf-primary/15 text-wf-primary'
                                : 'border-wf-border bg-wf-surface-variant/60 text-wf-text-secondary hover:border-wf-primary/50'"
                            @click="toggleCategory(cat.id)"
                        >
                            <span
                                class="w-2 h-2 rounded-full"
                                :style="{ backgroundColor: cat.color || '#3b82f6' }"
                            ></span>
                            <span>{{ cat.name }}</span>
                        </button>
                    </div>
                </div>

                <!-- Account Select -->
                <div>
                    <label class="text-[11px] font-semibold uppercase tracking-wide text-wf-text-muted block mb-1.5">
                        Account
                    </label>
                    <select
                        v-model="selectedAccountId"
                        class="w-full rounded-lg border border-wf-border bg-wf-surface-variant px-2.5 py-2 text-xs text-wf-text-primary"
                    >
                        <option value="">All Accounts</option>
                        <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                    </select>
                </div>

                <!-- Expense Group Select -->
                <div v-if="expenseGroups.length">
                    <label class="text-[11px] font-semibold uppercase tracking-wide text-wf-text-muted block mb-1.5">
                        Expense Group
                    </label>
                    <select
                        v-model="selectedExpenseGroupId"
                        class="w-full rounded-lg border border-wf-border bg-wf-surface-variant px-2.5 py-2 text-xs text-wf-text-primary"
                    >
                        <option value="">All Expense Groups</option>
                        <option v-for="g in expenseGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
                    </select>
                </div>

                <!-- Amount Range -->
                <div>
                    <label class="text-[11px] font-semibold uppercase tracking-wide text-wf-text-muted block mb-1.5">
                        Amount Range (₹)
                    </label>
                    <div class="grid grid-cols-2 gap-2">
                        <input
                            v-model="minAmount"
                            type="number"
                            min="0"
                            placeholder="Min ₹"
                            class="w-full rounded-lg border border-wf-border bg-wf-surface-variant px-2.5 py-1.5 text-xs text-wf-text-primary"
                        />
                        <input
                            v-model="maxAmount"
                            type="number"
                            min="0"
                            placeholder="Max ₹"
                            class="w-full rounded-lg border border-wf-border bg-wf-surface-variant px-2.5 py-1.5 text-xs text-wf-text-primary"
                        />
                    </div>
                </div>

                <!-- Reset Button -->
                <button
                    type="button"
                    class="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-wf-border text-xs font-semibold text-wf-text-secondary hover:bg-wf-surface-variant transition-colors"
                    @click="resetFilters"
                >
                    <RotateCcw :size="13" /> Reset All Filters
                </button>
            </div>
        </aside>
    </div>
    </MainLayout>
</template>

<style scoped>
.spending-map-page {
    height: calc(100vh - 6.5rem);
    min-height: 540px;
}

.wf-heat-legend-bar {
    width: 84px;
    height: 6px;
    border-radius: 4px;
    background: linear-gradient(to right, #3b82f6, #10b981, #f59e0b, #ef4444, #7f1d1d);
}

:deep(.leaflet-container) {
    background: var(--wf-color-surface) !important;
    font-family: inherit;
}

:deep(.wf-cluster-icon) {
    background: transparent !important;
    border: none !important;
}

:deep(.wf-cluster-pill) {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 9999px;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

:deep(.wf-cluster-low) {
    background: linear-gradient(135deg, #2563eb, #3b82f6);
}

:deep(.wf-cluster-med) {
    background: linear-gradient(135deg, #d97706, #f59e0b);
}

:deep(.wf-cluster-high) {
    background: linear-gradient(135deg, #dc2626, #ef4444);
}

:deep(.wf-cluster-count) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.25);
    font-size: 10px;
}

:deep(.wf-cluster-sum) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

:deep(.leaflet-popup-content-wrapper),
:deep(.leaflet-popup-tip) {
    background: var(--wf-color-surface) !important;
    color: var(--wf-color-text-primary) !important;
}

:deep(.leaflet-popup-content-wrapper) {
    border: 1px solid var(--wf-color-border);
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
}

:deep(.wf-popup-card) {
    min-width: 170px;
    padding: 2px;
}

:deep(.wf-popup-header) {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--wf-color-text-muted);
    margin-bottom: 4px;
}

:deep(.wf-popup-dot) {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    flex-shrink: 0;
}

:deep(.wf-popup-date) {
    margin-left: auto;
    font-size: 10px;
}

:deep(.wf-popup-amount) {
    font-size: 16px;
    font-weight: 800;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    margin-bottom: 2px;
}

:deep(.wf-popup-title) {
    font-size: 12px;
    font-weight: 600;
}

:deep(.wf-popup-meta) {
    font-size: 10px;
    color: var(--wf-color-text-muted);
    margin-top: 2px;
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
