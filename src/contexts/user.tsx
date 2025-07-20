// src/context/UserContext.tsx
'use client'

import { UserFullProps } from '@/types/User'
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
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserFullProps | null>(null)

  useEffect(() => {
    // ao montar, carrega o user da sua API
    fetch('/api/user')
      .then(res => {
        if (!res.ok) throw new Error('Não autenticado')
        return res.json()
      })
      .then((data: UserFullProps) => setUser(data))
      .catch(() => setUser(null))
  }, [])

  return (
    <UserContext.Provider value={{ user, setUser }}>
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
