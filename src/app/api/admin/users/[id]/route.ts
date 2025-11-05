import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { logUserAction, AuditActions } from '@/lib/auditLogger'

// GET - Buscar usuário específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = resolvedParams.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        fullName: true,
        whatsapp: true,
        createdAt: true,
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

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Determina se é admin
    const isAdmin = user.email.includes('@mediz.com')

    // Determina o plano
    const plan = user.subscriptions.length > 0 ? 'premium' : 'free'

    return NextResponse.json({
      ...user,
      isAdmin,
      plan,
      createdAt: user.createdAt.toISOString()
    })

  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar usuário
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = resolvedParams.id
    const body = await req.json()
    const { name, email, fullName, whatsapp } = body

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se o email já está em uso por outro usuário
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      })

      if (emailExists) {
        return NextResponse.json({ error: 'Email já está em uso' }, { status: 400 })
      }
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(fullName !== undefined && { fullName }),
        ...(whatsapp !== undefined && { whatsapp })
      },
      select: {
        id: true,
        name: true,
        email: true,
        fullName: true,
        whatsapp: true,
        createdAt: true
      }
    })

    // Registrar atualização no audit log
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (admin) {
      await logUserAction(
        admin.id,
        session.user.email,
        AuditActions.USER_UPDATE,
        userId,
        {
          updatedFields: { name, email, fullName, whatsapp },
          previousData: {
            name: existingUser.name,
            email: existingUser.email,
            fullName: existingUser.fullName,
            whatsapp: existingUser.whatsapp
          },
          updatedBy: session.user.email
        },
        req
      )
    }

    return NextResponse.json({
      ...updatedUser,
      createdAt: updatedUser.createdAt.toISOString()
    })

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir usuário
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = resolvedParams.id

    console.log('[DEBUG] Delete User - Tentando excluir usuário:', userId)
    console.log('[DEBUG] Delete User - Admin:', session.user.email)

    // Verificar se o usuário existe
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    if (!userToDelete) {
      console.log('[DEBUG] Delete User - Usuário não encontrado')
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    console.log('[DEBUG] Delete User - Usuário encontrado:', {
      id: userToDelete.id,
      name: userToDelete.name,
      email: userToDelete.email,
      isAdmin: userToDelete.email.includes('@mediz.com')
    })

    // Não permitir auto-exclusão
    if (userToDelete.email === session.user.email) {
      console.log('[DEBUG] Delete User - Tentativa de auto-exclusão bloqueada')
      return NextResponse.json({ 
        error: 'Não é possível excluir sua própria conta' 
      }, { status: 400 })
    }

    // Permitir exclusão de admins (removida a restrição anterior)
    // Apenas verificar se não é auto-exclusão (já verificado acima)
    console.log('[DEBUG] Delete User - Prosseguindo com exclusão')

    // Excluir usuário (cascade delete vai remover dados relacionados)
    await prisma.user.delete({
      where: { id: userId }
    })

    console.log('[DEBUG] Delete User - Usuário excluído com sucesso:', userToDelete.email)

    // Registrar exclusão no audit log
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (admin) {
      await logUserAction(
        admin.id,
        session.user.email,
        AuditActions.USER_DELETE,
        userId,
        {
          deletedUser: {
            name: userToDelete.name,
            email: userToDelete.email
          },
          deletedBy: session.user.email
        },
        req
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    })

  } catch (error) {
    console.error('[DEBUG] Delete User - Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
