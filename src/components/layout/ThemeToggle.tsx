import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
        'text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100',
        'hover:bg-surface-100 dark:hover:bg-surface-800',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun className="h-4.5 w-4.5 transition-transform rotate-0 hover:rotate-12" />
      ) : (
        <Moon className="h-4.5 w-4.5 transition-transform rotate-0 hover:-rotate-12" />
      )}
    </button>
  )
}
