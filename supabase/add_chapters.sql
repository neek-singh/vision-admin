-- =====================================================
-- VISION LMS — Add Chapters Table
-- Hierarchy: Module -> Chapter -> Lesson
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. CREATE lms_chapters TABLE
CREATE TABLE IF NOT EXISTS lms_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES lms_modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MODIFY lessons — add chapter_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='chapter_id') THEN
    ALTER TABLE lessons ADD COLUMN chapter_id UUID REFERENCES lms_chapters(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_lms_chapters_module_id ON lms_chapters(module_id);
CREATE INDEX IF NOT EXISTS idx_lms_chapters_course_id ON lms_chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON lessons(chapter_id);

-- 4. Enable RLS
ALTER TABLE lms_chapters ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Allow all for authenticated" ON lms_chapters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lms_chapters FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- DONE!
-- =====================================================
