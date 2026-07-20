// ============================================================
// services/users.service.ts — typed via Database<>
// ============================================================
import { supabase, typedSupabase as db } from '@/lib/supabase'
import type { UserRow, UserUpdate, UserProfileFormData } from '@/types/database'

class UsersService {
  async getMe(): Promise<UserRow | null> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return null
    const { data, error } = await (db as any).from('users').select('*').eq('id', auth.user.id).single()
    if (error) throw new Error(error.message)
    return data as UserRow
  }

  async getById(id: string): Promise<UserRow | null> {
    const { data, error } = await (db as any).from('users').select('*').eq('id', id).single()
    if (error) { if (error.code === 'PGRST116') return null; throw new Error(error.message) }
    return data as UserRow
  }

  async getAll(): Promise<UserRow[]> {
    const { data, error } = await (db as any).from('users').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as UserRow[]
  }

  async create(payload: { id: string; email: string; full_name?: string }): Promise<UserRow> {
    const { data, error } = await (db as any).from('users').insert({ id: payload.id, email: payload.email, full_name: payload.full_name ?? null }).select().single()
    if (error) throw new Error(error.message)
    return data as UserRow
  }

  async updateMe(form: UserProfileFormData): Promise<UserRow> {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not authenticated')
    const payload: UserUpdate = { full_name: form.fullName ?? undefined, avatar_url: form.avatarUrl ?? undefined }
    const { data, error } = await (db as any).from('users').update(payload).eq('id', auth.user.id).select().single()
    if (error) throw new Error(error.message)
    return data as UserRow
  }

  async update(id: string, payload: UserUpdate): Promise<UserRow> {
    const { data, error } = await (db as any).from('users').update(payload).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as UserRow
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await (db as any).from('users').update({ is_active: false }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async activate(id: string): Promise<void> {
    const { error } = await (db as any).from('users').update({ is_active: true }).eq('id', id)
    if (error) throw new Error(error.message)
  }
}

export const usersService = new UsersService()
