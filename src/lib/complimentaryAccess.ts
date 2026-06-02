import { normalizeLibraryEmail } from '@/lib/library/email'

/** Contas internas / teste com biblioteca + Plus sem assinatura Stripe. */
const COMPLIMENTARY_ACCOUNT_EMAILS = new Set<string>([
  'marianna.yaskara@live.com',
  'marianna.yaskara2020@gmail.com',
  'marianna.yaskara@mediz.com',
  ...(process.env.LIBRARY_FULL_ACCESS_EMAILS?.split(',')
    .map((email) => normalizeLibraryEmail(email))
    .filter(Boolean) ?? []),
  ...(process.env.PREMIUM_FULL_ACCESS_EMAILS?.split(',')
    .map((email) => normalizeLibraryEmail(email))
    .filter(Boolean) ?? [])
])

const COMPLIMENTARY_ACCOUNT_USER_IDS = new Set<string>([
  '19763963-830b-4655-9ba7-0f46b0a007ec',
  'a5cd051e-a50b-442d-b9f1-17e5f635923c',
  ...(process.env.LIBRARY_FULL_ACCESS_USER_IDS?.split(',')
    .map((id) => id.trim())
    .filter(Boolean) ?? []),
  ...(process.env.PREMIUM_FULL_ACCESS_USER_IDS?.split(',')
    .map((id) => id.trim())
    .filter(Boolean) ?? [])
])

function isMariannaYaskaraEmail(email: string): boolean {
  const normalized = normalizeLibraryEmail(email)
  if (COMPLIMENTARY_ACCOUNT_EMAILS.has(normalized)) return true
  const localPart = normalized.split('@')[0] ?? ''
  return (
    localPart === 'marianna.yaskara' || localPart.startsWith('marianna.yaskara')
  )
}

/** Biblioteca completa + meDIZ Plus (sem registro na Stripe). */
export function hasComplimentaryAccess(
  email: string,
  userId?: string
): boolean {
  if (userId && COMPLIMENTARY_ACCOUNT_USER_IDS.has(userId)) return true
  return isMariannaYaskaraEmail(email)
}
