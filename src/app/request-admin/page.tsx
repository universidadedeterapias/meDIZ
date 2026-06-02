'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function RequestAdminAccessPage() {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      setStatus('error')
      setMessage('Por favor, explique o motivo da sua solicitação')
      return
    }

    setLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/admin/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage('Solicitação enviada com sucesso! Você será notificado quando for analisada.')
      } else {
        setStatus('error')
        setMessage(data.error || 'Erro ao enviar solicitação')
      }
    } catch {
      setStatus('error')
      setMessage('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Solicitar Acesso Administrativo</CardTitle>
          <CardDescription>
            Solicite acesso ao painel administrativo do meDIZ
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Motivo da Solicitação
              </h3>
              <Textarea
                placeholder="Explique por que você precisa de acesso administrativo..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Processo de Aprovação
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Sua solicitação será analisada pelos administradores</li>
                <li>• Você receberá uma notificação sobre a decisão</li>
                <li>• O processo pode levar até 48 horas</li>
              </ul>
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !reason.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Solicitação'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
