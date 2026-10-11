<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import {
  Edit2,
  Plus,
  Shield,
  ShieldCheck,
  Baby,
  User,
  Calendar,
  CreditCard,
  Smartphone,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  Users,
  Landmark
} from 'lucide-vue-next'
import { format } from 'date-fns'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'

const notify = useNotificationStore()

// State
const tenants = ref<any[]>([])
const familyMembers = ref<any[]>([])
const accounts = ref<any[]>([])
const currentUser = ref<any>(null)
const loading = ref(false)
const submitting = ref(false)

const showMemberModal = ref(false)
const isEditingMember = ref(false)
const memberForm = ref({
  id: '',
  email: '',
  full_name: '',
  password: '',
  role: 'ADULT',
  avatar: '👨‍💼',
  dob: '',
  pan_number: '',
  phone_number: ''
})
const showPan = ref(false)

const showTenantModal = ref(false)
const tenantForm = ref({ id: '', name: '' })

const defaultAvatars = ['👨‍💼', '👩‍💼', '👶', '👴', '👵', '👨‍🎓', '👩‍🎓', '🐶', '🐱', '🚀']

// Pagination
const currentPage = ref(1)
const pageSize = ref(8)
const totalPages = computed(() => Math.ceil(familyMembers.value.length / pageSize.value) || 1)
const paginatedMembers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return familyMembers.value.slice(start, start + pageSize.value)
})

const getMemberAccountCount = (memberId: string) => {
  return accounts.value.filter(a => a.owner_id === memberId).length
}

const getRoleIconComponent = (role: string) => {
  switch (role) {
    case 'OWNER': return ShieldCheck
    case 'ADULT': return Shield
    case 'CHILD': return Baby
    default: return User
  }
}

const getRoleBadgeClasses = (role: string) => {
  switch (role) {
    case 'OWNER':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'ADULT':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    case 'CHILD':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    default:
      return 'bg-wf-surface-variant text-wf-text-secondary border-wf-border-subtle'
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  try {
    return format(new Date(dateStr), 'dd MMM yyyy')
  } catch (e) {
    return dateStr
  }
}

// Fetch Data
async function fetchData() {
  loading.value = true
  try {
    const [tenantsRes, usersRes, accountsRes, meRes] = await Promise.all([
      financeApi.getTenants(),
      financeApi.getUsers(),
      financeApi.getAccounts(),
      financeApi.getMe()
    ])
    tenants.value = tenantsRes.data || []
    familyMembers.value = usersRes.data || []
    accounts.value = accountsRes.data || []
    currentUser.value = meRes.data || null
  } catch (e) {
    console.error('Failed to fetch family settings', e)
    notify.error('Failed to load family settings')
  } finally {
    loading.value = false
  }
}

function openRenameTenantModal(tenant: any) {
  tenantForm.value = { id: tenant.id, name: tenant.name }
  showTenantModal.value = true
}

async function handleRenameTenant() {
  if (!tenantForm.value.name.trim()) return
  submitting.value = true
  try {
    await financeApi.updateTenant(tenantForm.value.id, { name: tenantForm.value.name.trim() })
    notify.success('Family circle name updated')
    showTenantModal.value = false
    fetchData()
  } catch (err) {
    notify.error('Failed to rename family circle')
  } finally {
    submitting.value = false
  }
}

function openAddMemberModal() {
  isEditingMember.value = false
  memberForm.value = {
    id: '',
    email: '',
    full_name: '',
    password: '',
    role: 'ADULT',
    avatar: '👨‍💼',
    dob: '',
    pan_number: '',
    phone_number: ''
  }
  showPan.value = false
  showMemberModal.value = true
}

function openEditMemberModal(member: any) {
  isEditingMember.value = true
  memberForm.value = {
    id: member.id,
    email: member.email,
    full_name: member.full_name || '',
    password: '',
    role: member.role || 'ADULT',
    avatar: member.avatar || '👤',
    dob: member.dob ? member.dob.split('T')[0] : '',
    pan_number: member.pan_number || '',
    phone_number: member.phone_number || ''
  }
  showPan.value = false
  showMemberModal.value = true
}

async function handleMemberSubmit() {
  if (!memberForm.value.full_name.trim()) {
    notify.error('Please enter a full name')
    return
  }
  if (!isEditingMember.value && !memberForm.value.email.trim()) {
    notify.error('Please enter an email address')
    return
  }
  if (!isEditingMember.value && !memberForm.value.password) {
    notify.error('Please provide a temporary password')
    return
  }

  submitting.value = true
  try {
    if (isEditingMember.value) {
      await financeApi.updateUser(memberForm.value.id, {
        full_name: memberForm.value.full_name,
        avatar: memberForm.value.avatar,
        role: memberForm.value.role,
        dob: memberForm.value.dob || undefined,
        pan_number: memberForm.value.pan_number || undefined,
        phone_number: memberForm.value.phone_number || undefined,
        password: memberForm.value.password || undefined
      })
      notify.success('Member profile updated')
    } else {
      await financeApi.createUser(memberForm.value)
      notify.success('Member added successfully')
    }
    showMemberModal.value = false
    fetchData()
  } catch (err: any) {
    notify.error(err.response?.data?.detail || 'Action failed')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 1. WORKSPACE IDENTITY BANNER -->
    <WfCard v-if="tenants.length > 0" variant="flat" padding="md" radius="lg" class="relative overflow-hidden shadow-2xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div class="flex items-center gap-3">
          <!-- Stacked Avatar Preview -->
          <div class="flex -space-x-2.5 overflow-hidden py-0.5">
            <div
              v-for="m in familyMembers.slice(0, 5)"
              :key="m.id"
              class="w-9 h-9 rounded-wf-md bg-wf-surface border-2 border-wf-border shadow-2xs flex items-center justify-center text-base shrink-0"
            >
              <span>{{ m.avatar || '👤' }}</span>
            </div>
          </div>

          <!-- Circle Name & Stats -->
          <div>
            <div class="flex items-center gap-1.5">
              <h2 class="text-base sm:text-lg font-bold tracking-tight text-wf-text-primary leading-tight">
                {{ tenants[0].name }}
              </h2>
              <button
                type="button"
                @click="openRenameTenantModal(tenants[0])"
                title="Rename Circle"
                class="p-1 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors"
              >
                <Edit2 class="w-3.5 h-3.5" />
              </button>
            </div>
            <div class="flex items-center gap-2.5 text-xs font-semibold text-wf-text-muted mt-0.5">
              <span class="inline-flex items-center gap-1">
                <Users class="w-3.5 h-3.5 text-wf-primary" />
                {{ familyMembers.length }} {{ familyMembers.length === 1 ? 'Member' : 'Members' }}
              </span>
              <span class="text-wf-border-subtle">•</span>
              <span class="inline-flex items-center gap-1">
                <Landmark class="w-3.5 h-3.5 text-wf-primary" />
                {{ accounts.length }} Connected {{ accounts.length === 1 ? 'Account' : 'Accounts' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Add Member Action -->
        <WfButton
          variant="primary"
          size="sm"
          @click="openAddMemberModal"
        >
          <Plus class="w-3.5 h-3.5 mr-1" />
          <span>Add Member</span>
        </WfButton>
      </div>
    </WfCard>

    <!-- 2. MEMBER NODES GRID -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      <WfCard
        v-for="member in paginatedMembers"
        :key="member.id"
        variant="flat"
        padding="md"
        radius="lg"
        class="flex flex-col justify-between shadow-2xs hover:border-wf-border transition-all"
      >
        <div>
          <!-- Card Header: Avatar, Name & Role, Edit Button -->
          <div class="flex items-start justify-between gap-2.5 mb-2.5">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="relative shrink-0">
                <div class="w-10 h-10 rounded-wf-md bg-wf-surface-variant border border-wf-border-subtle flex items-center justify-center text-xl shadow-2xs">
                  <span>{{ member.avatar || '👤' }}</span>
                </div>
                <span
                  v-if="currentUser && currentUser.id === member.id"
                  class="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-wf-pill text-[8px] font-black bg-wf-primary text-white shadow-2xs"
                >
                  YOU
                </span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="text-xs font-bold text-wf-text-primary truncate" :title="member.full_name">
                    {{ member.full_name || 'Family Member' }}
                  </h3>
                  <span
                    class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-wf-pill text-[9px] font-bold border tracking-wider uppercase shrink-0"
                    :class="getRoleBadgeClasses(member.role)"
                  >
                    <component :is="getRoleIconComponent(member.role)" class="w-2.5 h-2.5" />
                    <span>{{ member.role }}</span>
                  </span>
                </div>
                <p class="text-[11px] text-wf-text-muted truncate flex items-center gap-1 mt-0.5" :title="member.email">
                  <Mail class="w-2.5 h-2.5 text-wf-primary shrink-0" />
                  <span class="truncate">{{ member.email }}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              @click="openEditMemberModal(member)"
              title="Edit Profile"
              class="p-1.5 rounded-wf-xs text-wf-text-muted hover:text-wf-primary hover:bg-wf-surface-variant transition-colors shrink-0"
            >
              <Edit2 class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Identity Metadata Box -->
          <div class="p-2 bg-wf-surface-variant/40 rounded-wf-md border border-wf-border-subtle text-[11px] space-y-1 mb-2.5">
            <div class="grid grid-cols-2 gap-2">
              <div class="flex items-center gap-1 text-wf-text-secondary truncate">
                <Calendar class="w-3 h-3 text-wf-text-muted shrink-0" />
                <span class="truncate font-medium">{{ member.dob ? formatDate(member.dob) : 'DOB: N/A' }}</span>
              </div>
              <div class="flex items-center gap-1 text-wf-text-secondary truncate">
                <Smartphone class="w-3 h-3 text-wf-text-muted shrink-0" />
                <span class="truncate font-medium">{{ member.phone_number || 'No Phone' }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1 text-wf-text-secondary pt-1 border-t border-wf-border-subtle/50 font-mono text-[10px]">
              <CreditCard class="w-3 h-3 text-wf-text-muted shrink-0" />
              <span class="font-bold text-wf-text-muted uppercase text-[9px]">PAN:</span>
              <span class="font-semibold text-wf-text-primary">{{ member.pan_number ? '•••• •••• ' + member.pan_number.slice(-4) : 'NOT CONFIGURED' }}</span>
            </div>
          </div>
        </div>

        <!-- Card Footer: Connected Accounts -->
        <div class="pt-2 border-t border-wf-border-subtle flex items-center justify-between text-xs">
          <div class="flex items-baseline gap-1.5">
            <span class="text-[9px] font-bold text-wf-text-muted uppercase tracking-wider">Connected Accounts:</span>
            <span class="text-xs font-bold text-wf-text-primary font-mono">{{ getMemberAccountCount(member.id) }}</span>
          </div>
          <div class="flex items-center gap-0.5">
            <div
              v-for="n in Math.min(getMemberAccountCount(member.id), 4)"
              :key="n"
              class="w-1.5 h-4 rounded-wf-pill bg-wf-primary/40"
            />
          </div>
        </div>
      </WfCard>

      <!-- 3. ADD NEW MEMBER CARD SURFACE (only on last page or if under capacity) -->
      <WfCard
        v-if="currentPage === totalPages"
        variant="flat"
        padding="md"
        radius="lg"
        class="border-dashed border-2 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-wf-primary hover:bg-wf-primary-light/20 transition-all group min-h-[140px]"
        @click="openAddMemberModal"
      >
        <div class="w-9 h-9 rounded-full bg-wf-primary-light border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-wf-primary group-hover:scale-110 transition-transform mb-1.5 shadow-2xs">
          <Plus class="w-4 h-4" />
        </div>
        <h4 class="text-xs font-bold text-wf-text-primary">Add Family Member</h4>
        <p class="text-[11px] text-wf-text-muted mt-0.5 max-w-[200px]">
          Create a profile with custom role permissions.
        </p>
      </WfCard>
    </div>

    <!-- Pagination Controls -->
    <div
      v-if="familyMembers.length > pageSize"
      class="flex items-center justify-between text-xs text-wf-text-secondary pt-2 px-1"
    >
      <span>
        Showing {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, familyMembers.length) }} of {{ familyMembers.length }} members
      </span>
      <div class="flex items-center gap-2">
        <WfButton
          variant="secondary"
          size="sm"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          Previous
        </WfButton>
        <span class="font-semibold text-wf-text-primary px-1">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <WfButton
          variant="secondary"
          size="sm"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          Next
        </WfButton>
      </div>
    </div>

    <!-- MODAL 1: ADD / EDIT FAMILY MEMBER -->
    <WfModal
      v-model="showMemberModal"
      :title="isEditingMember ? 'Edit Member Profile' : 'Add Family Member'"
      max-width="lg"
    >
      <form @submit.prevent="handleMemberSubmit" class="space-y-5">
        <!-- Avatar Selector -->
        <div>
          <label class="block text-xs font-bold text-wf-text-secondary uppercase tracking-wider mb-2">Avatar Emoji</label>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="em in defaultAvatars"
              :key="em"
              type="button"
              @click="memberForm.avatar = em"
              class="w-10 h-10 rounded-wf-md flex items-center justify-center text-xl transition-all border"
              :class="memberForm.avatar === em ? 'bg-wf-primary-light border-wf-primary ring-2 ring-wf-primary/20 scale-105' : 'bg-wf-surface-variant border-wf-border-subtle hover:bg-wf-surface'"
            >
              {{ em }}
            </button>
            <input
              v-model="memberForm.avatar"
              type="text"
              maxlength="2"
              placeholder="Custom"
              class="w-16 h-10 px-2 rounded-wf-md bg-wf-surface-variant border border-wf-border-subtle text-center text-lg focus:outline-none focus:border-wf-primary"
            />
          </div>
        </div>

        <!-- Personal Details -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-wf-text-secondary mb-1">Full Name *</label>
            <input
              v-model="memberForm.full_name"
              type="text"
              required
              placeholder="e.g. Sarah Smith"
              class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-wf-text-secondary mb-1">Date of Birth</label>
            <input
              v-model="memberForm.dob"
              type="date"
              class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-wf-text-secondary mb-1">Phone Number</label>
            <input
              v-model="memberForm.phone_number"
              type="tel"
              maxlength="12"
              placeholder="e.g. 9876543210"
              class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-wf-text-secondary mb-1">PAN Number</label>
            <div class="relative flex items-center">
              <input
                v-model="memberForm.pan_number"
                :type="showPan ? 'text' : 'password'"
                maxlength="10"
                placeholder="ABCDE1234F"
                class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary uppercase font-mono focus:outline-none focus:border-wf-primary"
              />
              <button
                type="button"
                @click="showPan = !showPan"
                class="absolute right-2.5 text-wf-text-muted hover:text-wf-text-primary"
              >
                <component :is="showPan ? EyeOff : Eye" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Account Credentials & Role -->
        <div class="space-y-4 pt-2 border-t border-wf-border-subtle">
          <div>
            <label class="block text-xs font-bold text-wf-text-secondary mb-1">Email Address *</label>
            <input
              v-model="memberForm.email"
              type="email"
              :disabled="isEditingMember"
              required
              placeholder="e.g. sarah@example.com"
              class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-wf-text-secondary mb-1">
              {{ isEditingMember ? 'New Password (Leave empty to keep existing)' : 'Password *' }}
            </label>
            <input
              v-model="memberForm.password"
              type="password"
              :required="!isEditingMember"
              placeholder="••••••••••••"
              class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-wf-text-secondary mb-1">Role & Permissions</label>
            <select
              v-model="memberForm.role"
              class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary font-medium"
            >
              <option value="OWNER">Owner (Full Administrator)</option>
              <option value="ADULT">Adult (Edit & View Access)</option>
              <option value="CHILD">Child (View Only)</option>
              <option value="GUEST">Guest (Restricted)</option>
            </select>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-wf-border-subtle">
          <WfButton variant="secondary" size="md" type="button" @click="showMemberModal = false">
            Cancel
          </WfButton>
          <WfButton variant="primary" size="md" type="submit" :loading="submitting">
            <CheckCircle2 class="w-4 h-4 mr-1.5" />
            <span>{{ isEditingMember ? 'Save Changes' : 'Create Member' }}</span>
          </WfButton>
        </div>
      </form>
    </WfModal>

    <!-- MODAL 2: RENAME FAMILY CIRCLE -->
    <WfModal
      v-model="showTenantModal"
      title="Rename Family Circle"
      max-width="md"
    >
      <form @submit.prevent="handleRenameTenant" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-wf-text-secondary mb-1">Circle Name *</label>
          <input
            v-model="tenantForm.name"
            type="text"
            required
            placeholder="e.g. The Smiths"
            class="w-full h-10 px-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border-subtle text-xs text-wf-text-primary focus:outline-none focus:border-wf-primary"
          />
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-wf-border-subtle">
          <WfButton variant="secondary" size="md" type="button" @click="showTenantModal = false">
            Cancel
          </WfButton>
          <WfButton variant="primary" size="md" type="submit" :loading="submitting">
            <span>Save Name</span>
          </WfButton>
        </div>
      </form>
    </WfModal>
  </div>
</template>
