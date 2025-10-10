'use client'

import { useState, useEffect } from 'react'

export default function ClientTest() {
  const [clientTime, setClientTime] = useState<string>('')
  const [windowWidth, setWindowWidth] = useState<number>(0)
  const [counter, setCounter] = useState<number>(0)
  const [mounted, setMounted] = useState<boolean>(false)
  
  // Efeito de montagem do componente
  useEffect(() => {
    // Atualizar horário do cliente
    setClientTime(new Date().toLocaleString())
    
    // Verificar largura da janela
    setWindowWidth(window.innerWidth)
    
    // Marcar como montado
    setMounted(true)
    
    // Adicionar listener de redimensionamento
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  
  // Incrementar contador
  const handleIncrement = () => {
    setCounter(prev => prev + 1)
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow mt-6">
      <h2 className="text-xl font-bold mb-4">Componente Cliente</h2>
      
      <div className="space-y-4">
        <div className="bg-indigo-50 p-4 rounded border border-indigo-100">
          <h3 className="font-semibold mb-2">Informações do Cliente</h3>
          <ul className="space-y-1 text-sm">
            <li><strong>Data/Hora no Cliente:</strong> {clientTime}</li>
            <li><strong>Largura da Janela:</strong> {windowWidth}px</li>
            <li><strong>Componente Montado:</strong> {mounted ? 'Sim' : 'Não'}</li>
            <li><strong>Tipo de Componente:</strong> Client Component</li>
          </ul>
        </div>
        
        <div className="p-4 border border-gray-200 rounded">
          <h3 className="font-semibold mb-2">Interatividade</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={handleIncrement}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Incrementar
            </button>
            <span className="text-lg font-semibold">{counter}</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Este botão testa a interatividade do componente cliente.
          </p>
        </div>
        
        <div className="p-4 border border-gray-200 rounded">
          <h3 className="font-semibold mb-2">Estado da Aplicação</h3>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
              <span>Hidratação React concluída</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
              <span>Eventos do navegador funcionando</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
              <span>Componente cliente renderizado corretamente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
