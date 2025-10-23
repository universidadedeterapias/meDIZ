import { handlers } from '@/auth'

// Forçar runtime Node.js para evitar problemas com cookies no edge
export const runtime = 'nodejs'

export const { GET, POST } = handlers