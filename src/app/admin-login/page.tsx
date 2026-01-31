'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Evitar hydration mismatch e ler erros da URL
  useEffect(() => {
    setMounted(true)
    
    // Limpar cache ao carregar a página para evitar problemas de sessão
    if (typeof window !== 'undefined') {
      // Limpar localStorage e sessionStorage relacionados a autenticação
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.includes('auth') || key.includes('session') || key.includes('cache'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (e) {
        console.warn('Erro ao limpar localStorage:', e)
      }
    }
    
    // Ler erro da URL (vindo do middleware)
    const urlError = searchParams.get('error')
    if (urlError) {
      const errorMessages: Record<string, string> = {
        'session_expired': 'Sua sessão expirou. Por favor, faça login novamente.',
        'not_admin': 'Você não tem permissão de administrador.',
        'Configuration': 'Erro de configuração. Tente novamente.',
        'CredentialsSignin': 'Credenciais inválidas.',
        'AccessDenied': 'Acesso negado.'
      }
      
      setError(errorMessages[urlError] || 'Erro ao fazer login. Tente novamente.')
      
      // Limpar parâmetro de erro da URL para evitar problemas futuros
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search)
    }
  }, [searchParams])

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
    
    try {
      // 1. Tenta fazer login
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        // Limpar URL de erros anteriores
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('error')
        window.history.replaceState({}, '', newUrl.pathname + newUrl.search)
        
        setError('Credenciais inválidas')
        setLoading(false)
        
        // Registrar tentativa de login falhada
        try {
          await fetch('/api/admin/audit-logs/login-failed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
          })
        } catch (error) {
          console.error('Erro ao registrar login falhado:', error)
        }
        
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
          throw new Error(`Erro na API: ${res.status}`)
        }
        
        const data = await res.json()
        
        if (data.isAdmin) {
          // Limpar caches antes de login bem-sucedido para garantir dados frescos
          if (typeof window !== 'undefined') {
            const { clearAllCaches } = await import('@/lib/logout-utils')
            clearAllCaches()
            
            // Limpar qualquer parâmetro de erro da URL
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('error')
            window.history.replaceState({}, '', newUrl.pathname + newUrl.search)
          }
          
          // Registrar login bem-sucedido
          try {
            await fetch('/api/admin/audit-logs/login-success', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email })
            })
          } catch (error) {
            console.error('Erro ao registrar login:', error)
          }
          
          // Aguarda um pouco para garantir que a sessão foi criada
          setTimeout(() => {
            // Usar replace para não deixar histórico de login na navegação
            router.replace('/admin')
            // Força refresh da página para garantir que os dados sejam carregados
            router.refresh()
          }, 100)
        } else {
          // Limpar URL de erros
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete('error')
          window.history.replaceState({}, '', newUrl.pathname + newUrl.search)
          
          setError('Você não tem permissão de administrador')
          setLoading(false)
        }
      } catch {
        // Limpar URL de erros
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('error')
        window.history.replaceState({}, '', newUrl.pathname + newUrl.search)
        
        setError('Erro ao verificar permissões')
        setLoading(false)
      }
    } catch {
      // Limpar URL de erros
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search)
      
      setError('Erro ao fazer login')
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
              placeholder="Digite seu email"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Acesso restrito para administradores
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
        
        <div className="mt-6 text-center space-y-2">
          <Link href="/login" className="text-sm text-indigo-600 hover:underline block">
            Voltar para login regular
          </Link>
          <Link href="/request-admin" className="text-sm text-blue-600 hover:underline block">
            Solicitar acesso administrativo
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          Acesso restrito para administradores do sistema.
        </div>
        
      </div>
    </div>
  )
}