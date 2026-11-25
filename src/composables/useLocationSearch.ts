import { ref, computed, type Ref } from 'vue'
import type { HeatmapDataPoint } from './useHeatmapData'

export interface PlaceResult {
    kind: 'place'
    id: string
    label: string
    sublabel: string
    latitude: number
    longitude: number
    boundingBox?: [number, number, number, number] // [south, north, west, east]
}

export interface TransactionLocationResult {
    kind: 'transaction'
    id: string
    label: string
    sublabel: string
    amount: number
    latitude: number
    longitude: number
    point: HeatmapDataPoint
}

export type LocationSearchResult = PlaceResult | TransactionLocationResult

const nominatimCache = new Map<string, PlaceResult[]>()
const MAX_CACHE_ENTRIES = 50

export function useLocationSearch(points: Ref<HeatmapDataPoint[]>) {
    const query = ref('')
    const places = ref<PlaceResult[]>([])
    const searchingPlaces = ref(false)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let activeController: AbortController | null = null

    const localMatches = computed<TransactionLocationResult[]>(() => {
        const q = query.value.trim().toLowerCase()
        if (q.length < 2) return []

        const matches: TransactionLocationResult[] = []
        for (const p of points.value) {
            const hay = `${p.recipient || ''} ${p.description || ''} ${p.category || ''} ${p.account_name || ''}`.toLowerCase()
            if (hay.includes(q)) {
                matches.push({
                    kind: 'transaction',
                    id: p.id || `${p.latitude}-${p.longitude}-${p.amount}`,
                    label: p.recipient || p.description || p.category || 'Transaction',
                    sublabel: `${p.category || 'Expense'}${p.account_name ? ` · ${p.account_name}` : ''}`,
                    amount: p.amount,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    point: p,
                })
                if (matches.length >= 6) break
            }
        }
        return matches
    })

    const combinedResults = computed<LocationSearchResult[]>(() => [
        ...localMatches.value,
        ...places.value,
    ])

    function onQueryChange(nextQuery: string) {
        query.value = nextQuery
        const trimmed = nextQuery.trim()

        if (debounceTimer) clearTimeout(debounceTimer)
        if (activeController) {
            activeController.abort()
            activeController = null
        }

        if (trimmed.length < 3) {
            places.value = []
            searchingPlaces.value = false
            return
        }

        const cacheKey = trimmed.toLowerCase()
        if (nominatimCache.has(cacheKey)) {
            places.value = nominatimCache.get(cacheKey) || []
            searchingPlaces.value = false
            return
        }

        searchingPlaces.value = true
        debounceTimer = setTimeout(() => {
            fetchNominatimPlaces(trimmed, cacheKey)
        }, 420)
    }

    async function fetchNominatimPlaces(rawQuery: string, cacheKey: string) {
        const controller = new AbortController()
        activeController = controller
        try {
            const url = new URL('https://nominatim.openstreetmap.org/search')
            url.searchParams.set('format', 'json')
            url.searchParams.set('limit', '5')
            url.searchParams.set('q', rawQuery)

            const res = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                },
            })
            if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
            const json = await res.json()
            if (!Array.isArray(json)) {
                places.value = []
                return
            }

            const mapped: PlaceResult[] = []
            for (const item of json) {
                const lat = parseFloat(item.lat)
                const lon = parseFloat(item.lon)
                if (Number.isNaN(lat) || Number.isNaN(lon)) continue
                const parts = String(item.display_name || '').split(',').map((s: string) => s.trim())
                const bbox: [number, number, number, number] | undefined =
                    Array.isArray(item.boundingbox) && item.boundingbox.length === 4
                        ? [
                            parseFloat(item.boundingbox[0]),
                            parseFloat(item.boundingbox[1]),
                            parseFloat(item.boundingbox[2]),
                            parseFloat(item.boundingbox[3]),
                        ]
                        : undefined
                mapped.push({
                    kind: 'place',
                    id: String(item.place_id || `${lat}-${lon}`),
                    label: parts[0] || rawQuery,
                    sublabel: parts.slice(1, 4).join(', ') || String(item.type || 'Location'),
                    latitude: lat,
                    longitude: lon,
                    boundingBox: bbox,
                })
            }

            if (nominatimCache.size >= MAX_CACHE_ENTRIES) {
                const firstKey = nominatimCache.keys().next().value
                if (firstKey) nominatimCache.delete(firstKey)
            }
            nominatimCache.set(cacheKey, mapped)
            places.value = mapped
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                places.value = []
            }
        } finally {
            if (activeController === controller) {
                searchingPlaces.value = false
                activeController = null
            }
        }
    }

    function clearSearch() {
        query.value = ''
        places.value = []
        searchingPlaces.value = false
        if (debounceTimer) clearTimeout(debounceTimer)
        if (activeController) {
            activeController.abort()
            activeController = null
        }
    }

    return {
        query,
        places,
        localMatches,
        combinedResults,
        searchingPlaces,
        onQueryChange,
        clearSearch,
    }
}
