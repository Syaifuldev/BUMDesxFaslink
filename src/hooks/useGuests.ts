import { useState, useEffect, useCallback } from 'react'
import { guestsService } from '@/services/guests.service'
import { checkinService } from '@/services/checkin.service'
import { useAuth } from '@/context/AuthContext'
import type { Guest, GuestFormData } from '@/types'
import toast from 'react-hot-toast'

export function useGuests(eventId: string) {
  const { user } = useAuth()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGuests = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
      const data = await guestsService.getByEvent(eventId)
      setGuests(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load guests'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchGuests()
  }, [fetchGuests])

  const addGuest = async (data: GuestFormData) => {
    const toastId = toast.loading('Adding guest...')
    try {
      const guest = await guestsService.create(eventId, data)
      setGuests((prev) => [...prev, guest])
      toast.success('Guest added!', { id: toastId })
      return guest
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add guest'
      toast.error(msg, { id: toastId })
      throw err
    }
  }

  const updateGuest = async (id: string, data: Partial<GuestFormData>) => {
    const toastId = toast.loading('Updating guest...')
    try {
      const updated = await guestsService.update(id, data)
      setGuests((prev) => prev.map((g) => (g.id === id ? updated : g)))
      toast.success('Guest updated!', { id: toastId })
      return updated
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update guest'
      toast.error(msg, { id: toastId })
      throw err
    }
  }

  const removeGuest = async (id: string) => {
    const toastId = toast.loading('Removing guest...')
    try {
      await guestsService.delete(id)
      setGuests((prev) => prev.filter((g) => g.id !== id))
      toast.success('Guest removed!', { id: toastId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove guest'
      toast.error(msg, { id: toastId })
      throw err
    }
  }

  const checkInGuest = async (guestId: string, method: 'qr' | 'manual' = 'manual') => {
    try {
      const updated = await guestsService.checkIn(guestId, method)
      setGuests((prev) => prev.map((g) => (g.id === guestId ? updated : g)))
      // Legacy logCheckin removed (guests table is source of truth)
      toast.success('Guest checked in! ✓')
      return updated
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Check-in failed'
      toast.error(msg)
      throw err
    }
  }

  const undoCheckIn = async (guestId: string) => {
    try {
      const updated = await guestsService.undoCheckIn(guestId)
      setGuests((prev) => prev.map((g) => (g.id === guestId ? updated : g)))
      toast.success('Check-in reversed')
      return updated
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to undo check-in'
      toast.error(msg)
      throw err
    }
  }

  const bulkImport = async (rows: GuestFormData[]) => {
    const toastId = toast.loading(`Importing ${rows.length} guests...`)
    try {
      const result = await guestsService.bulkCreate(eventId, rows)
      await fetchGuests()
      if (result.errors.length > 0) {
        toast.error(`Imported ${result.count} guests with ${result.errors.length} errors`, { id: toastId })
      } else {
        toast.success(`Successfully imported ${result.count} guests!`, { id: toastId })
      }
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      toast.error(msg, { id: toastId })
      throw err
    }
  }

  return {
    guests,
    loading,
    error,
    addGuest,
    updateGuest,
    removeGuest,
    checkInGuest,
    undoCheckIn,
    bulkImport,
    refetch: fetchGuests,
  }
}
