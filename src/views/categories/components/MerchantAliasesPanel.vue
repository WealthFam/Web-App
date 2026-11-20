<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { financeApi } from '@/api/client'
import { useNotificationStore } from '@/stores/notification'
import WfCard from '@/components/ui/WfCard.vue'
import WfButton from '@/components/ui/WfButton.vue'
import WfModal from '@/components/ui/WfModal.vue'
import WfInput from '@/components/ui/WfInput.vue'
import { Tag, Plus, Edit2, Trash2, Search, RefreshCw, ArrowRight } from 'lucide-vue-next'

function formatDate(dateStr?: string) {
  if (!dateStr) return { date: '—' }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return { date: dateStr }
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
}

const notify = useNotificationStore()

const aliases = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')

// Add / Edit Modal
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const previewCount = ref<number | null>(null)
const form = reactive({
  pattern: '',
  alias: ''
})

const filteredAliases = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return aliases.value
  return aliases.value.filter(
    (a) =>
      (a.pattern || '').toLowerCase().includes(q) ||
      (a.alias || '').toLowerCase().includes(q)
  )
})

async function fetchAliases() {
  loading.value = true
  try {
    const res = await financeApi.getAliases()
    aliases.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch merchant aliases', e)
    notify.error('Could not load merchant aliases')
  } finally {
    loading.value = false
  }
}

let previewTimer: any = null
watch(
  () => form.pattern,
  (val) => {
    if (!showModal.value) return
    if (previewTimer) clearTimeout(previewTimer)
    if (!val.trim()) {
      previewCount.value = null
      return
    }
    previewTimer = setTimeout(async () => {
      try {
        const res = await financeApi.previewAliasImpact(val.trim())
        previewCount.value = res.data.match_count ?? 0
      } catch (e) {
        previewCount.value = null
      }
    }, 350)
  }
)

watch(showModal, (open) => {
  if (!open && previewTimer) {
    clearTimeout(previewTimer)
    previewTimer = null
  }
})

onBeforeUnmount(() => {
  if (previewTimer) {
    clearTimeout(previewTimer)
    previewTimer = null
  }
})

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  form.pattern = ''
  form.alias = ''
  previewCount.value = null
  showModal.value = true
}

function openEditModal(item: any) {
  isEditing.value = true
  editingId.value = item.id
  form.pattern = item.pattern
  form.alias = item.alias
  previewCount.value = null
  showModal.value = true
  financeApi
    .previewAliasImpact(item.pattern)
    .then((res) => (previewCount.value = res.data.match_count ?? 0))
    .catch(() => {})
}

async function saveAlias() {
  const pattern = form.pattern.trim()
  const alias = form.alias.trim()
  if (!pattern || !alias) {
    return notify.error('Please enter both the raw text pattern and a clean merchant name')
  }

  saving.value = true
  try {
    let res: any
    if (isEditing.value && editingId.value) {
      res = await financeApi.updateAlias(editingId.value, {
        pattern,
        alias
      })
    } else {
      res = await financeApi.createAlias({
        pattern,
        alias
      })
    }
    const matched = res.data?.matched_transactions || 0
    notify.success(
      matched > 0
        ? `Merchant alias saved — resolves ${matched} matching transactions`
        : 'Merchant alias saved'
    )
    showModal.value = false
    await fetchAliases()
  } catch (e: any) {
    notify.error(e?.response?.data?.detail || 'Failed to save merchant alias')
  } finally {
    saving.value = false
  }
}

async function deleteAlias(item: any) {
  try {
    await financeApi.deleteAlias(item.id)
    notify.success('Merchant alias removed')
    await fetchAliases()
  } catch (e) {
    notify.error('Could not delete merchant alias')
  }
}

onMounted(fetchAliases)
</script>

<template>
  <div class="space-y-4">
    <WfCard variant="flat" padding="md" radius="lg" class="shadow-2xs">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div class="flex items-start gap-2.5">
          <div class="w-8 h-8 rounded-wf-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
            <Tag class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-wf-text-primary">Merchant Aliases</h3>
            <p class="text-xs text-wf-text-secondary">
              Normalize messy bank descriptions (e.g. <code class="font-mono text-[11px]">AMZN MKTP</code>) into clean merchant names automatically across SMS, Email, Statements, and CSV imports.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <div class="relative flex-1 sm:flex-none min-w-[180px]">
            <Search class="w-3.5 h-3.5 text-wf-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search aliases..."
              class="w-full h-8 pl-8 pr-2.5 rounded-wf-md border border-wf-border bg-wf-surface-variant/40 text-xs text-wf-text-primary placeholder:text-wf-text-muted focus:outline-none focus:ring-1 focus:ring-wf-primary focus:border-wf-primary"
            />
          </div>
          <WfButton variant="ghost" size="sm" @click="fetchAliases" title="Refresh">
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          </WfButton>
          <WfButton size="sm" @click="openCreateModal">
            <Plus class="w-3.5 h-3.5" />
            <span>New Alias</span>
          </WfButton>
        </div>
      </div>
    </WfCard>

    <WfCard variant="flat" padding="none" radius="lg" class="shadow-2xs overflow-hidden">
      <div v-if="loading && aliases.length === 0" class="py-10 text-center text-xs text-wf-text-muted">
        Loading merchant aliases...
      </div>
      <div v-else-if="filteredAliases.length === 0" class="py-10 px-4 text-center space-y-2">
        <Tag class="w-7 h-7 text-wf-text-muted mx-auto opacity-50" />
        <p class="text-sm font-semibold text-wf-text-primary">No merchant aliases configured</p>
        <p class="text-xs text-wf-text-muted">
          Create an alias here or use Map Merchant on any Ledger or Triage transaction to resolve messy bank text dynamically at read time.
        </p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-wf-border-subtle bg-wf-surface-variant/40 text-[10px] font-bold uppercase tracking-wider text-wf-text-muted">
              <th class="py-2.5 px-4">Raw Text Pattern</th>
              <th class="py-2.5 px-2 w-8"></th>
              <th class="py-2.5 px-4">Clean Merchant Name</th>
              <th class="py-2.5 px-4">Created</th>
              <th class="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-wf-border-subtle">
            <tr v-for="item in filteredAliases" :key="item.id" class="hover:bg-wf-surface-variant/30 transition-colors">
              <td class="py-2.5 px-4 font-mono text-xs text-wf-text-primary">{{ item.pattern }}</td>
              <td class="py-2.5 px-2 text-wf-text-muted">
                <ArrowRight class="w-3.5 h-3.5" />
              </td>
              <td class="py-2.5 px-4 font-semibold text-wf-primary">{{ item.alias }}</td>
              <td class="py-2.5 px-4 text-wf-text-muted">
                {{ item.created_at ? formatDate(item.created_at).date : '—' }}
              </td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap space-x-1">
                <button
                  type="button"
                  @click="openEditModal(item)"
                  class="p-1.5 rounded hover:bg-wf-surface-variant text-wf-text-secondary hover:text-wf-primary transition-colors"
                  title="Edit Alias"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  @click="deleteAlias(item)"
                  class="p-1.5 rounded hover:bg-rose-500/10 text-wf-text-secondary hover:text-rose-500 transition-colors"
                  title="Delete Alias"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </WfCard>

    <WfModal v-model="showModal" :title="isEditing ? 'Edit Merchant Alias' : 'New Merchant Alias'">
      <form class="space-y-4" @submit.prevent="saveAlias">
        <WfInput
          v-model="form.pattern"
          label="Raw Text Pattern"
          placeholder="e.g. AMZN MKTP"
          hint="Case-insensitive substring matched against bank description or merchant text"
          required
        />
        <WfInput
          v-model="form.alias"
          label="Clean Merchant Name"
          placeholder="e.g. Amazon"
          required
        />
        <div class="p-3 rounded-wf-md bg-wf-surface-variant/40 border border-wf-border text-xs space-y-1">
          <p class="font-semibold text-wf-text-primary" v-if="previewCount !== null">
            Matches <strong class="font-mono">{{ previewCount }}</strong> existing ledger & triage transactions
          </p>
          <p class="font-semibold text-wf-text-primary" v-else>
            Real-time merchant lookup
          </p>
          <p class="text-wf-text-muted">
            Resolves dynamically at read time across Ledger, Triage, Search, and Analytics without altering raw bank records.
          </p>
        </div>
      </form>
      <template #footer>
        <WfButton variant="ghost" size="sm" @click="showModal = false">Cancel</WfButton>
        <WfButton size="sm" :loading="saving" @click="saveAlias">
          {{ isEditing ? 'Save Changes' : 'Create Alias' }}
        </WfButton>
      </template>
    </WfModal>
  </div>
</template>
