import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Search } from 'lucide-react'
import Image from 'next/image'

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 z-50" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
        </header>
        <div className="flex flex-1 gap-4 p-4 -mt-32 align-middle h-svh justify-center">
          <div className="w-full flex flex-col align-middle justify-center gap-6">
            <div className="flex justify-center align-middle">
              <Image
                src={'/imgs/logo.svg'}
                alt="logo da mediz"
                width={250}
                height={150}
              />
            </div>
            <p className="text-2xl text-center">Como posso ajudar?</p>
            <div className="flex align-middle justify-center">
              <div className="w-full flex flex-row gap-1 max-w-4xl">
                <Input type="search" placeholder="Digite o que procura..." />
                <Button>
                  <Search />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
