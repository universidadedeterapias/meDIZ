import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import SimuladorChatPageClient from './SimuladorChatPageClient'

export default function SimuladorChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      }
    >
      <SimuladorChatPageClient />
    </Suspense>
  )
}
