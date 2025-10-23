// src/components/admin/UserGrowthChart.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Users, Crown } from 'lucide-react'

interface WeeklyGrowth {
  week: string
  weekStart: string
  weekEnd: string
  totalUsers: number
  newUsers: number
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
}

export function UserGrowthChart({ data, comparison, summary }: UserGrowthChartProps) {
  // Encontrar valores máximos para escala
  const maxUsers = Math.max(...data.map(d => d.totalUsers))
  const maxConversions = Math.max(...data.map(d => d.conversions))

  return (
    <div className="space-y-6">
      {/* Resumo das Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento Semanal</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comparison.usersGrowth}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {comparison.usersGrowthRate >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              {Math.abs(comparison.usersGrowthRate).toFixed(1)}% vs semana anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões Semanais</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comparison.conversionsGrowth}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {comparison.conversionsGrowthRate >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              {Math.abs(comparison.conversionsGrowthRate).toFixed(1)}% vs semana anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média de Crescimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageGrowthRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Últimas {summary.totalWeeks} semanas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média de Conversão</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageConversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Últimas {summary.totalWeeks} semanas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Crescimento Total de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Crescimento Total de Usuários</CardTitle>
          <CardDescription>
            Evolução do número total de usuários por semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Gráfico de Barras */}
            <div className="flex items-end justify-between h-64 border-b border-l border-gray-200 px-4 pb-4">
              {data.map((week, index) => {
                const height = (week.totalUsers / maxUsers) * 200 // Altura máxima 200px
                const isCurrentWeek = index === data.length - 1
                const isPreviousWeek = index === data.length - 2
                
                return (
                  <div key={week.week} className="flex flex-col items-center flex-1 mx-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 rounded-t transition-all duration-300 ${
                          isCurrentWeek 
                            ? 'bg-indigo-600' 
                            : isPreviousWeek 
                            ? 'bg-indigo-400' 
                            : 'bg-indigo-300'
                        }`}
                        style={{ height: `${height}px` }}
                        title={`${week.totalUsers} usuários`}
                      />
                      <div className="text-xs text-gray-600 mt-2 text-center">
                        {week.totalUsers}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                      {week.week}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Legenda */}
            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded"></div>
                <span>Semana Atual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-400 rounded"></div>
                <span>Semana Anterior</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-300 rounded"></div>
                <span>Outras Semanas</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Conversões */}
      <Card>
        <CardHeader>
          <CardTitle>Conversões por Semana</CardTitle>
          <CardDescription>
            Número de conversões (free → premium) por semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Gráfico de Barras */}
            <div className="flex items-end justify-between h-64 border-b border-l border-gray-200 px-4 pb-4">
              {data.map((week, index) => {
                const height = maxConversions > 0 ? (week.conversions / maxConversions) * 200 : 0
                const isCurrentWeek = index === data.length - 1
                const isPreviousWeek = index === data.length - 2
                
                return (
                  <div key={week.week} className="flex flex-col items-center flex-1 mx-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 rounded-t transition-all duration-300 ${
                          isCurrentWeek 
                            ? 'bg-green-600' 
                            : isPreviousWeek 
                            ? 'bg-green-400' 
                            : 'bg-green-300'
                        }`}
                        style={{ height: `${height}px` }}
                        title={`${week.conversions} conversões`}
                      />
                      <div className="text-xs text-gray-600 mt-2 text-center">
                        {week.conversions}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                      {week.week}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Legenda */}
            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span>Semana Atual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span>Semana Anterior</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-300 rounded"></div>
                <span>Outras Semanas</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Dados Detalhados */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Detalhados por Semana</CardTitle>
          <CardDescription>
            Métricas completas de cada semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Semana</th>
                  <th className="text-right p-2">Total Usuários</th>
                  <th className="text-right p-2">Novos Usuários</th>
                  <th className="text-right p-2">Conversões</th>
                  <th className="text-right p-2">Taxa Crescimento</th>
                  <th className="text-right p-2">Taxa Conversão</th>
                </tr>
              </thead>
              <tbody>
                {data.map((week, index) => {
                  const isCurrentWeek = index === data.length - 1
                  const isPreviousWeek = index === data.length - 2
                  
                  return (
                    <tr key={week.week} className={`border-b ${isCurrentWeek ? 'bg-indigo-50' : ''}`}>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {week.week}
                          {isCurrentWeek && <Badge variant="outline" className="text-xs">Atual</Badge>}
                          {isPreviousWeek && <Badge variant="secondary" className="text-xs">Anterior</Badge>}
                        </div>
                      </td>
                      <td className="text-right p-2 font-medium">{week.totalUsers}</td>
                      <td className="text-right p-2">{week.newUsers}</td>
                      <td className="text-right p-2">{week.conversions}</td>
                      <td className="text-right p-2">
                        <span className={week.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {week.growthRate >= 0 ? '+' : ''}{week.growthRate}%
                        </span>
                      </td>
                      <td className="text-right p-2">
                        <span className={week.conversionRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {week.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
