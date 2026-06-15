// components/app-sidebar.tsx
'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { FirstName, SurName, cn } from '@/lib/utils'
import { NavOptions } from './nav-options'
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
        <div
          className={cn(
            'flex items-center',
            isMobile ? 'gap-3 p-3' : 'gap-6 p-4'
          )}
        >
          <Avatar
            className={cn(
              'border-2 border-indigo-600',
              isMobile ? 'h-12 w-12' : 'h-16 w-16'
            )}
          >
            <AvatarImage src={sidebarUser.image ? sidebarUser.image : ''} alt="User avatar" />
            <AvatarFallback>
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h4
              className={cn(
                'scroll-m-20 font-normal tracking-tight text-sidebar-foreground',
                isMobile ? 'text-base' : 'text-xl'
              )}
            >
              {displayName}
            </h4>
            <a href="/myAccount" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
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
  
  // Loading inicial - usa dados otimizados da sidebar
  if (isLoadingSidebar || !sidebarUser) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b-2">
          <SidebarSkeleton />
        </SidebarHeader>
        <SidebarContent>
          <NavOptions onSelectSymptom={onSelectSymptom} />
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
        <NavOptions onSelectSymptom={onSelectSymptom} />
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

      <SidebarRail />
    </Sidebar>
  )
}
