<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useCurrency } from '@/composables/useCurrency'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import { 
    Scale, Landmark, CreditCard, Plus, Check, X, AlertCircle, 
    Zap, Trash2, AlertTriangle, Search
} from 'lucide-vue-next'
import AccountCard from '@/components/finance/AccountCard.vue'
import AccountEditModal from '@/components/finance/AccountEditModal.vue'

// shadcn-vue components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'

const notify = useNotificationStore()
const router = useRouter()
const { formatAmount } = useCurrency()

// --- State ---
const accounts = ref<any[]>([])
const creditIntelligence = ref<any[]>([])
const auth = useAuthStore()
const loading = ref(false)
const activeTab = ref<'approved' | 'triage'>('approved')
const selectedType = ref('all')
const searchQuery = ref('')

// Modals
const showAccountModal = ref(false)
const editingAccount = ref<any>(null)
const showAccountDeleteConfirm = ref(false)
const accountToDelete = ref<any>(null)
const accountTxCount = ref(0)
const isDeletingAccount = ref(false)

const showPayBillModal = ref(false)
const payBillTarget = ref<any>(null)
const payBillForm = ref({
    source_account_id: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    record_transaction: true
})
const submittingPayBill = ref(false)

// --- Computed ---
const filteredAccounts = computed(() => {
    let list = accounts.value.filter(a => a.is_verified !== false)
    
    // Type filtering
    if (selectedType.value === 'bank') list = list.filter(a => a.type === 'BANK')
    if (selectedType.value === 'credit') list = list.filter(a => a.type === 'CREDIT_CARD')
    if (selectedType.value === 'loan') list = list.filter(a => a.type === 'LOAN')
    if (selectedType.value === 'investment') list = list.filter(a => a.type === 'INVESTMENT')
    if (selectedType.value === 'wallet') list = list.filter(a => a.type === 'WALLET')
    if (selectedType.value === 'other') list = list.filter(a => !['BANK', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'WALLET'].includes(a.type))
    
    // Search filtering
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        list = list.filter(a => 
            a.name.toLowerCase().includes(q) || 
            (a.account_mask && a.account_mask.includes(q)) ||
            (a.institution_name && a.institution_name.toLowerCase().includes(q))
        )
    }

    return list
})

const untrustedAccounts = computed(() => accounts.value.filter(a => a.is_verified === false))

const accountMetrics = computed(() => {
    let total = 0; let bank = 0; let credit = 0
    accounts.value.forEach(a => {
        const bal = Number(a.balance || 0)
        if (a.type === 'CREDIT_CARD' || a.type === 'LOAN') {
            credit += bal
            total -= bal
        } else {
            total += bal
            if (a.type === 'BANK') bank += bal
        }
    })
    return { total, bank, credit }
})

const totalUtilization = computed(() => {
    let totalLimit = 0; let totalUsed = 0
    accounts.value.filter(a => a.type === 'CREDIT_CARD').forEach(a => {
        totalLimit += Number(a.credit_limit || 0)
        totalUsed += Number(a.balance || 0)
    })
    return totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0
})

const bankAccountsItems = computed(() => {
    return accounts.value
        .filter(a => a.type === 'BANK' && a.is_verified)
        .map(a => ({ title: `${a.name} (${formatAmount(a.balance)})`, value: a.id }))
})

const familyMembers = computed(() => auth.familyMembers)

const verifiedAccounts = computed(() => accounts.value.filter(a => a.is_verified !== false))

const accountTypeItems = computed(() => [
    { title: 'All Asset Types', value: 'all' },
    { title: '🏦 Bank Accounts', value: 'bank' },
    { title: '💳 Credit Cards', value: 'credit' },
    { title: '💸 Loans / EMIs', value: 'loan' },
    { title: '📈 Investments', value: 'investment' },
    { title: '👛 Wallets', value: 'wallet' },
    { title: '📁 Other', value: 'other' }
])

// --- Methods ---
async function fetchData() {
    loading.value = true
    try {
        const [accRes, intelRes] = await Promise.all([
            financeApi.getAccounts(auth.selectedMemberId || undefined, true),
            financeApi.getCreditIntelligence(auth.selectedMemberId || undefined)
        ])
        accounts.value = accRes.data
        creditIntelligence.value = intelRes.data
    } catch (err) {
        notify.error("Failed to load accounts")
    } finally {
        loading.value = false
    }
}

function getIntelligenceForAccount(id: string) {
    return creditIntelligence.value.find(i => i.id === id)
}

function getAccountTypeLabel(type: string) {
    const labels: any = { BANK: 'Bank Account', CREDIT_CARD: 'Credit Card', LOAN: 'Loan', WALLET: 'Wallet', INVESTMENT: 'Investment' }
    return labels[type] || type
}

function handleViewAccount(account: any) {
    router.push(`/accounts/${account.id}`)
}

function openCreateAccountModal() {
    editingAccount.value = null
    showAccountModal.value = true
}

function openEditAccountModal(account: any, autoVerify = false) {
    editingAccount.value = { ...account }
    if (autoVerify) editingAccount.value.is_verified = true
    showAccountModal.value = true
}

async function deleteAccountRequest(account: any) {
    accountToDelete.value = account
    try {
        const res = await financeApi.getAccountTransactionCount(account.id)
        accountTxCount.value = res.data.count
    } catch { accountTxCount.value = 0 }
    showAccountDeleteConfirm.value = true
}

async function confirmAccountDelete() {
    if (!accountToDelete.value) return
    isDeletingAccount.value = true
    try {
        await financeApi.deleteAccount(accountToDelete.value.id)
        notify.success("Account deleted")
        showAccountDeleteConfirm.value = false
        fetchData()
    } catch (e: any) {
        notify.error(e.response?.data?.detail || "Delete failed")
    } finally {
        isDeletingAccount.value = false
    }
}

function openPayBillModal(account: any) {
    payBillTarget.value = account
    const intel = getIntelligenceForAccount(account.id)
    payBillForm.value = {
        source_account_id: '',
        amount: intel?.statement_balance || 0,
        date: new Date().toISOString().split('T')[0],
        description: `Bill Payment: ${account.name}`,
        record_transaction: true
    }
    showPayBillModal.value = true
}

async function handlePayBillSubmit() {
    if (!payBillTarget.value || !payBillForm.value.source_account_id) return
    submittingPayBill.value = true
    try {
        await financeApi.payCreditCardBill(payBillTarget.value.id, payBillForm.value)
        notify.success("Payment recorded successfully")
        showPayBillModal.value = false
        fetchData()
    } catch (e: any) {
        notify.error(e.response?.data?.detail || "Payment failed")
    } finally {
        submittingPayBill.value = false
    }
}

function resetFilters() {
    searchQuery.value = ''
    selectedType.value = 'all'
}

watch(() => auth.selectedMemberId, () => {
    fetchData()
})

onMounted(fetchData)
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6 relative overflow-hidden">
      <!-- Animated Mesh Background -->
      <div class="absolute w-[600px] h-[600px] bg-primary/10 rounded-full blur-[80px] -top-[200px] -right-[100px] opacity-15 animate-pulse -z-10 pointer-events-none"></div>
      <div class="absolute w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[80px] -bottom-[100px] -left-[100px] opacity-15 animate-pulse -z-10 pointer-events-none" style="animation-delay: -5s"></div>
      <div class="absolute w-[300px] h-[300px] bg-success/10 rounded-full blur-[80px] top-[40%] left-[30%] opacity-15 animate-pulse -z-10 pointer-events-none" style="animation-delay: -8s"></div>

      <Tabs v-model="activeTab" class="w-full">
        <!-- Header & Tabs -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Financial Sources</h1>
            <p class="text-muted-foreground mt-1">Managing {{ verifiedAccounts.length }} active capital streams</p>
          </div>
          
          <div class="overflow-x-auto pb-2 md:pb-0">
            <TabsList class="h-11">
              <TabsTrigger value="approved" class="flex items-center gap-2 px-4">
                <Landmark class="h-4 w-4" />
                <span>Approved</span>
              </TabsTrigger>
              <TabsTrigger value="triage" class="flex items-center gap-2 px-4">
                <AlertCircle class="h-4 w-4" />
                <span>Triage</span>
                <Badge v-if="untrustedAccounts.length > 0" variant="secondary" class="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                  {{ untrustedAccounts.length }}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <!-- Account Summary Grid -->
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card class="overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
            <CardContent class="p-6 flex flex-col h-full">
              <div class="flex justify-between items-start mb-6">
                <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Scale class="h-6 w-6 text-white" />
                </div>
              </div>
              <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Net Liquid Assets</div>
              <div class="text-2xl font-black text-primary mb-1 truncate">{{ formatAmount(accountMetrics.total) }}</div>
              <div class="mt-auto text-xs font-bold text-muted-foreground">Total available capital</div>
            </CardContent>
          </Card>

          <Card class="overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
            <CardContent class="p-6 flex flex-col h-full">
              <div class="flex justify-between items-start mb-6">
                <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Landmark class="h-6 w-6 text-white" />
                </div>
              </div>
              <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Bank Balances</div>
              <div class="text-2xl font-black text-emerald-500 mb-1 truncate">{{ formatAmount(accountMetrics.bank) }}</div>
              <div class="mt-auto text-xs font-bold text-muted-foreground">Cash in hand</div>
            </CardContent>
          </Card>

          <Card class="overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
            <CardContent class="p-6 flex flex-col h-full">
              <div class="flex justify-between items-start mb-6">
                <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <CreditCard class="h-6 w-6 text-white" />
                </div>
              </div>
              <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Active Credit Debt</div>
              <div class="text-2xl font-black text-rose-500 mb-1 truncate">{{ formatAmount(accountMetrics.credit) }}</div>
              <div class="mt-auto text-xs font-bold text-muted-foreground">Utilized limits</div>
            </CardContent>
          </Card>

          <Card class="overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
            <CardContent class="p-6 flex flex-col h-full">
              <div class="flex justify-between items-start mb-6">
                <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Zap class="h-6 w-6 text-white" />
                </div>
                <div class="text-xl font-black text-amber-500">{{ totalUtilization.toFixed(0) }}%</div>
              </div>
              <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Credit Utilization</div>
              <Progress :model-value="totalUtilization" class="h-1.5 mb-2 bg-amber-500/20 [&>div]:bg-amber-500" />
              <div class="mt-auto text-xs font-bold text-muted-foreground">Weighted average</div>
            </CardContent>
          </Card>
        </div>

        <!-- Premium Toolbar -->
        <Card class="mb-6">
          <CardContent class="p-3 flex flex-col md:flex-row items-center gap-4">
            <div class="w-full md:w-1/4">
              <Select v-model="selectedType">
                <SelectTrigger class="h-9 w-full rounded-full bg-muted/50 border-none">
                  <SelectValue placeholder="All Asset Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in accountTypeItems" :key="opt.value" :value="opt.value">{{ opt.title }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="relative w-full md:w-1/2">
              <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                v-model="searchQuery" 
                placeholder="Search by name, institution or mask..." 
                class="pl-9 h-9 rounded-full bg-muted/50 border-none w-full" 
              />
            </div>

            <div class="w-full md:w-auto flex justify-end flex-1">
              <Button @click="openCreateAccountModal" class="rounded-full gap-2 px-6">
                <Plus class="h-4 w-4" /> Add Source
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- CONTENT AREA -->
        <TabsContent value="approved" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="acc in filteredAccounts" :key="acc.id">
              <AccountCard 
                  :account="acc" 
                  :intelligence="getIntelligenceForAccount(acc.id)" 
                  @view="handleViewAccount"
                  @edit="openEditAccountModal" 
                  @pay-bill="openPayBillModal" 
                  @delete="deleteAccountRequest" 
              />
            </div>
            
            <!-- Empty State -->
            <div v-if="filteredAccounts.length === 0 && !loading" class="col-span-full text-center py-12 animate-in fade-in">
                <div class="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary">
                    <Search class="h-12 w-12 opacity-50" />
                </div>
                <h3 class="text-2xl font-black mb-2">No matching sources</h3>
                <p class="text-muted-foreground mb-8">Try adjusting your filters or search query</p>
                <Button variant="outline" @click="resetFilters" class="rounded-full px-8">
                    Clear all filters
                </Button>
            </div>

            <!-- Add Placeholder Card -->
            <div v-if="!searchQuery && !auth.selectedMemberId && (selectedType === 'all' || selectedType === 'bank')" class="h-full">
                <div @click="openCreateAccountModal" class="h-full min-h-[200px] border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5 p-8 text-center">
                    <div class="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                        <Plus class="h-8 w-8" />
                    </div>
                    <div class="text-lg font-bold">Add Source</div>
                    <div class="text-sm text-muted-foreground mt-1">Link a new bank, card or loan</div>
                </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="triage" class="space-y-6">
          <div class="mb-6">
              <h3 class="text-2xl font-black flex items-center gap-2 mb-1">
                  <AlertCircle class="h-6 w-6 text-amber-500" />
                  Detected Sources
              </h3>
              <p class="text-muted-foreground">Verify accounts detected from your financial messages</p>
          </div>

          <div v-if="untrustedAccounts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card v-for="acc in untrustedAccounts" :key="acc.id" class="border-l-4 border-l-amber-500 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md">
                  <CardContent class="p-5">
                      <div class="flex justify-between items-start mb-4">
                          <div class="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                              <AlertCircle class="h-6 w-6" />
                          </div>
                          <div class="flex gap-2">
                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger as-child>
                                          <Button variant="ghost" size="icon" class="h-8 w-8 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600" @click="openEditAccountModal(acc, true)">
                                              <Check class="h-4 w-4" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Verify Source</p></TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger as-child>
                                          <Button variant="ghost" size="icon" class="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" @click="deleteAccountRequest(acc)">
                                              <X class="h-4 w-4" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Reject & Delete</p></TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          </div>
                      </div>
                      <div class="text-lg font-bold mb-1 truncate" :title="acc.name">{{ acc.name }}</div>
                      <div class="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-4">
                          {{ getAccountTypeLabel(acc.type) }} • {{ acc.account_mask ? `**${acc.account_mask}` : 'New Source' }}
                      </div>
                      <div class="flex justify-between items-end">
                          <div>
                              <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Opening Balance</div>
                              <div class="text-xl font-black">{{ formatAmount(acc.balance) }}</div>
                          </div>
                          <Button variant="link" class="text-primary font-bold px-0 h-auto" @click="openEditAccountModal(acc)">
                              Review Details
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          </div>

          <!-- Empty Triage -->
          <div v-else class="text-center py-16 animate-in fade-in">
              <div class="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 text-emerald-500">
                  <Check class="h-12 w-12" />
              </div>
              <h3 class="text-2xl font-black mb-2">All clear!</h3>
              <p class="text-muted-foreground">No unverified sources require attention</p>
          </div>
        </TabsContent>
      </Tabs>

      <!-- Modals -->
      <AccountEditModal v-model="showAccountModal" :account="editingAccount" :family-members="familyMembers" @saved="fetchData" @delete="deleteAccountRequest" />
      
      <!-- Delete Confirm Dialog -->
      <Dialog :open="showAccountDeleteConfirm" @update:open="val => showAccountDeleteConfirm = val">
        <DialogContent class="sm:max-w-[480px] p-0 overflow-hidden border-red-500">
          <div class="bg-red-50 p-8 text-center border-b border-red-100">
              <div class="h-20 w-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20 text-white">
                  <Trash2 class="h-10 w-10" />
              </div>
              <h3 class="text-2xl font-black text-red-600 mb-1">Delete Account?</h3>
              <div class="text-xs font-bold text-red-500 uppercase tracking-widest">Irreversible Action</div>
          </div>
          
          <div class="p-8">
              <p class="text-sm mb-6 text-center text-muted-foreground">
                  You are about to permanently delete <strong class="text-red-500">{{ accountToDelete?.name }}</strong>.
              </p>
              
              <div class="bg-muted p-4 rounded-xl mb-6 border flex items-center gap-4">
                  <div class="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                      <AlertTriangle class="h-5 w-5" />
                  </div>
                  <div>
                      <div class="text-xl font-black">{{ accountTxCount }}</div>
                      <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Historical Transactions</div>
                  </div>
              </div>

              <div class="bg-red-50 p-4 rounded-lg mb-8 flex gap-3 items-center border border-red-100">
                  <AlertTriangle class="h-5 w-5 text-red-500 shrink-0" />
                  <span class="text-xs text-red-600 font-bold">Warning: This will also remove the account from all family reports and linked budget cycles.</span>
              </div>

              <div class="flex gap-3">
                  <Button variant="outline" class="flex-1 rounded-xl h-11" @click="showAccountDeleteConfirm = false">
                      Keep Account
                  </Button>
                  <Button variant="destructive" class="flex-1 rounded-xl h-11" :disabled="isDeletingAccount" @click="confirmAccountDelete">
                      Confirm Delete
                  </Button>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      <!-- Pay Bill Modal -->
      <Dialog :open="showPayBillModal" @update:open="val => showPayBillModal = val">
        <DialogContent class="sm:max-w-[450px]">
          <DialogHeader class="text-center pt-4">
            <div class="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                <CreditCard class="h-8 w-8" />
            </div>
            <DialogTitle class="text-xl font-black text-center">Pay Credit Bill</DialogTitle>
            <DialogDescription class="text-center">
              {{ payBillTarget?.name }} · Outstanding <strong class="text-red-500">{{ formatAmount(payBillTarget?.balance || 0) }}</strong>
            </DialogDescription>
          </DialogHeader>

          <form @submit.prevent="handlePayBillSubmit" class="space-y-4 py-4">
            <div class="space-y-2">
                <label class="text-sm font-bold">Pay From</label>
                <Select v-model="payBillForm.source_account_id">
                    <SelectTrigger class="w-full rounded-xl">
                        <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="opt in bankAccountsItems" :key="opt.value" :value="opt.value">{{ opt.title }}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <label class="text-sm font-bold">Amount (₹)</label>
                    <Input type="number" v-model="payBillForm.amount" class="rounded-xl" />
                </div>
                <div class="space-y-2">
                    <label class="text-sm font-bold">Date</label>
                    <Input type="date" v-model="payBillForm.date" class="rounded-xl" />
                </div>
            </div>

            <div class="flex items-center justify-between p-4 rounded-xl bg-muted/50 border mb-6 mt-4">
                <div>
                    <div class="text-sm font-bold">Record Transaction</div>
                    <div class="text-xs text-muted-foreground">Debit from source account</div>
                </div>
                <Switch :checked="payBillForm.record_transaction" @update:checked="(val: boolean) => payBillForm.record_transaction = val" />
            </div>

            <div class="flex gap-3 justify-center pt-2">
                <Button type="button" variant="ghost" class="rounded-full px-6 h-11" @click="showPayBillModal = false">
                    Cancel
                </Button>
                <Button type="submit" class="rounded-full px-8 h-11 shadow-md shadow-primary/20" :disabled="submittingPayBill">
                    Confirm Payment
                </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  </MainLayout>
</template>
