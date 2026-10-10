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
  X,
  Check,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-vue-next'
import { ref, onMounted, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from 'vuetify'
import ToastContainer from '@/components/ToastContainer.vue'
import GlobalSearch from '@/components/common/GlobalSearch.vue'
import { useWebSockets } from '@/composables/useWebSockets'

const { notifications, clearNotifications } = useWebSockets()
const unreadCount = computed(() => notifications.value.length)

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
const theme = useTheme()

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
  const isDark = theme.global.current.value.dark
  theme.global.name.value = isDark ? 'wealthFamTheme' : 'wealthFamDark'
  if (isDark) {
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  }
}

onMounted(() => {
  if (route.query.search === 'true') showSearch.value = true
  
  // Set initial data-theme
  if (theme.global.current.value.dark) {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
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
          <div class="w-7 h-7 rounded-wf-md bg-white border border-wf-border p-1 flex items-center justify-center shadow-xs shrink-0">
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
          >
            <component :is="settingsStore.isMasked ? EyeOff : Eye" class="w-3.5 h-3.5" />
          </button>

          <!-- Theme Toggle Button -->
          <button
            type="button"
            @click="toggleTheme"
            class="w-8 h-8 rounded-wf-md border border-wf-border flex items-center justify-center text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors"
            title="Toggle Light / Dark Mode"
          >
            <component :is="theme.global.current.value.dark ? Sun : Moon" class="w-3.5 h-3.5" />
          </button>

          <!-- Notifications Bell -->
          <div class="relative">
            <button
              type="button"
              @click="showNotificationMenu = !showNotificationMenu"
              class="w-8 h-8 rounded-wf-md border border-wf-border flex items-center justify-center text-wf-text-secondary hover:text-wf-text-primary hover:bg-wf-surface-variant transition-colors relative"
              title="Notifications"
            >
              <Bell class="w-3.5 h-3.5" :class="{ 'animate-bounce': isBellRinging }" />
              <span
                v-if="unreadCount > 0"
                class="absolute top-1 right-1 w-2 h-2 rounded-full bg-wf-error"
              ></span>
            </button>

            <!-- Notifications Popup -->
            <div
              v-if="showNotificationMenu"
              class="absolute right-0 mt-1 w-76 bg-wf-surface border border-wf-border rounded-wf-lg shadow-wf-modal py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <div class="px-3 py-1.5 flex items-center justify-between border-b border-wf-divider">
                <span class="font-bold text-wf-text-primary">Notifications</span>
                <button
                  type="button"
                  class="text-[10px] font-semibold text-wf-primary hover:underline"
                  @click="clearNotifications"
                >
                  Clear all
                </button>
              </div>

              <div v-if="notifications.length > 0" class="max-h-60 overflow-y-auto divide-y divide-wf-divider/50">
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
                <span>No new notifications</span>
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
                    :class="route.path === child.to ? 'text-wf-primary font-bold bg-indigo-50 dark:bg-indigo-950/60' : 'text-wf-text-secondary'"
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
