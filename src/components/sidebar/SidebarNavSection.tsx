'use client'

import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar'

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
    <SidebarGroup className={className}>
      <SidebarGroupLabel className="px-2 py-1.5 text-xs font-medium text-violet-600 group-data-[collapsible=icon]:hidden dark:text-violet-400">
        {title}
      </SidebarGroupLabel>
      {children}
    </SidebarGroup>
  )
}
