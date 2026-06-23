'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { CatalogProductDto } from '@/lib/catalog/types'
import { catalogLocaleLabel } from '@/lib/catalog/locale'
import { stripAnsi } from '@/lib/catalog/prisma-errors'
import { uploadArquivoR2 } from '@/lib/upload-r2'
import { cn } from '@/lib/utils'
import { CourseModuleEditor } from '@/components/admin/CourseModuleEditor'
import type { CourseModuleInput } from '@/lib/catalog/course-modules'
import type { CatalogMediaItem } from '@/lib/catalog/types'

type FormState = {
  id: string | null
  section: 'BIBLIOTECA' | 'AUDIOTERAPIA'
  title: string
  description: string
  tagLabel: string
  coverImageUrl: string
  purchaseUrl: string
  permissionKey: 'LIVRO_DIGITAL' | 'PDF' | 'VIDEO' | 'AUDIOTERAPIA'
  locale: '' | 'pt' | 'en' | 'es'
  pdfIndex: string
  mediaFileName: string
  mediaItems: CatalogMediaItem[]
  courseModules: CourseModuleInput[]
  hotmartProductId: string
  extraHotmartProductIdsText: string
  stoneProductId: string
  paymentProvider: 'HOTMART' | 'STONE' | 'FREE'
  grantsProductIds: string[]
  unlockedLabel: string
  freeAccess: boolean
  sortOrder: string
  active: boolean
}

const emptyForm = (): FormState => ({
  id: null,
  section: 'BIBLIOTECA',
  title: '',
  description: '',
  tagLabel: '',
  coverImageUrl: '',
  purchaseUrl: '',
  permissionKey: 'PDF',
  locale: '',
  pdfIndex: '0',
  mediaFileName: '',
  mediaItems: [],
  courseModules: [],
  hotmartProductId: '',
  extraHotmartProductIdsText: '',
  stoneProductId: '',
  paymentProvider: 'HOTMART',
  grantsProductIds: [],
  unlockedLabel: '',
  freeAccess: false,
  sortOrder: '0',
  active: true
})

function productToForm(p: CatalogProductDto): FormState {
  return {
    id: p.id,
    section: p.section,
    title: p.title,
    description: p.description ?? '',
    tagLabel: p.tagLabel ?? '',
    coverImageUrl: p.coverImageUrl ?? '',
    purchaseUrl: p.purchaseUrl,
    permissionKey: p.permissionKey,
    locale: (p.locale as FormState['locale']) ?? '',
    pdfIndex: String(p.pdfIndex),
    mediaFileName: p.mediaFileName ?? '',
    mediaItems: p.mediaItems ?? [],
    courseModules: [],
    hotmartProductId: p.hotmartProductId ?? '',
    extraHotmartProductIdsText: (p.extraHotmartProductIds ?? []).join(', '),
    stoneProductId: p.stoneProductId ?? '',
    paymentProvider: p.paymentProvider ?? 'HOTMART',
    grantsProductIds: p.grantsProductIds ?? [],
    unlockedLabel: p.unlockedLabel ?? '',
    freeAccess: p.freeAccess,
    sortOrder: String(p.sortOrder),
    active: p.active
  }
}

function emptyCourseModule(sortOrder: number): CourseModuleInput {
  return { title: `Módulo ${sortOrder + 1}`, sortOrder, media: [] }
}

type AccessMode = 'FREE' | 'HOTMART' | 'STONE'

function accessModeFromForm(form: Pick<FormState, 'freeAccess' | 'paymentProvider'>): AccessMode {
  if (form.freeAccess) return 'FREE'
  return form.paymentProvider === 'STONE' ? 'STONE' : 'HOTMART'
}

function accessModeLabel(mode: AccessMode): string {
  switch (mode) {
    case 'FREE':
      return 'Gratuito'
    case 'HOTMART':
      return 'Hotmart (webhook / bônus)'
    case 'STONE':
      return 'Stone (webhook)'
  }
}

function accessModeHelperText(
  mode: AccessMode,
  permissionKey: FormState['permissionKey']
): string {
  if (mode === 'FREE') {
    return 'Qualquer usuário logado pode abrir o curso inteiro, sem liberação no banco.'
  }
  if (mode === 'HOTMART') {
    return permissionKey === 'VIDEO'
      ? 'Um único ID Hotmart libera o curso completo (todos os módulos). Bônus liberam outros produtos na mesma compra.'
      : 'Liberação via webhook Hotmart ou bônus de outro produto do catálogo.'
  }
  return permissionKey === 'VIDEO'
    ? 'Um único ID Stone libera o curso completo (todos os módulos) via webhook.'
    : 'Liberação via webhook Stone ao confirmar o pagamento.'
}

function AdminFormSection({
  title,
  description,
  children,
  className
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-4 rounded-lg border p-4', className)}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

async function readJsonResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text()
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export default function AdminCatalogProductsPage() {
  const [products, setProducts] = useState<CatalogProductDto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showError = (message: string) => setError(stripAnsi(message))
  const [filterSection, setFilterSection] = useState<
    'ALL' | 'BIBLIOTECA' | 'AUDIOTERAPIA' | 'CURSOS'
  >('ALL')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>([])
  const [importingMedia, setImportingMedia] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [uploadingPackage, setUploadingPackage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const packageInputRef = useRef<HTMLInputElement>(null)

  const loadMediaFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/catalog-products/import-media', {
        credentials: 'include'
      })
      if (!res.ok) return
      const data = await readJsonResponse<{ files?: string[] }>(res)
      setMediaFiles(data?.files ?? [])
    } catch {
      // ignore
    }
  }, [])

  const handleImportMedia = async () => {
    setImportingMedia(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/catalog-products/import-media', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await readJsonResponse<{
        error?: string
        created?: number
        assigned?: number
      }>(res)
      if (!res.ok) {
        throw new Error(data?.error || 'Importação falhou')
      }
      if (!data) {
        throw new Error('Resposta inválida do servidor')
      }
      const parts: string[] = []
      if (data.created) parts.push(`${data.created} produto(s) criado(s)`)
      if (data.assigned) parts.push(`${data.assigned} vínculo(s) atualizado(s)`)
      if (parts.length === 0) {
        parts.push('Todos os arquivos já estão vinculados a produtos')
      }
      setError(null)
      alert(parts.join(' · '))
      await load()
      await loadMediaFiles()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao importar arquivos')
    } finally {
      setImportingMedia(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/catalog-products', {
        cache: 'no-store',
        credentials: 'include'
      })
      const data = await readJsonResponse<{
        products?: CatalogProductDto[]
        error?: string
      }>(res)

      if (!res.ok) {
        throw new Error(
          data?.error ||
            (res.status === 401 || res.status === 403
              ? 'Sessão admin expirada. Entre em /admin-login'
              : 'Falha ao carregar produtos')
        )
      }
      if (!data) {
        throw new Error('Resposta vazia do servidor. Reinicie npm run dev.')
      }

      setProducts(data.products ?? [])
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    loadMediaFiles()
  }, [load, loadMediaFiles])

  const filtered = products.filter((p) => {
    if (filterSection === 'ALL') return true
    if (filterSection === 'CURSOS') return p.permissionKey === 'VIDEO'
    if (filterSection === 'BIBLIOTECA') {
      return p.section === 'BIBLIOTECA' && p.permissionKey !== 'VIDEO'
    }
    return p.section === filterSection
  })

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)
    try {
      const { url } = await uploadArquivoR2(file, setUploadProgress)
      setForm((f) => ({ ...f, coverImageUrl: url }))
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro no upload')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleUploadAudioterapiaPackage = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    if (!form.title.trim()) {
      showError('Informe o título da audioterapia antes de enviar os áudios')
      return
    }

    setUploadingPackage(true)
    setUploadProgress(0)
    setError(null)
    try {
      const files = Array.from(fileList)
      const tracks: { url: string; originalName: string }[] = []

      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        const { url } = await uploadArquivoR2(file, (pct) => {
          const overall = Math.round(((index + pct / 100) / files.length) * 100)
          setUploadProgress(overall)
        })
        tracks.push({ url, originalName: file.name })
      }

      const res = await fetch(
        '/api/admin/catalog-products/upload-audioterapia-package',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: form.title.trim(),
            productId: form.id,
            description: form.description.trim() || null,
            purchaseUrl: form.purchaseUrl.trim() || undefined,
            replaceExisting: true,
            locale: form.locale || null,
            tracks
          })
        }
      )
      const data = await readJsonResponse<{
        error?: string
        productId?: string
        tracks?: number
        folderName?: string
      }>(res)
      if (!res.ok) throw new Error(data?.error || 'Upload da pasta falhou')

      alert(
        `Pasta salva (${data?.folderName ?? form.title}): ${data?.tracks ?? 0} áudio(s)`
      )
      await load()
      await loadMediaFiles()
      if (data?.productId) {
        const listRes = await fetch('/api/admin/catalog-products', {
          credentials: 'include'
        })
        const listData = await readJsonResponse<{
          products?: CatalogProductDto[]
        }>(listRes)
        const updated = listData?.products?.find((p) => p.id === data.productId)
        if (updated) {
          setForm(productToForm(updated))
          setEditing(true)
        }
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao enviar pasta de áudios')
    } finally {
      setUploadingPackage(false)
      setUploadProgress(0)
    }
  }

  const handleUploadMedia = async (file: File) => {
    setUploadingMedia(true)
    setUploadProgress(0)
    setError(null)
    try {
      const { url } = await uploadArquivoR2(file, setUploadProgress)
      setForm((f) => ({ ...f, mediaFileName: url }))
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro no upload do arquivo')
    } finally {
      setUploadingMedia(false)
      setUploadProgress(0)
    }
  }

  const showProductMedia =
    form.section === 'AUDIOTERAPIA' ||
    form.permissionKey === 'PDF' ||
    form.permissionKey === 'LIVRO_DIGITAL' ||
    form.permissionKey === 'VIDEO'

  const mediaAccept =
    form.section === 'AUDIOTERAPIA'
      ? 'audio/mpeg,audio/mp3,video/mp4,.mp3,.mp4'
      : form.permissionKey === 'VIDEO'
        ? 'video/mp4,.mp4'
        : 'application/pdf,.pdf'

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const primaryVideo =
        form.permissionKey === 'VIDEO'
          ? form.courseModules
              .flatMap((m) => m.media)
              .find((m) => m.kind === 'video')?.mediaFileName
          : null

      const body = {
        section: form.section,
        title: form.title,
        description: form.description || null,
        tagLabel: form.tagLabel || null,
        coverImageUrl: form.coverImageUrl || null,
        purchaseUrl: form.purchaseUrl,
        permissionKey: form.permissionKey,
        locale: form.locale || null,
        pdfIndex: Number(form.pdfIndex) || 0,
        mediaFileName:
          primaryVideo?.trim() || form.mediaFileName.trim() || null,
        mediaItems: null,
        hotmartProductId: form.hotmartProductId.trim() || null,
        extraHotmartProductIds: form.extraHotmartProductIdsText
          .split(/[,;\s]+/)
          .map((id) => id.trim())
          .filter(Boolean),
        stoneProductId: form.stoneProductId.trim() || null,
        paymentProvider: form.freeAccess ? 'FREE' : form.paymentProvider,
        grantsProductIds: form.grantsProductIds,
        unlockedLabel: form.unlockedLabel || null,
        freeAccess: form.freeAccess,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active
      }

      const res = await fetch(
        form.id
          ? `/api/admin/catalog-products/${form.id}`
          : '/api/admin/catalog-products',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body)
        }
      )

      const data = await readJsonResponse<{
        error?: string | Record<string, string[]>
        product?: { id: string }
      }>(res)
      if (!res.ok) {
        let msg = 'Não foi possível salvar o produto'
        if (typeof data?.error === 'string') {
          msg = data.error
        } else if (data?.error && typeof data.error === 'object') {
          const fields = Object.entries(data.error as Record<string, string[]>)
            .map(([k, v]) => `${k}: ${v?.join(', ')}`)
            .join(' · ')
          if (fields) msg = fields
        }
        throw new Error(msg)
      }

      const savedId = form.id ?? data?.product?.id
      if (
        form.permissionKey === 'VIDEO' &&
        savedId &&
        form.courseModules.length > 0
      ) {
        const modRes = await fetch(
          `/api/admin/catalog-products/${savedId}/modules`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ modules: form.courseModules })
          }
        )
        const modData = await readJsonResponse<{
          error?: string | Record<string, string[]>
        }>(modRes)
        if (!modRes.ok) {
          let modMsg = 'Produto salvo, mas falha ao salvar módulos'
          if (typeof modData?.error === 'string') {
            modMsg = modData.error
          } else if (modData?.error && typeof modData.error === 'object') {
            const fields = Object.entries(modData.error as Record<string, string[]>)
              .map(([k, v]) => `${k}: ${v?.join(', ')}`)
              .join(' · ')
            if (fields) modMsg = fields
          }
          throw new Error(modMsg)
        }
      }

      setForm(emptyForm())
      setEditing(false)
      await load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este produto?')) return
    try {
      const res = await fetch(`/api/admin/catalog-products/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Não foi possível excluir')
      if (form.id === id) {
        setForm(emptyForm())
        setEditing(false)
      }
      await load()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const startCreate = (section: 'BIBLIOTECA' | 'AUDIOTERAPIA') => {
    setForm({
      ...emptyForm(),
      section,
      permissionKey: section === 'AUDIOTERAPIA' ? 'AUDIOTERAPIA' : 'PDF'
    })
    setEditing(true)
  }

  const startCreateVideo = () => {
    setForm({
      ...emptyForm(),
      section: 'BIBLIOTECA',
      permissionKey: 'VIDEO',
      tagLabel: 'Vídeo, PDF e Áudio',
      unlockedLabel: 'Acessar curso',
      paymentProvider: 'STONE',
      courseModules: [emptyCourseModule(0)]
    })
    setEditing(true)
  }

  function permissionLabel(key: CatalogProductDto['permissionKey']): string {
    switch (key) {
      case 'LIVRO_DIGITAL':
        return 'Livro digital'
      case 'PDF':
        return 'PDF'
      case 'VIDEO':
        return 'Vídeo'
      case 'AUDIOTERAPIA':
        return 'Audioterapia'
    }
  }

  const startEdit = async (p: CatalogProductDto) => {
    const base = productToForm(p)
    if (p.permissionKey === 'VIDEO') {
      try {
        const res = await fetch(`/api/admin/catalog-products/${p.id}/modules`, {
          credentials: 'include'
        })
        if (res.ok) {
          const data = await readJsonResponse<{ modules: CourseModuleInput[] }>(res)
          base.courseModules =
            data?.modules?.length ? data.modules : [emptyCourseModule(0)]
        } else {
          base.courseModules = [emptyCourseModule(0)]
        }
      } catch {
        base.courseModules = [emptyCourseModule(0)]
      }
    }
    setForm(base)
    setEditing(true)
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Produtos do catálogo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie título, capa e link de compra em Biblioteca (PDF, livro),
            Cursos (vídeos) e Audioterapia (áudios).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startCreate('BIBLIOTECA')}
          >
            <Plus className="mr-1 h-4 w-4" />
            Biblioteca
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-indigo-300 text-indigo-800 hover:bg-indigo-50"
            onClick={startCreateVideo}
          >
            <Plus className="mr-1 h-4 w-4" />
            Curso (vídeo)
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700"
            onClick={() => startCreate('AUDIOTERAPIA')}
          >
            <Plus className="mr-1 h-4 w-4" />
            Audioterapia
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={importingMedia}
            onClick={handleImportMedia}
          >
            {importingMedia ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1 h-4 w-4" />
            )}
            Importar MP4 da pasta
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <div className="mb-2 flex justify-between text-xs">
            <span>Enviando para o R2…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-violet-100">
            <div
              className="h-full rounded-full bg-violet-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'BIBLIOTECA', 'CURSOS', 'AUDIOTERAPIA'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterSection === s ? 'default' : 'outline'}
                onClick={() => setFilterSection(s)}
              >
                {s === 'ALL'
                  ? 'Todos'
                  : s === 'BIBLIOTECA'
                    ? 'Biblioteca'
                    : s === 'CURSOS'
                      ? 'Cursos'
                      : 'Audioterapia'}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto cadastrado. Use os botões acima para criar.
            </p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((p) => (
                <li
                  key={p.id}
                  className="flex gap-3 rounded-xl border bg-card p-3 shadow-sm"
                >
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.coverImageUrl ? (
                      <Image
                        src={p.coverImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold truncate">{p.title}</p>
                      {!p.active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                      {p.freeAccess && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                          Gratuito
                        </Badge>
                      )}
                      <Badge variant="outline">{p.section}</Badge>
                      {p.permissionKey === 'VIDEO' && (
                        <Badge className="bg-indigo-600 hover:bg-indigo-600">
                          Curso
                          {p.stoneProductId ? ` · Stone ${p.stoneProductId}` : ''}
                        </Badge>
                      )}
                      {p.hotmartProductId && (
                        <Badge variant="outline">Hotmart {p.hotmartProductId}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {accessModeLabel(
                        p.freeAccess
                          ? 'FREE'
                          : p.paymentProvider === 'STONE'
                            ? 'STONE'
                            : 'HOTMART'
                      )}{' '}
                      · {p.tagLabel} · {permissionLabel(p.permissionKey)}
                      {p.permissionKey === 'PDF' ? ` #${p.pdfIndex}` : ''}
                      {p.locale
                        ? ` · ${catalogLocaleLabel(p.locale as 'pt' | 'en' | 'es')}`
                        : ''}
                      {p.section === 'AUDIOTERAPIA' && p.mediaFileName
                        ? ` · ${p.mediaFileName}`
                        : ''}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card className={editing ? 'ring-2 ring-indigo-200' : ''}>
          <CardHeader>
            <CardTitle>
              {form.id ? 'Editar produto' : 'Novo produto'}
            </CardTitle>
            <CardDescription>
              {form.permissionKey === 'VIDEO'
                ? 'Cadastre o curso, configure a venda (um ID por curso) e organize o conteúdo em módulos com várias aulas.'
                : 'Escolha se o conteúdo é gratuito ou exige liberação via Hotmart/Stone. A permissão indica qual bônus desbloqueia o produto.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!editing ? (
              <p className="text-sm text-muted-foreground">
                Selecione um produto na lista ou crie um novo.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Seção</Label>
                    <Select
                      value={form.section}
                      onValueChange={(v) => {
                        const section = v as FormState['section']
                        setForm((f) => ({
                          ...f,
                          section,
                          permissionKey:
                            section === 'AUDIOTERAPIA'
                              ? 'AUDIOTERAPIA'
                              : f.permissionKey === 'AUDIOTERAPIA'
                                ? 'PDF'
                                : f.permissionKey
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BIBLIOTECA">Biblioteca</SelectItem>
                        <SelectItem value="AUDIOTERAPIA">Audioterapia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Permissão (liberação)</Label>
                    {form.section === 'AUDIOTERAPIA' ? (
                      <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-foreground">
                        Audioterapia
                        <span className="ml-2 text-xs text-muted-foreground">
                          (fixo para esta seção)
                        </span>
                      </div>
                    ) : form.permissionKey === 'VIDEO' ? (
                      <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-foreground">
                        Curso (vídeo)
                        <span className="ml-2 text-xs text-muted-foreground">
                          (tipo fixo — venda é do curso inteiro)
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={form.permissionKey}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            permissionKey: v as FormState['permissionKey']
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha o bônus Hotmart" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LIVRO_DIGITAL">
                            Livro digital
                          </SelectItem>
                          <SelectItem value="PDF">PDF</SelectItem>
                          <SelectItem value="VIDEO">Vídeo (Cursos)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {form.section === 'AUDIOTERAPIA'
                        ? 'Desbloqueia com a permissão audioterapia enviada pelo n8n/Hotmart.'
                        : form.permissionKey === 'VIDEO'
                          ? 'Cursos usam liberação por produto (entitlement), não por módulo.'
                          : 'Define qual bônus da compra libera este conteúdo.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Idioma do conteúdo</Label>
                  <Select
                    value={form.locale || 'ALL'}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        locale:
                          v === 'ALL' ? '' : (v as FormState['locale'])
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os idiomas</SelectItem>
                      <SelectItem value="pt">Português (BR e PT)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Se escolher um idioma, o produto só aparece para clientes com
                    o mesmo idioma no seletor do app.
                  </p>
                </div>

                <AdminFormSection
                  title={
                    form.permissionKey === 'VIDEO'
                      ? 'Informações do curso'
                      : 'Informações do produto'
                  }
                >
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tag">Etiqueta (ex.: PDF)</Label>
                      <Input
                        id="tag"
                        value={form.tagLabel}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, tagLabel: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unlockedLabel">Texto botão liberado</Label>
                      <Input
                        id="unlockedLabel"
                        placeholder="Acessar PDF"
                        value={form.unlockedLabel}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            unlockedLabel: e.target.value
                          }))
                        }
                      />
                    </div>
                  </div>
                </AdminFormSection>

                <AdminFormSection
                  title={
                    form.permissionKey === 'VIDEO'
                      ? 'Venda e liberação do curso'
                      : 'Venda e liberação'
                  }
                  description={
                    form.permissionKey === 'VIDEO'
                      ? 'O ID de compra (Hotmart ou Stone) é único para o curso inteiro — uma compra libera todos os módulos.'
                      : undefined
                  }
                  className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
                >
                  <div className="space-y-2">
                    <Label>Modo de acesso</Label>
                    <Select
                      value={accessModeFromForm(form)}
                      onValueChange={(v) => {
                        const mode = v as AccessMode
                        setForm((f) => ({
                          ...f,
                          freeAccess: mode === 'FREE',
                          paymentProvider:
                            mode === 'STONE'
                              ? 'STONE'
                              : mode === 'HOTMART'
                                ? 'HOTMART'
                                : f.paymentProvider
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOTMART">
                          Liberação via Hotmart (webhook / bônus)
                        </SelectItem>
                        <SelectItem value="STONE">
                          Liberação via Stone (webhook)
                        </SelectItem>
                        <SelectItem value="FREE">
                          Gratuito para todos (usuários logados)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {accessModeHelperText(
                        accessModeFromForm(form),
                        form.permissionKey
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaseUrl">
                      {form.permissionKey === 'VIDEO'
                        ? 'Link de compra do curso *'
                        : 'Link de compra (Hotmart) *'}
                    </Label>
                    <Input
                      id="purchaseUrl"
                      type="url"
                      placeholder={
                        form.permissionKey === 'VIDEO'
                          ? 'https://checkout...'
                          : 'https://pay.hotmart.com/...'
                      }
                      value={form.purchaseUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, purchaseUrl: e.target.value }))
                      }
                    />
                  </div>

                {!form.freeAccess && (
                  <div className="space-y-3">
                    <Label>
                      {form.paymentProvider === 'STONE'
                        ? 'ID Stone do curso'
                        : 'ID Hotmart do curso'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {form.paymentProvider === 'STONE'
                        ? 'Informe o ID Stone para o webhook liberar este produto após o pagamento.'
                        : 'Informe o ID Hotmart do produto. Use “também libera” para bônus na mesma compra.'}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {form.paymentProvider === 'HOTMART' ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="hotmartProductId">ID Hotmart</Label>
                            <Input
                              id="hotmartProductId"
                              placeholder="Ex.: 6652189"
                              value={form.hotmartProductId}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  hotmartProductId: e.target.value
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="extraHotmartProductIds">
                              IDs Hotmart extras
                            </Label>
                            <Input
                              id="extraHotmartProductIds"
                              placeholder="Ex.: 6667092 (físico → mesmo produto)"
                              value={form.extraHotmartProductIdsText}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  extraHotmartProductIdsText: e.target.value
                                }))
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Vários IDs para o mesmo card, separados por vírgula.
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="stoneProductId">ID Stone</Label>
                          <Input
                            id="stoneProductId"
                            placeholder="SKU / código Stone"
                            value={form.stoneProductId}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                stoneProductId: e.target.value
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {form.paymentProvider === 'HOTMART'
                          ? 'Bônus: ao comprar, também libera'
                          : 'Também libera (opcional)'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Marque os produtos extras liberados nesta compra.
                      </p>
                      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-background p-2 text-sm">
                        {products
                          .filter((p) => p.id !== form.id)
                          .map((p) => {
                            const checked = form.grantsProductIds.includes(p.id)
                            return (
                              <li key={p.id}>
                                <label className="flex cursor-pointer items-start gap-2">
                                  <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={checked}
                                    onChange={() => {
                                      setForm((f) => ({
                                        ...f,
                                        grantsProductIds: checked
                                          ? f.grantsProductIds.filter(
                                              (id) => id !== p.id
                                            )
                                          : [...f.grantsProductIds, p.id]
                                      }))
                                    }}
                                  />
                                  <span>
                                    {p.title}
                                    {p.locale
                                      ? ` · ${catalogLocaleLabel(p.locale as 'pt' | 'en' | 'es')}`
                                      : ''}
                                  </span>
                                </label>
                              </li>
                            )
                          })}
                      </ul>
                    </div>
                  </div>
                )}
                </AdminFormSection>

                {showProductMedia && form.permissionKey !== 'VIDEO' && (
                  <div className="space-y-2 rounded-lg border border-dashed border-violet-200 bg-violet-50/30 p-3 dark:border-violet-900 dark:bg-violet-950/20">
                    <Label htmlFor="mediaFileName">Arquivo do produto</Label>
                    <p className="text-xs text-muted-foreground">
                      Envie MP3/MP4 (audioterapia), PDF ou MP4 vídeo (biblioteca).
                      O arquivo vai direto ao Cloudflare R2 e a URL pública é salva
                      no produto.
                    </p>
                    {form.mediaFileName && (
                      <p className="break-all text-xs text-violet-800 dark:text-violet-200">
                        {form.mediaFileName.startsWith('http') ? '☁️ ' : '📁 '}
                        {form.mediaFileName}
                      </p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="mediaFileName"
                        list={
                          form.section === 'AUDIOTERAPIA'
                            ? 'audioterapia-media-files'
                            : undefined
                        }
                        placeholder="URL pública após upload"
                        value={form.mediaFileName}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            mediaFileName: e.target.value
                          }))
                        }
                      />
                      <input
                        ref={mediaInputRef}
                        type="file"
                        accept={mediaAccept}
                        className="sr-only"
                        disabled={uploadingMedia}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadMedia(file)
                          e.target.value = ''
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full shrink-0 sm:w-auto"
                        disabled={uploadingMedia}
                        onClick={() => mediaInputRef.current?.click()}
                      >
                        {uploadingMedia ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Enviar arquivo
                      </Button>
                    </div>
                    {form.section === 'AUDIOTERAPIA' && (
                      <>
                        <datalist id="audioterapia-media-files">
                          {mediaFiles.map((file) => (
                            <option key={file} value={file} />
                          ))}
                        </datalist>
                        <div className="mt-3 space-y-2 rounded-lg border border-violet-300 bg-violet-50/50 p-3 dark:border-violet-800 dark:bg-violet-950/30">
                          <p className="text-xs font-medium text-violet-900 dark:text-violet-100">
                            Pasta da audioterapia (produto)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            O título acima vira o nome da pasta (ex.: Sentido
                            Biológico → pasta &quot;Audioterapia Sentido
                            Biológico&quot;). Selecione todos os MP4/MP3 de uma
                            vez.
                          </p>
                          <input
                            ref={packageInputRef}
                            type="file"
                            accept="audio/mpeg,audio/mp3,video/mp4,.mp3,.mp4"
                            multiple
                            className="sr-only"
                            disabled={uploadingPackage}
                            onChange={(e) => {
                              handleUploadAudioterapiaPackage(e.target.files)
                              e.target.value = ''
                            }}
                          />
                          <Button
                            type="button"
                            className="w-full bg-violet-600 hover:bg-violet-700"
                            disabled={uploadingPackage || !form.title.trim()}
                            onClick={() => packageInputRef.current?.click()}
                          >
                            {uploadingPackage ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="mr-2 h-4 w-4" />
                            )}
                            Enviar pasta com vários áudios
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Cada áudio vai direto ao Cloudflare R2; as URLs ficam
                            salvas neste produto.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {form.permissionKey === 'PDF' && !form.mediaFileName && (
                  <div className="space-y-2">
                    <Label htmlFor="pdfIndex">Índice do PDF (0, 1, 2…)</Label>
                    <Input
                      id="pdfIndex"
                      type="number"
                      min={0}
                      value={form.pdfIndex}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, pdfIndex: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Usado quando há vários PDFs com a mesma permissão. Prefira
                      enviar o PDF acima.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>
                    {form.permissionKey === 'VIDEO'
                      ? 'Capa do curso'
                      : 'Capa do produto'}
                  </Label>
                  {form.coverImageUrl && (
                    <div className="relative mx-auto h-40 w-32 overflow-hidden rounded-lg border">
                      <Image
                        src={form.coverImageUrl}
                        alt="Capa"
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="URL pública da capa após upload"
                      value={form.coverImageUrl}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          coverImageUrl: e.target.value
                        }))
                      }
                    />
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="sr-only"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(file)
                        e.target.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full shrink-0 sm:w-auto"
                      disabled={uploading}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Enviar imagem
                    </Button>
                  </div>
                </div>

                {form.permissionKey === 'VIDEO' ? (
                  <CourseModuleEditor
                    modules={form.courseModules}
                    onChange={(modules) =>
                      setForm((f) => ({ ...f, courseModules: modules }))
                    }
                  />
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Ordem</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      min={0}
                      value={form.sortOrder}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sortOrder: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-2">
                    <input
                      id="active"
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, active: e.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="active">Ativo no app</Label>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                    disabled={saving || !form.title || !form.purchaseUrl}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm(emptyForm())
                      setEditing(false)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
