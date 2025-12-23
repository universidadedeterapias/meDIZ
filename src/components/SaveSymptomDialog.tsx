// components/SaveSymptomDialog.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Folder, Save, Plus } from 'lucide-react'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'
import { UpgradeModal } from '@/components/UpgradeModal'
import { useTranslation } from '@/i18n/useTranslation'

type SymptomFolder = {
  id: string
  name: string
  color?: string | null
  notes?: string | null
  symptoms: Array<{ id: string; symptom: string }>
}

type SaveSymptomDialogProps = {
  symptom: string
  threadId?: string
  onSaved?: () => void // Callback para atualizar lista na sidebar
  triggerClassName?: string // Classe CSS customizada para o botão trigger
}

export function SaveSymptomDialog({ symptom, threadId, onSaved, triggerClassName }: SaveSymptomDialogProps) {
  const { t } = useTranslation()
  const [folders, setFolders] = useState<SymptomFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderNotes, setNewFolderNotes] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [openUpgradeModal, setOpenUpgradeModal] = useState(false)
  
  // Novos campos do sintoma
  const [symptomStartPeriod, setSymptomStartPeriod] = useState('')
  const [emotionalHistory, setEmotionalHistory] = useState('')
  const [copingStrategy, setCopingStrategy] = useState<string>('')

  const { isPremium, isLoading: isLoadingPremium } = useSubscriptionStatus()

  useEffect(() => {
    if (open) {
      loadFolders()
    }
  }, [open])

  async function loadFolders() {
    setLoading(true)
    try {
      console.log('[SaveSymptomDialog] Carregando pastas...')
      const res = await fetch('/api/folders')
      if (!res.ok) {
        console.error('[SaveSymptomDialog] Erro ao carregar pastas:', res.status)
        return
      }
      const data = await res.json()
      console.log('[SaveSymptomDialog] Pastas carregadas:', data)
      setFolders(data)
    } catch (error) {
      // Evita logar objetos Event diretamente
      if (error instanceof Error) {
        console.error('[SaveSymptomDialog] Erro ao carregar pastas:', {
          name: error.name,
          message: error.message
        })
      } else {
        console.error('[SaveSymptomDialog] Erro ao carregar pastas:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return

    // Verificar premium antes de criar
    if (!isPremium) {
      setOpenUpgradeModal(true)
      return
    }

    setCreatingFolder(true)
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newFolderName.trim(),
          notes: newFolderNotes.trim() || null
        })
      })

      if (res.ok) {
        const newFolder = await res.json()
        setFolders([...folders, newFolder])
        setSelectedFolderId(newFolder.id)
        setNewFolderName('')
        setNewFolderNotes('')
        setShowCreateFolder(false)
        console.log('[SaveSymptomDialog] Pasta criada:', newFolder)
      } else {
        const data = await res.json()
        alert(`Erro ao criar pasta: ${data.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('[SaveSymptomDialog] Erro ao criar pasta:', error)
      alert('Erro ao criar pasta')
    } finally {
      setCreatingFolder(false)
    }
  }

  async function handleSave() {
    if (!selectedFolderId) return

    // Verificar premium antes de salvar
    if (!isPremium) {
      setOpenUpgradeModal(true)
      return
    }

    setSaving(true)
    try {
      console.log('[SaveSymptomDialog] Salvando sintoma:', { 
        folderId: selectedFolderId, 
        symptom, 
        threadId,
        symptomStartPeriod,
        emotionalHistory,
        copingStrategy
      })
      const res = await fetch('/api/symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: selectedFolderId,
          symptom,
          threadId,
          symptomStartPeriod: symptomStartPeriod.trim() || null,
          emotionalHistory: emotionalHistory.trim() || null,
          copingStrategy: copingStrategy || null
        })
      })

      if (res.ok) {
        const saved = await res.json()
        console.log('[SaveSymptomDialog] Sintoma salvo:', saved)
        setOpen(false)
        setSelectedFolderId(null)
        // Limpar campos
        setSymptomStartPeriod('')
        setEmotionalHistory('')
        setCopingStrategy('')
        
        // Callback para atualizar a sidebar
        if (onSaved) {
          onSaved()
        }
        
        // Feedback visual melhorado
        alert('✅ Sintoma salvo com sucesso!')
      } else {
        const data = await res.json()
        alert(`❌ Erro: ${data.error || 'Não foi possível salvar o sintoma'}`)
      }
    } catch (error) {
      // Evita logar objetos Event diretamente
      if (error instanceof Error) {
        console.error('[SaveSymptomDialog] Erro ao salvar sintoma:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
        alert(`❌ Erro ao salvar sintoma: ${error.message}`)
      } else if (error && typeof error === 'object' && 'type' in error) {
        // Pode ser um Event object
        console.error('[SaveSymptomDialog] Erro (tipo: Event):', (error as { type?: string }).type || 'Unknown')
        alert('❌ Erro ao salvar sintoma. Tente novamente.')
      } else {
        console.error('[SaveSymptomDialog] Erro ao salvar sintoma:', error)
        alert('❌ Erro ao salvar sintoma. Tente novamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (folders.length === 0 && !loading && !showCreateFolder) {
    return (
      <>
        <Dialog open={open} onOpenChange={(openState) => {
          if (!openState) {
            setOpen(false)
            return
          }
          // Verificar premium ao abrir
          if (!isPremium && !isLoadingPremium) {
            setOpenUpgradeModal(true)
            return
          }
          setOpen(true)
        }}>
          <DialogTrigger asChild>
            <Button 
              className={triggerClassName || "w-full"}
              onClick={(e) => {
                if (!isPremium && !isLoadingPremium) {
                  e.preventDefault()
                  setOpenUpgradeModal(true)
                }
              }}
            >
              <Save />
              <span>{t('symptom.save', 'Salvar Sintoma')}</span>
            </Button>
          </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('symptom.save.title', 'Salvar Sintoma')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('symptom.save.noFolders', 'Você ainda não criou nenhuma pasta. Crie uma pasta para começar a organizar seus sintomas.')}
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-folder-name">{t('folders.folderName', 'Nome da pasta')}</Label>
                <Input
                  id="new-folder-name"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder={t('folders.folderNamePlaceholder', 'Ex: João Silva')}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && newFolderName.trim() && handleCreateFolder()}
                />
              </div>
              <div>
                <Label htmlFor="new-folder-notes">{t('folders.notes', 'Observações (opcional)')}</Label>
                <Textarea
                  id="new-folder-notes"
                  value={newFolderNotes}
                  onChange={e => setNewFolderNotes(e.target.value)}
                  placeholder={t('folders.observationsPlaceholder', 'Adicione observações sobre esta pasta...')}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleCreateFolder} 
                disabled={!newFolderName.trim() || creatingFolder}
                className="w-full"
              >
                {creatingFolder ? t('symptom.save.creating', 'Criando...') : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('symptom.save.createAndSave', 'Criar Pasta e Salvar')}
                  </>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('general.cancel', 'Cancelar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <UpgradeModal 
        open={openUpgradeModal}
        onOpenChange={setOpenUpgradeModal}
      />
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(openState) => {
        if (!openState) {
          setOpen(false)
          return
        }
        // Verificar premium ao abrir
        if (!isPremium && !isLoadingPremium) {
          setOpenUpgradeModal(true)
          return
        }
        setOpen(true)
      }}>
        <DialogTrigger asChild>
          <Button 
            className={triggerClassName || "w-full"}
            onClick={(e) => {
              if (!isPremium && !isLoadingPremium) {
                e.preventDefault()
                setOpenUpgradeModal(true)
              }
            }}
          >
            <Save />
            <span>{t('symptom.save', 'Salvar Sintoma')}</span>
          </Button>
        </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('symptom.save.title', 'Salvar Sintoma')}: "{symptom}"</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t('folders.loading', 'Carregando pastas...')}
            </div>
          ) : showCreateFolder ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-folder-name">{t('folders.folderName', 'Nome da pasta')}</Label>
                <Input
                  id="create-folder-name"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder={t('folders.folderNamePlaceholder', 'Ex: João Silva')}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && newFolderName.trim()) {
                      handleCreateFolder()
                    }
                    if (e.key === 'Escape') {
                      setShowCreateFolder(false)
                      setNewFolderName('')
                      setNewFolderNotes('')
                    }
                  }}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="create-folder-notes">{t('folders.notes', 'Observações (opcional)')}</Label>
                <Textarea
                  id="create-folder-notes"
                  value={newFolderNotes}
                  onChange={e => setNewFolderNotes(e.target.value)}
                  placeholder={t('folders.observationsPlaceholder', 'Adicione observações sobre esta pasta...')}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateFolder(false)
                    setNewFolderName('')
                    setNewFolderNotes('')
                  }}
                  className="flex-1"
                >
                  {t('general.back', 'Voltar')}
                </Button>
                <Button 
                  onClick={handleCreateFolder} 
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="flex-1"
                >
                  {creatingFolder ? t('symptom.save.creating', 'Criando...') : t('folders.create', 'Criar')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{t('symptom.save.chooseFolder', 'Escolha uma pasta:')}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateFolder(true)}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {t('symptom.save.newFolder', 'Nova pasta')}
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {folders.map(folder => (
                  <Button
                    key={folder.id}
                    variant={selectedFolderId === folder.id ? 'default' : 'outline'}
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <Folder className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                    <span className="ml-auto text-xs opacity-70">
                      ({folder.symptoms.length})
                    </span>
                  </Button>
                ))}
              </div>
              
              {/* Campos adicionais do sintoma */}
              {selectedFolderId && (
                <div className="space-y-4 mt-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="symptom-start-period">
                      {t('symptom.startPeriod', 'Desde quando sente esse sintoma?')}
                    </Label>
                    <Input
                      id="symptom-start-period"
                      value={symptomStartPeriod}
                      onChange={e => setSymptomStartPeriod(e.target.value)}
                      placeholder={t('symptom.startPeriodPlaceholder', 'Ex: há 2 semanas, desde janeiro')}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="emotional-history">
                      {t('symptom.emotionalHistory', 'Histórico emocional do sintoma')}
                    </Label>
                    <Textarea
                      id="emotional-history"
                      value={emotionalHistory}
                      onChange={e => setEmotionalHistory(e.target.value)}
                      placeholder={t('symptom.emotionalHistoryPlaceholder', 'Descreva como você se sentiu em relação a este sintoma...')}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="coping-strategy">
                      {t('symptom.copingStrategy', 'Como você encarou a situação?')}
                    </Label>
                    <Select value={copingStrategy} onValueChange={setCopingStrategy}>
                      <SelectTrigger id="coping-strategy" className="mt-1">
                        <SelectValue placeholder={t('symptom.copingStrategyPlaceholder', 'Selecione uma opção...')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACCEPTED_AND_SOUGHT_HELP">
                          {t('symptom.coping.accepted', 'Aceitei e busquei ajuda')}
                        </SelectItem>
                        <SelectItem value="DENIED_INITIALLY">
                          {t('symptom.coping.denied', 'Neguei inicialmente')}
                        </SelectItem>
                        <SelectItem value="IGNORED_SYMPTOM">
                          {t('symptom.coping.ignored', 'Ignorei o sintoma')}
                        </SelectItem>
                        <SelectItem value="SOUGHT_INFO_ALONE">
                          {t('symptom.coping.infoAlone', 'Busquei informações sozinho')}
                        </SelectItem>
                        <SelectItem value="SHARED_WITH_FAMILY_FRIENDS">
                          {t('symptom.coping.shared', 'Compartilhei com familiares/amigos')}
                        </SelectItem>
                        <SelectItem value="OTHER">
                          {t('symptom.coping.other', 'Outro')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {!showCreateFolder && (
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOpen(false)
              setSymptomStartPeriod('')
              setEmotionalHistory('')
              setCopingStrategy('')
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!selectedFolderId || saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
    
    <UpgradeModal 
      open={openUpgradeModal}
      onOpenChange={setOpenUpgradeModal}
    />
    </>
  )
}
