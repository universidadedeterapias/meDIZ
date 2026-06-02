'use client'

import Link from 'next/link'
import type { AdminNavLink } from './useAdminNavLinks'

type AdminNavLinkItemProps = {
  link: AdminNavLink
  onNavigate?: () => void
}

export function AdminNavLinkItem({ link, onNavigate }: AdminNavLinkItemProps) {
  const Icon = link.icon

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={`flex min-h-11 items-center rounded-md px-3 py-2.5 transition-colors ${
        link.active
          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300'
          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-muted'
      }`}
    >
      <Icon className="mr-3 h-5 w-5 shrink-0" />
      <span className="flex-1 text-sm">{link.label}</span>
      {link.badge != null && link.badge > 0 && (
        <span className="min-w-[20px] rounded-full bg-red-500 px-2 py-0.5 text-center text-xs text-white">
          {link.badge}
        </span>
      )}
    </Link>
  )
}
