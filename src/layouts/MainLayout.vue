<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { 
  LayoutDashboard, Wallet, PieChart, Sparkles, Coins, 
  Bell, Target, Layers, Landmark, Tags, 
  Menu, Moon, Sun, Users, ChevronDown, Search, RefreshCw, 
  ShieldCheck, Eye, EyeOff, Briefcase, Settings, LogOut
} from 'lucide-vue-next'
import { useWebSockets } from '@/composables/useWebSockets'

// Shadcn UI components
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()

const { notifications, clearNotifications } = useWebSockets()
const unreadCount = computed(() => notifications.value.length)

// Theme Toggle
const isDark = ref(document.documentElement.classList.contains('dark'))
function toggleTheme() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Navigation structure
interface NavItem {
  title: string
  icon: any
  to?: string
  children?: NavItem[]
  adultOnly?: boolean
}

const navItems = computed(() => {
  const rawItems: NavItem[] = [
    { title: 'Dashboard', icon: LayoutDashboard, to: '/' },
    { title: 'Transactions', icon: Wallet, to: '/transactions' },
    { title: 'Accounts', icon: Briefcase, to: '/accounts', adultOnly: true },
    { title: 'Statements', icon: RefreshCw, to: '/statements', adultOnly: true },
    { title: 'Insights', icon: Sparkles, to: '/insights' },
    { title: 'Budgets', icon: PieChart, to: '/budgets' },
    { title: 'Categories', icon: Tags, to: '/categories' },
    { title: 'Expense Groups', icon: Layers, to: '/expense-groups' },
    { title: 'Mutual Funds', icon: Coins, to: '/mutual-funds' },
    { title: 'Goals', icon: Target, to: '/investment-goals' },
    { title: 'Loans', icon: Landmark, to: '/loans' },
    { title: 'Vault', icon: ShieldCheck, to: '/vault' }
  ]

  return rawItems.filter(item => {
    if (auth.user?.role === 'CHILD' && item.adultOnly) return false
    return true
  })
})

function logout() {
  auth.logout()
  router.push('/login')
}

// Check if a navigation route is currently active (including subpaths)
const isRouteActive = (itemTo: string) => {
  if (!itemTo) return false
  if (itemTo === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(itemTo)
}

// Mobile sidebar state
const mobileMenuOpen = ref(false)

// Hover state for sidebar collapse/expand
const isHovered = ref(false)

// Expose compile-time version and build info to template
const appVersion = __APP_VERSION__
const appBuild = __APP_BUILD__

// Compute the current page title dynamically for the top bar header breadcrumb
const pageTitle = computed(() => {
  const path = route.path
  if (path === '/') return 'Dashboard'
  if (path.startsWith('/transactions')) return 'Transactions'
  if (path.startsWith('/accounts')) return 'Accounts'
  if (path.startsWith('/statements')) return 'Statements'
  if (path.startsWith('/insights')) return 'Insights'
  if (path.startsWith('/budgets')) return 'Budgets'
  if (path.startsWith('/categories')) return 'Categories'
  if (path.startsWith('/expense-groups')) return 'Expense Groups'
  if (path.startsWith('/mutual-funds')) return 'Mutual Funds'
  if (path.startsWith('/investment-goals')) return 'Goals'
  if (path.startsWith('/loans')) return 'Loans'
  if (path.startsWith('/vault')) return 'Vault'
  if (path.startsWith('/settings')) return 'Settings'
  return 'WealthFam'
})

</script>

<template>
  <div class="flex min-h-screen w-full bg-muted/30">
    <!-- Desktop Sidebar -->
    <aside 
      class="fixed inset-y-0 left-0 z-20 hidden flex-col border-r bg-background/85 backdrop-blur-md sm:flex shadow-sm transition-all duration-300 ease-in-out overflow-hidden"
      :class="isHovered ? 'w-64' : 'w-16'"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- Brand Header -->
      <div 
        class="flex h-16 items-center border-b justify-between shrink-0 bg-background/50 transition-all duration-300"
        :class="isHovered ? 'px-6' : 'px-4 justify-center'"
      >
        <router-link to="/" class="flex items-center gap-2.5 font-bold text-foreground hover:opacity-90 transition-opacity min-w-0">
          <img src="/logo.png" class="h-8 w-8 object-contain shrink-0" alt="WealthFam Logo" />
          <div 
            class="flex flex-col transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden"
            :class="isHovered ? 'w-auto opacity-100' : 'w-0 opacity-0'"
          >
            <span class="text-base font-black leading-none tracking-tight">WealthFam</span>
            <span class="text-[9px] font-black uppercase text-primary tracking-widest mt-0.5">Track your finances</span>
          </div>
        </router-link>
      </div>

      <!-- Navigation links -->
      <div class="flex-1 overflow-auto py-4">
        <nav class="grid items-start px-2 text-sm font-semibold gap-1">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to!"
            class="flex items-center rounded-xl transition-all group relative whitespace-nowrap overflow-hidden h-10"
            :class="[
              isRouteActive(item.to!) 
                ? 'bg-primary/10 text-primary font-extrabold shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium',
              isHovered ? 'px-4 gap-3 w-full' : 'px-0 justify-center w-10 mx-auto gap-0'
            ]"
            :title="!isHovered ? item.title : ''"
          >
            <component 
              :is="item.icon" 
              class="h-4.5 w-4.5 transition-transform group-hover:scale-110 duration-200 shrink-0" 
            />
            <span 
              class="transition-all duration-300 ease-in-out"
              :class="isHovered ? 'opacity-100 w-auto ml-1' : 'opacity-0 w-0 overflow-hidden'"
            >
              {{ item.title }}
            </span>
            <span v-if="isRouteActive(item.to!) && isHovered" class="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-in fade-in"></span>
          </router-link>
        </nav>
      </div>

      <!-- Version footer -->
      <div 
        class="mt-auto border-t bg-muted/10 shrink-0 py-3.5 transition-all duration-300 text-center select-none"
        :class="isHovered ? 'px-4' : 'px-1'"
      >
        <div 
          class="text-xs font-bold text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors truncate cursor-default"
          :title="`WealthFam v${appVersion} (Build ${appBuild})`"
        >
          <span v-if="isHovered">v{{ appVersion }} <span class="text-[10px] font-medium opacity-75">({{ appBuild }})</span></span>
          <span v-else class="text-[10px] tracking-wider font-extrabold uppercase">v{{ appVersion.split('.').slice(0, 2).join('.') }}</span>
        </div>
      </div>
    </aside>

    <div 
      class="flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out"
      :class="isHovered ? 'sm:pl-64' : 'sm:pl-16'"
    >
      <!-- Top Header -->
      <header class="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-6 shadow-sm shrink-0">
        <!-- Left Section: Mobile Menu Toggle & Dynamic Breadcrumb -->
        <div class="flex items-center gap-4 flex-1 min-w-[200px]">
          <Sheet v-model:open="mobileMenuOpen">
            <SheetTrigger as-child>
              <Button variant="outline" size="icon" class="sm:hidden h-9 w-9 rounded-xl border-muted-foreground/20">
                <Menu class="h-4 w-4" />
                <span class="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" class="sm:max-w-xs p-0 flex flex-col h-full bg-background border-r">
              <div class="flex h-16 items-center border-b px-6 bg-background/50">
                <router-link to="/" class="flex items-center gap-2.5 font-bold" @click="mobileMenuOpen = false">
                  <img src="/logo.png" class="h-8 w-8 object-contain shrink-0 mr-2" alt="WealthFam Logo" />
                  <span class="text-base font-black">WealthFam</span>
                </router-link>
              </div>
              <div class="flex-1 overflow-auto py-4">
                <nav class="grid items-start px-3 text-sm font-semibold gap-1">
                  <router-link
                    v-for="item in navItems"
                    :key="item.to"
                    :to="item.to!"
                    class="flex items-center gap-3 rounded-xl px-4 h-10 text-muted-foreground hover:text-foreground hover:bg-muted/55 transition-all"
                    :class="{ 'bg-primary text-primary-foreground font-bold shadow-md': isRouteActive(item.to!) }"
                    @click="mobileMenuOpen = false"
                  >
                    <component :is="item.icon" class="h-4.5 w-4.5" />
                    {{ item.title }}
                  </router-link>
                </nav>
              </div>
              <!-- Version footer -->
              <div class="p-4 border-t bg-muted/15 mt-auto text-center select-none">
                <div class="text-xs font-bold text-muted-foreground/50">
                  WealthFam v{{ appVersion }} <span class="text-[10px] font-medium opacity-75">(Build {{ appBuild }})</span>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <!-- Dynamic Page Title (Breadcrumb style) -->
          <h1 class="text-sm font-black tracking-tight text-foreground/80 hidden sm:block">{{ pageTitle }}</h1>
        </div>

        <!-- Center Section: Centered Search with Keyboard Hint -->
        <div class="flex-1 hidden md:flex justify-center max-w-[360px] mx-auto w-full">
          <div class="relative w-full">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search transactions, accounts..."
              class="w-full rounded-xl bg-muted/40 border-none pl-9 pr-10 h-9 text-xs focus-visible:ring-1 focus-visible:ring-primary transition-all"
            />
            <kbd class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[9px] font-medium text-muted-foreground sm:flex">
              ⌘K
            </kbd>
          </div>
        </div>

        <!-- Right Section: Side Actions & Premium User Menu -->
        <div class="flex items-center justify-end gap-2.5 flex-1 min-w-[200px]">
          <!-- Member Selector (if applicable) -->
          <DropdownMenu v-if="auth.familyMembers.length > 0">
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm" class="hidden md:flex gap-2 rounded-full h-8 px-4 font-bold border-muted-foreground/20">
                <Users class="h-3.5 w-3.5 text-primary" />
                <span>{{ auth.selectedMemberName || 'All Members' }}</span>
                <ChevronDown class="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-48 rounded-xl shadow-lg border">
              <DropdownMenuLabel class="text-xs font-bold text-muted-foreground uppercase px-3 py-2">Filter Family</DropdownMenuLabel>
              <DropdownMenuItem @click="auth.selectMember(null)" :class="{ 'bg-primary/5 font-bold text-primary': auth.selectedMemberId === null }" class="rounded-lg mx-1 my-0.5 cursor-pointer">
                All Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                v-for="member in auth.familyMembers" 
                :key="member.id"
                @click="auth.selectMember(member.id)"
                :class="{ 'bg-primary/5 font-bold text-primary': auth.selectedMemberId === member.id }"
                class="rounded-lg mx-1 my-0.5 cursor-pointer"
              >
                {{ member.full_name || member.email.split('@')[0] }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <!-- Privacy Mask Toggle -->
          <Button variant="ghost" size="icon" @click="settingsStore.toggleMasking" class="h-9 w-9 rounded-xl hover:bg-muted" :class="{'text-primary bg-primary/10 hover:bg-primary/15': settingsStore.isMasked}">
            <component :is="settingsStore.isMasked ? EyeOff : Eye" class="h-4.5 w-4.5" />
            <span class="sr-only">Toggle Privacy Mask</span>
          </Button>

          <!-- Theme Toggle -->
          <Button variant="ghost" size="icon" @click="toggleTheme" class="h-9 w-9 rounded-xl hover:bg-muted">
            <component :is="isDark ? Sun : Moon" class="h-4.5 w-4.5" />
            <span class="sr-only">Toggle theme</span>
          </Button>

          <!-- Notifications -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" class="h-9 w-9 rounded-xl hover:bg-muted relative" :class="{'text-primary bg-primary/10': unreadCount > 0}">
                <Bell class="h-4.5 w-4.5" :class="{'animate-bounce': unreadCount > 0}" />
                <span v-if="unreadCount > 0" class="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive animate-pulse"></span>
                <span class="sr-only">Toggle notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-80 rounded-2xl shadow-xl border p-2">
              <DropdownMenuLabel class="flex items-center justify-between px-3 py-2 font-black text-sm text-foreground">
                Alerts
                <Button variant="ghost" size="sm" class="h-auto px-2.5 py-1 text-xs rounded-lg font-bold" @click="clearNotifications">Clear All</Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator class="my-1" />
              <div v-if="notifications.length > 0" class="max-h-[300px] overflow-y-auto space-y-1">
                <DropdownMenuItem v-for="note in notifications" :key="note.id" class="flex flex-col items-start gap-1 p-3 cursor-default rounded-xl hover:bg-muted/40">
                  <div class="font-bold text-xs text-foreground">{{ note.title }}</div>
                  <div class="text-[10px] text-muted-foreground">{{ note.body }}</div>
                </DropdownMenuItem>
              </div>
              <div v-else class="p-8 text-center text-xs text-muted-foreground">
                No new family notifications
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <!-- Premium User Menu -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button class="flex items-center gap-2.5 rounded-xl border border-muted-foreground/15 bg-background/55 hover:bg-muted/40 px-3 py-1.5 h-10 transition-all select-none shadow-sm cursor-pointer hover:shadow-md active:scale-[0.98] outline-none">
                <!-- Avatar circle with gradient -->
                <div class="h-6.5 w-6.5 rounded-lg bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground font-black text-xs flex items-center justify-center shadow-sm">
                  {{ (auth.user?.email || 'A')[0].toUpperCase() }}
                </div>
                <!-- Profile text block -->
                <div class="flex flex-col text-left hidden sm:flex">
                  <span class="text-xs font-bold text-foreground leading-tight truncate max-w-[100px]">
                    {{ auth.user?.full_name || auth.user?.email.split('@')[0] }}
                  </span>
                  <span class="text-[9px] uppercase tracking-wider text-muted-foreground/75 font-semibold leading-none mt-0.5">
                    {{ auth.user?.role || 'User' }}
                  </span>
                </div>
                <ChevronDown class="h-3 w-3 text-muted-foreground/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56 rounded-2xl shadow-xl border p-1.5 mt-2">
              <DropdownMenuLabel class="font-normal px-3 py-2.5 border-b mb-1">
                <div class="flex flex-col space-y-1">
                  <p class="text-xs font-bold text-foreground leading-none">
                    {{ auth.user?.full_name || 'Family Member' }}
                  </p>
                  <p class="text-[10px] leading-none text-muted-foreground truncate">
                    {{ auth.user?.email }}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem @click="router.push('/settings')" class="flex items-center gap-2 rounded-xl cursor-pointer px-3 py-2 text-xs font-semibold hover:bg-muted/60">
                <Settings class="h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator class="my-1" />
              <DropdownMenuItem @click="logout" class="flex items-center gap-2 rounded-xl cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground px-3 py-2 text-xs font-semibold">
                <LogOut class="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 p-4 sm:p-6 sm:px-8">
        <slot></slot>
      </main>
    </div>
  </div>
</template>
