// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// 🔍 DEBUG: Log durante inicialização do Prisma
console.log('[DEBUG prisma.ts] Iniciando configuração do Prisma Client...')
console.log('[DEBUG prisma.ts] DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado')
console.log('[DEBUG prisma.ts] NODE_ENV:', process.env.NODE_ENV)

// evita múltiplas instâncias em dev
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Testar conexão na inicialização (não bloquear, apenas logar)
// O Next.js carregará as variáveis antes de usar o Prisma
if (process.env.DATABASE_URL) {
  console.log('[DEBUG prisma.ts] Tentando conectar ao banco de dados...')
  prisma.$connect()
    .then(() => {
      console.log('[DEBUG prisma.ts] ✅ Conexão com banco estabelecida com sucesso')
    })
    .catch((error) => {
      console.error('[DEBUG prisma.ts] ❌ Erro ao conectar com o banco de dados:')
      console.error('[DEBUG prisma.ts] Tipo do erro:', error?.constructor?.name)
      console.error('[DEBUG prisma.ts] Mensagem:', error?.message)
      console.error('[DEBUG prisma.ts] Stack:', error?.stack)
      console.error('[DEBUG prisma.ts] DATABASE_URL usado:', process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : 'NÃO DEFINIDO')
      // Não fazer exit imediato, deixar o Next.js gerenciar
      console.error('[DEBUG prisma.ts] ⚠️  A conexão será tentada novamente quando necessário')
    })
} else {
  console.warn('[DEBUG prisma.ts] ⚠️  DATABASE_URL não disponível ainda - será carregado pelo Next.js')
}
