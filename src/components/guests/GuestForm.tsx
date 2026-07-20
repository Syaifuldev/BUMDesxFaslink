import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { guestSchema } from '@/lib/validations'
import type { Guest, GuestFormData } from '@/types'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface GuestFormProps {
  guest?: Guest | null
  onSubmit: (data: GuestFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function GuestForm({ guest, onSubmit, onCancel, loading }: GuestFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: guest?.name ?? '',
      email: guest?.email ?? '',
      phone: guest?.phone ?? '',
      company: guest?.company ?? '',
      table_number: guest?.table_number ?? '',
      seat_number: guest?.seat_number ?? '',
      notes: guest?.notes ?? '',
    },
  })

  const isLoading = loading || isSubmitting

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Full Name *"
        placeholder="John Doe"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Alamat"
        placeholder="Jl. Raya No. 123"
        error={errors.company?.message}
        {...register('company')}
      />
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={isLoading} className="flex-1">
          {guest ? 'Update Guest' : 'Add Guest'}
        </Button>
      </div>
    </form>
  )
}
