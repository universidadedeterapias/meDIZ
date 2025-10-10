// components/nav-history.tsx
'use client'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import {
  differenceInCalendarDays,
  format,
  isToday,
  isYesterday
} from 'date-fns'
import React from 'react'

type Item = {
  id: string
  threadId: string
  createdAt: string
  firstUserMessage: string
}

type Props = {
  items: Item[]
  selectedThread: string | null
  onSelect: (threadId: string) => void
}

export function NavHistory({ items, selectedThread, onSelect }: Props) {
  // 1) garante ordem decrescente (mais recente primeiro)
  const sorted = items
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  let lastDateKey = ''

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Histórico</SidebarGroupLabel>
      <SidebarMenu>
        {sorted.map(item => {
          const date = new Date(item.createdAt)

          // 2) calcula o rótulo do grupo de data
          let dateLabel: string
          const now = new Date()
          if (isToday(date)) dateLabel = 'Hoje'
          else if (isYesterday(date)) dateLabel = 'Ontem'
          else if (differenceInCalendarDays(now, date) === 2)
            dateLabel = 'Anteontem'
          else dateLabel = format(date, 'dd/MM/yyyy')

          // 3) decide se insere um divider antes deste item
          const dateKey = dateLabel
          const showDivider = dateKey !== lastDateKey
          lastDateKey = dateKey

          // 4) prepara o texto da label da thread
          const raw = item.firstUserMessage.trim()
          const label = raw
            ? raw.length > 30
              ? raw.slice(0, 30) + '…'
              : raw
            : format(date, 'dd/MM/yyyy HH:mm')

          const isActive = item.threadId === selectedThread

          return (
            <React.Fragment key={item.id}>
              {showDivider && (
                <SidebarMenuItem
                  key={`divider-${item.id}`}
                  className="pointer-events-none"
                >
                  <div className="w-full px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {dateLabel}
                  </div>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem data-active={isActive}>
                <SidebarMenuButton
                  onClick={() => onSelect(item.threadId)}
                  title={raw || format(date, 'dd/MM/yyyy HH:mm')}
                >
                  {label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </React.Fragment>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
