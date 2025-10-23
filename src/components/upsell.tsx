'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Check, 
  DollarSign, 
  Star, 
  Zap, 
  Shield, 
  Heart,
  ArrowRight,
  X
} from 'lucide-react'

interface UpsellProps {
  onClose: () => void
  onSubscribe: (plan: 'mensal' | 'anual') => void
}

export function Upsell({ onClose, onSubscribe }: UpsellProps) {
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual'>('anual')

  const features = [
    {
      icon: <Heart className="w-5 h-5 text-red-500" />,
      title: "Suporte Emocional 24/7",
      description: "Nossa IA está sempre disponível para te ouvir e oferecer apoio emocional"
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      title: "Respostas Instantâneas",
      description: "Obtenha respostas imediatas para suas dúvidas sobre saúde e bem-estar"
    },
    {
      icon: <Shield className="w-5 h-5 text-blue-500" />,
      title: "Privacidade Total",
      description: "Seus dados são protegidos com criptografia de ponta a ponta"
    },
    {
      icon: <Star className="w-5 h-5 text-purple-500" />,
      title: "Conteúdo Exclusivo",
      description: "Acesso a artigos, exercícios e dicas personalizadas"
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-primary">
                Desbloqueie Todo o Potencial do meDIZ!
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                Transforme sua experiência em saúde e bem-estar
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-4"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50">
                {feature.icon}
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Plans */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Escolha seu plano</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plano Mensal */}
              <button
                onClick={() => setSelectedPlan('mensal')}
                className={`relative p-4 border-2 rounded-lg transition-all ${
                  selectedPlan === 'mensal'
                    ? 'border-primary'
                    : 'border-gray-200'
                }`}
              >
                <DollarSign
                  className={`w-6 h-6 mr-3 ${
                    selectedPlan === 'mensal' ? 'text-primary' : 'text-gray-400'
                  }`}
                />
                <div>
                  <h4 className="font-semibold">Plano Mensal</h4>
                  <p className="text-lg font-bold">R$ 39,90/mês</p>
                  <p className="text-sm text-gray-500">
                    Flexibilidade total para cancelar
                  </p>
                </div>
              </button>

              {/* Plano Anual */}
              <button
                onClick={() => setSelectedPlan('anual')}
                className={`relative p-4 border-2 rounded-lg transition-all ${
                  selectedPlan === 'anual'
                    ? 'border-primary'
                    : 'border-gray-200'
                }`}
              >
                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  MAIS ECONÔMICO
                </span>
                <DollarSign
                  className={`w-6 h-6 mr-3 ${
                    selectedPlan === 'anual' ? 'text-primary' : 'text-gray-400'
                  }`}
                />
                <div>
                  <h4 className="font-semibold">Plano Anual</h4>
                  <p className="text-lg font-bold">R$ 29,90/mês</p>
                  <p className="text-sm text-gray-500">
                    Economia de R$ 120 por ano
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-semibold text-primary mb-2">O que você ganha:</h4>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Acesso ilimitado a todas as funcionalidades
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Suporte prioritário via WhatsApp
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Relatórios personalizados de saúde
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Lembretes inteligentes de medicamentos
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                Garantia de 7 dias
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Cancele quando quiser
              </Badge>
            </div>
            
            <Button
              onClick={() => onSubscribe(selectedPlan)}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-lg font-semibold"
              size="lg"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <p className="text-xs text-gray-500">
              Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}