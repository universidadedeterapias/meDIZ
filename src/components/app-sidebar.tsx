// components/app-sidebar.tsx
'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { sidebarOptions } from '@/lib/sidebarOptions'
import { FirstName, SurName } from '@/lib/utils'
import { NavOptions } from './nav-options'
import { NavFolders } from './nav-folders'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { SidebarSkeleton } from './SidebarSkeleton'
import { useTranslation } from '@/i18n/useTranslation'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'

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
 * Componente interno para o header da sidebar com avatar
 * Mostra conteúdo completo quando expandido e avatar compacto quando recolhido
 */
function SidebarHeaderContent({
  sidebarUser,
  userInitial,
  displayName,
  t
}: {
  sidebarUser: { image?: string | null; name: string; fullName?: string | null }
  userInitial: string
  displayName: string
  t: (key: string, fallback: string) => string
}) {
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <SidebarHeader className="border-b-2">
      {/* Conteúdo completo quando expandido */}
      {!isCollapsed && (
        <div className="p-4 flex items-center gap-6">
          <Avatar className="w-16 h-16 border-2 border-indigo-600">
            <AvatarImage src={sidebarUser.image ? sidebarUser.image : ''} alt="User avatar" />
            <AvatarFallback>
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="scroll-m-20 text-xl font-normal tracking-tight">
              {displayName}
            </h4>
            <a href="/myAccount" className="text-primary">
              {t('navbar.account', 'Conta')}
            </a>
          </div>
        </div>
      )}

      {/* Avatar compacto quando recolhido */}
      {isCollapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center p-2">
              <Avatar className="w-8 h-8 border-2 border-indigo-600">
                <AvatarImage src={sidebarUser.image ? sidebarUser.image : ''} alt="User avatar" />
                <AvatarFallback>
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            align="center"
            hidden={isMobile}
          >
            <p>{displayName}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </SidebarHeader>
  )
}

/**
 * O AppSidebar exibe o menu lateral da aplicação:
 * - enquanto carrega user: mostra header de loading
 * - depois que o user está pronto: avatar + nome e opções de navegação
 */
export function AppSidebar({ history: _history, selectedThread: _selectedThread, onSelectSession: _onSelectSession, onSelectSymptom }: AppSidebarProps) {
  const { sidebarUser, isLoadingSidebar } = useUser()
  const { t } = useTranslation()
  
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
  const userFullName = sidebarUser.fullName ? sidebarUser.fullName : sidebarUser.name
  const userFirstName = FirstName(userFullName)
  const userSurName = SurName(userFullName)
  const userInitial = userFirstName.charAt(0)
  const displayName = `${userFirstName} ${userSurName}`

  return (
    <Sidebar collapsible="icon">
      <SidebarHeaderContent 
        sidebarUser={sidebarUser}
        userInitial={userInitial}
        displayName={displayName}
        t={t}
      />

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

      <SidebarFooter className="border-t px-4 py-6">
        {/* Seletor de idioma removido - agora está apenas no header do chat */}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
