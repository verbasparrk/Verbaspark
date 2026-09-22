-- Run once after 005. Only server functions holding service_role can accept public submissions.
create table public.contact_messages(
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 100), email text not null check(length(email) between 3 and 254),
 message text not null check(length(message) between 1 and 5000), created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy "Owner inbox" on public.contact_messages for select to authenticated using(owner_id=auth.uid());
create policy "Owner deletes messages" on public.contact_messages for delete to authenticated using(owner_id=auth.uid());
grant select,delete on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
create index contact_messages_owner_date on public.contact_messages(owner_id,created_at desc);

create table public.profile_metrics(owner_id uuid not null references auth.users(id) on delete cascade,day date not null,event text not null check(event in ('view','click')),card text not null default '',total bigint not null default 0,primary key(owner_id,day,event,card));
alter table public.profile_metrics enable row level security;
create policy "Owner metrics" on public.profile_metrics for select to authenticated using(owner_id=auth.uid());
grant select on public.profile_metrics to authenticated;
grant all on public.profile_metrics to service_role;

create table public.platform_limits(key text primary key,total integer not null,expires_at timestamptz not null);
alter table public.platform_limits enable row level security;
grant all on public.platform_limits to service_role;
create function public.platform_take_limit(limit_key text,maximum integer,seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare amount integer;
begin
 delete from public.platform_limits where expires_at<now();
 insert into public.platform_limits(key,total,expires_at) values(limit_key,1,now()+make_interval(secs=>seconds))
 on conflict(key) do update set total=public.platform_limits.total+1 returning total into amount;
 return amount<=maximum;
end $$;
revoke all on function public.platform_take_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.platform_take_limit(text,integer,integer) to service_role;
create function public.record_profile_metric(profile_owner uuid,kind text,card_key text) returns void language sql security definer set search_path='' as $$
 insert into public.profile_metrics(owner_id,day,event,card,total) values(profile_owner,current_date,kind,card_key,1)
 on conflict(owner_id,day,event,card) do update set total=public.profile_metrics.total+1;
$$;
revoke all on function public.record_profile_metric(uuid,text,text) from public,anon,authenticated;
grant execute on function public.record_profile_metric(uuid,text,text) to service_role;

