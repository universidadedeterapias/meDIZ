// src/context/UserContext.tsx
'use client'

import { UserFullProps } from '@/types/User'
import { useUserCache, SidebarUser } from '@/hooks/use-user-cache'
import { useSession } from 'next-auth/react'
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback
} from 'react'

type UserContextType = {
  user: UserFullProps | null
  setUser: React.Dispatch<React.SetStateAction<UserFullProps | null>>
  // Dados otimizados para sidebar
  sidebarUser: SidebarUser | null
  isLoadingSidebar: boolean
  sidebarError: Error | null
  retrySidebarUser: () => void
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserFullProps | null>(null)
  const [, setIsLoading] = useState(true)
  const { user: sidebarUser, isLoading: isLoadingSidebar, error: sidebarError, mutate: retrySidebarUser } = useUserCache()
  const { status } = useSession()

  // Debug temporário para verificar propagação do sidebarUser
  useEffect(() => {
    console.log('[UserProvider] 🔄 ====== sidebarUser mudou ======')
    console.log('[UserProvider] sidebarUser:', sidebarUser ? {
      id: sidebarUser.id,
      name: sidebarUser.name,
      email: sidebarUser.email
    } : null)
    console.log('[UserProvider] isLoadingSidebar:', isLoadingSidebar)
    console.log('[UserProvider] session status:', status)
    console.log('[UserProvider] =================================')
  }, [sidebarUser, isLoadingSidebar, status])

  const refreshUser = useCallback(async () => {
    if (status === 'loading') return
    
    try {
      setIsLoading(true)
      const res = await fetch('/api/user')
      if (!res.ok) {
        if (res.status === 401) {
          setUser(null)
          return
        }
        throw new Error('Erro ao carregar usuário')
      }
      const data: UserFullProps = await res.json()
      setUser(data)
    } catch (error) {
      console.error('Erro ao carregar usuário:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => {
    // Só carrega dados do usuário se estiver autenticado
    if (status === 'authenticated') {
      refreshUser()
    } else if (status === 'unauthenticated') {
      // Limpar dados do usuário imediatamente quando não autenticado
      setUser(null)
      setIsLoading(false)
      
      // Limpar caches quando sessão fica unauthenticated
      if (typeof window !== 'undefined') {
        import('@/lib/logout-utils').then(({ clearAllCaches }) => {
          clearAllCaches()
        }).catch(() => {
          // Ignora erros de import
        })
      }
    }
  }, [status, refreshUser])

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      sidebarUser,
      isLoadingSidebar,
      sidebarError,
      retrySidebarUser,
      refreshUser
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useUser deve ser usado dentro de <UserProvider>')
  }
  return ctx
}
