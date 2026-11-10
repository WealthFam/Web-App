<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/api/client'
import {
  Mail,
  Lock,
  Building,
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

const router = useRouter()

const familyName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match."
    return
  }

  loading.value = true
  error.value = ''

  try {
    await apiClient.post('/auth/register', {
      tenant: { name: familyName.value },
      user: { email: email.value, password: password.value }
    })
    router.push('/login')
  } catch (e: any) {
    error.value = e.response?.data?.detail || 'Registration failed. Please verify the information.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row bg-wf-background text-wf-text-primary">
    <!-- LEFT SECTION: Brand Showcase & Value Props -->
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
          Start your family's journey to financial sovereignty.
        </h2>

        <p class="text-slate-400 text-sm xl:text-base leading-relaxed mb-10">
          Create an isolated workspace for your household or family office. Connect accounts, track loans, model mutual fund growth, and eliminate spreadsheets.
        </p>

        <!-- Feature Highlights Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="p-4 rounded-wf-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <div class="w-8 h-8 rounded-wf-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-3">
              <TrendingUp class="w-4 h-4 text-indigo-400" />
            </div>
            <h4 class="text-sm font-semibold text-white mb-1">Single Dashboard</h4>
            <p class="text-xs text-slate-400 leading-normal">Everything in one view: bank balances, mutual funds, investments & debt.</p>
          </div>

          <div class="p-4 rounded-wf-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <div class="w-8 h-8 rounded-wf-md bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-3">
              <PieChart class="w-4 h-4 text-purple-400" />
            </div>
            <h4 class="text-sm font-semibold text-white mb-1">Zero Clutter</h4>
            <p class="text-xs text-slate-400 leading-normal">High information density built specifically for financial clarity.</p>
          </div>

          <div class="p-4 rounded-wf-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <div class="w-8 h-8 rounded-wf-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3">
              <Users class="w-4 h-4 text-emerald-400" />
            </div>
            <h4 class="text-sm font-semibold text-white mb-1">Household Members</h4>
            <p class="text-xs text-slate-400 leading-normal">Add family members with fine-grained access and visibility.</p>
          </div>

          <div class="p-4 rounded-wf-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <div class="w-8 h-8 rounded-wf-md bg-sky-500/20 border border-sky-500/30 flex items-center justify-center mb-3">
              <ShieldCheck class="w-4 h-4 text-sky-400" />
            </div>
            <h4 class="text-sm font-semibold text-white mb-1">Private & Encrypted</h4>
            <p class="text-xs text-slate-400 leading-normal">Self-hostable architecture with complete data sovereignty.</p>
          </div>
        </div>
      </div>

      <!-- Bottom Status -->
      <div class="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-white/10 pt-6">
        <span>© 2026 WealthFam Enterprise</span>
        <div class="flex items-center gap-1.5 text-slate-400">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>End-to-End Encrypted</span>
        </div>
      </div>
    </div>

    <!-- RIGHT SECTION: Register Form -->
    <div class="flex-1 flex flex-col justify-between p-6 sm:p-12 xl:p-16 relative z-10 bg-wf-surface">
      <!-- Mobile Logo Header -->
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
            Create family workspace
          </h1>
          <p class="text-sm text-wf-text-secondary">
            Set up your administrative profile to begin.
          </p>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <WfInput
            v-model="familyName"
            label="Family / Household Name"
            placeholder="e.g. The Smiths or Sharma Family"
            required
            autocomplete="organization"
          >
            <template #prepend>
              <Building class="w-4 h-4 text-wf-text-muted" />
            </template>
          </WfInput>

          <WfInput
            v-model="email"
            label="Admin Email Address"
            placeholder="admin@family.com"
            type="email"
            required
            autocomplete="email"
          >
            <template #prepend>
              <Mail class="w-4 h-4 text-wf-text-muted" />
            </template>
          </WfInput>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <WfInput
              v-model="password"
              label="Password"
              placeholder="••••••••"
              type="password"
              required
              autocomplete="new-password"
            >
              <template #prepend>
                <Lock class="w-4 h-4 text-wf-text-muted" />
              </template>
            </WfInput>

            <WfInput
              v-model="confirmPassword"
              label="Confirm Password"
              placeholder="••••••••"
              type="password"
              required
              autocomplete="new-password"
            >
              <template #prepend>
                <Lock class="w-4 h-4 text-wf-text-muted" />
              </template>
            </WfInput>
          </div>

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
              <span>Get Started</span>
              <ArrowRight class="w-4 h-4" />
            </WfButton>
          </div>
        </form>

        <!-- Login Link -->
        <div class="mt-8 pt-6 border-t border-wf-border text-center">
          <p class="text-xs sm:text-sm text-wf-text-secondary">
            Already have an account?
            <router-link
              to="/login"
              class="font-semibold text-wf-primary hover:text-wf-primary-hover hover:underline ml-1"
            >
              Sign In
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
  </div>
</template>
