'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, Smartphone } from 'lucide-react'

export default function ConfirmSignupPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'waiting'>('loading')
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const sent = searchParams.get('sent') === 'true' // Se foi enviado automaticamente

  useEffect(() => {
    setMounted(true)
  }, [])

  const confirmSignup = useCallback(async () => {
    try {
      const response = await fetch('/api/confirm-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email })
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Cadastro confirmado com sucesso!')
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        if (data.error?.includes('expirado')) {
          setStatus('expired')
        } else {
          setStatus('error')
        }
        setMessage(data.error || 'Erro ao confirmar cadastro')
      }
    } catch {
      setStatus('error')
      setMessage('Erro de conexão. Tente novamente.')
    }
  }, [token, email, router])

  useEffect(() => {
    if (mounted) {
      if (sent && email) {
        // Se foi enviado automaticamente, mostrar mensagem de espera
        setStatus('waiting')
        setMessage('Link de confirmação enviado para seu WhatsApp!')
      } else if (token && email) {
        // Se tem token, confirmar automaticamente
        confirmSignup()
        // Limpar token da URL após processar (segurança)
        router.replace('/confirm-signup?sent=true&email=' + encodeURIComponent(email))
      } else {
        setStatus('error')
        setMessage('Token ou email não encontrado')
      }
    }
  }, [mounted, token, email, sent, confirmSignup, router])

  const resendConfirmation = async () => {
    if (!email) return

    try {
      const response = await fetch('/api/verify-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Novo link de confirmação enviado via WhatsApp!')
      } else {
        setMessage(data.error || 'Erro ao reenviar confirmação')
      }
    } catch {
      setMessage('Erro de conexão. Tente novamente.')
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <Smartphone className="h-6 w-6 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl">Confirmação de Cadastro</CardTitle>
          <CardDescription>
            Verificando seu cadastro via WhatsApp
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status === 'waiting' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <Smartphone className="h-12 w-12 text-blue-600" />
              </div>
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-600">
                Verifique se digitou o número corretamente.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={resendConfirmation}
                  variant="outline"
                  className="w-full"
                >
                  Reenviar Link
                </Button>
                <Button 
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  Ir para Login
                </Button>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
              <p className="text-gray-600">Confirmando seu cadastro...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-600">
                Redirecionando para o login em 3 segundos...
              </p>
              <Button 
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Ir para Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Button 
                  onClick={resendConfirmation}
                  variant="outline"
                  className="w-full"
                >
                  Reenviar Confirmação
                </Button>
                <Button 
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  Ir para Login
                </Button>
              </div>
            </div>
          )}

          {status === 'expired' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <XCircle className="h-12 w-12 text-orange-600" />
              </div>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Este link de confirmação expirou. Solicite um novo link.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Button 
                  onClick={resendConfirmation}
                  className="w-full"
                >
                  Solicitar Novo Link
                </Button>
                <Button 
                  onClick={() => router.push('/login')}
                  variant="outline"
                  className="w-full"
                >
                  Ir para Login
                </Button>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-gray-500">
            <p>Não recebeu o link?</p>
            <p>Verifique se digitou o número correto.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
