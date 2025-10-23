'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Bell, 
  Send, 
  AlertTriangle, 
  Shield, 
  Smartphone,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SecurityAlert {
  id: string
  type: string
  message: string
  sent: boolean
  timestamp: string
  adminName: string
  adminEmail: string
}

export default function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Formulário de envio
  const [alertType, setAlertType] = useState('')
  const [alertDetails, setAlertDetails] = useState('')
  const [targetAdmin, setTargetAdmin] = useState('')

  const alertTypes = [
    { value: 'LOGIN_SUSPEITO', label: 'Login Suspeito' },
    { value: 'MULTIPLAS_TENTATIVAS', label: 'Múltiplas Tentativas de Login' },
    { value: 'EXPORTACAO_DADOS', label: 'Exportação de Dados' },
    { value: 'ALTERACAO_CONFIGURACAO', label: 'Alteração de Configuração' },
    { value: 'ACESSO_NAO_AUTORIZADO', label: 'Acesso Não Autorizado' },
    { value: 'SISTEMA_COMPROMETIDO', label: 'Sistema Comprometido' },
    { value: 'OUTROS', label: 'Outros' }
  ]

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/security-alerts/history')
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.alerts)
      } else {
        setError(data.error || 'Erro ao carregar alertas')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const sendAlert = async () => {
    if (!alertType || !alertDetails) {
      setError('Tipo de alerta e detalhes são obrigatórios')
      return
    }

    setSending(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/security-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertType,
          details: alertDetails,
          targetAdminId: targetAdmin || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Alerta enviado com sucesso!')
        setAlertType('')
        setAlertDetails('')
        setTargetAdmin('')
        loadAlerts() // Recarregar lista
      } else {
        setError(data.error || 'Erro ao enviar alerta')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSending(false)
    }
  }

  const testWhatsApp = async () => {
    setSending(true)
    try {
      const response = await fetch('/api/admin/security-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertType: 'TESTE_SISTEMA',
          details: 'Teste do sistema de alertas WhatsApp - meDIZ Admin'
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Teste enviado com sucesso! Verifique seu WhatsApp.')
      } else {
        setError(data.error || 'Erro ao enviar teste')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas de Segurança</h1>
        <p className="text-gray-600">
          Gerencie e envie alertas de segurança via WhatsApp
        </p>
      </div>

      {/* Status do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-green-600" />
              <span className="text-sm">WhatsApp: Configurado</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-green-600" />
              <span className="text-sm">Alertas: Ativos</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm">Monitoramento: Ativo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enviar Alerta */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar Alerta de Segurança</CardTitle>
          <CardDescription>
            Envie alertas personalizados para administradores via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="alertType">Tipo de Alerta</Label>
              <Select value={alertType} onValueChange={setAlertType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {alertTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="targetAdmin">Admin Destinatário (opcional)</Label>
              <Input
                id="targetAdmin"
                placeholder="Deixe vazio para enviar para você"
                value={targetAdmin}
                onChange={(e) => setTargetAdmin(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="alertDetails">Detalhes do Alerta</Label>
            <Textarea
              id="alertDetails"
              placeholder="Descreva o alerta de segurança..."
              value={alertDetails}
              onChange={(e) => setAlertDetails(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={sendAlert}
              disabled={sending || !alertType || !alertDetails}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Enviando...' : 'Enviar Alerta'}
            </Button>
            
            <Button 
              onClick={testWhatsApp}
              variant="outline"
              disabled={sending}
            >
              <Bell className="h-4 w-4 mr-2" />
              Testar WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mensagens */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Histórico de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alertas</CardTitle>
          <CardDescription>
            Últimos alertas de segurança enviados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum alerta enviado ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">{alert.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{alert.adminName}</div>
                        <div className="text-sm text-gray-500">{alert.adminEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {alert.sent ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Enviado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span>Falhou</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(alert.timestamp), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Informações Importantes */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Como Funciona</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Alertas são enviados automaticamente para eventos de segurança</li>
              <li>• Você pode enviar alertas manuais para outros admins</li>
              <li>• Todos os alertas são registrados no log de auditoria</li>
              <li>• WhatsApp deve estar configurado para funcionar</li>
            </ul>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Alertas Automáticos</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Múltiplas tentativas de login (3+ em 15 min)</li>
              <li>• Exportação de dados</li>
              <li>• Logins suspeitos</li>
              <li>• Alterações críticas no sistema</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
