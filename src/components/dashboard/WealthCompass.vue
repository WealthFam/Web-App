<template>
  <v-card class="m3-card wealth-compass pa-6 overflow-hidden h-100 d-flex flex-column" rounded="xl" elevation="1">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="d-flex align-center">
        <h2 class="text-h6 font-weight-black d-flex align-center mr-2">
          <Compass :size="20" class="text-primary mr-2" />
          Wealth Compass
        </h2>
        <v-btn icon variant="text" size="x-small" color="primary" @click="showInfo = true">
          <Info :size="16" />
        </v-btn>
      </div>
      <v-chip size="x-small" color="primary" variant="flat" class="font-weight-black">
        Live Outlook
      </v-chip>
    </div>

    <!-- Info Modal -->
    <v-dialog v-model="showInfo" max-width="500" transition="dialog-bottom-transition">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="d-flex align-center font-weight-black">
          <Sparkles :size="24" class="text-primary mr-3" />
          Understanding Wealth Compass
        </v-card-title>
        <v-card-text class="py-4">
          <p class="text-body-1 mb-6 opacity-80">
            Your Wealth Compass is a multi-dimensional guidance system that correlates your financial habits into four actionable vectors:
          </p>
          
          <div class="d-flex flex-column gap-4">
            <div class="d-flex align-start ga-3">
              <v-avatar color="success" variant="tonal" size="32" class="mt-1">
                <TrendingUp :size="16" />
              </v-avatar>
              <div>
                <div class="font-weight-black text-subtitle-2">Savings Rate</div>
                <div class="text-caption opacity-70">Percentage of net income retained after consumption. Higher is better for long-term freedom.</div>
              </div>
            </div>

            <div class="d-flex align-start ga-3">
              <v-avatar color="primary" variant="tonal" size="32" class="mt-1">
                <BarChart3 :size="16" />
              </v-avatar>
              <div>
                <div class="font-weight-black text-subtitle-2">Portfolio Performance</div>
                <div class="text-caption opacity-70">The XIRR (Internal Rate of Return) of your tracked investments. Represents your capital's efficiency.</div>
              </div>
            </div>

            <div class="d-flex align-start ga-3">
              <v-avatar color="warning" variant="tonal" size="32" class="mt-1">
                <ShieldCheck :size="16" />
              </v-avatar>
              <div>
                <div class="font-weight-black text-subtitle-2">Credit Health</div>
                <div class="text-caption opacity-70">The inverse of your credit utilization. Higher percentage indicates better debt management and lower risk.</div>
              </div>
            </div>

            <div class="d-flex align-start ga-3">
              <v-avatar color="info" variant="tonal" size="32" class="mt-1">
                <Target :size="16" />
              </v-avatar>
              <div>
                <div class="font-weight-black text-subtitle-2">Budgeting Discipline</div>
                <div class="text-caption opacity-70">Your adherence to spending limits. Calculated as the inverse of your total budget overruns.</div>
              </div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pt-4">
          <v-spacer />
          <v-btn color="primary" variant="flat" rounded="xl" @click="showInfo = false" class="px-6 font-weight-bold">
            Understood
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-row class="flex-grow-1 align-center">
      <!-- Savings Rate -->
      <v-col cols="6" sm="3">
        <div class="compass-stat-item text-center d-flex flex-column align-center ga-1">
          <v-progress-circular :model-value="savingsRate" :size="70" :width="8" color="success"
            class="mb-1 compass-progress">
            <span class="text-caption font-weight-black">{{ savingsRate }}%</span>
          </v-progress-circular>
          <div class="text-overline font-weight-black opacity-60">Savings Rate</div>
          <div class="text-caption font-weight-black text-success mt-n1">
            {{ formatAmount(totalSavings) }}
          </div>
        </div>
      </v-col>

      <!-- Investment Growth -->
      <v-col cols="6" sm="3">
        <div class="compass-stat-item text-center d-flex flex-column align-center ga-1">
          <v-progress-circular :model-value="minMax(investmentGrowth, 0, 100)" :size="70" :width="8" color="primary"
            class="mb-1 compass-progress">
            <span class="text-caption font-weight-black">{{ investmentGrowth }}%</span>
          </v-progress-circular>
          <div class="text-overline font-weight-black opacity-60">Portfolio</div>
          <div class="text-caption font-weight-black text-primary mt-n1">
            {{ formatAmount(portfolioValue) }}
          </div>
        </div>
      </v-col>

      <!-- Debt Utility -->
      <v-col cols="6" sm="3">
        <div class="compass-stat-item text-center d-flex flex-column align-center ga-1">
          <v-progress-circular :model-value="100 - creditUtilization" :size="70" :width="8" color="warning"
            class="mb-1 compass-progress">
            <span class="text-caption font-weight-black">{{ (100 - creditUtilization).toFixed(0) }}%</span>
          </v-progress-circular>
          <div class="text-overline font-weight-black opacity-60">Credit Health</div>
          <div class="text-caption font-weight-black text-warning mt-n1">
            Debt: {{ formatAmount(creditDebt) }}
          </div>
        </div>
      </v-col>

      <!-- Budget Discipline -->
      <v-col cols="6" sm="3">
        <div class="compass-stat-item text-center d-flex flex-column align-center ga-1">
          <v-progress-circular :model-value="budgetEfficiency" :size="70" :width="8" color="info"
            class="mb-1 compass-progress">
            <span class="text-caption font-weight-black">{{ budgetEfficiency }}%</span>
          </v-progress-circular>
          <div class="text-overline font-weight-black opacity-60">Budgeting</div>
          <div class="text-caption font-weight-black text-info mt-n1">
            Spent: {{ formatAmount(totalSpent) }}
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Subtle Background Elements -->
    <div class="compass-bg-icon">
      <Compass :size="180" />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Compass, Info, Sparkles, TrendingUp, BarChart3, ShieldCheck, Target } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps<{
  metrics: any
  portfolio: any
}>()

const { formatAmount } = useCurrency()
const showInfo = ref(false)


const totalSavings = computed(() => {
  const spending = props.metrics?.monthly_spending || 0
  const income = props.metrics?.total_income || 0
  return Math.max(0, income - spending)
})

const savingsRate = computed(() => {
  return Math.max(0, Math.round(props.metrics?.savings_rate || 0))
})

const investmentGrowth = computed(() => {
  return Math.round(props.portfolio?.xirr || 0)
})

const portfolioValue = computed(() => {
  return props.portfolio?.current || 0
})

const creditUtilization = computed(() => {
  const limit = props.metrics?.breakdown?.total_credit_limit || 0
  const debt = props.metrics?.breakdown?.credit_debt || 0
  if (limit <= 0) return 0
  return (debt / limit) * 100
})

const creditDebt = computed(() => {
  return props.metrics?.breakdown?.credit_debt || 0
})

const budgetEfficiency = computed(() => {
  const percentage = props.metrics?.budget_health?.percentage || 0
  if (percentage === 0) return 100
  return Math.max(0, 100 - Math.round(percentage))
})

const totalSpent = computed(() => {
  return props.metrics?.monthly_spending || 0
})

function minMax(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}
</script>

<style scoped>
.wealth-compass {
  position: relative;
  z-index: 1;
}

.compass-stat-item {
  position: relative;
  z-index: 2;
}

.compass-progress :deep(.v-progress-circular__underlay) {
  opacity: 0.1 !important;
}

.compass-bg-icon {
  position: absolute;
  top: 50%;
  right: -20px;
  transform: translateY(-50%) rotate(15deg);
  opacity: 0.03;
  color: rgb(var(--v-theme-primary));
  z-index: 0;
  pointer-events: none;
}
</style>
