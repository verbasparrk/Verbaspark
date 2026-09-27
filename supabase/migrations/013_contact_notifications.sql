-- Run once after 012_platform_extensions.sql. Deploy the application first.
-- Messages are saved even when the email provider is unavailable. Only the
-- account owner's published opt-in creates an outbox entry.
create table public.contact_notification_outbox (
 message_id uuid primary key references public.contact_messages(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 recipient text not null,
 slug text not null,
 state text not null default 'pending' check(state in ('pending','processing','sent','failed')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 lease_token uuid,
 lease_until timestamptz,
 sent_at timestamptz,
 last_error text,
 created_at timestamptz not null default now()
);
create index contact_notification_due on public.contact_notification_outbox(next_attempt_at)
 where state in ('pending','processing');
alter table public.contact_notification_outbox enable row level security;
revoke all on public.contact_notification_outbox from anon,authenticated;
grant select,insert,update on public.contact_notification_outbox to service_role;

create function public.platform_queue_contact_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare destination text; page_slug text;
begin
 select u.email,p.slug into destination,page_slug
 from public.published_pages p join auth.users u on u.id=p.owner_id
 where p.owner_id=new.owner_id and p.moderated_at is null
  and p.document->'profile'->>'emailNotifications'='true';
 if destination is not null and destination<>'' then
  insert into public.contact_notification_outbox(message_id,owner_id,recipient,slug)
  values(new.id,new.owner_id,destination,page_slug);
 end if;
 return new;
end $$;
create trigger platform_contact_notification after insert on public.contact_messages
for each row execute function public.platform_queue_contact_notification();
revoke all on function public.platform_queue_contact_notification() from public,anon,authenticated;

create function public.platform_claim_contact_notifications(target_message uuid default null,take_count integer default 10)
returns table(message_id uuid,recipient text,slug text,name text,email text,message text,answers jsonb,lease_token uuid)
language sql security definer set search_path='' as $$
 with due as (
  select o.message_id from public.contact_notification_outbox o
  where (target_message is null or o.message_id=target_message)
   and o.attempts<8
   and ((o.state='pending' and o.next_attempt_at<=now())
    or (o.state='processing' and o.lease_until<now()))
  order by o.next_attempt_at,o.created_at
  limit least(greatest(take_count,1),20) for update skip locked
 ), claimed as (
  update public.contact_notification_outbox o
  set state='processing',attempts=o.attempts+1,
   lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes'
  from due where o.message_id=due.message_id
  returning o.message_id,o.recipient,o.slug,o.lease_token
 )
 select c.message_id,c.recipient,c.slug,m.name,m.email,m.message,m.answers,c.lease_token
 from claimed c join public.contact_messages m on m.id=c.message_id
$$;
revoke all on function public.platform_claim_contact_notifications(uuid,integer) from public,anon,authenticated;
grant execute on function public.platform_claim_contact_notifications(uuid,integer) to service_role;

create function public.platform_finish_contact_notification(target_message uuid,token uuid,delivered boolean,error_text text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.contact_notification_outbox
 set state=case when delivered then 'sent' when attempts>=8 then 'failed' else 'pending' end,
  sent_at=case when delivered then now() else null end,
  next_attempt_at=case when delivered then next_attempt_at else now()+least(attempts*attempts*60,3600)*interval '1 second' end,
  lease_token=null,lease_until=null,last_error=case when delivered then null else left(coalesce(error_text,'Delivery failed'),500) end
 where message_id=target_message and lease_token=token and state='processing';
 return found;
end $$;
revoke all on function public.platform_finish_contact_notification(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.platform_finish_contact_notification(uuid,uuid,boolean,text) to service_role;
