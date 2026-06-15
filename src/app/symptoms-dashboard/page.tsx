// app/symptoms-dashboard/page.tsx
'use client'

import { SymptomsDashboard } from '@/components/SymptomsDashboard'
import { AppSidebar } from '@/components/app-sidebar'
import { AppPageHeader } from '@/components/navigation/AppPageHeader'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useTranslation } from '@/i18n/useTranslation'

export default function SymptomsDashboardPage() {
  const { t } = useTranslation()

  return (
    <SidebarProvider>
      <AppSidebar
        history={[]}
        selectedThread={null}
        onSelectSession={() => {}}
      />
      <SidebarInset>
        <div className="flex min-h-svh flex-col bg-background">
          <AppPageHeader
            title={t('dashboard.symptoms.title', 'Dashboard de Sintomas')}
          />
          <div className="flex min-h-0 flex-1 overflow-y-auto">
            <div className="container mx-auto max-w-7xl min-w-0 px-3 py-4 sm:px-4 md:px-6 md:py-8">
              <SymptomsDashboard />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

