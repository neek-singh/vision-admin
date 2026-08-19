-- Create join table for assignments and courses (many-to-many)
CREATE TABLE IF NOT EXISTS public.assignment_courses (
    assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    PRIMARY KEY (assignment_id, course_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.assignment_courses ENABLE ROW LEVEL SECURITY;

-- Policy: Admin all (for authenticated users)
CREATE POLICY "Admin all" ON public.assignment_courses
    FOR ALL
    TO public
    USING (auth.role() = 'authenticated'::text)
    WITH CHECK (auth.role() = 'authenticated'::text);

-- Policy: Student select (select for everyone)
CREATE POLICY "Student select" ON public.assignment_courses
    FOR SELECT
    TO public
    USING (true);

-- Migrate existing associations
INSERT INTO public.assignment_courses (assignment_id, course_id)
SELECT id, course_id 
FROM public.assignments 
WHERE course_id IS NOT NULL 
ON CONFLICT DO NOTHING;
