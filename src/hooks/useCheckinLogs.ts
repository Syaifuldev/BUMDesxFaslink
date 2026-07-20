import { useState, useEffect, useCallback } from 'react'
import { checkinService } from '@/services/checkin.service'
import { useAuth } from '@/context/AuthContext'
import type { CheckinLog } from '@/types'

export function useCheckinLogs(eventId?: string) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<CheckinLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = eventId
        ? await checkinService.getLogsByEvent(eventId)
        : await checkinService.getAllLogs(user.id)
      setLogs(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load check-in history'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user, eventId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refetch: fetchLogs }
}

export function useRecentCheckins(limit = 10) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<CheckinLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await checkinService.getRecentLogs(user.id, limit)
      setLogs(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [user, limit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, refetch: fetchLogs }
}
