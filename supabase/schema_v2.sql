-- ==========================================
-- GUESTSYNC UNIFIED SCHEMA (v2 with RBAC)
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'operator')),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view related profiles" ON public.profiles;
CREATE POLICY "Users can view related profiles" ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    parent_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Superadmin can delete operators" ON public.profiles;
CREATE POLICY "Superadmin can delete operators" ON public.profiles FOR DELETE
  USING (parent_id = auth.uid() AND role = 'operator');


-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, parent_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'superadmin'),
    NULLIF(NEW.raw_user_meta_data->>'parent_id', '')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================
-- EVENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  capacity INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins can manage their events" ON public.events;
CREATE POLICY "Superadmins can manage their events" ON public.events FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Operators can view parent events" ON public.events;
CREATE POLICY "Operators can view parent events" ON public.events FOR SELECT
  USING (
    user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
  );

CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);


-- =====================
-- GUESTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  table_number TEXT,
  seat_number TEXT,
  qr_code TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and Operators can view guests" ON public.guests;
CREATE POLICY "Users and Operators can view guests" ON public.guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = guests.event_id
      AND (
        events.user_id = auth.uid() OR 
        events.user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
      )
    )
  );

DROP POLICY IF EXISTS "Operators can update guest checkin status" ON public.guests;
CREATE POLICY "Operators can update guest checkin status" ON public.guests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = guests.event_id
      AND events.user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
    )
  );

DROP POLICY IF EXISTS "Superadmins can manage guests" ON public.guests;
CREATE POLICY "Superadmins can manage guests" ON public.guests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = guests.event_id AND events.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_qr_code ON public.guests(qr_code);
CREATE INDEX IF NOT EXISTS idx_guests_checked_in ON public.guests(checked_in);
CREATE INDEX IF NOT EXISTS idx_guests_email ON public.guests(email);


-- =====================
-- CHECKIN LOGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.checkin_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  method TEXT DEFAULT 'manual' CHECK (method IN ('qr', 'manual')),
  checked_in_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

ALTER TABLE public.checkin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and Operators can view checkin logs" ON public.checkin_logs;
CREATE POLICY "Users and Operators can view checkin logs" ON public.checkin_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = checkin_logs.event_id
      AND (
        events.user_id = auth.uid() OR 
        events.user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
      )
    )
  );

DROP POLICY IF EXISTS "Operators can insert checkin logs" ON public.checkin_logs;
CREATE POLICY "Operators can insert checkin logs" ON public.checkin_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = checkin_logs.event_id
      AND events.user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
    )
  );

DROP POLICY IF EXISTS "Superadmins can manage checkin logs" ON public.checkin_logs;
CREATE POLICY "Superadmins can manage checkin logs" ON public.checkin_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = checkin_logs.event_id AND events.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_checkin_logs_event_id ON public.checkin_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_guest_id ON public.checkin_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_checked_in_at ON public.checkin_logs(checked_in_at DESC);


-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_guests_updated_at ON public.guests;
CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- =====================
-- ENABLE REALTIME (Idempotent)
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'guests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'checkin_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.checkin_logs;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END
$$;


-- =====================
-- RPC FUNCTIONS
-- =====================

-- RPC: Create Operator
CREATE OR REPLACE FUNCTION public.create_operator(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_parent_id UUID;
  v_email TEXT;
BEGIN
  -- Get current user (must be authenticated)
  v_parent_id := auth.uid();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure caller is superadmin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_parent_id AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can create operators';
  END IF;

  v_user_id := gen_random_uuid();
  v_email := p_username || '@guestsync.app';

  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  -- Insert into auth.users (Executes with postgres permissions due to SECURITY DEFINER)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email, 
    crypt(p_password, gen_salt('bf')), 
    NOW(),
    jsonb_build_object('full_name', p_full_name, 'role', 'operator', 'parent_id', v_parent_id),
    NOW(), NOW()
  );

  -- Insert into auth.identities to allow login
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text, jsonb_build_object('sub', v_user_id, 'email', v_email), 'email', NOW(), NOW()
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: Delete Operator
CREATE OR REPLACE FUNCTION public.delete_operator(
  p_operator_id UUID
) RETURNS VOID AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  v_parent_id := auth.uid();
  
  -- Check if operator belongs to the caller
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_operator_id AND parent_id = v_parent_id AND role = 'operator') THEN
    RAISE EXCEPTION 'Operator not found or unauthorized';
  END IF;

  -- Delete from auth.users (Cascade will handle profiles)
  DELETE FROM auth.users WHERE id = p_operator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
