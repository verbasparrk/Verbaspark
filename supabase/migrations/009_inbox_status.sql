-- Run after 008_contact_fields.sql.
alter table public.contact_messages add column status text not null default 'new'
  check (status in ('new','read','closed'));
create policy "Owner updates message status" on public.contact_messages
  for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
grant update(status) on public.contact_messages to authenticated;
create index contact_messages_owner_status_date on public.contact_messages(owner_id,status,created_at desc);
