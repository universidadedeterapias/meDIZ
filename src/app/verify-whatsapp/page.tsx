'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Smartphone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function VerifyWhatsAppPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!email) {
      setError('Email não encontrado. Por favor, faça o cadastro novamente.')
    }
  }, [email])

  const handleSendVerification = async () => {
    if (!whatsapp || !email) return

    setLoading(true)
    setStatus('sending')
    setError('')

    try {
      // Primeiro, atualizar o WhatsApp do usuário
      const updateRes = await fetch('/api/auth/update-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, whatsapp })
      })

      if (!updateRes.ok) {
        const { error } = await updateRes.json()
        throw new Error(error || 'Erro ao atualizar WhatsApp')
      }

      // Depois, enviar verificação
      const verifyRes = await fetch('/api/verify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!verifyRes.ok) {
        const { error } = await verifyRes.json()
        throw new Error(error || 'Erro ao enviar verificação')
      }

      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Email não encontrado. Por favor, faça o cadastro novamente.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Smartphone className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Verificação WhatsApp</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Confirme seu número do WhatsApp para ativar sua conta
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'sent' ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Link de confirmação enviado para seu WhatsApp! 
                Verifique se digitou o número corretamente.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do WhatsApp
                </label>
                <Input
                  type="tel"
                  placeholder="11999999999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite apenas números (ex: 11999999999)
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSendVerification}
                disabled={!whatsapp || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Link de Confirmação'
                )}
              </Button>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Ao continuar, você receberá um link via WhatsApp para confirmar seu cadastro.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
