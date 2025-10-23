// src/scripts/fix-expired-subscriptions.ts
import { prisma } from '@/lib/prisma'

async function fixExpiredSubscriptions() {
  console.log('🔧 CORRIGINDO SUBSCRIPTIONS EXPIRADAS')
  console.log('=' .repeat(50))

  try {
    // 1. Buscar subscriptions expiradas mas marcadas como ativas
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
            email: true,
            name: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`\n⚠️  Subscriptions expiradas encontradas: ${expiredButActive.length}`)

    if (expiredButActive.length === 0) {
      console.log('✅ Nenhuma subscription expirada encontrada!')
      return
    }

    // Mostrar detalhes
    console.log('\n📋 Detalhes das subscriptions a serem corrigidas:')
    expiredButActive.forEach(sub => {
      console.log(`\n- Usuário: ${sub.user.email} (${sub.user.name})`)
      console.log(`  Plano: ${sub.plan.name}`)
      console.log(`  Status atual: ${sub.status}`)
      console.log(`  Expirou em: ${sub.currentPeriodEnd.toISOString()}`)
      console.log(`  Subscription ID: ${sub.id}`)
    })

    // 2. Atualizar status para 'expired'
    console.log('\n🔄 Atualizando status para "expired"...')
    
    const updateResult = await prisma.subscription.updateMany({
      where: {
        status: {
          in: ['active', 'ACTIVE']
        },
        currentPeriodEnd: {
          lt: new Date()
        }
      },
      data: {
        status: 'expired'
      }
    })

    console.log(`\n✅ ${updateResult.count} subscriptions foram atualizadas para "expired"`)

    // 3. Verificar se a correção foi aplicada
    const stillActive = await prisma.subscription.count({
      where: {
        status: {
          in: ['active', 'ACTIVE']
        },
        currentPeriodEnd: {
          lt: new Date()
        }
      }
    })

    if (stillActive === 0) {
      console.log('✅ Todas as subscriptions expiradas foram corrigidas!')
    } else {
      console.log(`⚠️  Ainda existem ${stillActive} subscriptions com problema`)
    }

    console.log('\n✅ CORREÇÃO CONCLUÍDA')

  } catch (error) {
    console.error('❌ Erro durante a correção:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixExpiredSubscriptions()

