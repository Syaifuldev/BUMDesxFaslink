import { Link } from 'react-router-dom'
import { QrCode, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 p-6 text-center">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30 mb-6">
        <QrCode className="h-10 w-10 text-primary-500" />
      </div>
      <h1 className="text-6xl font-bold text-surface-900 dark:text-surface-100 mb-2">404</h1>
      <p className="text-xl font-semibold text-surface-700 dark:text-surface-300 mb-2">Page not found</p>
      <p className="text-surface-500 dark:text-surface-400 mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button icon={<Home className="h-4 w-4" />} size="lg">
          Back to Dashboard
        </Button>
      </Link>
    </div>
  )
}
