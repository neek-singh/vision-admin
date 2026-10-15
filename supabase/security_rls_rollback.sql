-- ==========================================================
-- VISION IT SECURITY RLS ROLLBACK SCRIPT
-- File: supabase/security_rls_rollback.sql
-- ==========================================================

-- Warning: Running this script restores permissive RLS policies.
-- Use ONLY in emergencies if production operations break.

do $$
declare
  t text;
  tables text[] := array[
    'students', 'fees', 'payments', 'installments', 'expenses', 
    'attendance', 'attendance_sessions', 'enrollments', 'notifications', 
    'user_notifications', 'notification_history', 'lms_modules', 
    'lms_chapters', 'lessons', 'tests', 'test_questions', 'test_results',
    'materials', 'schedules', 'schedule', 'events', 'assignments', 
    'submissions', 'assignment_courses', 'student_daily_activity', 
    'batch_lesson_overrides', 'lesson_progress', 'bookmarks', 
    'admission_payments', 'admission_otps', 'password_reset_otps', 
    'lms_chat_rooms', 'lms_messages', 'lms_pinned_rooms', 'user_progress',
    'blogs', 'gallery', 'batches', 'courses', 'stats', 'verifications', 'blog_likes',
    'contacts', 'admissions', 'contact_messages', 'profiles', 'push_subscriptions'
  ];
begin
  foreach t in array tables loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('drop policy if exists "admin all" on public.%I', t);
      execute format('drop policy if exists "public read" on public.%I', t);
      execute format('drop policy if exists "admin write" on public.%I', t);
      execute format('drop policy if exists "public insert" on public.%I', t);
      execute format('drop policy if exists "admin read" on public.%I', t);
      execute format('drop policy if exists "admin modify" on public.%I', t);
      execute format('drop policy if exists "admin delete" on public.%I', t);
      execute format('drop policy if exists "own read" on public.%I', t);
      execute format('drop policy if exists "admin all profiles" on public.%I', t);
      execute format('drop policy if exists "own subs" on public.%I', t);
      execute format('drop policy if exists "admin subs" on public.%I', t);

      -- Re-grant permissive access
      execute format('create policy "Allow all for authenticated" on public.%I for all to authenticated using (true) with check (true)', t);
      execute format('create policy "Allow all for anon" on public.%I for all to anon using (true) with check (true)', t);
    end if;
  end loop;
end $$;
