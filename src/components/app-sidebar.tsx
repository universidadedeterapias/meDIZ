// components/app-sidebar.tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from '@/components/ui/sidebar'
import { sidebarOptions } from '@/lib/sidebarOptions'
import { FirstName, SurName } from '@/lib/utils'
import { User } from '@/types/User'
import Image from 'next/image'
import { NavOptions } from './nav-options'

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

export function AppSidebar({
  // history,
  // selectedThread,
  // onSelectSession,
  user,
  ...props
}: Props) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b-2">
        <div className="p-4 flex flex-row items-center gap-6">
          <Image
            src={user.image}
            alt="User"
            width={64}
            height={64}
            className="rounded-full border-2 border-indigo-600"
          />
          <div className="flex-1">
            <h4 className="scroll-m-20 text-xl font-normal tracking-tight">
              {FirstName(user.name) + ' ' + SurName(user.name)}
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
