'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

/**
 * Componente de skeleton otimizado para a sidebar
 * Melhora a percepção de performance durante o carregamento
 */
export function SidebarSkeleton() {
  return (
    <div className="p-4 flex items-center gap-6">
      <Avatar className="w-16 h-16 border-2 border-indigo-600">
        <AvatarFallback>
          <Skeleton className="w-full h-full rounded-full" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}
