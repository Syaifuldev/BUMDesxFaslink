import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, className, padding = 'md', hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white dark:bg-surface-900',
        'border-surface-200 dark:border-surface-800',
        'shadow-sm',
        hover && 'hover:shadow-md hover:border-surface-300 dark:hover:border-surface-700 transition-all duration-200 cursor-pointer',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 mb-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
        {description && (
          <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
