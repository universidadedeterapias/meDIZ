'use client'

import Link from 'next/link'
import { AdminNavLinkItem } from './AdminNavLinkItem'
import { useAdminNavLinks } from './useAdminNavLinks'

export default function AdminSidebar() {
  const { mainLinks, bottomLinks } = useAdminNavLinks()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="border-b p-4 sm:p-6">
        <Link href="/admin" className="text-lg font-bold text-indigo-600 sm:text-xl">
          meDIZ Admin
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <nav className="space-y-0.5">
          {mainLinks.map((link) => (
            <AdminNavLinkItem key={link.href} link={link} />
          ))}
        </nav>
      </div>

      <div className="border-t p-3 sm:p-4">
        <nav className="space-y-0.5">
          {bottomLinks.map((link) => (
            <AdminNavLinkItem key={link.href} link={link} />
          ))}
        </nav>
      </div>
    </div>
  )
}
