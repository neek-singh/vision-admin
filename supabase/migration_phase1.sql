-- =====================================================
-- VISION LMS — Phase 1 Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- =====================================================

-- 1. CREATE BATCHES TABLE (replaces batches.json)
CREATE TABLE IF NOT EXISTS batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  faculty_name TEXT,
  start_date DATE,
  end_date DATE,
  timing TEXT,
  max_seats INTEGER DEFAULT 30,
  available_seats INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MODIFY lms_modules — add multi-batch + description
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_modules' AND column_name='batches') THEN
    ALTER TABLE lms_modules ADD COLUMN batches TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_modules' AND column_name='description') THEN
    ALTER TABLE lms_modules ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_modules' AND column_name='is_published') THEN
    ALTER TABLE lms_modules ADD COLUMN is_published BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 3. MODIFY lessons — add rich types + drip content
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='lesson_type') THEN
    ALTER TABLE lessons ADD COLUMN lesson_type TEXT DEFAULT 'video';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='notes_content') THEN
    ALTER TABLE lessons ADD COLUMN notes_content TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='pdf_url') THEN
    ALTER TABLE lessons ADD COLUMN pdf_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='assignment_file') THEN
    ALTER TABLE lessons ADD COLUMN assignment_file TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='thumbnail') THEN
    ALTER TABLE lessons ADD COLUMN thumbnail TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='scheduled_release_date') THEN
    ALTER TABLE lessons ADD COLUMN scheduled_release_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='status') THEN
    ALTER TABLE lessons ADD COLUMN status TEXT DEFAULT 'published';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='batches') THEN
    ALTER TABLE lessons ADD COLUMN batches TEXT[];
  END IF;
END $$;

-- 4. CREATE batch_lesson_overrides
CREATE TABLE IF NOT EXISTS batch_lesson_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  custom_notes TEXT,
  custom_video_url TEXT,
  custom_pdf_url TEXT,
  live_class_link TEXT,
  release_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lesson_id, batch_id)
);

-- 5. CREATE lesson_progress
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  watch_percentage INTEGER DEFAULT 0,
  last_position INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

-- 6. CREATE bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

-- 7. MODIFY tests — multi-batch + passing marks
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tests' AND column_name='batches') THEN
    ALTER TABLE tests ADD COLUMN batches TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tests' AND column_name='passing_marks') THEN
    ALTER TABLE tests ADD COLUMN passing_marks INTEGER;
  END IF;
END $$;

-- 8. MODIFY materials — multi-batch
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materials' AND column_name='batches') THEN
    ALTER TABLE materials ADD COLUMN batches TEXT[];
  END IF;
END $$;

-- 9. MODIFY assignments — multi-batch + grading
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assignments' AND column_name='batches') THEN
    ALTER TABLE assignments ADD COLUMN batches TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assignments' AND column_name='max_marks') THEN
    ALTER TABLE assignments ADD COLUMN max_marks INTEGER DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assignments' AND column_name='deadline') THEN
    ALTER TABLE assignments ADD COLUMN deadline TIMESTAMPTZ;
  END IF;
END $$;

-- 10. MODIFY submissions — grading
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='marks') THEN
    ALTER TABLE submissions ADD COLUMN marks INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='feedback') THEN
    ALTER TABLE submissions ADD COLUMN feedback TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='graded_at') THEN
    ALTER TABLE submissions ADD COLUMN graded_at TIMESTAMPTZ;
  END IF;
END $$;

-- 11. MODIFY students — add batch_id FK
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='batch_id') THEN
    ALTER TABLE students ADD COLUMN batch_id UUID REFERENCES batches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 12. MODIFY enrollments — batch_id + resume tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='batch_id') THEN
    ALTER TABLE enrollments ADD COLUMN batch_id UUID REFERENCES batches(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrollments' AND column_name='last_lesson_id') THEN
    ALTER TABLE enrollments ADD COLUMN last_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 13. CREATE schedule table if missing
CREATE TABLE IF NOT EXISTS schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'class',  -- class, exam, deadline, event
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  live_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_batches_course_id ON batches(course_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_lms_modules_course_id ON lms_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_batch_overrides_lesson ON batch_lesson_overrides(lesson_id);
CREATE INDEX IF NOT EXISTS idx_batch_overrides_batch ON batch_lesson_overrides(batch_id);
CREATE INDEX IF NOT EXISTS idx_students_batch_id ON students(batch_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch_id ON enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_schedule_batch ON schedule(batch_id);

-- 15. Enable RLS on new tables
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_lesson_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (we'll tighten later)
CREATE POLICY "Allow all for authenticated" ON batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON batch_lesson_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON lesson_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON bookmarks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon key access (for student app that uses cookie auth)
CREATE POLICY "Allow all for anon" ON batches FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON batch_lesson_overrides FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lesson_progress FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON bookmarks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON schedule FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- DONE! Verify with: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- =====================================================
