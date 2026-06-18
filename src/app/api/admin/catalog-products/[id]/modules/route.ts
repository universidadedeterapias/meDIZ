import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { courseModulesBodySchema } from '@/lib/catalog/schemas'
import { formatCatalogDbError } from '@/lib/catalog/prisma-errors'
import {
  ensureCourseModulesMigrated,
  replaceCourseModules,
  type CourseModuleInput
} from '@/lib/catalog/course-modules'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params

  const product = await prisma.catalogProduct.findUnique({ where: { id } })
  if (!product) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  }
  if (product.permissionKey !== 'VIDEO') {
    return NextResponse.json(
      { error: 'Módulos disponíveis apenas para cursos (vídeo)' },
      { status: 400 }
    )
  }

  const modules = await ensureCourseModulesMigrated(product)
  return NextResponse.json({ modules })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params

  const product = await prisma.catalogProduct.findUnique({ where: { id } })
  if (!product) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  }
  if (product.permissionKey !== 'VIDEO') {
    return NextResponse.json(
      { error: 'Módulos disponíveis apenas para cursos (vídeo)' },
      { status: 400 }
    )
  }

  try {
    const json = await request.json()
    const parsed = courseModulesBodySchema.safeParse(json)
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors
      const summary = Object.entries(fields)
        .map(([k, v]) => `${k}: ${v?.join(', ')}`)
        .join(' · ')
      return NextResponse.json(
        {
          error: summary || 'Dados dos módulos inválidos',
          fieldErrors: fields
        },
        { status: 400 }
      )
    }

    const modules = await replaceCourseModules(
      id,
      parsed.data.modules as CourseModuleInput[]
    )

    const primaryVideo = modules
      .flatMap((m) => m.media)
      .find((m) => m.kind === 'video')?.mediaFileName

    if (primaryVideo) {
      await prisma.catalogProduct.update({
        where: { id },
        data: { mediaFileName: primaryVideo }
      })
    }

    return NextResponse.json({ modules })
  } catch (error) {
    console.error('[admin/catalog-products/modules] PUT:', error)
    return NextResponse.json(
      { error: formatCatalogDbError(error) },
      { status: 500 }
    )
  }
}
