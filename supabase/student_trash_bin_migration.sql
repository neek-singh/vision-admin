-- =====================================================
-- Migration: Add Trash / Recycle Bin (Soft Delete) Support
-- =====================================================

ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Index for instant filtering between active and trashed records
CREATE INDEX IF NOT EXISTS idx_students_is_deleted ON public.students(is_deleted);
