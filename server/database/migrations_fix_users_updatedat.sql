-- Add updatedat column to users table if missing
-- Matching createdat type (TEXT) as per schema inspection
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updatedat TEXT;
