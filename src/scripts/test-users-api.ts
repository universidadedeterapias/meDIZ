// src/scripts/test-users-api.ts
import { prisma } from '@/lib/prisma'
import { countPremiumUsers } from '@/lib/premiumUtils'

async function testUsersAPI() {
  console.log('🧪 TESTANDO API DE USUÁRIOS')
  console.log('=' .repeat(50))

  try {
    // 1. Testar contagem total de usuários
    console.log('\n📊 1. CONTAGEM TOTAL DE USUÁRIOS')
    const totalUsers = await prisma.user.count()
    console.log(`Total de usuários no banco: ${totalUsers}`)

    // 2. Testar contagem de usuários premium
    console.log('\n💳 2. USUÁRIOS PREMIUM')
    const premiumCount = await countPremiumUsers()
    console.log(`Usuários premium (via countPremiumUsers): ${premiumCount}`)

    // 3. Testar query direta de premium
    const premiumUsersDirect = await prisma.user.count({
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
      }
    })
    console.log(`Usuários premium (query direta): ${premiumUsersDirect}`)

    // 4. Testar usuários ativos nos últimos 7 dias
    console.log('\n🟢 3. USUÁRIOS ATIVOS (ÚLTIMOS 7 DIAS)')
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const activeUsers = await prisma.user.count({
      where: {
        sessions: {
          some: {
            expires: {
              gte: sevenDaysAgo
            }
          }
        }
      }
    })
    console.log(`Usuários com sessão ativa nos últimos 7 dias: ${activeUsers}`)

    // 5. Testar usuários com última sessão recente
    const usersWithRecentSessions = await prisma.user.findMany({
      where: {
        sessions: {
          some: {
            expires: {
              gte: sevenDaysAgo
            }
          }
        }
      },
      include: {
        sessions: {
          orderBy: {
            expires: 'desc'
          },
          take: 1
        }
      },
      take: 5
    })

    console.log('\n📋 Exemplos de usuários ativos:')
    usersWithRecentSessions.forEach(user => {
      const lastSession = user.sessions[0]
      console.log(`- ${user.email}: última sessão em ${lastSession?.expires.toISOString()}`)
    })

    // 6. Testar busca de usuários com filtros
    console.log('\n🔍 4. TESTE DE BUSCA COM FILTROS')
    
    // Buscar usuários premium
    const premiumUsers = await prisma.user.findMany({
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
          include: {
            plan: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        sessions: {
          orderBy: {
            expires: 'desc'
          },
          take: 1
        }
      },
      take: 3
    })

    console.log('\n💳 Exemplos de usuários premium:')
    premiumUsers.forEach(user => {
      const activeSub = user.subscriptions.find(sub => 
        ['active', 'ACTIVE', 'cancel_at_period_end'].includes(sub.status) &&
        sub.currentPeriodEnd >= new Date()
      )
      const lastLogin = user.sessions[0]?.expires
      console.log(`- ${user.email}: ${activeSub?.plan.name} (até ${activeSub?.currentPeriodEnd.toISOString()})`)
      console.log(`  Último login: ${lastLogin?.toISOString() || 'Nunca'}`)
    })

    // 7. Testar estatísticas como na API
    console.log('\n📈 5. ESTATÍSTICAS COMO NA API')
    
    const adminUsers = await prisma.user.count({
      where: {
        email: {
          contains: '@mediz.com'
        }
      }
    })

    const freeUsers = totalUsers - premiumCount

    const stats = {
      totalUsers,
      premiumUsers: premiumCount,
      freeUsers,
      adminUsers,
      activeUsers
    }

    console.log('Estatísticas calculadas:')
    console.log(JSON.stringify(stats, null, 2))

    // 8. Verificar inconsistências
    console.log('\n⚠️  6. VERIFICAÇÃO DE INCONSISTÊNCIAS')
    
    // Subscriptions expiradas mas ativas
    const expiredButActive = await prisma.subscription.findMany({
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
        }
      }
    })

    if (expiredButActive.length > 0) {
      console.log(`⚠️  Subscriptions expiradas mas ativas: ${expiredButActive.length}`)
      expiredButActive.forEach(sub => {
        console.log(`- ${sub.user.email}: ${sub.status} (expirou em ${sub.currentPeriodEnd.toISOString()})`)
      })
    } else {
      console.log('✅ Nenhuma subscription expirada mas ativa encontrada')
    }

    console.log('\n✅ TESTE CONCLUÍDO')

  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testUsersAPI()
