-- CampMatch initial schema.
-- Apply with: supabase db push, the Supabase SQL editor, or the MCP apply_migration tool.

create table if not exists public.camps (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type text not null check (type in ('sleepaway', 'day')),
  city text not null,
  state text not null,
  region text not null,
  lat double precision,
  lng double precision,
  age_min int not null,
  age_max int not null,
  gender text not null check (gender in ('coed', 'boys', 'girls', 'brother-sister')),
  session_weeks numeric[] not null default '{}',
  tuition_min int,
  tuition_max int,
  size int,
  founded int,
  interests text[] not null default '{}',
  vibe int check (vibe between 1 and 5),
  competitiveness int check (competitiveness between 1 and 5),
  structure int check (structure between 1 and 5),
  religious text not null default 'none',
  supports text[] not null default '{}',
  first_time_friendly boolean not null default true,
  aca_accredited boolean not null default false,
  description text,
  website text,
  claimed boolean not null default false,
  verified boolean not null default false,
  claimed_by uuid references auth.users (id),
  source text not null default 'seed', -- seed | scraper | camp-submitted
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A camp operator requesting ownership of an existing listing.
create table if not exists public.camp_claims (
  id uuid primary key default gen_random_uuid(),
  camp_slug text not null,
  camp_name text not null,
  user_id uuid not null references auth.users (id),
  contact_email text not null,
  role_at_camp text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- A camp operator submitting a brand-new listing.
create table if not exists public.camp_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  city text not null,
  state text not null,
  website text,
  description text,
  user_id uuid not null references auth.users (id),
  contact_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- Saved quiz results (optional, for logged-in parents later).
create table if not exists public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  answers jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.camps enable row level security;
alter table public.camp_claims enable row level security;
alter table public.camp_submissions enable row level security;
alter table public.quiz_results enable row level security;

-- Camps are public to read; only the verified owner may update their listing.
create policy "camps are readable by everyone"
  on public.camps for select using (true);

create policy "owners update their camp"
  on public.camps for update
  using (auth.uid() = claimed_by)
  with check (auth.uid() = claimed_by);

-- Claims/submissions: users create and see their own.
create policy "users create their own claims"
  on public.camp_claims for insert
  with check (auth.uid() = user_id);

create policy "users read their own claims"
  on public.camp_claims for select using (auth.uid() = user_id);

create policy "users create their own submissions"
  on public.camp_submissions for insert
  with check (auth.uid() = user_id);

create policy "users read their own submissions"
  on public.camp_submissions for select using (auth.uid() = user_id);

create policy "users store their own quiz results"
  on public.quiz_results for insert
  with check (auth.uid() = user_id or user_id is null);

create index if not exists camps_type_idx on public.camps (type);
create index if not exists camps_state_idx on public.camps (state);
create index if not exists camp_claims_status_idx on public.camp_claims (status);
