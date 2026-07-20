import { supabase } from '@/lib/supabase'
import type { Guest, GuestFormData } from '@/types'

export const guestsService = {
  async getByEvent(eventId: string): Promise<Guest[]> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Guest> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getByQRCode(qrCode: string): Promise<Guest | null> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('qr_code', qrCode)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async create(eventId: string, data: GuestFormData): Promise<Guest> {
    const { data: guest, error } = await supabase
      .from('guests')
      .insert({ ...data, event_id: eventId })
      .select()
      .single()
    if (error) throw error
    return guest
  },

  async update(id: string, data: Partial<GuestFormData>): Promise<Guest> {
    const { data: guest, error } = await supabase
      .from('guests')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return guest
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('guests').delete().eq('id', id)
    if (error) throw error
  },

  async bulkCreate(eventId: string, guests: GuestFormData[]): Promise<{ count: number; errors: string[] }> {
    const rows = guests.map((g) => ({ ...g, event_id: eventId }))
    const errors: string[] = []
    let count = 0

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const { data, error } = await supabase
        .from('guests')
        .insert(batch)
        .select()
      if (error) {
        errors.push(`Batch ${Math.floor(i / 50) + 1}: ${error.message}`)
      } else {
        count += data?.length ?? 0
      }
    }

    return { count, errors }
  },

  async checkIn(guestId: string, method: 'qr' | 'manual' = 'manual'): Promise<Guest> {
    const now = new Date().toISOString()
    const { data: guest, error } = await supabase
      .from('guests')
      .update({ checked_in: true, checked_in_at: now })
      .eq('id', guestId)
      .select()
      .single()
    if (error) throw error
    return guest
  },

  async undoCheckIn(guestId: string): Promise<Guest> {
    const { data: guest, error } = await supabase
      .from('guests')
      .update({ checked_in: false, checked_in_at: null })
      .eq('id', guestId)
      .select()
      .single()
    if (error) throw error
    return guest
  },

  async resetCheckIns(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('guests')
      .update({ checked_in: false, checked_in_at: null })
      .eq('event_id', eventId)
      .eq('checked_in', true)
    if (error) throw error
  },
}
