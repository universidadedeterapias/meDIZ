// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// evita múltiplas instâncias em dev
const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })
}

function isPrismaClientStale(client: PrismaClient): boolean {
  // Modelos novos ausentes = client gerado antes da última `prisma generate`
  return !('catalogCourseModule' in client) || !('catalogModuleMedia' in client)
}

let prisma = globalForPrisma.prisma

if (!prisma || (process.env.NODE_ENV !== 'production' && isPrismaClientStale(prisma))) {
  prisma = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }
}

export { prisma }

// Testar conexão na inicialização
prisma.$connect().catch((error) => {
  console.error('❌ Erro ao conectar com o banco de dados:', error)
  process.exit(1)
})
