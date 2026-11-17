-- ==============================================================================
-- APP SETTINGS (أهداف لوحة الإدارة الموحدة لكل الأجهزة) - شغّله مرة وحدة في SQL Editor
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access on app_settings" ON public.app_settings;
CREATE POLICY "Anon full access on app_settings" ON public.app_settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.app_settings TO anon, authenticated, service_role;

-- الهدف اليومي 1200 عداد، 7 أيام بالأسبوع، العقد 300,000
INSERT INTO public.app_settings (key, value) VALUES (
  'mgmt_targets',
  '{"overallProd":300000,"dailyProd":1200,"weeklyProd":8400,"shiftProd":600,"shiftsPerDay":2,
    "overallFw":70000,"dailyFw":1200,"weeklyFw":8400,"shiftFw":600,
    "baselineDefects":4250,"consumptionRateMode":"adaptive","fixedConsumptionRate":1200,
    "projectStartDate":"2026-08-17"}'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- تحديث لحظي عند تغيير الأهداف
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
END $$;
