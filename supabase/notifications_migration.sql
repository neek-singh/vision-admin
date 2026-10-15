-- ============================================================================
-- Supabase Notifications Migration
-- Created for: Vision Admin Notification System & Fee Reminders
-- ============================================================================

-- 1. Add last_reminder_sent_at to installments to prevent duplicate fee reminders
ALTER TABLE public.installments 
ADD COLUMN IF NOT EXISTS last_reminder_sent_at DATE;

-- 2. Ensure RLS is active on notifications tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- 3. Security policies for user_notifications
-- Students can read their own received notifications
DROP POLICY IF EXISTS "Students can view their own notifications" ON public.user_notifications;
CREATE POLICY "Students can view their own notifications"
ON public.user_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Students can mark their own notifications as read
DROP POLICY IF EXISTS "Students can update their own notifications" ON public.user_notifications;
CREATE POLICY "Students can update their own notifications"
ON public.user_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Admins can manage all notification tables
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin' 
      AND NOT profiles.is_blocked
  )
);

DROP POLICY IF EXISTS "Admins can manage user_notifications" ON public.user_notifications;
CREATE POLICY "Admins can manage user_notifications"
ON public.user_notifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin' 
      AND NOT profiles.is_blocked
  )
);

DROP POLICY IF EXISTS "Admins can manage notification_history" ON public.notification_history;
CREATE POLICY "Admins can manage notification_history"
ON public.notification_history
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin' 
      AND NOT profiles.is_blocked
  )
);

-- ============================================================================
-- 5. Automatic Trigger: Notify Admins on Assignment Submissions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_admins_on_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_assignment_title TEXT;
  v_notif_id UUID;
  v_admin RECORD;
  v_title TEXT := 'Nayi Assignment Submission 📥';
  v_body TEXT;
BEGIN
  -- Only trigger when submission is completed/submitted
  IF NEW.status = 'submitted' THEN
    -- Fetch student name
    SELECT name INTO v_student_name FROM public.students WHERE id = NEW.student_id;
    IF v_student_name IS NULL THEN
      SELECT full_name INTO v_student_name FROM public.profiles WHERE id = NEW.student_id;
    END IF;
    IF v_student_name IS NULL THEN
      v_student_name := 'Student';
    END IF;

    -- Fetch assignment or lesson title
    IF NEW.assignment_id IS NOT NULL THEN
      SELECT title INTO v_assignment_title FROM public.assignments WHERE id = NEW.assignment_id;
    ELSIF NEW.lesson_id IS NOT NULL THEN
      SELECT title INTO v_assignment_title FROM public.lessons WHERE id = NEW.lesson_id;
    END IF;
    IF v_assignment_title IS NULL THEN
      v_assignment_title := 'Assignment';
    END IF;

    v_body := SUBSTRING(v_student_name || ' ne ' || v_assignment_title || ' submit kiya.' FROM 1 FOR 120);

    -- Insert master notification
    INSERT INTO public.notifications (title, message, type)
    VALUES (v_title, v_body, 'assignment_submission')
    RETURNING id INTO v_notif_id;

    -- Link notification to all non-blocked admins
    FOR v_admin IN 
      SELECT id FROM public.profiles 
      WHERE role = 'admin' AND NOT is_blocked 
    LOOP
      INSERT INTO public.user_notifications (user_id, notification_id, is_read)
      VALUES (v_admin.id, v_notif_id, false);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_submission_notify_admins ON public.submissions;
CREATE TRIGGER trg_submission_notify_admins
  AFTER INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  WHEN (NEW.status = 'submitted')
  EXECUTE FUNCTION public.notify_admins_on_submission();

