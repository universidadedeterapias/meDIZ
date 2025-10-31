'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Shield, 
  AlertTriangle, 
  Database,
  Terminal,
  Filter,
  RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface InjectionAttempt {
  id: string
  type: 'SQL_INJECTION' | 'COMMAND_INJECTION'
  severity: 'low' | 'medium' | 'high' | 'critical'
  pattern: string
  location: string
  field?: string
  value?: string
  endpoint: string
  method: string
  ipAddress: string
  userAgent?: string
  blocked: boolean
  alertSent: boolean
  createdAt: string
}

interface Stats {
  total: number
  sqlInjection: number
  commandInjection: number
  critical: number
  last24h: number
}

export default function InjectionAttemptsPage() {
  const [attempts, setAttempts] = useState<InjectionAttempt[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [searchIp, setSearchIp] = useState('')

  const loadAttempts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterSeverity !== 'all') params.set('severity', filterSeverity)
      if (searchIp) params.set('ip', searchIp)
      
      const response = await fetch(`/api/admin/injection-attempts?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setAttempts(data.attempts || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Erro ao carregar tentativas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttempts()
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadAttempts, 30000)
    return () => clearInterval(interval)
  }, [filterType, filterSeverity, searchIp])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50'
      case 'high':
        return 'text-orange-600 bg-orange-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'SQL_INJECTION' ? (
      <Database className="h-4 w-4" />
    ) : (
      <Terminal className="h-4 w-4" />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Tentativas de Injeção Detectadas
        </h1>
        <p className="text-gray-600">
          Monitoramento em tempo real de SQL Injection e Command Injection
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">SQL Injection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.sqlInjection}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Command Injection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.commandInjection}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Últimas 24h</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.last24h}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="SQL_INJECTION">SQL Injection</SelectItem>
                  <SelectItem value="COMMAND_INJECTION">Command Injection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Severidade</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>IP Address</Label>
              <Input
                placeholder="Buscar por IP..."
                value={searchIp}
                onChange={(e) => setSearchIp(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={loadAttempts} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Tentativas */}
      <Card>
        <CardHeader>
          <CardTitle>Tentativas Detectadas</CardTitle>
          <CardDescription>
            Lista de todas as tentativas de injeção bloqueadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma tentativa detectada ainda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Padrão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(attempt.type)}
                          <span className="font-medium">
                            {attempt.type === 'SQL_INJECTION' ? 'SQL' : 'Command'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(attempt.severity)}`}>
                          {attempt.severity.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-mono text-xs">{attempt.method}</div>
                          <div className="text-sm text-gray-500">{attempt.endpoint}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{attempt.ipAddress}</code>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="text-xs font-medium">{attempt.pattern}</div>
                          {attempt.field && (
                            <div className="text-xs text-gray-500">Campo: {attempt.field}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {attempt.blocked && (
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <Shield className="h-3 w-3" />
                              Bloqueado
                            </div>
                          )}
                          {attempt.alertSent && (
                            <div className="flex items-center gap-1 text-blue-600 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Alerta Enviado
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(attempt.createdAt), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

