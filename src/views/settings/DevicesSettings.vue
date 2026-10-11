<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { mobileApi, financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import {
  Smartphone,
  Edit2,
  Copy,
  Trash2,
  RefreshCw,
  ClipboardList,
  Bell,
  Search,
  X,
  LogOut,
  CheckCircle2,
  Play,
  Pause
} from 'lucide-vue-next'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'

const notify = useNotificationStore()

// State
const devices = ref<any[]>([])
const familyMembers = ref<any[]>([])
const searchQuery = ref('')
const loading = ref(false)

// Pagination State
const pendingPage = ref(1)
const pendingPageSize = 8
const activePage = ref(1)
const activePageSize = 8
const ignoredPage = ref(1)
const ignoredPageSize = 8

// Modal State
const showDeviceAssignModal = ref(false)
const deviceToAssign = ref<any>(null)
const selectedAssignUserId = ref<string | null>(null)
const editDeviceName = ref('')
const showDeviceDeleteConfirm = ref(false)
const deviceToDelete = ref<any>(null)

// Ingestion Events State
const ingestionEvents = ref<any[]>([])
const eventPagination = ref({ total: 0, limit: 10, skip: 0 })
const selectedEvents = ref<string[]>([])
const isDeletingEvents = ref(false)
const isTestingDevice = ref<string | null>(null)

function formatDate(dateStr: string) {
  if (!dateStr) return { day: 'N/A', meta: '' }
  const d = new Date(dateStr)
  return {
    day: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    meta: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleString()
  }
}

const getDeviceUser = (userId: string) => {
  if (!userId) return null
  return familyMembers.value.find(u => u.id === userId)
}

const isOnline = (dateStr: string) => {
  if (!dateStr) return false
  const lastSeen = new Date(dateStr).getTime()
  const now = new Date().getTime()
  return (now - lastSeen) < (10 * 60 * 1000) // 10 minutes
}

const filteredDevices = computed(() => {
  if (!searchQuery.value) return devices.value
  const q = searchQuery.value.toLowerCase()
  return devices.value.filter(d =>
    (d.device_name || '').toLowerCase().includes(q) ||
    (d.device_id || '').toLowerCase().includes(q)
  )
})

const pendingDevices = computed(() => filteredDevices.value.filter(d => !d.is_approved && !d.is_ignored))
const totalPendingPages = computed(() => Math.ceil(pendingDevices.value.length / pendingPageSize) || 1)
const paginatedPendingDevices = computed(() => {
  const start = (pendingPage.value - 1) * pendingPageSize
  return pendingDevices.value.slice(start, start + pendingPageSize)
})

const activeDevices = computed(() => filteredDevices.value.filter(d => d.is_approved && !d.is_ignored))
const totalActivePages = computed(() => Math.ceil(activeDevices.value.length / activePageSize) || 1)
const paginatedActiveDevices = computed(() => {
  const start = (activePage.value - 1) * activePageSize
  return activeDevices.value.slice(start, start + activePageSize)
})

const ignoredDevices = computed(() => filteredDevices.value.filter(d => d.is_ignored))
const totalIgnoredPages = computed(() => Math.ceil(ignoredDevices.value.length / ignoredPageSize) || 1)
const paginatedIgnoredDevices = computed(() => {
  const start = (ignoredPage.value - 1) * ignoredPageSize
  return ignoredDevices.value.slice(start, start + ignoredPageSize)
})

watch(searchQuery, () => {
  pendingPage.value = 1
  activePage.value = 1
  ignoredPage.value = 1
})

const fetchIngestionEvents = async (deviceId?: string, resetSkip = false) => {
  try {
    if (resetSkip) eventPagination.value.skip = 0
    const res = await financeApi.getIngestionEvents({
      limit: eventPagination.value.limit,
      skip: eventPagination.value.skip,
      device_id: deviceId
    })
    ingestionEvents.value = res.data.items || []
    eventPagination.value.total = res.data.total || 0
    selectedEvents.value = []
  } catch (e) {
    console.error('Failed to fetch events', e)
  }
}

const toggleSelectAllEvents = () => {
  if (selectedEvents.value.length === ingestionEvents.value.length) {
    selectedEvents.value = []
  } else {
    selectedEvents.value = ingestionEvents.value.map(e => e.id)
  }
}

const toggleSelectEvent = (id: string) => {
  if (selectedEvents.value.includes(id)) {
    selectedEvents.value = selectedEvents.value.filter(eId => eId !== id)
  } else {
    selectedEvents.value.push(id)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const [devicesRes, usersRes] = await Promise.all([
      mobileApi.getDevices(),
      financeApi.getUsers()
    ])
    devices.value = devicesRes.data || []
    familyMembers.value = usersRes.data || []
  } catch (e) {
    console.error('Failed to fetch device settings', e)
    notify.error('Failed to load device settings')
  } finally {
    loading.value = false
  }
}

function openAssignModal(device: any) {
  deviceToAssign.value = device
  selectedAssignUserId.value = device.user_id || null
  editDeviceName.value = device.device_name || ''
  showDeviceAssignModal.value = true
}

async function confirmAssignUser() {
  if (!deviceToAssign.value) return
  try {
    await mobileApi.updateDevice(deviceToAssign.value.id, {
      device_name: editDeviceName.value,
      user_id: selectedAssignUserId.value
    })
    notify.success('Device settings updated')
    showDeviceAssignModal.value = false
    fetchData()
  } catch (e: any) {
    notify.error('Failed to update device')
  }
}

const toggleDeviceApproval = async (device: any) => {
  try {
    await mobileApi.toggleApproval(device.id, !device.is_approved)
    notify.success(device.is_approved ? 'Device unapproved' : 'Device approved')
    fetchData()
  } catch (e) {
    notify.error('Failed to toggle device approval')
  }
}

const toggleDeviceIgnored = async (device: any, ignored: boolean) => {
  try {
    await mobileApi.toggleIgnored(device.id, ignored)
    notify.success(ignored ? 'Device ignored' : 'Device restored')
    fetchData()
  } catch (e) {
    notify.error('Failed to update status')
  }
}

const toggleDeviceEnabled = async (device: any) => {
  try {
    await mobileApi.toggleEnabled(device.id, !device.is_enabled)
    notify.success(device.is_enabled ? 'Device ingestion paused' : 'Device ingestion resumed')
    fetchData()
  } catch (e) {
    notify.error('Failed to update device status')
  }
}

const testNotification = async (device: any) => {
  isTestingDevice.value = device.id
  try {
    await mobileApi.testNotification(device.id)
    notify.success(`Test notification sent to ${device.device_name}`)
  } catch (e) {
    notify.error('Failed to send test notification')
  } finally {
    isTestingDevice.value = null
  }
}

const deleteDeviceRequest = (device: any) => {
  deviceToDelete.value = device
  showDeviceDeleteConfirm.value = true
}

const confirmDeleteDevice = async () => {
  if (!deviceToDelete.value) return
  try {
    await mobileApi.deleteDevice(deviceToDelete.value.id)
    notify.success('Device permanently removed')
    showDeviceDeleteConfirm.value = false
    fetchData()
  } catch (e) {
    notify.error('Failed to delete device')
  } finally {
    deviceToDelete.value = null
  }
}

const handleBulkDeleteEvents = async () => {
  if (selectedEvents.value.length === 0) return
  isDeletingEvents.value = true
  try {
    await financeApi.bulkDeleteEvents(selectedEvents.value)
    notify.success(`Deleted ${selectedEvents.value.length} events`)
    fetchIngestionEvents(undefined, true)
  } catch (e) {
    notify.error('Failed to delete events')
  } finally {
    isDeletingEvents.value = false
  }
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  notify.success('Device ID copied!')
}

const handleLogoutAll = async () => {
  try {
    await financeApi.logoutAll()
    notify.success('Successfully logged out from all devices')
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  } catch (e) {
    notify.error('Failed to logout from all devices')
  }
}

onMounted(() => {
  fetchIngestionEvents()
  fetchData()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 1. TOOLBAR -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-wf-surface rounded-wf-lg border border-wf-border shadow-2xs">
      <div class="relative flex items-center h-8.5 px-2.5 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle focus-within:border-wf-primary w-full sm:w-72 shrink-0">
        <Search class="w-3.5 h-3.5 text-wf-text-muted mr-2 shrink-0" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search mobile devices..."
          class="w-full bg-transparent text-xs text-wf-text-primary focus:outline-none"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" type="button" class="text-wf-text-muted hover:text-wf-text-primary ml-1">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
        <span class="inline-flex items-center px-2 py-0.5 rounded-wf-pill text-[11px] font-bold bg-wf-primary-light text-wf-primary border border-indigo-200 dark:border-indigo-900/50">
          {{ devices.length }} {{ devices.length === 1 ? 'Device' : 'Devices' }}
        </span>

        <WfButton
          variant="secondary"
          size="sm"
          @click="handleLogoutAll"
          class="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
        >
          <LogOut class="w-3.5 h-3.5 mr-1 text-rose-500" />
          <span>Logout All Devices</span>
        </WfButton>
      </div>
    </div>

    <!-- 2. PENDING APPROVAL SECTION -->
    <div v-if="pendingDevices.length > 0" class="space-y-2.5">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <h3 class="text-xs font-bold text-wf-text-primary">Pending Approval</h3>
        <span class="px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          {{ pendingDevices.length }} New
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <WfCard
          v-for="device in paginatedPendingDevices"
          :key="device.id"
          variant="flat"
          padding="md"
          radius="lg"
          class="border-amber-500/40 bg-amber-500/5 shadow-2xs flex flex-col justify-between"
        >
          <div>
            <!-- Header -->
            <div class="flex items-center gap-2.5 mb-2.5">
              <div class="w-8 h-8 rounded-wf-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Smartphone class="w-4 h-4" />
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="text-xs font-bold text-wf-text-primary truncate" :title="device.device_name">
                  {{ device.device_name }}
                </h4>
                <p class="text-[9px] text-wf-text-muted">Registered {{ formatDate(device.created_at).day }}</p>
              </div>
            </div>

            <!-- Assigned User & Device ID Combined Box -->
            <div class="p-2 bg-wf-surface rounded-wf-md border border-wf-border-subtle text-xs mb-2.5 space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-wf-text-muted text-[9px] font-bold uppercase tracking-wider">Assigned To</span>
                <button
                  type="button"
                  @click="openAssignModal(device)"
                  class="text-wf-primary hover:underline text-[11px] font-bold flex items-center gap-1"
                >
                  <Edit2 class="w-2.5 h-2.5" />
                  <span>{{ getDeviceUser(device.user_id)?.full_name || 'Assign' }}</span>
                </button>
              </div>
              <div class="flex items-center justify-between font-mono text-[10px] text-wf-text-secondary pt-1 border-t border-wf-border-subtle/50">
                <span class="truncate max-w-[180px]">{{ device.device_id }}</span>
                <button
                  type="button"
                  @click="copyToClipboard(device.device_id)"
                  class="p-0.5 text-wf-text-muted hover:text-wf-text-primary"
                  title="Copy Device ID"
                >
                  <Copy class="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 pt-2 border-t border-wf-border-subtle">
            <WfButton
              variant="primary"
              size="sm"
              class="flex-1"
              @click="toggleDeviceApproval(device)"
            >
              <CheckCircle2 class="w-3.5 h-3.5 mr-1" />
              <span>Approve</span>
            </WfButton>
            <WfButton
              variant="secondary"
              size="sm"
              class="flex-1"
              @click="toggleDeviceIgnored(device, true)"
            >
              <span>Ignore</span>
            </WfButton>
          </div>
        </WfCard>
      </div>

      <!-- Pending Pagination Controls -->
      <div
        v-if="pendingDevices.length > pendingPageSize"
        class="flex items-center justify-between text-xs text-wf-text-secondary pt-2 px-1"
      >
        <span>
          Showing {{ (pendingPage - 1) * pendingPageSize + 1 }} - {{ Math.min(pendingPage * pendingPageSize, pendingDevices.length) }} of {{ pendingDevices.length }} devices
        </span>
        <div class="flex items-center gap-2">
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="pendingPage === 1"
            @click="pendingPage--"
          >
            Previous
          </WfButton>
          <span class="font-semibold text-wf-text-primary px-1">
            Page {{ pendingPage }} of {{ totalPendingPages }}
          </span>
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="pendingPage === totalPendingPages"
            @click="pendingPage++"
          >
            Next
          </WfButton>
        </div>
      </div>
    </div>

    <!-- 3. ACTIVE DEVICES SECTION -->
    <div class="space-y-2.5">
      <div class="flex items-center gap-2">
        <h3 class="text-xs font-bold text-wf-text-primary">Active Registered Devices</h3>
        <span class="px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold bg-wf-surface-variant text-wf-text-secondary border border-wf-border-subtle">
          {{ activeDevices.length }}
        </span>
      </div>

      <div v-if="activeDevices.length > 0" class="space-y-2.5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <WfCard
            v-for="device in paginatedActiveDevices"
            :key="device.id"
            variant="flat"
            padding="md"
            radius="lg"
            class="flex flex-col justify-between shadow-2xs hover:border-wf-border transition-all"
            :class="isOnline(device.last_seen_at) ? 'border-t-2 border-t-emerald-500' : ''"
          >
            <div>
              <!-- Header: Icon, Name, Online Status -->
              <div class="flex items-start justify-between gap-2.5 mb-2.5">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    class="w-8 h-8 rounded-wf-md flex items-center justify-center shrink-0 border"
                    :class="isOnline(device.last_seen_at) ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-wf-surface-variant text-wf-text-muted border-wf-border-subtle'"
                  >
                    <Smartphone class="w-4 h-4" />
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-bold text-wf-text-primary truncate" :title="device.device_name">
                      {{ device.device_name }}
                    </h4>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        :class="isOnline(device.last_seen_at) ? 'bg-emerald-500 animate-pulse' : 'bg-wf-text-muted'"
                      />
                      <span class="text-[9px] font-medium text-wf-text-muted">
                        {{ isOnline(device.last_seen_at) ? 'Online' : 'Last seen ' + formatDate(device.last_seen_at).day }}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  @click="openAssignModal(device)"
                  title="Edit Device"
                  class="p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Assigned User & Device ID Combined Box -->
              <div class="p-2 bg-wf-surface-variant/40 rounded-wf-md border border-wf-border-subtle text-xs mb-2.5 space-y-1">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-wf-text-muted font-bold uppercase tracking-wider text-[9px]">Owner</span>
                  <span class="font-semibold text-wf-text-primary text-[11px]">
                    {{ (getDeviceUser(device.user_id)?.full_name || getDeviceUser(device.user_id)?.email || 'Unassigned').split('@')[0] }}
                  </span>
                </div>
                <div class="flex items-center justify-between font-mono text-[10px] text-wf-text-secondary pt-1 border-t border-wf-border-subtle/50">
                  <span class="truncate max-w-[180px]">{{ device.device_id }}</span>
                  <button
                    type="button"
                    @click="copyToClipboard(device.device_id)"
                    class="p-0.5 text-wf-text-muted hover:text-wf-text-primary"
                    title="Copy Device ID"
                  >
                    <Copy class="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1.5 pt-2 border-t border-wf-border-subtle">
              <WfButton
                variant="secondary"
                size="sm"
                class="flex-1"
                @click="toggleDeviceEnabled(device)"
              >
                <component :is="device.is_enabled ? Pause : Play" class="w-3 h-3 mr-1" />
                <span>{{ device.is_enabled ? 'Pause' : 'Resume' }}</span>
              </WfButton>

              <button
                type="button"
                @click="testNotification(device)"
                :disabled="isTestingDevice === device.id"
                class="p-1.5 rounded-wf-xs text-wf-primary bg-wf-primary-light border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                title="Send Test Notification"
              >
                <Bell class="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                @click="deleteDeviceRequest(device)"
                class="p-1.5 rounded-wf-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                title="Delete Device"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </WfCard>
        </div>

        <!-- Active Pagination Controls -->
        <div
          v-if="activeDevices.length > activePageSize"
          class="flex items-center justify-between text-xs text-wf-text-secondary pt-2 px-1"
        >
          <span>
            Showing {{ (activePage - 1) * activePageSize + 1 }} - {{ Math.min(activePage * activePageSize, activeDevices.length) }} of {{ activeDevices.length }} devices
          </span>
          <div class="flex items-center gap-2">
            <WfButton
              variant="secondary"
              size="sm"
              :disabled="activePage === 1"
              @click="activePage--"
            >
              Previous
            </WfButton>
            <span class="font-semibold text-wf-text-primary px-1">
              Page {{ activePage }} of {{ totalActivePages }}
            </span>
            <WfButton
              variant="secondary"
              size="sm"
              :disabled="activePage === totalActivePages"
              @click="activePage++"
            >
              Next
            </WfButton>
          </div>
        </div>
      </div>

      <div v-else class="p-8 text-center bg-wf-surface rounded-wf-lg border border-wf-border shadow-2xs space-y-1.5">
        <Smartphone class="w-8 h-8 text-wf-text-muted opacity-50 mx-auto mb-1.5" />
        <h4 class="text-xs font-bold text-wf-text-primary">No Active Devices Connected</h4>
        <p class="text-[11px] text-wf-text-muted max-w-sm mx-auto">
          Log in from the WealthFam companion app on iOS or Android to automatically link your device.
        </p>
      </div>
    </div>

    <!-- 4. IGNORED DEVICES SECTION -->
    <div v-if="ignoredDevices.length > 0" class="space-y-2.5 pt-3 border-t border-wf-border-subtle">
      <div class="flex items-center gap-2">
        <h3 class="text-xs font-bold text-wf-text-muted uppercase tracking-wider">🚫 Ignored Devices</h3>
        <span class="px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold bg-wf-surface-variant text-wf-text-muted border border-wf-border-subtle">
          {{ ignoredDevices.length }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <WfCard
          v-for="device in paginatedIgnoredDevices"
          :key="device.id"
          variant="flat"
          padding="md"
          radius="lg"
          class="opacity-70 flex flex-col justify-between"
        >
          <div class="flex items-center gap-2.5 mb-2.5">
            <div class="w-7 h-7 rounded-wf-md bg-wf-surface-variant flex items-center justify-center text-wf-text-muted shrink-0">
              <Smartphone class="w-3.5 h-3.5" />
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-xs font-bold text-wf-text-primary truncate">{{ device.device_name }}</h4>
              <p class="text-[9px] font-mono text-wf-text-muted truncate">{{ device.device_id }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2 border-t border-wf-border-subtle">
            <WfButton
              variant="secondary"
              size="sm"
              class="flex-1"
              @click="toggleDeviceIgnored(device, false)"
            >
              Restore
            </WfButton>
            <WfButton
              variant="secondary"
              size="sm"
              class="flex-1 text-rose-500"
              @click="deleteDeviceRequest(device)"
            >
              Delete
            </WfButton>
          </div>
        </WfCard>
      </div>

      <!-- Ignored Pagination Controls -->
      <div
        v-if="ignoredDevices.length > ignoredPageSize"
        class="flex items-center justify-between text-xs text-wf-text-secondary pt-2 px-1"
      >
        <span>
          Showing {{ (ignoredPage - 1) * ignoredPageSize + 1 }} - {{ Math.min(ignoredPage * ignoredPageSize, ignoredDevices.length) }} of {{ ignoredDevices.length }} devices
        </span>
        <div class="flex items-center gap-2">
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="ignoredPage === 1"
            @click="ignoredPage--"
          >
            Previous
          </WfButton>
          <span class="font-semibold text-wf-text-primary px-1">
            Page {{ ignoredPage }} of {{ totalIgnoredPages }}
          </span>
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="ignoredPage === totalIgnoredPages"
            @click="ignoredPage++"
          >
            Next
          </WfButton>
        </div>
      </div>
    </div>

    <!-- 5. INGESTION ACTIVITY LOGS -->
    <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden mt-4">
      <div class="p-3 px-4 border-b border-wf-border-subtle flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-wf-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <ClipboardList class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-wf-text-primary">Recent Ingestion Activity</h3>
            <p class="text-[10px] text-wf-text-muted">SMS & Notification background parse events</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <WfButton
            v-if="selectedEvents.length > 0"
            variant="secondary"
            size="sm"
            :loading="isDeletingEvents"
            class="text-rose-500 hover:bg-rose-500/10 h-7 text-[11px] px-2 py-0"
            @click="handleBulkDeleteEvents"
          >
            <Trash2 class="w-3 h-3 mr-1" />
            <span>Delete ({{ selectedEvents.length }})</span>
          </WfButton>

          <span class="px-2 py-0.5 rounded-wf-xs bg-wf-surface-variant text-[10px] font-mono text-wf-text-secondary border border-wf-border-subtle">
            Total: {{ eventPagination.total }}
          </span>
          <button
            type="button"
            @click="fetchIngestionEvents(undefined, true)"
            title="Refresh Logs"
            class="p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
          >
            <RefreshCw class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/30 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
              <th class="py-2 px-3 w-8">
                <input
                  type="checkbox"
                  :checked="selectedEvents.length === ingestionEvents.length && ingestionEvents.length > 0"
                  @change="toggleSelectAllEvents"
                  class="w-3.5 h-3.5 rounded text-wf-primary focus:ring-wf-primary"
                />
              </th>
              <th class="py-2 px-3">Timestamp</th>
              <th class="py-2 px-3">Event</th>
              <th class="py-2 px-3">Device ID</th>
              <th class="py-2 px-3">Status</th>
              <th class="py-2 px-3">Message</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-wf-border-subtle">
            <tr v-for="event in ingestionEvents" :key="event.id" class="hover:bg-wf-surface-variant/40 transition-colors">
              <td class="py-1.5 px-3">
                <input
                  type="checkbox"
                  :checked="selectedEvents.includes(event.id)"
                  @change="toggleSelectEvent(event.id)"
                  class="w-3.5 h-3.5 rounded text-wf-primary focus:ring-wf-primary"
                />
              </td>
              <td class="py-1.5 px-3 whitespace-nowrap text-wf-text-secondary font-medium text-[11px]">
                {{ formatDate(event.created_at).full }}
              </td>
              <td class="py-1.5 px-3 whitespace-nowrap">
                <span class="px-1.5 py-0.2 rounded-wf-xs bg-wf-surface-variant text-[9px] font-mono font-bold text-wf-text-secondary uppercase">
                  {{ event.event_type.replace('_', ' ') }}
                </span>
              </td>
              <td class="py-1.5 px-3 whitespace-nowrap font-mono text-wf-text-secondary text-[11px]">
                {{ event.device_id }}
              </td>
              <td class="py-1.5 px-3 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold uppercase tracking-wider border"
                  :class="event.status === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : event.status === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'"
                >
                  {{ event.status }}
                </span>
              </td>
              <td class="py-1.5 px-3 text-wf-text-secondary truncate max-w-sm text-[11px]" :title="event.message">
                {{ event.message }}
              </td>
            </tr>
            <tr v-if="ingestionEvents.length === 0">
              <td colspan="6" class="text-center py-8 text-wf-text-muted">No ingestion logs found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Logs Pagination -->
      <div
        v-if="eventPagination.total > eventPagination.limit"
        class="p-3 border-t border-wf-border-subtle flex items-center justify-between text-xs text-wf-text-secondary"
      >
        <span>
          Showing {{ eventPagination.skip + 1 }} - {{ Math.min(eventPagination.skip + eventPagination.limit, eventPagination.total) }} of {{ eventPagination.total }}
        </span>
        <div class="flex items-center gap-2">
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="eventPagination.skip === 0"
            @click="eventPagination.skip -= eventPagination.limit; fetchIngestionEvents()"
          >
            Previous
          </WfButton>
          <WfButton
            variant="secondary"
            size="sm"
            :disabled="eventPagination.skip + eventPagination.limit >= eventPagination.total"
            @click="eventPagination.skip += eventPagination.limit; fetchIngestionEvents()"
          >
            Next
          </WfButton>
        </div>
      </div>
    </WfCard>

    <!-- MODAL 1: ASSIGN DEVICE -->
    <WfModal
      v-model="showDeviceAssignModal"
      title="Configure Mobile Device"
      max-width="md"
    >
      <form @submit.prevent="confirmAssignUser" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-wf-text-secondary mb-1">Display Name</label>
          <input
            v-model="editDeviceName"
            type="text"
            placeholder="e.g. iPhone 15 Pro"
            class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-wf-text-secondary mb-1">Assign to Member</label>
          <select
            v-model="selectedAssignUserId"
            class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary font-medium"
          >
            <option :value="null">👤 Unassigned</option>
            <option v-for="m in familyMembers" :key="m.id" :value="m.id">
              {{ m.avatar || '👤' }} {{ m.full_name || m.email }}
            </option>
          </select>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-wf-border-subtle">
          <WfButton variant="secondary" size="md" type="button" @click="showDeviceAssignModal = false">
            Cancel
          </WfButton>
          <WfButton variant="primary" size="md" type="submit">
            Save Changes
          </WfButton>
        </div>
      </form>
    </WfModal>

    <!-- MODAL 2: DELETE CONFIRM -->
    <WfModal
      v-model="showDeviceDeleteConfirm"
      title="Remove Device"
      max-width="sm"
    >
      <div class="space-y-4">
        <p class="text-xs text-wf-text-secondary">
          Are you sure you want to permanently remove <strong>{{ deviceToDelete?.device_name }}</strong>? This action cannot be undone.
        </p>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-wf-border-subtle">
          <WfButton variant="secondary" size="md" @click="showDeviceDeleteConfirm = false">
            Cancel
          </WfButton>
          <WfButton variant="primary" size="md" class="bg-rose-500 hover:bg-rose-600" @click="confirmDeleteDevice">
            Yes, Remove
          </WfButton>
        </div>
      </div>
    </WfModal>
  </div>
</template>
