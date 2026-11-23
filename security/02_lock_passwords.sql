-- ==============================================================================
-- SECURITY STEP B — run ONLY AFTER the new app version is live on Vercel
-- (the old version reads the password column in the browser and would stop
-- working the moment this runs).
-- ==============================================================================

-- 1) Hash every existing plain-text password (bcrypt)
update public.users
set password = extensions.crypt(password, extensions.gen_salt('bf'))
where password is not null and password !~ '^\$2[aby]\$';

-- 2) Any new / changed password is hashed automatically
create or replace function public.hash_user_password() returns trigger
language plpgsql
security definer                       -- runs as owner: works for the anon role too
set search_path = public, extensions
as $$
begin
  if new.password is not null and new.password !~ '^\$2[aby]\$' then
    new.password := extensions.crypt(new.password, extensions.gen_salt('bf'));
  end if;
  return new;
end;
$$;
revoke all on function public.hash_user_password() from public, anon, authenticated;

drop trigger if exists trg_hash_user_password on public.users;
create trigger trg_hash_user_password
  before insert or update of password on public.users
  for each row execute function public.hash_user_password();

-- 3) The browser can no longer read the password column
revoke select on public.users from anon, authenticated;
grant select (id, name, company_id, email, phone, access, team_name, created_at, updated_at)
  on public.users to anon, authenticated;

-- 4) Make sure users is not broadcast over Realtime (no error if it isn't)
do $$
begin
  if exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'users') then
    alter publication supabase_realtime drop table public.users;
  end if;
end $$;

-- Check: every password hashed (expect 0)
select count(*) as plain_text_passwords_left
from public.users
where password is not null and password !~ '^\$2[aby]\$';
