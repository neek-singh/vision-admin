-- ALTER TABLE courses ADD COLUMN course_level
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_level TEXT;
