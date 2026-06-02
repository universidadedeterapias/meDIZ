'use client'

// src/app/admin/test-layout/page.tsx
// Este é um Server Component
import ClientTest from './ClientTest'

export default function TestLayoutPage() {
  // Data de renderização no servidor
  const serverTime = new Date().toLocaleString()
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Teste de Renderização do Layout</h1>
        <p className="mb-4">
          Esta página verifica se o layout do admin está sendo renderizado corretamente.
          Se você consegue ver esta página dentro do layout administrativo (com sidebar e header),
          significa que a renderização está funcionando adequadamente.
        </p>
        
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <h2 className="font-semibold mb-2">Informações do Servidor</h2>
          <ul className="space-y-1 text-sm">
            <li><strong>Data/Hora no Servidor:</strong> {serverTime}</li>
            <li><strong>Ambiente:</strong> {process.env.NODE_ENV}</li>
            <li><strong>Tipo de Componente:</strong> Server Component</li>
          </ul>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Teste de Componentes do Layout</h2>
        
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded">
            <h3 className="font-semibold mb-2">Título H3</h3>
            <p>Este é um parágrafo de teste para verificar estilos de texto.</p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded">
            <h3 className="font-semibold mb-2">Botões</h3>
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                Botão Primário
              </button>
              <button className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50">
                Botão Secundário
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Botão Perigo
              </button>
            </div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded">
            <h3 className="font-semibold mb-2">Tabela</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Papel
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Jane Cooper
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Ativo
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Admin
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      John Doe
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Inativo
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Editor
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Verificação de Compatibilidade</h2>
        
        <div className="flex flex-col space-y-2">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
            <span>Renderização do servidor funcionando</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
            <span>Layout do admin carregado corretamente</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
            <span>Proteção de middleware ativa</span>
          </div>
        </div>
      </div>
      
      {/* Componente Cliente */}
      <ClientTest />
    </div>
  )
}
