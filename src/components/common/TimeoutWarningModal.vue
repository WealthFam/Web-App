<script setup lang="ts">
import { AlertTriangle, Clock, LogOut, CheckCircle2 } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  remainingSeconds: number
}>()

const emit = defineEmits<{
  (e: 'stayLoggedIn'): void
  (e: 'logoutNow'): void
}>()
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="props.visible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeout-title"
    >
      <div class="relative w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/50">
        <!-- Warning Icon & Badge -->
        <div class="flex items-center space-x-3 mb-4">
          <div class="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <AlertTriangle class="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 id="timeout-title" class="text-lg font-bold text-slate-900 dark:text-white">
              Session Expiring Soon
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Inactivity detected for your security
            </p>
          </div>
        </div>

        <!-- Countdown Display -->
        <div class="my-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center">
          <div class="flex items-center justify-center space-x-2 text-amber-800 dark:text-amber-300 font-medium">
            <Clock class="w-5 h-5 animate-spin" />
            <span>Auto-locking in</span>
            <span class="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {{ props.remainingSeconds }}s
            </span>
          </div>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Click Stay Logged In to continue your work without interruption.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end space-x-3 mt-6">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center space-x-1.5"
            @click="emit('logoutNow')"
          >
            <LogOut class="w-4 h-4" />
            <span>Log Out</span>
          </button>
          <button
            type="button"
            class="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md transition flex items-center space-x-1.5"
            @click="emit('stayLoggedIn')"
          >
            <CheckCircle2 class="w-4 h-4" />
            <span>Stay Logged In</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
