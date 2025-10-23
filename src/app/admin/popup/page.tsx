'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Save, 
  Trash2, 
  Eye, 
  Loader2,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react'

interface PopupConfig {
  id: string
  title: string
  content: string
  imageUrl?: string
  subscribeLink: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export default function PopupAdminPage() {
  const [popups, setPopups] = useState<PopupConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPopup, setSelectedPopup] = useState<PopupConfig | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    subscribeLink: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  })

  useEffect(() => {
    fetchPopups()
  }, [])

  const fetchPopups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/popup/admin')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar popups')
      }

      const data = await response.json()
      setPopups(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar popups')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/popup/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao fazer upload')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/popup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          id: selectedPopup?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar popup')
      }

      const savedPopup = await response.json()
      
      if (selectedPopup) {
        setPopups(prev => prev.map(p => p.id === selectedPopup.id ? savedPopup : p))
      } else {
        setPopups(prev => [savedPopup, ...prev])
      }

      setSelectedPopup(null)
      setFormData({
        title: '',
        content: '',
        imageUrl: '',
        subscribeLink: '',
        status: 'ACTIVE'
      })

      alert('Popup salvo com sucesso!')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar popup')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este popup?')) {
      return
    }

    try {
      const response = await fetch(`/api/popup/admin?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir popup')
      }

      setPopups(prev => prev.filter(p => p.id !== id))
      if (selectedPopup?.id === id) {
        setSelectedPopup(null)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir popup')
    }
  }

  const handleEdit = (popup: PopupConfig) => {
    setSelectedPopup(popup)
    setFormData({
      title: popup.title,
      content: popup.content,
      imageUrl: popup.imageUrl || '',
      subscribeLink: popup.subscribeLink,
      status: popup.status
    })
  }

  const handleNew = () => {
    setSelectedPopup(null)
    setFormData({
      title: '',
      content: '',
      imageUrl: '',
      subscribeLink: '',
      status: 'ACTIVE'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando popups...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gerenciar Pop-ups</h1>
        <p className="text-gray-600">Configure os pop-ups promocionais da plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedPopup ? 'Editar Pop-up' : 'Novo Pop-up'}
            </CardTitle>
            <CardDescription>
              Configure o conteúdo e imagem do pop-up promocional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título do pop-up"
              />
            </div>

            <div>
              <Label htmlFor="content">Conteúdo (Markdown)</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Conteúdo do pop-up em Markdown..."
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="subscribeLink">Link de Assinatura</Label>
              <Input
                id="subscribeLink"
                value={formData.subscribeLink}
                onChange={(e) => setFormData({ ...formData, subscribeLink: e.target.value })}
                placeholder="https://exemplo.com/assinatura"
              />
            </div>

            <div>
              <Label>Imagem</Label>
              <div className="mt-2 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleImageUpload(file)
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploading && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Fazendo upload...</span>
                  </div>
                )}
                {formData.imageUrl && (
                  <div className="relative w-full h-32 border rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex space-x-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleNew}>
                Novo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de popups */}
        <Card>
          <CardHeader>
            <CardTitle>Pop-ups Existentes</CardTitle>
            <CardDescription>
              Gerencie os pop-ups criados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {popups.map((popup) => (
                <div key={popup.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{popup.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {popup.content.substring(0, 100)}...
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={popup.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {popup.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {popup.imageUrl && (
                          <Badge variant="outline">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Com imagem
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(popup)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(popup.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {popups.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum pop-up criado ainda
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}