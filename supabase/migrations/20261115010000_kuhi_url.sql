-- The kuhi API runs behind a Cloudflare quick tunnel whose address changes on
-- every restart. The start script on the kuhi machine publishes the current
-- address here, and the site reads it at runtime, so no redeploy is needed.

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- anyone may read; nobody may write directly
drop policy if exists "app_config is readable" on public.app_config;
create policy "app_config is readable"
  on public.app_config for select
  to anon, authenticated
  using (true);

grant select on public.app_config to anon, authenticated;

-- the only way to change the address: the caller must know the secret kept
-- on the kuhi machine (only its SHA-256 hash is stored here)
create or replace function public.set_kuhi_url(secret text, url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if encode(sha256(convert_to(secret, 'UTF8')), 'hex')
     <> 'a7564900eec683a56819552545d03411edc2b4b51d90d329d88365a6440ac4b1' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if url !~ '^https://[a-z0-9.-]+$' then
    raise exception 'bad url' using errcode = '22023';
  end if;
  insert into public.app_config (key, value, updated_at)
  values ('kuhi_api_url', url, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

revoke all on function public.set_kuhi_url(text, text) from public;
grant execute on function public.set_kuhi_url(text, text) to anon, authenticated;
