-- ==========================================
-- RBAC AND OPERATOR SETUP SCRIPT
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Alter Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'superadmin' CHECK (role IN ('superadmin', 'operator'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Update Profile RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view related profiles" ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    parent_id = auth.uid() OR
    id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid())
  );

-- Allow superadmins to delete their operators
CREATE POLICY "Superadmin can delete operators" ON public.profiles FOR DELETE
  USING (parent_id = auth.uid() AND role = 'operator');

-- 4. Update Profile Trigger to read role and parent_id
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


-- 5. Update RLS for Events
DROP POLICY IF EXISTS "Users can manage their own events" ON public.events;
DROP POLICY IF EXISTS "Superadmins can manage their events" ON public.events;
DROP POLICY IF EXISTS "Operators can view parent events" ON public.events;

CREATE POLICY "Superadmins can manage their events" ON public.events FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Operators can view parent events" ON public.events FOR SELECT
  USING (
    user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
  );


-- 6. Update RLS for Guests
DROP POLICY IF EXISTS "Users can manage guests of their events" ON public.guests;
DROP POLICY IF EXISTS "Users and Operators can view guests" ON public.guests;
DROP POLICY IF EXISTS "Superadmins can manage guests" ON public.guests;

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

CREATE POLICY "Superadmins can manage guests" ON public.guests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = guests.event_id AND events.user_id = auth.uid()));


-- 7. Update RLS for Invitations
DROP POLICY IF EXISTS "Users can manage their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users and Operators can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Operators can update invitation status" ON public.invitations;
DROP POLICY IF EXISTS "Superadmins can manage invitations" ON public.invitations;

CREATE POLICY "Users and Operators can view invitations" ON public.invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = invitations.event_id
      AND (
        events.user_id = auth.uid() OR 
        events.user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
      )
    )
  );

CREATE POLICY "Operators can update invitation status" ON public.invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = invitations.event_id
      AND events.user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
    )
  );

CREATE POLICY "Superadmins can manage invitations" ON public.invitations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = invitations.event_id AND events.user_id = auth.uid()));


-- 8. Update RLS for Checkins
DROP POLICY IF EXISTS "Users can manage their checkins" ON public.checkins;
DROP POLICY IF EXISTS "Users and Operators can view checkins" ON public.checkins;
DROP POLICY IF EXISTS "Operators can insert checkins" ON public.checkins;
DROP POLICY IF EXISTS "Superadmins can manage checkins" ON public.checkins;

CREATE POLICY "Users and Operators can view checkins" ON public.checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = checkins.event_id
      AND (
        events.user_id = auth.uid() OR 
        events.user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
      )
    )
  );

CREATE POLICY "Operators can insert checkins" ON public.checkins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = checkins.event_id
      AND events.user_id = (SELECT parent_id FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
    )
  );

CREATE POLICY "Superadmins can manage checkins" ON public.checkins FOR ALL
  USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = checkins.event_id AND events.user_id = auth.uid()));


-- 9. RPC: Create Operator
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
  v_email := p_username || '@app.local';

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

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. RPC: Delete Operator
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
