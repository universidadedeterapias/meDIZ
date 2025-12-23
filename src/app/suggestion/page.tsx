'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/useTranslation'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SuggestionPage() {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Schema de validação com Zod (dinâmico baseado em traduções)
  const suggestionSchema = z.object({
    name: z.string().min(1, t('suggestion.validation.nameRequired', 'Nome é obrigatório')).min(2, t('suggestion.validation.nameMin', 'Nome deve ter pelo menos 2 caracteres')),
    phone: z
      .string()
      .min(1, t('suggestion.validation.phoneRequired', 'Telefone é obrigatório'))
      .refine(
        (val) => {
          // Remove caracteres não numéricos exceto +
          const cleaned = val.replace(/[^\d+]/g, '')
          // Deve ter pelo menos 10 dígitos (DDI + DDD + número)
          const digits = cleaned.replace(/\+/g, '').replace(/\D/g, '')
          return digits.length >= 10 && cleaned.includes('+')
        },
        {
          message: t('suggestion.validation.phoneInvalid', 'Formato inválido. Use: +55 (11) 98765-4321'),
        }
      ),
    message: z
      .string()
      .min(1, t('suggestion.validation.messageRequired', 'Mensagem é obrigatória'))
      .min(10, t('suggestion.validation.messageMin', 'Mensagem deve ter pelo menos 10 caracteres')),
  })

  type SuggestionFormData = z.infer<typeof suggestionSchema>

  const form = useForm<SuggestionFormData>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      name: '',
      phone: '',
      message: '',
    },
  })

  // Função para formatar telefone enquanto o usuário digita
  const formatPhone = (value: string) => {
    // Remove tudo que não é número ou +
    const cleaned = value.replace(/[^\d+]/g, '')
    
    if (!cleaned) return ''
    
    // Se não começa com +, assume que é brasileiro e adiciona +55
    if (!cleaned.startsWith('+')) {
      const onlyNumbers = cleaned.replace(/\D/g, '')
      if (onlyNumbers.length === 0) return ''
      
      // Se tem menos de 2 dígitos, apenas mostra +55 (
      if (onlyNumbers.length <= 2) {
        return `+55 (${onlyNumbers}`
      }
      
      // Se tem até 7 dígitos (DDD + início do número)
      if (onlyNumbers.length <= 7) {
        const ddd = onlyNumbers.slice(0, 2)
        const number = onlyNumbers.slice(2)
        return `+55 (${ddd}) ${number}`
      }
      
      // Se tem mais de 7 dígitos, formata completo
      const ddd = onlyNumbers.slice(0, 2)
      const firstPart = onlyNumbers.slice(2, 7)
      const secondPart = onlyNumbers.slice(7, 11)
      
      if (secondPart) {
        return `+55 (${ddd}) ${firstPart}-${secondPart}`
      }
      return `+55 (${ddd}) ${firstPart}`
    }
    
    // Se já tem +, formata normalmente
    const ddiMatch = cleaned.match(/^(\+\d{1,3})/)
    if (!ddiMatch) return cleaned
    
    const ddi = ddiMatch[1]
    const rest = cleaned.slice(ddi.length).replace(/\D/g, '')
    
    if (rest.length === 0) return ddi
    
    if (rest.length <= 2) {
      return `${ddi} (${rest}`
    }
    
    if (rest.length <= 7) {
      const ddd = rest.slice(0, 2)
      const number = rest.slice(2)
      return `${ddi} (${ddd}) ${number}`
    }
    
    const ddd = rest.slice(0, 2)
    const firstPart = rest.slice(2, 7)
    const secondPart = rest.slice(7, 11)
    
    if (secondPart) {
      return `${ddi} (${ddd}) ${firstPart}-${secondPart}`
    }
    
    return `${ddi} (${ddd}) ${firstPart}`
  }

  const onSubmit = async (data: SuggestionFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('suggestion.error.generic', 'Erro ao enviar sugestão'))
      }

      setIsSuccess(true)
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('suggestion.error.retry', 'Erro ao enviar sugestão. Tente novamente.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('suggestion.success.title', 'Obrigado pela sua contribuição!')}
                </h2>
                <p className="text-gray-600">
                  {t('suggestion.success.message', 'Sua sugestão foi enviada com sucesso. Valorizamos muito seu feedback!')}
                </p>
              </div>
              <Button asChild className="w-full mt-4">
                <Link href="/chat">{t('suggestion.success.backToChat', 'Voltar para o Chat')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/chat">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <CardTitle className="text-2xl">{t('suggestion.title', 'Enviar Sugestão')}</CardTitle>
              <CardDescription>
                {t('suggestion.description', 'Sua opinião é muito importante para melhorarmos o meDIZ!')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('suggestion.name', 'Nome *')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('suggestion.namePlaceholder', 'Seu nome completo')}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('suggestion.phone', 'Telefone (com DDI e DDD) *')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('suggestion.phonePlaceholder', '+55 (11) 98765-4321')}
                        {...field}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value)
                          field.onChange(formatted)
                        }}
                        disabled={isSubmitting}
                        maxLength={20}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('suggestion.phoneFormat', 'Formato: +55 (11) 98765-4321')}
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('suggestion.message', 'Mensagem *')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('suggestion.messagePlaceholder', 'Descreva sua sugestão, ideia ou feedback...')}
                        className="min-h-[120px]"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  <Link href="/chat">{t('suggestion.cancel', 'Cancelar')}</Link>
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('suggestion.submitting', 'Enviando...')}
                    </>
                  ) : (
                    t('suggestion.submit', 'Enviar Sugestão')
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

