'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const Sucesso = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, setSession] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Captura o session_id da URL
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    setSession(sessionId || null)
  }, [])

  const handleGoHome = () => {
    router.push('/') // Redireciona para a tela inicial
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center space-y-8">
      <div className="p-6 bg-green-100 rounded-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="w-12 h-12 text-green-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-800">
        Obrigado por incentivar nosso trabalho e escolher o PLANO PROFISSIONAL!
      </h1>
      <p className="text-gray-600">
        Sua conta foi atualizada. Volte ao app e impacte profundamente a vida
        dos seus pacientes. Gratidão!
      </p>
      <Button onClick={handleGoHome} className="mt-4">
        Voltar para o meDIZ!
      </Button>
    </div>
  )
}

export default Sucesso
