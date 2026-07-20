import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { QrCode, Eye, EyeOff } from 'lucide-react'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { authService } from '@/services/auth.service'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    try {
      const mappedEmail = `${data.username}@app.local`
      await authService.signIn(mappedEmail, data.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">GuestSync</span>
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Manage your events<br />with confidence.
          </h2>
          <p className="text-primary-200 text-lg max-w-sm">
            Real-time check-ins, QR codes, guest lists, and Excel import/export — all in one place.
          </p>
          <div className="flex gap-3 pt-2">
            {['QR Check-in', 'Realtime', 'Excel I/O', 'Multi-Event'].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur">
                {tag}
              </span>
            ))}
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-primary-500/30" />
        <div className="absolute top-1/4 -right-12 h-48 w-48 rounded-full bg-primary-400/20" />
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm space-y-6">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
                <QrCode className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-surface-900 dark:text-white">GuestSync</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Sign in</h1>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Welcome back! Sign in to your account.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Username"
                type="text"
                placeholder="superadmin"
                autoComplete="username"
                error={errors.username?.message}
                {...register('username')}
              />
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword((p) => !p)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register('password')}
              />
              <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
                Sign In
              </Button>
            </form>

            <p className="text-center text-sm text-surface-500 dark:text-surface-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary-600 dark:text-primary-400 hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
