import { Menu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'

interface NavbarProps {
  title: string
  onMenuClick: () => void
  className?: string
  actions?: React.ReactNode
}

export function Navbar({ title, onMenuClick, className, actions }: NavbarProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between h-14 px-4 lg:px-6',
        'border-b border-surface-200 dark:border-surface-800',
        'bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm',
        'sticky top-0 z-30',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-surface-500 hover:text-surface-800 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-100 dark:hover:bg-surface-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  )
}
