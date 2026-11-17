-- ==============================================================================
-- BATCH STATUS (حالة الباتش: تم التحديد / قيد الفحص FAT / تم التسليم لنماء)
-- شغّله مرة وحدة في Supabase SQL Editor
-- ==============================================================================
ALTER TABLE public.shipment_batches ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DEFINED'; -- DEFINED, FAT, DELIVERED
ALTER TABLE public.shipment_batches ADD COLUMN IF NOT EXISTS defined_date TEXT;   -- تاريخ التحديد (افتراضياً تاريخ الرفع)
ALTER TABLE public.shipment_batches ADD COLUMN IF NOT EXISTS fat_date TEXT;       -- تاريخ بدء فحص FAT
ALTER TABLE public.shipment_batches ADD COLUMN IF NOT EXISTS delivered_date TEXT; -- تاريخ التسليم لنماء

-- الباتشات الموجودة: تاريخ التحديد = تاريخ الرفع
UPDATE public.shipment_batches SET defined_date = shipment_date WHERE defined_date IS NULL;

-- تحديث لحظي للوحة الإدارة
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shipment_batches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_batches;
  END IF;
END $$;
