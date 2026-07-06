-- SQL script to enable cascade delete on students table
-- Drops existing constraints on fees and payments that prevent student deletion and recreates them with ON DELETE CASCADE

-- 1. Drop existing constraints
ALTER TABLE public.fees DROP CONSTRAINT IF EXISTS fees_student_id_fkey;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;

-- 2. Re-create them with ON DELETE CASCADE
ALTER TABLE public.fees 
  ADD CONSTRAINT fees_student_id_fkey 
  FOREIGN KEY (student_id) 
  REFERENCES public.students(id) 
  ON DELETE CASCADE;

ALTER TABLE public.payments 
  ADD CONSTRAINT payments_student_id_fkey 
  FOREIGN KEY (student_id) 
  REFERENCES public.students(id) 
  ON DELETE CASCADE;
