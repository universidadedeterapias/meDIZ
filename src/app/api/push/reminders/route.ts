import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reminderSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1).max(7), // [0-6] onde 0 = domingo
  active: z.boolean().optional()
})

// GET - Listar lembretes (apenas para admins via /api/admin/push/reminders)
// Esta rota não é mais usada, mantida para compatibilidade
export async function GET() {
  return NextResponse.json(
    { error: 'Use /api/admin/push/reminders para listar lembretes' },
    { status: 404 }
  )
}

// POST - Criar novo lembrete (apenas para admins)
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log('🔔 [API REMINDERS] ========== INÍCIO POST ==========')
  
  try {
    const session = await auth()

    if (!session?.user?.id) {
      console.warn('⚠️ [API REMINDERS] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const isAdmin = session.user.email?.includes('@mediz.com') || false
    console.log('🔔 [API REMINDERS] É admin?', isAdmin)
    // Não logar email por segurança
    console.log('🔔 [API REMINDERS] Usuário autenticado:', session.user.id)

    if (!isAdmin) {
      console.warn('⚠️ [API REMINDERS] Não é admin')
      return NextResponse.json(
        { error: 'Apenas administradores podem criar lembretes' },
        { status: 403 }
      )
    }

    const body = await req.json()
    console.log('🔔 [API REMINDERS] Body recebido:', body)
    
    const { userId, ...reminderData } = body
    console.log('🔔 [API REMINDERS] userId:', userId)
    console.log('🔔 [API REMINDERS] reminderData:', reminderData)

    // userId pode ser null para lembretes globais
    if (userId === undefined) {
      console.warn('⚠️ [API REMINDERS] userId não fornecido')
      return NextResponse.json(
        { error: 'userId é obrigatório (pode ser null para todos os usuários)' },
        { status: 400 }
      )
    }

    console.log('🔔 [API REMINDERS] Validando dados com schema...')
    const validated = reminderSchema.parse(reminderData)
    console.log('✅ [API REMINDERS] Dados validados:', validated)

    console.log('🔔 [API REMINDERS] Criando lembrete no banco...')
    const reminder = await prisma.reminder.create({
      data: {
        userId: userId === '' ? null : userId,
        title: validated.title,
        message: validated.message,
        time: validated.time,
        daysOfWeek: JSON.stringify(validated.daysOfWeek),
        active: validated.active ?? true
      }
    })
    console.log('✅ [API REMINDERS] Lembrete criado:', reminder.id)

    const duration = Date.now() - startTime
    console.log('✅ [API REMINDERS] ========== FIM POST (SUCESSO) ==========')
    console.log('⏱️ [API REMINDERS] Tempo total:', duration, 'ms')

    return NextResponse.json({
      ...reminder,
      daysOfWeek: JSON.parse(reminder.daysOfWeek) as number[]
    }, { status: 201 })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ [API REMINDERS] ========== ERRO NO POST ==========')
    
    if (error instanceof z.ZodError) {
      console.error('❌ [API REMINDERS] Erro de validação Zod:', error.errors)
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('❌ [API REMINDERS] Erro ao criar lembrete:', error)
    if (error instanceof Error) {
      console.error('❌ [API REMINDERS] Mensagem:', error.message)
      console.error('❌ [API REMINDERS] Stack:', error.stack)
    }
    console.error('⏱️ [API REMINDERS] Tempo até erro:', duration, 'ms')
    console.error('❌ [API REMINDERS] ========== FIM POST (ERRO) ==========')
    
    return NextResponse.json(
      { error: 'Erro ao criar lembrete' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar lembrete (apenas para admins)
export async function PUT(req: NextRequest) {
  const startTime = Date.now()
  console.log('🔔 [API REMINDERS] ========== INÍCIO PUT ==========')
  
  try {
    const session = await auth()

    if (!session?.user?.id) {
      console.warn('⚠️ [API REMINDERS] Não autenticado')
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const isAdmin = session.user.email?.includes('@mediz.com') || false
    console.log('🔔 [API REMINDERS] É admin?', isAdmin)

    if (!isAdmin) {
      console.warn('⚠️ [API REMINDERS] Não é admin')
      return NextResponse.json(
        { error: 'Apenas administradores podem atualizar lembretes' },
        { status: 403 }
      )
    }

    const body = await req.json()
    console.log('🔔 [API REMINDERS] Body recebido:', body)
    
    const { id, userId, ...updateData } = body
    console.log('🔔 [API REMINDERS] ID:', id)
    console.log('🔔 [API REMINDERS] userId:', userId)
    console.log('🔔 [API REMINDERS] updateData:', updateData)

    if (!id) {
      console.warn('⚠️ [API REMINDERS] ID não fornecido')
      return NextResponse.json(
        { error: 'ID do lembrete não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se o lembrete existe
    console.log('🔔 [API REMINDERS] Buscando lembrete existente...')
    const existing = await prisma.reminder.findUnique({
      where: { id }
    })

    if (!existing) {
      console.warn('⚠️ [API REMINDERS] Lembrete não encontrado:', id)
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      )
    }
    console.log('✅ [API REMINDERS] Lembrete encontrado')

    // Preparar dados para atualização
    const updatePayload: Record<string, unknown> = {}

    // Validar e adicionar campos se fornecidos
    if (updateData.time || updateData.daysOfWeek || updateData.title || updateData.message || updateData.active !== undefined) {
      console.log('🔔 [API REMINDERS] Validando dados...')
      const validated = reminderSchema.partial().parse(updateData)
      console.log('✅ [API REMINDERS] Dados validados:', validated)

      if (validated.title) updatePayload.title = validated.title
      if (validated.message) updatePayload.message = validated.message
      if (validated.time) updatePayload.time = validated.time
      if (validated.active !== undefined) updatePayload.active = validated.active
      
      // Converter daysOfWeek para JSON se fornecido
      if (validated.daysOfWeek) {
        updatePayload.daysOfWeek = JSON.stringify(validated.daysOfWeek)
        console.log('🔔 [API REMINDERS] daysOfWeek convertido para JSON')
      }
    }

    // Atualizar userId se fornecido (pode ser null para lembretes globais)
    if (userId !== undefined) {
      updatePayload.userId = userId === '' || userId === null ? null : userId
      console.log('🔔 [API REMINDERS] userId atualizado:', updatePayload.userId)
    }

    console.log('🔔 [API REMINDERS] Payload final:', updatePayload)
    console.log('🔔 [API REMINDERS] Atualizando no banco...')

    const updated = await prisma.reminder.update({
      where: { id },
      data: updatePayload
    })

    console.log('✅ [API REMINDERS] Lembrete atualizado:', updated.id)

    const duration = Date.now() - startTime
    console.log('✅ [API REMINDERS] ========== FIM PUT (SUCESSO) ==========')
    console.log('⏱️ [API REMINDERS] Tempo total:', duration, 'ms')

    return NextResponse.json({
      ...updated,
      daysOfWeek: JSON.parse(updated.daysOfWeek) as number[]
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ [API REMINDERS] ========== ERRO NO PUT ==========')
    
    if (error instanceof z.ZodError) {
      console.error('❌ [API REMINDERS] Erro de validação Zod:', error.errors)
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('❌ [API REMINDERS] Erro ao atualizar lembrete:', error)
    if (error instanceof Error) {
      console.error('❌ [API REMINDERS] Mensagem:', error.message)
      console.error('❌ [API REMINDERS] Stack:', error.stack)
    }
    console.error('⏱️ [API REMINDERS] Tempo até erro:', duration, 'ms')
    console.error('❌ [API REMINDERS] ========== FIM PUT (ERRO) ==========')
    
    return NextResponse.json(
      { error: 'Erro ao atualizar lembrete' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar lembrete (apenas para admins)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const isAdmin = session.user.email?.includes('@mediz.com') || false

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas administradores podem deletar lembretes' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID do lembrete não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se o lembrete existe
    const existing = await prisma.reminder.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      )
    }

    await prisma.reminder.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Lembrete removido com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar lembrete:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar lembrete' },
      { status: 500 }
    )
  }
}

