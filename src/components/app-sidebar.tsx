'use client'

import {
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  Search
} from 'lucide-react'
import * as React from 'react'

import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from '@/components/ui/sidebar'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { NavHistory } from './nav-history'
import { NavOptions } from './nav-options'

// This is sample data.
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg'
  },
  teams: [
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise'
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup'
    },
    {
      name: 'Evil Corp.',
      logo: Command,
      plan: 'Free'
    }
  ],
  history: [],
  options: [
    {
      name: 'Nova pesquisa',
      url: '#',
      icon: Search
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [history, setHistory] = useState<unknown[]>([])

  console.log(history)

  useEffect(() => {
    const fetchSessions = async () => {
      const res = await fetch('/api/chat/sessions')
      const data = await res.json()
      setHistory(data)
    }

    fetchSessions()
  }, [])
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="p-1 rounded-sm bg-green-500 flex align-middle justify-center pb-0 w-full h-12 ">
          <Image
            src={'/imgs/logo.svg'}
            alt="logo da mediz"
            width={250}
            height={150}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavOptions options={data.options} />
        <NavHistory items={data.history} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
