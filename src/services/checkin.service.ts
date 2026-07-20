import { supabase } from '@/lib/supabase'
import type { CheckinLog } from '@/types'

export const checkinService = {
  async logCheckin(params: {
    guestId: string
    eventId: string
    method: 'qr' | 'manual'
    checkedInBy?: string
  }): Promise<CheckinLog> {
    const { data, error } = await supabase
      .from('checkin_logs')
      .insert({
        guest_id: params.guestId,
        event_id: params.eventId,
        method: params.method,
        checked_in_by: params.checkedInBy,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getLogsByEvent(eventId: string, limit = 50): Promise<CheckinLog[]> {
    const { data, error } = await supabase
      .from('checkin_logs')
      .select(`
        *,
        guest:guests(id, name, email, company, qr_code),
        event:events(id, name, date)
      `)
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },

  async getRecentLogs(userId: string, limit = 20): Promise<CheckinLog[]> {
    // Get event IDs for this user
    const { data: events, error: evErr } = await supabase
      .from('events')
      .select('id')
      .eq('user_id', userId)
    if (evErr) throw evErr

    const eventIds = (events || []).map((e) => e.id)
    if (eventIds.length === 0) return []

    const { data, error } = await supabase
      .from('checkin_logs')
      .select(`
        *,
        guest:guests(id, name, email, company),
        event:events(id, name, date)
      `)
      .in('event_id', eventIds)
      .order('checked_in_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },

  async getAllLogs(userId: string): Promise<CheckinLog[]> {
    const { data: events, error: evErr } = await supabase
      .from('events')
      .select('id')
      .eq('user_id', userId)
    if (evErr) throw evErr

    const eventIds = (events || []).map((e) => e.id)
    if (eventIds.length === 0) return []

    const { data, error } = await supabase
      .from('checkin_logs')
      .select(`
        *,
        guest:guests(id, name, email, company, table_number, seat_number),
        event:events(id, name, date, location)
      `)
      .in('event_id', eventIds)
      .order('checked_in_at', { ascending: false })
    if (error) throw error
    return data || []
  },
}
