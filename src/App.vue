<script setup lang="ts">
import { RouterView } from 'vue-router'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import TimeoutWarningModal from '@/components/common/TimeoutWarningModal.vue'
import { useIdleTimeout } from '@/composables/useIdleTimeout'

const { isWarningVisible, remainingSeconds, stayLoggedIn, logoutNow } = useIdleTimeout()
</script>

<template>
  <RouterView />
  <ConfirmDialog />
  <TimeoutWarningModal
    :visible="isWarningVisible"
    :remaining-seconds="remainingSeconds"
    @stay-logged-in="stayLoggedIn"
    @logout-now="logoutNow"
  />
</template>

<style scoped>
</style>
