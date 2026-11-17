-- ==============================================================================
-- تفعيل التحديث اللحظي (Realtime) لبروفايل الموظفين - شغّله مرة وحدة في SQL Editor
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'employee_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END $$;

-- حتى تصل بيانات الحذف كاملة (user_id) عند حذف بروفايل
ALTER TABLE public.employee_profiles REPLICA IDENTITY FULL;

-- تحقق: لازم يطلع الجدولين
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename IN ('employee_profiles', 'users');
