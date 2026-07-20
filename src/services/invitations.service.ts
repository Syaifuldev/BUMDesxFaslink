// ============================================================
// services/invitations.service.ts — typed via Database<>
// ============================================================
import { supabase, typedSupabase } from '@/lib/supabase'
const db: any = typedSupabase

import type {
  InvitationRow, InvitationInsert, InvitationUpdate,
  InvitationFormData, InvitationStatusView, InvitationStatus,
  InvitationCategory, BulkInviteGuest, BulkInviteResult,
  FilterState, PaginatedResult,
} from '@/types/database'

class InvitationsService {
  async getByEvent(
    eventId: string,
    filter?: Partial<FilterState>,
    page = 1,
    pageSize = 25,
  ): Promise<PaginatedResult<InvitationStatusView>> {
    let query = db.from('v_invitation_status').select('*', { count: 'exact' }).eq('event_id', eventId)
    if (filter?.status && filter.status !== 'all') query = query.eq('status', filter.status as InvitationStatus)
    if (filter?.category && filter.category !== 'all') query = query.eq('category', filter.category as InvitationCategory)
    if (filter?.search) {
      const term = `%${filter.search}%`
      query = query.or(`name.ilike.${term},email.ilike.${term},company.ilike.${term}`)
    }
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })
    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    const total = count ?? 0
    return { data: (data ?? []) as InvitationStatusView[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async getAllByEvent(eventId: string): Promise<InvitationRow[]> {
    const { data, error } = await db.from('invitations').select('*').eq('event_id', eventId).is('deleted_at', null).order('name')
    if (error) throw new Error(error.message)
    return data ?? []
  }

  async getByQRToken(qrToken: string): Promise<InvitationRow | null> {
    const { data, error } = await db.from('invitations').select('*').eq('qr_token', qrToken).is('deleted_at', null).single()
    if (error) { if (error.code === 'PGRST116') return null; throw new Error(error.message) }
    return data as InvitationRow
  }

  async getById(id: string): Promise<InvitationStatusView | null> {
    const { data, error } = await db.from('v_invitation_status').select('*').eq('id', id).single()
    if (error) { if (error.code === 'PGRST116') return null; throw new Error(error.message) }
    return data as InvitationStatusView
  }

  async create(eventId: string, form: InvitationFormData): Promise<InvitationRow> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not authenticated')
    const payload: InvitationInsert = {
      event_id: eventId, invited_by: auth.user.id, name: form.name,
      email: form.email ?? null, phone: form.phone ?? null, company: form.company ?? null,
      job_title: form.jobTitle ?? null, category: form.category ?? 'general',
      table_number: form.tableNumber ?? null, seat_number: form.seatNumber ?? null,
      notes: form.notes ?? null, custom_fields: form.customFields ?? {},
    }
    const { data, error } = await db.from('invitations').insert(payload).select().single()
    if (error) throw new Error(error.message)
    return data as InvitationRow
  }

  async bulkCreate(eventId: string, guests: BulkInviteGuest[]): Promise<BulkInviteResult> {
    const { data, error } = await db.rpc('bulk_create_invitations', { p_event_id: eventId, p_guests: guests })
    if (error) throw new Error(error.message)
    const row = Array.isArray(data) ? data[0] : data
    return { inserted: row?.inserted ?? 0, skipped: row?.skipped ?? 0, errors: row?.errors ?? [] } as BulkInviteResult
  }

  async update(id: string, form: Partial<InvitationFormData>): Promise<InvitationRow> {
    const payload: InvitationUpdate = {
      ...(form.name         !== undefined && { name:         form.name }),
      ...(form.email        !== undefined && { email:        form.email        ?? null }),
      ...(form.phone        !== undefined && { phone:        form.phone        ?? null }),
      ...(form.company      !== undefined && { company:      form.company      ?? null }),
      ...(form.jobTitle     !== undefined && { job_title:    form.jobTitle     ?? null }),
      ...(form.category     !== undefined && { category:     form.category }),
      ...(form.tableNumber  !== undefined && { table_number: form.tableNumber  ?? null }),
      ...(form.seatNumber   !== undefined && { seat_number:  form.seatNumber   ?? null }),
      ...(form.notes        !== undefined && { notes:        form.notes        ?? null }),
      ...(form.customFields !== undefined && { custom_fields: form.customFields }),
    }
    const { data, error } = await db.from('invitations').update(payload).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as InvitationRow
  }

  async updateStatus(id: string, status: InvitationStatus): Promise<InvitationRow> {
    const { data, error } = await db.from('invitations').update({ status, rsvp_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as InvitationRow
  }

  async markSent(id: string): Promise<void> {
    const { error } = await db.from('invitations').update({ invitation_sent_at: new Date().toISOString() }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async bulkAssignSeats(assignments: { id: string; table_number?: string; seat_number?: string }[]): Promise<void> {
    const { error } = await db.from('invitations').upsert(
      assignments.map(({ id, table_number, seat_number }) => ({ id, table_number: table_number ?? null, seat_number: seat_number ?? null })),
      { onConflict: 'id' },
    )
    if (error) throw new Error(error.message)
  }

  async delete(id: string): Promise<void> {
    const { error } = await db.from('invitations').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async hardDelete(id: string): Promise<void> {
    const { error } = await db.from('invitations').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async deleteAllByEvent(eventId: string): Promise<void> {
    const { error } = await db.from('invitations').update({ deleted_at: new Date().toISOString() }).eq('event_id', eventId).is('deleted_at', null)
    if (error) throw new Error(error.message)
  }
}

export const invitationsService = new InvitationsService()
