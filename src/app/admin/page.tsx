// src/app/admin/page.tsx
// Página principal do admin - Server Component

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Administrativo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardCard
          title="Gerenciar Pop-ups"
          description="Configure pop-ups entre pesquisas para usuários do plano gratuito."
          linkText="Acessar Pop-ups"
          href="/admin/popup"
        />
        
        <DashboardCard
          title="Configurações"
          description="Ajuste as configurações do sistema e efeito de blur para o conteúdo."
          linkText="Acessar Configurações"
          href="/admin/settings"
        />
        
        <DashboardCard
          title="Testes A/B"
          description="Configure e monitore testes A/B para otimizar taxas de conversão."
          linkText="Acessar Testes A/B"
          href="/admin/ab-testing"
        />
        
        <DashboardCard
          title="Análises"
          description="Visualize métricas e análises de conversão de planos."
          linkText="Acessar Análises"
          href="/admin/analytics"
        />
      </div>
      
      <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
        <h2 className="text-lg font-medium text-indigo-700 mb-2">Documentação</h2>
        <p className="text-indigo-600 mb-4">
          Confira a documentação completa sobre as regras do plano gratuito e as
          implementações realizadas:
        </p>
        <div className="space-y-2">
          <a 
            href="/docs/plano-gratuito-regras-uso.md"
            target="_blank"
            className="block text-indigo-600 hover:underline"
          >
            📄 Regras de Uso do Plano Gratuito
          </a>
          <a 
            href="/docs/correcao-acesso-admin.md"
            target="_blank"
            className="block text-indigo-600 hover:underline"
          >
            📄 Correção do Acesso ao Painel Admin
          </a>
          <a 
            href="/docs/correcao-erro-build.md"
            target="_blank"
            className="block text-indigo-600 hover:underline"
          >
            📄 Correção de Erros de Build
          </a>
        </div>
      </div>
    </div>
  )
}

// Card para itens do dashboard
function DashboardCard({
  title,
  description,
  linkText,
  href
}: {
  title: string
  description: string
  linkText: string
  href: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{description}</p>
        <a 
          href={href}
          className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-700"
        >
          {linkText}
          <svg 
            className="ml-1 w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
    </div>
  )
}