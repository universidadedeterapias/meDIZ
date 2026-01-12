'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ArrowLeft, Search, Bell, Users, Clock, CheckCircle, XCircle, Plus, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'

interface Reminder {
  id: string
  title: string
  message: string
  time: string
  daysOfWeek: number[]
  active: boolean
  createdAt: string
  updatedAt: string
  lastSentAt: string | null
  userId: string | null
  user: {
    id: string
    name: string | null
    email: string
  } | null
}

interface ReminderStats {
  totalReminders: number
  activeReminders: number
  inactiveReminders: number
  totalUsersWithReminders: number
  remindersByDay: Record<number, number>
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' }
]

interface User {
  id: string
  name: string | null
  email: string
}

export default function AdminRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<ReminderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    userId: '',
    sendToAll: false,
    title: '',
    message: '',
    time: '09:00',
    daysOfWeek: [] as number[],
    active: true
  })

  useEffect(() => {
    loadReminders()
    loadUsers()
  }, [])

  const loadReminders = async () => {
    try {
      console.log('🔔 [REMINDERS PAGE] Carregando lembretes...')
      const response = await fetch('/api/admin/push/reminders')
      if (!response.ok) throw new Error('Erro ao carregar lembretes')
      const data = await response.json()
      setReminders(data.reminders || [])
      setStats(data.stats || null)
      console.log('✅ [REMINDERS PAGE] Lembretes carregados:', data.reminders?.length || 0)
    } catch (error) {
      console.error('❌ [REMINDERS PAGE] Erro ao carregar lembretes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=1000')
      if (!response.ok) throw new Error('Erro ao carregar usuários')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    }
  }

  const filteredReminders = reminders.filter((reminder) => {
    const search = searchTerm.toLowerCase()
    return (
      reminder.title.toLowerCase().includes(search) ||
      reminder.message.toLowerCase().includes(search) ||
      (reminder.user?.email.toLowerCase().includes(search) || false) ||
      (reminder.user?.name?.toLowerCase().includes(search) || false) ||
      (reminder.userId === null && 'todos os usuários'.includes(search))
    )
  })

  const handleViewReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder)
    setIsDialogOpen(true)
  }

  const handleToggleActive = async (reminder: Reminder) => {
    try {
      const response = await fetch('/api/push/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reminder.id,
          active: !reminder.active
        })
      })

      if (!response.ok) throw new Error('Erro ao atualizar lembrete')

      loadReminders()
    } catch (error) {
      console.error('Erro ao atualizar lembrete:', error)
      alert('Erro ao atualizar lembrete')
    }
  }

  const handleOpenCreateDialog = () => {
    console.log('🔔 [REMINDERS PAGE] Abrindo dialog de criação')
    setFormData({
      userId: '',
      sendToAll: false,
      title: '',
      message: '',
      time: '09:00',
      daysOfWeek: [],
      active: true
    })
    setSelectedReminder(null)
    setIsSubmitting(false)
    setIsCreateDialogOpen(true)
  }

  const handleCloseCreateDialog = () => {
    console.log('🔔 [REMINDERS PAGE] Fechando dialog de criação')
    setIsCreateDialogOpen(false)
    setSelectedReminder(null)
    setIsSubmitting(false)
    // Resetar form apenas se não estiver salvando
    if (!isSubmitting) {
      setFormData({
        userId: '',
        sendToAll: false,
        title: '',
        message: '',
        time: '09:00',
        daysOfWeek: [],
        active: true
      })
    }
  }

  const handleOpenEditDialog = (reminder: Reminder) => {
    setFormData({
      userId: reminder.userId || '',
      sendToAll: reminder.userId === null,
      title: reminder.title,
      message: reminder.message,
      time: reminder.time,
      daysOfWeek: reminder.daysOfWeek,
      active: reminder.active
    })
    setSelectedReminder(reminder)
    setIsCreateDialogOpen(true)
  }

  const handleToggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }))
  }

  const handleSubmitReminder = async () => {
    console.log('🔔 [REMINDER FORM] ========== INÍCIO SUBMIT ==========')
    console.log('🔔 [REMINDER FORM] FormData:', formData)
    console.log('🔔 [REMINDER FORM] Selected Reminder:', selectedReminder)
    
    // Validação
    if ((!formData.sendToAll && !formData.userId) || !formData.title || !formData.message || formData.daysOfWeek.length === 0) {
      console.warn('⚠️ [REMINDER FORM] Validação falhou:', {
        sendToAll: formData.sendToAll,
        userId: formData.userId,
        title: formData.title,
        message: formData.message,
        daysOfWeek: formData.daysOfWeek
      })
      alert('Preencha todos os campos obrigatórios')
      return
    }

    // Prevenir múltiplos submits
    if (isSubmitting) {
      console.warn('⚠️ [REMINDER FORM] Submit já em andamento, ignorando...')
      return
    }

    setIsSubmitting(true)
    console.log('🔔 [REMINDER FORM] Iniciando submit...')

    try {
      const url = '/api/push/reminders'
      const method = selectedReminder ? 'PUT' : 'POST'
      const body = {
        ...(selectedReminder ? { id: selectedReminder.id } : {}),
        userId: formData.sendToAll ? null : formData.userId,
        title: formData.title,
        message: formData.message,
        time: formData.time,
        daysOfWeek: formData.daysOfWeek,
        active: formData.active
      }

      console.log('🔔 [REMINDER FORM] Request:', {
        url,
        method,
        body
      })

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      console.log('🔔 [REMINDER FORM] Response status:', response.status)
      console.log('🔔 [REMINDER FORM] Response ok:', response.ok)

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [REMINDER FORM] Erro na resposta:', error)
        throw new Error(error.error || 'Erro ao salvar lembrete')
      }

      const result = await response.json()
      console.log('✅ [REMINDER FORM] Sucesso:', result)

      // Fechar dialog primeiro
      setIsCreateDialogOpen(false)
      setSelectedReminder(null)
      
      // Resetar form
      setFormData({
        userId: '',
        sendToAll: false,
        title: '',
        message: '',
        time: '09:00',
        daysOfWeek: [],
        active: true
      })
      
      // Recarregar lembretes após um pequeno delay para garantir que o dialog fechou
      setTimeout(() => {
        loadReminders()
      }, 100)
      
      console.log('✅ [REMINDER FORM] ========== FIM SUBMIT (SUCESSO) ==========')
    } catch (error) {
      console.error('❌ [REMINDER FORM] Erro ao salvar lembrete:', error)
      if (error instanceof Error) {
        console.error('❌ [REMINDER FORM] Mensagem:', error.message)
        console.error('❌ [REMINDER FORM] Stack:', error.stack)
      }
      alert(error instanceof Error ? error.message : 'Erro ao salvar lembrete')
    } finally {
      setIsSubmitting(false)
      console.log('🔔 [REMINDER FORM] ========== FIM SUBMIT ==========')
    }
  }

  const handleDeleteReminder = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return

    try {
      const response = await fetch(`/api/push/reminders?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao excluir lembrete')

      loadReminders()
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error)
      alert('Erro ao excluir lembrete')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Gerenciar Lembretes
            </h1>
            <p className="text-gray-600 mt-1">
              Crie e gerencie lembretes para os usuários do app
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lembrete
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total de Lembretes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Bell className="h-8 w-8 text-indigo-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalReminders}</p>
                  <p className="text-xs text-gray-500">Lembretes cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Lembretes Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeReminders}</p>
                  <p className="text-xs text-gray-500">
                    {stats.totalReminders > 0
                      ? ((stats.activeReminders / stats.totalReminders) * 100).toFixed(1)
                      : '0'}% do total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Lembretes Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{stats.inactiveReminders}</p>
                  <p className="text-xs text-gray-500">Desativados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Usuários com Lembretes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsersWithReminders}</p>
                  <p className="text-xs text-gray-500">Usuários ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Lembretes</CardTitle>
          <CardDescription>
            Busque por título, mensagem, email ou nome do usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar lembretes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Lembretes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Lembretes</CardTitle>
          <CardDescription>
            {filteredReminders.length} lembrete(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Carregando...</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'Nenhum lembrete encontrado' : 'Nenhum lembrete cadastrado'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Envio</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReminders.map((reminder) => (
                    <TableRow key={reminder.id}>
                      <TableCell>
                        {reminder.userId === null ? (
                          <Badge variant="default" className="bg-indigo-600">
                            Todos os usuários
                          </Badge>
                        ) : (
                          <div>
                            <p className="font-medium">{reminder.user?.name || 'Sem nome'}</p>
                            <p className="text-xs text-gray-500">{reminder.user?.email || ''}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {reminder.title}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {reminder.message}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {reminder.time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {reminder.daysOfWeek.map((day) => (
                            <Badge key={day} variant="outline" className="text-xs">
                              {DAYS_OF_WEEK[day].label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={reminder.active ? 'default' : 'secondary'}
                        >
                          {reminder.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {reminder.lastSentAt ? (
                          <span className="text-xs text-gray-600">
                            {new Date(reminder.lastSentAt).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewReminder(reminder)}
                          >
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditDialog(reminder)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteReminder(reminder.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de visualização */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Lembrete</DialogTitle>
            <DialogDescription>
              Informações completas do lembrete
            </DialogDescription>
          </DialogHeader>

          {selectedReminder && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Usuário</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded">
                  {selectedReminder.userId === null ? (
                    <Badge variant="default" className="bg-indigo-600">
                      Todos os usuários
                    </Badge>
                  ) : (
                    <>
                      <p className="font-medium">{selectedReminder.user?.name || 'Sem nome'}</p>
                      <p className="text-sm text-gray-600">{selectedReminder.user?.email || ''}</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <Label>Título</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded">
                  {selectedReminder.title}
                </div>
              </div>

              <div>
                <Label>Mensagem</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded">
                  {selectedReminder.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Horário</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded">
                    {selectedReminder.time}
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge
                      variant={selectedReminder.active ? 'default' : 'secondary'}
                    >
                      {selectedReminder.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label>Dias da Semana</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedReminder.daysOfWeek.map((day) => (
                    <Badge key={day} variant="outline">
                      {DAYS_OF_WEEK[day].label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Criado em</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    {new Date(selectedReminder.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div>
                  <Label>Última atualização</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    {new Date(selectedReminder.updatedAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              {selectedReminder.lastSentAt && (
                <div>
                  <Label>Último envio</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                    {new Date(selectedReminder.lastSentAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Fechar
            </Button>
            {selectedReminder && (
              <Button
                variant={selectedReminder.active ? 'destructive' : 'default'}
                onClick={() => {
                  handleToggleActive(selectedReminder)
                  setIsDialogOpen(false)
                }}
              >
                {selectedReminder.active ? 'Desativar' : 'Ativar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de criar/editar lembrete */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          handleCloseCreateDialog()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReminder ? 'Editar lembrete' : 'Novo lembrete'}
            </DialogTitle>
            <DialogDescription>
              {selectedReminder
                ? 'Edite as informações do lembrete'
                : 'Crie um lembrete para enviar notificações push ao usuário'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="sendToAll"
                checked={formData.sendToAll}
                onCheckedChange={(checked) => {
                  setFormData({
                    ...formData,
                    sendToAll: checked as boolean,
                    userId: checked ? '' : formData.userId
                  })
                }}
                disabled={!!selectedReminder && selectedReminder.userId !== null}
              />
              <Label
                htmlFor="sendToAll"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enviar para todos os usuários
              </Label>
            </div>

            <div>
              <Label htmlFor="userId">
                Usuário {!formData.sendToAll && '*'}
              </Label>
              <Select
                value={formData.userId}
                onValueChange={(value) => setFormData({ ...formData, userId: value, sendToAll: false })}
                disabled={formData.sendToAll || !!selectedReminder}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.sendToAll && (
                <p className="text-xs text-gray-500 mt-1">
                  O lembrete será enviado para todos os usuários com notificações ativadas
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Lembrete de meditação"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="message">Mensagem *</Label>
              <Input
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Ex: Hora de fazer sua meditação diária"
                maxLength={500}
              />
            </div>

            <div>
              <Label htmlFor="time">Horário *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>

            <div>
              <Label>Dias da semana *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={
                      formData.daysOfWeek.includes(day.value)
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => handleToggleDay(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
              {formData.daysOfWeek.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  Selecione pelo menos um dia
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Ativo</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseCreateDialog}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSubmitReminder()
              }} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : selectedReminder ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

