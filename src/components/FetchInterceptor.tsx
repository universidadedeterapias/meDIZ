'use client'

import { useEffect } from 'react'
import { installGlobalFetchInterceptor } from '@/lib/fetchClient'

export function FetchInterceptor() {
  useEffect(() => {
    installGlobalFetchInterceptor()
  }, [])

  return null
}
