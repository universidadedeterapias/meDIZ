// components/app-sidebar.tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from '@/components/ui/sidebar'
import { NavHistory } from './nav-history'

type Props = {
  history: {
    id: string
    threadId: string
    createdAt: string
    firstUserMessage: string
  }[]
  selectedThread: string | null
  onSelectSession: (threadId: string) => void
}

export function AppSidebar({
  history,
  selectedThread,
  onSelectSession,
  ...props
}: Props) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>{/* logo */}</SidebarHeader>
      <SidebarContent>
        {/* <NavOptions /> */}
        <NavHistory
          items={history}
          selectedThread={selectedThread}
          onSelect={onSelectSession}
        />
      </SidebarContent>
      <SidebarFooter>{/* <NavUser /> */}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
