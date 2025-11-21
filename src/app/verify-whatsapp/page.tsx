'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Smartphone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function VerifyWhatsAppPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const { t } = useTranslation()
  
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!email) {
      setError(t('verifyWhatsapp.error.emailNotFound', 'Email não encontrado. Por favor, faça o cadastro novamente.'))
    }
  }, [email, t])

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
        throw new Error(error || t('verifyWhatsapp.error.update', 'Erro ao atualizar WhatsApp'))
      }

      // Depois, enviar verificação
      const verifyRes = await fetch('/api/verify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!verifyRes.ok) {
        const { error } = await verifyRes.json()
        throw new Error(error || t('verifyWhatsapp.error.send', 'Erro ao enviar verificação'))
      }

      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verifyWhatsapp.error.generic', 'Erro inesperado'))
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 relative">
        {/* Seletor de idioma no canto superior direito */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <LanguageSwitcher showLabel={false} className="min-w-[120px] sm:min-w-[160px]" />
        </div>
        
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('verifyWhatsapp.error.emailNotFound', 'Email não encontrado. Por favor, faça o cadastro novamente.')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 relative">
      {/* Seletor de idioma no canto superior direito */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <LanguageSwitcher showLabel={false} className="min-w-[120px] sm:min-w-[160px]" />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Smartphone className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">{t('verifyWhatsapp.title', 'Verificação WhatsApp')}</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            {t('verifyWhatsapp.subtitle', 'Confirme seu número do WhatsApp para ativar sua conta')}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'sent' ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {t('verifyWhatsapp.success.message', 'Link de confirmação enviado para seu WhatsApp!')}{' '}
                {t('verifyWhatsapp.success.hint', 'Verifique se digitou o número corretamente.')}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('verifyWhatsapp.label', 'Número do WhatsApp')}
                </label>
                <Input
                  type="tel"
                  placeholder={t('verifyWhatsapp.placeholder', '11999999999')}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('verifyWhatsapp.hint', 'Digite apenas números (ex: 11999999999)')}
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
                    {t('verifyWhatsapp.submit.loading', 'Enviando...')}
                  </>
                ) : (
                  t('verifyWhatsapp.submit', 'Enviar Link de Confirmação')
                )}
              </Button>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {t('verifyWhatsapp.info', 'Ao continuar, você receberá um link via WhatsApp para confirmar seu cadastro.')}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
