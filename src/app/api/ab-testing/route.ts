// src/app/api/ab-testing/route.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { ABTest, exampleTests } from '@/lib/abTesting'

// Simulação de banco de dados (em um ambiente real, usaríamos o Prisma)
let testsDatabase = [...exampleTests]

// GET - Lista todos os testes A/B
export async function GET() {
  const session = await auth()
  
  // Verificação básica de permissão
  if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  
  try {
    return NextResponse.json(testsDatabase)
  } catch (error) {
    console.error('Erro ao listar testes A/B:', error)
    return NextResponse.json({ error: 'Erro ao listar testes A/B' }, { status: 500 })
  }
}

// POST - Cria ou atualiza um teste A/B
export async function POST(req: Request) {
  const session = await auth()
  
  // Verificação básica de permissão
  if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  
  try {
    const data = await req.json() as ABTest
    
    // Valida dados mínimos do teste
    if (!data.name || !data.variants || data.variants.length < 1) {
      return NextResponse.json({ 
        error: 'Dados incompletos. Nome e pelo menos uma variante são obrigatórios.' 
      }, { status: 400 })
    }
    
    // Verifica se é uma atualização ou criação
    if (data.id) {
      // Atualiza teste existente
      const index = testsDatabase.findIndex(test => test.id === data.id)
      
      if (index === -1) {
        return NextResponse.json({ error: 'Teste não encontrado' }, { status: 404 })
      }
      
      testsDatabase[index] = { ...data }
    } else {
      // Cria novo teste
      const newTest: ABTest = {
        ...data,
        id: `test-${Date.now()}`, // Gera ID único
        startDate: new Date()
      }
      
      testsDatabase.push(newTest)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar teste A/B:', error)
    return NextResponse.json({ error: 'Erro ao salvar teste A/B' }, { status: 500 })
  }
}

// DELETE - Remove um teste A/B
export async function DELETE(req: Request) {
  const session = await auth()
  
  // Verificação básica de permissão
  if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  
  if (!id) {
    return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
  }
  
  try {
    const initialLength = testsDatabase.length
    testsDatabase = testsDatabase.filter(test => test.id !== id)
    
    if (testsDatabase.length === initialLength) {
      return NextResponse.json({ error: 'Teste não encontrado' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir teste A/B:', error)
    return NextResponse.json({ error: 'Erro ao excluir teste A/B' }, { status: 500 })
  }
}
