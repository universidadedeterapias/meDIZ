'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// Removido toast do sonner temporariamente
import { Loader2, Trash } from 'lucide-react'

interface PopupFormData {
  id?: string
  title: string
  content: string
  imageUrl?: string
  subscribeLink: string
  status: 'ACTIVE' | 'INACTIVE'
}

export default function PopupAdminPage() {
  const [popups, setPopups] = useState<PopupFormData[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedPopup, setSelectedPopup] = useState<PopupFormData | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  // Função simples para mostrar notificações
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PopupFormData>({
    defaultValues: {
      title: '',
      content: '',
      imageUrl: '',
      subscribeLink: 'https://go.hotmart.com/N101121884P',
      status: 'ACTIVE'
    }
  })
  
  // Carrega os popups ao montar o componente
  useEffect(() => {
    fetchPopups()
  }, [])
  
  // Busca os popups existentes
  const fetchPopups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/popup/admin')
      
      if (!response.ok) {
        throw new Error('Erro ao buscar popups')
      }
      
      const data = await response.json()
      setPopups(data)
    } catch (error) {
      console.error('Erro ao buscar popups:', error)
      // Em caso de erro, usa dados mock para demonstração
      setPopups([
        {
          id: '1',
          title: 'Oferta Especial de Lançamento',
          content: 'Aproveite nossa oferta especial de lançamento! Desconto de 50% nos primeiros 3 meses para novos assinantes.',
          imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
          subscribeLink: 'https://go.hotmart.com/N101121884P',
          status: 'ACTIVE'
        },
        {
          id: '2',
          title: 'Desbloqueie Conteúdo Completo',
          content: 'Você está vendo apenas uma prévia do conteúdo. Assine agora para ter acesso completo a todas as análises e insights médicos.',
          imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop',
          subscribeLink: 'https://go.hotmart.com/N101121884P',
          status: 'INACTIVE'
        }
      ])
      toast.info('Usando dados de demonstração (API indisponível)')
    } finally {
      setLoading(false)
    }
  }
  
  // Seleciona um popup para edição
  const handleSelectPopup = (popup: PopupFormData) => {
    setSelectedPopup(popup)
    
    // Preenche o formulário com os dados do popup selecionado
    setValue('id', popup.id)
    setValue('title', popup.title)
    setValue('content', popup.content)
    setValue('imageUrl', popup.imageUrl || '')
    setValue('subscribeLink', popup.subscribeLink)
    setValue('status', popup.status)
    
    if (popup.imageUrl) {
      setPreviewUrl(popup.imageUrl)
    } else {
      setPreviewUrl(null)
    }
  }
  
  // Cria ou atualiza um popup
  const onSubmit = async (data: PopupFormData) => {
    try {
      setSubmitting(true)
      
      const response = await fetch('/api/popup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error('Erro ao salvar popup')
      }
      
      showNotification('Popup salvo com sucesso', 'success')
      
      // Atualiza a lista de popups
      fetchPopups()
      
      // Limpa o formulário se for uma criação (não uma edição)
      if (!data.id) {
        handleReset()
      }
    } catch (error) {
      console.error('Erro ao salvar popup:', error)
      showNotification('Não foi possível salvar o popup', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  
  // Exclui um popup
  const handleDeletePopup = async (id: string) => {
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
      
      showNotification('Popup excluído com sucesso', 'success')
      
      // Se o popup excluído for o que está sendo editado, limpa o formulário
      if (selectedPopup?.id === id) {
        handleReset()
      }
      
      // Atualiza a lista de popups
      fetchPopups()
    } catch (error) {
      console.error('Erro ao excluir popup:', error)
      showNotification('Não foi possível excluir o popup', 'error')
    }
  }
  
  // Limpa o formulário
  const handleReset = () => {
    reset({
      title: '',
      content: '',
      imageUrl: '',
      subscribeLink: 'https://go.hotmart.com/N101121884P',
      status: 'ACTIVE'
    })
    setSelectedPopup(null)
    setPreviewUrl(null)
  }
  
  // Visualiza imagem no input
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setPreviewUrl(url || null)
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gerenciamento de Pop-ups</h1>
        <Button onClick={handleReset} variant="outline">Novo Pop-up</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Lista de Popups */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Popups Configurados</CardTitle>
            <CardDescription>
              {loading ? 'Carregando...' : `${popups.length} popup(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
              </div>
            ) : popups.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Nenhum popup configurado
              </p>
            ) : (
              <div className="space-y-2">
                {popups.map(popup => (
                  <div 
                    key={popup.id} 
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedPopup?.id === popup.id 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectPopup(popup)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{popup.title}</h3>
                        <p className="text-sm text-gray-500 truncate">
                          {popup.content.substring(0, 50)}
                          {popup.content.length > 50 ? '...' : ''}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                          popup.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePopup(popup.id!)
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Formulário de Edição */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedPopup ? 'Editar Pop-up' : 'Novo Pop-up'}
            </CardTitle>
            <CardDescription>
              Preencha os campos abaixo para configurar o pop-up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="popupForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input type="hidden" {...register('id')} />
              
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input 
                  id="title"
                  {...register('title', { required: 'Título é obrigatório' })}
                  placeholder="Ex: Oferta Especial"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">
                  Conteúdo
                  <span className="text-xs text-gray-500 ml-2">(Suporta Markdown)</span>
                </Label>
                <Textarea 
                  id="content"
                  {...register('content', { required: 'Conteúdo é obrigatório' })}
                  placeholder="Ex: Aproveite nosso desconto exclusivo para novos assinantes!"
                  className={`min-h-[150px] ${errors.content ? 'border-red-500' : ''}`}
                />
                {errors.content && (
                  <p className="text-sm text-red-500">{errors.content.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL da Imagem (opcional)</Label>
                <Input 
                  id="imageUrl"
                  {...register('imageUrl')}
                  placeholder="Ex: https://example.com/imagem.jpg"
                  onChange={handleImageUrlChange}
                />
                
                {/* Preview da imagem */}
                {previewUrl && (
                  <div className="mt-2 border rounded-md overflow-hidden">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-40 object-cover"
                      onError={() => {
                        showNotification('URL da imagem inválida', 'error')
                        setPreviewUrl(null)
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subscribeLink">Link de Assinatura</Label>
                <Input 
                  id="subscribeLink"
                  {...register('subscribeLink', { required: 'Link é obrigatório' })}
                  placeholder="Ex: https://go.hotmart.com/N101121884P"
                  className={errors.subscribeLink ? 'border-red-500' : ''}
                />
                {errors.subscribeLink && (
                  <p className="text-sm text-red-500">{errors.subscribeLink.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  {...register('status')}
                  defaultValue={selectedPopup?.status || 'ACTIVE'}
                  onValueChange={(value) => setValue('status', value as 'ACTIVE' | 'INACTIVE')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              form="popupForm"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Notificação simples */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          notification.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  )
}
