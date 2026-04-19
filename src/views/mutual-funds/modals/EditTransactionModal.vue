<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  transaction: any
  loading?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const isOpen = ref(props.modelValue)
const formData = ref({
  date: '',
  type: 'BUY',
  amount: 0,
  units: 0,
  nav: 0
})

watch(() => props.modelValue, (val) => {
  isOpen.value = val
  if (val && props.transaction) {
    // Initialize form with transaction data
    formData.value = {
      date: props.transaction.date,
      type: props.transaction.type,
      amount: props.transaction.amount,
      units: props.transaction.units,
      nav: props.transaction.nav
    }
  }
})

watch(isOpen, (val) => {
  emit('update:modelValue', val)
})

const close = () => {
  isOpen.value = false
}

const save = () => {
  emit('save', {
    id: props.transaction.id,
    data: { ...formData.value }
  })
}

const isValid = computed(() => {
  return formData.value.date && 
         formData.value.amount > 0 && 
         formData.value.units > 0 && 
         formData.value.nav > 0
})
</script>

<template>
  <v-dialog v-model="isOpen" max-width="500" persistent>
    <v-card class="rounded-xl overflow-hidden glass-card border">
      <v-card-title class="pa-6 pb-0 d-flex align-center">
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" class="mr-2"></v-btn>
        <span class="text-h6 font-weight-bold">Edit Transaction</span>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form @submit.prevent="save">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.date"
                label="Date"
                type="date"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="mb-4"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.type"
                :items="['BUY', 'SELL']"
                label="Type"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="mb-4"
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model.number="formData.amount"
                label="Total Amount (₹)"
                type="number"
                variant="outlined"
                density="comfortable"
                prefix="₹"
                hide-details="auto"
                class="mb-4"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.units"
                label="Units"
                type="number"
                step="0.0001"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="mb-4"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.nav"
                label="NAV"
                type="number"
                step="0.0001"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="mb-4"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-form>

        <v-alert
          type="info"
          variant="tonal"
          class="mt-4 rounded-lg text-caption"
          density="compact"
        >
          Updating this transaction will trigger a recalculation of your entire holding balance and P/L history for this fund.
        </v-alert>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-6 pt-4">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="flat"
          class="text-none font-weight-bold px-10 rounded-lg elevation-2"
          :loading="loading"
          :disabled="!isValid"
          @click="save"
        >
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.glass-card {
  background: rgba(var(--v-theme-surface), 0.95) !important;
  backdrop-filter: blur(20px);
}
</style>
