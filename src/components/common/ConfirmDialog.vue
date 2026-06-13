<script setup lang="ts">
import { useConfirmStore } from '@/stores/confirm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-vue-next'

const confirm = useConfirmStore()
</script>

<template>
  <Dialog :open="confirm.isOpen" @update:open="(val) => { if (!val) confirm.cancel() }">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <AlertCircle class="h-5 w-5 text-warning" />
          {{ confirm.title }}
        </DialogTitle>
        <DialogDescription class="pt-2">
          {{ confirm.message }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="sm:justify-end gap-2 mt-4">
        <Button variant="outline" @click="confirm.cancel()">
          {{ confirm.cancelText }}
        </Button>
        <Button variant="destructive" @click="confirm.agree()">
          {{ confirm.confirmText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
