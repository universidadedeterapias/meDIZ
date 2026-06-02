'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@radix-ui/react-separator'

export default function MyAccountSkeleton() {
  return (
    <>
      {/* Header */}
      <header className="w-full sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded" />
          </div>
          <Skeleton className="h-6 w-28" />
          <div />
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Perfil */}
        <Card className="shadow-sm">
          <CardHeader className="flex items-center gap-4 p-4">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </CardHeader>
        </Card>

        {/* Assinatura */}
        <Card className="border-yellow-400 bg-yellow-50 shadow-sm text-sm border-l-4">
          <CardHeader className="space-y-1 p-4">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
        </Card>

        <Separator />

        {/* Informações do Usuário */}
        <Card className="shadow-sm">
          <CardHeader className="flex justify-between items-center p-4">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-8 w-16 rounded" />
          </CardHeader>
          <Separator />
          <CardContent className="p-4 space-y-3">
            {['Nome', 'E-mail', 'Whatsapp', 'ID'].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Planos & Preços */}
        <Card className="shadow-sm">
          <CardHeader className="flex justify-between items-center p-4">
            <Skeleton className="h-5 w-1/4" />
          </CardHeader>
          <Separator />
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/5" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-8 flex-1 rounded" />
              <Skeleton className="h-8 flex-1 rounded" />
            </div>
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
      </div>
    </>
  )
}
