<template>
    <v-row class="mb-6" dense>
        <v-col cols="12" sm="6" md="3">
            <v-card class="glass-card pa-4 d-flex align-center border-thin" rounded="xl">
                <v-avatar color="primary" variant="tonal" class="mr-4 elevation-1" rounded="lg">
                    <FileText :size="20" />
                </v-avatar>
                <div>
                    <div class="text-caption font-weight-bold opacity-60 text-uppercase letter-spacing-1">Total Rules
                    </div>
                    <div class="text-h5 font-weight-black text-primary">{{ stats?.total_rules ?? '—' }}</div>
                </div>
            </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
            <v-card class="glass-card pa-4 d-flex align-center border-thin" rounded="xl">
                <v-avatar color="success" variant="tonal" class="mr-4 elevation-1" rounded="lg">
                    <Zap :size="20" />
                </v-avatar>
                <div>
                    <div class="text-caption font-weight-bold opacity-60 text-uppercase letter-spacing-1">Total Hits
                    </div>
                    <div class="text-h5 font-weight-black text-success">{{ stats?.total_hits ?? '—' }}</div>
                </div>
            </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
            <v-card class="glass-card pa-4 d-flex align-center border-thin" rounded="xl">
                <v-avatar color="secondary" variant="tonal" class="mr-4 elevation-1" rounded="lg">
                    <TrendingUp :size="20" />
                </v-avatar>
                <div>
                    <div class="text-caption font-weight-bold opacity-60 text-uppercase letter-spacing-1">Hit Rate</div>
                    <div class="text-h5 font-weight-black text-secondary">{{ stats ? `${stats.avg_hit_rate}%` : '—' }}
                    </div>
                </div>
            </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
            <v-card class="glass-card pa-4 d-flex align-center border-thin" rounded="xl">
                <v-avatar color="warning" variant="tonal" class="mr-4 elevation-1" rounded="lg">
                    <Inbox :size="20" />
                </v-avatar>
                <div>
                    <div class="text-caption font-weight-bold opacity-60 text-uppercase letter-spacing-1">Pending
                        Triage</div>
                    <div class="text-h5 font-weight-black text-warning">{{ stats?.pending_triage ?? '—' }}</div>
                </div>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { FileText, Zap, TrendingUp, Inbox } from 'lucide-vue-next'
import type { RuleStats } from '@/stores/finance/rules'

defineProps<{ stats: RuleStats | null }>()
</script>
