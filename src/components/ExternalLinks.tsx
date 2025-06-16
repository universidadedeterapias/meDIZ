import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'
import { Calendar, GraduationCap, Headphones } from 'lucide-react'
import Link from 'next/link'

export function ExternalLinks() {
  // 3 opções com ícone e link
  const links = [
    {
      icon: Headphones,
      label: 'Áudio Terapia',
      href: 'https://universidadedeterapias.com.br/thank-you-audiotherapy'
    },
    {
      icon: Calendar,
      label: 'Agendar Terapia',
      href: 'http://universidadedeterapias.com.br/agendesuaterapia'
    },
    {
      icon: GraduationCap,
      label: 'Formação',
      href: 'http://universidadedeterapias.com.br/formacao'
    }
  ]

  return (
    <Carousel className="w-full">
      <CarouselContent className="-ml-1">
        {links.map(({ icon: Icon, label, href }, idx) => (
          <CarouselItem key={idx} className="pl-1 md:basis-1/2 lg:basis-1/3">
            <Link href={href} target="_blank" rel="noopener noreferrer">
              <div className="flex items-center justify-center space-x-2 bg-indigo-600 text-white rounded-md p-2 mx-4 shadow-sm">
                <Icon className="w-6 h-6" />
                <span className="text-base font-medium">{label}</span>
              </div>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="!left-1" />
      <CarouselNext className="!right-1" />
    </Carousel>
  )
}
