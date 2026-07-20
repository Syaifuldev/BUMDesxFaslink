// ============================================================
// lib/validations.ts
// Zod schemas — auth, events, invitations, users
// All schemas align with src/types/database.ts
// ============================================================
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z
  .object({
    full_name:       z.string().min(2, 'Name must be at least 2 characters').max(100),
    email:           z.string().email('Invalid email address'),
    password:        z.string().min(8, 'Password must be at least 8 characters')
                       .regex(/[A-Z]/, 'Must contain an uppercase letter')
                       .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path:    ['confirmPassword'],
  })

export const userProfileSchema = z.object({
  fullName:  z.string().min(2, 'Name must be at least 2 characters').max(100).optional().or(z.literal('')),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

// ─────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────

export const EVENT_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled'] as const

export const eventSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title is too long'),
  description: z.string().max(5000).optional().or(z.literal('')),
  location:    z.string().max(500).optional().or(z.literal('')),
  venueName:   z.string().max(200).optional().or(z.literal('')),
  venueAddress: z.string().max(500).optional().or(z.literal('')),
  startAt: z
    .string()
    .min(1, 'Start date/time is required'),
  endAt: z.string().optional().or(z.literal('')),
  timezone: z.string().default('UTC'),
  capacity: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive('Capacity must be a positive number').optional(),
  ),
  status: z.enum(EVENT_STATUSES).default('draft'),
  coverImageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

// Legacy schema alias (keeps old pages working)
export const eventSchemaLegacy = z.object({
  name:        z.string().min(2, 'Event name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  date:        z.string().min(1, 'Date is required'),
  time:        z.string().optional().or(z.literal('')),
  location:    z.string().max(200).optional().or(z.literal('')),
  capacity:    z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
  status:      z.enum(['draft', 'active', 'completed', 'cancelled']),
})

// ─────────────────────────────────────────────────────────────
// INVITATIONS (replaces/extends guestSchema)
// ─────────────────────────────────────────────────────────────

export const INVITATION_CATEGORIES = [
  'general', 'vip', 'speaker', 'sponsor', 'staff', 'media', 'press',
] as const

export const INVITATION_STATUSES = [
  'pending', 'accepted', 'declined', 'waitlisted', 'cancelled',
] as const

export const invitationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name is too long'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  phone: z
    .string()
    .max(20)
    .regex(/^[+\d\s\-().]*$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  company:     z.string().max(200).optional().or(z.literal('')),
  jobTitle:    z.string().max(200).optional().or(z.literal('')),
  category:    z.enum(INVITATION_CATEGORIES).default('general'),
  tableNumber: z.string().max(20).optional().or(z.literal('')),
  seatNumber:  z.string().max(20).optional().or(z.literal('')),
  notes:       z.string().max(1000).optional().or(z.literal('')),
  plusOneName:  z.string().max(200).optional().or(z.literal('')),
  plusOneEmail: z
    .string()
    .email('Invalid plus-one email')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
})

// Legacy alias for backward compatibility with GuestForm
export const guestSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(100),
  email:        z.string().email('Invalid email').optional().or(z.literal('')).transform((v) => v || undefined),
  phone:        z.string().max(20).optional().or(z.literal('')),
  company:      z.string().max(100).optional().or(z.literal('')),
  table_number: z.string().max(20).optional().or(z.literal('')),
  seat_number:  z.string().max(20).optional().or(z.literal('')),
  notes:        z.string().max(500).optional().or(z.literal('')),
})

// ─────────────────────────────────────────────────────────────
// CHECK-IN
// ─────────────────────────────────────────────────────────────

export const checkinSchema = z.object({
  qrToken: z.string().min(1, 'QR token is required'),
  eventId: z.string().uuid('Invalid event ID'),
  method:  z.enum(['qr', 'manual', 'kiosk', 'api']).default('qr'),
  notes:   z.string().max(500).optional().or(z.literal('')),
})

// ─────────────────────────────────────────────────────────────
// INFERRED TYPES
// ─────────────────────────────────────────────────────────────

export type LoginFormData            = z.infer<typeof loginSchema>
export type RegisterFormData         = z.infer<typeof registerSchema>
export type UserProfileFormData      = z.infer<typeof userProfileSchema>
export type EventFormDataValidated   = z.infer<typeof eventSchema>
export type EventFormDataLegacy      = z.infer<typeof eventSchemaLegacy>
export type InvitationFormValidated  = z.infer<typeof invitationSchema>
export type GuestFormDataValidated   = z.infer<typeof guestSchema>
export type CheckinFormValidated     = z.infer<typeof checkinSchema>
