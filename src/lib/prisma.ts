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
prisma.$connect().catch((error) => {
  console.error('❌ Erro ao conectar com o banco de dados:', error)
  process.exit(1)
})
