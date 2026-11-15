-- Each signed-in user's anime list: watchlist, favorites and where they stopped.
-- One row per user per anime. Title and poster are copied in so the
-- dashboard never has to look them up again.
create table if not exists public.library (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mal_id integer not null,
  title text not null,
  image_url text,
  in_watchlist boolean not null default false,
  favorite boolean not null default false,
  last_episode integer,
  position_seconds integer not null default 0,
  duration_seconds integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, mal_id)
);

-- "continue watching" lists a user's most recent rows first
create index if not exists library_user_updated_idx
  on public.library (user_id, updated_at desc);

alter table public.library enable row level security;

-- (select auth.uid()) is evaluated once per query instead of once per row
drop policy if exists "library: read own rows" on public.library;
create policy "library: read own rows" on public.library
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "library: add own rows" on public.library;
create policy "library: add own rows" on public.library
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "library: change own rows" on public.library;
create policy "library: change own rows" on public.library
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "library: remove own rows" on public.library;
create policy "library: remove own rows" on public.library
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.library to authenticated;
