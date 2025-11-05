'use client'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'
import { GraduationCap, Headphones } from 'lucide-react'
import Link from 'next/link'

export function ExternalLinks() {
  const links = [
    {
      icon: Headphones,
      label: 'Audioterapia',
      href: 'https://universidadedeterapias.com.br/thank-you-audiotherapy'
    },
    {
      icon: GraduationCap,
      label: 'Formação',
      href: 'http://universidadedeterapias.com.br/formacao'
    }
  ]

  return (
    <Carousel className="w-full px-6">
      <CarouselContent className="overflow-visible -ml-1 flex gap-2">
        {links.map(({ icon: Icon, label, href }, idx) => (
          <CarouselItem
            key={idx}
            className="
              flex-none
              basis-[calc(50%-0.25rem)]
              min-w-0
              pl-1
            "
          >
            <Link href={href} target="_blank" rel="noopener noreferrer">
              <div className="flex items-center justify-center space-x-2 bg-indigo-600 text-white rounded-md p-2 shadow-sm">
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
