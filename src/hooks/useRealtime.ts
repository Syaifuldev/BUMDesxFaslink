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
  
  // Keep the latest callbacks in a ref to avoid re-subscribing on every render
  const callbacks = useRef({ onInsert, onUpdate, onDelete, onChange })
  useEffect(() => {
    callbacks.current = { onInsert, onUpdate, onDelete, onChange }
  }, [onInsert, onUpdate, onDelete, onChange])

  useEffect(() => {
    // Generate a truly unique name to prevent collisions during rapid re-renders (like Strict Mode)
    const uniqueId = Math.random().toString(36).substring(2, 10)
    const channelName = `${table}${filter ? `:${filter}` : ''}:${Date.now()}:${uniqueId}`
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
        const cb = callbacks.current
        cb.onChange?.(record)
        if (payload.eventType === 'INSERT') cb.onInsert?.(record)
        if (payload.eventType === 'UPDATE') cb.onUpdate?.(record)
        if (payload.eventType === 'DELETE') cb.onDelete?.(record)
      }
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, filter]) // Only re-subscribe if table or filter changes
}
