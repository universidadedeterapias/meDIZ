'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { AdminNavLinkItem } from './AdminNavLinkItem'
import { useAdminNavLinks } from './useAdminNavLinks'

export function AdminMobileNav() {
  const [open, setOpen] = useState(false)
  const { mainLinks, bottomLinks } = useAdminNavLinks()

  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 md:hidden"
          aria-label="Abrir menu do admin"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[min(100vw-1rem,18rem)] flex-col gap-0 p-0 sm:max-w-xs"
      >
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle asChild>
            <Link href="/admin" onClick={close} className="text-lg font-bold text-indigo-600">
              meDIZ Admin
            </Link>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {mainLinks.map((link) => (
            <AdminNavLinkItem key={link.href} link={link} onNavigate={close} />
          ))}
        </nav>
        <nav className="space-y-0.5 border-t p-3">
          {bottomLinks.map((link) => (
            <AdminNavLinkItem key={link.href} link={link} onNavigate={close} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
