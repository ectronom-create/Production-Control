-- ==============================================================================
-- SECURITY STEP A — run NOW in Supabase SQL Editor (safe, changes nothing visible)
-- Creates the server-side login check used by the new app version.
-- Works with BOTH the current plain-text passwords and hashed ones, so it can
-- be run before or after deploying the new code.
-- ==============================================================================

create extension if not exists pgcrypto with schema extensions;

-- Failed-login log (for brute-force protection). Not readable from the app.
create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  login text not null,
  success boolean not null,
  attempted_at timestamptz not null default now()
);
alter table public.login_attempts enable row level security;   -- no policies = no access for anon
revoke all on public.login_attempts from anon, authenticated;
create index if not exists idx_login_attempts_login_time
  on public.login_attempts (lower(login), attempted_at desc);

create or replace function public.app_login(p_login text, p_password text)
returns table(id bigint, name text, access text, team_name text, company_id text, email text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_login text := btrim(coalesce(p_login, ''));
  v_fails int;
  v_user public.users%rowtype;
begin
  if v_login = '' or coalesce(p_password, '') = '' then
    return;
  end if;

  -- 8 wrong passwords in 15 minutes locks that account name for 15 minutes
  select count(*) into v_fails
  from public.login_attempts a
  where lower(a.login) = lower(v_login)
    and not a.success
    and a.attempted_at > now() - interval '15 minutes';
  if v_fails >= 8 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  select * into v_user
  from public.users u
  where (u.company_id = v_login or u.name = v_login)
    and case
          when u.password ~ '^\$2[aby]\$' then u.password = extensions.crypt(p_password, u.password)
          else u.password = p_password
        end
  limit 1;

  insert into public.login_attempts (login, success) values (v_login, v_user.id is not null);

  -- keep the log small
  if random() < 0.02 then
    delete from public.login_attempts where attempted_at < now() - interval '30 days';
  end if;

  if v_user.id is null then
    return;
  end if;

  return query
    select v_user.id, v_user.name, lower(v_user.access), v_user.team_name, v_user.company_id, v_user.email;
end;
$$;

revoke all on function public.app_login(text, text) from public;
grant execute on function public.app_login(text, text) to anon, authenticated;

-- Check: should return 0 rows (and no error)
select * from public.app_login('__nobody__', 'x');
