-- ==============================================================================
-- EMPLOYEE PROFILES (بروفايل الموظفين) - شغّل هذا في Supabase SQL Editor
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,   -- تاريخ الميلاد، الجنسية، التعيين، الطوارئ، المحطات المؤهل عليها...
  photo TEXT DEFAULT '',                     -- صورة الموظف (base64 مصغرة)
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon full access on employee_profiles" ON public.employee_profiles;
CREATE POLICY "Anon full access on employee_profiles" ON public.employee_profiles
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.employee_profiles TO anon, authenticated, service_role;
