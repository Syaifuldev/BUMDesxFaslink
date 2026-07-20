// ============================================================
// hooks/useCheckins.ts
// React state wrapper for checkins.service.ts
// Supports paginated history, check-in / check-out / undo
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { checkinsService } from '@/services/checkins.service'
import type {
  CheckinRow,
  CheckinRPCResult,
  RecentCheckinView,
  CheckinMethod,
  DeviceInfo,
  FilterState,
  PaginatedResult,
} from '@/types/database'
import toast from 'react-hot-toast'

// ── Recent feed hook (dashboard) ─────────────────────────────

interface UseRecentCheckinsReturn {
  checkins: RecentCheckinView[]
  loading:  boolean
  error:    string | null
  refetch:  () => Promise<void>
}

export function useRecentCheckins(limit = 20): UseRecentCheckinsReturn {
  const [checkins, setCheckins] = useState<RecentCheckinView[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await checkinsService.getRecentFeed(limit)
      setCheckins(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load check-in feed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { refetch() }, [refetch])

  return { checkins, loading, error, refetch }
}

// ── Event check-in history hook ───────────────────────────────

interface UseCheckinHistoryOptions {
  eventId:    string
  filter?:    Partial<FilterState>
  page?:      number
  pageSize?:  number
  autoFetch?: boolean
}

interface UseCheckinHistoryReturn {
  checkins:   RecentCheckinView[]
  total:      number
  totalPages: number
  loading:    boolean
  error:      string | null
  refetch:    () => Promise<void>
  exportAll:  () => Promise<RecentCheckinView[]>
}

export function useCheckinHistory({
  eventId,
  filter,
  page     = 1,
  pageSize = 50,
  autoFetch = true,
}: UseCheckinHistoryOptions): UseCheckinHistoryReturn {
  const [result, setResult] = useState<PaginatedResult<RecentCheckinView>>({
    data: [], total: 0, page: 1, pageSize, totalPages: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
      const data = await checkinsService.getByEvent(eventId, filter, page, pageSize)
      setResult(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load check-in history'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [eventId, page, pageSize, filter?.search, filter?.status, filter?.dateFrom, filter?.dateTo])

  useEffect(() => {
    if (autoFetch) { refetch() }
  }, [refetch, autoFetch])

  const exportAll = useCallback(async (): Promise<RecentCheckinView[]> => {
    return checkinsService.exportByEvent(eventId)
  }, [eventId])

  return {
    checkins:   result.data,
    total:      result.total,
    totalPages: result.totalPages,
    loading,
    error,
    refetch,
    exportAll,
  }
}

// ── Scanner hook (QR check-in) ────────────────────────────────

interface UseScannerOptions {
  eventId: string
}

interface UseScannerReturn {
  lastResult:  CheckinRPCResult | null
  processing:  boolean
  scanCount:   number
  // Scan via QR token
  scan:         (qrToken: string, deviceInfo?: DeviceInfo) => Promise<CheckinRPCResult>
  // Manual check-in (no QR)
  checkIn:      (invitationId: string, notes?: string) => Promise<CheckinRow>
  // Check-out
  checkOut:     (invitationId: string, notes?: string) => Promise<CheckinRPCResult>
  // Undo last check-in
  undo:         (invitationId: string) => Promise<void>
  // Reset result panel
  resetResult:  () => void
}

export function useScanner({ eventId }: UseScannerOptions): UseScannerReturn {
  const [lastResult,  setLastResult]  = useState<CheckinRPCResult | null>(null)
  const [processing,  setProcessing]  = useState(false)
  const [scanCount,   setScanCount]   = useState(0)
  // Debounce: prevent the same QR from triggering twice in quick succession
  const lastTokenRef = useRef<string | null>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scan = useCallback(async (
    qrToken:    string,
    deviceInfo?: DeviceInfo,
  ): Promise<CheckinRPCResult> => {
    // Debounce repeated scans of the same token (3 s)
    if (qrToken === lastTokenRef.current) {
      return lastResult ?? { success: false, code: 'ALREADY_CHECKED_IN', message: 'Already processed' }
    }

    setProcessing(true)
    lastTokenRef.current = qrToken
    debounceRef.current && clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { lastTokenRef.current = null }, 3000)

    try {
      const result = await checkinsService.performCheckin({
        qrToken,
        eventId,
        method:     'qr',
        deviceInfo: deviceInfo ?? {},
      })
      setLastResult(result)
      setScanCount((n) => n + 1)

      if (result.success) {
        toast.success(`✓ ${result.invitation?.name ?? 'Guest'} checked in!`)
      } else if (result.code === 'ALREADY_CHECKED_IN') {
        toast(`${result.invitation?.name ?? 'Guest'} already checked in`, { icon: '⚠️' })
      } else {
        toast.error(result.message)
      }

      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Check-in failed'
      const errResult: CheckinRPCResult = {
        success: false,
        code:    'ACCESS_DENIED',
        message: msg,
      }
      setLastResult(errResult)
      toast.error(msg)
      return errResult
    } finally {
      setProcessing(false)
    }
  }, [eventId, lastResult])

  const checkIn = useCallback(async (
    invitationId: string,
    notes?:       string,
  ): Promise<CheckinRow> => {
    setProcessing(true)
    try {
      const row = await checkinsService.manualCheckin({
        invitationId,
        eventId,
        notes,
      })
      toast.success('Guest checked in manually')
      setScanCount((n) => n + 1)
      return row
    } catch (err) {
      const msg = err instanceof Error
        ? (err.message === 'ALREADY_CHECKED_IN' ? 'Already checked in' : err.message)
        : 'Check-in failed'
      toast.error(msg)
      throw err
    } finally {
      setProcessing(false)
    }
  }, [eventId])

  const checkOut = useCallback(async (
    invitationId: string,
    notes?:       string,
  ): Promise<CheckinRPCResult> => {
    setProcessing(true)
    try {
      const result = await checkinsService.performCheckout(invitationId, notes)
      if (result.success) {
        toast.success('Guest checked out')
      } else {
        toast.error(result.message)
      }
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Check-out failed'
      toast.error(msg)
      throw err
    } finally {
      setProcessing(false)
    }
  }, [])

  const undo = useCallback(async (invitationId: string): Promise<void> => {
    setProcessing(true)
    try {
      await checkinsService.undoCheckin(invitationId)
      toast.success('Check-in undone')
      setScanCount((n) => Math.max(0, n - 1))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Undo failed'
      toast.error(msg)
      throw err
    } finally {
      setProcessing(false)
    }
  }, [])

  const resetResult = useCallback(() => {
    setLastResult(null)
    lastTokenRef.current = null
  }, [])

  return {
    lastResult,
    processing,
    scanCount,
    scan,
    checkIn,
    checkOut,
    undo,
    resetResult,
  }
}
