import {
  R2_MAX_BYTES,
  R2_PROXY_MAX_BYTES,
  resolveR2ContentType
} from '@/lib/catalog/r2-media-policy'

export type UploadR2Result = { url: string; key: string }

async function uploadViaProxy(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadR2Result> {
  onProgress?.(10)
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/uploads/proxy', {
    method: 'POST',
    credentials: 'include',
    body: form
  })

  const data = (await res.json().catch(() => null)) as {
    error?: string
    publicUrl?: string
    key?: string
  } | null

  if (!res.ok) {
    throw new Error(data?.error || 'Falha no upload via servidor')
  }
  if (!data?.publicUrl || !data.key) {
    throw new Error('Resposta inválida do upload via servidor')
  }

  onProgress?.(100)
  return { url: data.publicUrl, key: data.key }
}

function uploadViaPresignedPut(
  file: File,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<UploadR2Result> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const res = await fetch('/api/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          contentType,
          size: file.size
        })
      })

      const data = (await res.json().catch(() => null)) as {
        error?: string
        uploadUrl?: string
        publicUrl?: string
        key?: string
      } | null

      if (!res.ok) {
        reject(new Error(data?.error || 'Falha ao gerar URL de upload'))
        return
      }

      if (!data?.uploadUrl || !data.publicUrl || !data.key) {
        reject(new Error('Resposta inválida do servidor de upload'))
        return
      }

      const xhr = new XMLHttpRequest()
      xhr.open('PUT', data.uploadUrl)
      xhr.setRequestHeader('Content-Type', contentType)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: data.publicUrl!, key: data.key! })
          return
        }
        reject(new Error(`Upload falhou (HTTP ${xhr.status})`))
      }
      xhr.onerror = () =>
        reject(
          new Error(
            'R2_CORS_OR_NETWORK'
          )
        )
      xhr.send(file)
    })().catch(reject)
  })
}

export function uploadArquivoR2(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadR2Result> {
  if (file.size <= 0) {
    return Promise.reject(new Error('Arquivo vazio'))
  }
  if (file.size > R2_MAX_BYTES) {
    return Promise.reject(new Error('Arquivo muito grande (máximo 200 MB)'))
  }

  const contentType = resolveR2ContentType(file.name, file.type)

  if (file.size <= R2_PROXY_MAX_BYTES) {
    return uploadViaPresignedPut(file, contentType, onProgress).catch(
      async (error) => {
        const message = error instanceof Error ? error.message : ''
        if (message === 'R2_CORS_OR_NETWORK') {
          return uploadViaProxy(file, onProgress)
        }
        throw error
      }
    )
  }

  return uploadViaPresignedPut(file, contentType, onProgress).catch((error) => {
    const message = error instanceof Error ? error.message : ''
    if (message === 'R2_CORS_OR_NETWORK') {
      throw new Error(
        'Erro de rede no upload para o R2 (vídeo grande). Configure CORS no bucket Cloudflare R2: permita PUT de http://localhost:3000 e https://mediz.app'
      )
    }
    throw error
  })
}
