<template>
    <div class="animate-in">
        <!-- Workspace Identity Header -->
        <v-card v-if="tenants.length > 0" rounded="xl" border flat class="premium-glass-card mb-8 overflow-hidden">
            <div class="d-flex align-center pa-6 relative z-10">
                <div class="d-flex mr-6">
                    <div v-for="(m, i) in familyMembers.slice(0, 5)" :key="m.id" 
                        class="nebula-avatar"
                        :style="{ zIndex: 10 - i, transform: `translateX(-${i * 12}px)` }">
                        <span class="text-h6">{{ m.avatar || '👤' }}</span>
                    </div>
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-center mb-1">
                        <h1 class="text-h4 font-weight-black gradient-text">{{ tenants[0].name }}</h1>
                        <v-btn icon density="comfortable" variant="text" color="primary" class="ml-2 hover-scale"
                            @click="openRenameTenantModal(tenants[0])">
                            <Edit2 :size="18" />
                            <v-tooltip activator="parent" location="top">Rename Family Circle</v-tooltip>
                        </v-btn>
                    </div>
                    <div class="d-flex align-center gap-4 text-tiny font-weight-bold text-slate-500 uppercase ls-1">
                        <span class="d-flex align-center"><Users :size="14" class="mr-1 text-primary" /> {{ familyMembers.length }} Members</span>
                        <v-divider vertical class="mx-1" length="12"></v-divider>
                        <span class="d-flex align-center"><Landmark :size="14" class="mr-1 text-primary" /> {{ accounts.length }} Accounts Connected</span>
                    </div>
                </div>
                
                <v-btn color="primary" rounded="pill" elevation="0" height="48" class="px-8 font-weight-black glow-button" @click="openAddMemberModal">
                    <template v-slot:prepend><Plus :size="20" /></template>
                    Add Member
                </v-btn>
            </div>
            <!-- Subtle background mesh -->
            <div class="nebula-bg"></div>
        </v-card>

        <v-row>
            <v-col v-for="member in familyMembers" :key="member.id" cols="12" md="6" lg="4">
                <v-card class="premium-glass-card member-node h-100 pa-6" border flat>
                    <div class="d-flex justify-space-between align-start mb-6">
                        <div class="profile-node-avatar" :class="getRoleColorClass(member.role)">
                            <span class="text-h4">{{ member.avatar || '👤' }}</span>
                            <div v-if="currentUser && currentUser.id === member.id" class="identity-badge" title="You">
                                <span class="text-tiny">YOU</span>
                            </div>
                        </div>
                        <v-btn icon density="comfortable" variant="tonal" color="primary" class="hover-scale"
                            @click="openEditMemberModal(member)">
                            <Edit2 :size="16" />
                            <v-tooltip activator="parent" location="top">Edit Profile</v-tooltip>
                        </v-btn>
                    </div>

                    <div class="mb-4">
                        <h3 class="text-h6 font-weight-black mb-1 text-slate-800">{{ member.full_name || 'Anonymous' }}</h3>
                        <div class="text-caption font-weight-bold text-slate-400 d-flex align-center">
                            <Mail :size="12" class="mr-1 text-primary" /> {{ member.email }}
                        </div>
                    </div>

                    <!-- Identity Metadata Grid -->
                    <div class="metadata-grid mb-6 pa-3 bg-slate-50/50 rounded-lg border border-dashed">
                        <v-row dense>
                            <v-col cols="6" class="d-flex align-center">
                                <Calendar :size="12" class="mr-2 text-slate-400" />
                                <span class="text-tiny font-weight-black text-slate-600">{{ member.dob ? formatDate(member.dob) : 'N/A' }}</span>
                            </v-col>
                            <v-col cols="6" class="d-flex align-center">
                                <Smartphone :size="12" class="mr-2 text-slate-400" />
                                <span class="text-tiny font-weight-black text-slate-600">{{ member.phone_number || 'N/A' }}</span>
                            </v-col>
                            <v-col cols="12" class="d-flex align-center mt-1">
                                <CreditCard :size="12" class="mr-2 text-slate-400" />
                                <span class="text-tiny font-weight-black text-slate-500 uppercase ls-1">PAN:</span>
                                <span class="text-tiny font-weight-black text-slate-700 ml-1 tabular-nums">{{ member.pan_number || 'NOT SET' }}</span>
                            </v-col>
                        </v-row>
                    </div>

                    <div class="d-flex align-center gap-2 mb-6">
                        <v-chip size="small" :color="getRoleChipColor(member.role)" variant="flat"
                            class="font-weight-black text-uppercase ls-1 px-4 role-pill-vibrant">
                            <template v-slot:prepend>
                                <component :is="getRoleIconComponent(member.role)" :size="12" class="mr-2" />
                            </template>
                            {{ member.role }}
                        </v-chip>
                    </div>

                    <v-divider class="mb-4 opacity-10"></v-divider>

                    <div class="d-flex align-center justify-space-between">
                        <div class="d-flex flex-column">
                            <span class="text-caption font-weight-bold text-slate-400 uppercase ls-1">Connected Accounts</span>
                            <span class="text-h5 font-weight-black tabular-nums">{{ getMemberAccountCount(member.id) }}</span>
                        </div>
                        <div class="d-flex gap-1">
                            <div v-for="n in Math.min(getMemberAccountCount(member.id), 4)" :key="n" 
                                class="w-2 h-8 rounded-pill bg-primary opacity-20"></div>
                        </div>
                    </div>
                </v-card>
            </v-col>

            <!-- Add Node Surface -->
            <v-col cols="12" md="6" lg="4">
                <v-card class="add-node-surface h-100 d-flex flex-column align-center justify-center pa-8" border flat
                    @click="openAddMemberModal">
                    <div class="glow-icon-circle mb-4">
                        <Plus :size="32" class="text-primary" />
                    </div>
                    <div class="text-subtitle-1 font-weight-black text-slate-800">New Family Node</div>
                    <div class="text-caption font-weight-bold text-slate-400 uppercase ls-1 mt-1">Scale your circle</div>
                </v-card>
            </v-col>
        </v-row>

        <!-- Add/Edit Family Member Modal -->
        <v-dialog v-model="showMemberModal" max-width="600" persistent>
            <v-card rounded="xl" class="premium-popup overflow-visible">
                <!-- Header with Avatar Preview -->
                <div class="d-flex align-center pa-6 bg-slate-50/50 border-b">
                    <div class="icon-box-huge mr-4 bg-white border">
                        <span class="text-h3">{{ memberForm.avatar }}</span>
                    </div>
                    <div class="flex-grow-1">
                        <h2 class="text-h6 font-weight-black mb-0">{{ isEditingMember ? 'Edit Profile' : 'Add Family Member' }}</h2>
                        <p class="text-tiny text-slate-500 font-weight-bold uppercase letter-spacing-1">Member Configuration</p>
                    </div>
                    <v-btn icon variant="text" size="small" @click="showMemberModal = false">
                        <X :size="20" />
                    </v-btn>
                </div>

                <v-card-text class="pa-6 pt-8">
                    <v-form @submit.prevent="handleMemberSubmit">
                        <!-- Section: Personal Identity -->
                        <div class="d-flex align-center flex-nowrap mb-8">
                            <div class="icon-box-small mr-3 bg-primary-lighten-5 border flex-shrink-0">
                                <User :size="14" class="text-primary" />
                            </div>
                            <span class="text-subtitle-2 font-weight-black text-slate-800 uppercase ls-2 text-no-wrap">Personal Identity</span>
                            <v-divider class="ml-4 flex-grow-1 border-opacity-25" thickness="2" color="primary"></v-divider>
                        </div>

                        <!-- Avatar Picker -->
                        <div class="avatar-picker-grid mb-6">
                            <div v-for="a in ['👨‍💼', '👩‍💼', '👶', '👴', '👵', '👨‍🎓', '👩‍🎓', '🐶']" :key="a"
                                class="avatar-option" :class="{ active: memberForm.avatar === a }"
                                @click="memberForm.avatar = a">
                                {{ a }}
                            </div>
                            <div class="avatar-option p-0 overflow-hidden">
                                <input v-model="memberForm.avatar" class="emoji-input-sm w-full h-full border-0 text-center" maxlength="2" placeholder="🔍" />
                            </div>
                        </div>

                        <v-row>
                            <v-col cols="12" sm="7">
                                <v-text-field 
                                    v-model="memberForm.full_name" 
                                    label="Full Name" 
                                    placeholder="e.g. Sarah Smith"
                                    variant="solo-filled" 
                                    flat 
                                    rounded="lg" 
                                    required
                                    class="premium-input"
                                >
                                    <template v-slot:prepend-inner><User :size="18" class="text-primary" /></template>
                                </v-text-field>
                            </v-col>
                            <v-col cols="12" sm="5">
                                <v-text-field 
                                    v-model="memberForm.dob" 
                                    label="Date of Birth" 
                                    type="date"
                                    variant="solo-filled" 
                                    flat 
                                    rounded="lg"
                                    class="premium-input"
                                >
                                    <template v-slot:prepend-inner><Calendar :size="18" class="text-primary" /></template>
                                </v-text-field>
                            </v-col>
                        </v-row>

                        <v-row class="mt-2">
                            <v-col cols="12" sm="6">
                                <v-text-field 
                                    v-model="memberForm.pan_number" 
                                    label="PAN Number"
                                    :type="showPan ? 'text' : 'password'"
                                    placeholder="ABCDE1234F" 
                                    maxlength="10"
                                    variant="solo-filled" 
                                    flat 
                                    rounded="lg"
                                    class="premium-input"
                                >
                                    <template v-slot:prepend-inner><CreditCard :size="18" class="text-primary" /></template>
                                    <template v-slot:append-inner>
                                        <v-btn icon variant="text" size="small" density="compact" @click="showPan = !showPan">
                                            <component :is="showPan ? EyeOff : Eye" :size="16" class="text-primary" />
                                        </v-btn>
                                    </template>
                                </v-text-field>
                            </v-col>
                            <v-col cols="12" sm="6">
                                <v-text-field 
                                    v-model="memberForm.phone_number" 
                                    label="Phone Number"
                                    placeholder="9876543210" 
                                    maxlength="10"
                                    variant="solo-filled" 
                                    flat 
                                    rounded="lg"
                                    class="premium-input"
                                >
                                    <template v-slot:prepend-inner><Smartphone :size="18" class="text-primary" /></template>
                                </v-text-field>
                            </v-col>
                        </v-row>

                        <!-- Section: Access & Security -->
                        <div class="d-flex align-center flex-nowrap mt-8 mb-8">
                            <div class="icon-box-small mr-3 bg-primary-lighten-5 border flex-shrink-0">
                                <Shield :size="14" class="text-primary" />
                            </div>
                            <span class="text-subtitle-2 font-weight-black text-slate-800 uppercase ls-2 text-no-wrap">Access & Security</span>
                            <v-divider class="ml-4 flex-grow-1 border-opacity-25" thickness="2" color="primary"></v-divider>
                        </div>

                        <v-text-field 
                            v-model="memberForm.email" 
                            label="Email Address" 
                            type="email"
                            :disabled="isEditingMember" 
                            placeholder="sarah@example.com" 
                            variant="solo-filled" 
                            flat 
                            rounded="lg"
                            required
                            class="premium-input"
                        >
                            <template v-slot:prepend-inner><Mail :size="18" class="text-primary" /></template>
                        </v-text-field>

                        <v-text-field 
                            v-model="memberForm.password"
                            :label="`Password ${isEditingMember ? '(Leave empty to keep current)' : ''}`"
                            type="password" 
                            :required="!isEditingMember" 
                            variant="solo-filled" 
                            flat 
                            rounded="lg"
                            class="premium-input"
                        >
                            <template v-slot:prepend-inner><Key :size="18" class="text-primary" /></template>
                        </v-text-field>

                        <v-select 
                            v-model="memberForm.role" 
                            label="Role / Permissions" 
                            :items="[
                                { title: 'Admin (Full access)', value: 'OWNER' },
                                { title: 'Adult (Edit access)', value: 'ADULT' },
                                { title: 'Child (Watch only)', value: 'CHILD' },
                                { title: 'Guest (Limited)', value: 'GUEST' }
                            ]" 
                            variant="solo-filled" 
                            flat 
                            rounded="lg"
                            class="premium-input"
                        >
                            <template v-slot:prepend-inner><ShieldCheck :size="18" class="text-primary" /></template>
                        </v-select>

                        <div class="d-flex justify-end gap-3 mt-8">
                            <v-btn variant="tonal" rounded="pill" height="48" class="px-8 font-weight-black text-uppercase ls-1" @click="showMemberModal = false">
                                <template v-slot:prepend><X :size="18" /></template>
                                Cancel
                            </v-btn>
                            <v-btn type="submit" color="primary" rounded="pill" elevation="0" height="48" class="px-10 font-weight-black text-uppercase ls-1 glow-button">
                                <template v-slot:prepend>
                                    <CheckCircle2 v-if="isEditingMember" :size="20" />
                                    <Plus v-else :size="20" />
                                </template>
                                {{ isEditingMember ? 'Save Profile' : 'Create Member' }}
                            </v-btn>
                        </div>
                    </v-form>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- Tenant Rename Modal -->
        <v-dialog v-model="showTenantModal" max-width="450" persistent>
            <v-card rounded="xl" class="premium-popup">
                <div class="d-flex align-center pa-6 bg-slate-50/50 border-b">
                    <div class="icon-box-large mr-4 bg-white border">
                        <Users :size="20" class="text-primary" />
                    </div>
                    <div class="flex-grow-1">
                        <h2 class="text-h6 font-weight-black mb-0">Rename Family Circle</h2>
                        <p class="text-tiny text-slate-500 font-weight-bold uppercase letter-spacing-1">Workspace Identity</p>
                    </div>
                    <v-btn icon variant="text" size="small" @click="showTenantModal = false">
                        <X :size="20" />
                    </v-btn>
                </div>

                <v-card-text class="pa-6">
                    <v-form @submit.prevent="handleRenameTenant">
                        <v-text-field 
                            v-model="tenantForm.name" 
                            label="New Family Name" 
                            placeholder="e.g. The Smiths"
                            variant="solo-filled" 
                            flat 
                            rounded="lg" 
                            required 
                            autofocus
                        >
                            <template v-slot:prepend-inner><Users :size="18" class="text-slate-400" /></template>
                        </v-text-field>

                        <div class="d-flex justify-end gap-3 mt-8">
                            <v-btn variant="tonal" rounded="pill" height="48" class="px-8 font-weight-black text-uppercase ls-1" @click="showTenantModal = false">
                                <template v-slot:prepend><X :size="18" /></template>
                                Cancel
                            </v-btn>
                            <v-btn type="submit" color="primary" rounded="pill" elevation="0" height="48" class="px-10 font-weight-black text-uppercase ls-1 glow-button">
                                <template v-slot:prepend><CheckCircle2 :size="20" /></template>
                                Update Name
                            </v-btn>
                        </div>
                    </v-form>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { 
    Edit2, 
    Plus, 
    Shield, 
    ShieldCheck, 
    Baby, 
    User, 
    X, 
    Calendar, 
    CreditCard, 
    Smartphone, 
    Mail, 
    Key, 
    Eye, 
    EyeOff,
    CheckCircle2,
    Users,
    Landmark
} from 'lucide-vue-next'

const notify = useNotificationStore()

// --- Internal State ---
const tenants = ref<any[]>([])
const familyMembers = ref<any[]>([])
const accounts = ref<any[]>([])
const currentUser = ref<any>(null)
const loading = ref(false)

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

// --- Computed ---
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

const getRoleChipColor = (role: string) => {
    switch (role) {
        case 'OWNER': return 'deep-orange'
        case 'ADULT': return 'indigo'
        case 'CHILD': return 'emerald'
        default: return 'slate-500'
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

const getRoleColorClass = (role: string) => {
    switch (role) {
        case 'OWNER': return 'ring-gold'
        case 'ADULT': return 'ring-blue'
        case 'CHILD': return 'ring-green'
        default: return 'ring-gray'
    }
}

// --- Fetch Data ---
async function fetchData() {
    loading.value = true
    try {
        const [tenantsRes, usersRes, accountsRes, meRes] = await Promise.all([
            financeApi.getTenants(),
            financeApi.getUsers(),
            financeApi.getAccounts(),
            financeApi.getMe()
        ])
        tenants.value = tenantsRes.data
        familyMembers.value = usersRes.data
        accounts.value = accountsRes.data
        currentUser.value = meRes.data
    } catch (e) {
        console.error("Failed to fetch family settings", e)
        notify.error("Failed to load family settings")
    } finally {
        loading.value = false
    }
}

// Logic
function openRenameTenantModal(tenant: any) {
    tenantForm.value = { id: tenant.id, name: tenant.name }
    showTenantModal.value = true
}

async function handleRenameTenant() {
    if (!tenantForm.value.name) return
    try {
        await financeApi.updateTenant(tenantForm.value.id, { name: tenantForm.value.name })
        notify.success("Family name updated")
        showTenantModal.value = false
        fetchData()
    } catch (err) {
        notify.error("Rename failed")
    }
}

function openAddMemberModal() {
    isEditingMember.value = false
    memberForm.value = {
        id: '',
        email: '',
        full_name: '',
        password: '',
        role: 'ADULT' as any,
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
        role: member.role,
        avatar: member.avatar || '👤',
        dob: member.dob ? member.dob.split('T')[0] : '',
        pan_number: member.pan_number || '',
        phone_number: member.phone_number || ''
    }
    showPan.value = false
    showMemberModal.value = true
}

async function handleMemberSubmit() {
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
            notify.success("Member updated")
        } else {
            await financeApi.createUser(memberForm.value)
            notify.success("Member added successfully")
        }
        showMemberModal.value = false
        fetchData()
    } catch (err: any) {
        notify.error(err.response?.data?.detail || "Action failed")
    }
}

onMounted(() => {
    fetchData()
})
</script>

<style scoped>
.nebula-avatar {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: white;
    border: 2px solid rgba(var(--v-theme-primary), 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nebula-avatar:hover {
    transform: scale(1.2) translateY(-5px) !important;
    z-index: 20 !important;
    border-color: rgb(var(--v-theme-primary));
}

.nebula-bg {
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 80% 20%, rgba(var(--v-theme-primary), 0.05) 0%, transparent 50%);
    pointer-events: none;
}

.member-node {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

.member-node:hover {
    transform: translateY(-6px);
    border-color: rgba(var(--v-theme-primary), 0.3) !important;
    box-shadow: 0 20px 40px -15px rgba(var(--v-theme-primary), 0.15) !important;
}

.profile-node-avatar {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-on-surface), 0.03);
    position: relative;
    border: 1px solid rgba(var(--v-border-color), 0.1);
}

.identity-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: rgb(var(--v-theme-primary));
    color: white;
    padding: 2px 8px;
    border-radius: 20px;
    font-weight: 900;
    border: 2px solid white;
    box-shadow: 0 4px 10px rgba(var(--v-theme-primary), 0.3);
}

.metadata-grid {
    border-color: rgba(var(--v-border-color), 0.1) !important;
}

.role-pill-vibrant {
    color: white !important;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.add-node-surface {
    background: transparent !important;
    border: 2px dashed rgba(var(--v-border-color), 0.2) !important;
    transition: all 0.3s ease;
    cursor: pointer;
}

.add-node-surface:hover {
    background: rgba(var(--v-theme-primary), 0.02) !important;
    border-color: rgb(var(--v-theme-primary)) !important;
    transform: translateY(-4px);
}

.glow-icon-circle {
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(var(--v-border-color), 0.1);
}

.hover-scale {
    transition: all 0.2s ease;
}

.hover-scale:hover {
    transform: scale(1.1);
    color: rgb(var(--v-theme-primary)) !important;
}

/* Role Rings */
.ring-gold { border-left: 4px solid #FFD700; }
.ring-blue { border-left: 4px solid #6366F1; }
.ring-green { border-left: 4px solid #10B981; }
.ring-gray { border-left: 4px solid #94A3B8; }

/* Modal & Form Styles (Restored) */
.premium-popup {
    background: rgba(var(--v-theme-surface), 0.75) !important;
    backdrop-filter: blur(24px) saturate(185%) !important;
    border: 1px solid rgba(var(--v-border-color), 0.12) !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(var(--v-theme-primary), 0.05) !important;
}

.premium-input :deep(.v-field) {
    height: 52px !important;
    border-radius: 12px !important;
}

.glow-button {
    box-shadow: 0 4px 15px rgba(var(--v-theme-primary), 0.3) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.glow-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(var(--v-theme-primary), 0.5) !important;
}

.avatar-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 12px;
    padding: 16px;
    background: rgba(var(--v-theme-on-surface), 0.02);
    border-radius: 16px;
    border: 1px solid rgba(var(--v-border-color), 0.05);
}

.avatar-option {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    cursor: pointer;
    border-radius: 12px;
    border: 2px solid transparent;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    background: white;
}

.avatar-option.active {
    border-color: rgb(var(--v-theme-primary));
    box-shadow: 0 5px 15px rgba(var(--v-theme-primary), 0.2);
    transform: scale(1.1);
}

.avatar-option:hover {
    transform: scale(1.15) translateY(-2px);
    border-color: rgba(var(--v-theme-primary), 0.3);
}

.ls-1 { letter-spacing: 1px !important; }
.ls-2 { letter-spacing: 2px !important; }

.icon-box-small {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
}

.icon-box-huge {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid rgba(var(--v-border-color), 0.1);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
}

.emoji-input-sm {
    text-align: center;
    font-size: 1.25rem;
    width: 100%;
    outline: none;
    background: transparent;
}
</style>
