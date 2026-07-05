-- Applications submitted through Camp Matching + life-at-camp detail columns.
-- Apply with: supabase db push, the Supabase SQL editor, or the MCP apply_migration tool.

-- ── Family applications, forwarded to camps by Camp Matching ops ──────
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  camp_slug text not null,
  camp_name text not null,
  parent_name text not null,
  email text not null,
  phone text,
  child_name text not null,
  child_age int,
  session_preference text,
  notes text,
  -- questionnaire snapshot the family chose to attach (no financials collected)
  profile jsonb,
  status text not null default 'received'
    check (status in ('received', 'forwarded', 'camp-replied', 'closed')),
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.applications enable row level security;

-- Families (including anonymous visitors) submit applications.
create policy "anyone can submit an application"
  on public.applications for insert
  with check (auth.uid() = user_id or user_id is null);

-- Logged-in users see their own; admins see and manage everything.
create policy "users read their own applications"
  on public.applications for select using (auth.uid() = user_id);

create policy "admins read all applications"
  on public.applications for select using (public.is_admin());

create policy "admins manage applications"
  on public.applications for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists applications_camp_slug_idx on public.applications (camp_slug);
create index if not exists applications_status_idx on public.applications (status);

-- ── Life-at-camp details (all nullable: null = not compiled yet) ──────
alter table public.camps
  add column if not exists culture int check (culture between 1 and 5),
  add column if not exists activities text[],
  add column if not exists lake_on_site boolean,
  add column if not exists ac_in_bunks boolean,
  add column if not exists bunk_size int,
  add column if not exists laundry_service boolean,
  add column if not exists uniform_required boolean,
  add column if not exists doctor_on_site boolean,
  add column if not exists visiting_days_per_session int,
  add column if not exists phone_calls_per_session int,
  add column if not exists session_model text
    check (session_model in ('full-summer', 'sessions', 'flexible')),
  add column if not exists trips_per_session int,
  add column if not exists traditions text[],
  add column if not exists ownership text
    check (ownership in ('family', 'nonprofit', 'agency')),
  add column if not exists last_renovated int,
  add column if not exists bus_service boolean,
  add column if not exists bus_cities text[],
  add column if not exists trunk_pickup boolean,
  add column if not exists trunk_pickup_areas text[],
  add column if not exists rookie_day jsonb;
