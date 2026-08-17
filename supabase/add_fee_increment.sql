-- Add increment_amount column to fees table
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS increment_amount NUMERIC DEFAULT 0;
