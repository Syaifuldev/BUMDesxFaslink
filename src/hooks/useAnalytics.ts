// ============================================================
// hooks/useAnalytics.ts
// Fetches all analytics data for a given event.
// Provides realtime subscription via Supabase channels.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RecentCheckinView } from '@/types/database'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface AttendanceStats {
  total:          number
  checkedIn:      number
  notCheckedIn:   number
  percentage:     number   // 0-100, 1 decimal
}

export interface HourlyDataPoint {
  hour:       number          // 0–23
  label:      string          // "00:00", "01:00" …
  count:      number          // check-ins that hour
  cumulative: number          // running total
}

export interface CategoryDataPoint {
  category:   string
  count:      number
  checkedIn:  number
  rate:       number          // 0-100
}

export interface AnalyticsData {
  stats:         AttendanceStats
  hourly:        HourlyDataPoint[]
  byCategory:    CategoryDataPoint[]
  recentCheckins: RecentCheckinView[]
  loading:       boolean
  error:         string | null
  lastUpdated:   Date | null
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function buildHourlySeries(
  checkins: { checked_in_at: string }[],
): HourlyDataPoint[] {
  const counts = new Array(24).fill(0)

  for (const c of checkins) {
    const h = new Date(c.checked_in_at).getHours()
    counts[h] += 1
  }

  let cumulative = 0
  return counts.map((count, hour) => {
    cumulative += count
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      count,
      cumulative,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────

export function useAnalytics(eventId: string): AnalyticsData & {
  refetch: () => Promise<void>
} {
  const [stats, setStats]               = useState<AttendanceStats>({ total: 0, checkedIn: 0, notCheckedIn: 0, percentage: 0 })
  const [hourly, setHourly]             = useState<HourlyDataPoint[]>([])
  const [byCategory, setByCategory]     = useState<CategoryDataPoint[]>([])
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckinView[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null)
  const channelRef                       = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Main data fetch ─────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    setError(null)

    try {
      // 1. Total invitations + category breakdown
      const { data: invData, error: invErr } = await supabase
        .from('invitations')
        .select('id, status, category')
        .eq('event_id', eventId)
        .is('deleted_at', null)

      if (invErr) throw new Error(invErr.message)
      const invitations = invData ?? []

      // 2. All check-in rows for this event (for hourly grouping)
      const { data: checkinData, error: checkinErr } = await supabase
        .from('checkins')
        .select('id, invitation_id, checked_in_at, method')
        .eq('event_id', eventId)
        .order('checked_in_at', { ascending: true })

      if (checkinErr) throw new Error(checkinErr.message)
      const checkins = checkinData ?? []

      // 3. Recent check-ins feed (view with joined data)
      const { data: recentData, error: recentErr } = await supabase
        .from('v_recent_checkins')
        .select('*')
        .eq('event_id', eventId)
        .order('checked_in_at', { ascending: false })
        .limit(15)

      if (recentErr) throw new Error(recentErr.message)

      // ── Compute stats ────────────────────────────────────
      const total      = invitations.length
      const checkedIn  = new Set(checkins.map((c) => c.invitation_id)).size
      const notIn      = total - checkedIn
      const percentage = total > 0
        ? Math.round((checkedIn / total) * 1000) / 10
        : 0

      setStats({ total, checkedIn, notCheckedIn: notIn, percentage })

      // ── Hourly series ────────────────────────────────────
      setHourly(buildHourlySeries(checkins))

      // ── Category breakdown ───────────────────────────────
      const catMap: Record<string, { total: number; checkedIn: number }> = {}
      const checkedInvIds = new Set(checkins.map((c) => c.invitation_id))

      for (const inv of invitations) {
        const cat = inv.category ?? 'general'
        if (!catMap[cat]) catMap[cat] = { total: 0, checkedIn: 0 }
        catMap[cat].total += 1
        if (checkedInvIds.has(inv.id)) catMap[cat].checkedIn += 1
      }

      const catData: CategoryDataPoint[] = Object.entries(catMap)
        .map(([category, { total, checkedIn }]) => ({
          category,
          count:    total,
          checkedIn,
          rate:     total > 0 ? Math.round((checkedIn / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)

      setByCategory(catData)
      setRecentCheckins((recentData ?? []) as RecentCheckinView[])
      setLastUpdated(new Date())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  // ── Initial fetch ────────────────────────────────────────
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── Supabase Realtime subscription ──────────────────────
  useEffect(() => {
    if (!eventId) return

    // Unsubscribe from previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`analytics:${eventId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'checkins',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Debounce: avoid stampede if many check-ins arrive at once
          setTimeout(() => fetchAll(), 300)
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'DELETE',
          schema: 'public',
          table:  'checkins',
          filter: `event_id=eq.${eventId}`,
        },
        () => { setTimeout(() => fetchAll(), 300) },
      )
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'invitations',
          filter: `event_id=eq.${eventId}`,
        },
        () => { setTimeout(() => fetchAll(), 300) },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [eventId, fetchAll])

  return {
    stats,
    hourly,
    byCategory,
    recentCheckins,
    loading,
    error,
    lastUpdated,
    refetch: fetchAll,
  }
}
