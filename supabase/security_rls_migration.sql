-- ==========================================================
-- VISION IT SECURITY & RLS LOCKDOWN MIGRATION (COMPLETE AUDITED)
-- File: supabase/security_rls_migration.sql
-- ==========================================================

-- 0. Ensure password_hash column in students & create student_login_attempts table
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'students' and column_name = 'password'
  ) and not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'students' and column_name = 'password_hash'
  ) then
    alter table public.students rename column password to password_hash;
  end if;
end $$;

create table if not exists public.student_login_attempts (
  id bigserial primary key,
  student_id text not null,
  success boolean not null,
  created_at timestamptz default now()
);

create index if not exists idx_student_login_attempts_lookup 
  on public.student_login_attempts (student_id, created_at desc);

alter table public.student_login_attempts enable row level security;
-- No policies on student_login_attempts: only service_role (supabaseAdmin) can access

-- 1. Helper Function: is_admin()
create or replace function public.is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and coalesce(is_blocked, false) = false
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- 2. Drop all over-permissive and existing policies across all public tables
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3. CLASS A: Admin-only tables (Students, financial records, LMS master data, analytics)
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
    'lms_chat_rooms', 'lms_messages', 'lms_pinned_rooms', 'user_progress'
  ];
begin
  foreach t in array tables loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('alter table public.%I enable row level security', t);
      execute format('create policy "admin all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    end if;
  end loop;
end $$;

-- 4. CLASS B: Public read, Admin write (Public website & course directory)
do $$
declare
  t text;
  tables text[] := array['blogs', 'gallery', 'batches', 'courses', 'stats', 'verifications', 'blog_likes'];
begin
  foreach t in array tables loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('alter table public.%I enable row level security', t);
      execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
      execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    end if;
  end loop;
end $$;

-- 5. CLASS C: Public insert, Admin manage (Inquiries, admissions, chats)
do $$
declare
  t text;
  tables text[] := array['contacts', 'admissions', 'contact_messages'];
begin
  foreach t in array tables loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('alter table public.%I enable row level security', t);
      execute format('create policy "public insert" on public.%I for insert to anon, authenticated with check (true)', t);
      execute format('create policy "admin read" on public.%I for select to authenticated using (public.is_admin())', t);
      execute format('create policy "admin modify" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
      execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.is_admin())', t);
    end if;
  end loop;
end $$;

-- 6. CLASS D: Own-row (Profiles, push subscriptions)
-- profiles
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles') then
    alter table public.profiles enable row level security;
    create policy "own read" on public.profiles
      for select to authenticated using (id = auth.uid() or public.is_admin());
    create policy "admin all profiles" on public.profiles
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- push_subscriptions
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'push_subscriptions') then
    alter table public.push_subscriptions enable row level security;
    create policy "own subs" on public.push_subscriptions
      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy "admin subs" on public.push_subscriptions
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- 7. Revoke execution on cron / batch functions from public & anon
do $$
begin
  if exists (select 1 from pg_proc where proname = 'initialize_daily_attendance') then
    execute 'revoke execute on function public.initialize_daily_attendance from public, anon';
  end if;
end $$;
