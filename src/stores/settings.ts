import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
    // Default to 1 (no masking)
    const maskingFactor = ref<number>(Number(localStorage.getItem('maskingFactor')) || 1)
    const isMasked = ref<boolean>(localStorage.getItem('isMasked') === 'true')

    // Persist changes
    watch(maskingFactor, (val) => {
        localStorage.setItem('maskingFactor', val.toString())
    })
    
    watch(isMasked, (val) => {
        localStorage.setItem('isMasked', val.toString())
        if (!val) maskingFactor.value = 1
        else {
            // Generate a random masking factor between 5 and 50
            maskingFactor.value = Math.floor(Math.random() * 45) + 5
        }
    })

    function toggleMasking() {
        isMasked.value = !isMasked.value
    }

    return {
        maskingFactor,
        isMasked,
        toggleMasking
    }
})
