<template>
  <div class="strategic-optimizer">
    <div class="optimizer-header">
      <div class="bot-identity">
        <div class="avatar">
          <v-icon icon="mdi-shield-check" color="primary"></v-icon>
        </div>
        <div class="info">
          <h3>Strategic Optimizer</h3>
          <span class="status">
            <v-badge dot color="success" inline></v-badge>
            Intelligence Active
          </span>
        </div>
      </div>
      <v-btn icon="mdi-refresh" variant="text" size="small" @click="clearHistory" title="Reset Session"></v-btn>
    </div>

    <div class="chat-viewport" ref="chatScroll">
      <div v-if="agentStore.messages.length === 0" class="welcome-card">
        <v-icon icon="mdi-finance" size="large" color="primary" class="mb-4"></v-icon>
        <h2>Welcome to Your Financial War Room</h2>
        <p>I am your Strategic Optimizer. I analyze your financial velocity and buffers in real-time.</p>
        <div class="suggestions">
          <v-chip v-for="s in suggestions" :key="s" @click="handleSuggestion(s)" variant="outlined" class="ma-1">
            {{ s }}
          </v-chip>
        </div>
      </div>

      <div v-for="(msg, index) in agentStore.messages" :key="index" :class="['message-row', msg.role]">
        <div class="bubble">
          <div class="role-label">{{ msg.role === 'agent' ? 'OPTIMIZER' : 'USER' }}</div>
          <div class="content" v-html="formatContent(msg.content)"></div>
          <div class="time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </div>

      <div v-if="agentStore.isTyping" class="message-row agent">
        <div class="bubble typing">
          <v-progress-circular indeterminate size="16" width="2" class="mr-2"></v-progress-circular>
          Calculating financial vectors...
        </div>
      </div>
    </div>

    <div class="input-area">
      <v-text-field
        v-model="inputText"
        placeholder="Ask about spending, trends, or strategy..."
        variant="solo-filled"
        hide-details
        @keyup.enter="sendMessage"
        :disabled="agentStore.isTyping"
        rounded="lg"
      >
        <template v-slot:append-inner>
          <v-btn icon="mdi-send" variant="text" color="primary" @click="sendMessage" :disabled="!inputText || agentStore.isTyping"></v-btn>
        </template>
      </v-text-field>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useAgentStore } from '@/stores/agent'
import { marked } from 'marked'

const agentStore = useAgentStore()
const inputText = ref('')
const chatScroll = ref<HTMLElement | null>(null)

const suggestions = [
  "How much did I spend today?",
  "What is my top spending category this week?",
  "Analyze my financial velocity for this month.",
  "Do I have any recurring buffers?"
]

const formatContent = (content: string) => {
  return marked(content)
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatScroll.value) {
    chatScroll.value.scrollTop = chatScroll.value.scrollHeight
  }
}

const sendMessage = async () => {
  if (!inputText.value || agentStore.isTyping) return
  const text = inputText.value
  inputText.value = ''
  await agentStore.sendMessage(text)
}

const handleSuggestion = (s: string) => {
  inputText.value = s
  sendMessage()
}

const clearHistory = () => {
  agentStore.clearHistory()
}

watch(() => agentStore.messages.length, scrollToBottom)
onMounted(scrollToBottom)
</script>

<style scoped>
.strategic-optimizer {
  display: flex;
  flex-direction: column;
  height: 600px;
  background: rgba(var(--v-theme-surface), 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--v-border-color), 0.1);
  border-radius: 16px;
  overflow: hidden;
}

.optimizer-header {
  padding: 16px;
  background: rgba(var(--v-theme-surface), 0.8);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bot-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.status {
  font-size: 0.75rem;
  opacity: 0.7;
  display: flex;
  align-items: center;
  gap: 4px;
}

.chat-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scrollbar-width: thin;
}

.welcome-card {
  text-align: center;
  padding: 40px 20px;
  opacity: 0.8;
}

.suggestions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.message-row {
  display: flex;
  width: 100%;
}

.message-row.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.message-row.user .bubble {
  background: rgb(var(--v-theme-primary));
  color: white;
  border-bottom-right-radius: 2px;
}

.message-row.agent .bubble {
  background: rgba(var(--v-theme-surface), 0.9);
  border: 1px solid rgba(var(--v-border-color), 0.1);
  border-bottom-left-radius: 2px;
}

.role-label {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
  opacity: 0.7;
}

.content {
  font-size: 0.95rem;
  line-height: 1.5;
}

.content :deep(p) { margin-bottom: 8px; }
.content :deep(p:last-child) { margin-bottom: 0; }

.time {
  font-size: 0.7rem;
  opacity: 0.5;
  margin-top: 6px;
  text-align: right;
}

.typing {
  font-style: italic;
  font-size: 0.85rem;
  opacity: 0.8;
}

.input-area {
  padding: 16px;
  background: rgba(var(--v-theme-surface), 0.8);
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
}
</style>
