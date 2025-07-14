'use client'
import {
  ArrowLeft,
  Calendar,
  Check,
  DollarSign,
  ShieldAlert
} from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'

export default function UpSell() {
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual'>('anual')

  const handleExperimentar = () => {
    // aqui você envia `selectedPlan` para a sua API ou lógica de checkout
    console.log('Usuário escolheu:', selectedPlan)
  }
  return (
    <div className="min-h-screen bg-zinc-100">
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

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* 1. Tip Box */}
        <div className="flex flex-col items-center text-center bg-yellow-50 border border-yellow-400 p-4 rounded-lg shadow-sm">
          <span className="text-3xl">💡</span>
          <div>
            <h3 className="font-semibold text-lg text-yellow-900">
              Você já usou sua consulta gratuita de hoje
            </h3>
            <p className="text-sm text-yellow-800">
              O plano gratuito permite uma consulta por dia.
            </p>
            <p className="text-sm text-yellow-800">
              Que tal experimentar o plano completo?
            </p>
          </div>
        </div>

        {/* 2. Oferta principal */}
        <section className="space-y-2 bg-zinc-50 shadow-md rounded-lg px-4 py-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Experimente o <span className="text-primary">meDIZ!</span>
            <br />
            Completo por 30 dias,
            <br />
            sem compromisso
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Tenha acesso ilimitado a todas as consultas e recursos
            profissionais. Ideal para terapeutas que querem mais segurança e
            agilidade no atendimento.
          </p>
        </section>

        {/* 3. Garantia */}
        <section className="space-y-2 bg-emerald-50 border border-emerald-400 rounded-lg text-center px-4 py-6">
          <span className="text-3xl">
            <ShieldAlert />
          </span>
          <h3 className="text-xl font-semibold text-emerald-900">
            100% Sem Risco
          </h3>
          <p className="text-emerald-700">
            <strong>Use por 30 dias gratuitamente</strong>. Se não gostar,
            cancele com 1 clique antes do vencimento. Simples assim!
          </p>
        </section>

        {/* 4. Como funciona */}
        <section className="bg-zinc-50 shadow-md rounded-lg px-4 py-6 space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 text-center">
            Como funciona (muito simples):
          </h3>

          <ol className="mt-4 space-y-3 text-left">
            <li className="flex items-center bg-zinc-100 rounded-lg p-4 border-l-4 border-primary">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">
                1
              </span>
              <span className="text-gray-700">
                Clique em &quot;Experimentar Grátis&quot; abaixo
              </span>
            </li>

            <li className="flex items-center bg-zinc-100 rounded-lg p-4 border-l-4 border-primary">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">
                2
              </span>
              <span className="text-gray-700">
                Use todos os recursos por 30 dias
              </span>
            </li>

            <li className="flex items-center bg-zinc-100 rounded-lg p-4 border-l-4 border-primary">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-semibold mr-3">
                3
              </span>
              <span className="text-gray-700">
                Se gostar, continue. Se não, cancele facilmente
              </span>
            </li>
          </ol>
        </section>

        {/* 5. Planos */}
        {/* Seção de planos */}
        <section className="bg-white shadow-md rounded-lg p-4 space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 text-center">
            Escolha seu plano:
          </h3>

          <div className="space-y-3">
            {/* Plano Mensal */}
            <button
              type="button"
              onClick={() => setSelectedPlan('mensal')}
              className={`
              relative w-full flex items-start p-4 rounded-lg border 
              ${
                selectedPlan === 'mensal' ? 'border-primary' : 'border-gray-200'
              } 
              bg-white focus:outline-none
            `}
            >
              <Calendar
                className={`w-6 h-6 mr-3 ${
                  selectedPlan === 'mensal' ? 'text-primary' : 'text-gray-400'
                }`}
              />
              <div className="text-left">
                <h4 className="text-lg font-semibold mb-1">Plano Mensal</h4>
                <p
                  className={`text-2xl font-bold mb-1 ${
                    selectedPlan === 'mensal' ? 'text-primary' : 'text-gray-800'
                  }`}
                >
                  R$ 39,90/mês
                </p>
                <p className="text-sm text-gray-500">
                  Flexibilidade total para cancelar
                </p>
              </div>
            </button>

            {/* Plano Anual */}
            <button
              type="button"
              onClick={() => setSelectedPlan('anual')}
              className={`
              relative w-full flex items-start p-4 rounded-lg border 
              ${
                selectedPlan === 'anual' ? 'border-primary' : 'border-gray-200'
              } 
              bg-white focus:outline-none
            `}
            >
              {/* Badge */}
              <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                MAIS ECONÔMICO
              </span>

              <DollarSign
                className={`w-6 h-6 mr-3 ${
                  selectedPlan === 'anual' ? 'text-primary' : 'text-gray-400'
                }`}
              />
              <div className="text-left">
                <h4 className="text-lg font-semibold mb-1">Plano Anual</h4>
                <p
                  className={`text-2xl font-bold mb-1 ${
                    selectedPlan === 'anual' ? 'text-primary' : 'text-gray-800'
                  }`}
                >
                  R$ 29,90/mês
                </p>
                <p className="text-sm text-gray-500">
                  Economia de R$ 120 por ano
                </p>
              </div>
            </button>
          </div>
        </section>
        <section className="space-y-3">
          {[
            'Consultas ilimitadas durante o atendimento',
            'Respostas mais detalhadas e precisas',
            'Maior confiança em casos complexos',
            'Atendimento mais ágil e eficiente'
          ].map(feat => (
            <div
              key={feat}
              className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm p-4"
            >
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-500 text-white rounded mr-3">
                <Check className="w-4 h-4" />
              </span>
              <span className="text-gray-800">{feat}</span>
            </div>
          ))}
        </section>

        {/* Box de Cancelamento */}
        <section className="flex flex-col items-center text-center bg-blue-50 border border-blue-300 rounded-lg p-4">
          <span className="text-3xl">🔄</span>
          <p className="text-blue-800">
            <h3 className="font-semibold">Cancelamento super fácil</h3>
            <p>
              Basta acessar <strong>Minha Conta</strong> no app e clicar em
              <strong>Cancelar</strong>.
            </p>
            <p>Sem burocracias, sem ligações.</p>
          </p>
        </section>

        {/* 7. Chamada para ação */}
        <div>
          <Button
            className="w-full py-6 text-lg capitalize"
            onClick={handleExperimentar}
          >
            {`🎁 Experimente Grátis - Plano ${selectedPlan}`}
          </Button>
        </div>
      </main>
    </div>
  )
}
