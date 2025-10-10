// src/scripts/audit-users-and-subscriptions.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 AUDITORIA DE USUÁRIOS E ASSINATURAS\n')

  try {
    // 1. Contagem total de usuários
    const totalUsers = await prisma.user.count()
    console.log(`📊 Total de usuários no banco: ${totalUsers}`)

    // 2. Usuários com email duplicado
    const duplicateEmails = await prisma.user.groupBy({
      by: ['email'],
      having: {
        email: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        email: true
      }
    })

    console.log(`\n🔍 Usuários com email duplicado: ${duplicateEmails.length}`)
    if (duplicateEmails.length > 0) {
      duplicateEmails.forEach(dup => {
        console.log(`  - ${dup.email}: ${dup._count.email} registros`)
      })
    }

    // 3. Usuários órfãos (sem accounts, sessions ou subscriptions)
    const orphanUsers = await prisma.user.findMany({
      where: {
        AND: [
          { accounts: { none: {} } },
          { sessions: { none: {} } },
          { subscriptions: { none: {} } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    console.log(`\n👻 Usuários órfãos (sem vínculos): ${orphanUsers.length}`)
    if (orphanUsers.length > 0) {
      orphanUsers.slice(0, 10).forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'Sem nome'}) - Criado: ${user.createdAt.toLocaleDateString('pt-BR')}`)
      })
      if (orphanUsers.length > 10) {
        console.log(`  ... e mais ${orphanUsers.length - 10} usuários órfãos`)
      }
    }

    // 4. Usuários com subscriptions ativas
    const usersWithActiveSubscriptions = await prisma.user.findMany({
      where: {
        subscriptions: {
          some: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      },
      include: {
        subscriptions: {
          where: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          },
          include: {
            plan: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    console.log(`\n💳 Usuários com subscriptions ativas: ${usersWithActiveSubscriptions.length}`)

    // 5. Usuários sem subscription (plano gratuito)
    const freeUsers = await prisma.user.findMany({
      where: {
        subscriptions: {
          none: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    console.log(`\n🆓 Usuários sem subscription ativa (gratuitos): ${freeUsers.length}`)

    // 6. Distribuição por período de cadastro
    const now = new Date()
    const firstWeekUsers = freeUsers.filter(user => {
      const daysSinceCreation = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreation <= 7
    })

    const firstMonthUsers = freeUsers.filter(user => {
      const daysSinceCreation = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreation > 7 && daysSinceCreation <= 30
    })

    const beyondMonthUsers = freeUsers.filter(user => {
      const daysSinceCreation = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreation > 30
    })

    console.log(`\n📅 Distribuição de usuários gratuitos por período:`)
    console.log(`  - 1-7 dias: ${firstWeekUsers.length} usuários`)
    console.log(`  - 8-30 dias: ${firstMonthUsers.length} usuários`)
    console.log(`  - 31+ dias: ${beyondMonthUsers.length} usuários`)

    // 7. Usuários com múltiplas subscriptions
    const usersWithMultipleSubs = await prisma.user.findMany({
      where: {
        subscriptions: {
          some: {}
        }
      },
      include: {
        subscriptions: {
          include: {
            plan: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    const multipleSubsUsers = usersWithMultipleSubs.filter(user => user.subscriptions.length > 1)
    console.log(`\n🔄 Usuários com múltiplas subscriptions: ${multipleSubsUsers.length}`)
    if (multipleSubsUsers.length > 0) {
      multipleSubsUsers.slice(0, 5).forEach(user => {
        console.log(`  - ${user.email}: ${user.subscriptions.length} subscriptions`)
        user.subscriptions.forEach(sub => {
          console.log(`    * ${sub.plan.name} - ${sub.status} (até ${sub.currentPeriodEnd.toLocaleDateString('pt-BR')})`)
        })
      })
    }

    // 8. Subscriptions expiradas mas ainda ativas
    const expiredButActiveSubs = await prisma.subscription.findMany({
      where: {
        status: {
          in: ['active', 'ACTIVE']
        },
        currentPeriodEnd: {
          lt: new Date()
        }
      },
      include: {
        user: {
          select: {
            email: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`\n⚠️  Subscriptions expiradas mas marcadas como ativas: ${expiredButActiveSubs.length}`)
    if (expiredButActiveSubs.length > 0) {
      expiredButActiveSubs.slice(0, 5).forEach(sub => {
        console.log(`  - ${sub.user.email}: ${sub.plan.name} expirou em ${sub.currentPeriodEnd.toLocaleDateString('pt-BR')}`)
      })
    }

    // 9. Resumo final
    console.log(`\n📋 RESUMO DA AUDITORIA:`)
    console.log(`✅ Total de usuários: ${totalUsers}`)
    console.log(`👻 Usuários órfãos: ${orphanUsers.length}`)
    console.log(`💳 Usuários premium: ${usersWithActiveSubscriptions.length}`)
    console.log(`🆓 Usuários gratuitos: ${freeUsers.length}`)
    console.log(`🔄 Usuários com múltiplas subs: ${multipleSubsUsers.length}`)
    console.log(`⚠️  Subscriptions inconsistentes: ${expiredButActiveSubs.length}`)
    console.log(`📧 Emails duplicados: ${duplicateEmails.length}`)

    // 10. Queries de validação para conferência
    console.log(`\n🔍 QUERIES DE VALIDAÇÃO:`)
    console.log(`-- Total de usuários`)
    console.log(`SELECT COUNT(*) FROM "User";`)
    console.log(`\n-- Usuários com subscription ativa`)
    console.log(`SELECT COUNT(DISTINCT u.id) FROM "User" u`)
    console.log(`JOIN "Subscription" s ON u.id = s."userId"`)
    console.log(`WHERE s.status IN ('active', 'ACTIVE', 'cancel_at_period_end')`)
    console.log(`AND s."currentPeriodEnd" >= NOW();`)
    console.log(`\n-- Usuários órfãos`)
    console.log(`SELECT COUNT(*) FROM "User" u`)
    console.log(`WHERE NOT EXISTS (SELECT 1 FROM "Account" a WHERE a."userId" = u.id)`)
    console.log(`AND NOT EXISTS (SELECT 1 FROM "Session" s WHERE s."userId" = u.id)`)
    console.log(`AND NOT EXISTS (SELECT 1 FROM "Subscription" s WHERE s."userId" = u.id);`)

  } catch (error) {
    console.error('❌ Erro na auditoria:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
