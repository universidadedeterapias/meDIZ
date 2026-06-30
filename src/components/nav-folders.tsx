// components/nav-folders.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Folder, Plus, Trash2, Edit2, Archive, GripVertical, FileText, X, ChevronDown, ChevronRight } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'
import { UpgradeModal } from '@/components/UpgradeModal'
import { useTranslation } from '@/i18n/useTranslation'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  UniqueIdentifier
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'

type SavedSymptom = {
  id: string
  symptom: string
  threadId: string | null
  symptomStartPeriod?: string | null
  emotionalHistory?: string | null
  copingStrategy?: string | null
}

type SymptomFolder = {
  id: string
  name: string
  color?: string | null
  notes?: string | null
  createdAt: string
  symptoms: SavedSymptom[]
}

type NavFoldersProps = {
  onSelectSymptom?: (symptom: string) => void
  /** Pastas fechadas por padrão até o usuário clicar */
  defaultSectionOpen?: boolean
  /** Quando true, não renderiza SidebarGroup externo (uso dentro de NavOptions) */
  embedded?: boolean
}

type DraggedItem = {
  type: 'symptom'
  folderId: string
  symptom: SavedSymptom
}

// Componente para o item de sintoma arrastável
function DraggableSymptomItem({ 
  symptom, 
  onSelect, 
  isExpanded,
  onToggleExpand 
}: { 
  symptom: SavedSymptom
  onSelect?: (text: string) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: symptom.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const hasAdditionalInfo = symptom.symptomStartPeriod || symptom.emotionalHistory || symptom.copingStrategy

  return (
    <SidebarMenuSubItem 
      ref={setNodeRef} 
      style={style}
      className="group/symptom"
    >
      <div className="w-full">
        <div className="flex items-center gap-1.5 w-full p-1.5 rounded-md hover:bg-accent/50 transition-colors duration-150">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 cursor-grab active:cursor-grabbing p-0 text-muted-foreground hover:text-foreground opacity-60 group-hover/symptom:opacity-100 transition-opacity"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </Button>
          <SidebarMenuSubButton
            onClick={() => onSelect?.(symptom.symptom)}
            title={symptom.symptom}
            className="flex-1 text-left rounded-md hover:bg-accent/80 transition-all duration-150 hover:shadow-sm"
          >
            <div className="truncate text-sm font-medium text-foreground group-hover/symptom:text-indigo-600 dark:group-hover/symptom:text-indigo-400 transition-colors">
              {symptom.symptom}
            </div>
          </SidebarMenuSubButton>
          {hasAdditionalInfo && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand?.()
              }}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
        
        {/* Campos adicionais expandidos */}
        {isExpanded && hasAdditionalInfo && (
          <div className="px-2 py-2 mt-1 space-y-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-md border border-indigo-200/50 dark:border-indigo-900/30">
            {symptom.symptomStartPeriod && (
              <div>
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5">
                  Desde quando:
                </p>
                <p className="text-xs text-foreground/80">{symptom.symptomStartPeriod}</p>
              </div>
            )}
            {symptom.emotionalHistory && (
              <div>
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5">
                  Histórico emocional:
                </p>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap">{symptom.emotionalHistory}</p>
              </div>
            )}
            {symptom.copingStrategy && (
              <div>
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5">
                  Como encarou:
                </p>
                <p className="text-xs text-foreground/80">
                  {symptom.copingStrategy === 'ACCEPTED_AND_SOUGHT_HELP' && 'Aceitei e busquei ajuda'}
                  {symptom.copingStrategy === 'DENIED_INITIALLY' && 'Neguei inicialmente'}
                  {symptom.copingStrategy === 'IGNORED_SYMPTOM' && 'Ignorei o sintoma'}
                  {symptom.copingStrategy === 'SOUGHT_INFO_ALONE' && 'Busquei informações sozinho'}
                  {symptom.copingStrategy === 'SHARED_WITH_FAMILY_FRIENDS' && 'Compartilhei com familiares/amigos'}
                  {symptom.copingStrategy === 'OTHER' && 'Outro'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarMenuSubItem>
  )
}

export function NavFolders({
  onSelectSymptom,
  defaultSectionOpen = false,
  embedded = false
}: NavFoldersProps) {
  const { t } = useTranslation()
  const [folders, setFolders] = useState<SymptomFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openUpgradeModal, setOpenUpgradeModal] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderNotes, setNewFolderNotes] = useState('')
  const [editingFolderNotes, setEditingFolderNotes] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedSymptoms, setExpandedSymptoms] = useState<Set<string>>(new Set())
  const [showAllFolders, setShowAllFolders] = useState(false)
  const [_activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)
  const [foldersSectionOpen, setFoldersSectionOpen] = useState(defaultSectionOpen)
  
  const { isPremium, isLoading: isLoadingPremium } = useSubscriptionStatus()
  
  // Limitar visualização a 5 pastas inicialmente
  const MAX_VISIBLE_FOLDERS = 5
  const visibleFolders = showAllFolders ? folders : folders.slice(0, MAX_VISIBLE_FOLDERS)
  const hasMoreFolders = folders.length > MAX_VISIBLE_FOLDERS
  

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Buscar pastas do usuário
  useEffect(() => {
    loadFolders()
  }, [])

  // Ouvir evento de atualização quando um sintoma é salvo
  useEffect(() => {
    const handleFoldersUpdated = (event?: Event) => {
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[NavFolders] foldersUpdated → reload', event?.type || '')
        }
        loadFolders()
      } catch (error) {
        if (error instanceof Error) {
          console.error('[NavFolders] Erro em handleFoldersUpdated:', {
            name: error.name,
            message: error.message
          })
        } else {
          console.error('[NavFolders] Erro em handleFoldersUpdated:', error)
        }
      }
    }

    window.addEventListener('foldersUpdated', handleFoldersUpdated)
    return () => {
      window.removeEventListener('foldersUpdated', handleFoldersUpdated)
    }
  }, [])

  async function loadFolders() {
    try {
      if (process.env.NODE_ENV !== 'production') console.log('[NavFolders] Carregando pastas...')
      const res = await fetch('/api/folders')
      if (process.env.NODE_ENV !== 'production') console.log('[NavFolders] Response status:', res.status)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        console.error('[NavFolders] Erro na resposta:', res.status, res.statusText, errorData)
        // Não mostra alerta para erro 401 (não autenticado) - pode ser temporário
        if (res.status !== 401) {
          console.warn('[NavFolders] Falha ao carregar pastas. Tentando novamente...')
        }
        // Define pastas vazias em caso de erro para não travar a UI
        setFolders([])
        return
      }
      const data = await res.json()
      if (process.env.NODE_ENV !== 'production') console.log('[NavFolders] Pastas carregadas:', data)
      setFolders(Array.isArray(data) ? data : [])
    } catch (error) {
      // Evita logar objetos Event diretamente
      if (error instanceof Error) {
        console.error('[NavFolders] Erro ao carregar pastas:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      } else {
        console.error('[NavFolders] Erro ao carregar pastas:', error)
      }
      // Define pastas vazias em caso de erro para não travar a UI
      setFolders([])
    } finally {
      setLoading(false)
      if (process.env.NODE_ENV !== 'production') console.log('[NavFolders] Loading finalizado')
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return

    // Verificar premium antes de criar
    if (!isPremium) {
      setOpenUpgradeModal(true)
      return
    }

    try {
      const folderData = {
        name: newFolderName.trim(),
        notes: newFolderNotes.trim() || null
      }
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      })

      if (process.env.NODE_ENV !== 'production') {
        console.log('[NavFolders] Response status:', res.status)
      }

      if (res.ok) {
        const _created = await res.json()
        if (process.env.NODE_ENV !== 'production') console.log('[NavFolders] Pasta criada')
        setNewFolderName('')
        setNewFolderNotes('')
        setOpenCreateDialog(false)
        await loadFolders()
        alert('✅ Pasta criada com sucesso!')
      } else {
        const errorData = await res.json()
        console.error('[NavFolders] Erro ao criar pasta:', errorData)
        alert(`❌ Erro ao criar pasta: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      // Evita logar objetos Event diretamente
      if (error instanceof Error) {
        console.error('[NavFolders] Erro ao criar pasta:', {
          name: error.name,
          message: error.message
        })
      } else {
        console.error('[NavFolders] Erro ao criar pasta:', error)
      }
      alert('❌ Erro ao criar pasta. Tente novamente.')
    }
  }

  async function handleUpdateNotes(folderId: string) {
    // Verificar premium antes de atualizar
    if (!isPremium) {
      setOpenUpgradeModal(true)
      return
    }

    try {
      const notesValue = editingNotes.trim() || null
      if (process.env.NODE_ENV !== 'production') console.log('[NavFolders] Atualizando notas')
      
      const requestBody = { notes: notesValue }
      
      
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (process.env.NODE_ENV !== 'production') console.log('[NavFolders] Response status:', res.status)
      
      const responseText = await res.text()
      
      
      if (res.ok) {
        try {
          const _updated = JSON.parse(responseText)
          if (process.env.NODE_ENV !== 'production') console.log('[NavFolders] Pasta atualizada')
          setEditingFolderNotes(null)
          setEditingNotes('')
          await loadFolders()
          alert('✅ Observações salvas com sucesso!')
        } catch (parseError) {
          console.error('[NavFolders] Erro ao fazer parse do JSON:', parseError)
          alert('✅ Observações salvas, mas houve um problema ao atualizar a interface.')
          await loadFolders()
        }
      } else {
        try {
          const errorData = JSON.parse(responseText)
          console.error('[NavFolders] Erro na resposta:', errorData)
          alert(`❌ Erro ao salvar observações: ${errorData.error || errorData.details || 'Erro desconhecido'}`)
        } catch (parseError) {
          console.error('[NavFolders] Erro ao fazer parse do erro:', parseError, 'Response:', responseText)
          alert(`❌ Erro ao salvar observações. Status: ${res.status}`)
        }
      }
    } catch (error) {
      // Evita logar objetos Event diretamente
      if (error instanceof Error) {
        console.error('[NavFolders] Erro completo ao atualizar notas:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
        alert(`❌ Erro ao salvar observações: ${error.message}`)
      } else {
        console.error('[NavFolders] Erro completo ao atualizar notas:', error)
        alert('❌ Erro ao salvar observações: Erro desconhecido')
      }
    }
  }

  async function handleDeleteFolder(folderId: string) {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setOpenDeleteDialog(false)
        setFolderToDelete(null)
        await loadFolders()
      }
    } catch (error) {
      // Evita logar objetos Event diretamente
      if (error instanceof Error) {
        console.error('Erro ao excluir pasta:', {
          name: error.name,
          message: error.message
        })
      } else {
        console.error('Erro ao excluir pasta:', error)
      }
    }
  }

  async function handleMoveSymptom(symptomId: string, fromFolderId: string, toFolderId: string) {
    if (fromFolderId === toFolderId) return

    try {
      await fetch(`/api/symptoms/${symptomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: toFolderId })
      })

      // Atualizar localmente
      setFolders(prev => {
        return prev.map(folder => {
          if (folder.id === fromFolderId) {
            return { ...folder, symptoms: folder.symptoms.filter(s => s.id !== symptomId) }
          }
          if (folder.id === toFolderId) {
            // Adicionar o sintoma na nova pasta (vai ser atualizado no loadFolders)
            return folder
          }
          return folder
        })
      })

      // Recarregar para garantir sincronização
      await loadFolders()
    } catch (error) {
      // Evita logar objetos Event diretamente
      if (error instanceof Error) {
        console.error('Erro ao mover sintoma:', {
          name: error.name,
          message: error.message
        })
      } else {
        console.error('Erro ao mover sintoma:', error)
      }
      // Recarregar em caso de erro
      await loadFolders()
    }
  }

  function toggleFolder(folderId: string) {
    // Verificar premium antes de expandir/colapsar
    if (!isPremium) {
      setOpenUpgradeModal(true)
      return
    }

    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  function handleDragStart(event: DragStartEvent) {
    try {
      const { active } = event
      setActiveId(active.id)

      // Encontrar o sintoma e a pasta
      for (const folder of folders) {
        const symptom = folder.symptoms.find(s => s.id === active.id.toString())
        if (symptom) {
          setDraggedItem({
            type: 'symptom',
            folderId: folder.id,
            symptom
          })
          break
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('[NavFolders] Erro em handleDragStart:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      } else {
        console.error('[NavFolders] Erro em handleDragStart:', error)
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    try {
      const { active, over } = event
      
      // Capturar o draggedItem ANTES de limpar
      const currentDraggedItem = draggedItem
      
      // Limpar estados
      setActiveId(null)
      setDraggedItem(null)

      if (!over || !currentDraggedItem) return

      const overFolderId = over.id.toString()

      // Se estiver sobre uma pasta diferente
      if (overFolderId !== currentDraggedItem.folderId && folders.find(f => f.id === overFolderId)) {
        // handleMoveSymptom é assíncrono, mas não precisamos aguardar
        handleMoveSymptom(active.id.toString(), currentDraggedItem.folderId, overFolderId).catch((error) => {
          if (error instanceof Error) {
            console.error('[NavFolders] Erro ao mover sintoma em handleDragEnd:', {
              name: error.name,
              message: error.message
            })
          } else {
            console.error('[NavFolders] Erro ao mover sintoma em handleDragEnd:', error)
          }
        })
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('[NavFolders] Erro em handleDragEnd:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      } else {
        console.error('[NavFolders] Erro em handleDragEnd:', error)
      }
      // Garantir que os estados sejam limpos mesmo em caso de erro
      setActiveId(null)
      setDraggedItem(null)
    }
  }

  function handleDragOver(_event: DragOverEvent) {
    try {
      // Opcional: adicionar feedback visual
      // Por enquanto, apenas previne erros silenciosos
    } catch (error) {
      if (error instanceof Error) {
        console.error('[NavFolders] Erro em handleDragOver:', {
          name: error.name,
          message: error.message
        })
      } else {
        console.error('[NavFolders] Erro em handleDragOver:', error)
      }
    }
  }

  // Coletar todos os IDs de sintomas para o SortableContext
  const _allSymptomIds = folders.flatMap(folder =>
    expandedFolders.has(folder.id) ? folder.symptoms.map(s => s.id) : []
  )

  if (loading) {
    const loadingMenu = (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="h-9 rounded-xl px-2.5" disabled>
            <Folder style={{ width: 22, height: 22 }} className="shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">
              {t('folders.loading', 'Carregando pastas...')}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
    return embedded ? loadingMenu : <SidebarGroup>{loadingMenu}</SidebarGroup>
  }

  const foldersContent = (
    <Collapsible open={foldersSectionOpen} onOpenChange={setFoldersSectionOpen}>
      <SidebarMenu className="gap-0.5">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className="h-9 rounded-xl px-2.5 transition-colors hover:bg-white/40 hover:shadow-sm hover:shadow-violet-950/5 dark:hover:bg-white/[0.07] group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-2"
              tooltip={t('folders.title', 'Pastas de Pacientes')}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                <Folder className="size-[18px] text-zinc-600 dark:text-zinc-300" />
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-medium leading-5 group-data-[collapsible=icon]:hidden">
                <span className="truncate">
                  {t('folders.title', 'Pastas de Pacientes')}
                </span>
              </span>
              {foldersSectionOpen ? (
                <ChevronDown className="ml-auto h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
              ) : (
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
        </SidebarMenuItem>

        <CollapsibleContent>
          <div className="flex items-center justify-end px-4 pb-2 group-data-[collapsible=icon]:hidden">
            <Dialog open={openCreateDialog} onOpenChange={(open) => {
            if (!open) {
              setOpenCreateDialog(false)
              return
            }
            // Verificar premium antes de abrir
            if (!isPremium) {
              setOpenUpgradeModal(true)
              return
            }
            setOpenCreateDialog(true)
          }}>
            <DialogTrigger asChild>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  onClick={(e) => {
                    if (!isPremium && !isLoadingPremium) {
                      e.preventDefault()
                      setOpenUpgradeModal(true)
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <div className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse shadow-lg z-10 whitespace-nowrap">
                  {t('badge.new', 'NOVO')}
                </div>
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('folders.newFolder', 'Nova Pasta')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="folder-name">{t('folders.folderName', 'Nome da pasta')}</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder={t('folders.folderNamePlaceholder', 'Ex: João Silva')}
                    onKeyDown={e => {
                      try {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleCreateFolder()
                        }
                      } catch (error) {
                        if (error instanceof Error) {
                          console.error('[NavFolders] Erro em onKeyDown:', {
                            name: error.name,
                            message: error.message
                          })
                        } else {
                          console.error('[NavFolders] Erro em onKeyDown:', error)
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="folder-notes">{t('folders.notes', 'Observações (opcional)')}</Label>
                  <Textarea
                    id="folder-notes"
                    value={newFolderNotes}
                    onChange={e => setNewFolderNotes(e.target.value)}
                    placeholder={t('folders.notesPlaceholder', 'Adicione notas ou comentários sobre esta pasta...')}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setOpenCreateDialog(false)
                  setNewFolderName('')
                  setNewFolderNotes('')
                }}>
                  {t('general.cancel', 'Cancelar')}
                </Button>
                <Button onClick={handleCreateFolder}>{t('folders.create', 'Criar')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <SidebarMenu>
          {folders.length === 0 ? (
            <SidebarMenuItem>
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                <Folder className="h-10 w-10 text-muted-foreground/50" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{t('folders.noFolders', 'Nenhuma pasta criada')}</p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const desc = t('folders.noFoldersDescription', 'Clique no botão + acima para criar sua primeira pasta')
                      const parts = desc.split('+')
                      if (parts.length === 2) {
                        return (
                          <>
                            {parts[0]}
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px]">+</span>
                            {parts[1]}
                          </>
                        )
                      }
                      return desc
                    })()}
                  </p>
                </div>
              </div>
            </SidebarMenuItem>
          ) : folders.length > 0 ? (
            <>
              {visibleFolders.map(folder => (
              <SidebarMenuItem key={folder.id} className="group">
                <div className="flex items-center w-full gap-1">
                  <SidebarMenuButton
                    onClick={() => toggleFolder(folder.id)}
                    className="flex-1 group/folder relative overflow-hidden transition-all duration-200 hover:bg-accent/80"
                    data-dropzone={true}
                    data-folder-id={folder.id}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative">
                        <Folder className={`h-4 w-4 transition-all duration-200 ${
                          expandedFolders.has(folder.id) 
                            ? 'text-indigo-600 fill-indigo-600/20' 
                            : 'text-muted-foreground'
                        }`} />
                        {expandedFolders.has(folder.id) && (
                          <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-sm -z-10" />
                        )}
                      </div>
                      <span className="font-medium text-sm truncate">{folder.name}</span>
                    </div>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      expandedFolders.has(folder.id)
                        ? 'bg-indigo-500/10 text-indigo-600'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {folder.symptoms.length}
                    </span>
                  </SidebarMenuButton>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive rounded-md"
                    onClick={e => {
                      e.stopPropagation()
                      setFolderToDelete(folder.id)
                      setOpenDeleteDialog(true)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {expandedFolders.has(folder.id) && (
                  <SidebarMenuSub 
                    data-dropzone={true} 
                    data-folder-id={folder.id}
                    className="ml-2 border-l-2 border-indigo-500/20 pl-3 mt-1 space-y-2"
                  >
                    {/* Exibir/Editar Notas */}
                    <SidebarMenuSubItem>
                      <div className="px-3 py-3 space-y-2 w-full rounded-lg bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200/50 dark:border-indigo-900/50">
                        {editingFolderNotes === folder.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-xs font-medium">{t('folders.observations', 'Observações')}</Label>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={() => {
                                  setEditingFolderNotes(null)
                                  setEditingNotes('')
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <Textarea
                              value={editingNotes}
                              onChange={e => setEditingNotes(e.target.value)}
                              placeholder={t('folders.observationsPlaceholder', 'Adicione observações sobre esta pasta...')}
                              rows={3}
                              className="text-xs"
                            />
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs flex-1"
                                onClick={() => {
                                  setEditingFolderNotes(null)
                                  setEditingNotes('')
                                }}
                              >
                                {t('general.cancel', 'Cancelar')}
                              </Button>
                              <Button
                                size="sm"
                                className="h-6 text-xs flex-1"
                                onClick={() => handleUpdateNotes(folder.id)}
                              >
                                {t('general.save', 'Salvar')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                <Label className="text-xs font-semibold text-foreground">{t('folders.observations', 'Observações')}</Label>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                                onClick={() => {
                                  if (!isPremium) {
                                    setOpenUpgradeModal(true)
                                    return
                                  }
                                  setEditingFolderNotes(folder.id)
                                  setEditingNotes(folder.notes || '')
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              </Button>
                            </div>
                            {folder.notes ? (
                              <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words leading-relaxed bg-white/50 dark:bg-black/20 rounded p-2 border border-indigo-100 dark:border-indigo-900/30">
                                {folder.notes}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic px-2 py-1.5 rounded bg-muted/50 border border-dashed border-muted-foreground/20">
                                {t('folders.noObservations', 'Sem observações. Clique no ícone de editar para adicionar.')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </SidebarMenuSubItem>
                    
                    {/* Separador */}
                    {(folder.notes || editingFolderNotes === folder.id) && folder.symptoms.length > 0 && (
                      <div className="border-t border-indigo-200/50 dark:border-indigo-900/30 my-2" />
                    )}
                    
                    {/* Lista de Sintomas */}
                    {folder.symptoms.length === 0 ? (
                      <SidebarMenuSubItem>
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
                          <Archive className="h-6 w-6 text-muted-foreground/50" />
                          <p className="text-xs font-medium text-foreground">Pasta vazia</p>
                          <p className="text-xs text-muted-foreground">Arraste sintomas aqui para organizá-los</p>
                        </div>
                      </SidebarMenuSubItem>
                    ) : (
                      <SortableContext
                        items={folder.symptoms.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {folder.symptoms.map(symptom => (
                          <DraggableSymptomItem
                            key={symptom.id}
                            symptom={symptom}
                            onSelect={onSelectSymptom}
                            isExpanded={expandedSymptoms.has(symptom.id)}
                            onToggleExpand={() => {
                              const newExpanded = new Set(expandedSymptoms)
                              if (newExpanded.has(symptom.id)) {
                                newExpanded.delete(symptom.id)
                              } else {
                                newExpanded.add(symptom.id)
                              }
                              setExpandedSymptoms(newExpanded)
                            }}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              ))}
              
              {/* Botão para ver mais pastas */}
              {hasMoreFolders && !showAllFolders && (
                <SidebarMenuItem>
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAllFolders(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ver mais ({folders.length - MAX_VISIBLE_FOLDERS} pastas)
                  </Button>
                </SidebarMenuItem>
              )}
              
              {/* Botão para ver menos pastas */}
              {showAllFolders && hasMoreFolders && (
                <SidebarMenuItem>
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAllFolders(false)}
                  >
                    Ver menos
                  </Button>
                </SidebarMenuItem>
              )}
            </>
          ) : null}
        </SidebarMenu>
        </CollapsibleContent>
      </SidebarMenu>
    </Collapsible>
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      {embedded ? foldersContent : <SidebarGroup>{foldersContent}</SidebarGroup>}

        <DragOverlay>
          {draggedItem && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg px-3 py-2 shadow-2xl backdrop-blur-sm">
              <p className="text-sm font-medium text-foreground">{draggedItem.symptom.symptom}</p>
            </div>
          )}
        </DragOverlay>

        <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os sintomas salvos nesta pasta serão excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => folderToDelete && handleDeleteFolder(folderToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <UpgradeModal 
          open={openUpgradeModal}
          onOpenChange={setOpenUpgradeModal}
        />
    </DndContext>
  )
}
