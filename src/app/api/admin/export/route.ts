// src/app/api/admin/export/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logDataExport } from '@/lib/auditLogger'
import { sendDataExportAlert } from '@/lib/whatsappService'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'users' // 'users', 'analytics' ou 'top-searches'
    const format = searchParams.get('format') || 'csv' // 'csv' ou 'xlsx'
    const canceledOnly = searchParams.get('canceledOnly') === 'true'

    // Buscar admin para registrar no audit log e enviar alerta
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, whatsapp: true }
    })

    let result
    let recordCount = 0
    
    if (type === 'users') {
      result = await exportUsers(format, { canceledOnly })
      // Contar registros exportados
      recordCount = canceledOnly
        ? await prisma.user.count({
            where: {
              subscriptions: {
                some: {
                  status: { in: ['canceled', 'cancelled', 'cancel_at_period_end'] }
                }
              }
            }
          })
        : await prisma.user.count()
      // Registrar exportação no audit log
      if (admin) {
        await logDataExport(admin.id, session.user.email, format.toUpperCase(), recordCount, req)
        
        // Enviar alerta de segurança via WhatsApp
        if (admin.whatsapp) {
          try {
            await sendDataExportAlert(
              admin.whatsapp,
              admin.name || 'Admin',
              'Usuários',
              recordCount
            )
          } catch {
            // Não falhar o fluxo principal se o alerta falhar
          }
        }
      }
    } else if (type === 'analytics') {
      result = await exportAnalytics(format)
      // Registrar exportação no audit log
      if (admin) {
        await logDataExport(admin.id, session.user.email, format.toUpperCase(), 0, req)
        
        // Enviar alerta de segurança via WhatsApp
        if (admin.whatsapp) {
          try {
            await sendDataExportAlert(
              admin.whatsapp,
              admin.name || 'Admin',
              'Analytics',
              0
            )
          } catch {
            // Não falhar o fluxo principal se o alerta falhar
          }
        }
      }
    } else if (type === 'top-searches') {
      const topUsers = await exportTopSearches(format)
      result = topUsers.result
      recordCount = topUsers.recordCount
      if (admin) {
        await logDataExport(admin.id, session.user.email, format.toUpperCase(), recordCount, req)
        if (admin.whatsapp) {
          try {
            await sendDataExportAlert(
              admin.whatsapp,
              admin.name || 'Admin',
              'Top buscas (30 dias)',
              recordCount
            )
          } catch {
            // Não falhar o fluxo principal se o alerta falhar
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Tipo de exportação inválido' }, { status: 400 })
    }

    return result

  } catch {
    // Usar sistema de logs estruturado (será implementado)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function exportUsers(format: string, options: { canceledOnly: boolean }) {
  const { canceledOnly } = options
  // Busca todos os usuários com suas informações
  const users = await prisma.user.findMany({
    where: canceledOnly
      ? {
          subscriptions: {
            some: {
              status: { in: ['canceled', 'cancelled', 'cancel_at_period_end'] }
            }
          }
        }
      : undefined,
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
      accounts: {
        select: {
          provider: true
        }
      },
      chatSessions: {
        select: {
          id: true,
          createdAt: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Processa os dados
  const processedData = users.map(user => {
    const activeSubscription = user.subscriptions.find(sub => 
      ['active', 'ACTIVE', 'cancel_at_period_end'].includes(sub.status) &&
      sub.currentPeriodEnd >= new Date()
    )
    const latestSubscription = user.subscriptions[0]

    return {
      'ID': user.id,
      'Nome': user.name || user.fullName || 'Sem nome',
      'Email': user.email,
      'Data de Cadastro': user.createdAt.toLocaleDateString('pt-BR'),
      'Email Verificado': user.emailVerified ? 'Sim' : 'Não',
      'Plano': activeSubscription ? 'Premium' : 'Gratuito',
      'Plano de Assinatura': activeSubscription?.plan.name || latestSubscription?.plan.name || 'N/A',
      'Status da Assinatura': activeSubscription?.status || latestSubscription?.status || 'N/A',
      'Vencimento da Assinatura': activeSubscription?.currentPeriodEnd.toLocaleDateString('pt-BR') || latestSubscription?.currentPeriodEnd?.toLocaleDateString('pt-BR') || 'N/A',
      'Total de Assinaturas': user.subscriptions.length,
      'Total de Pesquisas': user.chatSessions.length,
      'Provedores de Login': user.accounts.map(acc => acc.provider).join(', '),
      'É Admin': user.email.includes('@mediz.com') ? 'Sim' : 'Não',
      'Última Atualização': user.updatedAt.toLocaleDateString('pt-BR')
    }
  })

  if (format === 'csv') {
    return generateCSV(processedData, 'usuarios')
  } else {
    return generateXLSX(processedData, 'usuarios')
  }
}

const getSaoPauloNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date())

  const getPart = (type: string) => parts.find(part => part.type === type)?.value || '00'
  const year = Number(getPart('year'))
  const month = Number(getPart('month')) - 1
  const day = Number(getPart('day'))
  const hour = Number(getPart('hour'))
  const minute = Number(getPart('minute'))
  const second = Number(getPart('second'))

  return new Date(Date.UTC(year, month, day, hour, minute, second))
}

async function exportTopSearches(format: string) {
  const endDate = getSaoPauloNow()
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  const topSearches = await prisma.chatSession.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: startDate }
    },
    _count: { userId: true },
    _max: { createdAt: true },
    orderBy: [
      { _count: { userId: 'desc' } },
      { _max: { createdAt: 'desc' } }
    ],
    take: 20
  })

  const userIds = topSearches.map(item => item.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: {
      subscriptions: {
        include: {
          plan: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  const userMap = new Map(users.map(user => [user.id, user]))
  const processedData = topSearches.map(item => {
    const user = userMap.get(item.userId)
    const activeSubscription = user?.subscriptions.find(sub =>
      ['active', 'ACTIVE', 'cancel_at_period_end'].includes(sub.status) &&
      sub.currentPeriodEnd >= new Date()
    )
    const lastSearchDate = item._max.createdAt

    return {
      'Nome': user?.name || user?.fullName || 'Sem nome',
      'Email': user?.email || 'N/A',
      'Plano': activeSubscription ? 'Premium' : 'Gratuito',
      'Última Busca': lastSearchDate ? lastSearchDate.toLocaleDateString('pt-BR') : 'N/A',
      'Data de Cadastro': user?.createdAt.toLocaleDateString('pt-BR') || 'N/A',
      'Total de Buscas (30 dias)': item._count.userId
    }
  })

  const result = format === 'csv'
    ? generateCSV(processedData, 'top_buscas_30_dias')
    : generateXLSX(processedData, 'top_buscas_30_dias')

  return { result, recordCount: processedData.length }
}

async function exportAnalytics(format: string) {
  const now = new Date()
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 dias

  // Busca dados de analytics
  const totalUsers = await prisma.user.count()
  
  const usersWithActiveSubscriptions = await prisma.user.count({
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

  const conversionsInPeriod = await prisma.subscription.count({
    where: {
      createdAt: {
        gte: startDate
      },
      status: {
        in: ['active', 'ACTIVE']
      }
    }
  })

  // Dados diários
  const dailyData = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(date.setHours(0, 0, 0, 0))
    const dayEnd = new Date(date.setHours(23, 59, 59, 999))

    const dailyConversions = await prisma.subscription.count({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        },
        status: {
          in: ['active', 'ACTIVE']
        }
      }
    })

    const dailyUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    })

    dailyData.push({
      'Data': dayStart.toLocaleDateString('pt-BR'),
      'Novos Usuários': dailyUsers,
      'Conversões': dailyConversions,
      'Taxa de Conversão (%)': dailyUsers > 0 ? ((dailyConversions / dailyUsers) * 100).toFixed(2) : '0.00'
    })
  }

  const analyticsData = [
    {
      'Métrica': 'Total de Usuários',
      'Valor': totalUsers,
      'Descrição': 'Total de usuários registrados no sistema'
    },
    {
      'Métrica': 'Usuários Premium',
      'Valor': usersWithActiveSubscriptions,
      'Descrição': 'Usuários com assinatura ativa'
    },
    {
      'Métrica': 'Usuários Gratuitos',
      'Valor': totalUsers - usersWithActiveSubscriptions,
      'Descrição': 'Usuários sem assinatura ativa'
    },
    {
      'Métrica': 'Taxa de Conversão Global (%)',
      'Valor': totalUsers > 0 ? ((usersWithActiveSubscriptions / totalUsers) * 100).toFixed(2) : '0.00',
      'Descrição': 'Percentual de usuários que se converteram para premium'
    },
    {
      'Métrica': 'Conversões (30 dias)',
      'Valor': conversionsInPeriod,
      'Descrição': 'Novas conversões nos últimos 30 dias'
    }
  ]

  if (format === 'csv') {
    return generateCSV([...analyticsData, ...dailyData], 'analytics')
  } else {
    return generateXLSX([...analyticsData, ...dailyData], 'analytics')
  }
}

function generateCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) {
    return new NextResponse('Nenhum dado para exportar', { status: 400 })
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escapa valores que contêm vírgulas ou aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  const response = new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`
    }
  })

  return response
}

function generateXLSX(data: Record<string, unknown>[], filename: string) {
  // Para XLSX, vamos retornar JSON por enquanto
  // Em produção, seria necessário instalar uma biblioteca como 'xlsx'
  const response = new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.json"`
    }
  })

  return response
}
