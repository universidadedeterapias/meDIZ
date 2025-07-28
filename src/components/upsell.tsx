// app/components/UpSell.tsx
'use client'
import logo from '@/app/assets/iconemeDIZ512x512.png'
import { ArrowLeft, Calendar, Check, DollarSign, Menu } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { TypingText } from './TypingText'
import { Button } from './ui/button'

const FREE_MONTHLY_PLAN_ID = '3f376de0-8947-4715-8c00-8abeb7a09580'
const FREE_ANNUAL_PLAN_ID = 'd2cc5cc1-8f69-4466-ba58-4a29eb94db2b'

interface UpSellProps {
  isPlus?: boolean
}

export default function UpSell({ isPlus }: UpSellProps) {
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual'>('anual')

  const finalCtaRef = useRef<HTMLElement>(null)

  const handlePlanSelect = (plan: 'mensal' | 'anual') => {
    setSelectedPlan(plan)
    // rola suavemente até o botão de “Clique e Assine!”
    finalCtaRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleExperimentar = async () => {
    const planId =
      selectedPlan === 'anual' ? FREE_ANNUAL_PLAN_ID : FREE_MONTHLY_PLAN_ID

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId })
    })
    const { url, error } = await res.json()
    if (error) return alert(error)
    window.location.assign(url)
  }

  const scrollToPlans = () => {
    const el = document.getElementById('select_plan')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/chat" className="text-primary">
            <ArrowLeft />
          </a>
          <p className="text-primary font-bold text-2xl">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
          <div>{/* Espaço à direita */}</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* 1. Tip Box */}
        {!isPlus && (
          <section className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow">
            <div className="w-full flex flex-row items-center justify-center">
              <Image src={logo} alt={''} width={60} height={60} />
            </div>
            <TypingText
              text="Suas pesquisas gratuitas acabaram por hoje!"
              speed={60}
              className="text-xl text-gray-800 font-semibold"
            />
            <p className="text-sm text-gray-600 mt-2">
              O <strong>plano gratuito</strong> oferece somente 3 pesquisas ao
              dia.
            </p>
          </section>
        )}

        {/* 2. Oferta Especial */}
        <section className="text-center space-y-2">
          {!isPlus && (
            <>
              <p className="text-lg text-gray-700">
                Mas, temos uma condição especial para você:
              </p>
              <div className="text-4xl">😁</div>
            </>
          )}
          <div className="bg-gray-900 text-white rounded-xl p-6 shadow-lg">
            <p className="text-lg">
              Experimente o{' '}
              <span className="font-bold bg-primary p-1 rounded">
                Plano Profissional
              </span>
            </p>
            <p className="mt-2">
              e aproveite <strong>30 dias gratuitos</strong> sem cobrança
              imediata.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              (Atenção: esta promoção encerra em algumas horas.)
            </p>
          </div>
        </section>

        {/* 3. Funcionalidades */}
        <section className="px-4 space-y-2">
          {[
            'Consultas Ilimitadas',
            'Respostas Avançadas',
            'Funcionalidades Exclusivas',
            'Suporte Humano'
          ].map(texto => (
            <div key={texto} className="flex items-center">
              <span className="bg-green-500 text-white p-2 rounded-full">
                <Check className="w-4 h-4" />
              </span>
              <span className="ml-3 text-gray-800">{texto}</span>
            </div>
          ))}
        </section>

        {/* 4. Chamada para Ação */}
        <section className="px-4">
          <Button
            className="w-full py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white animate-bounce"
            onClick={scrollToPlans}
          >
            Quero Assinar Agora!
          </Button>
        </section>

        {/* 5. Como Funciona */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="text-xl font-semibold text-center text-gray-800">
            Como Funciona:
          </h3>
          <ol className="space-y-3">
            {[
              'Clique em "Assinar"',
              'Seu acesso ao Plano Profissional é desbloqueado imediatamente.',
              'Nenhuma cobrança será feita hoje.',
              'Você tem 30 dias gratuitos para decidir.',
              'Se gostar continue e quando quiser, cancele!'
            ].map((step, i) => (
              <li key={i} className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary text-white rounded-full mr-3 font-semibold">
                  {i + 1}
                </span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* 6. Como Cancelar */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Como Cancelar:
          </h3>
          <ol className="space-y-2">
            <li className="flex items-center">
              <Menu className="w-5 h-5 text-gray-600 mr-2" />
              <span>Clique em &quot;Menu&quot;</span>
            </li>
            <li className="flex items-center">
              <span className="flex-shrink-0 w-5 h-5 text-gray-600 mr-2">
                2.
              </span>
              <span>
                Acesse <strong>Minha Conta</strong>
              </span>
            </li>
            <li className="flex items-center">
              <span className="flex-shrink-0 w-5 h-5 text-gray-600 mr-2">
                3.
              </span>
              <span>
                Clique em <strong>Cancelar Assinatura</strong>
              </span>
            </li>
          </ol>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              É fácil assinar e mais fácil ainda cancelar quando não quiser
              mais!
            </p>
          </div>
        </section>

        {/* 7. Escolha seu Plano */}
        <section
          className="bg-white rounded-xl shadow p-6 space-y-4"
          id="select_plan"
        >
          <h3 className="text-xl font-semibold text-center text-gray-800">
            Escolha seu plano:
          </h3>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => handlePlanSelect('mensal')}
              className={`
                w-full flex items-start p-4 rounded-lg border
                ${
                  selectedPlan === 'mensal'
                    ? 'border-primary'
                    : 'border-gray-200'
                }
              `}
            >
              <Calendar
                className={`w-6 h-6 mr-3 ${
                  selectedPlan === 'mensal' ? 'text-primary' : 'text-gray-400'
                }`}
              />
              <div>
                <h4 className="font-semibold">Plano Mensal</h4>
                <p className="text-lg font-bold">R$ 39,90/mês</p>
                <p className="text-sm text-gray-500">
                  Flexibilidade total para cancelar
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handlePlanSelect('anual')}
              className={`
                relative w-full flex items-start p-4 rounded-lg border
                ${
                  selectedPlan === 'anual'
                    ? 'border-primary'
                    : 'border-gray-200'
                }
              `}
            >
              <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                MAIS ECONÔMICO
              </span>
              <DollarSign
                className={`w-6 h-6 mr-3 ${
                  selectedPlan === 'anual' ? 'text-primary' : 'text-gray-400'
                }`}
              />
              <div>
                <h4 className="font-semibold">Plano Anual</h4>
                <p className="text-lg font-bold">R$ 29,90/mês</p>
                <p className="text-sm text-gray-500">
                  Economia de R$ 120 por ano
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* 8. CTA Final e Rodapé */}
        <section className="space-y-4" ref={finalCtaRef}>
          <Button
            className="w-full py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white"
            onClick={handleExperimentar}
          >
            Clique e Assine!
          </Button>

          <div className="text-center text-sm text-gray-600 space-y-2">
            <div className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded">
              100% Pagamento Seguro
            </div>
            {/* Aqui você pode adicionar as logos de Visa, Mastercard etc */}
          </div>
        </section>

        <section className="bg-gray-900 text-white rounded-xl p-6 text-center">
          <p>
            Assine Agora o{' '}
            <span className="font-bold text-primary">Plano Profissional</span>
          </p>
          <p className="mt-2 text-sm">Você não será cobrado hoje!</p>
        </section>
      </main>
    </div>
  )
}
