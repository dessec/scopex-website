-- Additive scanner-only schema. Existing ScopeX tables are untouched.
create table public.scopex_scan_limits (
  bucket text primary key check (length(bucket) between 1 and 100),
  window_start timestamptz not null,
  used integer not null check (used >= 0)
);
create index scopex_scan_limits_window_idx on public.scopex_scan_limits(window_start);
alter table public.scopex_scan_limits enable row level security;
create policy scopex_scanner_service_only on public.scopex_scan_limits for all to service_role using (true) with check (true);
revoke all on public.scopex_scan_limits from public, anon, authenticated;
grant select, insert, update, delete on public.scopex_scan_limits to service_role;

create function public.scopex_take_scan_slot(p_bucket text, p_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare count_used integer;
begin
  if p_limit < 1 or p_limit > 120 or p_bucket is null or length(p_bucket) not between 1 and 100 then
    raise exception 'Invalid rate limit parameters';
  end if;
  delete from public.scopex_scan_limits where window_start < pg_catalog.now() - interval '2 minutes';
  insert into public.scopex_scan_limits as limits (bucket,window_start,used)
    values(p_bucket,pg_catalog.date_trunc('minute',pg_catalog.now()),1)
    on conflict (bucket) do update
      set window_start=excluded.window_start,
          used=case when limits.window_start < excluded.window_start then 1 else limits.used+1 end
      where limits.window_start < excluded.window_start or limits.used < p_limit
    returning used into count_used;
  return count_used is not null;
end;
$$;
revoke all on function public.scopex_take_scan_slot(text,integer) from public,anon,authenticated;
grant execute on function public.scopex_take_scan_slot(text,integer) to service_role;
comment on table public.scopex_scan_limits is 'Scanner throttle only; HMAC IP buckets, no raw IP, website URLs, reports or enquiries. Old counters removed on subsequent scanner requests.';
