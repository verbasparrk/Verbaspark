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
