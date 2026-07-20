// ============================================================
// DATABASE TYPES — src/types/database.ts
// Auto-generated from migration 001_core_schema.sql
// Covers: users, events, invitations, checkins
// Includes: Supabase Database<> type, entity interfaces,
//           insert/update payloads, enums, views, RPC returns
// ============================================================

// ─────────────────────────────────────────────────────────────
// SECTION 1: PRIMITIVE ENUMS
// ─────────────────────────────────────────────────────────────

/** Role assigned to a user account */
export type UserRole = 'admin' | 'organizer' | 'viewer'

/** Lifecycle state of an Event */
export type EventStatus =
  | 'draft'       // not visible to guests
  | 'published'   // invitations can be sent
  | 'ongoing'     // event is live
  | 'completed'   // finished
  | 'cancelled'   // cancelled by organiser

/** Category of an invited guest */
export type InvitationCategory =
  | 'general'
  | 'vip'
  | 'speaker'
  | 'sponsor'
  | 'staff'
  | 'media'
  | 'press'

/** RSVP / lifecycle status of an Invitation */
export type InvitationStatus =
  | 'pending'     // invited, no response yet
  | 'accepted'    // confirmed attendance
  | 'declined'    // declined
  | 'waitlisted'  // capacity full
  | 'cancelled'   // organiser cancelled

/** How a check-in was performed */
export type CheckinMethod = 'qr' | 'manual' | 'kiosk' | 'api'

/** Derived check-in status (view column, not stored) */
export type CheckinStatus = 'not_checked_in' | 'checked_in' | 'checked_out'


// ─────────────────────────────────────────────────────────────
// SECTION 2: ROW TYPES  (exact DB columns, snake_case)
// ─────────────────────────────────────────────────────────────

/**
 * public.users — extended profile, 1-to-1 with auth.users
 */
export interface UserRow {
  id:          string          // UUID PK → auth.users.id
  email:       string
  full_name:   string | null
  avatar_url:  string | null
  role:        UserRole
  is_active:   boolean
  metadata:    Record<string, unknown>
  created_at:  string          // TIMESTAMPTZ (ISO string from Supabase)
  updated_at:  string
}

/**
 * public.events — event managed by an organiser
 */
export interface EventRow {
  id:               string
  owner_id:         string          // FK → users.id
  title:            string
  slug:             string | null
  description:      string | null
  cover_image_url:  string | null
  location:         string | null
  venue_name:       string | null
  venue_address:    string | null
  latitude:         number | null
  longitude:        number | null
  start_at:         string          // TIMESTAMPTZ
  end_at:           string | null
  timezone:         string
  capacity:         number | null
  status:           EventStatus
  published_at:     string | null
  cancelled_at:     string | null
  cancel_reason:    string | null
  settings:         EventSettings
  deleted_at:       string | null
  created_at:       string
  updated_at:       string
}

/**
 * public.invitations — one row per invited guest per event
 */
export interface InvitationRow {
  id:                    string
  event_id:              string          // FK → events.id
  invited_by:            string          // FK → users.id
  name:                  string
  email:                 string | null
  phone:                 string | null
  company:               string | null
  job_title:             string | null
  photo_url:             string | null
  category:              InvitationCategory
  status:                InvitationStatus
  table_number:          string | null
  seat_number:           string | null
  qr_token:              string          // UUID string, UNIQUE
  invitation_sent_at:    string | null
  invitation_opened_at:  string | null
  rsvp_at:               string | null
  plus_one_name:         string | null
  plus_one_email:        string | null
  notes:                 string | null
  custom_fields:         Record<string, unknown>
  deleted_at:            string | null
  created_at:            string
  updated_at:            string
}

/**
 * public.checkins — immutable audit log of check-in / check-out events
 */
export interface CheckinRow {
  id:               string
  invitation_id:    string          // FK → invitations.id
  event_id:         string          // FK → events.id
  checked_in_by:    string | null   // FK → users.id
  checked_in_at:    string          // TIMESTAMPTZ
  checked_out_at:   string | null
  checked_out_by:   string | null   // FK → users.id
  method:           CheckinMethod
  device_info:      DeviceInfo
  latitude:         number | null
  longitude:        number | null
  notes:            string | null
  created_at:       string
}


// ─────────────────────────────────────────────────────────────
// SECTION 3: JSONB SHAPES
// ─────────────────────────────────────────────────────────────

/** Shape of events.settings JSONB column */
export interface EventSettings {
  /** Whether guests must RSVP before check-in */
  require_rsvp?:       boolean
  /** Whether guests may bring a plus-one */
  allow_plus_one?:     boolean
  /** Custom registration form fields */
  custom_fields?:      CustomFieldDefinition[]
  /** Branding overrides for invitation emails */
  branding?:           EventBranding
  /** Maximum number of check-ins allowed per invitation */
  max_checkins?:       number
  /** Allow self check-in via kiosk */
  allow_kiosk?:        boolean
  [key: string]:       unknown
}

export interface CustomFieldDefinition {
  key:        string
  label:      string
  type:       'text' | 'number' | 'boolean' | 'select' | 'date'
  required?:  boolean
  options?:   string[]   // for type = 'select'
}

export interface EventBranding {
  primary_color?:    string
  logo_url?:         string
  banner_url?:       string
  email_from_name?:  string
  email_footer?:     string
}

/** Shape of checkins.device_info JSONB column */
export interface DeviceInfo {
  ip?:           string
  user_agent?:   string
  app_version?:  string
  scanner_id?:   string
  platform?:     string
  [key: string]: unknown
}


// ─────────────────────────────────────────────────────────────
// SECTION 4: INSERT / UPDATE PAYLOAD TYPES
// (what you send to Supabase .insert() / .update())
// ─────────────────────────────────────────────────────────────

/** INSERT payload for public.users */
export interface UserInsert {
  id:           string          // required — must match auth.users.id
  email:        string
  full_name?:   string | null
  avatar_url?:  string | null
  role?:        UserRole
  is_active?:   boolean
  metadata?:    Record<string, unknown>
}

/** UPDATE payload for public.users */
export interface UserUpdate {
  full_name?:   string | null
  avatar_url?:  string | null
  role?:        UserRole
  is_active?:   boolean
  metadata?:    Record<string, unknown>
}

/** INSERT payload for public.events */
export interface EventInsert {
  owner_id:         string
  title:            string
  slug?:            string | null
  description?:     string | null
  cover_image_url?: string | null
  location?:        string | null
  venue_name?:      string | null
  venue_address?:   string | null
  latitude?:        number | null
  longitude?:       number | null
  start_at:         string
  end_at?:          string | null
  timezone?:        string
  capacity?:        number | null
  status?:          EventStatus
  settings?:        EventSettings
}

/** UPDATE payload for public.events */
export interface EventUpdate {
  title?:           string
  slug?:            string | null
  description?:     string | null
  cover_image_url?: string | null
  location?:        string | null
  venue_name?:      string | null
  venue_address?:   string | null
  latitude?:        number | null
  longitude?:       number | null
  start_at?:        string
  end_at?:          string | null
  timezone?:        string
  capacity?:        number | null
  status?:          EventStatus
  settings?:        Partial<EventSettings>
  published_at?:    string | null
  cancelled_at?:    string | null
  cancel_reason?:   string | null
  deleted_at?:      string | null
}

/** INSERT payload for public.invitations */
export interface InvitationInsert {
  event_id:      string
  invited_by:    string
  name:          string
  email?:        string | null
  phone?:        string | null
  company?:      string | null
  job_title?:    string | null
  photo_url?:    string | null
  category?:     InvitationCategory
  status?:       InvitationStatus
  table_number?: string | null
  seat_number?:  string | null
  plus_one_name?:  string | null
  plus_one_email?: string | null
  notes?:        string | null
  custom_fields?: Record<string, unknown>
}

/** UPDATE payload for public.invitations */
export interface InvitationUpdate {
  name?:                  string
  email?:                 string | null
  phone?:                 string | null
  company?:               string | null
  job_title?:             string | null
  photo_url?:             string | null
  category?:              InvitationCategory
  status?:                InvitationStatus
  table_number?:          string | null
  seat_number?:           string | null
  invitation_sent_at?:    string | null
  invitation_opened_at?:  string | null
  rsvp_at?:               string | null
  plus_one_name?:         string | null
  plus_one_email?:        string | null
  notes?:                 string | null
  custom_fields?:         Record<string, unknown>
  deleted_at?:            string | null
}

/** INSERT payload for public.checkins */
export interface CheckinInsert {
  invitation_id:  string
  event_id:       string
  checked_in_by?: string | null
  checked_in_at?: string
  method?:        CheckinMethod
  device_info?:   DeviceInfo
  latitude?:      number | null
  longitude?:     number | null
  notes?:         string | null
}

/** UPDATE payload for public.checkins (checkout only) */
export interface CheckinUpdate {
  checked_out_at?: string | null
  checked_out_by?: string | null
  notes?:          string | null
}


// ─────────────────────────────────────────────────────────────
// SECTION 5: VIEW TYPES  (read-only, denormalised)
// ─────────────────────────────────────────────────────────────

/**
 * public.v_invitation_status
 * Invitation row enriched with event info + latest check-in
 */
export interface InvitationStatusView extends InvitationRow {
  // From JOIN public.events
  event_title:    string
  event_start_at: string
  event_owner_id: string
  // From LATERAL JOIN public.checkins (latest)
  checkin_id:          string | null
  checked_in_at:       string | null
  checked_out_at:      string | null
  checkin_method:      CheckinMethod | null
  checked_in_by:       string | null
  // Derived
  checkin_status:      CheckinStatus
}

/**
 * public.v_recent_checkins
 * Denormalised feed row for dashboard / history page
 */
export interface RecentCheckinView {
  id:               string
  checked_in_at:    string
  checked_out_at:   string | null
  method:           CheckinMethod
  // Invitation
  invitation_id:    string
  guest_name:       string
  guest_email:      string | null
  company:          string | null
  category:         InvitationCategory
  table_number:     string | null
  seat_number:      string | null
  // Event
  event_id:         string
  event_title:      string
  event_start_at:   string
  // Operator
  operator_name:    string | null
}


// ─────────────────────────────────────────────────────────────
// SECTION 6: RPC / FUNCTION RETURN TYPES
// ─────────────────────────────────────────────────────────────

/** Return from perform_checkin() / perform_checkout() */
export interface CheckinRPCResult {
  success:     boolean
  code:        CheckinRPCCode
  message:     string
  invitation?: InvitationRow
  checkin?:    CheckinRow
}

export type CheckinRPCCode =
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'ALREADY_CHECKED_IN'
  | 'NOT_CHECKED_IN'
  | 'INVITATION_NOT_FOUND'
  | 'ACCESS_DENIED'

/** Return from get_event_stats() */
export interface EventStats {
  event_id:       string
  total:          number
  accepted:       number
  pending:        number
  declined:       number
  cancelled:      number
  checked_in:     number
  checked_out:    number
  currently_in:   number
  check_in_rate:  number           // 0–100 percentage
  by_category:    Record<InvitationCategory, number>
  by_method:      Partial<Record<CheckinMethod, number>>
}

/** Return from get_dashboard_stats() */
export interface DashboardStats {
  total_events:       number
  active_events:      number
  total_invitations:  number
  total_checked_in:   number
  total_pending:      number
  check_in_rate:      number
}

/** Return from bulk_create_invitations() */
export interface BulkInviteResult {
  inserted: number
  skipped:  number
  errors:   BulkInviteError[]
}

export interface BulkInviteError {
  guest:  string | null
  email:  string | null
  error:  string
}

/** Single guest row passed to bulk_create_invitations() */
export interface BulkInviteGuest {
  name:          string
  email?:        string
  phone?:        string
  company?:      string
  category?:     InvitationCategory
  table_number?: string
  seat_number?:  string
  notes?:        string
  custom_fields?: Record<string, unknown>
}


// ─────────────────────────────────────────────────────────────
// SECTION 7: FORM DATA TYPES  (UI layer, camelCase optional)
// ─────────────────────────────────────────────────────────────

export interface EventFormData {
  title:           string
  description?:    string
  location?:       string
  venueName?:      string
  venueAddress?:   string
  startAt:         string            // datetime-local value
  endAt?:          string
  timezone?:       string
  capacity?:       number
  status:          EventStatus
  coverImageUrl?:  string
  settings?:       Partial<EventSettings>
}

export interface InvitationFormData {
  name:          string
  email?:        string
  phone?:        string
  company?:      string
  jobTitle?:     string
  category?:     InvitationCategory
  tableNumber?:  string
  seatNumber?:   string
  notes?:        string
  customFields?: Record<string, unknown>
}

export interface CheckinFormData {
  qrToken:      string
  eventId:      string
  method?:      CheckinMethod
  notes?:       string
  deviceInfo?:  DeviceInfo
}

export interface UserProfileFormData {
  fullName?:   string
  avatarUrl?:  string
}


// ─────────────────────────────────────────────────────────────
// SECTION 8: SUPABASE DATABASE<> GENERIC TYPE
// Compatible with @supabase/supabase-js createClient<Database>()
// ─────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row:    UserRow
        Insert: UserInsert
        Update: UserUpdate
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      events: {
        Row:    EventRow
        Insert: EventInsert
        Update: EventUpdate
        Relationships: [
          {
            foreignKeyName: 'events_owner_id_fkey'
            columns: ['owner_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      invitations: {
        Row:    InvitationRow
        Insert: InvitationInsert
        Update: InvitationUpdate
        Relationships: [
          {
            foreignKeyName: 'invitations_event_id_fkey'
            columns: ['event_id']
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invitations_invited_by_fkey'
            columns: ['invited_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      checkins: {
        Row:    CheckinRow
        Insert: CheckinInsert
        Update: CheckinUpdate
        Relationships: [
          {
            foreignKeyName: 'checkins_invitation_id_fkey'
            columns: ['invitation_id']
            referencedRelation: 'invitations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'checkins_event_id_fkey'
            columns: ['event_id']
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'checkins_checked_in_by_fkey'
            columns: ['checked_in_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'checkins_checked_out_by_fkey'
            columns: ['checked_out_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      v_invitation_status: {
        Row: InvitationStatusView
      }
      v_recent_checkins: {
        Row: RecentCheckinView
      }
    }
    Functions: {
      create_event: {
        Args: {
          p_title:        string
          p_description?: string
          p_location?:    string
          p_venue_name?:  string
          p_start_at?:    string
          p_end_at?:      string
          p_timezone?:    string
          p_capacity?:    number
          p_status?:      string
          p_settings?:    EventSettings
        }
        Returns: EventRow
      }
      update_event: {
        Args: {
          p_id:           string
          p_title?:       string
          p_description?: string
          p_location?:    string
          p_start_at?:    string
          p_end_at?:      string
          p_capacity?:    number
          p_status?:      string
          p_settings?:    EventSettings
        }
        Returns: EventRow
      }
      delete_event: {
        Args: { p_id: string }
        Returns: undefined
      }
      create_invitation: {
        Args: {
          p_event_id:       string
          p_name:           string
          p_email?:         string
          p_phone?:         string
          p_company?:       string
          p_category?:      string
          p_table_number?:  string
          p_seat_number?:   string
          p_notes?:         string
          p_custom_fields?: Record<string, unknown>
        }
        Returns: InvitationRow
      }
      bulk_create_invitations: {
        Args: {
          p_event_id: string
          p_guests:   BulkInviteGuest[]
        }
        Returns: BulkInviteResult[]
      }
      perform_checkin: {
        Args: {
          p_qr_token:     string
          p_event_id:     string
          p_method?:      string
          p_device_info?: DeviceInfo
          p_notes?:       string
        }
        Returns: CheckinRPCResult
      }
      perform_checkout: {
        Args: {
          p_invitation_id: string
          p_notes?:        string
        }
        Returns: CheckinRPCResult
      }
      undo_checkin: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      get_event_stats: {
        Args: { p_event_id: string }
        Returns: EventStats
      }
      get_dashboard_stats: {
        Args: Record<string, never>
        Returns: DashboardStats
      }
    }
    Enums: {
      user_role:            UserRole
      event_status:         EventStatus
      invitation_category:  InvitationCategory
      invitation_status:    InvitationStatus
      checkin_method:       CheckinMethod
    }
    CompositeTypes: Record<string, never>
  }
}

/** Shorthand helpers for common Supabase generic patterns */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']

export type Fn<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T]


// ─────────────────────────────────────────────────────────────
// SECTION 9: UI / APPLICATION LAYER TYPES
// ─────────────────────────────────────────────────────────────

/** Event enriched with computed aggregates (from service layer) */
export interface EventWithStats extends EventRow {
  total_invitations:  number
  accepted:           number
  pending:            number
  checked_in:         number
  check_in_rate:      number   // 0–100
}

/** Invitation enriched with its current check-in status */
export interface InvitationWithCheckin extends InvitationRow {
  checkin_status:  CheckinStatus
  checked_in_at:   string | null
  checked_out_at:  string | null
  checkin_method:  CheckinMethod | null
}

/** Single row for the Excel import preview table */
export interface ImportInvitationRow {
  name:          string
  email?:        string
  phone?:        string
  company?:      string
  category?:     InvitationCategory
  table_number?: string
  seat_number?:  string
  notes?:        string
  /** 1-based Excel row number for error messages */
  _rowIndex?:    number
  /** Validation errors for this row */
  _errors?:      string[]
}

/** Generic paginated API response */
export interface PaginatedResult<T> {
  data:        T[]
  total:       number
  page:        number
  pageSize:    number
  totalPages:  number
}

/** Sort state used across tables */
export interface SortState<T extends string = string> {
  field:     T
  direction: 'asc' | 'desc'
}

/** Generic filter state */
export interface FilterState {
  search:    string
  status?:   string
  category?: string
  eventId?:  string
  dateFrom?: string
  dateTo?:   string
}

/** Toast notification levels */
export type ToastType = 'success' | 'error' | 'warning' | 'info'

/** Reusable select option */
export interface SelectOption<V extends string = string> {
  value:     V
  label:     string
  disabled?: boolean
  icon?:     string
}
