-- =====================================================
-- VISION LMS — Auto Attendance Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- =====================================================

-- 1. CREATE initialize_daily_attendance FUNCTION
-- This function inserts default 'absent' records for all active students 
-- enrolled in any course for the target date, if they don't already exist.
-- It is idempotent (using ON CONFLICT DO NOTHING) and SECURITY DEFINER 
-- to run with owner permissions, bypassing RLS constraints for student queries.
CREATE OR REPLACE FUNCTION public.initialize_daily_attendance(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  INSERT INTO public.attendance (student_id, course_id, date, status, check_in_time)
  SELECT 
    e.student_id, 
    e.course_id, 
    target_date, 
    'absent'::text,
    NULL::timestamp with time zone
  FROM public.enrollments e
  JOIN public.students s ON e.student_id = s.id
  WHERE s.status = 'active'
  ON CONFLICT (student_id, course_id, date) DO NOTHING;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE!
-- =====================================================
