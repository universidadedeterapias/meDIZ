// src/scripts/debug-subscriptions-discrepancy.ts
import { prisma } from '@/lib/prisma'

async function debugSubscriptionsDiscrepancy() {
  console.log('🔍 INVESTIGANDO DISCREPÂNCIA DE SUBSCRIPTIONS')
  console.log('=' .repeat(60))

  try {
    // 1. Contar todas as subscriptions (sem filtro de data)
    const allSubscriptions = await prisma.subscription.count()
    console.log(`\n📊 Total de subscriptions no banco: ${allSubscriptions}`)

    // 2. Contar subscriptions ativas (critério atual)
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        currentPeriodEnd: {
          gte: new Date()
        }
      }
    })
    console.log(`💳 Subscriptions ativas (critério atual): ${activeSubscriptions}`)

    // 3. Contar usuários únicos com subscription ativa
    const uniqueUsersWithActiveSubs = await prisma.user.count({
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
    console.log(`👥 Usuários únicos com subscription ativa: ${uniqueUsersWithActiveSubs}`)

    // 4. Buscar subscriptions criadas hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const subscriptionsToday = await prisma.subscription.findMany({
      where: {
        createdAt: {
          gte: today
        }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            fullName: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📅 Subscriptions criadas hoje: ${subscriptionsToday.length}`)
    if (subscriptionsToday.length > 0) {
      console.log('\n📋 Detalhes das subscriptions de hoje:')
      subscriptionsToday.forEach(sub => {
        console.log(`\n- ID: ${sub.id}`)
        console.log(`  Usuário: ${sub.user.email}`)
        console.log(`  Nome: ${sub.user.name || sub.user.fullName || 'Sem nome'}`)
        console.log(`  Plano: ${sub.plan.name}`)
        console.log(`  Status: ${sub.status}`)
        console.log(`  Criado em: ${sub.createdAt.toISOString()}`)
        console.log(`  Período: ${sub.currentPeriodStart.toISOString()} até ${sub.currentPeriodEnd.toISOString()}`)
      })
    }

    // 5. Buscar especificamente por "jairo wilson" e "jannaina pinho"
    console.log('\n🔍 BUSCANDO USUÁRIOS ESPECÍFICOS:')
    
    const jairoWilson = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'jairo', mode: 'insensitive' } },
          { fullName: { contains: 'jairo', mode: 'insensitive' } },
          { email: { contains: 'jairo', mode: 'insensitive' } }
        ]
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
        }
      }
    })

    const jannainaPinho = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'jannaina', mode: 'insensitive' } },
          { fullName: { contains: 'jannaina', mode: 'insensitive' } },
          { email: { contains: 'jannaina', mode: 'insensitive' } }
        ]
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
        }
      }
    })

    console.log(`\n👤 Usuários encontrados com "jairo": ${jairoWilson.length}`)
    jairoWilson.forEach(user => {
      console.log(`\n- Email: ${user.email}`)
      console.log(`  Nome: ${user.name || user.fullName || 'Sem nome'}`)
      console.log(`  Criado em: ${user.createdAt.toISOString()}`)
      console.log(`  Subscriptions: ${user.subscriptions.length}`)
      user.subscriptions.forEach(sub => {
        console.log(`    * ${sub.plan.name} - ${sub.status} (${sub.createdAt.toISOString()})`)
      })
    })

    console.log(`\n👤 Usuários encontrados com "jannaina": ${jannainaPinho.length}`)
    jannainaPinho.forEach(user => {
      console.log(`\n- Email: ${user.email}`)
      console.log(`  Nome: ${user.name || user.fullName || 'Sem nome'}`)
      console.log(`  Criado em: ${user.createdAt.toISOString()}`)
      console.log(`  Subscriptions: ${user.subscriptions.length}`)
      user.subscriptions.forEach(sub => {
        console.log(`    * ${sub.plan.name} - ${sub.status} (${sub.createdAt.toISOString()})`)
      })
    })

    // 6. Verificar se há subscriptions que não estão sendo contadas
    console.log('\n🔍 VERIFICANDO SUBSCRIPTIONS NÃO CONTADAS:')
    
    const allActiveSubs = await prisma.subscription.findMany({
      where: {
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            fullName: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📊 Todas as subscriptions com status ativo: ${allActiveSubs.length}`)
    
    const expiredButActive = allActiveSubs.filter(sub => sub.currentPeriodEnd < new Date())
    console.log(`⚠️  Subscriptions expiradas mas com status ativo: ${expiredButActive.length}`)
    
    if (expiredButActive.length > 0) {
      console.log('\n📋 Subscriptions expiradas mas ativas:')
      expiredButActive.forEach(sub => {
        console.log(`- ${sub.user.email}: ${sub.plan.name} (expirou em ${sub.currentPeriodEnd.toISOString()})`)
      })
    }

    const validActiveSubs = allActiveSubs.filter(sub => sub.currentPeriodEnd >= new Date())
    console.log(`✅ Subscriptions realmente ativas (não expiradas): ${validActiveSubs.length}`)

    // 7. Verificar se há problema na query da API
    console.log('\n🔍 TESTANDO QUERY DA API:')
    
    const apiQueryResult = await prisma.user.count({
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
    
    console.log(`📊 Resultado da query da API: ${apiQueryResult} usuários premium`)

    // 8. Listar todos os usuários premium para comparação
    console.log('\n📋 LISTA COMPLETA DE USUÁRIOS PREMIUM:')
    
    const allPremiumUsers = await prisma.user.findMany({
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n👥 Total de usuários premium encontrados: ${allPremiumUsers.length}`)
    
    allPremiumUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.email}`)
      console.log(`   Nome: ${user.name || user.fullName || 'Sem nome'}`)
      console.log(`   Criado em: ${user.createdAt.toISOString()}`)
      console.log(`   Subscriptions ativas: ${user.subscriptions.length}`)
      user.subscriptions.forEach(sub => {
        console.log(`     * ${sub.plan.name} - ${sub.status} (até ${sub.currentPeriodEnd.toISOString()})`)
      })
    })

    console.log('\n✅ INVESTIGAÇÃO CONCLUÍDA')

  } catch (error) {
    console.error('❌ Erro durante a investigação:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSubscriptionsDiscrepancy()
