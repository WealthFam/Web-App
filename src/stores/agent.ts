import { defineStore } from 'pinia'
import { ref } from 'vue'
import { agentApi } from '@/api/client'

interface Message {
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
}

export const useAgentStore = defineStore('agent', () => {
    const messages = ref<Message[]>([])
    const isTyping = ref(false)
    const threadId = ref<string | undefined>(undefined)

    async function sendMessage(text: string) {
        // Add user message immediately
        messages.value.push({
            role: 'user',
            content: text,
            timestamp: new Date(),
        })

        isTyping.value = true
        try {
            const response = await agentApi.chat(text, threadId.value)
            
            // Add agent response
            messages.value.push({
                role: 'agent',
                content: response.data.response,
                timestamp: new Date(),
            })
        } catch (error) {
            messages.value.push({
                role: 'agent',
                content: "I encountered a communication vector error. Please verify the agent service status.",
                timestamp: new Date(),
            })
        } finally {
            isTyping.value = false
        }
    }

    function clearHistory() {
        messages.value = []
        threadId.value = undefined
    }

    return {
        messages,
        isTyping,
        threadId,
        sendMessage,
        clearHistory
    }
})
