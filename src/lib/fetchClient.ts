'use client'

const PASSWORD_RESET_ERROR = 'PASSWORD_RESET_REQUIRED'

type FetchInput = string | URL | Request
type FetchInit = RequestInit

function shouldInterceptPasswordReset(url: string, init?: FetchInit): boolean {
  if (typeof window === 'undefined') return true
  if (window.location.pathname.startsWith('/trocar-senha')) return false

  const method = (init?.method ?? 'GET').toUpperCase()
  if (method === 'GET' && url.includes('/api/auth/change-password')) {
    return false
  }

  return true
}

async function handlePasswordResetResponse(response: Response): Promise<Response> {
  if (response.status !== 403) return response

  try {
    const clone = response.clone()
    const data = await clone.json()
    if (data?.error === PASSWORD_RESET_ERROR) {
      window.location.href = '/trocar-senha'
    }
  } catch {
    // ignore parse errors
  }

  return response
}

export async function apiFetch(
  input: FetchInput,
  init?: FetchInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString()
  const response = await fetch(input, {
    ...init,
    cache: init?.cache ?? 'no-store'
  })

  if (shouldInterceptPasswordReset(url, init)) {
    return handlePasswordResetResponse(response)
  }

  return response
}

export function installGlobalFetchInterceptor(): void {
  if (typeof window === 'undefined') return
  const w = window as typeof window & { __medizFetchPatched?: boolean }
  if (w.__medizFetchPatched) return

  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input: FetchInput, init?: FetchInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const response = await originalFetch(input, init)

    if (shouldInterceptPasswordReset(url, init)) {
      return handlePasswordResetResponse(response)
    }

    return response
  }

  w.__medizFetchPatched = true
}
