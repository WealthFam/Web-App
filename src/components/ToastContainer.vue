<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-vue-next'

const store = useNotificationStore()
</script>

<template>
    <div class="toast-container">
        <transition-group name="toast">
            <div v-for="note in store.notifications" :key="note.id" class="toast" :class="note.type"
                @click="store.remove(note.id)">
                <div class="icon-wrapper">
                    <CheckCircle v-if="note.type === 'success'" :size="20" class="text-success" />
                    <AlertCircle v-if="note.type === 'error'" :size="20" class="text-error" />
                    <Info v-if="note.type === 'info'" :size="20" class="text-wf-primary" />
                </div>
                <div class="content">{{ note.message }}</div>
                <button class="close-btn" aria-label="Dismiss notification">
                    <X :size="14" class="text-medium-emphasis" />
                </button>
            </div>
        </transition-group>
    </div>
</template>

<style scoped>
.toast-container {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    z-index: 9999;
    pointer-events: none;
}

.toast {
    pointer-events: auto;
    min-width: 320px;
    max-width: 400px;
    padding: 1rem;
    border-radius: 12px;
    background: var(--wf-color-surface, #ffffff);
    color: var(--wf-color-text-primary, #0f172a);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    border: 1px solid var(--wf-color-border, #e2e8f0);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
}

/* Status variants with left colored accent */
.toast::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
}

.toast.success::before {
    background: var(--wf-color-success);
}

.toast.error::before {
    background: var(--wf-color-error);
}

.toast.info::before {
    background: var(--wf-color-primary);
}

/* Subtle tint based on type */
.toast.success {
    background: linear-gradient(to right, rgba(16, 185, 129, 0.08), var(--wf-color-surface, #ffffff));
}

.toast.error {
    background: linear-gradient(to right, rgba(239, 68, 68, 0.08), var(--wf-color-surface, #ffffff));
}

.toast.info {
    background: linear-gradient(to right, rgba(99, 102, 241, 0.08), var(--wf-color-surface, #ffffff));
}

.content {
    font-size: 0.9rem;
    font-weight: 500;
    line-height: 1.4;
    flex-grow: 1;
}

.close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
}

.close-btn:hover {
    opacity: 1;
}

/* Text Colors */
.text-success {
    color: var(--wf-color-success);
}

.text-error {
    color: var(--wf-color-error);
}

.text-wf-primary {
    color: var(--wf-color-primary);
}

.text-medium-emphasis {
    color: var(--wf-color-text-secondary, #64748b);
}

/* Animation */
.toast-enter-active,
.toast-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateX(30px) scale(0.95);
}
</style>
