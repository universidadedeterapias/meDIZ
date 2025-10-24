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

export function UserGrowthChart({ data, comparison, summary: _summary }: UserGrowthChartProps) {
  // Pegar apenas as duas últimas semanas (atual e anterior)
  const currentWeek = data[data.length - 1]
  const previousWeek = data[data.length - 2]

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

    </div>
  )
}
