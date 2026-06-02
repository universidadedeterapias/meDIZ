'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { stripAnsi } from '@/lib/catalog/prisma-errors'

type FormState = {
  id: string | null
  section: 'BIBLIOTECA' | 'AUDIOTERAPIA'
  title: string
  description: string
  tagLabel: string
  coverImageUrl: string
  purchaseUrl: string
  permissionKey: 'LIVRO_DIGITAL' | 'PDF' | 'AUDIOTERAPIA'
  pdfIndex: string
  mediaFileName: string
  unlockedLabel: string
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
  pdfIndex: '0',
  mediaFileName: '',
  unlockedLabel: '',
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
    pdfIndex: String(p.pdfIndex),
    mediaFileName: p.mediaFileName ?? '',
    unlockedLabel: p.unlockedLabel ?? '',
    sortOrder: String(p.sortOrder),
    active: p.active
  }
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
    'ALL' | 'BIBLIOTECA' | 'AUDIOTERAPIA'
  >('ALL')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [mediaFiles, setMediaFiles] = useState<string[]>([])
  const [importingMedia, setImportingMedia] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [uploadingPackage, setUploadingPackage] = useState(false)
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

  const filtered = products.filter((p) =>
    filterSection === 'ALL' ? true : p.section === filterSection
  )

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/admin/catalog-products/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      })
      const data = await readJsonResponse<{ error?: string; imageUrl?: string }>(
        res
      )
      if (!res.ok) throw new Error(data?.error || 'Upload falhou')
      if (!data?.imageUrl) throw new Error('Resposta sem URL da imagem')
      setForm((f) => ({ ...f, coverImageUrl: data.imageUrl }))
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro no upload')
    } finally {
      setUploading(false)
    }
  }

  const handleUploadAudioterapiaPackage = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    if (!form.title.trim()) {
      showError('Informe o título da audioterapia antes de enviar os áudios')
      return
    }

    setUploadingPackage(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      if (form.id) fd.append('productId', form.id)
      if (form.description.trim()) fd.append('description', form.description.trim())
      if (form.purchaseUrl.trim()) fd.append('purchaseUrl', form.purchaseUrl.trim())
      fd.append('replaceExisting', 'true')
      for (const file of Array.from(fileList)) {
        fd.append('files', file)
      }

      const res = await fetch(
        '/api/admin/catalog-products/upload-audioterapia-package',
        {
          method: 'POST',
          body: fd,
          credentials: 'include'
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
    }
  }

  const handleUploadMedia = async (file: File) => {
    setUploadingMedia(true)
    setError(null)
    try {
      const kind = form.section === 'AUDIOTERAPIA' ? 'audio' : 'pdf'
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/admin/catalog-products/upload-media', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      })
      const data = await readJsonResponse<{
        error?: string
        mediaRef?: string
      }>(res)
      if (!res.ok) throw new Error(data?.error || 'Upload falhou')
      if (!data?.mediaRef) throw new Error('Resposta sem referência do arquivo')
      setForm((f) => ({ ...f, mediaFileName: data.mediaRef }))
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro no upload do arquivo')
    } finally {
      setUploadingMedia(false)
    }
  }

  const showProductMedia =
    form.section === 'AUDIOTERAPIA' ||
    form.permissionKey === 'PDF' ||
    form.permissionKey === 'LIVRO_DIGITAL'

  const mediaAccept =
    form.section === 'AUDIOTERAPIA'
      ? 'audio/mpeg,audio/mp3,video/mp4,.mp3,.mp4'
      : 'application/pdf,.pdf'

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const body = {
        section: form.section,
        title: form.title,
        description: form.description || null,
        tagLabel: form.tagLabel || null,
        coverImageUrl: form.coverImageUrl || null,
        purchaseUrl: form.purchaseUrl,
        permissionKey: form.permissionKey,
        pdfIndex: Number(form.pdfIndex) || 0,
        mediaFileName: form.mediaFileName.trim() || null,
        unlockedLabel: form.unlockedLabel || null,
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

      const data = await readJsonResponse<{ error?: string | Record<string, string[]> }>(
        res
      )
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
    setForm({ ...emptyForm(), section })
    setEditing(true)
  }

  const startEdit = (p: CatalogProductDto) => {
    setForm(productToForm(p))
    setEditing(true)
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Produtos do catálogo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie título, capa e link de compra exibidos em Biblioteca e
            Audioterapia.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'BIBLIOTECA', 'AUDIOTERAPIA'] as const).map((s) => (
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
                      <Badge variant="outline">{p.section}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {p.tagLabel} · {p.permissionKey}
                      {p.permissionKey === 'PDF' ? ` #${p.pdfIndex}` : ''}
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
              A permissão define quando o botão vira &quot;Acessar&quot; (via
              Hotmart/n8n). O link de compra é usado em &quot;Desbloquear
              acesso&quot;.
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
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          section: v as FormState['section']
                        }))
                      }
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LIVRO_DIGITAL">
                          Livro digital
                        </SelectItem>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="AUDIOTERAPIA">
                          Audioterapia
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="purchaseUrl">Link de compra (Hotmart) *</Label>
                  <Input
                    id="purchaseUrl"
                    type="url"
                    placeholder="https://pay.hotmart.com/..."
                    value={form.purchaseUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, purchaseUrl: e.target.value }))
                    }
                  />
                </div>

                {showProductMedia && (
                  <div className="space-y-2 rounded-lg border border-dashed border-violet-200 bg-violet-50/30 p-3 dark:border-violet-900 dark:bg-violet-950/20">
                    <Label htmlFor="mediaFileName">Arquivo do produto</Label>
                    <p className="text-xs text-muted-foreground">
                      Envie MP3/MP4 (audioterapia) ou PDF (biblioteca). Com Cloudinary
                      no .env funciona em produção; sem Cloudinary salva em{' '}
                      <code className="text-[11px]">public/biblioteca/</code> (só local).
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
                        placeholder={
                          form.section === 'AUDIOTERAPIA'
                            ? 'caminho local ou URL após upload'
                            : 'URL ou caminho do PDF'
                        }
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
                            Ou coloque as pastas em{' '}
                            <code className="text-[11px]">
                              public/biblioteca/audioterapias/
                            </code>{' '}
                            e use &quot;Importar MP4 da pasta&quot;.
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
                      Legado: índice dos PDFs em public/biblioteca/pdf/. Prefira
                      enviar o PDF acima.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Capa do produto</Label>
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
                      placeholder="https://... ou /catalog/arquivo.jpg"
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
