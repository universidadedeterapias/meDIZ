// lib/assistant.ts
import {
  getThreadMessages,
  getThreadUserMessages
} from './chatMessages'

type ThreadMessages = {
  assistant: string[]
  user: string[]
}

export async function getMessages(threadId: string): Promise<ThreadMessages> {
  return getThreadMessages(threadId)
}

export async function getUserMessages(threadId: string) {
  return getThreadUserMessages(threadId)
}
