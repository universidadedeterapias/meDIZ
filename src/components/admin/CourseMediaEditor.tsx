'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Trash2, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { catalogLocaleLabel } from '@/lib/catalog/locale'
import { localeDisplayLabel } from '@/lib/catalog/media-items'
import type { CatalogMediaItem, CourseMediaKind } from '@/lib/catalog/types'
import { uploadArquivoR2 } from '@/lib/upload-r2'

type CourseMediaEditorProps = {
  mediaItems: CatalogMediaItem[]
  onChange: (items: CatalogMediaItem[]) => void
  onPrimaryVideoChange: (url: string) => void
}

export function CourseMediaEditor({
  mediaItems,
  onChange,
  onPrimaryVideoChange
}: CourseMediaEditorProps) {
  const videoInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [uploadLocale, setUploadLocale] = useState<'pt' | 'en' | 'es'>('pt')
  const [uploading, setUploading] = useState<CourseMediaKind | null>(null)
  const [progress, setProgress] = useState(0)

  const handleUpload = async (file: File, kind: CourseMediaKind) => {
    setUploading(kind)
    setProgress(0)
    try {
      const { url } = await uploadArquivoR2(file, setProgress)
      const title =
        kind === 'video'
          ? `Vídeo (${catalogLocaleLabel(uploadLocale)})`
          : `Material PDF (${catalogLocaleLabel(uploadLocale)})`

      const next: CatalogMediaItem = {
        id: `${kind}-${uploadLocale}-${Date.now()}`,
        title,
        mediaFileName: url,
        locale: uploadLocale,
        sortOrder: mediaItems.length,
        kind
      }

      const filtered = mediaItems.filter(
        (item) => !(item.kind === kind && item.locale === uploadLocale)
      )
      onChange([...filtered, next])

      if (kind === 'video') {
        const hasPrimary = mediaItems.some((i) => i.kind === 'video')
        if (!hasPrimary) onPrimaryVideoChange(url)
      }
    } finally {
      setUploading(null)
      setProgress(0)
    }
  }

  const removeItem = (id: string) => {
    onChange(mediaItems.filter((item) => item.id !== id))
  }

  const sorted = [...mediaItems].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/30 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div>
        <Label>Conteúdo do curso (vídeo + PDF)</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie um vídeo e um PDF por idioma. O app escolhe o arquivo conforme o
          idioma do usuário. O ID Stone (abaixo) libera este curso via webhook.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Idioma do upload</Label>
        <Select
          value={uploadLocale}
          onValueChange={(v) => setUploadLocale(v as 'pt' | 'en' | 'es')}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt">Português</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,.mp4"
          className="sr-only"
          disabled={!!uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUpload(file, 'video')
            e.target.value = ''
          }}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={!!uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUpload(file, 'pdf')
            e.target.value = ''
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!!uploading}
          onClick={() => videoInputRef.current?.click()}
        >
          {uploading === 'video' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Video className="mr-2 h-4 w-4" />
          )}
          Enviar vídeo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!!uploading}
          onClick={() => pdfInputRef.current?.click()}
        >
          {uploading === 'pdf' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Enviar PDF
        </Button>
      </div>

      {uploading && (
        <p className="text-xs text-muted-foreground">Enviando… {progress}%</p>
      )}

      {sorted.length > 0 && (
        <ul className="space-y-2">
          {sorted.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-md border bg-background/80 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {item.kind === 'pdf' ? 'PDF' : 'Vídeo'} ·{' '}
                  {localeDisplayLabel(item.locale)}
                </p>
                <p className="truncate text-muted-foreground">
                  {item.mediaFileName}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-red-600"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
