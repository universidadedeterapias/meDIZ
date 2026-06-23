import type { TooltipProps } from 'recharts'

/** Props do Recharts alinhadas ao tema claro/escuro (shadcn). */
export const adminChartTooltipProps: Pick<
  TooltipProps<number, string>,
  'contentStyle' | 'labelStyle' | 'itemStyle'
> = {
  contentStyle: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--popover-foreground))'
  },
  labelStyle: {
    color: 'hsl(var(--popover-foreground))'
  },
  itemStyle: {
    color: 'hsl(var(--popover-foreground))'
  }
}

export const adminChartGridProps = {
  strokeDasharray: '3 3',
  stroke: 'hsl(var(--border))'
} as const

export const adminChartAxisStroke = 'hsl(var(--muted-foreground))'

export const adminChartAxisTick = {
  fill: 'hsl(var(--muted-foreground))'
} as const

export const adminChartBarLabel = {
  position: 'top' as const,
  fill: 'hsl(var(--foreground))',
  fontSize: 12
} as const
