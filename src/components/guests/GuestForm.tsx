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
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Email"
          type="email"
          placeholder="john@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="+62 812 3456 7890"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>
      <Input
        label="Company / Organization"
        placeholder="Acme Corporation"
        error={errors.company?.message}
        {...register('company')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Table Number"
          placeholder="A1"
          error={errors.table_number?.message}
          {...register('table_number')}
        />
        <Input
          label="Seat Number"
          placeholder="1"
          error={errors.seat_number?.message}
          {...register('seat_number')}
        />
      </div>
      <Textarea
        label="Notes"
        placeholder="Special requirements, dietary restrictions..."
        rows={2}
        error={errors.notes?.message}
        {...register('notes')}
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
