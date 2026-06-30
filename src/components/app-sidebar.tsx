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
import { FirstName, SurName, cn } from '@/lib/utils'
import { NavOptions } from './nav-options'
import { NavHistory } from './nav-history'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { SidebarSkeleton } from './SidebarSkeleton'
import { useTranslation } from '@/i18n/useTranslation'
import { glassPanelClass, glassShellClass } from '@/lib/glassStyles'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'

export type SessionHistoryItem = {
  id: string
  threadId: string
  createdAt: string
  firstUserMessage: string
  agent: 'body' | 'home' | 'pet' | null
}

type AppSidebarProps = {
  history: SessionHistoryItem[]
  selectedThread: string | null
  onSelectSession: (threadId: string) => void
  onSelectSymptom?: (symptomText: string) => void
}

const sidebarGlassSurface = cn(
  glassShellClass,
  'overflow-hidden !border-0 supports-[backdrop-filter]:bg-white/[0.82] data-[mobile=true]:rounded-r-[1.75rem] dark:supports-[backdrop-filter]:bg-zinc-950/[0.86] md:rounded-[1.5rem]'
)

const sidebarMobileOverlay =
  'bg-violet-950/10 backdrop-blur-[12px] dark:bg-black/30'

const sidebarContentClass =
  'gap-0 px-1.5 pb-2 pt-1 [scrollbar-color:rgba(124,58,237,0.25)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-500/25 hover:[&::-webkit-scrollbar-thumb]:bg-violet-500/40 group-data-[collapsible=icon]:[scrollbar-width:none] group-data-[collapsible=icon]:[&::-webkit-scrollbar]:hidden'

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
  const showCollapsed = !isMobile && state === 'collapsed'

  return (
    <SidebarHeader
      className={cn(
        showCollapsed
          ? 'm-1 mb-0 bg-transparent p-0 shadow-none ring-0'
          : cn(glassPanelClass, 'm-2 mb-1 rounded-2xl p-0')
      )}
    >
      {/* Conteúdo completo quando expandido */}
      {!showCollapsed && (
        <div
          className={cn(
            'flex min-h-[4.5rem] items-center gap-3 px-3 py-2.5',
            isMobile && 'pr-12'
          )}
        >
          <Avatar
            className={cn(
              'size-11 shadow-md shadow-violet-500/15'
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
                'truncate text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white'
              )}
            >
              {displayName}
            </h4>
            <a
              href="/myAccount"
              className="mt-0.5 inline-flex text-xs font-medium text-violet-700 transition-colors hover:text-violet-900 hover:underline dark:text-violet-300 dark:hover:text-violet-100"
            >
              {t('navbar.account', 'Conta')}
            </a>
          </div>
        </div>
      )}

      {/* Avatar compacto quando recolhido */}
      {showCollapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center p-1.5">
              <Avatar className="size-8 shadow-lg shadow-violet-500/20">
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
export function AppSidebar({ history, selectedThread, onSelectSession, onSelectSymptom }: AppSidebarProps) {
  const { sidebarUser, isLoadingSidebar } = useUser()
  const { t } = useTranslation()
  
  // Loading inicial - usa dados otimizados da sidebar
  if (isLoadingSidebar || !sidebarUser) {
    return (
      <Sidebar
        collapsible="icon"
        variant="floating"
        surfaceClassName={sidebarGlassSurface}
        mobileOverlayClassName={sidebarMobileOverlay}
        className="!border-0"
      >
        <SidebarHeader className={cn(glassPanelClass, 'm-2 mb-1 rounded-2xl')}>
          <SidebarSkeleton />
        </SidebarHeader>
        <SidebarContent className={sidebarContentClass}>
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
  const displayName = `${userFirstName} ${userSurName}`.trim()

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      surfaceClassName={sidebarGlassSurface}
      mobileOverlayClassName={sidebarMobileOverlay}
      className="!border-0"
    >
      <SidebarHeaderContent 
        sidebarUser={sidebarUser}
        userInitial={userInitial}
        displayName={displayName}
        t={t}
      />

      <SidebarContent className={sidebarContentClass}>
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
        {history.length > 0 ? (
          <NavHistory
            items={history}
            selectedThread={selectedThread}
            onSelect={onSelectSession}
          />
        ) : null}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3 pt-1 group-data-[collapsible=icon]:hidden">
        <p className="text-center text-[10px] font-medium tracking-wide text-zinc-500/70 dark:text-zinc-400/70">
          meDIZ v0.1.0
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
