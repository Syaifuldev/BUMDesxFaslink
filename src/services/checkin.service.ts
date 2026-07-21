import { supabase } from '@/lib/supabase'
import type { CheckinLog, Guest } from '@/types'

function mapGuestsToLogs(guests: any[]): CheckinLog[] {
  return (guests || []).map((g) => ({
    id: g.id,
    guest_id: g.id,
    event_id: g.event_id,
    checked_in_at: g.checked_in_at || new Date().toISOString(),
    method: (g.checkin_method as 'qr' | 'manual') || 'qr',
    checked_in_by: null,
    notes: g.notes || null,
    guest: g,
    event: g.event,
  }))
}

export const checkinService = {
  async logCheckin(): Promise<CheckinLog> {
    // Legacy support: ScannerPage now directly updates guests table
    return {} as CheckinLog
  },

  async getLogsByEvent(eventId: string, limit = 50): Promise<CheckinLog[]> {
    const { data, error } = await supabase
      .from('guests')
      .select('*, event:events(id, name, date)')
      .eq('event_id', eventId)
      .eq('checked_in', true)
      .order('checked_in_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return mapGuestsToLogs(data)
  },

  async getRecentLogs(_userId: string, limit = 20): Promise<CheckinLog[]> {
    // RLS already handles scoping to the user's/parent's events
    const { data, error } = await supabase
      .from('guests')
      .select('*, event:events(id, name, date)')
      .eq('checked_in', true)
      .order('checked_in_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return mapGuestsToLogs(data)
  },

  async getAllLogs(_userId: string): Promise<CheckinLog[]> {
    // RLS already handles scoping
    const { data, error } = await supabase
      .from('guests')
      .select('*, event:events(id, name, date, location)')
      .eq('checked_in', true)
      .order('checked_in_at', { ascending: false })
    if (error) throw error
    return mapGuestsToLogs(data)
  },
}
