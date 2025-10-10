// lib/openai.ts
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
  const res = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    ...options,
    headers: {
      ...OPENAI_HEADERS,
      ...(options.headers || {})
    }
  })

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
}
