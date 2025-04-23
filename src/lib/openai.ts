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
    throw new Error(`OpenAI API error: ${res.statusText}`)
  }

  return res.json()
}
