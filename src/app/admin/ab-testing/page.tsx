'use client'

import { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { 
  BarChart, 
  Loader2, 
  PlusCircle, 
  RefreshCcw, 
  Trash, 
  Edit, 
  Info 
} from 'lucide-react'
import { ABTest, ABTestVariant, exampleTests } from '@/lib/abTesting'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function ABTestingPage() {
  const [tests, setTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null)
  
  // Carrega os testes A/B
  useEffect(() => {
    // Simulação de carregamento dos testes do backend
    const timer = setTimeout(() => {
      setTests(exampleTests)
      setLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Formata uma data para exibição
  const formatDate = (date?: Date): string => {
    if (!date) return 'N/A'
    return new Intl.DateTimeFormat('pt-BR', { 
      dateStyle: 'medium' 
    }).format(date)
  }
  
  // Desativa um teste
  const handleDisableTest = (testId: string) => {
    setTests(prevTests => 
      prevTests.map(test => 
        test.id === testId ? { ...test, isActive: false } : test
      )
    )
  }
  
  // Ativa um teste
  const handleEnableTest = (testId: string) => {
    setTests(prevTests => 
      prevTests.map(test => 
        test.id === testId ? { ...test, isActive: true } : test
      )
    )
  }
  
  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Testes A/B</h1>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Teste A/B
        </Button>
      </div>
      
      {/* Lista de testes A/B */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Testes A/B Configurados</CardTitle>
          <CardDescription>
            Gerencie os testes A/B para otimizar as taxas de conversão
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : tests.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">Nenhum teste A/B configurado</p>
              <Button className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Primeiro Teste
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Teste</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Variantes</TableHead>
                    <TableHead>Data de Início</TableHead>
                    <TableHead>Data de Fim</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {test.name}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Info className="h-4 w-4 text-gray-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{test.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            test.isActive 
                              ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          }
                        >
                          {test.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{test.variants.length}</TableCell>
                      <TableCell>{formatDate(test.startDate)}</TableCell>
                      <TableCell>{formatDate(test.endDate)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedTest(test)}
                          >
                            <BarChart className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              if (test.isActive) {
                                handleDisableTest(test.id)
                              } else {
                                handleEnableTest(test.id)
                              }
                            }}
                          >
                            {test.isActive 
                              ? <Trash className="h-4 w-4 text-red-500" />
                              : <RefreshCcw className="h-4 w-4 text-green-600" />
                            }
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Detalhes do teste selecionado */}
      {selectedTest && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados: {selectedTest.name}</CardTitle>
            <CardDescription>{selectedTest.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="variants">Variantes</TabsTrigger>
                <TabsTrigger value="audience">Público-alvo</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <div className="space-y-4">
                  {/* Visão geral do teste */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-500">
                          Total de Impressões
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">2,457</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-500">
                          Total de Conversões
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">128</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-500">
                          Taxa de Conversão
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">5.21%</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Gráfico simulado */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Conversão por Variante</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <div className="flex items-end justify-around h-[250px]">
                        {selectedTest.variants.map((variant, idx) => {
                          // Taxa de conversão simulada para cada variante
                          const rate = [5.1, 5.7, 4.8][idx % 3]
                          return (
                            <div 
                              key={variant.id}
                              className="flex flex-col items-center w-1/4"
                            >
                              <div 
                                className="bg-indigo-600 w-20"
                                style={{ height: `${rate * 20}px` }}
                              ></div>
                              <p className="mt-2 text-sm font-medium">
                                {variant.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {rate}%
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="variants">
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome da Variante</TableHead>
                        <TableHead>Peso</TableHead>
                        <TableHead>Impressões</TableHead>
                        <TableHead>Conversões</TableHead>
                        <TableHead>Taxa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTest.variants.map((variant, idx) => {
                        // Dados simulados
                        const impressions = [823, 816, 818][idx % 3]
                        const conversions = [42, 47, 39][idx % 3]
                        const rate = ((conversions / impressions) * 100).toFixed(2)
                        
                        return (
                          <TableRow key={variant.id}>
                            <TableCell className="font-medium">
                              {variant.name}
                            </TableCell>
                            <TableCell>{variant.weight}%</TableCell>
                            <TableCell>{impressions}</TableCell>
                            <TableCell>{conversions}</TableCell>
                            <TableCell>
                              <span className={
                                idx === 1 ? 'text-green-600 font-medium' : ''
                              }>
                                {rate}%
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  
                  {selectedTest.variants.length > 1 && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <BarChart className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-green-800">
                              A variante "{selectedTest.variants[1].name}" está se saindo melhor
                            </h3>
                            <div className="mt-1 text-sm text-green-700">
                              <p>
                                Com uma taxa de conversão 11.8% maior que a média, esta variante 
                                está demonstrando resultados significativamente melhores.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="audience">
                <Card>
                  <CardHeader>
                    <CardTitle>Público-alvo do Teste</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Períodos de Usuários Incluídos:</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTest.targetAudience?.map(period => (
                          <Badge key={period} variant="outline">
                            {period === 'first-week' 
                              ? 'Primeiros 7 dias' 
                              : period === 'first-month'
                                ? '8-30 dias'
                                : '31+ dias'
                            }
                          </Badge>
                        )) || (
                          <Badge variant="outline">Todos os usuários</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-2">Distribuição por Período:</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead>Impressões</TableHead>
                            <TableHead>Conversões</TableHead>
                            <TableHead>Taxa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Primeiros 7 dias</TableCell>
                            <TableCell>0</TableCell>
                            <TableCell>0</TableCell>
                            <TableCell>0%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>8-30 dias</TableCell>
                            <TableCell>1,243</TableCell>
                            <TableCell>71</TableCell>
                            <TableCell>5.71%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>31+ dias</TableCell>
                            <TableCell>1,214</TableCell>
                            <TableCell>57</TableCell>
                            <TableCell>4.70%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="border-t p-6 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setSelectedTest(null)}
            >
              Fechar
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Aplicar Vencedor
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
