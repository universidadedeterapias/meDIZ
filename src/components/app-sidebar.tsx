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
import { NavFolders } from './nav-folders'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { SidebarSkeleton } from './SidebarSkeleton'

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
  onSelectSymptom?: (symptomText: string) => void
}

/**
 * O AppSidebar exibe o menu lateral da aplicação:
 * - enquanto carrega user: mostra header de loading
 * - depois que o user está pronto: avatar + nome e opções de navegação
 */
export function AppSidebar({ history: _history, selectedThread: _selectedThread, onSelectSession: _onSelectSession, onSelectSymptom }: AppSidebarProps) {
  const { sidebarUser, isLoadingSidebar } = useUser()
  
  // Debug temporário
  console.log('[AppSidebar] 🔄 Render - isLoadingSidebar:', isLoadingSidebar, 'sidebarUser:', sidebarUser ? {
    id: sidebarUser.id,
    name: sidebarUser.name,
    email: sidebarUser.email
  } : null)
  
  // Loading inicial - usa dados otimizados da sidebar
  if (isLoadingSidebar || !sidebarUser) {
    console.log('[AppSidebar] 💀 Mostrando skeleton - isLoadingSidebar:', isLoadingSidebar, 'sidebarUser:', sidebarUser)
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b-2">
          <SidebarSkeleton />
        </SidebarHeader>
        <SidebarContent>
          <NavOptions options={sidebarOptions} />
          <NavFolders onSelectSymptom={onSelectSymptom} />
        </SidebarContent>
      </Sidebar>
    )
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[AppSidebar] Renderizando sidebar completa com NavFolders')
  }

  // Já temos sidebarUser → mostra avatar, nome e menu
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b-2">
        <div className="p-4 flex items-center gap-6">
          <Avatar className="w-16 h-16 border-2 border-indigo-600">
            <AvatarImage src={sidebarUser.image ? sidebarUser.image : ''} alt="User avatar" />
            <AvatarFallback>
              {FirstName(sidebarUser.fullName ? sidebarUser.fullName : sidebarUser.name).charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="scroll-m-20 text-xl font-normal tracking-tight">
              {FirstName(sidebarUser.fullName ? sidebarUser.fullName : sidebarUser.name)}{' '}
              {SurName(sidebarUser.fullName ? sidebarUser.fullName : sidebarUser.name)}
            </h4>
            <a href="/myAccount" className="text-primary">
              Minha conta
            </a>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavOptions options={sidebarOptions} />
        <NavFolders onSelectSymptom={onSelectSymptom} />
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
