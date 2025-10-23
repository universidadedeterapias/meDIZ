'use client'
import { LogOut, type LucideIcon } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useUser } from '@/contexts/user'
import { IconType } from 'react-icons/lib'

type SubscriptionAPI = {
  status: 'active' | 'trialing' | 'cancel_at_period_end' | 'canceled'
  currentPeriodEnd: string | null
}

type NavOption = {
  name: string
  url: string
  icon: LucideIcon | IconType
}

interface NavOptionsProps {
  options: readonly NavOption[]
}

export function NavOptions({ options }: NavOptionsProps) {
  const router = useRouter()
  const { user } = useUser()
  const [subscription, setSubscription] = useState<SubscriptionAPI | null>(null)

  // Carrega status da assinatura
  useEffect(() => {
    if (!user?.id) return
    fetch('/api/stripe/subscription')
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(setSubscription)
      .catch(() =>
        setSubscription({ status: 'canceled', currentPeriodEnd: null })
      )
  }, [user?.id])

  const isSubscribed =
    subscription?.status.toLocaleLowerCase() === 'active' ||
    subscription?.status.toLocaleLowerCase() === 'trialing'

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <SidebarGroup className="group">
      <SidebarMenu className="gap-1 pt-4">
        {options.map((item, idx) => {
          // Opção premium em destaque e só se não for assinante
          if (idx === 0 && !isSubscribed) {
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  className="px-4 py-6 bg-yellow-100 rounded-lg border border-yellow-300 border-l-4"
                >
                  <a
                    href={item.url}
                    className="flex items-center gap-4 text-yellow-800 font-semibold text-lg group-data-[collapsed=true]:hidden"
                  >
                    <item.icon
                      style={{ width: 24, height: 24 }}
                      className="text-yellow-800"
                      strokeWidth="1"
                      fill="yellow"
                    />
                    {item.name}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          // Pula a opção premium se já for assinante
          if (idx === 0 && isSubscribed) {
            return null
          }

          // Itens normais (idx > 0)
          const isExternal = idx !== options.length - 1
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild className="px-4 py-6">
                <a
                  href={item.url}
                  className="flex items-center gap-4 text-zinc-800 text-lg group-data-[collapsed=true]:hidden"
                  {...(isExternal
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  <item.icon style={{ width: 24, height: 24 }} />
                  {item.name}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}

        {/* Logout */}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="px-4 py-6">
            <Button
              variant="link"
              onClick={handleLogout}
              className="w-full justify-start text-zinc-800 font-normal flex items-center gap-4 text-base group-data-[collapsed=true]:hidden pl-4"
            >
              <LogOut style={{ width: 24, height: 24 }} />
              Sair
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
