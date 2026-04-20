// src/lib/sidebarOptions.ts
import { FileText, GraduationCap, Headset, Star } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'

export const sidebarOptions = [
  {
    name: 'Assinatura Plus',
    translationKey: 'sidebar.subscriptionPlus',
    url: 'https://go.hotmart.com/N101121884P',
    icon: Star
  },
  {
    name: 'Suporte (WhatsApp)',
    translationKey: 'sidebar.supportWhatsapp',
    url: 'https://wa.me/5555997230707?text=Ol%C3%A1!%0AEstou%20no%20app%20_me_*DIZ!*%20e%20preciso%20de%20ajuda',
    icon: FaWhatsapp
  },
  {
    name: 'Professor',
    translationKey: 'sidebar.professorPaulo',
    url: '/professor-paulo',
    icon: GraduationCap
  },
  {
    name: 'Simulador de atendimento',
    translationKey: 'sidebar.meAtende',
    url: '/meatende',
    icon: Headset
  },
  {
    name: 'Termos e Politicas',
    translationKey: 'sidebar.termsPolicies',
    url: 'https://universidadedeterapias.com.br/termos-de-uso',
    icon: FileText
  }
] as const
