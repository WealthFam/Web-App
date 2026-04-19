<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  transaction: any
  loading?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'confirm'])

const isOpen = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  isOpen.value = val
})

watch(isOpen, (val) => {
  emit('update:modelValue', val)
})

const close = () => {
  isOpen.value = false
}

const confirm = () => {
  emit('confirm', props.transaction.id)
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="450" persistent>
    <v-card class="rounded-xl overflow-hidden glass-card border">
      <div class="pa-6 text-center">
        <v-avatar color="error" size="64" class="mb-4 elevation-4">
          <v-icon size="32" color="white">mdi-trash-can-outline</v-icon>
        </v-avatar>
        
        <v-card-title class="text-h5 font-weight-bold pa-0 mb-2">
          Remove Transaction?
        </v-card-title>
        
        <v-card-text class="text-body-1 text-medium-emphasis pa-0">
          This record will be permanently hidden and your portfolio balances will be recalculated.
        </v-card-text>
      </div>

      <v-divider></v-divider>

      <div class="pa-6 bg-surface-light">
        <div class="d-flex flex-column gap-3">
          <div class="d-flex justify-space-between align-center">
            <span class="text-caption text-medium-emphasis">Date</span>
            <span class="text-body-2 font-weight-medium">{{ transaction?.date }}</span>
          </div>
          <div class="d-flex justify-space-between align-center">
            <span class="text-caption text-medium-emphasis">Type</span>
            <v-chip size="x-small" :color="transaction?.type === 'BUY' ? 'success' : 'error'" variant="flat" class="text-uppercase font-weight-bold">
              {{ transaction?.type }}
            </v-chip>
          </div>
          <div class="d-flex justify-space-between align-center">
            <span class="text-caption text-medium-emphasis">Amount</span>
            <span class="text-body-2 font-weight-bold text-primary">₹{{ transaction?.amount?.toLocaleString() }}</span>
          </div>
          <div class="d-flex justify-space-between align-center">
            <span class="text-caption text-medium-emphasis">Units</span>
            <span class="text-body-2 font-weight-medium">{{ transaction?.units?.toFixed(4) }}</span>
          </div>
        </div>
      </div>

      <v-divider></v-divider>

      <v-card-actions class="pa-6 pt-4">
        <v-btn
          variant="text"
          class="text-none font-weight-bold px-4"
          @click="close"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="error"
          variant="flat"
          class="text-none font-weight-bold px-8 rounded-lg"
          :loading="loading"
          @click="confirm"
        >
          Remove Record
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

.gap-3 {
  gap: 12px;
}
</style>
