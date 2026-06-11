import { R2_MAX_BYTES, resolveR2ContentType } from '@/lib/catalog/r2-media-policy'

export type UploadR2Result = { url: string; key: string }

export function uploadArquivoR2(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadR2Result> {
  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        if (file.size <= 0) {
          reject(new Error('Arquivo vazio'))
          return
        }
        if (file.size > R2_MAX_BYTES) {
          reject(new Error('Arquivo muito grande (máximo 200 MB)'))
          return
        }

        const contentType = resolveR2ContentType(file.name, file.type)

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
              'Erro de rede no upload para o R2. Confira a política de CORS do bucket (PUT liberado para http://localhost:3000 e seu domínio de produção).'
            )
          )
        xhr.send(file)
      } catch (e) {
        reject(e)
      }
    })()
  })
}
