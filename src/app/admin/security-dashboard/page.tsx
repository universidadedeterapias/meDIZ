'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  AlertTriangle, 
  Download,
  Ban,
  RefreshCw
} from 'lucide-react'

interface SecurityMetrics {
  loginAttempts: {
    total24h: number
    failed24h: number
    success24h: number
    successRate: string
  }
  securityAlerts: {
    last24h: number
    last7d: number
  }
  dataExports: {
    last24h: number
  }
  blockedIPs: {
    count: number
    list: Array<{
      ip: string
      attempts: number
      blockedUntil: Date
    }>
  }
  logs: {
    totalAuditLogs: number
    oldAuditLogs: number
    totalSecurityLogs: number
    oldSecurityLogs: number
  }
  hourlyAttempts: Array<{
    hour: string
    count: number
  }>
  topIPs: Array<{
    ip: string
    attempts: number
  }>
}

export default function SecurityDashboardPage() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/admin/security-dashboard')
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
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Segurança</h1>
          <p className="text-gray-600">
            Métricas em tempo real do sistema de segurança
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="text-sm text-gray-500">
        Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tentativas de Login (24h)</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.loginAttempts.total24h}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.loginAttempts.failed24h} falhas / {metrics.loginAttempts.success24h} sucessos
            </p>
            <p className="text-xs text-green-600 mt-1">
              Taxa de sucesso: {metrics.loginAttempts.successRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Segurança</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.securityAlerts.last24h}</div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.securityAlerts.last7d} nos últimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Bloqueados</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.blockedIPs.count}</div>
            <p className="text-xs text-muted-foreground">
              IPs bloqueados atualmente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exportações (24h)</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dataExports.last24h}</div>
            <p className="text-xs text-muted-foreground">
              Exportações de dados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* IPs Bloqueados */}
      {metrics.blockedIPs.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>IPs Bloqueados</CardTitle>
            <CardDescription>
              IPs bloqueados devido a múltiplas tentativas de login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.blockedIPs.list.map((blocked, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{blocked.ip}</div>
                    <div className="text-sm text-gray-600">
                      {blocked.attempts} tentativas
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Bloqueado até: {new Date(blocked.blockedUntil).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top IPs com Tentativas */}
      {metrics.topIPs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top IPs com Tentativas Falhadas (24h)</CardTitle>
            <CardDescription>
              IPs com mais tentativas de login falhadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.topIPs.map((ip, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div className="font-medium">{ip.ip}</div>
                  <div className="text-sm text-orange-600 font-semibold">
                    {ip.attempts} tentativas
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Logs</CardTitle>
          <CardDescription>
            Informações sobre logs de auditoria e segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total de Logs</div>
              <div className="text-2xl font-bold">{metrics.logs.totalAuditLogs.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Logs Antigos</div>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.logs.oldAuditLogs.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Logs de Segurança</div>
              <div className="text-2xl font-bold">{metrics.logs.totalSecurityLogs.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Segurança Antigos</div>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.logs.oldSecurityLogs.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Tentativas por Hora */}
      <Card>
        <CardHeader>
          <CardTitle>Tentativas de Login por Hora (Últimas 24h)</CardTitle>
          <CardDescription>
            Distribuição temporal de tentativas falhadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {metrics.hourlyAttempts.map((hour, index) => {
              const maxCount = Math.max(...metrics.hourlyAttempts.map(h => h.count), 1)
              const height = (hour.count / maxCount) * 100
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-red-500 rounded-t transition-all"
                    style={{ height: `${height}%` }}
                    title={`${hour.count} tentativas às ${new Date(hour.hour).toLocaleTimeString('pt-BR', { hour: '2-digit' })}h`}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(hour.hour).toLocaleTimeString('pt-BR', { hour: '2-digit' })}h
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

