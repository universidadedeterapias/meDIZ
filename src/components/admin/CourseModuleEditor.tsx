'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Headphones,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Video
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { catalogLocaleLabel } from '@/lib/catalog/locale'
import { localeDisplayLabel } from '@/lib/catalog/media-items'
import type { CourseModuleInput } from '@/lib/catalog/course-modules'
import type { CourseMediaKind } from '@/lib/catalog/types'
import { uploadArquivoR2 } from '@/lib/upload-r2'

type CourseModuleEditorProps = {
  modules: CourseModuleInput[]
  onChange: (modules: CourseModuleInput[]) => void
}

const KIND_LABEL: Record<CourseMediaKind, string> = {
  video: 'Vídeo',
  pdf: 'PDF',
  audio: 'Áudio'
}

const KIND_ACCEPT: Record<CourseMediaKind, string> = {
  video: 'video/mp4,.mp4',
  pdf: 'application/pdf,.pdf',
  audio: 'audio/mpeg,audio/mp3,.mp3'
}

function emptyModule(sortOrder: number): CourseModuleInput {
  return {
    title: `Módulo ${sortOrder + 1}`,
    sortOrder,
    media: []
  }
}

function titleFromFileName(fileName: string, kind: CourseMediaKind): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim()
  return base || KIND_LABEL[kind]
}

export function CourseModuleEditor({ modules, onChange }: CourseModuleEditorProps) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const coverRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [uploadLocale, setUploadLocale] = useState<'pt' | 'en' | 'es'>('pt')
  const [uploading, setUploading] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const updateModule = (index: number, patch: Partial<CourseModuleInput>) => {
    onChange(
      modules.map((mod, i) => (i === index ? { ...mod, ...patch } : mod))
    )
  }

  const removeModule = (index: number) => {
    onChange(
      modules
        .filter((_, i) => i !== index)
        .map((mod, i) => ({ ...mod, sortOrder: i }))
    )
  }

  const moveModule = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= modules.length) return
    const next = [...modules]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next.map((mod, i) => ({ ...mod, sortOrder: i })))
  }

  const updateMedia = (
    moduleIndex: number,
    mediaIndex: number,
    patch: Partial<CourseModuleInput['media'][number]>
  ) => {
    const mod = modules[moduleIndex]
    updateModule(moduleIndex, {
      media: mod.media.map((item, i) =>
        i === mediaIndex ? { ...item, ...patch } : item
      )
    })
  }

  const moveMedia = (
    moduleIndex: number,
    mediaIndex: number,
    direction: -1 | 1
  ) => {
    const mod = modules[moduleIndex]
    const target = mediaIndex + direction
    if (target < 0 || target >= mod.media.length) return
    const next = [...mod.media]
    const [item] = next.splice(mediaIndex, 1)
    next.splice(target, 0, item)
    updateModule(moduleIndex, {
      media: next.map((m, i) => ({ ...m, sortOrder: i }))
    })
  }

  const handleMediaUpload = async (
    moduleIndex: number,
    kind: CourseMediaKind,
    file: File
  ) => {
    const key = `${moduleIndex}-${kind}`
    setUploading(key)
    setProgress(0)
    try {
      const { url } = await uploadArquivoR2(file, setProgress)
      const mod = modules[moduleIndex]
      const title = `${titleFromFileName(file.name, kind)} (${catalogLocaleLabel(uploadLocale)})`
      updateModule(moduleIndex, {
        media: [
          ...mod.media,
          {
            kind,
            title,
            mediaFileName: url,
            locale: uploadLocale,
            sortOrder: mod.media.length
          }
        ]
      })
    } finally {
      setUploading(null)
      setProgress(0)
    }
  }

  const handleCoverUpload = async (moduleIndex: number, file: File) => {
    setUploading(`cover-${moduleIndex}`)
    setProgress(0)
    try {
      const { url } = await uploadArquivoR2(file, setProgress)
      updateModule(moduleIndex, { coverImageUrl: url })
    } finally {
      setUploading(null)
      setProgress(0)
    }
  }

  const removeMedia = (moduleIndex: number, mediaIndex: number) => {
    const mod = modules[moduleIndex]
    updateModule(moduleIndex, {
      media: mod.media
        .filter((_, i) => i !== mediaIndex)
        .map((m, i) => ({ ...m, sortOrder: i }))
    })
  }

  const mediaByKind = (
    mod: CourseModuleInput,
    kind: CourseMediaKind
  ): Array<{ item: CourseModuleInput['media'][number]; index: number }> => {
    return mod.media
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.kind === kind)
      .sort((a, b) => a.item.sortOrder - b.item.sortOrder)
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Label className="text-base">Módulos e aulas</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada módulo pode ter <strong>vários</strong> vídeos, PDFs e áudios.
            A compra e o ID Hotmart/Stone são do <strong>curso inteiro</strong> —
            configure na seção &quot;Venda e liberação do curso&quot; acima.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => onChange([...modules, emptyModule(modules.length)])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar módulo
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Idioma padrão do próximo upload</Label>
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

      {uploading && (
        <p className="text-xs text-muted-foreground">Enviando… {progress}%</p>
      )}

      {modules.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum módulo. Clique em &quot;Adicionar módulo&quot; para começar.
        </p>
      )}

      {modules.map((mod, moduleIndex) => (
        <div
          key={mod.id ?? `mod-${moduleIndex}`}
          className="space-y-3 rounded-md border bg-background/80 p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-medium">Módulo {moduleIndex + 1}</p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={moduleIndex === 0}
                onClick={() => moveModule(moduleIndex, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={moduleIndex === modules.length - 1}
                onClick={() => moveModule(moduleIndex, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600"
                onClick={() => removeModule(moduleIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Título do módulo</Label>
              <Input
                value={mod.title}
                onChange={(e) =>
                  updateModule(moduleIndex, { title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Capa do módulo (opcional)</Label>
              <div className="flex items-center gap-2">
                {mod.coverImageUrl && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
                    <Image
                      src={mod.coverImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <input
                  ref={(el) => {
                    coverRefs.current[moduleIndex] = el
                  }}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={!!uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleCoverUpload(moduleIndex, file)
                    e.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!!uploading}
                  onClick={() => coverRefs.current[moduleIndex]?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar capa
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              rows={2}
              value={mod.description ?? ''}
              onChange={(e) =>
                updateModule(moduleIndex, {
                  description: e.target.value || null
                })
              }
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['video', 'pdf', 'audio'] as const).map((kind) => {
              const inputKey = `${moduleIndex}-${kind}`
              const Icon =
                kind === 'video' ? Video : kind === 'pdf' ? FileText : Headphones
              return (
                <div key={kind}>
                  <input
                    ref={(el) => {
                      fileRefs.current[inputKey] = el
                    }}
                    type="file"
                    accept={KIND_ACCEPT[kind]}
                    className="sr-only"
                    disabled={!!uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleMediaUpload(moduleIndex, kind, file)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!!uploading}
                    onClick={() => fileRefs.current[inputKey]?.click()}
                  >
                    {uploading === inputKey ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="mr-2 h-4 w-4" />
                    )}
                    Adicionar {KIND_LABEL[kind].toLowerCase()}
                  </Button>
                </div>
              )
            })}
          </div>

          {(['video', 'pdf', 'audio'] as const).map((kind) => {
            const items = mediaByKind(mod, kind)
            if (items.length === 0) return null
            return (
              <div key={kind} className="space-y-2 rounded-md border p-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {KIND_LABEL[kind]}s ({items.length})
                </p>
                <ul className="space-y-2">
                  {items.map(({ item, index: mediaIndex }, pos, arr) => (
                    <li
                      key={item.id ?? `${kind}-${mediaIndex}`}
                      className="flex flex-col gap-2 rounded border bg-muted/30 p-2 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <Input
                          className="h-8 text-xs"
                          value={item.title}
                          placeholder="Título exibido ao aluno"
                          onChange={(e) =>
                            updateMedia(moduleIndex, mediaIndex, {
                              title: e.target.value
                            })
                          }
                        />
                        <p className="truncate text-[11px] text-muted-foreground">
                          {localeDisplayLabel(item.locale ?? undefined)} ·{' '}
                          {item.mediaFileName}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1 self-end sm:self-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={pos === 0}
                          onClick={() => moveMedia(moduleIndex, mediaIndex, -1)}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={pos === arr.length - 1}
                          onClick={() => moveMedia(moduleIndex, mediaIndex, 1)}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600"
                          onClick={() => removeMedia(moduleIndex, mediaIndex)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
