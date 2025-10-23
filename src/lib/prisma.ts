// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// evita múltiplas instâncias em dev
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Testar conexão na inicialização
console.log('🔍 [DEBUG] Iniciando teste de conexão com banco de dados...')
console.log('🔍 [DEBUG] NODE_ENV:', process.env.NODE_ENV)
console.log('🔍 [DEBUG] DATABASE_URL existe:', !!process.env.DATABASE_URL)
console.log('🔍 [DEBUG] DATABASE_URL (primeiros 20 chars):', process.env.DATABASE_URL?.substring(0, 20) + '...')

prisma.$connect()
  .then(() => {
    console.log('✅ [DEBUG] Conexão com banco estabelecida com sucesso!')
  })
  .catch((error) => {
    console.error('❌ [DEBUG] Erro ao conectar com o banco de dados:')
    console.error('❌ [DEBUG] Tipo do erro:', typeof error)
    console.error('❌ [DEBUG] Mensagem:', error.message)
    console.error('❌ [DEBUG] Código:', error.code)
    console.error('❌ [DEBUG] Detalhes completos:', error)
    console.error('❌ [DEBUG] Stack trace:', error.stack)
    process.exit(1)
  })
