'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, Calendar, Database, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface JobLog {
  data: string
  sucesso: boolean
  sintomasProcessados: number
  totalSessoes: number
  erro?: string
  duracaoMs: number
}

interface CacheData {
  sintomas: { sintoma: string; quantidade: number }[]
  totalProcessados: number
  ultimaAtualizacao: string
  periodo: string
}

export default function SintomasMetricsPage() {
  const [logs, setLogs] = useState<JobLog[]>([])
  const [cacheData, setCacheData] = useState<CacheData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Carrega logs do job
      const logsResponse = await fetch('/api/admin/symptoms-metrics')
      const logsData = await logsResponse.json()
      
      if (logsData.success) {
        setLogs(logsData.logs || [])
        setCacheData(logsData.cacheData || null)
      } else {
        setError(logsData.error || 'Erro ao carregar métricas')
      }
    } catch {
      setError('Erro ao carregar métricas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusIcon = (sucesso: boolean) => {
    return sucesso ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-500" />
    )
  }

  const getStatusBadge = (sucesso: boolean) => {
    return sucesso ? (
      <Badge className="bg-green-100 text-green-800">Sucesso</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Erro</Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Métricas de Sintomas</h1>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="ml-2">Carregando métricas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Métricas de Sintomas</h1>
        <Button onClick={loadMetrics} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status do Cache */}
      {cacheData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Status do Cache
            </CardTitle>
            <CardDescription>
              Informações sobre os sintomas atualmente em cache
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Última Atualização</p>
                <p className="font-semibold">{formatDate(cacheData.ultimaAtualizacao)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Período Analisado</p>
                <p className="font-semibold">{cacheData.periodo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Processado</p>
                <p className="font-semibold">{cacheData.totalProcessados} sessões</p>
              </div>
            </div>
            
            {cacheData.sintomas.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Top Sintomas Atuais</p>
                <div className="flex flex-wrap gap-2">
                  {cacheData.sintomas.slice(0, 5).map((sintoma, index) => (
                    <Badge key={index} variant="outline">
                      {sintoma.sintoma} ({sintoma.quantidade})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico de Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Histórico de Atualizações
          </CardTitle>
          <CardDescription>
            Log das últimas execuções do job semanal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhum log encontrado. O job ainda não foi executado.
            </p>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.sucesso)}
                      <span className="font-medium">{formatDate(log.data)}</span>
                      {getStatusBadge(log.sucesso)}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDuration(log.duracaoMs)}
                    </span>
                  </div>
                  
                  {log.sucesso ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Sessões Processadas:</span>
                        <span className="ml-2 font-medium">{log.totalSessoes}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sintomas Únicos:</span>
                        <span className="ml-2 font-medium">{log.sintomasProcessados}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      <span className="font-medium">Erro:</span> {log.erro}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Frequência de Atualização</p>
              <p className="font-medium">Semanal (Segunda-feira às 04h)</p>
            </div>
            <div>
              <p className="text-gray-600">Período de Análise</p>
              <p className="font-medium">Últimos 30 dias</p>
            </div>
            <div>
              <p className="text-gray-600">Sintomas Exibidos</p>
              <p className="font-medium">Top 10 mais pesquisados</p>
            </div>
            <div>
              <p className="text-gray-600">Cache</p>
              <p className="font-medium">Arquivo local (8 dias de validade)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

