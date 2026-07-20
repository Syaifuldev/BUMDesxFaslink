// ============================================
// ALL APPLICATION TYPES
// ============================================

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type EventStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export interface Event {
  id: string
  user_id: string
  name: string
  description: string | null
  date: string
  time: string | null
  location: string | null
  capacity: number | null
  status: EventStatus
  cover_url: string | null
  created_at: string
  updated_at: string
  // computed
  guest_count?: number
  checked_in_count?: number
}

export interface EventFormData {
  name: string
  description?: string
  date: string
  time?: string
  location?: string
  capacity?: number
  status: EventStatus
}

export interface Guest {
  id: string
  event_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  table_number: string | null
  seat_number: string | null
  qr_code: string
  checked_in: boolean
  checked_in_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface GuestFormData {
  name: string
  email?: string
  phone?: string
  company?: string
  table_number?: string
  seat_number?: string
  notes?: string
}

export type CheckinMethod = 'qr' | 'manual'

export interface CheckinLog {
  id: string
  guest_id: string
  event_id: string
  checked_in_at: string
  method: CheckinMethod
  checked_in_by: string | null
  notes: string | null
  // joins
  guest?: Guest
  event?: Event
  profile?: Profile
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface SelectOption {
  value: string
  label: string
}

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  field: string
  direction: SortDirection
}

export interface ImportGuestRow {
  name: string
  email?: string
  phone?: string
  company?: string
  table_number?: string
  seat_number?: string
  notes?: string
  // validation
  _rowIndex?: number
  _errors?: string[]
}

export interface DashboardStats {
  totalEvents: number
  activeEvents: number
  totalGuests: number
  totalCheckedIn: number
  totalPending: number
  checkInRate: number
}
