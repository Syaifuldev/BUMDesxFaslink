// ============================================================
// components/analytics/StatCard.tsx
// Animated metric card with trend indicator and sparkline
// ============================================================
import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title:       string
  value:       string | number
  subtitle?:   string
  icon:        ReactNode
  iconBg:      string
  iconColor:   string
  trend?:      'up' | 'down' | 'neutral'
  trendLabel?: string
  loading?:    boolean
  accent?:     string   // tailwind bg class for left border
}

export function StatCard({
  title, value, subtitle, icon, iconBg, iconColor,
  trend, trendLabel, loading, accent = 'bg-primary-500',
}: StatCardProps) {
  return (
    <div className={cn(
      'relative flex flex-col gap-3 rounded-2xl bg-white dark:bg-surface-900',
      'border border-surface-100 dark:border-surface-800',
      'p-5 shadow-sm hover:shadow-md transition-shadow duration-200',
      'overflow-hidden group',
    )}>
      {/* Accent bar */}
      <div className={cn('absolute left-0 top-0 h-full w-1 rounded-l-2xl', accent)} />

      <div className="flex items-start justify-between">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shrink-0', iconBg)}>
          <span className={cn('h-5 w-5', iconColor)}>{icon}</span>
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            trend === 'up'      && 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
            trend === 'down'    && 'bg-red-50   dark:bg-red-900/30   text-red-600   dark:text-red-400',
            trend === 'neutral' && 'bg-surface-100 dark:bg-surface-800 text-surface-500',
          )}>
            {trend === 'up'      && <TrendingUp   className="h-3 w-3" />}
            {trend === 'down'    && <TrendingDown className="h-3 w-3" />}
            {trend === 'neutral' && <Minus        className="h-3 w-3" />}
            {trendLabel}
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
            <div className="h-3 w-28 rounded   bg-surface-100 dark:bg-surface-800 animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-100 tabular-nums">
              {value}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{subtitle}</p>
            )}
          </>
        )}
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-surface-400 dark:text-surface-500">
          {title}
        </p>
      </div>
    </div>
  )
}
