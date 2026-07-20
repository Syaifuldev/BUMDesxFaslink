import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { QrCode, Eye, EyeOff } from 'lucide-react'
import { registerSchema, type RegisterFormData } from '@/lib/validations'
import { authService } from '@/services/auth.service'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const mappedEmail = `${data.username}@app.local`
      await authService.signUp(mappedEmail, data.password, data.full_name)
      toast.success('Account created! You can now sign in.')
      navigate('/login')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-12 relative overflow-hidden">
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
            Your events.<br />Your guests.<br />Under control.
          </h2>
          <p className="text-primary-200 text-lg max-w-sm">
            Start managing your events for free. No credit card required.
          </p>
        </div>
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-primary-500/30" />
        <div className="absolute top-1/4 -right-12 h-48 w-48 rounded-full bg-primary-400/20" />
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex lg:hidden items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
                <QrCode className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-surface-900 dark:text-white">GuestSync</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Create account</h1>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Start managing your events today.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                autoComplete="name"
                error={errors.full_name?.message}
                {...register('full_name')}
              />
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
                autoComplete="new-password"
                error={errors.password?.message}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword((p) => !p)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register('password')}
              />
              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
                Create Account
              </Button>
            </form>

            <p className="text-center text-sm text-surface-500 dark:text-surface-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 dark:text-primary-400 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
