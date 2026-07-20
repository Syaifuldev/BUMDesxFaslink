// ============================================================
// services/events.service.ts  — OLD schema compatible
// Works with public.events: name, date, time, user_id, cover_url
// Called by useEvents hook and EventDetailPage / EventsPage
// ============================================================

import { supabase } from '@/lib/supabase'
import type { Event, EventFormData } from '@/types'

class EventsService {
  async getAll(userId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        guests(count)
      `)
      .order('date', { ascending: false })

    if (error) throw new Error(error.message)

    return (data ?? []).map((row: any) => ({
      ...row,
      guest_count:      Number(row.guests?.[0]?.count ?? 0),
      checked_in_count: 0,
    })) as Event[]
  }

  async getById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }
    return data as Event
  }

  async create(userId: string, form: EventFormData): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id:     userId,
        name:        form.name,
        description: form.description ?? null,
        date:        form.date,
        time:        form.time        ?? null,
        location:    form.location    ?? null,
        capacity:    form.capacity    ?? null,
        status:      form.status      ?? 'draft',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Event
  }

  async update(id: string, form: Partial<EventFormData>): Promise<Event> {
    const payload: Record<string, unknown> = {}
    if (form.name        !== undefined) payload.name        = form.name
    if (form.description !== undefined) payload.description = form.description ?? null
    if (form.date        !== undefined) payload.date        = form.date
    if (form.time        !== undefined) payload.time        = form.time        ?? null
    if (form.location    !== undefined) payload.location    = form.location    ?? null
    if (form.capacity    !== undefined) payload.capacity    = form.capacity    ?? null
    if (form.status      !== undefined) payload.status      = form.status

    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Event
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async getDashboardStats(userId: string): Promise<{
    totalEvents: number
    activeEvents: number
    totalGuests: number
    totalCheckedIn: number
    totalPending: number
    checkInRate: number
  }> {
    // Get all events for user
    const { data: events, error: evErr } = await supabase
      .from('events')
      .select('id, status')

    if (evErr) throw new Error(evErr.message)
    const evts = events ?? []
    const eventIds = evts.map((e: any) => e.id)

    if (eventIds.length === 0) {
      return { totalEvents: 0, activeEvents: 0, totalGuests: 0, totalCheckedIn: 0, totalPending: 0, checkInRate: 0 }
    }

    // Count guests across all events
    const { count: totalGuests } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)

    const { count: totalCheckedIn } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)
      .eq('checked_in', true)

    const total     = totalGuests    ?? 0
    const checkedIn = totalCheckedIn ?? 0

    return {
      totalEvents:    evts.length,
      activeEvents:   evts.filter((e: any) => e.status === 'active').length,
      totalGuests:    total,
      totalCheckedIn: checkedIn,
      totalPending:   total - checkedIn,
      checkInRate:    total > 0 ? Math.round((checkedIn / total) * 1000) / 10 : 0,
    }
  }
}

export const eventsService = new EventsService()
