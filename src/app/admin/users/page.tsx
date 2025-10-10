'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  UserPlus,
  Mail,
  Calendar,
  Shield,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  CreditCard
} from 'lucide-react'
import { SubscriptionManager } from '@/components/admin/SubscriptionManager'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface User {
  id: string
  name: string
  email: string
  createdAt: string
  isAdmin: boolean
  plan: 'free' | 'premium'
  lastLogin?: string
  totalSearches: number
  userPeriod?: string
  searchLimit?: number
  fullVisualization?: boolean
  hasActiveSubscription?: boolean
  subscriptionDetails?: {
    id: string
    planName: string
    status: string
    currentPeriodEnd: string
    currentPeriodStart: string
  } | null
  totalSubscriptions?: number
  providers?: string[]
}

interface UserStats {
  totalUsers: number
  premiumUsers: number
  freeUsers: number
  adminUsers: number
  activeUsers: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'premium'>('all')
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false)
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [creatingUser, setCreatingUser] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        search: searchTerm,
        plan: filterPlan,
        role: filterRole
      })

      const response = await fetch(`/api/admin/users?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários')
      }

      const data = await response.json()
      setUsers(data.users)
      setStats(data.stats)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao buscar usuários:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchTerm, filterPlan, filterRole])

  const handleCreateUser = async () => {
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      alert('Por favor, preencha todos os campos')
      return
    }

    try {
      setCreatingUser(true)
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUserData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar usuário')
      }

      const newUser = await response.json()
      console.log('Usuário criado:', newUser)
      
      // Limpar formulário
      setNewUserData({
        name: '',
        email: '',
        password: ''
      })
      
      // Fechar modal
      setIsCreateUserDialogOpen(false)
      
      // Recarregar lista de usuários
      fetchUsers()
      
      alert('Usuário criado com sucesso!')
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      alert(`Erro ao criar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setCreatingUser(false)
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      const response = await fetch(`/api/admin/export?type=users&format=${format}`)
      
      if (!response.ok) {
        throw new Error('Erro ao exportar dados')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usuarios_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Erro na exportação:', err)
      alert('Erro ao exportar dados')
    }
  }

  // Os usuários já vêm filtrados da API, então não precisamos filtrar novamente
  const filteredUsers = users

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getPlanBadgeColor = (plan: string) => {
    return plan === 'premium' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const getRoleBadgeColor = (isAdmin: boolean) => {
    return isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('xlsx')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar XLSX
          </Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setIsCreateUserDialogOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="users">Lista de Usuários</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-indigo-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                    <p className="text-xs text-gray-500">Usuários registrados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Usuários Premium
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.premiumUsers || 0}</p>
                    <p className="text-xs text-gray-500">
                      {stats?.totalUsers ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1) : '0'}% do total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Administradores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <UserCheck className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.adminUsers || 0}</p>
                    <p className="text-xs text-gray-500">Usuários admin</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Usuários Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <UserCheck className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">{stats?.activeUsers || 0}</p>
                    <p className="text-xs text-gray-500">Últimos 7 dias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de crescimento (simulado) */}
          <Card>
            <CardHeader>
              <CardTitle>Crescimento de Usuários</CardTitle>
              <CardDescription>
                Novos usuários registrados nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-gray-50 rounded-md p-4 flex items-center justify-center">
                <p className="text-gray-500">Gráfico de crescimento em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {/* Filtros e busca */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros e Busca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Todos os planos</option>
                    <option value="free">Plano Gratuito</option>
                    <option value="premium">Plano Premium</option>
                  </select>
                  
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="admin">Administradores</option>
                    <option value="user">Usuários</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Lista de todos os usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="flex items-center justify-center py-12 text-red-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span>{error}</span>
                </div>
              )}
              
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : !error && (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{user.name}</h3>
                            <Badge className={getPlanBadgeColor(user.plan)}>
                              {user.plan === 'premium' ? 'Premium' : 'Gratuito'}
                            </Badge>
                            {user.isAdmin && (
                              <Badge className={getRoleBadgeColor(user.isAdmin)}>
                                Admin
                              </Badge>
                            )}
                            {user.userPeriod && (
                              <Badge variant="outline" className="text-xs">
                                {user.userPeriod === 'first-week' ? '1-7 dias' : 
                                 user.userPeriod === 'first-month' ? '8-30 dias' : '31+ dias'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Registrado em {formatDate(user.createdAt)}
                            </span>
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {user.totalSearches} pesquisas
                            </span>
                            {user.lastLogin && (
                              <span className="flex items-center">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Último login: {formatDate(user.lastLogin)}
                              </span>
                            )}
                            {user.subscriptionDetails && (
                              <span className="flex items-center">
                                <Shield className="h-3 w-3 mr-1" />
                                Vence: {formatDate(user.subscriptionDetails.currentPeriodEnd)}
                              </span>
                            )}
                          </div>
                          {user.providers && user.providers.length > 0 && (
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-400">Login via:</span>
                              {user.providers.map(provider => (
                                <Badge key={provider} variant="outline" className="text-xs">
                                  {provider}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Assinaturas
                        </Button>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                        {!user.isAdmin && (
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {filteredUsers.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum usuário encontrado</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Paginação */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * 50) + 1} a {Math.min(currentPage * 50, pagination.total)} de {pagination.total} usuários
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {currentPage} de {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                      disabled={currentPage === pagination.totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análises de Usuários</CardTitle>
              <CardDescription>
                Métricas e análises detalhadas sobre os usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <p className="text-gray-500">
                Módulo de análises de usuários em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de gerenciamento de assinaturas */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Assinaturas - {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <SubscriptionManager
              userId={selectedUser.id}
              userName={selectedUser.name}
              userEmail={selectedUser.email}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para criar novo usuário */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <Input
                type="text"
                value={newUserData.name}
                onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <Input
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Senha temporária"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateUserDialogOpen(false)}
                disabled={creatingUser}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateUser}
                disabled={creatingUser}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {creatingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Usuário'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
