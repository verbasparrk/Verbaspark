-- Run after 009_inbox_status.sql. The first administrator is assigned separately.
create table public.platform_accounts(
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 created_at timestamptz not null
);
alter table public.platform_accounts enable row level security;
revoke all on public.platform_accounts from anon, authenticated;
grant select on public.platform_accounts to service_role;

insert into public.platform_accounts(id,email,created_at)
select id,coalesce(email,''),created_at from auth.users
on conflict(id) do update set email=excluded.email;

create function public.platform_sync_account() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.platform_accounts(id,email,created_at)
 values(new.id,coalesce(new.email,''),new.created_at)
 on conflict(id) do update set email=excluded.email;
 return new;
end $$;
create trigger platform_account_sync after insert or update of email on auth.users
for each row execute function public.platform_sync_account();
revoke all on function public.platform_sync_account() from public,anon,authenticated;

create table public.platform_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to service_role;

create table public.platform_restrictions(
 owner_id uuid primary key references auth.users(id) on delete cascade,
 reason text not null check(length(reason) between 5 and 500),
 created_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null
);
alter table public.platform_restrictions enable row level security;
create policy "Owners see their restriction" on public.platform_restrictions
 for select to authenticated using(owner_id=auth.uid());
revoke all on public.platform_restrictions from anon, authenticated;
grant select(owner_id,reason,created_at) on public.platform_restrictions to authenticated;
grant select on public.platform_restrictions to service_role;

create table public.platform_audit(
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 owner_id uuid references auth.users(id) on delete set null,
 target_email text not null,
 slug text,
 action text not null check(action in ('hide','restore')),
 reason text not null check(length(reason) between 5 and 500),
 created_at timestamptz not null default now()
);
create index platform_audit_date on public.platform_audit(created_at desc);
alter table public.platform_audit enable row level security;
revoke all on public.platform_audit from anon, authenticated;
grant select on public.platform_audit to service_role;

alter table public.published_pages
 add column moderated_at timestamptz,
 add column moderation_reason text;
drop policy "Published pages are readable" on public.published_pages;
create policy "Visible pages and owner copy" on public.published_pages
 for select to anon, authenticated
 using(moderated_at is null or owner_id=auth.uid());

create function public.platform_guard_publication() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.platform_restrictions where owner_id=new.owner_id) then
  if tg_op='INSERT' then raise exception 'Publication restricted by Verbaspark'; end if;
  if new.slug is distinct from old.slug or new.document is distinct from old.document
  then raise exception 'Publication restricted by Verbaspark'; end if;
 end if;
 return new;
end $$;
create trigger platform_publication_guard before insert or update on public.published_pages
for each row execute function public.platform_guard_publication();
revoke all on function public.platform_guard_publication() from public,anon,authenticated;

create function public.platform_admin_list(search_text text,filter_status text,skip_rows integer,take_rows integer)
returns table(id uuid,email text,created_at timestamptz,page_name text,slug text,published_at timestamptz,moderated_at timestamptz,restriction_reason text,matching_count bigint)
language sql stable security definer set search_path='' as $$
 with matches as (
  select a.id,a.email,a.created_at,p.document->>'name' as page_name,p.slug,p.published_at,p.moderated_at,r.reason as restriction_reason
  from public.platform_accounts a
  left join public.published_pages p on p.owner_id=a.id
  left join public.platform_restrictions r on r.owner_id=a.id
  where (nullif(trim(search_text),'') is null
    or a.email ilike '%'||search_text||'%'
    or p.slug ilike '%'||search_text||'%'
    or p.document->>'name' ilike '%'||search_text||'%')
   and (filter_status='all'
    or (filter_status='live' and p.owner_id is not null and r.owner_id is null)
    or (filter_status='hidden' and r.owner_id is not null)
    or (filter_status='draft' and p.owner_id is null and r.owner_id is null))
 )
 select matches.*,count(*) over() from matches
 order by matches.created_at desc,matches.id
 limit least(greatest(take_rows,1),50) offset greatest(skip_rows,0)
$$;
revoke all on function public.platform_admin_list(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.platform_admin_list(text,text,integer,integer) to service_role;

create function public.platform_admin_summary() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'accounts',(select count(*) from public.platform_accounts),
  'live',(select count(*) from public.published_pages where moderated_at is null),
  'hidden',(select count(*) from public.platform_restrictions),
  'views30d',(select coalesce(sum(total),0) from public.profile_metrics where event='view' and day>=current_date-29),
  'clicks30d',(select coalesce(sum(total),0) from public.profile_metrics where event='click' and day>=current_date-29)
 )
$$;
revoke all on function public.platform_admin_summary() from public,anon,authenticated;
grant execute on function public.platform_admin_summary() to service_role;

create function public.platform_set_moderation(target_owner uuid,make_hidden boolean,note text,acting_admin uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target_email text; target_slug text;
begin
 if not exists(select 1 from public.platform_admins where user_id=acting_admin)
 then raise exception 'Administrator access required'; end if;
 if note is null or length(trim(note)) not between 5 and 500
 then raise exception 'Give a reason between 5 and 500 characters'; end if;
 select email into target_email from public.platform_accounts where id=target_owner;
 if target_email is null then raise exception 'Account not found'; end if;
 select slug into target_slug from public.published_pages where owner_id=target_owner;
 if make_hidden then
  if exists(select 1 from public.platform_restrictions where owner_id=target_owner)
  then raise exception 'Account already restricted'; end if;
  insert into public.platform_restrictions(owner_id,reason,created_by)
  values(target_owner,trim(note),acting_admin);
  update public.published_pages set moderated_at=now(),moderation_reason=trim(note) where owner_id=target_owner;
 else
  if not exists(select 1 from public.platform_restrictions where owner_id=target_owner)
  then raise exception 'Account is not restricted'; end if;
  delete from public.platform_restrictions where owner_id=target_owner;
  update public.published_pages set moderated_at=null,moderation_reason=null where owner_id=target_owner;
 end if;
 insert into public.platform_audit(actor_id,owner_id,target_email,slug,action,reason)
 values(acting_admin,target_owner,target_email,target_slug,case when make_hidden then 'hide' else 'restore' end,trim(note));
end $$;
revoke all on function public.platform_set_moderation(uuid,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.platform_set_moderation(uuid,boolean,text,uuid) to service_role;
