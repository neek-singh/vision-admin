-- =====================================================
-- Migration: Add Dropout / Left Support to Students
-- =====================================================

ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS dropout_date DATE,
  ADD COLUMN IF NOT EXISTS dropout_reason TEXT,
  ADD COLUMN IF NOT EXISTS dropout_remarks TEXT;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
