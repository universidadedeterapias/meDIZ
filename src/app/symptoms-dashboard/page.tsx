// app/symptoms-dashboard/page.tsx
'use client'

import { SymptomsDashboard } from '@/components/SymptomsDashboard'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function SymptomsDashboardPage() {
  return (
    <SidebarProvider>
      <AppSidebar 
        history={[]}
        selectedThread={null}
        onSelectSession={() => {}}
      />
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto py-4 md:py-8 px-4 md:px-6 max-w-7xl">
              <SymptomsDashboard />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

