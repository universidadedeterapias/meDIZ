// src/components/admin/UserGrowthChart.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Users, Crown } from 'lucide-react'
import {
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface WeeklyGrowth {
  week: string
  weekStart: string
  weekEnd: string
  totalUsers: number
  newUsers: number
  premiumUsers: number
  freeUsers: number
  conversions: number
  growthRate: number
  conversionRate: number
}

interface UserGrowthChartProps {
  data: WeeklyGrowth[]
  comparison: {
    usersGrowth: number
    usersGrowthRate: number
    conversionsGrowth: number
    conversionsGrowthRate: number
  }
  summary: {
    totalWeeks: number
    averageGrowthRate: number
    averageConversionRate: number
    totalNewUsers: number
    totalConversions: number
  }
  current?: {
    totalUsers: number
    premiumUsers: number
    freeUsers: number
  }
}

export function UserGrowthChart({ 
  data, 
  comparison, 
  summary: _summary,
  current 
}: UserGrowthChartProps) {
  const [selectedDays, setSelectedDays] = useState(30)
  const [chartData, setChartData] = useState<WeeklyGrowth[]>(data)
  const [loading, setLoading] = useState(false)

  // Pegar apenas as duas últimas semanas (atual e anterior)
  const currentWeek = data[data.length - 1]
  const previousWeek = data[data.length - 2]

  // Dados atuais para o gráfico vertical
  const currentData = current || {
    totalUsers: currentWeek?.totalUsers || 0,
    premiumUsers: currentWeek?.premiumUsers || 0,
    freeUsers: currentWeek?.freeUsers || 0
  }

  // Dados para gráfico de barras (semana atual)
  const barChartData = [
    {
      name: 'Usuários',
      Premium: currentData.premiumUsers,
      Gratuito: currentData.freeUsers
    }
  ]

  // Dados para gráfico de linha (crescimento ao longo do tempo)
  const lineChartData = chartData.map(week => ({
    semana: week.week.split(' - ')[0], // Pegar apenas início da semana
    Premium: week.premiumUsers,
    Gratuito: week.freeUsers,
    Total: week.totalUsers
  }))

  // Função para filtrar por período
  const handleFilterChange = async (days: number) => {
    if (selectedDays === days) return // Evitar requisição duplicada
    
    setSelectedDays(days)
    setLoading(true)
    
    try {
      const response = await fetch(`/api/admin/user-growth?days=${days}`)
      if (!response.ok) throw new Error('Erro ao buscar dados')
      
      const result = await response.json()
      if (result.data && Array.isArray(result.data)) {
        setChartData(result.data)
      }
    } catch (error) {
      console.error('Erro ao filtrar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Atualizar chartData quando data mudar
  useEffect(() => {
    if (data && data.length > 0) {
      setChartData(data)
    }
  }, [data])

  // Cores vibrantes para os gráficos
  const colors = {
    premium: '#F59E0B', // Amarelo dourado
    free: '#3B82F6', // Azul
    premiumGradient: 'url(#premiumGradient)',
    freeGradient: 'url(#freeGradient)',
    total: '#8B5CF6' // Roxo
  }

  return (
    <div className="space-y-6">
      {/* Comparação Semana Anterior vs Atual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Semana Atual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Semana Atual</CardTitle>
            <Badge variant="outline" className="text-xs">Atual</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-gray-600">Total Usuários</span>
              </div>
              <div className="text-lg font-bold text-indigo-600">
                {currentWeek?.totalUsers || 0}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">Novos Usuários</span>
              </div>
              <div className="text-lg font-bold text-green-600">
                {currentWeek?.newUsers || 0}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-gray-600">Conversões</span>
              </div>
              <div className="text-lg font-bold text-yellow-600">
                {currentWeek?.conversions || 0}
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500 text-center">
                {currentWeek?.week || 'Semana atual'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Semana Anterior */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Semana Anterior</CardTitle>
            <Badge variant="secondary" className="text-xs">Anterior</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-gray-600">Total Usuários</span>
              </div>
              <div className="text-lg font-bold text-indigo-600">
                {previousWeek?.totalUsers || 0}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">Novos Usuários</span>
              </div>
              <div className="text-lg font-bold text-green-600">
                {previousWeek?.newUsers || 0}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-gray-600">Conversões</span>
              </div>
              <div className="text-lg font-bold text-yellow-600">
                {previousWeek?.conversions || 0}
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500 text-center">
                {previousWeek?.week || 'Semana anterior'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparação de Crescimento */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Crescimento</CardTitle>
          <CardDescription>
            Diferença entre semana atual e anterior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">
                {comparison.usersGrowth >= 0 ? '+' : ''}{comparison.usersGrowth}
              </div>
              <div className="text-sm text-gray-600">Novos Usuários</div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
                {comparison.usersGrowthRate >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                {Math.abs(comparison.usersGrowthRate).toFixed(1)}%
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {comparison.conversionsGrowth >= 0 ? '+' : ''}{comparison.conversionsGrowth}
              </div>
              <div className="text-sm text-gray-600">Conversões</div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
                {comparison.conversionsGrowthRate >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                {Math.abs(comparison.conversionsGrowthRate).toFixed(1)}%
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {currentWeek?.totalUsers || 0}
              </div>
              <div className="text-sm text-gray-600">Total Atual</div>
              <div className="text-xs text-gray-500 mt-1">
                vs {previousWeek?.totalUsers || 0} anterior
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Vertical - Premium vs Gratuito (Semana Atual) */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Usuários - Semana Atual</CardTitle>
          <CardDescription>
            Quantidade de usuários Premium vs Gratuito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <defs>
                <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#D97706" stopOpacity={0.8}/>
                </linearGradient>
                <linearGradient id="freeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="Premium" 
                fill={colors.premium}
                radius={[8, 8, 0, 0]}
                label={{ position: 'top', fill: '#1F2937', fontSize: 12 }}
              />
              <Bar 
                dataKey="Gratuito" 
                fill={colors.free}
                radius={[8, 8, 0, 0]}
                label={{ position: 'top', fill: '#1F2937', fontSize: 12 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico Horizontal - Crescimento ao Longo do Tempo */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Crescimento ao Longo do Tempo</CardTitle>
              <CardDescription>
                Evolução de usuários Premium e Gratuitos
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedDays === 7 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(7)}
                disabled={loading}
              >
                7 dias
              </Button>
              <Button
                variant={selectedDays === 15 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(15)}
                disabled={loading}
              >
                15 dias
              </Button>
              <Button
                variant={selectedDays === 30 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(30)}
                disabled={loading}
              >
                30 dias
              </Button>
              <Button
                variant={selectedDays === 60 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(60)}
                disabled={loading}
              >
                60 dias
              </Button>
              <Button
                variant={selectedDays === 90 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(90)}
                disabled={loading}
              >
                90 dias
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-gray-500">Carregando dados...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={lineChartData}>
                <defs>
                  <linearGradient id="premiumAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="freeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="totalAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="semana" 
                  stroke="#6B7280"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Premium"
                  stackId="1"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#premiumAreaGradient)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="Gratuito"
                  stackId="1"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#freeAreaGradient)"
                  fillOpacity={1}
                />
                <Line
                  type="monotone"
                  dataKey="Total"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#8B5CF6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
