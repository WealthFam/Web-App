<script setup lang="ts">
import {
  LayoutDashboard,
  Wallet,
  PieChart,
  Sparkles,
  Coins,
  Settings,
  Bell,
  LogOut,
  Target,
  Layers,
  Landmark,
  Tags,
  Menu,
  Moon,
  Sun,
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  Briefcase,
  CreditCard,
  ArrowLeftRight,
  FileText,
  X,
  Check,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-vue-next'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { useBrandsStore } from '@/stores/brands'
import { useRouter, useRoute } from 'vue-router'
import ToastContainer from '@/components/ToastContainer.vue'
import GlobalSearch from '@/components/common/GlobalSearch.vue'
import { useWebSockets } from '@/composables/useWebSockets'
import { useAttentionStore } from '@/stores/attention'

const { notifications, clearNotifications } = useWebSockets()
const unreadCount = computed(() => notifications.value.length)
const attentionStore = useAttentionStore()
const activeHubTab = ref<'actions' | 'notifications'>('actions')

function toggleUnifiedMenu() {
  if (showNotificationMenu.value) {
    showNotificationMenu.value = false
  } else {
    activeHubTab.value = attentionStore.totalCount > 0 ? 'actions' : 'notifications'
    showNotificationMenu.value = true
    attentionStore.fetchSummary(auth.selectedMemberId || undefined)
  }
}

function navigateToActionItem(item: any) {
  showNotificationMenu.value = false
  router.push({ path: item.route, query: item.query })
}

onMounted(() => {
  attentionStore.fetchSummary(auth.selectedMemberId || undefined)
})

watch(() => auth.selectedMemberId, (newId) => {
  attentionStore.fetchSummary(newId || undefined)
})

// Bell Ring Animation
const isBellRinging = ref(false)
watch(unreadCount, (newVal, oldVal) => {
  if (newVal > oldVal) {
    isBellRinging.value = true
    setTimeout(() => {
      isBellRinging.value = false
    }, 1000)
  }
})

const auth = useAuthStore()
const settingsStore = useSettingsStore()
const router = useRouter()
const route = useRoute()
const isDark = ref(localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark'))

// App metadata
const appVersionDisplay = `v${__APP_VERSION__} (${__APP_BUILD__})`
const appShortVersion = `v${__APP_VERSION__.split('.')[0]}`

// Navigation state - default expanded on large screens, or collapsed
const isSidebarCollapsed = ref(false)
const isMobileDrawerOpen = ref(false)
const showSearch = ref(false)

// Dropdown states
const showMemberMenu = ref(false)
const showNotificationMenu = ref(false)
const openedGroups = ref<Record<string, boolean>>({
  'Banking': true,
  'Planning': true,
  'Wealth': true,
  'System': false,
})

// Current Page Title for breadcrumbs
const currentPageTitle = computed(() => {
  if (route.path === '/') return 'Dashboard'
  const matched = route.matched[0]
  if (matched?.name) {
    return String(matched.name).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  return 'Overview'
})

// Privacy Masking Toggle
function toggleMasking() {
  settingsStore.toggleMasking()
}

// Theme Toggle
function toggleTheme() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.setItem('theme', 'light')
  }
}

// Mobile drawer and modal keyboard dismissal
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isMobileDrawerOpen.value) isMobileDrawerOpen.value = false
    if (showMemberMenu.value) showMemberMenu.value = false
    if (showNotificationMenu.value) showNotificationMenu.value = false
  }
}

watch(isMobileDrawerOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

watch(() => route.path, () => {
  isMobileDrawerOpen.value = false
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if (route.query.search === 'true') showSearch.value = true

  // Fetch brand catalog on app init for dynamic runtime matching
  useBrandsStore().fetchBrands()
  
  // Set initial data-theme
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
  }

  // Auto-expand group if current route matches child
  navSections.value.forEach(section => {
    section.items.forEach(item => {
      if (item.children?.some(c => c.to === route.path)) {
        openedGroups.value[item.title] = true
      }
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

const selectedAvatar = ref(localStorage.getItem('user_avatar') || 'default')
const AVATARS: Record<string, string> = {
  default: '👤',
  male: '👨‍💼',
  female: '👩‍💼',
  kid: '🧒',
}

interface NavItem {
  title: string
  icon: any
  to?: string
  children?: NavItem[]
  adultOnly?: boolean
}

interface NavSection {
  sectionTitle?: string
  items: NavItem[]
}

const navSections = computed<NavSection[]>(() => {
  const rawSections: NavSection[] = [
    {
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, to: '/' },
        { title: 'Transactions', icon: Wallet, to: '/transactions' },
      ]
    },
    {
      sectionTitle: 'FINANCES',
      items: [
        {
          title: 'Banking',
          icon: Landmark,
          children: [
            { title: 'Accounts', icon: Briefcase, to: '/accounts', adultOnly: true },
            { title: 'Credit Cards', icon: CreditCard, to: '/credit-cards', adultOnly: true },
            { title: 'Transfers', icon: ArrowLeftRight, to: '/transfers', adultOnly: true },
            { title: 'Statements', icon: RefreshCw, to: '/statements', adultOnly: true },
          ],
        },
        {
          title: 'Planning',
          icon: PieChart,
          children: [
            { title: 'Insights', icon: Sparkles, to: '/insights' },
            { title: 'Budgets', icon: PieChart, to: '/budgets' },
            { title: 'Categories', icon: Tags, to: '/categories' },
            { title: 'Expense Groups', icon: Layers, to: '/expense-groups' },
          ],
        },
        {
          title: 'Wealth',
          icon: Coins,
          children: [
            { title: 'Mutual Funds', icon: Coins, to: '/mutual-funds' },
            { title: 'Fixed Deposits', icon: Landmark, to: '/fixed-deposits', adultOnly: true },
            { title: 'Provident Funds', icon: ShieldCheck, to: '/provident-funds', adultOnly: true },
            { title: 'Financial Goals', icon: Target, to: '/investment-goals' },
            { title: 'Loans', icon: Landmark, to: '/loans' },
          ],
        },
      ]
    },
    {
      sectionTitle: 'SYSTEM',
      items: [
        {
          title: 'Vault',
          icon: ShieldCheck,
          to: '/vault'
        },
        {
          title: 'Settings',
          icon: Settings,
          to: '/settings'
        }
      ]
    }
  ]

  return rawSections.map(section => ({
    ...section,
    items: section.items
      .map(item => {
        if (item.children) {
          const filtered = item.children.filter(child => {
            if (auth.user?.role === 'CHILD' && child.adultOnly) return false
            return true
          })
          return { ...item, children: filtered }
        }
        return item
      })
      .filter(item => {
        if (item.children) return item.children.length > 0
        if (auth.user?.role === 'CHILD' && item.adultOnly) return false
        return true
      })
  }))
})

function toggleGroup(title: string) {
  if (isSidebarCollapsed.value) {
    isSidebarCollapsed.value = false
  }
  openedGroups.value[title] = !openedGroups.value[title]
}

function isGroupActive(item: NavItem) {
  return item.children?.some(c => c.to === route.path)
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="h-screen w-screen overflow-hidden flex bg-wf-background text-wf-text-primary antialiased">
    <!-- 1. UNIFIED FULL-HEIGHT FIXED SIDEBAR (Desktop) -->
    <aside
      class="hidden lg:flex flex-col h-full bg-wf-surface border-r border-wf-border transition-all duration-200 z-30 select-none shrink-0"
      :class="isSidebarCollapsed ? 'w-[64px]' : 'w-56'"
    >
      <!-- Top Brand Header in Sidebar -->
      <div class="h-13 flex items-center justify-between px-3 border-b border-wf-border shrink-0">
        <router-link to="/" class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-wf-md bg-wf-surface border border-wf-border p-1 flex items-center justify-center shadow-xs shrink-0">
            <img src="/logo.png" alt="WealthFam Logo" class="w-full h-full object-contain" />
          </div>
          <div v-if="!isSidebarCollapsed" class="flex flex-col min-w-0">
            <span class="text-xs font-bold tracking-tight text-wf-text-primary truncate leading-tight">WealthFam</span>
            <span class="text-[9px] font-medium text-wf-text-muted leading-tight">Aether V4</span>
          </div>
        </router-link>

        <button
          type="button"
          class="p-1 rounded-wf-sm text-wf-text-muted hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
          @click="isSidebarCollapsed = !isSidebarCollapsed"
          :title="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-label="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <PanelLeftClose v-if="!isSidebarCollapsed" class="w-3.5 h-3.5" />
          <PanelLeftOpen v-else class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Navigation Links (compact 32px height rows) -->
      <div class="flex-1 py-2 px-1.5 space-y-3 overflow-y-auto overflow-x-hidden">
        <div v-for="(section, sIdx) in navSections" :key="sIdx" class="space-y-0.5">
          <!-- Section Label -->
          <div
            v-if="section.sectionTitle && !isSidebarCollapsed"
            class="px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-wf-text-muted uppercase"
          >
            {{ section.sectionTitle }}
          </div>
          <div v-else-if="section.sectionTitle && isSidebarCollapsed" class="my-1.5 border-t border-wf-divider"></div>

          <!-- Section Items -->
          <template v-for="item in section.items" :key="item.title">
            <!-- Group with Children -->
            <div v-if="item.children" class="space-y-0.5">
              <button
                type="button"
                @click="toggleGroup(item.title)"
                class="w-full flex items-center justify-between px-2 py-1.5 rounded-wf-md text-xs font-medium transition-colors"
                :class="[
                  isGroupActive(item)
                    ? 'text-wf-primary font-semibold bg-indigo-50/80 dark:bg-indigo-950/40'
                    : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant',
                  isSidebarCollapsed ? 'justify-center px-1.5' : ''
                ]"
                :title="isSidebarCollapsed ? item.title : undefined"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <component :is="item.icon" class="w-3.5 h-3.5 shrink-0" />
                  <span v-if="!isSidebarCollapsed" class="truncate text-xs">{{ item.title }}</span>
                </div>
                <ChevronRight
                  v-if="!isSidebarCollapsed"
                  class="w-3 h-3 opacity-40 transition-transform duration-150"
                  :class="openedGroups[item.title] ? 'rotate-90' : ''"
                />
              </button>

              <!-- Children list -->
              <div
                v-if="!isSidebarCollapsed && openedGroups[item.title]"
                class="pl-3 space-y-0.5 pt-0.5"
              >
                <router-link
                  v-for="child in item.children"
                  :key="child.title"
                  :to="child.to!"
                  class="flex items-center gap-2 px-2.5 py-1 rounded-wf-md text-[11px] font-medium transition-colors"
                  :class="route.path === child.to
                    ? 'text-wf-primary font-semibold bg-indigo-50 dark:bg-indigo-950/60 border-l-2 border-wf-primary pl-2'
                    : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'"
                >
                  <component :is="child.icon" class="w-3 h-3 shrink-0 opacity-60" />
                  <span class="truncate">{{ child.title }}</span>
                </router-link>
              </div>
            </div>

            <!-- Single Item -->
            <router-link
              v-else
              :to="item.to!"
              class="flex items-center gap-2 px-2 py-1.5 rounded-wf-md text-xs font-medium transition-colors"
              :class="[
                route.path === item.to
                  ? 'text-wf-primary font-semibold bg-indigo-50 dark:bg-indigo-950/60 border-l-2 border-wf-primary pl-1.5'
                  : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant',
                isSidebarCollapsed ? 'justify-center px-1.5' : ''
              ]"
              :title="isSidebarCollapsed ? item.title : undefined"
            >
              <component :is="item.icon" class="w-3.5 h-3.5 shrink-0" />
              <span v-if="!isSidebarCollapsed" class="truncate">{{ item.title }}</span>
            </router-link>
          </template>
        </div>
      </div>

      <!-- Bottom User Card in Sidebar -->
      <div class="p-2 border-t border-wf-border bg-wf-surface-variant/30 shrink-0">
        <div v-if="!isSidebarCollapsed" class="flex items-center justify-between p-1 rounded-wf-md">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base leading-none shrink-0">{{ AVATARS[selectedAvatar] }}</span>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-semibold text-wf-text-primary truncate">{{ auth.user?.email.split('@')[0] }}</span>
              <span class="text-[9px] text-wf-text-muted truncate uppercase tracking-wider">{{ auth.user?.role || 'Member' }}</span>
            </div>
          </div>
          <button
            type="button"
            @click="logout"
            class="p-1 text-wf-text-muted hover:text-wf-error hover:bg-red-50 dark:hover:bg-red-950/40 rounded-wf-sm transition-colors"
            title="Sign Out"
          >
            <LogOut class="w-3.5 h-3.5" />
          </button>
        </div>
        <div v-else class="text-center py-0.5" :title="`WealthFam ${appVersionDisplay}`">
          <span class="text-[10px] font-mono font-bold text-wf-text-muted">{{ appShortVersion }}</span>
        </div>
      </div>
    </aside>

    <!-- 2. MAIN RIGHT COLUMN (Fixed Topbar + Scrollable Viewport Canvas) -->
    <div class="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
      <!-- TOP FIXED TOOLBAR (h-13 / 52px) -->
      <header class="h-13 shrink-0 bg-wf-surface/90 backdrop-blur-md border-b border-wf-border flex items-center justify-between px-4 sm:px-6 z-20">
        <!-- Left: Mobile Menu Toggle + Breadcrumb / Page Title -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="lg:hidden p-1.5 rounded-wf-md text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
            @click="isMobileDrawerOpen = true"
            aria-label="Open mobile navigation menu"
          >
            <Menu class="w-4.5 h-4.5" />
          </button>

          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-wf-text-muted hidden sm:inline font-medium">Workspace</span>
            <span class="text-wf-text-muted hidden sm:inline opacity-50">/</span>
            <h2 class="font-bold text-wf-text-primary tracking-tight">{{ currentPageTitle }}</h2>
          </div>
        </div>

        <!-- Center: Quick Search Trigger (32px height) -->
        <div class="hidden md:flex items-center max-w-xs lg:max-w-sm w-full mx-4">
          <button
            type="button"
            @click="showSearch = true"
            class="w-full h-8 px-2.5 rounded-wf-md bg-wf-surface-variant/70 hover:bg-wf-surface-variant border border-wf-border text-xs text-wf-text-muted flex items-center justify-between transition-colors"
          >
            <div class="flex items-center gap-2">
              <Search class="w-3.5 h-3.5 text-wf-text-muted" />
              <span class="text-xs">Search everything...</span>
            </div>
            <kbd class="px-1 py-0.5 text-[9px] font-mono font-semibold bg-wf-surface border border-wf-border rounded text-wf-text-secondary">
              ⌘K
            </kbd>
          </button>
        </div>

        <!-- Right: Actions Toolbar (All strictly height 32px, uniform rounded-wf-md) -->
        <div class="flex items-center gap-1.5">
          <!-- Mobile search icon -->
          <button
            type="button"
            class="md:hidden w-8 h-8 rounded-wf-md border border-wf-border flex items-center justify-center text-wf-text-secondary hover:bg-wf-surface-variant"
            @click="showSearch = true"
          >
            <Search class="w-3.5 h-3.5" />
          </button>

          <!-- Date indicator -->
          <div class="hidden xl:flex items-center gap-1.5 h-8 px-2.5 rounded-wf-md bg-wf-surface-variant border border-wf-border text-[11px] font-medium text-wf-text-secondary">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{{ new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) }}</span>
          </div>

          <!-- Household Member Switcher -->
          <div class="relative" v-if="auth.user && auth.user.role !== 'CHILD'">
            <button
              type="button"
              @click="showMemberMenu = !showMemberMenu"
              class="h-8 px-2.5 rounded-wf-md border border-wf-border bg-wf-surface hover:bg-wf-surface-variant text-xs font-semibold text-wf-text-primary flex items-center gap-1.5 transition-colors"
            >
              <Users class="w-3.5 h-3.5 text-wf-primary shrink-0" />
              <span class="max-w-[80px] sm:max-w-[110px] truncate text-xs">{{ auth.selectedMemberName }}</span>
              <ChevronDown class="w-3 h-3 opacity-50" />
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="showMemberMenu"
              class="absolute right-0 mt-1 w-52 bg-wf-surface border border-wf-border rounded-wf-lg shadow-wf-modal py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
              @click="showMemberMenu = false"
            >
              <div class="px-3 py-1 text-[10px] font-bold text-wf-text-muted uppercase tracking-wider">
                Filter Household
              </div>
              <button
                type="button"
                class="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-wf-surface-variant transition-colors"
                :class="auth.selectedMemberId === null ? 'text-wf-primary font-semibold' : 'text-wf-text-primary'"
                @click="auth.selectMember(null)"
              >
                <span>All Members</span>
                <Check v-if="auth.selectedMemberId === null" class="w-3.5 h-3.5 text-wf-primary" />
              </button>

              <div class="my-1 border-t border-wf-divider"></div>

              <button
                v-for="user in auth.familyMembers"
                :key="user.id"
                type="button"
                class="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-wf-surface-variant transition-colors"
                :class="auth.selectedMemberId === user.id ? 'text-wf-primary font-semibold' : 'text-wf-text-primary'"
                @click="auth.selectMember(user.id)"
              >
                <span class="truncate">{{ user.full_name || user.email.split('@')[0] }}</span>
                <Check v-if="auth.selectedMemberId === user.id" class="w-3.5 h-3.5 text-wf-primary" />
              </button>
            </div>
          </div>

          <!-- Privacy Mask Button -->
          <button
            type="button"
            @click="toggleMasking"
            class="w-8 h-8 rounded-wf-md border border-wf-border flex items-center justify-center transition-colors"
            :class="settingsStore.isMasked
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-wf-primary border-indigo-200 dark:border-indigo-900/50'
              : 'text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'"
            :title="settingsStore.isMasked ? 'Privacy Mask: ON (Values Hidden)' : 'Privacy Mask: OFF'"
            :aria-label="settingsStore.isMasked ? 'Privacy Mask: ON (Values Hidden)' : 'Privacy Mask: OFF'"
          >
            <component :is="settingsStore.isMasked ? EyeOff : Eye" class="w-3.5 h-3.5" />
          </button>

          <!-- Theme Toggle Button -->
          <button
            type="button"
            @click="toggleTheme"
            class="w-8 h-8 rounded-wf-md border border-wf-border flex items-center justify-center text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
            title="Toggle Light / Dark Mode"
            aria-label="Toggle Light / Dark Mode"
          >
            <component :is="isDark ? Sun : Moon" class="w-3.5 h-3.5" />
          </button>

          <!-- Unified Action Hub & Notifications -->
          <div class="relative">
            <!-- Consolidated Bell Icon with Attention & Activity Badges -->
            <button
              type="button"
              @click="toggleUnifiedMenu"
              class="h-8 px-2.5 rounded-wf-md border flex items-center justify-center gap-1.5 transition-all text-xs font-semibold cursor-pointer relative"
              :class="[
                showNotificationMenu ? 'bg-wf-surface-variant border-wf-border text-wf-text-primary' : '',
                attentionStore.totalCount > 0
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 shadow-2xs'
                  : unreadCount > 0
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50 text-wf-primary hover:bg-indigo-100/60'
                    : 'border-wf-border text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant'
              ]"
              title="Action Required & Notifications"
              aria-label="Action Required & Notifications"
            >
              <Bell class="w-3.5 h-3.5" :class="{ 'animate-bounce': isBellRinging }" />

              <!-- Pending Actions Badge Count -->
              <span
                v-if="attentionStore.totalCount > 0"
                class="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white leading-none shadow-2xs tabular-nums"
              >
                {{ attentionStore.totalCount }}
              </span>

              <!-- Activity Notification Unread Dot -->
              <span
                v-else-if="unreadCount > 0"
                class="w-2 h-2 rounded-full bg-indigo-500"
              ></span>
            </button>

            <!-- Unified Dropdown Panel -->
            <div
              v-if="showNotificationMenu"
              class="absolute right-0 top-full mt-1.5 w-84 sm:w-96 bg-wf-surface border border-wf-border rounded-wf-lg shadow-wf-modal py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <!-- Two Tabs Header -->
              <div class="px-2 pt-1 pb-1.5 border-b border-wf-divider flex items-center justify-between gap-1">
                <div class="flex items-center gap-1 bg-wf-surface-variant/60 p-0.5 rounded-wf-sm">
                  <button
                    type="button"
                    @click="activeHubTab = 'actions'"
                    class="px-2.5 py-1 rounded-wf-xs text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    :class="activeHubTab === 'actions'
                      ? 'bg-wf-surface text-amber-600 dark:text-amber-400 shadow-2xs'
                      : 'text-wf-text-muted hover:text-wf-text-primary'"
                  >
                    <Zap class="w-3 h-3 text-amber-500" />
                    <span>Action Required</span>
                    <span v-if="attentionStore.totalCount > 0" class="px-1.5 py-0.2 rounded-wf-pill text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {{ attentionStore.totalCount }}
                    </span>
                  </button>
                  <button
                    type="button"
                    @click="activeHubTab = 'notifications'"
                    class="px-2.5 py-1 rounded-wf-xs text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    :class="activeHubTab === 'notifications'
                      ? 'bg-wf-surface text-wf-primary shadow-2xs'
                      : 'text-wf-text-muted hover:text-wf-text-primary'"
                  >
                    <Bell class="w-3 h-3 text-wf-primary" />
                    <span>Activity</span>
                    <span v-if="unreadCount > 0" class="px-1.5 py-0.2 rounded-wf-pill text-[10px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                      {{ unreadCount }}
                    </span>
                  </button>
                </div>

                <button
                  v-if="activeHubTab === 'notifications' && notifications.length > 0"
                  type="button"
                  class="text-[10px] font-semibold text-wf-primary hover:underline px-2"
                  @click="clearNotifications"
                >
                  Clear all
                </button>
                <button
                  v-else-if="activeHubTab === 'actions'"
                  type="button"
                  class="text-[10px] font-semibold text-wf-primary hover:underline px-2"
                  @click="attentionStore.fetchSummary(auth.selectedMemberId || undefined)"
                  title="Refresh Action Summary"
                >
                  <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': attentionStore.loading }" />
                </button>
              </div>

              <!-- Tab 1: Action Required Content -->
              <div v-if="activeHubTab === 'actions'" class="max-h-80 overflow-y-auto">
                <div v-if="attentionStore.loading && !attentionStore.summary" class="py-6 text-center text-wf-text-muted">
                  <RefreshCw class="w-4 h-4 mx-auto mb-1 animate-spin text-amber-500" />
                  <span>Checking pending actions...</span>
                </div>
                <div v-else-if="attentionStore.items.length === 0" class="py-6 text-center text-wf-text-muted">
                  <Check class="w-5 h-5 mx-auto mb-1 text-emerald-500 stroke-[2.5]" />
                  <span class="font-semibold text-wf-text-primary">All caught up!</span>
                  <p class="text-[11px] text-wf-text-muted mt-0.5">No statements, triage, transfers, card bills, or budget alerts need attention.</p>
                </div>
                <div v-else class="divide-y divide-wf-divider/50">
                  <div
                    v-for="item in attentionStore.items"
                    :key="item.id"
                    @click="navigateToActionItem(item)"
                    class="p-2.5 flex items-start gap-2.5 hover:bg-wf-surface-variant transition-colors cursor-pointer group"
                  >
                    <div
                      class="w-6 h-6 rounded-wf-md flex items-center justify-center shrink-0 mt-0.5 border"
                      :class="[
                        item.severity === 'ERROR'
                          ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/60'
                          : item.severity === 'WARNING'
                          ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60'
                          : 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-900/60'
                      ]"
                    >
                      <CreditCard v-if="item.type.startsWith('CREDIT_CARD')" class="w-3 h-3" />
                      <PieChart v-else-if="item.type.startsWith('BUDGET')" class="w-3 h-3" />
                      <FileText v-else-if="item.type.startsWith('STATEMENT')" class="w-3 h-3" />
                      <ArrowLeftRight v-else-if="item.type.startsWith('TRANSFER')" class="w-3 h-3" />
                      <Landmark v-else-if="item.type.startsWith('LOAN')" class="w-3 h-3" />
                      <Wallet v-else-if="item.type.startsWith('ACCOUNT')" class="w-3 h-3" />
                      <Sparkles v-else-if="item.type.startsWith('RECURRING') || item.type.startsWith('CAS')" class="w-3 h-3" />
                      <Zap v-else class="w-3 h-3" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-1">
                        <p class="font-semibold text-wf-text-primary truncate">{{ item.title }}</p>
                        <span class="px-1.5 py-0.5 rounded-wf-xs text-[9px] font-bold bg-wf-surface border border-wf-border text-wf-text-secondary shrink-0">
                          {{ item.count }}
                        </span>
                      </div>
                      <p class="text-[10px] text-wf-text-muted line-clamp-2 mt-0.5">{{ item.description }}</p>
                    </div>
                    <ChevronRight class="w-3.5 h-3.5 text-wf-text-muted opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0" />
                  </div>
                </div>
              </div>

              <!-- Tab 2: Activity Notifications Content -->
              <div v-else class="max-h-80 overflow-y-auto">
                <div v-if="notifications.length > 0" class="divide-y divide-wf-divider/50">
                  <div
                    v-for="note in notifications"
                    :key="note.id"
                    class="p-2.5 flex items-start gap-2 hover:bg-wf-surface-variant transition-colors"
                  >
                    <div class="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-wf-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Zap v-if="note.category === 'MILESTONE'" class="w-3 h-3 text-wf-success" />
                      <Bell v-else class="w-3 h-3" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-wf-text-primary truncate">{{ note.title }}</p>
                      <p class="text-[10px] text-wf-text-muted line-clamp-2 mt-0.5">{{ note.body }}</p>
                    </div>
                  </div>
                </div>
                <div v-else class="py-6 text-center text-wf-text-muted">
                  <Bell class="w-4 h-4 mx-auto mb-1 opacity-40" />
                  <span>No new activity alerts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- 3. SCROLLABLE VIEWPORT CONTENT (Only this scrolls!) -->
      <main class="flex-1 overflow-y-auto min-h-0 bg-wf-background">
        <div class="wf-page-container py-4 sm:py-5">
          <slot />
        </div>
      </main>
    </div>

    <!-- MOBILE DRAWER -->
    <div
      v-if="isMobileDrawerOpen"
      class="fixed inset-0 z-50 lg:hidden flex bg-slate-900/60 backdrop-blur-xs"
      @click.self="isMobileDrawerOpen = false"
    >
      <div class="w-60 max-w-xs bg-wf-surface h-full flex flex-col shadow-wf-modal border-r border-wf-border p-3 animate-in slide-in-from-left duration-200">
        <div class="flex items-center justify-between pb-2 border-b border-wf-border mb-2">
          <div class="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" class="w-5 h-5 object-contain" />
            <span class="text-xs font-bold">WealthFam</span>
          </div>
          <button
            type="button"
            class="p-1 rounded-wf-sm hover:bg-wf-surface-variant"
            @click="isMobileDrawerOpen = false"
            aria-label="Close mobile navigation menu"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <nav class="flex-1 space-y-2 overflow-y-auto">
          <div v-for="(section, sIdx) in navSections" :key="sIdx" class="space-y-0.5">
            <div v-if="section.sectionTitle" class="px-2 text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">
              {{ section.sectionTitle }}
            </div>
            <template v-for="item in section.items" :key="item.title">
              <div v-if="item.children" class="space-y-0.5">
                <button
                  type="button"
                  @click="toggleGroup(item.title)"
                  class="w-full flex items-center justify-between px-2 py-1.5 rounded-wf-md text-xs font-semibold text-wf-text-secondary hover:bg-wf-surface-variant"
                >
                  <div class="flex items-center gap-2">
                    <component :is="item.icon" class="w-3.5 h-3.5" />
                    <span>{{ item.title }}</span>
                  </div>
                  <ChevronRight class="w-3 h-3 opacity-50" :class="openedGroups[item.title] ? 'rotate-90' : ''" />
                </button>
                <div v-if="openedGroups[item.title]" class="pl-4 space-y-0.5">
                  <router-link
                    v-for="child in item.children"
                    :key="child.title"
                    :to="child.to!"
                    @click="isMobileDrawerOpen = false"
                    class="flex items-center gap-2 px-2 py-1 rounded-wf-md text-xs font-medium"
                    :class="route.path === child.to ? 'text-wf-primary font-bold bg-wf-primary-light' : 'text-wf-text-secondary'"
                  >
                    <component :is="child.icon" class="w-3 h-3 opacity-70" />
                    <span>{{ child.title }}</span>
                  </router-link>
                </div>
              </div>
              <router-link
                v-else
                :to="item.to!"
                @click="isMobileDrawerOpen = false"
                class="flex items-center gap-2 px-2 py-1.5 rounded-wf-md text-xs font-semibold"
                :class="route.path === item.to ? 'text-wf-primary font-bold bg-indigo-50 dark:bg-indigo-950/60' : 'text-wf-text-secondary hover:bg-wf-surface-variant'"
              >
                <component :is="item.icon" class="w-3.5 h-3.5" />
                <span>{{ item.title }}</span>
              </router-link>
            </template>
          </div>
        </nav>
      </div>
    </div>

    <!-- Modals -->
    <ToastContainer />
    <GlobalSearch v-model="showSearch" />
  </div>
</template>
