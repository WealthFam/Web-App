import { defineStore } from 'pinia'
import { ref } from 'vue'
import { brandsApi, type BrandLogo } from '@/api/client'

export const useBrandsStore = defineStore('brands', () => {
    const brands = ref<BrandLogo[]>([])
    const loading = ref(false)
    const loaded = ref(false)

    // Precompiled regex cache for fast iteration
    const compiledRegexes: { brand: BrandLogo; regex: RegExp }[] = []

    // Runtime memoization cache (candidateText -> BrandLogo | null)
    const memoCache = new Map<string, BrandLogo | null>()

    async function fetchBrands(force: boolean = false) {
        if (loaded.value && !force) return
        loading.value = true
        try {
            const res = await brandsApi.getCatalog()
            const brandList = res.data.brands || []
            brands.value = brandList

            // Rebuild compiled regex cache
            compiledRegexes.length = 0
            memoCache.clear()

            for (const b of brandList) {
                if (!b.is_active || !b.regex_pattern) continue
                try {
                    compiledRegexes.push({
                        brand: b,
                        regex: new RegExp(b.regex_pattern, 'i')
                    })
                } catch (e) {
                    console.warn(`Failed to compile regex for brand ${b.brand_name}:`, e)
                }
            }
            loaded.value = true
        } catch (e) {
            console.error('Failed to load brand catalog:', e)
        } finally {
            loading.value = false
        }
    }

    function matchBrand(text?: string | null): BrandLogo | null {
        if (!text) return null
        const candidate = text.trim()
        if (!candidate) return null

        if (memoCache.has(candidate)) {
            return memoCache.get(candidate) ?? null
        }

        for (const item of compiledRegexes) {
            try {
                if (item.regex.test(candidate)) {
                    memoCache.set(candidate, item.brand)
                    return item.brand
                }
            } catch {
                continue
            }
        }

        memoCache.set(candidate, null)
        return null
    }

    function clearCache() {
        memoCache.clear()
    }

    return {
        brands,
        loading,
        loaded,
        fetchBrands,
        matchBrand,
        clearCache
    }
})
