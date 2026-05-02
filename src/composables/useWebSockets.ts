import { watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useActivityStore } from '@/stores/activity'

let socket: WebSocket | null = null
let reconnectTimer: any = null
let reconnectAttempts = 0

export function useWebSockets() {
    const auth = useAuthStore()
    const activityStore = useActivityStore()

    const connect = () => {
        if (!auth.token || !auth.user?.tenant_id) return
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        let host = window.location.host

        const tenantId = auth.user.tenant_id
        const token = auth.token

        const wsUrl = `${protocol}//${host}/ws/${tenantId}?token=${token}`
        console.log(`[WebSockets] Connecting to ${wsUrl}`)

        if (socket) {
            socket.close()
        }

        socket = new WebSocket(wsUrl)

        socket.onopen = () => {
            activityStore.setConnected(true);
            reconnectAttempts = 0; // Reset attempts on success
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                activityStore.setLastEvent(data);

                if (data.type === 'NOTIFICATION') {
                    activityStore.addActivity(data.payload);
                }
            } catch (e) {
                console.error('[WebSockets] Error parsing message:', e);
            }
        };

        socket.onclose = (_event) => {
            activityStore.setConnected(false);
            if (!reconnectTimer) {
                // Bug 8 Fix: Exponential Backoff
                const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 300000); // Start 5s, cap 5m
                console.log(`[WebSockets] Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts + 1})`);
                
                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    reconnectAttempts++;
                    connect();
                }, delay);
            }
        };

        socket.onerror = () => {
            socket?.close();
        };
    }

    const disconnect = () => {
        if (socket) {
            socket.close()
            socket = null
        }
        if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
        }
    }

    // Reconnect on auth or tenant change to ensure we have the needed context
    watch([() => auth.token, () => auth.user?.tenant_id], ([newToken, newTenant]) => {
        if (newToken && newTenant) {
            connect()
            activityStore.fetchActivities()
        } else if (!newToken) {
            disconnect()
            activityStore.clearActivities()
        }
    }, { immediate: true })

    return {
        notifications: computed(() => activityStore.activities),
        isConnected: computed(() => activityStore.isConnected),
        clearNotifications: () => activityStore.clearActivities(),
        fetchNotifications: (limit?: number) => activityStore.fetchActivities(limit)
    }
}
