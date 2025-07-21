// components/app-sidebar.tsx
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
import { User } from '@/types/User'
import { NavOptions } from './nav-options'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

type Props = {
  history: {
    id: string
    threadId: string
    createdAt: string
    firstUserMessage: string
  }[]
  selectedThread: string | null
  onSelectSession: (threadId: string) => void
  user: User
}

export function AppSidebar(props: Omit<Props, 'user'>) {
  const { user } = useUser()
  if (!user) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="border-b-2">
          <div className="p-4">Carregando...</div>
        </SidebarHeader>
        <SidebarContent>{/* ou um spinner */}</SidebarContent>
      </Sidebar>
    )
  }
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b-2">
        <div className="p-4 flex flex-row items-center gap-6">
          <Avatar className="w-16 h-16 border-2 border-indigo-600">
            <AvatarImage src={user.image!} alt="User" />
            <AvatarFallback>{FirstName(user.name!).charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="scroll-m-20 text-xl font-normal tracking-tight">
              {FirstName(user.name!) + ' ' + SurName(user.name!)}
            </h4>
            <a href="/myAccount" className="text-primary">
              Minha conta
            </a>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavOptions options={sidebarOptions} />
        {/* <NavHistory
          items={history}
          selectedThread={selectedThread}
          onSelect={onSelectSession}
        /> */}
      </SidebarContent>
      <SidebarFooter>{/* <NavUser /> */}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
