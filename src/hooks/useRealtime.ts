import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Table = 'guests' | 'checkin_logs' | 'events'
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeOptions {
  table: Table
  filter?: string
  onInsert?: (payload: Record<string, unknown>) => void
  onUpdate?: (payload: Record<string, unknown>) => void
  onDelete?: (payload: Record<string, unknown>) => void
  onChange?: (payload: Record<string, unknown>) => void
  events?: EventType[]
}

export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const channelName = `${table}${filter ? `:${filter}` : ''}:${Date.now()}`
    let channel = supabase.channel(channelName)

    const pgChangesConfig = {
      event: '*' as const,
      schema: 'public' as const,
      table,
      ...(filter ? { filter } : {}),
    }

    channel = channel.on(
      'postgres_changes',
      pgChangesConfig,
      (payload) => {
        const record = (payload.new || payload.old || {}) as Record<string, unknown>
        onChange?.(record)
        if (payload.eventType === 'INSERT') onInsert?.(record)
        if (payload.eventType === 'UPDATE') onUpdate?.(record)
        if (payload.eventType === 'DELETE') onDelete?.(record)
      }
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [table, filter, onInsert, onUpdate, onDelete, onChange])
}
