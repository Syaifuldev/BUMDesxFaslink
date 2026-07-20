-- ============================================================
-- MIGRATION: 001_core_schema.sql
-- Event Guest Management — Full Schema
-- Tables: users, events, invitations, checkins
-- Features: UUID PKs, FKs, Indexes, RLS, CRUD Functions,
--           Realtime, Auto-timestamps, Audit trail
--
-- Run this in Supabase SQL Editor (replaces schema.sql)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for fast text search (ILIKE)


-- ============================================================
-- SECTION 1: USERS
-- Mirror of auth.users with extended profile data.
-- Auto-created via trigger on auth.users INSERT.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  -- Primary key mirrors auth.users.id (no separate UUID needed)
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  email         TEXT        NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,

  -- Authorization
  role          TEXT        NOT NULL DEFAULT 'organizer'
                            CHECK (role IN ('admin', 'organizer', 'viewer')),

  -- Soft-delete
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Arbitrary extra fields (locale, preferences, etc.)
  metadata      JSONB       NOT NULL DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS
  'Extended user profiles linked 1-to-1 with auth.users.';
COMMENT ON COLUMN public.users.role IS
  'admin = full access, organizer = owns events, viewer = read-only';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email
  ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active
  ON public.users (is_active);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "users_admin_select_all"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );


-- ============================================================
-- SECTION 2: EVENTS
-- Created by organizers/admins. Referenced by invitations
-- and checkins.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.events (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Owner
  owner_id        UUID        NOT NULL
                              REFERENCES public.users(id) ON DELETE CASCADE,

  -- Core fields
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  slug            TEXT        UNIQUE,                  -- URL-friendly identifier
  description     TEXT        CHECK (char_length(description) <= 5000),
  cover_image_url TEXT,

  -- Location
  location        TEXT        CHECK (char_length(location) <= 500),
  venue_name      TEXT,
  venue_address   TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,

  -- Schedule
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ,
  timezone        TEXT        NOT NULL DEFAULT 'UTC',

  -- Capacity
  capacity        INTEGER     CHECK (capacity > 0),

  -- Lifecycle
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN (
                                'draft',      -- not yet visible to guests
                                'published',  -- invitations can be sent
                                'ongoing',    -- event is live
                                'completed',  -- finished
                                'cancelled'   -- cancelled
                              )),
  published_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,

  -- Flexible settings (registration form, branding, etc.)
  settings        JSONB       NOT NULL DEFAULT '{}'::JSONB,

  -- Soft-delete
  deleted_at      TIMESTAMPTZ,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.events IS
  'Events managed by organizers. Parent of invitations and checkins.';
COMMENT ON COLUMN public.events.slug IS
  'Auto-generated URL-friendly identifier: e.g. annual-gala-2026';
COMMENT ON COLUMN public.events.settings IS
  'JSON bag: { require_rsvp, allow_plus_one, custom_fields[], branding{} }';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_owner_id
  ON public.events (owner_id);
CREATE INDEX IF NOT EXISTS idx_events_status
  ON public.events (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_start_at
  ON public.events (start_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_slug
  ON public.events (slug) WHERE slug IS NOT NULL;
-- Partial index for non-deleted events
CREATE INDEX IF NOT EXISTS idx_events_active
  ON public.events (owner_id, status)
  WHERE deleted_at IS NULL;
-- Full-text search on title
CREATE INDEX IF NOT EXISTS idx_events_title_trgm
  ON public.events USING GIN (title gin_trgm_ops);

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Owner can do everything on their own events
CREATE POLICY "events_owner_all"
  ON public.events FOR ALL
  USING  (auth.uid() = owner_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = owner_id);

-- Published events are viewable by anyone authenticated
CREATE POLICY "events_authenticated_view_published"
  ON public.events FOR SELECT
  USING (
    status IN ('published', 'ongoing', 'completed')
    AND deleted_at IS NULL
    AND auth.uid() IS NOT NULL
  );

-- Admins can manage all events
CREATE POLICY "events_admin_all"
  ON public.events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );


-- ============================================================
-- SECTION 3: INVITATIONS
-- One invitation per guest per event. Carries QR token,
-- RSVP status, seating, and custom fields.
-- Replaces the old `guests` table with richer semantics.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  event_id            UUID        NOT NULL
                                  REFERENCES public.events(id) ON DELETE CASCADE,
  invited_by          UUID        NOT NULL
                                  REFERENCES public.users(id) ON DELETE RESTRICT,

  -- Guest identity
  name                TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email               TEXT        CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  phone               TEXT,
  company             TEXT,
  job_title           TEXT,
  photo_url           TEXT,

  -- Guest category
  category            TEXT        NOT NULL DEFAULT 'general'
                                  CHECK (category IN (
                                    'general', 'vip', 'speaker',
                                    'sponsor', 'staff', 'media', 'press'
                                  )),

  -- RSVP / Status lifecycle
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'pending',   -- invited, not yet responded
                                    'accepted',  -- confirmed attendance
                                    'declined',  -- declined
                                    'waitlisted',-- over capacity
                                    'cancelled'  -- organizer cancelled invite
                                  )),

  -- Seating
  table_number        TEXT,
  seat_number         TEXT,

  -- QR check-in token (UUID string, unique across all invitations)
  qr_token            TEXT        NOT NULL UNIQUE DEFAULT uuid_generate_v4()::TEXT,

  -- Invitation lifecycle timestamps
  invitation_sent_at  TIMESTAMPTZ,          -- when email was sent
  invitation_opened_at TIMESTAMPTZ,         -- email open tracking
  rsvp_at             TIMESTAMPTZ,          -- when guest responded

  -- Allow +1 (companion)
  plus_one_name       TEXT,
  plus_one_email      TEXT,

  -- Extra freeform notes (for organizer)
  notes               TEXT        CHECK (char_length(notes) <= 1000),

  -- Custom fields from event.settings.custom_fields
  custom_fields       JSONB       NOT NULL DEFAULT '{}'::JSONB,

  -- Soft-delete
  deleted_at          TIMESTAMPTZ,

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT invitations_email_unique_per_event
    UNIQUE (event_id, email)
    DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE public.invitations IS
  'One row per invited guest per event. Carries QR token for check-in.';
COMMENT ON COLUMN public.invitations.qr_token IS
  'UUID used as QR code payload. Scanner resolves this to the invitation.';
COMMENT ON COLUMN public.invitations.custom_fields IS
  'Key-value store for event-specific fields (dietary, t-shirt size, etc.)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_event_id
  ON public.invitations (event_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by
  ON public.invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_invitations_qr_token
  ON public.invitations (qr_token);
CREATE INDEX IF NOT EXISTS idx_invitations_status
  ON public.invitations (status);
CREATE INDEX IF NOT EXISTS idx_invitations_category
  ON public.invitations (category);
CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON public.invitations (email) WHERE email IS NOT NULL;
-- Composite: filter pending+event is extremely common
CREATE INDEX IF NOT EXISTS idx_invitations_event_status
  ON public.invitations (event_id, status) WHERE deleted_at IS NULL;
-- Full-text search on guest name
CREATE INDEX IF NOT EXISTS idx_invitations_name_trgm
  ON public.invitations USING GIN (name gin_trgm_ops);

-- RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Organizer (event owner) can manage all invitations for their events
CREATE POLICY "invitations_event_owner_all"
  ON public.invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = invitations.event_id
        AND e.owner_id = auth.uid()
        AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = invitations.event_id
        AND e.owner_id = auth.uid()
    )
  );

-- Staff/invited_by can manage invitations they created
CREATE POLICY "invitations_creator_manage"
  ON public.invitations FOR ALL
  USING  (auth.uid() = invited_by)
  WITH CHECK (auth.uid() = invited_by);

-- Admin: full access
CREATE POLICY "invitations_admin_all"
  ON public.invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );


-- ============================================================
-- SECTION 4: CHECKINS
-- Immutable audit log of every check-in (and optional
-- check-out) event. Multiple rows per invitation are
-- possible (e.g. check-out then re-check-in).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.checkins (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  invitation_id     UUID        NOT NULL
                                REFERENCES public.invitations(id) ON DELETE CASCADE,
  event_id          UUID        NOT NULL
                                REFERENCES public.events(id) ON DELETE CASCADE,
  checked_in_by     UUID        REFERENCES public.users(id) ON DELETE SET NULL,

  -- Check-in timestamp (required)
  checked_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional check-out
  checked_out_at    TIMESTAMPTZ,
  checked_out_by    UUID        REFERENCES public.users(id) ON DELETE SET NULL,

  -- How was this check-in performed?
  method            TEXT        NOT NULL DEFAULT 'manual'
                                CHECK (method IN (
                                  'qr',      -- scanned QR code
                                  'manual',  -- organizer toggled manually
                                  'kiosk',   -- self-service kiosk
                                  'api'      -- via REST/webhook
                                )),

  -- Device / context metadata
  device_info       JSONB       NOT NULL DEFAULT '{}'::JSONB,
  -- e.g. { "ip": "1.2.3.4", "user_agent": "...", "app_version": "1.0" }

  -- GPS (optional)
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,

  -- Notes from operator
  notes             TEXT        CHECK (char_length(notes) <= 500),

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business rule: only one active (non-checked-out) row per invitation
  CONSTRAINT checkins_one_active_per_invitation
    EXCLUDE USING btree (invitation_id WITH =)
    WHERE (checked_out_at IS NULL)
    DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE public.checkins IS
  'Immutable audit log of check-in / check-out events per invitation.';
COMMENT ON COLUMN public.checkins.method IS
  'qr = QR scan, manual = organizer UI, kiosk = self-service, api = programmatic';
COMMENT ON COLUMN public.checkins.device_info IS
  'JSON bag: { ip, user_agent, app_version, scanner_id }';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkins_invitation_id
  ON public.checkins (invitation_id);
CREATE INDEX IF NOT EXISTS idx_checkins_event_id
  ON public.checkins (event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_by
  ON public.checkins (checked_in_by);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at
  ON public.checkins (checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_method
  ON public.checkins (method);
-- Composite: realtime feed query
CREATE INDEX IF NOT EXISTS idx_checkins_event_time
  ON public.checkins (event_id, checked_in_at DESC);
-- Active check-ins (no checkout)
CREATE INDEX IF NOT EXISTS idx_checkins_active
  ON public.checkins (invitation_id)
  WHERE checked_out_at IS NULL;

-- RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_event_owner_all"
  ON public.checkins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = checkins.event_id
        AND e.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = checkins.event_id
        AND e.owner_id = auth.uid()
    )
  );

CREATE POLICY "checkins_operator_insert"
  ON public.checkins FOR INSERT
  WITH CHECK (
    auth.uid() = checked_in_by
    AND EXISTS (
      SELECT 1 FROM public.invitations i
      JOIN public.events e ON e.id = i.event_id
      WHERE i.id = checkins.invitation_id
        AND e.owner_id = auth.uid()
    )
  );

CREATE POLICY "checkins_admin_all"
  ON public.checkins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );


-- ============================================================
-- SECTION 5: AUTO-TIMESTAMP TRIGGER (shared)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  -- users
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  -- events
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_events_updated_at') THEN
    CREATE TRIGGER trg_events_updated_at
      BEFORE UPDATE ON public.events
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  -- invitations
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invitations_updated_at') THEN
    CREATE TRIGGER trg_invitations_updated_at
      BEFORE UPDATE ON public.invitations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;


-- ============================================================
-- SECTION 6: AUTO-GENERATE SLUG FOR EVENTS
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter   INT := 0;
BEGIN
  -- Only auto-generate if slug not provided
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  -- Build base: lowercase, replace spaces/specials with dash
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '(^-|-$)', '', 'g');
  base_slug := left(base_slug, 80);

  candidate := base_slug;

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.events WHERE slug = candidate AND id <> NEW.id) LOOP
    counter := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_slug ON public.events;
CREATE TRIGGER trg_events_slug
  BEFORE INSERT OR UPDATE OF title ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.generate_event_slug();


-- ============================================================
-- SECTION 7: AUTO-CREATE USER ON AUTH SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SECTION 8: CRUD HELPER FUNCTIONS
-- ============================================================

-- ─── 8a. CREATE EVENT ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_event(
  p_title         TEXT,
  p_description   TEXT    DEFAULT NULL,
  p_location      TEXT    DEFAULT NULL,
  p_venue_name    TEXT    DEFAULT NULL,
  p_start_at      TIMESTAMPTZ DEFAULT NOW(),
  p_end_at        TIMESTAMPTZ DEFAULT NULL,
  p_timezone      TEXT    DEFAULT 'UTC',
  p_capacity      INTEGER DEFAULT NULL,
  p_status        TEXT    DEFAULT 'draft',
  p_settings      JSONB   DEFAULT '{}'::JSONB
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_event public.events;
BEGIN
  INSERT INTO public.events (
    owner_id, title, description, location, venue_name,
    start_at, end_at, timezone, capacity, status, settings
  ) VALUES (
    auth.uid(), p_title, p_description, p_location, p_venue_name,
    p_start_at, p_end_at, p_timezone, p_capacity, p_status, p_settings
  )
  RETURNING * INTO v_event;

  RETURN v_event;
END;
$$;

-- ─── 8b. UPDATE EVENT ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_event(
  p_id            UUID,
  p_title         TEXT    DEFAULT NULL,
  p_description   TEXT    DEFAULT NULL,
  p_location      TEXT    DEFAULT NULL,
  p_start_at      TIMESTAMPTZ DEFAULT NULL,
  p_end_at        TIMESTAMPTZ DEFAULT NULL,
  p_capacity      INTEGER DEFAULT NULL,
  p_status        TEXT    DEFAULT NULL,
  p_settings      JSONB   DEFAULT NULL
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_event public.events;
BEGIN
  UPDATE public.events SET
    title       = COALESCE(p_title,       title),
    description = COALESCE(p_description, description),
    location    = COALESCE(p_location,    location),
    start_at    = COALESCE(p_start_at,    start_at),
    end_at      = COALESCE(p_end_at,      end_at),
    capacity    = COALESCE(p_capacity,    capacity),
    status      = COALESCE(p_status,      status),
    settings    = COALESCE(p_settings,    settings)
  WHERE id = p_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  RETURNING * INTO v_event;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event % not found or access denied', p_id;
  END IF;

  RETURN v_event;
END;
$$;

-- ─── 8c. SOFT-DELETE EVENT ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_event(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE public.events
  SET deleted_at = NOW()
  WHERE id = p_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event % not found or access denied', p_id;
  END IF;
END;
$$;

-- ─── 8d. CREATE INVITATION ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_event_id      UUID,
  p_name          TEXT,
  p_email         TEXT    DEFAULT NULL,
  p_phone         TEXT    DEFAULT NULL,
  p_company       TEXT    DEFAULT NULL,
  p_category      TEXT    DEFAULT 'general',
  p_table_number  TEXT    DEFAULT NULL,
  p_seat_number   TEXT    DEFAULT NULL,
  p_notes         TEXT    DEFAULT NULL,
  p_custom_fields JSONB   DEFAULT '{}'::JSONB
)
RETURNS public.invitations
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_invitation public.invitations;
BEGIN
  -- Verify caller owns the event
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND owner_id = auth.uid() AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Event % not found or access denied', p_event_id;
  END IF;

  INSERT INTO public.invitations (
    event_id, invited_by, name, email, phone, company,
    category, table_number, seat_number, notes, custom_fields
  ) VALUES (
    p_event_id, auth.uid(), p_name, p_email, p_phone, p_company,
    p_category, p_table_number, p_seat_number, p_notes, p_custom_fields
  )
  RETURNING * INTO v_invitation;

  RETURN v_invitation;
END;
$$;

-- ─── 8e. BULK CREATE INVITATIONS (returns count) ─────────────
CREATE OR REPLACE FUNCTION public.bulk_create_invitations(
  p_event_id UUID,
  p_guests   JSONB   -- array of { name, email, phone, company, category, ... }
)
RETURNS TABLE (inserted INT, skipped INT, errors JSONB)
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_guest       JSONB;
  v_inserted    INT := 0;
  v_skipped     INT := 0;
  v_errors      JSONB := '[]'::JSONB;
  v_err_msg     TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id AND owner_id = auth.uid() AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Event % not found or access denied', p_event_id;
  END IF;

  FOR v_guest IN SELECT * FROM jsonb_array_elements(p_guests)
  LOOP
    BEGIN
      INSERT INTO public.invitations (
        event_id, invited_by, name, email, phone, company,
        category, table_number, seat_number, notes, custom_fields
      ) VALUES (
        p_event_id,
        auth.uid(),
        v_guest->>'name',
        NULLIF(v_guest->>'email', ''),
        NULLIF(v_guest->>'phone', ''),
        NULLIF(v_guest->>'company', ''),
        COALESCE(NULLIF(v_guest->>'category', ''), 'general'),
        NULLIF(v_guest->>'table_number', ''),
        NULLIF(v_guest->>'seat_number', ''),
        NULLIF(v_guest->>'notes', ''),
        COALESCE((v_guest->'custom_fields'), '{}'::JSONB)
      );
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT;
      v_errors := v_errors || jsonb_build_object(
        'guest', v_guest->>'name',
        'email', v_guest->>'email',
        'error', v_err_msg
      );
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_skipped, v_errors;
END;
$$;

-- ─── 8f. PERFORM CHECK-IN ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.perform_checkin(
  p_qr_token    TEXT,
  p_event_id    UUID,
  p_method      TEXT    DEFAULT 'qr',
  p_device_info JSONB   DEFAULT '{}'::JSONB,
  p_notes       TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_invitation  public.invitations;
  v_checkin     public.checkins;
  v_result      JSONB;
BEGIN
  -- Resolve QR token → invitation
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE qr_token = p_qr_token
    AND event_id = p_event_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_NOT_FOUND',
      'message', 'No invitation found for this QR code in this event.'
    );
  END IF;

  -- Verify caller owns the event or is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id
      AND (e.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
      ))
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ACCESS_DENIED',
      'message', 'You do not have access to check in guests for this event.'
    );
  END IF;

  -- Check for existing active check-in
  IF EXISTS (
    SELECT 1 FROM public.checkins
    WHERE invitation_id = v_invitation.id
      AND checked_out_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CHECKED_IN',
      'message', 'Guest is already checked in.',
      'invitation', to_jsonb(v_invitation)
    );
  END IF;

  -- Perform check-in
  INSERT INTO public.checkins (
    invitation_id, event_id, checked_in_by, method, device_info, notes
  ) VALUES (
    v_invitation.id, p_event_id, auth.uid(), p_method, p_device_info, p_notes
  )
  RETURNING * INTO v_checkin;

  -- Update invitation status → accepted (if still pending)
  UPDATE public.invitations
  SET status = 'accepted', rsvp_at = NOW()
  WHERE id = v_invitation.id AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'code', 'CHECKED_IN',
    'message', 'Guest checked in successfully.',
    'invitation', to_jsonb(v_invitation),
    'checkin', to_jsonb(v_checkin)
  );
END;
$$;

-- ─── 8g. PERFORM CHECK-OUT ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.perform_checkout(
  p_invitation_id UUID,
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.checkins
  SET checked_out_at  = NOW(),
      checked_out_by  = auth.uid(),
      notes           = COALESCE(p_notes, notes)
  WHERE invitation_id  = p_invitation_id
    AND checked_out_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.invitations i ON i.event_id = e.id
      WHERE i.id = p_invitation_id
        AND e.owner_id = auth.uid()
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'NOT_CHECKED_IN',
      'message', 'Guest is not currently checked in or access denied.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'code', 'CHECKED_OUT',
    'message', 'Guest checked out successfully.'
  );
END;
$$;

-- ─── 8h. GET EVENT STATS ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_event_stats(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify access
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = p_event_id
      AND (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
      ))
  ) THEN
    RAISE EXCEPTION 'Event % not found or access denied', p_event_id;
  END IF;

  SELECT jsonb_build_object(
    'event_id',       p_event_id,
    'total',          COUNT(*),
    'accepted',       COUNT(*) FILTER (WHERE i.status = 'accepted'),
    'pending',        COUNT(*) FILTER (WHERE i.status = 'pending'),
    'declined',       COUNT(*) FILTER (WHERE i.status = 'declined'),
    'cancelled',      COUNT(*) FILTER (WHERE i.status = 'cancelled'),
    'checked_in',     COUNT(DISTINCT c.invitation_id),
    'checked_out',    COUNT(DISTINCT c.invitation_id)
                        FILTER (WHERE c.checked_out_at IS NOT NULL),
    'currently_in',   COUNT(DISTINCT c.invitation_id)
                        FILTER (WHERE c.checked_out_at IS NULL),
    'by_category',    jsonb_object_agg(
                        COALESCE(i.category, 'general'),
                        cat_counts.cnt
                      ),
    'by_method',      COALESCE(method_stats.methods, '{}'::JSONB),
    'check_in_rate',  CASE
                        WHEN COUNT(*) > 0
                        THEN ROUND(
                          COUNT(DISTINCT c.invitation_id)::NUMERIC / COUNT(*)::NUMERIC * 100,
                          1
                        )
                        ELSE 0
                      END
  ) INTO v_result
  FROM public.invitations i
  LEFT JOIN public.checkins c ON c.invitation_id = i.id
  CROSS JOIN LATERAL (
    SELECT jsonb_object_agg(category, cnt) AS methods
    FROM (
      SELECT ck.method, COUNT(*) AS cnt
      FROM public.checkins ck
      WHERE ck.event_id = p_event_id
      GROUP BY ck.method
    ) m
  ) method_stats
  CROSS JOIN LATERAL (
    SELECT i2.category, COUNT(*) AS cnt
    FROM public.invitations i2
    WHERE i2.event_id = p_event_id AND i2.deleted_at IS NULL
    GROUP BY i2.category
  ) cat_counts
  WHERE i.event_id = p_event_id
    AND i.deleted_at IS NULL;

  RETURN v_result;
END;
$$;

-- ─── 8i. GET DASHBOARD STATS (all events for current user) ───
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_events',     COUNT(DISTINCT e.id),
    'active_events',    COUNT(DISTINCT e.id) FILTER (WHERE e.status IN ('published','ongoing')),
    'total_invitations', COUNT(DISTINCT i.id),
    'total_checked_in', COUNT(DISTINCT c.invitation_id),
    'total_pending',    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'pending'),
    'check_in_rate',    CASE
                          WHEN COUNT(DISTINCT i.id) > 0
                          THEN ROUND(
                            COUNT(DISTINCT c.invitation_id)::NUMERIC /
                            COUNT(DISTINCT i.id)::NUMERIC * 100, 1
                          )
                          ELSE 0
                        END
  ) INTO v_result
  FROM public.events e
  LEFT JOIN public.invitations i ON i.event_id = e.id AND i.deleted_at IS NULL
  LEFT JOIN public.checkins    c ON c.invitation_id = i.id
  WHERE e.owner_id   = auth.uid()
    AND e.deleted_at IS NULL;

  RETURN v_result;
END;
$$;

-- ─── 8j. UNDO CHECK-IN ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.undo_checkin(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.checkins
  WHERE invitation_id = p_invitation_id
    AND checked_out_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.invitations i
      JOIN public.events e ON e.id = i.event_id
      WHERE i.id = p_invitation_id
        AND e.owner_id = auth.uid()
    );
END;
$$;


-- ============================================================
-- SECTION 9: USEFUL VIEWS
-- ============================================================

-- Invitation + latest check-in status in one query
CREATE OR REPLACE VIEW public.v_invitation_status AS
SELECT
  i.*,
  e.title            AS event_title,
  e.start_at         AS event_start_at,
  e.owner_id         AS event_owner_id,
  c.id               AS checkin_id,
  c.checked_in_at,
  c.checked_out_at,
  c.method           AS checkin_method,
  c.checked_in_by,
  CASE
    WHEN c.id IS NULL              THEN 'not_checked_in'
    WHEN c.checked_out_at IS NULL  THEN 'checked_in'
    ELSE                                'checked_out'
  END                AS checkin_status
FROM public.invitations i
JOIN public.events e ON e.id = i.event_id
LEFT JOIN LATERAL (
  SELECT * FROM public.checkins ck
  WHERE ck.invitation_id = i.id
  ORDER BY ck.checked_in_at DESC
  LIMIT 1
) c ON TRUE
WHERE i.deleted_at IS NULL
  AND e.deleted_at IS NULL;

COMMENT ON VIEW public.v_invitation_status IS
  'Flattened invitation + event + latest check-in row for display.';

-- Recent check-in feed (last 100 across user events)
CREATE OR REPLACE VIEW public.v_recent_checkins AS
SELECT
  c.id,
  c.checked_in_at,
  c.checked_out_at,
  c.method,
  i.id          AS invitation_id,
  i.name        AS guest_name,
  i.email       AS guest_email,
  i.company,
  i.category,
  i.table_number,
  i.seat_number,
  e.id          AS event_id,
  e.title       AS event_title,
  e.start_at    AS event_start_at,
  u.full_name   AS operator_name
FROM public.checkins c
JOIN public.invitations i ON i.id = c.invitation_id
JOIN public.events     e ON e.id = c.event_id
LEFT JOIN public.users u ON u.id = c.checked_in_by
WHERE e.deleted_at IS NULL
  AND i.deleted_at IS NULL;

COMMENT ON VIEW public.v_recent_checkins IS
  'Denormalised check-in feed with guest and event details.';


-- ============================================================
-- SECTION 10: REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;


-- ============================================================
-- END OF MIGRATION
-- ============================================================
