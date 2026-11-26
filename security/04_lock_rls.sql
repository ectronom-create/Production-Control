-- ==============================================================================
-- SECURITY PHASE 1 — STEP 3 of 3: lock the database   (run LAST)
-- Run ONLY after:
--   • 03_auth_prepare.sql ran,
--   • every user was moved to Supabase Auth (migrate-users-to-auth.mjs),
--   • the new app version is live on Vercel and you logged in with it.
-- After this, the public anon key can no longer read or change anything:
-- every request needs a signed-in user, and each role gets only its own rights.
-- Safe to run again.
-- ==============================================================================

-- 1) Remove every old policy ("Anon full access ...") on the app tables --------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('users','production_records','stoppages','kit_meters','shipment_batches',
                        'batch_meter_records','batch_fw_targets','defective_meters',
                        'pre_production_checklists','employee_profiles','app_settings')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 2) No access at all for the anon key -----------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
-- the login screen still needs these two
grant execute on function public.auth_login_email(text) to anon;

-- 3) RLS on, per table ----------------------------------------------------------
alter table public.users enable row level security;
alter table public.production_records enable row level security;
alter table public.stoppages enable row level security;
alter table public.kit_meters enable row level security;
alter table public.shipment_batches enable row level security;
alter table public.batch_meter_records enable row level security;
alter table public.batch_fw_targets enable row level security;
alter table public.defective_meters enable row level security;
alter table public.pre_production_checklists enable row level security;
alter table public.employee_profiles enable row level security;
alter table public.app_settings enable row level security;

-- Signed-in users need table rights on every app table (RLS below decides
-- the rows). shipment_batches / batch_meter_records were created without them.
grant select, insert, update, delete on public.shipment_batches, public.batch_meter_records to authenticated;

-- Line work — read: admin/supervisor/viewer · write: admin/supervisor · delete: admin
do $$
declare t text;
begin
  foreach t in array array['production_records','stoppages','defective_meters','pre_production_checklists'] loop
    execute format('create policy "read: line roles" on public.%I for select to authenticated using (public.is_reader())', t);
    execute format('create policy "insert: admin, supervisor" on public.%I for insert to authenticated with check (public.is_staff())', t);
    execute format('create policy "update: admin, supervisor" on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create policy "delete: admin" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- Kits, batches, settings — read: admin/supervisor/viewer · write: admin only
do $$
declare t text;
begin
  foreach t in array array['kit_meters','shipment_batches','batch_meter_records','batch_fw_targets','app_settings'] loop
    execute format('create policy "read: line roles" on public.%I for select to authenticated using (public.is_reader())', t);
    execute format('create policy "write: admin" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Users — everyone with a line role sees the list; an operator sees only himself.
-- The app only UPDATES rows; create / delete / passwords go through the
-- admin-users Edge Function (it also manages the Auth account).
create policy "read: line roles or self" on public.users for select to authenticated
  using (public.is_reader() or id = public.app_user_id());
create policy "update: admin, supervisor for operators and self" on public.users for update to authenticated
  using (public.is_admin() or (public.is_staff() and (lower(access) = 'operator' or id = public.app_user_id())))
  with check (public.is_admin() or (public.is_staff() and (lower(access) = 'operator' or id = public.app_user_id())));

revoke all on public.users from authenticated;
grant select (id, name, company_id, email, phone, access, team_name, created_at, updated_at)
  on public.users to authenticated;
grant update (name, company_id, email, phone, access, team_name, updated_at)
  on public.users to authenticated;            -- role changes are still blocked by trg_users_role_guard

-- Employee profiles — staff see all; an operator sees his own.
-- Staff edit: admin everyone, supervisor himself + operators.
-- Operators change their personal fields only through update_my_profile().
create policy "read: line roles or own" on public.employee_profiles for select to authenticated
  using (public.is_reader() or user_id = public.app_user_id());
create policy "write: admin, supervisor for operators and self" on public.employee_profiles for all to authenticated
  using (
    public.is_admin()
    or (public.is_staff() and (
          user_id = public.app_user_id()
          or exists (select 1 from public.users u where u.id = user_id and lower(u.access) = 'operator')))
  )
  with check (
    public.is_admin()
    or (public.is_staff() and (
          user_id = public.app_user_id()
          or exists (select 1 from public.users u where u.id = user_id and lower(u.access) = 'operator')))
  );

-- 4) The old compatibility view must not bypass RLS ------------------------------
-- (only if that view exists in this project)
do $$
begin
  if to_regclass('public.fpy_reports') is not null then
    execute 'alter view public.fpy_reports set (security_invoker = true)';
    execute 'revoke all on public.fpy_reports from anon';
    execute 'grant select on public.fpy_reports to authenticated';
  end if;
end $$;

-- 5) Old browser-side login is no longer used -----------------------------------
drop function if exists public.app_login(text, text);

-- Check: should list only the new policies
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' order by tablename, policyname;
