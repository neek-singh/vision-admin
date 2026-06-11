-- =====================================================
-- VISION LMS — Attendance QR Sessions Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- =====================================================

-- 1. CREATE attendance_sessions TABLE
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_token ON attendance_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(date);

-- 3. RLS
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON attendance_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON attendance_sessions FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. ADD session_id column to attendance table (optional — links attendance record to session)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='session_id') THEN
    ALTER TABLE attendance ADD COLUMN session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='check_in_time') THEN
    ALTER TABLE attendance ADD COLUMN check_in_time TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- =====================================================
-- DONE! 
-- =====================================================
