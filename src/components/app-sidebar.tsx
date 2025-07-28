// components/app-sidebar.tsx
'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { sidebarOptions } from '@/lib/sidebarOptions'
import { FirstName, SurName } from '@/lib/utils'
import { NavOptions } from './nav-options'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

type SessionHistoryItem = {
  id: string
  threadId: string
  createdAt: string
  firstUserMessage: string
}

type AppSidebarProps = {
  history: SessionHistoryItem[]
  selectedThread: string | null
  onSelectSession: (threadId: string) => void
}

/**
 * O AppSidebar exibe o menu lateral da aplicação:
 * - enquanto carrega user: mostra header de loading
 * - depois que o user está pronto: avatar + nome e opções de navegação
 */
export function AppSidebar({}: AppSidebarProps) {
  const { user } = useUser()
  // Loading inicial
  if (!user) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b-2">
          <div className="p-4">Carregando...</div>
        </SidebarHeader>
        <SidebarContent>
          {/* aqui você pode colocar um spinner ou skeleton */}
        </SidebarContent>
      </Sidebar>
    )
  }

  // Já temos user → mostra avatar, nome e menu
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b-2">
        <div className="p-4 flex items-center gap-6">
          <Avatar className="w-16 h-16 border-2 border-indigo-600">
            <AvatarImage src={user.image ? user.image : ''} alt="User avatar" />
            <AvatarFallback>
              {FirstName(user.fullName ? user.fullName : user.name).charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="scroll-m-20 text-xl font-normal tracking-tight">
              {FirstName(user.fullName ? user.fullName : user.name)}{' '}
              {SurName(user.fullName ? user.fullName : user.name)}
            </h4>
            <a href="/myAccount" className="text-primary">
              Minha conta
            </a>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavOptions options={sidebarOptions} />

        {/*
          Quando quiser renderizar o histórico de sessões:
          descomente abaixo e passe as props corretas para o componente NavHistory,
          que internamente já saberá lidar com selectedThread e onSelectSession.
        */}
        {/*
        <NavHistory
          items={history}
          selectedThread={selectedThread}
          onSelect={onSelectSession}
        />
        */}
      </SidebarContent>

      <SidebarFooter>
        {/* <NavUser /> ou outros controles no rodapé */}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
