-- Migration: Add checkin_method column to guests table
-- This allows differentiating between QR scan and manual check-in

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS checkin_method TEXT DEFAULT 'qr' CHECK (checkin_method IN ('qr', 'manual'));
