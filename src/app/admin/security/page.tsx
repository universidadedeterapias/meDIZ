'use client'

import { useState, useEffect } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Info
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function SecurityPage() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Simular carregamento inicial
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Segurança</h1>
        <p className="text-gray-600">
          Gerencie configurações de segurança do sistema
        </p>
      </div>

      {/* Aviso sobre 2FA */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>2FA Temporariamente Desabilitado:</strong> A verificação em duas etapas está temporariamente desabilitada. 
          Esta funcionalidade será implementada em uma versão futura.
        </AlertDescription>
      </Alert>

      {/* Estatísticas Simplificadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              Sessão atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Login</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDistanceToNow(new Date(), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Login mais recente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status de Segurança</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Ativo
            </div>
            <p className="text-xs text-muted-foreground">
              Sistema protegido
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Segurança Atuais</CardTitle>
          <CardDescription>
            Status atual das medidas de segurança implementadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Autenticação Admin</h4>
              <p className="text-sm text-gray-600">
                Login restrito para emails @mediz.com com verificação de senha.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Logs de Auditoria</h4>
              <p className="text-sm text-gray-600">
                Todas as ações administrativas são registradas com timestamp e IP.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Alertas de Segurança</h4>
              <p className="text-sm text-gray-600">
                Sistema de alertas via WhatsApp para eventos suspeitos.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Verificação 2FA</h4>
              <p className="text-sm text-gray-600">
                Temporariamente desabilitada. Será implementada em versão futura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Próximas Implementações */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Implementações</CardTitle>
          <CardDescription>
            Funcionalidades de segurança planejadas para versões futuras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Verificação 2FA</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Códigos de verificação via WhatsApp</li>
              <li>• Dispositivos confiáveis por 30 dias</li>
              <li>• Renovação automática de confiança</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Melhorias de Segurança</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Detecção de login suspeito</li>
              <li>• Bloqueio por múltiplas tentativas</li>
              <li>• Notificações em tempo real</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
