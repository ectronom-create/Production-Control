-- ============================================================
-- Production Control Application — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- 2. PRODUCTION GROUPS
-- ============================================================
create table if not exists production_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into production_groups (name, code, description) values
  ('Group A', 'A', 'Production Group A'),
  ('Group B', 'B', 'Production Group B'),
  ('Group C', 'C', 'Production Group C'),
  ('Group D', 'D', 'Production Group D')
on conflict (code) do nothing;

-- ============================================================
-- 3. PRODUCTION LINES
-- ============================================================
create table if not exists production_lines (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into production_lines (name, code) values
  ('Single Phase', 'SINGLE'),
  ('Three Phase', 'THREE')
on conflict (code) do nothing;

-- ============================================================
-- 4. SHIFTS
-- ============================================================
create table if not exists shifts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  start_time time not null,
  end_time time not null,
  duration_hours integer not null default 12,
  is_active boolean not null default true
);

insert into shifts (name, code, start_time, end_time, duration_hours) values
  ('Morning', 'MORNING', '07:00:00', '19:00:00', 12),
  ('Evening', 'EVENING', '19:00:00', '07:00:00', 12)
on conflict (code) do nothing;

-- ============================================================
-- 5. PROFILES (extends auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'viewer' check (role in ('admin','supervisor','operator','viewer')),
  group_id uuid references production_groups(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile when user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ============================================================
-- 6. SHIFT ROTATIONS
-- ============================================================
create table if not exists shift_rotations (
  id uuid primary key default uuid_generate_v4(),
  rotation_day integer not null check (rotation_day >= 1),
  morning_group_id uuid not null references production_groups(id),
  evening_group_id uuid not null references production_groups(id),
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_shift_rotations_effective on shift_rotations(effective_from, is_active);

-- Seed initial rotation: 4-day cycle
-- Days 1-4: A(morning) + B(evening)
-- Days 5-8: C(morning) + D(evening)
-- Repeating 8-day cycle starting 2025-01-01
do $$
declare
  g_a uuid := (select id from production_groups where code = 'A');
  g_b uuid := (select id from production_groups where code = 'B');
  g_c uuid := (select id from production_groups where code = 'C');
  g_d uuid := (select id from production_groups where code = 'D');
begin
  insert into shift_rotations (rotation_day, morning_group_id, evening_group_id, effective_from, is_active) values
    (1, g_a, g_b, '2025-01-01', true),
    (2, g_a, g_b, '2025-01-01', true),
    (3, g_a, g_b, '2025-01-01', true),
    (4, g_a, g_b, '2025-01-01', true),
    (5, g_c, g_d, '2025-01-01', true),
    (6, g_c, g_d, '2025-01-01', true),
    (7, g_c, g_d, '2025-01-01', true),
    (8, g_c, g_d, '2025-01-01', true)
  on conflict do nothing;
end;
$$;

-- ============================================================
-- 7. DOWNTIME REASONS
-- ============================================================
create table if not exists downtime_reasons (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into downtime_reasons (name, code) values
  ('Machine Breakdown', 'MACHINE_BREAKDOWN'),
  ('Material Shortage', 'MATERIAL_SHORTAGE'),
  ('Quality', 'QUALITY'),
  ('Maintenance', 'MAINTENANCE'),
  ('No Operator', 'NO_OPERATOR'),
  ('Other', 'OTHER')
on conflict (code) do nothing;

-- ============================================================
-- 8. DOWNTIME RECORDS
-- ============================================================
create table if not exists downtime_records (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  production_line_id uuid not null references production_lines(id),
  group_id uuid not null references production_groups(id),
  shift_id uuid not null references shifts(id),
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null generated always as (
    case
      when end_time >= start_time
        then extract(epoch from (end_time - start_time))::integer / 60
      else extract(epoch from (end_time + interval '24 hours' - start_time))::integer / 60
    end
  ) stored,
  downtime_reason_id uuid not null references downtime_reasons(id),
  custom_reason text,
  description text,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_downtime_date on downtime_records(date);
create index if not exists idx_downtime_line on downtime_records(production_line_id);
create index if not exists idx_downtime_group on downtime_records(group_id);
create index if not exists idx_downtime_shift on downtime_records(shift_id);
create index if not exists idx_downtime_created_by on downtime_records(created_by);

create or replace trigger downtime_updated_at
  before update on downtime_records
  for each row execute function set_updated_at();

-- ============================================================
-- 9. DAILY PRODUCTION REPORTS
-- ============================================================
create table if not exists daily_production_reports (
  id uuid primary key default uuid_generate_v4(),
  report_date date not null,
  production_line_id uuid not null references production_lines(id),
  group_id uuid not null references production_groups(id),
  shift_id uuid not null references shifts(id),
  target_quantity integer not null default 0 check (target_quantity >= 0),
  actual_quantity integer not null default 0 check (actual_quantity >= 0),
  defect_quantity integer not null default 0 check (defect_quantity >= 0),
  good_quantity integer generated always as (actual_quantity - defect_quantity) stored,
  achievement_percentage numeric(5,2) generated always as (
    case when target_quantity = 0 then 0
    else round((actual_quantity::numeric / target_quantity::numeric * 100), 2)
    end
  ) stored,
  remarks text,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Prevent duplicate reports for same line/group/shift/date
  unique (report_date, production_line_id, group_id, shift_id)
);

create index if not exists idx_report_date on daily_production_reports(report_date);
create index if not exists idx_report_line on daily_production_reports(production_line_id);
create index if not exists idx_report_group on daily_production_reports(group_id);
create index if not exists idx_report_shift on daily_production_reports(shift_id);
create index if not exists idx_report_created_by on daily_production_reports(created_by);

create or replace trigger reports_updated_at
  before update on daily_production_reports
  for each row execute function set_updated_at();

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

-- Helper function: get current user role
create or replace function get_user_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

-- Helper function: get current user group_id
create or replace function get_user_group_id()
returns uuid language sql security definer stable as $$
  select group_id from profiles where id = auth.uid();
$$;

-- ---- profiles ----
alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select using (id = auth.uid());

create policy "Admins can view all profiles"
  on profiles for select using (get_user_role() = 'admin');

create policy "Admins can update any profile"
  on profiles for update using (get_user_role() = 'admin');

create policy "Users can update their own profile (limited)"
  on profiles for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "System can insert profiles"
  on profiles for insert with check (true);

-- ---- production_groups ----
alter table production_groups enable row level security;

create policy "Anyone authenticated can view groups"
  on production_groups for select using (auth.uid() is not null);

create policy "Admins can manage groups"
  on production_groups for all using (get_user_role() = 'admin');

-- ---- production_lines ----
alter table production_lines enable row level security;

create policy "Anyone authenticated can view lines"
  on production_lines for select using (auth.uid() is not null);

create policy "Admins can manage lines"
  on production_lines for all using (get_user_role() = 'admin');

-- ---- shifts ----
alter table shifts enable row level security;

create policy "Anyone authenticated can view shifts"
  on shifts for select using (auth.uid() is not null);

create policy "Admins can manage shifts"
  on shifts for all using (get_user_role() = 'admin');

-- ---- shift_rotations ----
alter table shift_rotations enable row level security;

create policy "Anyone authenticated can view rotations"
  on shift_rotations for select using (auth.uid() is not null);

create policy "Admins can manage rotations"
  on shift_rotations for all using (get_user_role() = 'admin');

-- ---- downtime_reasons ----
alter table downtime_reasons enable row level security;

create policy "Anyone authenticated can view reasons"
  on downtime_reasons for select using (auth.uid() is not null);

create policy "Admins can manage reasons"
  on downtime_reasons for all using (get_user_role() = 'admin');

-- ---- downtime_records ----
alter table downtime_records enable row level security;

create policy "Authenticated users can view downtime records"
  on downtime_records for select using (auth.uid() is not null);

create policy "Supervisors and operators can insert downtime"
  on downtime_records for insert
  with check (
    auth.uid() is not null and
    get_user_role() in ('admin', 'supervisor', 'operator')
  );

create policy "Admins can update any downtime"
  on downtime_records for update
  using (get_user_role() = 'admin');

create policy "Supervisors can update their own downtime"
  on downtime_records for update
  using (
    get_user_role() = 'supervisor' and
    created_by = auth.uid()
  );

create policy "Admins can delete any downtime"
  on downtime_records for delete
  using (get_user_role() = 'admin');

create policy "Supervisors can delete their own downtime"
  on downtime_records for delete
  using (
    get_user_role() = 'supervisor' and
    created_by = auth.uid()
  );

-- ---- daily_production_reports ----
alter table daily_production_reports enable row level security;

create policy "Authenticated users can view reports"
  on daily_production_reports for select using (auth.uid() is not null);

create policy "Supervisors and operators can insert reports"
  on daily_production_reports for insert
  with check (
    auth.uid() is not null and
    get_user_role() in ('admin', 'supervisor', 'operator')
  );

create policy "Admins can update any report"
  on daily_production_reports for update
  using (get_user_role() = 'admin');

create policy "Supervisors can update their own reports"
  on daily_production_reports for update
  using (
    get_user_role() = 'supervisor' and
    created_by = auth.uid()
  );

create policy "Admins can delete any report"
  on daily_production_reports for delete
  using (get_user_role() = 'admin');

create policy "Supervisors can delete their own reports"
  on daily_production_reports for delete
  using (
    get_user_role() = 'supervisor' and
    created_by = auth.uid()
  );

-- ============================================================
-- END OF SCHEMA
-- ============================================================
