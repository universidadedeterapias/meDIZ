'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export function useSessionSync() {
  const { data: session, status, update } = useSession()

  useEffect(() => {
    // Força atualização da sessão quando a página é focada
    const handleFocus = () => {
      if (status === 'authenticated') {
        update()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [status, update])

  return { session, status, update }
}

