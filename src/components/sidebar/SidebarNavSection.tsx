'use client'

import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type SidebarNavSectionProps = {
  title: string
  children: React.ReactNode
  className?: string
}

export function SidebarNavSection({
  title,
  children,
  className
}: SidebarNavSectionProps) {
  return (
    <SidebarGroup
      className={cn(
        'mt-1 px-1 py-1.5 group-data-[collapsible=icon]:m-0 group-data-[collapsible=icon]:p-0.5',
        className
      )}
    >
      <SidebarGroupLabel className="mb-1 h-5 px-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-violet-700/70 group-data-[collapsible=icon]:hidden dark:text-violet-300/70">
        {title}
      </SidebarGroupLabel>
      {children}
    </SidebarGroup>
  )
}
