// ============================================================
// services/checkins.service.ts
// CRUD for public.checkins  +  RPC wrappers for
// perform_checkin / perform_checkout / undo_checkin
// ============================================================

import { supabase, typedSupabase } from '@/lib/supabase'
import type {
  CheckinRow,
  CheckinInsert,
  CheckinRPCResult,
  RecentCheckinView,
  CheckinMethod,
  DeviceInfo,
  FilterState,
  PaginatedResult,
} from '@/types/database'

class CheckinsService {
  // ─── READ ─────────────────────────────────────────────────

  async getByEvent(
    eventId:  string,
    filter?:  Partial<FilterState>,
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResult<RecentCheckinView>> {
    let query = typedSupabase
      .from('v_recent_checkins')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)

    if (filter?.status && filter.status !== 'all') {
      query = query.eq('method', filter.status as CheckinMethod)
    }
    if (filter?.search) {
      const term = `%${filter.search}%`
      query = query.or(`guest_name.ilike.${term},guest_email.ilike.${term}`)
    }
    if (filter?.dateFrom) query = query.gte('checked_in_at', filter.dateFrom)
    if (filter?.dateTo)   query = query.lte('checked_in_at', filter.dateTo)

    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('checked_in_at', { ascending: false })

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const total = count ?? 0
    return {
      data:       (data ?? []) as RecentCheckinView[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getRecentFeed(limit = 20): Promise<RecentCheckinView[]> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return []

    const { data, error } = await typedSupabase
      .from('v_recent_checkins')
      .select('*')
      .limit(limit)
      .order('checked_in_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as RecentCheckinView[]
  }

  async getByInvitation(invitationId: string): Promise<CheckinRow[]> {
    const { data, error } = await typedSupabase
      .from('checkins')
      .select('*')
      .eq('invitation_id', invitationId)
      .order('checked_in_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  }

  async isCheckedIn(invitationId: string): Promise<boolean> {
    const { data, error } = await typedSupabase
      .from('checkins')
      .select('id')
      .eq('invitation_id', invitationId)
      .is('checked_out_at', null)
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data !== null
  }

  // ─── CHECK-IN ─────────────────────────────────────────────

  async performCheckin(params: {
    qrToken:     string
    eventId:     string
    method?:     CheckinMethod
    deviceInfo?: DeviceInfo
    notes?:      string
  }): Promise<CheckinRPCResult> {
    const { data, error } = await typedSupabase.rpc('perform_checkin', {
      p_qr_token:    params.qrToken,
      p_event_id:    params.eventId,
      p_method:      params.method      ?? 'qr',
      p_device_info: (params.deviceInfo ?? {}) as any,
      p_notes:       params.notes ?? undefined,
    } as any)

    if (error) throw new Error(error.message)
    return data as unknown as CheckinRPCResult
  }

  async manualCheckin(params: {
    invitationId: string
    eventId:      string
    notes?:       string
  }): Promise<CheckinRow> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not authenticated')

    const payload: CheckinInsert = {
      invitation_id: params.invitationId,
      event_id:      params.eventId,
      checked_in_by: auth.user.id,
      method:        'manual',
      device_info:   {},
      notes:         params.notes ?? null,
    }

    const { data, error } = await (typedSupabase as any)
      .from('checkins')
      .insert(payload as any)
      .select()
      .single()

    if (error) {
      if (error.code === '23P01') throw new Error('ALREADY_CHECKED_IN')
      throw new Error(error.message)
    }
    return data
  }

  // ─── CHECK-OUT ────────────────────────────────────────────

  async performCheckout(invitationId: string, notes?: string): Promise<CheckinRPCResult> {
    const { data, error } = await typedSupabase.rpc('perform_checkout', {
      p_invitation_id: invitationId,
      p_notes:         notes ?? undefined,
    } as any)

    if (error) throw new Error(error.message)
    return data as unknown as CheckinRPCResult
  }

  // ─── UNDO ─────────────────────────────────────────────────

  async undoCheckin(invitationId: string): Promise<void> {
    const { error } = await typedSupabase.rpc('undo_checkin', {
      p_invitation_id: invitationId,
    } as any)

    if (error) throw new Error(error.message)
  }

  async deleteById(checkinId: string): Promise<void> {
    const { error } = await typedSupabase
      .from('checkins')
      .delete()
      .eq('id', checkinId)

    if (error) throw new Error(error.message)
  }

  async exportByEvent(eventId: string): Promise<RecentCheckinView[]> {
    const { data, error } = await typedSupabase
      .from('v_recent_checkins')
      .select('*')
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as RecentCheckinView[]
  }
}

export const checkinsService = new CheckinsService()
