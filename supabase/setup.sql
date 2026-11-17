-- Run this once in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  location text not null,
  address text,
  image_url text,
  date_label text not null,
  status text not null check (status in ('Lost', 'Found')),
  description text not null,
  owner_name text not null,
  email text not null,
  phone text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

alter table public.items add column if not exists found_reported_at timestamptz;

alter table public.items enable row level security;
grant select, insert on public.items to anon, authenticated;
grant update, delete on public.items to authenticated;

drop policy if exists "Anyone can browse reports" on public.items;
create policy "Anyone can browse reports" on public.items for select to anon, authenticated using (true);
drop policy if exists "Anyone can publish a report" on public.items;
create policy "Anyone can publish a report" on public.items for insert to anon, authenticated with check (
  char_length(name) between 1 and 80 and
  char_length(description) between 1 and 500 and
  char_length(owner_name) between 1 and 80 and
  char_length(email) between 3 and 254 and
  char_length(phone) between 3 and 40
);

drop policy if exists "Admins can update reports" on public.items;
create policy "Admins can update reports" on public.items for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "Admins can delete reports" on public.items;
create policy "Admins can delete reports" on public.items for delete to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.report_item_found(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.items
  set found_reported_at = coalesce(found_reported_at, pg_catalog.now())
  where id = p_item_id and status = 'Lost';
  return found;
end;
$$;
revoke all on function public.report_item_found(uuid) from public;
grant execute on function public.report_item_found(uuid) to anon, authenticated;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Community member',
  message text not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
grant select, insert on public.feedback to anon, authenticated;
grant delete on public.feedback to authenticated;
drop policy if exists "Anyone can read feedback" on public.feedback;
create policy "Anyone can read feedback" on public.feedback for select to anon, authenticated using (true);
drop policy if exists "Anyone can submit feedback" on public.feedback;
create policy "Anyone can submit feedback" on public.feedback for insert to anon, authenticated with check (
  char_length(name) between 1 and 80 and char_length(message) between 1 and 600
);
drop policy if exists "Admins can delete feedback" on public.feedback;
create policy "Admins can delete feedback" on public.feedback for delete to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Anyone can view item photos" on storage.objects;
create policy "Anyone can view item photos" on storage.objects for select to anon, authenticated using (bucket_id = 'item-images');
drop policy if exists "Anyone can upload item photos" on storage.objects;
create policy "Anyone can upload item photos" on storage.objects for insert to anon, authenticated with check (bucket_id = 'item-images');
drop policy if exists "Anyone can replace item photos" on storage.objects;
create policy "Anyone can replace item photos" on storage.objects for update to anon, authenticated using (bucket_id = 'item-images') with check (bucket_id = 'item-images');
