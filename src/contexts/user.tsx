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
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserFullProps | null>(null)
  const [, setIsLoading] = useState(true)
  const { user: sidebarUser, isLoading: isLoadingSidebar } = useUserCache()
  const { status } = useSession()

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
      setUser(null)
      setIsLoading(false)
    }
  }, [status, refreshUser])

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      sidebarUser, 
      isLoadingSidebar,
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
