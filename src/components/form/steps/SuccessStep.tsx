'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/useTranslation'

export default function SuccessStep() {
  const router = useRouter()
  const { t } = useTranslation()

  const handleStart = () => {
    // Exemplo: Redirecionar para a dashboard ou página inicial
    router.push('/chat') // Ajuste o destino conforme seu app
  }

  return (
    <div className="flex flex-col items-center justify-center mt-14 text-zinc-700 space-y-4 px-6 text-center">
      <CheckCircle size={72} className="text-green-500" />

      <h2 className="text-2xl font-bold text-green-600">
        {t('form.success.title', 'Cadastro concluído com sucesso!')}
      </h2>

      <p className="text-base text-zinc-500 max-w-md">
        {t(
          'form.success.description',
          'Estamos muito felizes em ter você conosco. Prepare-se para uma jornada de autoconhecimento e transformação.'
        )}
      </p>

      <Button
        className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-xl text-base hover:bg-indigo-700 min-h-14"
        onClick={handleStart}
      >
        {t('form.success.button', 'Começar agora')} <ArrowRight />
      </Button>
    </div>
  )
}
