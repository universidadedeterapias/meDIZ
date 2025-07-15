'use client'
import { LogOut, type LucideIcon } from 'lucide-react'

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { IconType } from 'react-icons/lib'
import { Button } from './ui/button'

export type NavOption = {
  name: string
  url: string
  icon: LucideIcon | IconType
}

interface NavOptionsProps {
  options: readonly NavOption[]
}

export function NavOptions({ options }: NavOptionsProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <SidebarGroup className="group">
      <SidebarMenu className="gap-1 pt-4">
        {options.map((item, idx) => {
          // abertura em nova aba para todos exceto o primeiro (idx=0) e o último
          const isExternal = idx !== 0 && idx !== options.length - 1

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild className="px-4 py-6">
                <a
                  href={item.url}
                  className="flex items-center gap-4 text-zinc-800"
                  {...(isExternal
                    ? {
                        target: '_blank',
                        rel: 'noopener noreferrer'
                      }
                    : {})}
                >
                  <item.icon
                    style={{ width: '24px', height: '24px' }}
                    className="text-zinc-800"
                  />
                  <span className="group-data-[collapsed=true]:hidden text-lg">
                    {item.name}
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}

        {/* item de logout permanece como está, sem target="_blank" */}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="px-4 py-6">
            <Button
              variant={'link'}
              onClick={handleLogout}
              className="text-zinc-800 font-normal flex items-center justify-start gap-4 group-data-[collapsed=true]:hidden text-lg"
            >
              <LogOut style={{ width: '24px', height: '24px' }} />
              Sair
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
