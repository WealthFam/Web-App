<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Users,
  Sparkles
} from 'lucide-vue-next'
import WfButton from '@/components/ui/WfButton.vue'
import WfInput from '@/components/ui/WfInput.vue'
import WfAlert from '@/components/ui/WfAlert.vue'
import WfModal from '@/components/ui/WfModal.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showForgotDialog = ref(false)

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.response?.data?.detail || 'Invalid credentials. Please verify your email and password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row bg-wf-background text-wf-text-primary">
    <!-- LEFT SECTION: Brand Showcase & Value Props (Hidden on mobile/tablet portrait) -->
    <div class="relative hidden lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-12 xl:p-16 bg-slate-950 text-white overflow-hidden">
      <!-- Ambient Glow Behind Elements -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div class="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl"></div>
        <div class="absolute top-1/2 left-1/3 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl"></div>
        <!-- Grid pattern overlay -->
        <div class="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      <!-- Top Header / Logo -->
      <div class="relative z-10 flex items-center gap-3">
        <div class="w-10 h-10 rounded-wf-lg bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center">
          <img src="/logo.png" alt="WealthFam Logo" class="w-full h-full object-contain" />
        </div>
        <div>
          <span class="text-lg font-bold tracking-tight text-white">WealthFam</span>
          <span class="text-xs text-indigo-400 font-mono ml-2 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">Aether V4</span>
        </div>
      </div>

      <!-- Center Hero Visual & Features -->
      <div class="relative z-10 max-w-xl my-auto py-12">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-indigo-200 mb-6">
          <Sparkles class="w-3.5 h-3.5 text-indigo-400" />
          <span>Sovereign Wealth Command Center</span>
        </div>

        <h2 class="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
          Master your family finances with precision & clarity.
        </h2>

        <p class="text-slate-400 text-sm xl:text-base leading-relaxed mb-10">
          Unified multi-generational wealth tracking, intelligent portfolio insights, and automated cashflow categorization — built for privacy and performance.
        </p>

        <!-- Feature Highlights Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="p-4 rounded-wf-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <div class="w-8 h-8 rounded-wf-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-3">
              <TrendingUp class="w-4 h-4 text-indigo-400" />
            </div>
            <h4 class="text-sm font-semibold text-white mb-1">Real-Time Net Worth</h4>
            <p class="text-xs text-slate-400 leading-normal">Live aggregation across bank accounts, mutual funds, loans & assets.</p>
          </div>

          <div class="p-4 rounded-wf-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <div class="w-8 h-8 rounded-wf-md bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-3">
              <PieChart class="w-4 h-4 text-purple-400" />
            </div>
            <h4 class="text-sm font-semibold text-white mb-1">Smart Analytics</h4>
            <p class="text-xs text-slate-400 leading-normal">Granular category breakdown and forecasting without noisy clutter.</p>
          </div>

          <div class="p-4 rounded-wf-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <div class="w-8 h-8 rounded-wf-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3">
              <Users class="w-4 h-4 text-emerald-400" />
            </div>
            <h4 class="text-sm font-semibold text-white mb-1">Family Collaboration</h4>
            <p class="text-xs text-slate-400 leading-normal">Role-based controls for members, trusts, and shared goals.</p>
          </div>

          <div class="p-4 rounded-wf-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <div class="w-8 h-8 rounded-wf-md bg-sky-500/20 border border-sky-500/30 flex items-center justify-center mb-3">
              <ShieldCheck class="w-4 h-4 text-sky-400" />
            </div>
            <h4 class="text-sm font-semibold text-white mb-1">Total Sovereignty</h4>
            <p class="text-xs text-slate-400 leading-normal">Your financial data stays strictly under your control.</p>
          </div>
        </div>
      </div>

      <!-- Bottom Status / Privacy Note -->
      <div class="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-white/10 pt-6">
        <span>© 2026 WealthFam Enterprise</span>
        <div class="flex items-center gap-1.5 text-slate-400">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>End-to-End Encrypted</span>
        </div>
      </div>
    </div>

    <!-- RIGHT SECTION: Login Form -->
    <div class="flex-1 flex flex-col justify-between p-6 sm:p-12 xl:p-16 relative z-10 bg-wf-surface">
      <!-- Mobile Logo Header (Visible on small screens only) -->
      <div class="lg:hidden flex items-center gap-3 mb-8">
        <div class="w-9 h-9 rounded-wf-md bg-white border border-wf-border p-1.5 flex items-center justify-center shadow-sm">
          <img src="/logo.png" alt="WealthFam Logo" class="w-full h-full object-contain" />
        </div>
        <span class="text-base font-bold tracking-tight text-wf-text-primary">WealthFam</span>
      </div>

      <!-- Form Center Container -->
      <div class="w-full max-w-md mx-auto my-auto py-8">
        <div class="mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-wf-text-primary mb-2">
            Welcome back
          </h1>
          <p class="text-sm text-wf-text-secondary">
            Enter your credentials to access your family workspace.
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <WfInput
            v-model="email"
            label="Email Address"
            placeholder="name@family.com"
            type="email"
            required
            autocomplete="email"
          >
            <template #prepend>
              <Mail class="w-4 h-4 text-wf-text-muted" />
            </template>
          </WfInput>

          <WfInput
            v-model="password"
            label="Password"
            placeholder="••••••••"
            type="password"
            required
            autocomplete="current-password"
          >
            <template #labelRight>
              <button
                type="button"
                class="text-xs font-semibold text-wf-primary hover:text-wf-primary-hover transition-colors"
                @click="showForgotDialog = true"
              >
                Forgot password?
              </button>
            </template>
            <template #prepend>
              <Lock class="w-4 h-4 text-wf-text-muted" />
            </template>
          </WfInput>

          <!-- Error Alert -->
          <div v-if="error" class="pt-1">
            <WfAlert variant="error">
              {{ error }}
            </WfAlert>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <WfButton
              type="submit"
              variant="primary"
              size="lg"
              block
              :loading="loading"
              class="h-11 font-semibold shadow-sm"
            >
              <span>Sign In</span>
              <ArrowRight class="w-4 h-4" />
            </WfButton>
          </div>
        </form>

        <!-- Register Link -->
        <div class="mt-8 pt-6 border-t border-wf-border text-center">
          <p class="text-xs sm:text-sm text-wf-text-secondary">
            Don't have a family account?
            <router-link
              to="/register"
              class="font-semibold text-wf-primary hover:text-wf-primary-hover hover:underline ml-1"
            >
              Create Family Account
            </router-link>
          </p>
        </div>
      </div>

      <!-- Trust Notice -->
      <div class="w-full max-w-md mx-auto text-center pt-4">
        <div class="inline-flex items-center gap-1.5 text-xs text-wf-text-muted">
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>Protected by multi-tenant workspace isolation</span>
        </div>
      </div>
    </div>

    <!-- Forgot Password Modal -->
    <WfModal
      v-model="showForgotDialog"
      title="Reset Password"
      max-width="sm"
    >
      <div class="space-y-4 text-sm text-wf-text-secondary">
        <p>
          For security reasons, please contact your <strong class="text-wf-text-primary">Family Administrator</strong> to reset your password.
        </p>
        <p class="text-xs text-wf-text-muted">
          If you are the administrator and lost access, please contact WealthFam support.
        </p>
      </div>

      <template #footer>
        <WfButton variant="primary" size="md" @click="showForgotDialog = false">
          Got it
        </WfButton>
      </template>
    </WfModal>
  </div>
</template>
