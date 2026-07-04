import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params

  const profile = await prisma.userProfile.findUnique({
    where: { userId: id },
    select: {
      discoveryCompleted: true,
      consentedAt: true,
      usageContext: true,
      preferredStyle: true,
      core: true,
      dynamics: true,
      predictive: true,
      compactProfile: true,
      profileVersion: true,
      updatedAt: true
    }
  })

  if (!profile) {
    return NextResponse.json(
      { exists: false },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    {
      exists: true,
      ...profile,
      consentedAt: profile.consentedAt?.toISOString() ?? null,
      updatedAt: profile.updatedAt.toISOString(),
      extracted: Boolean(profile.compactProfile)
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
