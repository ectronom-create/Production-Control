-- ==============================================================================
-- SECURITY PHASE 1 — STEP 1 of 3: prepare Supabase Auth  (safe to run now)
-- Adds what the new login needs. Changes NOTHING for the app that is live
-- today: the current anon policies stay until step 3 (04_lock_rls.sql).
-- Run in: Supabase → SQL Editor. Safe to run again.
-- ==============================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) Link every app user to a Supabase Auth account ---------------------------
alter table public.users add column if not exists auth_id uuid unique;
alter table public.users add column if not exists must_change_password boolean not null default false;

-- Weak passwords (= company ID, = name, 1234, under 8 chars when still plain)
-- must be changed on the first login with the new system.
update public.users u
set must_change_password = true
where u.password is not null
  and (
    (u.password ~ '^\$2[aby]\$' and (
        u.password = extensions.crypt(coalesce(u.company_id, ''), u.password)
     or u.password = extensions.crypt(coalesce(u.name, ''), u.password)
     or u.password = extensions.crypt('1234', u.password)
     or u.password = extensions.crypt('12345678', u.password)))
    or (u.password !~ '^\$2[aby]\$' and (
        length(u.password) < 8 or u.password = u.company_id or u.password = u.name))
  );

-- 2) Who is calling? (used by every policy in step 3) -------------------------
-- Read from the users table on every request, so a role change or a deleted
-- account takes effect immediately (not at the next token refresh).
create or replace function public.app_user_id() returns bigint
language sql stable security definer set search_path = public as $$
  select u.id from public.users u where u.auth_id = auth.uid() limit 1;
$$;

create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select lower(u.access) from public.users u where u.auth_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin() returns boolean
language sql stable set search_path = public as $$
  select coalesce(public.app_role() = 'admin', false);
$$;

-- admin + supervisor: the people who run the line
create or replace function public.is_staff() returns boolean
language sql stable set search_path = public as $$
  select coalesce(public.app_role() in ('admin', 'supervisor'), false);
$$;

-- admin + supervisor + viewer: may read production data
create or replace function public.is_reader() returns boolean
language sql stable set search_path = public as $$
  select coalesce(public.app_role() in ('admin', 'supervisor', 'viewer'), false);
$$;

revoke all on function public.app_user_id(), public.app_role(), public.is_admin(),
  public.is_staff(), public.is_reader() from public;
grant execute on function public.app_user_id(), public.app_role(), public.is_admin(),
  public.is_staff(), public.is_reader() to authenticated;

-- 3) Login helper: company ID or name -> the Auth e-mail to sign in with -------
create or replace function public.auth_login_email(p_login text) returns text
language sql stable security definer set search_path = public, auth as $$
  select a.email
  from public.users u
  join auth.users a on a.id = u.auth_id
  where lower(btrim(u.company_id)) = lower(btrim(p_login))
     or lower(btrim(u.name)) = lower(btrim(p_login))
  order by (lower(btrim(u.company_id)) = lower(btrim(p_login))) desc
  limit 1;
$$;
revoke all on function public.auth_login_email(text) from public;
grant execute on function public.auth_login_email(text) to anon, authenticated;

-- 4) The signed-in user's own row (no password) --------------------------------
create or replace function public.my_app_user()
returns table(id bigint, name text, access text, team_name text, company_id text,
              email text, phone text, must_change_password boolean)
language sql stable security definer set search_path = public as $$
  select u.id, u.name, lower(u.access), u.team_name, u.company_id, u.email, u.phone,
         u.must_change_password
  from public.users u where u.auth_id = auth.uid() limit 1;
$$;
revoke all on function public.my_app_user() from public;
grant execute on function public.my_app_user() to authenticated;

-- Called by the app right after the user sets a new password.
create or replace function public.clear_must_change_password() returns void
language sql security definer set search_path = public as $$
  update public.users set must_change_password = false where auth_id = auth.uid();
$$;
revoke all on function public.clear_must_change_password() from public;
grant execute on function public.clear_must_change_password() to authenticated;

-- 5) Any employee (operators too) edits ONLY the personal part of their profile.
-- Job fields (title, department, hire date, contract, shift, status, certified
-- stations, notes, supervisor) stay admin/supervisor-only.
create or replace function public.update_my_profile(p_personal jsonb, p_photo text default null,
                                                    p_phone text default null, p_email text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint := public.app_user_id();
  v_allowed text[] := array['full_name_ar','dob','gender','nationality','marital_status',
    'blood_type','address','emergency_name','emergency_relation','emergency_phone',
    'education','languages'];
  v_clean jsonb := '{}'::jsonb;
  k text;
begin
  if v_id is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  for k in select jsonb_object_keys(coalesce(p_personal, '{}'::jsonb)) loop
    if k = any(v_allowed) then
      v_clean := v_clean || jsonb_build_object(k, p_personal -> k);
    end if;
  end loop;

  insert into public.employee_profiles (user_id, data, photo, updated_at)
  values (v_id, v_clean, coalesce(p_photo, ''), now())
  on conflict (user_id) do update
    set data = public.employee_profiles.data || v_clean,
        photo = coalesce(p_photo, public.employee_profiles.photo),
        updated_at = now();

  if p_phone is not null or p_email is not null then
    update public.users
       set phone = coalesce(p_phone, phone),
           email = coalesce(p_email, email),
           updated_at = now()
     where id = v_id;
  end if;
end;
$$;
revoke all on function public.update_my_profile(jsonb, text, text, text) from public;
grant execute on function public.update_my_profile(jsonb, text, text, text) to authenticated;

-- 6) Role guard: only an admin may give or change a role. A supervisor may only
-- create / edit operators (Line Crew page). Writes with no signed-in user
-- (today's app, and the admin-users Edge Function) are not affected here.
create or replace function public.users_role_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if lower(new.access) <> 'operator' then
      raise exception 'only_admin_can_set_role' using errcode = '42501';
    end if;
  elsif tg_op = 'UPDATE' then
    -- (must_change_password is not writable from the app at all: column grants)
    if lower(new.access) is distinct from lower(old.access)
       or new.auth_id is distinct from old.auth_id then
      raise exception 'only_admin_can_set_role' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_users_role_guard on public.users;
create trigger trg_users_role_guard
  before insert or update on public.users
  for each row execute function public.users_role_guard();

-- 7) Transition window: the NEW app signs users in (role "authenticated"),
-- while several old policies were written for "anon" only. Give signed-in users
-- the same access the anon key has today, so the new app works before step 3.
-- Step 3 (04_lock_rls.sql) removes these and installs the real per-role rules.
do $$
declare t text;
begin
  foreach t in array array['users','production_records','stoppages','kit_meters','shipment_batches',
                           'batch_meter_records','batch_fw_targets','defective_meters',
                           'pre_production_checklists','employee_profiles','app_settings'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t
                   and policyname = 'transition: signed-in full access') then
      execute format('create policy "transition: signed-in full access" on public.%I for all to authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;

-- Check: how many accounts will have to pick a new password
select count(*) filter (where must_change_password) as must_change,
       count(*) as total_users
from public.users;
