// src/context/UserContext.tsx
'use client'

import { UserFullProps } from '@/types/User'
import { useUserCache, SidebarUser } from '@/hooks/use-user-cache'
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState
} from 'react'

type UserContextType = {
  user: UserFullProps | null
  setUser: React.Dispatch<React.SetStateAction<UserFullProps | null>>
  // Dados otimizados para sidebar
  sidebarUser: SidebarUser | null
  isLoadingSidebar: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserFullProps | null>(null)
  const { user: sidebarUser, isLoading: isLoadingSidebar } = useUserCache()

  useEffect(() => {
    // Carrega dados completos do usuário apenas quando necessário
    // (para páginas que precisam de todos os campos)
    fetch('/api/user')
      .then(res => {
        if (!res.ok) throw new Error('Não autenticado')
        return res.json()
      })
      .then((data: UserFullProps) => setUser(data))
      .catch(() => setUser(null))
  }, [])

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      sidebarUser, 
      isLoadingSidebar 
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
