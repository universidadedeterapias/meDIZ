// src/lib/sidebarOptions.ts
import { CreditCard, FileText } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'

export const sidebarOptions = [
  {
    name: 'Assinatura Plus',
    url: '/assinatura-plus',
    icon: CreditCard
  },
  {
    name: 'Suporte (WhatsApp)',
    url: 'https://wa.me/5511999999999',
    icon: FaWhatsapp
  },
  {
    name: 'Termos e Politicas',
    url: '/termos-e-politicas',
    icon: FileText
  }
] as const
