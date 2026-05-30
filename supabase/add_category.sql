-- ALTER TABLE courses ADD COLUMN category
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category TEXT;
