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
