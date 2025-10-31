// lib/openai.ts
/* global AbortController */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const OPENAI_HEADERS = {
  Authorization: `Bearer ${OPENAI_API_KEY}`,
  'Content-Type': 'application/json',
  'OpenAI-Beta': 'assistants=v2' //
}

export async function openaiRequest<T>(
  endpoint: string,
  options: RequestInit
): Promise<T> {
  // Timeout de 50 segundos por requisição individual (margem para serialização/logs)
  // Isso evita que requisições travem indefinidamente
  const timeoutMs = 50000 // 50 segundos
  // AbortController está disponível no Node.js 15+ e no browser
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const res = await fetch(`https://api.openai.com/v1/${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...OPENAI_HEADERS,
        ...(options.headers || {})
      }
    })
    
    clearTimeout(timeoutId)

    if (!res.ok) {
      let errorMessage = `OpenAI API error: ${res.statusText}`
      
      try {
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const err = await res.json()
          console.error('OpenAI API error details:', err)
          errorMessage = err.error?.message || errorMessage
        } else {
          // Resposta não é JSON (provavelmente HTML de erro)
          const text = await res.text()
          console.error('OpenAI API non-JSON error:', text.substring(0, 200))
          errorMessage = `OpenAI API error: ${res.status} - ${res.statusText}`
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI API response:', parseError)
      }
      
      throw new Error(errorMessage)
    }

    return res.json()
  } catch (error) {
    clearTimeout(timeoutId)
    
    // Verificar se foi timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout: Requisição para OpenAI demorou mais que ${timeoutMs / 1000} segundos`)
    }
    
    // Re-lançar outros erros
    throw error
  }
}
