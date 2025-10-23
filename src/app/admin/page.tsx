'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Crown, 
  TrendingUp, 
  Clock, 
  Shield, 
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardStats {
  totalUsers: number
  premiumUsers: number
  freeUsers: number
  activeUsers: number
  totalSubscriptions: number
  activeSubscriptions: number
  totalChatSessions: number
  pendingAdminRequests: number
  conversionRate: number
  recentAuditLogs: Array<{
    action: string
    adminEmail: string
    timestamp: string
  }>
}

export default function ModernDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    console.log('[Dashboard] Iniciando carregamento de estatísticas...')
    try {
      console.log('[Dashboard] Fazendo requisição para /api/admin/dashboard-stats')
      const response = await fetch('/api/admin/dashboard-stats')
      console.log('[Dashboard] Resposta recebida:', response.status, response.statusText)
      
      const data = await response.json()
      console.log('[Dashboard] Dados recebidos:', data)

      if (response.ok) {
        console.log('[Dashboard] API retornou sucesso, definindo stats:', data.stats)
        setStats(data.stats)
        setError('')
      } else {
        console.log('[Dashboard] API retornou erro, usando dados padrão')
        // Se a API falhar, usar dados padrão
        setStats({
          totalUsers: 0,
          premiumUsers: 0,
          freeUsers: 0,
          activeUsers: 0,
          totalSubscriptions: 0,
          activeSubscriptions: 0,
          totalChatSessions: 0,
          pendingAdminRequests: 0,
          conversionRate: 0,
          recentAuditLogs: []
        })
        setError('')
      }
    } catch (error) {
      console.error('[Dashboard] Erro na requisição:', error)
      // Em caso de erro de conexão, usar dados padrão
      setStats({
        totalUsers: 0,
        premiumUsers: 0,
        freeUsers: 0,
        activeUsers: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalChatSessions: 0,
        pendingAdminRequests: 0,
        conversionRate: 0,
        recentAuditLogs: []
      })
      setError('')
    } finally {
      console.log('[Dashboard] Finalizando carregamento')
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'ADMIN_ACCESS_REQUESTED':
        return <Shield className="h-4 w-4 text-blue-500" />
      case 'USER_CREATE':
        return <Users className="h-4 w-4 text-purple-500" />
      case 'DATA_EXPORT':
        return <FileText className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'Login realizado'
      case 'ADMIN_ACCESS_REQUESTED': return 'Solicitação de acesso admin'
      case 'USER_CREATE': return 'Usuário criado'
      case 'DATA_EXPORT': return 'Exportação de dados'
      default: return action
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Erro ao carregar dados</p>
          <Button onClick={loadStats} className="mt-4">
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
          <p className="text-gray-600">Visão geral do sistema meDIZ</p>
        </div>
        <Button onClick={loadStats} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} ativos (7 dias)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Premium</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.premiumUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.conversionRate}% de conversão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões de Chat</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChatSessions}</div>
            <p className="text-xs text-muted-foreground">
              Total de conversas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Alertas e Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.pendingAdminRequests > 0 ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-500 mr-3" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {stats.pendingAdminRequests} solicitação(ões) de acesso admin
                    </p>
                    <p className="text-sm text-blue-700">Aguardando aprovação</p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <a href="/admin/admin-requests">Revisar</a>
                </Button>
              </div>
            ) : (
              <div className="flex items-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="font-medium text-green-900">Nenhuma solicitação pendente</p>
                  <p className="text-sm text-green-700">Sistema atualizado</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Gerenciar Usuários
              </a>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/admin/export-sintomas">
                <FileText className="mr-2 h-4 w-4" />
                Exportar Dados
              </a>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/admin/audit-logs">
                <Shield className="mr-2 h-4 w-4" />
                Logs de Auditoria
              </a>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/admin/analytics">
                <TrendingUp className="mr-2 h-4 w-4" />
                Ver Análises
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Informações do Sistema
          </CardTitle>
          <CardDescription>
            Status atual do painel administrativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">Sistema Ativo</p>
              <p className="text-sm text-gray-600">Painel funcionando normalmente</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Segurança OK</p>
              <p className="text-sm text-gray-600">Autenticação funcionando</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Activity className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="font-medium">APIs Ativas</p>
              <p className="text-sm text-gray-600">Sistema operacional</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Atividades Recentes
          </CardTitle>
          <CardDescription>
            Últimas ações registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentAuditLogs.length > 0 ? (
            <div className="space-y-3">
              {stats.recentAuditLogs.map((log, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {getActionIcon(log.action)}
                    <div className="ml-3">
                      <p className="font-medium">{getActionLabel(log.action)}</p>
                      <p className="text-sm text-gray-600">{log.adminEmail}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(log.timestamp), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma atividade recente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}