import { getCurrentLanguage } from '@/i18n/server'
import { requireUser } from '@/lib/requireAuth'
import { serveLibraryContent } from '@/lib/library/serveContent'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireUser({ pathname: '/api/biblioteca/livro-digital' })
  if (auth.ok === false) return auth.response
  const language = await getCurrentLanguage()
  return serveLibraryContent(auth.user.email, 'livro_digital', language)
}
