-- Run once after 011_account_deletion.sql. Deploy the application before enabling these features.
create table public.profile_reports (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 slug text not null,
 reason text not null check (reason in ('spam','impersonation','harassment','unsafe','other')),
 details text not null default '' check (length(details) <= 2000),
 reporter_hash text not null,
 status text not null default 'open' check (status in ('open','reviewed','dismissed')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null
);
create index profile_reports_queue on public.profile_reports(status,created_at desc);
alter table public.profile_reports enable row level security;
revoke all on public.profile_reports from anon,authenticated;
grant select,insert,update on public.profile_reports to service_role;

create table public.profile_domains (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 hostname text unique not null check (length(hostname) between 4 and 253 and hostname = lower(hostname)),
 claim_token uuid not null default gen_random_uuid(),
 status text not null default 'pending' check (status in ('pending','active')),
 created_at timestamptz not null default now(),
 verified_at timestamptz
);
create index profile_domains_active on public.profile_domains(hostname) where status='active';
alter table public.profile_domains enable row level security;
create policy "Owners see their domain" on public.profile_domains for select to authenticated using(owner_id=auth.uid());
grant select on public.profile_domains to authenticated;
grant select,insert,update,delete on public.profile_domains to service_role;

-- Storage metadata contains uploaded object size. The fallback reserves the bucket's
-- maximum file size while Storage is still writing metadata. This errs on the safe side.
create function public.platform_storage_under_quota(profile_owner uuid, incoming jsonb, bucket text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare used_bytes bigint;
begin
 if profile_owner is distinct from auth.uid() then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(profile_owner::text,0));
 select coalesce(sum(case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end),0)
 into used_bytes from storage.objects o
 where o.bucket_id in ('page-images','page-files') and o.name like profile_owner::text||'/%';
 return used_bytes + case when incoming->>'size' ~ '^[0-9]+$' then (incoming->>'size')::bigint
  when bucket='page-images' then 5000000 else 20971520 end <= 209715200;
end
$$;
revoke all on function public.platform_storage_under_quota(uuid,jsonb,text) from public,anon;
grant execute on function public.platform_storage_under_quota(uuid,jsonb,text) to authenticated;
drop policy "Owners upload images" on storage.objects;
create policy "Owners upload images" on storage.objects for insert to authenticated
 with check(bucket_id='page-images' and (storage.foldername(name))[1]=auth.uid()::text
  and public.platform_storage_under_quota(auth.uid(),metadata,bucket_id));
drop policy "Owners upload files" on storage.objects;
create policy "Owners upload files" on storage.objects for insert to authenticated
 with check(bucket_id='page-files' and (storage.foldername(name))[1]=auth.uid()::text
  and public.platform_storage_under_quota(auth.uid(),metadata,bucket_id));

create function public.platform_extensions_ready() returns boolean
 language sql stable security definer set search_path='' as $$ select true $$;
revoke all on function public.platform_extensions_ready() from public,anon,authenticated;
grant execute on function public.platform_extensions_ready() to service_role;
