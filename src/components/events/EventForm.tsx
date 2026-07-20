import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventSchema } from '@/lib/validations'
import type { Event, EventFormData } from '@/types'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface EventFormProps {
  event?: Event | null
  onSubmit: (data: EventFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

type EventFieldValues = {
  name: string
  description?: string
  date: string
  time?: string
  location?: string
  capacity?: number
  status: 'draft' | 'active' | 'completed' | 'cancelled'
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function EventForm({ event, onSubmit, onCancel, loading }: EventFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<EventFieldValues, any, EventFieldValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      name: event?.name ?? '',
      description: event?.description ?? '',
      date: event?.date ?? '',
      time: event?.time ?? '',
      location: event?.location ?? '',
      capacity: event?.capacity ?? undefined,
      status: event?.status ?? 'draft',
    },
  })

  const isLoading = loading || isSubmitting

  const handleFormSubmit: SubmitHandler<EventFieldValues> = (data) =>
    onSubmit(data as EventFormData)

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Event Name *"
        placeholder="Annual Gala Dinner"
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Date *"
          type="date"
          error={errors.date?.message}
          {...register('date')}
        />
        <Input
          label="Time"
          type="time"
          error={errors.time?.message}
          {...register('time')}
        />
      </div>

      <Input
        label="Location"
        placeholder="Grand Ballroom, Hotel XYZ"
        error={errors.location?.message}
        {...register('location')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Capacity"
          type="number"
          placeholder="200"
          min={0}
          error={errors.capacity?.message}
          {...register('capacity')}
        />
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          error={errors.status?.message}
          {...register('status')}
        />
      </div>

      <Textarea
        label="Description"
        placeholder="Brief event description..."
        rows={3}
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={isLoading} className="flex-1">
          {event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  )
}
