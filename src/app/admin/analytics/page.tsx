'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Download, HelpCircle, AlertCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Tipos de dados reais
interface AnalyticsStats {
  totalUsers: number
  premiumUsers: number
  freeUsers: number
  globalConversionRate: number
  totalConversions: number
  averageSubscriptionValue: number
}

interface DailyData {
  date: string
  conversions: number
  newUsers: number
  conversionRate: number
}

interface PeriodData {
  period: string
  name: string
  total: number
  conversions: number
  rate: number
}

interface AnalyticsData {
  stats: AnalyticsStats
  dailyData: DailyData[]
  periodData: PeriodData[]
  timeRange: string
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('conversions')
  const [timeRange, setTimeRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/analytics?range=${timeRange}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar analytics')
      }

      const data = await response.json()
      setAnalyticsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao buscar analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange, fetchAnalytics])

  const handleExport = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      const response = await fetch(`/api/admin/export?type=analytics&format=${format}`)
      
      if (!response.ok) {
        throw new Error('Erro ao exportar dados')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Erro na exportação:', err)
      alert('Erro ao exportar dados')
    }
  }

  // Função para formatar números com separador de milhar
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Análise de Conversão</h1>
        <div className="flex gap-4">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('xlsx')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar XLSX
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversions">Taxa de Conversão</TabsTrigger>
          <TabsTrigger value="engagement">Engajamento</TabsTrigger>
          <TabsTrigger value="retention">Retenção</TabsTrigger>
        </TabsList>
        <TabsContent value="conversions" className="space-y-6">
          {error && (
            <div className="flex items-center justify-center py-12 text-red-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Cards com métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Taxa de Conversão Global"
              value={analyticsData?.stats.globalConversionRate ? `${analyticsData.stats.globalConversionRate.toFixed(2)}%` : '0%'}
              change="+0.8%"
              changeType="positive"
              description="Baseado nos últimos 7 dias"
              loading={loading}
            />
            <MetricCard
              title="Conversões Totais"
              value={analyticsData?.stats.totalConversions?.toString() || '0'}
              change="+12"
              changeType="positive"
              description="Comparado com período anterior"
              loading={loading}
            />
            <MetricCard
              title="Valor Médio de Assinatura"
              value={`R$ ${analyticsData?.stats.averageSubscriptionValue?.toFixed(2) || '39,90'}`}
              change="0%"
              changeType="neutral"
              description="Plano mensal mais comum"
              loading={loading}
            />
          </div>

          {/* Gráfico de conversão (simulado) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Taxa de Conversão ao Longo do Tempo</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Porcentagem de usuários gratuitos que se convertem para assinantes pagos.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Análise de {timeRange === '7d' ? '7 dias' : timeRange === '30d' ? '30 dias' : '3 meses'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-md" />
              ) : analyticsData?.dailyData ? (
                <div className="w-full bg-gray-50 rounded-md p-4 overflow-hidden">
                  <div className="h-[250px] w-full flex items-end justify-center space-x-1 overflow-x-auto">
                    {analyticsData.dailyData.map((day, idx) => {
                      const maxRate = Math.max(...analyticsData.dailyData.map(d => d.conversionRate))
                      const barHeight = maxRate > 0 ? (day.conversionRate / maxRate) * 200 : 5
                      
                      return (
                        <div 
                          key={idx} 
                          className="flex flex-col items-center justify-end min-w-[30px] max-w-[50px] flex-1"
                        >
                          <div 
                            className="bg-indigo-600 w-full rounded-t-sm transition-all duration-300" 
                            style={{ 
                              height: `${Math.max(barHeight, 5)}px`,
                              minHeight: '5px'
                            }}
                            title={`${day.date}: ${day.conversionRate.toFixed(2)}%`}
                          ></div>
                          <div className="text-xs mt-2 text-center text-gray-600">
                            {day.date.split('-')[2]}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between items-center mt-4 px-2 text-sm text-gray-500">
                    <span>0%</span>
                    <span className="font-medium">Taxa de Conversão</span>
                    <span>{Math.max(...analyticsData.dailyData.map(d => d.conversionRate)).toFixed(1)}%</span>
                  </div>
                </div>
              ) : (
                <div className="h-[300px] w-full bg-gray-50 rounded-md p-4 flex items-center justify-center">
                  <p className="text-gray-500">Nenhum dado disponível</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabela de conversão por período de usuário */}
          <Card>
            <CardHeader>
              <CardTitle>Conversão por Período de Usuário</CardTitle>
              <CardDescription>
                Análise baseada nos três períodos definidos nas regras de uso
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[200px] w-full bg-gray-100 animate-pulse rounded-md" />
              ) : analyticsData?.periodData ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left">Período</th>
                        <th className="px-4 py-3 text-left">Total de Usuários</th>
                        <th className="px-4 py-3 text-left">Conversões</th>
                        <th className="px-4 py-3 text-left">Taxa de Conversão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.periodData.map((period) => (
                        <tr key={period.period} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{period.name}</td>
                          <td className="px-4 py-3">{formatNumber(period.total)}</td>
                          <td className="px-4 py-3">{formatNumber(period.conversions)}</td>
                          <td className="px-4 py-3 font-medium">
                            {period.rate.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-gray-50">
                        <td className="px-4 py-3">Total</td>
                        <td className="px-4 py-3">{formatNumber(analyticsData.periodData.reduce((acc, curr) => acc + curr.total, 0))}</td>
                        <td className="px-4 py-3">{formatNumber(analyticsData.periodData.reduce((acc, curr) => acc + curr.conversions, 0))}</td>
                        <td className="px-4 py-3">
                          {(analyticsData.periodData.reduce((acc, curr) => acc + curr.conversions, 0) / 
                            analyticsData.periodData.reduce((acc, curr) => acc + curr.total, 0) * 100).toFixed(2)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-[200px] w-full bg-gray-50 rounded-md p-4 flex items-center justify-center">
                  <p className="text-gray-500">Nenhum dado disponível</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <p className="text-sm text-gray-500">
                Os usuários mais recentes (1-7 dias) têm a maior taxa de conversão, indicando a 
                importância da experiência inicial.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Engajamento</CardTitle>
              <CardDescription>
                Dados de engajamento dos usuários com o sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <p className="text-gray-500">
                Módulo de análise de engajamento em desenvolvimento.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Retenção</CardTitle>
              <CardDescription>
                Dados de retenção dos usuários ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <p className="text-gray-500">
                Módulo de análise de retenção em desenvolvimento.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componente para cartão de métrica
function MetricCard({
  title,
  value,
  change,
  changeType,
  description,
  loading
}: {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  description: string
  loading: boolean
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-500">{title}</span>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 animate-pulse rounded my-2"></div>
          ) : (
            <div className="flex items-baseline mt-1">
              <span className="text-2xl font-bold">{value}</span>
              <span className={`ml-2 text-sm font-medium ${
                changeType === 'positive' 
                  ? 'text-green-600' 
                  : changeType === 'negative' 
                    ? 'text-red-600' 
                    : 'text-gray-500'
              }`}>
                {change}
              </span>
            </div>
          )}
          <span className="text-xs text-gray-500 mt-1">{description}</span>
        </div>
      </CardContent>
    </Card>
  )
}
