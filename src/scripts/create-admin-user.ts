// src/scripts/create-admin-user.ts
//
// Script pontual: cria (ou reseta a senha de) um usuário admin.
// Acesso admin é concedido por domínio de email (@mediz.com), ver src/lib/requireAuth.ts.
//
// Uso: npx tsx src/scripts/create-admin-user.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'luzia.admin@mediz.com'

function generateStrongPassword(length = 20): string {
  return randomBytes(length)
    .toString('base64')
    .replace(/[+/=]/g, '')
    .slice(0, length)
}

async function main() {
  if (!ADMIN_EMAIL.includes('@mediz.com')) {
    throw new Error('ADMIN_EMAIL precisa terminar em @mediz.com para passar em requireAdmin()')
  }

  const password = generateStrongPassword()
  const passwordHash = await bcrypt.hash(password, 12)
  const now = new Date()

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      name: 'Luzia Admin',
      email: ADMIN_EMAIL,
      passwordHash,
      emailVerified: now,
      mustResetPassword: true
    },
    update: {
      passwordHash,
      emailVerified: now,
      mustResetPassword: true
    },
    select: { id: true, email: true, createdAt: true }
  })

  console.log(`Usuário admin pronto: ${user.email} (id: ${user.id})`)
  console.log(`Senha temporária: ${password}`)
  console.log('mustResetPassword = true — a senha deve ser trocada no primeiro login.')

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Erro ao criar usuário admin:', error)
  process.exit(1)
})
