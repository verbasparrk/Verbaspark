-- Published covers may be resolved by visitors; unpublished covers remain private.
create policy "Published share cover access" on storage.objects for select to anon,authenticated using(
 bucket_id='page-images' and exists(
  select 1 from public.published_pages p
  where p.owner_id::text=(storage.foldername(name))[1]
  and p.document #>> '{profile,seo,imagePath}'=name
 )
);
