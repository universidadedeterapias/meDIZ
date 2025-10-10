'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Não renderizar até estar montado no cliente
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando...</p>
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setDebugInfo(null)
    
    try {
      // 1. Tenta fazer login
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        console.error('Erro no login:', result.error)
        setError(`Credenciais inválidas: ${result.error}`)
        setLoading(false)
        return
      }

      // 2. Verifica se o login foi bem sucedido
      if (!result?.ok) {
        setError('Falha na autenticação')
        setLoading(false)
        return
      }

      try {
        // 3. Verifica se é admin através da API de debug
        const res = await fetch('/api/auth-debug')
        
        if (!res.ok) {
          throw new Error(`Erro na API: ${res.status} ${res.statusText}`)
        }
        
        const data = await res.json()
        setDebugInfo(data) // Salva informações para debug
        
        if (data.isAdmin) {
          console.log('Login admin bem-sucedido')
          router.push('/admin')
        } else {
          // Se não for admin
          setError(`Você não tem permissão de administrador. Email: ${data.user?.email || 'desconhecido'}`)
          setLoading(false)
        }
      } catch (apiError) {
        console.error('Erro ao verificar permissões:', apiError)
        setError(`Erro ao verificar permissões: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`)
        setLoading(false)
      }
    } catch (error) {
      console.error('Erro geral no login:', error)
      setError(`Erro ao fazer login: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-indigo-600">
            meDIZ Admin
          </h1>
          <p className="text-gray-600 mt-2">
            Acesse o painel administrativo
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 mb-6 rounded-md text-sm">
            {error}
            {error.includes('session_expired') && (
              <div className="mt-2 text-xs">
                Sua sessão expirou. Por favor, faça login novamente.
              </div>
            )}
            {error.includes('not_admin') && (
              <div className="mt-2 text-xs">
                Acesso restrito para administradores com email @mediz.com
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="admin@mediz.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use um email com domínio @mediz.com
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:bg-indigo-300"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-indigo-600 hover:underline">
            Voltar para login regular
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          Acesso restrito para administradores do sistema.
        </div>
        
        {debugInfo && process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 border rounded bg-gray-50 text-xs overflow-auto">
            <details>
              <summary className="font-semibold cursor-pointer">Informações de debug</summary>
              <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}