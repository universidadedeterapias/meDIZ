import { hasComplimentaryAccess } from '@/lib/complimentaryAccess'
import { prisma } from '@/lib/prisma'
import { libraryPermissoesFromEntitlements } from '@/lib/purchases/migrate-legacy-permissions'
import { normalizeLibraryEmail } from './email'

export type LibraryPermissoes = {
  audioterapia: boolean
  pdf: boolean
  livro_digital: boolean
}

export type LibraryPermissionRow = {
  email: string
  nome: string | null
  audioterapia: boolean
  pdf: boolean
  livro_digital: boolean
}

const FULL_PERMISSIONS: LibraryPermissoes = {
  audioterapia: true,
  pdf: true,
  livro_digital: true
}

export function hasFullLibraryAccess(
  email: string,
  userId?: string
): boolean {
  return hasComplimentaryAccess(email, userId)
}

/** PDF + livro digital (sem audioterapia) */
export function hasBibliotecaAccess(permissoes: LibraryPermissoes): boolean {
  return permissoes.pdf || permissoes.livro_digital
}

export function hasAudioterapiaAccess(permissoes: LibraryPermissoes): boolean {
  return permissoes.audioterapia
}

/** Qualquer permissão de conteúdo comprado */
export function hasAnyLibraryAccess(permissoes: LibraryPermissoes): boolean {
  return hasBibliotecaAccess(permissoes) || hasAudioterapiaAccess(permissoes)
}

export async function upsertLibraryPermissions(
  email: string,
  nome: string | null | undefined,
  permissoes: LibraryPermissoes
): Promise<LibraryPermissionRow> {
  const normalizedEmail = normalizeLibraryEmail(email)

  const rows = await prisma.$queryRaw<LibraryPermissionRow[]>`
    INSERT INTO library_permissions
      (id, email, nome, audioterapia, pdf, livro_digital, created_at, updated_at)
    VALUES (
      gen_random_uuid()::text,
      ${normalizedEmail},
      ${nome ?? null},
      ${permissoes.audioterapia},
      ${permissoes.pdf},
      ${permissoes.livro_digital},
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      nome = COALESCE(EXCLUDED.nome, library_permissions.nome),
      audioterapia = library_permissions.audioterapia OR EXCLUDED.audioterapia,
      pdf = library_permissions.pdf OR EXCLUDED.pdf,
      livro_digital = library_permissions.livro_digital OR EXCLUDED.livro_digital,
      updated_at = NOW()
    RETURNING
      email,
      nome,
      audioterapia,
      pdf,
      livro_digital
  `

  return rows[0]
}

export type LibraryAuthIdentity = {
  id: string
  email: string
}

export async function getLibraryPermissionsForUser(
  user: LibraryAuthIdentity
): Promise<LibraryPermissoes> {
  if (hasFullLibraryAccess(user.email, user.id)) {
    return { ...FULL_PERMISSIONS }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true }
  })

  if (dbUser?.email) {
    const dbEmail = normalizeLibraryEmail(dbUser.email)
    if (hasFullLibraryAccess(dbEmail, user.id)) {
      return { ...FULL_PERMISSIONS }
    }
    return getLibraryPermissionsByEmail(dbEmail, user.id)
  }

  return getLibraryPermissionsByEmail(user.email, user.id)
}

export async function getLibraryPermissionsByEmail(
  email: string,
  userId?: string
): Promise<LibraryPermissoes> {
  const normalizedEmail = normalizeLibraryEmail(email)

  if (hasFullLibraryAccess(normalizedEmail, userId)) {
    return { ...FULL_PERMISSIONS }
  }

  const row = await prisma.libraryPermission.findUnique({
    where: { email: normalizedEmail },
    select: {
      audioterapia: true,
      pdf: true,
      livroDigital: true
    }
  })

  const fromEntitlements = await libraryPermissoesFromEntitlements(normalizedEmail)

  if (!row) {
    return fromEntitlements
  }

  return {
    audioterapia: row.audioterapia || fromEntitlements.audioterapia,
    pdf: row.pdf || fromEntitlements.pdf,
    livro_digital: row.livroDigital || fromEntitlements.livro_digital
  }
}

export async function assertLibraryContentAccess(
  identity: string | LibraryAuthIdentity,
  content: keyof LibraryPermissoes
): Promise<LibraryPermissoes> {
  const permissoes =
    typeof identity === 'string'
      ? await getLibraryPermissionsByEmail(identity)
      : await getLibraryPermissionsForUser(identity)
  if (!permissoes[content]) {
    throw new LibraryAccessError()
  }
  return permissoes
}

export class LibraryAccessError extends Error {
  readonly code = 'NO_PERMISSION_FOR_THIS_CONTENT'
  constructor() {
    super('NO_PERMISSION_FOR_THIS_CONTENT')
    this.name = 'LibraryAccessError'
  }
}
