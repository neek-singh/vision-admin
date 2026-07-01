-- Add has_credentials column to students table
-- Run in Supabase SQL Editor

ALTER TABLE students ADD COLUMN IF NOT EXISTS has_credentials BOOLEAN DEFAULT false;

-- Mark existing students who already have a real password set
-- (optional: you can manually set this for existing students)
-- UPDATE students SET has_credentials = true WHERE <your condition>;
