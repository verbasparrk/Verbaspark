alter table public.drafts add column revision bigint not null default 1;
alter table public.drafts add column last_save_id uuid;

-- Optimistic concurrency: another device can never be silently overwritten.
create function public.save_draft(draft_document jsonb, expected_revision bigint, request_id uuid, expected_owner uuid)
returns bigint language plpgsql security definer set search_path='' as $$
declare existing public.drafts; next_revision bigint;
begin
 if auth.uid() is null or auth.uid() is distinct from expected_owner then raise exception 'Account changed'; end if;
 if request_id is null then raise exception 'Missing request ID'; end if;
 -- Serialize first inserts too, not just updates of an existing row.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into existing from public.drafts where owner_id=auth.uid() for update;
 if found then
  if existing.last_save_id=request_id then return existing.revision; end if;
  if expected_revision is distinct from existing.revision then raise exception 'DRAFT_CONFLICT' using errcode='VS409'; end if;
  next_revision:=existing.revision+1;
  update public.drafts set document=draft_document,revision=next_revision,last_save_id=request_id,updated_at=now() where owner_id=auth.uid();
 else
  if expected_revision is not null then raise exception 'DRAFT_CONFLICT' using errcode='VS409'; end if;
  next_revision:=1;
  insert into public.drafts(owner_id,document,revision,last_save_id) values(auth.uid(),draft_document,next_revision,request_id);
 end if;
 return next_revision;
end $$;
revoke all on function public.save_draft(jsonb,bigint,uuid,uuid) from public;
grant execute on function public.save_draft(jsonb,bigint,uuid,uuid) to authenticated;
revoke insert,update on public.drafts from authenticated;

drop function public.publish_page(text);
create function public.publish_page(requested_slug text,expected_revision bigint,expected_owner uuid)
returns text language plpgsql security definer set search_path='' as $$
declare saved public.drafts;
begin
 if auth.uid() is null or auth.uid() is distinct from expected_owner then raise exception 'Account changed'; end if;
 select * into saved from public.drafts where owner_id=auth.uid() for update;
 if not found or saved.revision is distinct from expected_revision then raise exception 'DRAFT_CONFLICT' using errcode='VS409'; end if;
 insert into public.published_pages(owner_id,slug,document) values(auth.uid(),requested_slug,saved.document)
 on conflict(owner_id) do update set slug=excluded.slug,document=excluded.document,published_at=now();
 return requested_slug;
end $$;
revoke all on function public.publish_page(text,bigint,uuid) from public;
grant execute on function public.publish_page(text,bigint,uuid) to authenticated;
