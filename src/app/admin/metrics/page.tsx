'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  TrendingUp, 
  MessageSquare, 
  CreditCard,
  Activity,
  RefreshCw,
  Database,
  Server,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MetricsData {
  users: {
    total: number
    active: number
    premium: number
    newToday: number
    newThisWeek: number
  }
  performance: {
    avgResponseTime: number
    requestsLastHour: number
    errorRate: number
  }
  chat: {
    totalSessions: number
    sessionsToday: number
    avgMessagesPerSession: number
  }
  subscriptions: {
    total: number
    active: number
    cancelled: number
    revenue: number
  }
  services: {
    database: 'healthy' | 'degraded' | 'unhealthy'
    redis: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured'
  }
  timestamp: string
  cached: boolean
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics')
      const data = await response.json()
      
      if (data.success) {
        setMetrics(data.metrics)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadMetrics()
  }

  useEffect(() => {
    loadMetrics()
    
    // Atualizar a cada 1 minuto
    const interval = setInterval(loadMetrics, 60000)
    return () => clearInterval(interval)
  }, [])

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getServiceStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Saudável</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degradado</Badge>
      case 'unhealthy':
        return <Badge className="bg-red-100 text-red-800">Indisponível</Badge>
      case 'not_configured':
        return <Badge className="bg-gray-100 text-gray-800">Não Configurado</Badge>
      default:
        return <Badge>Desconhecido</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Erro ao carregar métricas</p>
        <Button onClick={handleRefresh} className="mt-4">
          Tentar novamente
        </Button>
      </div>
    )
  }

  // Dados para gráficos
  const userGrowthData = [
    { name: 'Hoje', value: metrics.users.newToday },
    { name: 'Esta Semana', value: metrics.users.newThisWeek },
    { name: 'Ativos (7d)', value: metrics.users.active },
    { name: 'Total', value: metrics.users.total }
  ]

  const subscriptionData = [
    { name: 'Ativas', value: metrics.subscriptions.active },
    { name: 'Canceladas', value: metrics.subscriptions.cancelled },
    { name: 'Total', value: metrics.subscriptions.total }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Métricas do Sistema</h1>
          <p className="text-gray-600">
            Visão geral em tempo real do desempenho da aplicação
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
            {metrics.cached && <span className="ml-2 text-blue-500">(Cache)</span>}
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status dos Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status dos Serviços</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">Banco de Dados</span>
                </div>
                <div className="flex items-center gap-2">
                  {getServiceStatusIcon(metrics.services.database)}
                  {getServiceStatusBadge(metrics.services.database)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">Redis</span>
                </div>
                <div className="flex items-center gap-2">
                  {getServiceStatusIcon(metrics.services.redis)}
                  {getServiceStatusBadge(metrics.services.redis)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tempo Médio de Resposta</span>
                <span className="text-sm font-medium">
                  {metrics.performance.avgResponseTime > 0 
                    ? `${metrics.performance.avgResponseTime}ms` 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Requisições (última hora)</span>
                <span className="text-sm font-medium">
                  {metrics.performance.requestsLastHour > 0 
                    ? metrics.performance.requestsLastHour 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Taxa de Erro</span>
                <span className="text-sm font-medium">
                  {metrics.performance.errorRate > 0 
                    ? `${metrics.performance.errorRate}%` 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários
          </CardTitle>
          <CardDescription>Estatísticas de usuários da plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{metrics.users.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ativos (7d)</p>
              <p className="text-2xl font-bold">{metrics.users.active.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Premium</p>
              <p className="text-2xl font-bold">{metrics.users.premium.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Novos Hoje</p>
              <p className="text-2xl font-bold">{metrics.users.newToday.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Novos (7d)</p>
              <p className="text-2xl font-bold">{metrics.users.newThisWeek.toLocaleString()}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Métricas de Chat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat
            </CardTitle>
            <CardDescription>Estatísticas de conversas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total de Sessões</p>
                <p className="text-2xl font-bold">{metrics.chat.totalSessions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sessões Hoje</p>
                <p className="text-2xl font-bold">{metrics.chat.sessionsToday.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Média de Mensagens/Sessão</p>
                <p className="text-2xl font-bold">{metrics.chat.avgMessagesPerSession}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Assinaturas
            </CardTitle>
            <CardDescription>Estatísticas de assinaturas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{metrics.subscriptions.total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ativas</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.subscriptions.active.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">
                  {metrics.subscriptions.cancelled.toLocaleString()}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={subscriptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
