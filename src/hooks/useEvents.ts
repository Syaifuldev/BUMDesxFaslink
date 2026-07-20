import { useState, useEffect, useCallback } from 'react'
import { eventsService } from '@/services/events.service'
import { useAuth } from '@/context/AuthContext'
import type { Event, EventFormData } from '@/types'
import toast from 'react-hot-toast'

export function useEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await eventsService.getAll(user.id)
      setEvents(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load events'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const createEvent = async (data: EventFormData) => {
    if (!user) return
    const toastId = toast.loading('Creating event...')
    try {
      const event = await eventsService.create(user.id, data)
      setEvents((prev) => [{ ...event, guest_count: 0, checked_in_count: 0 }, ...prev])
      toast.success('Event created!', { id: toastId })
      return event
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create event'
      toast.error(msg, { id: toastId })
      throw err
    }
  }

  const updateEvent = async (id: string, data: Partial<EventFormData>) => {
    const toastId = toast.loading('Updating event...')
    try {
      const updated = await eventsService.update(id, data)
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...updated, guest_count: e.guest_count, checked_in_count: e.checked_in_count } : e))
      )
      toast.success('Event updated!', { id: toastId })
      return updated
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update event'
      toast.error(msg, { id: toastId })
      throw err
    }
  }

  const deleteEvent = async (id: string) => {
    const toastId = toast.loading('Deleting event...')
    try {
      await eventsService.delete(id)
      setEvents((prev) => prev.filter((e) => e.id !== id))
      toast.success('Event deleted!', { id: toastId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete event'
      toast.error(msg, { id: toastId })
      throw err
    }
  }

  return { events, loading, error, createEvent, updateEvent, deleteEvent, refetch: fetchEvents }
}
