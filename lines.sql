-- ==============================================================================
-- PHASE 2: second production line (single-phase M11) next to MT212 (three-phase)
-- Run in Supabase → SQL Editor BEFORE deploying the app version that uses it.
-- Safe for the app that is live now: existing rows and new rows from the old
-- app get line = '3P'. Safe to run again.
-- ==============================================================================

do $$
declare t text;
begin
  foreach t in array array['production_records','stoppages','defective_meters','kit_meters','shipment_batches'] loop
    execute format('alter table public.%I add column if not exists line text not null default %L', t, '3P');
    if not exists (select 1 from pg_constraint where conname = t || '_line_check') then
      execute format('alter table public.%I add constraint %I check (line in (%L, %L))', t, t || '_line_check', '3P', '1P');
    end if;
    execute format('create index if not exists %I on public.%I (line)', t || '_line_idx', t);
  end loop;
end $$;

-- Kits and batches already recorded as "Single Phase" belong to the new line
update public.kit_meters set line = '1P' where product_name = 'Single Phase' and line <> '1P';
update public.shipment_batches set line = '1P' where product_type = 'Single Phase' and line <> '1P';

-- Targets for the single-phase line (the three-phase line keeps key 'mgmt_targets').
-- Start date is empty until set from the management dashboard settings.
insert into public.app_settings (key, value, updated_at)
values (
  'mgmt_targets_1P',
  jsonb_build_object(
    'overallProd', 200000,
    'dailyProd', 1600,
    'shiftsPerDay', 2,
    'overallFw', 200000,
    'dailyFw', 1600,
    'baselineDefects', 0,
    'consumptionRateMode', 'adaptive',
    'fixedConsumptionRate', 1600,
    'projectStartDate', ''
  ),
  now()
)
on conflict (key) do nothing;

-- Check: rows per table and line
select 'production_records' as tbl, line, count(*) from public.production_records group by line
union all select 'stoppages', line, count(*) from public.stoppages group by line
union all select 'defective_meters', line, count(*) from public.defective_meters group by line
union all select 'kit_meters', line, count(*) from public.kit_meters group by line
union all select 'shipment_batches', line, count(*) from public.shipment_batches group by line
order by 1, 2;
