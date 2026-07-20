import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  iconColor?: string
  iconBg?: string
  trend?: number
  trendLabel?: string
  subtitle?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  icon,
  iconColor = 'text-primary-600 dark:text-primary-400',
  iconBg = 'bg-primary-50 dark:bg-primary-900/30',
  trend,
  trendLabel,
  subtitle,
  className,
}: StatsCardProps) {
  const hasTrend = trend !== undefined
  const isPositive = (trend ?? 0) >= 0

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-surface-200 dark:border-surface-800',
        'bg-white dark:bg-surface-900 p-5 shadow-sm',
        'hover:shadow-md hover:border-surface-300 dark:hover:border-surface-700',
        'transition-all duration-200',
        className
      )}
    >
      {/* Subtle gradient glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50/50 to-transparent dark:from-primary-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400 truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-surface-900 dark:text-surface-100 tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">{subtitle}</p>
          )}
          {hasTrend && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(trend!)}% {trendLabel || 'from last month'}
            </div>
          )}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shrink-0', iconBg)}>
          <div className={cn('h-5 w-5', iconColor)}>{icon}</div>
        </div>
      </div>
    </div>
  )
}
