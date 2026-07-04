-- Admin roles for the /admin dashboard.
-- Grant someone admin access by inserting their auth user id:
--   insert into public.admins (user_id) values ('<auth.users.id>');
-- (via the Supabase SQL editor or service role — there is no self-serve path.)

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Users may only check whether they themselves are an admin.
create policy "users read their own admin row"
  on public.admins for select using (auth.uid() = user_id);

-- security definer so policies on other tables can consult the admins table
-- without granting direct read access to it.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Admins see every submitted form.
create policy "admins read all claims"
  on public.camp_claims for select using (public.is_admin());

create policy "admins moderate claims"
  on public.camp_claims for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins read all submissions"
  on public.camp_submissions for select using (public.is_admin());

create policy "admins moderate submissions"
  on public.camp_submissions for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins read all quiz results"
  on public.quiz_results for select using (public.is_admin());

-- Admins manage the camp directory.
create policy "admins insert camps"
  on public.camps for insert with check (public.is_admin());

create policy "admins update camps"
  on public.camps for update
  using (public.is_admin())
  with check (public.is_admin());
