-- Photos, community ratings and reviews.
-- Apply with: supabase db push, the Supabase SQL editor, or the MCP apply_migration tool.

alter table public.camps
  add column if not exists photos text[] not null default '{}',
  add column if not exists rating numeric(2, 1) check (rating between 1 and 5),
  add column if not exists review_count int not null default 0;

-- Community snapshots + (future) user-submitted reviews.
create table if not exists public.camp_reviews (
  id uuid primary key default gen_random_uuid(),
  camp_slug text not null references public.camps (slug) on delete cascade,
  author text not null,             -- persona label, never a real name
  role text not null default 'parent'
    check (role in ('parent', 'camper', 'alum', 'counselor')),
  rating int not null check (rating between 1 and 5),
  text text not null,
  source text not null default 'compiled'
    check (source in ('compiled', 'campmatch')), -- compiled = distilled from public web sentiment
  year int,
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.camp_reviews enable row level security;

create policy "reviews are readable by everyone"
  on public.camp_reviews for select using (true);

-- Logged-in users may submit their own (source = 'campmatch') reviews.
create policy "users submit their own reviews"
  on public.camp_reviews for insert
  with check (auth.uid() = user_id and source = 'campmatch');

create index if not exists camp_reviews_slug_idx on public.camp_reviews (camp_slug);
