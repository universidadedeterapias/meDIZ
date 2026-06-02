// src/app/admin/layout.tsx
import { auth } from '@/auth'  // Usando auth() em vez de getServerSession
import { redirect } from 'next/navigation'
import AdminClientLayout from '@/components/admin/AdminClientLayout'

// Forçar dynamic rendering para evitar cache de sessão
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Este é um Server Component, sem 'use client'
export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  try {
    // Verificação de autenticação diretamente no servidor
    const session = await auth()
    
    // Verificar se está autenticado e é admin
    if (!session?.user?.email) {
      console.log('[AdminLayout] Usuário não autenticado')
      redirect('/admin-login')
    }
    
    // Verifica se o usuário tem permissões de admin (email @mediz.com)
    if (!session.user.email.includes('@mediz.com')) {
      console.log('[AdminLayout] Usuário não é admin:', session.user.email)
      redirect('/')
    }
    
    console.log('[AdminLayout] Acesso permitido para:', session.user.email)
    
    // Usa o componente cliente para o layout, passando dados do usuário
    return (
      <AdminClientLayout 
        userName={session.user.name || 'Admin'}
        userEmail={session.user.email}
      >
        {children}
      </AdminClientLayout>
    )
  } catch (error) {
    console.error('[AdminLayout] Erro:', error)
    
    // Em caso de erro, exibir mensagem amigável
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erro ao carregar painel administrativo
          </h1>
          <p className="text-gray-600 mb-6">
            Ocorreu um problema ao acessar o painel. Por favor, verifique suas permissões ou
            tente fazer login novamente.
          </p>
          <a 
            href="/admin-login" 
            className="block w-full text-center py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Voltar para login
          </a>
        </div>
      </div>
    )
  }
}