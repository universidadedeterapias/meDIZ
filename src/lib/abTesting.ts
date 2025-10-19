// src/lib/abTesting.ts
export interface ABTestVariant {
  id: string
  name: string
  description: string
  config: Record<string, unknown>
  weight: number // 0-100, porcentagem de tráfego
}

export interface ABTest {
  id: string
  name: string
  description: string
  variants: ABTestVariant[]
  status: 'draft' | 'running' | 'paused' | 'completed'
  startDate: Date
  endDate?: Date
  targetAudience?: string
  metrics: {
    impressions: number
    conversions: number
    conversionRate: number
  }
}

export const exampleTests: ABTest[] = [
  {
    id: 'test-1',
    name: 'Teste de Cores do Botão',
    description: 'Testa diferentes cores para o botão de assinatura',
    variants: [
      {
        id: 'variant-1',
        name: 'Azul Original',
        description: 'Botão azul padrão',
        config: { buttonColor: '#3B82F6' },
        weight: 50
      },
      {
        id: 'variant-2',
        name: 'Verde',
        description: 'Botão verde',
        config: { buttonColor: '#10B981' },
        weight: 50
      }
    ],
    status: 'running',
    startDate: new Date('2024-01-01'),
    metrics: {
      impressions: 1000,
      conversions: 50,
      conversionRate: 5.0
    }
  },
  {
    id: 'test-2',
    name: 'Teste de Texto do Popup',
    description: 'Testa diferentes textos para o popup de promoção',
    variants: [
      {
        id: 'variant-1',
        name: 'Texto Original',
        description: 'Texto padrão do popup',
        config: { 
          title: 'Oferta Especial!',
          subtitle: 'Assine agora e economize 50%'
        },
        weight: 50
      },
      {
        id: 'variant-2',
        name: 'Texto Urgente',
        description: 'Texto com senso de urgência',
        config: { 
          title: 'Últimas Horas!',
          subtitle: 'Oferta expira em breve - não perca!'
        },
        weight: 50
      }
    ],
    status: 'draft',
    startDate: new Date(),
    metrics: {
      impressions: 0,
      conversions: 0,
      conversionRate: 0
    }
  }
]
