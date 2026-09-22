-- Verbaspark: initial setup for a new Supabase project.
-- Run once in SQL Editor. Existing projects apply only missing migrations.
BEGIN;

-- 001_accounts.sql
-- Run once in the Supabase SQL editor.
create table public.drafts (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) < 10000000),
 updated_at timestamptz not null default now()
);
alter table public.drafts enable row level security;
create policy "Owners manage their draft" on public.drafts for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create table public.published_pages (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
 document jsonb not null,
 published_at timestamptz not null default now()
);
alter table public.published_pages enable row level security;
create policy "Published pages are readable" on public.published_pages for select to anon, authenticated using (true);
create policy "Owners can unpublish" on public.published_pages for delete to authenticated using (owner_id = auth.uid());
grant select, insert, update, delete on public.drafts to authenticated;
grant select on public.published_pages to anon, authenticated;
grant delete on public.published_pages to authenticated;
revoke insert, update on public.published_pages from anon, authenticated;
create function public.publish_page(requested_slug text) returns text language plpgsql security definer set search_path = '' as $$
declare snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select document into snapshot from public.drafts where owner_id = auth.uid();
 if snapshot is null then raise exception 'Save a draft first'; end if;
 insert into public.published_pages(owner_id,slug,document) values(auth.uid(),requested_slug,snapshot)
 on conflict(owner_id) do update set slug=excluded.slug,document=excluded.document,published_at=now();
 return requested_slug;
end $$;
revoke all on function public.publish_page(text) from public;
grant execute on function public.publish_page(text) to authenticated;

-- Private draft images. Public access is allowed only while referenced by a published snapshot.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('page-images','page-images',false,5000000,array['image/webp','image/png','image/jpeg']);
create policy "Owners upload images" on storage.objects for insert to authenticated with check(bucket_id='page-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Owners read their images" on storage.objects for select to authenticated using(bucket_id='page-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Published image access" on storage.objects for select to anon, authenticated using (
 bucket_id='page-images' and exists (select 1 from public.published_pages p where p.owner_id::text=(storage.foldername(name))[1] and p.document->'cards' @> jsonb_build_array(jsonb_build_object('imagePath',name)))
);


-- 002_gallery_images.sql
-- Run after 001_accounts.sql, including on already configured projects.
drop policy "Published image access" on storage.objects;
create policy "Published image access" on storage.objects for select to anon, authenticated using (
 bucket_id='page-images' and exists (
  select 1 from public.published_pages p
  where p.owner_id::text=(storage.foldername(name))[1]
  and (p.document->'cards' @> jsonb_build_array(jsonb_build_object('imagePath',name))
   or exists(select 1 from jsonb_array_elements(p.document->'cards') c
      where c->'images' @> jsonb_build_array(jsonb_build_object('imagePath',name))))
 )
);


-- 003_autosave.sql
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


-- 004_page_files.sql
-- Documents and audio stay private until referenced by a published page.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('page-files','page-files',false,20971520,array[
 'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain',
 'audio/mpeg','audio/wav','audio/ogg','audio/mp4']);

create policy "Owners upload files" on storage.objects for insert to authenticated
with check(bucket_id='page-files' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Owners read files" on storage.objects for select to authenticated
using(bucket_id='page-files' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Published file access" on storage.objects for select to anon, authenticated
using(bucket_id='page-files' and exists (
 select 1 from public.published_pages p
 where p.owner_id::text=(storage.foldername(name))[1]
 and exists(select 1 from jsonb_array_elements(p.document->'cards') c where c->'file'->>'path'=name)
));


-- 005_hidden_blocks.sql
-- Hidden blocks must be absent from the public JSON, not just visually hidden.
create or replace function public.publish_page(requested_slug text,expected_revision bigint,expected_owner uuid)
returns text language plpgsql security definer set search_path='' as $$
declare saved public.drafts; snapshot jsonb;
begin
 if auth.uid() is null or auth.uid() is distinct from expected_owner then raise exception 'Account changed'; end if;
 select * into saved from public.drafts where owner_id=auth.uid() for update;
 if not found or saved.revision is distinct from expected_revision then raise exception 'DRAFT_CONFLICT' using errcode='VS409'; end if;
 snapshot:=jsonb_set(saved.document,'{cards}',coalesce((
  select jsonb_agg(card order by ordinal) from jsonb_array_elements(saved.document->'cards') with ordinality as items(card,ordinal)
  where card->'hidden' is distinct from 'true'::jsonb
 ),'[]'::jsonb));
 insert into public.published_pages(owner_id,slug,document) values(auth.uid(),requested_slug,snapshot)
 on conflict(owner_id) do update set slug=excluded.slug,document=excluded.document,published_at=now();
 return requested_slug;
end $$;
revoke all on function public.publish_page(text,bigint,uuid) from public;
grant execute on function public.publish_page(text,bigint,uuid) to authenticated;

update public.published_pages set document=jsonb_set(document,'{cards}',coalesce((
 select jsonb_agg(card order by ordinal) from jsonb_array_elements(document->'cards') with ordinality as items(card,ordinal)
 where card->'hidden' is distinct from 'true'::jsonb
),'[]'::jsonb));


COMMIT;
